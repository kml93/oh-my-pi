#!/usr/bin/env bun
/**
 * PR review feedback that arrived since the last push, ready for an agent.
 *
 * By default prints only unresolved, non-outdated threads holding messages
 * posted after the last push, plus same-window conversation comments,
 * current-head human reviews, and failed checks — exactly the feedback a
 * fix-up round needs. `--all` restores the full open-thread view. Code
 * snippets are cropped from the current head diff (what github.com shows);
 * the API's frozen per-comment hunks are only a capped fallback. No state
 * is ever stored: reruns and other machines give the same output.
 * Complements `read pr://<owner>/<repo>/<n>`, which returns the full
 * history.
 *
 * Requires: gh (authenticated), bun.
 */

import { parseArgs } from 'node:util';

const USAGE = `Usage: bun pr-feedback.ts <pr-number> [options]

Print review feedback posted after the last push: unresolved, non-outdated
threads (code cropped from the head diff), conversation comments,
current-head human reviews, and failed checks. No state is stored.

Options:
  --repo owner/name   Repository (default: can1357/oh-my-pi)
  --all               Show every open thread, not only post-push messages
  --limit-chars N     Truncate bodies to N characters (default: full text)
  --show-outdated     Also print unresolved outdated threads, one line each

Exit codes:
  0  success (failing checks are data, not a script error)
  1  gh or GitHub API failure
  2  usage error

Examples:
  bun pr-feedback.ts 10408
  bun pr-feedback.ts 10408 --repo kml93/oh-my-pi --show-outdated`;

interface Flags {
  pr: number;
  repo: string;
  all: boolean;
  limitChars?: number;
  showOutdated: boolean;
}

interface ReviewNode {
  author: { login: string } | null;
  state: string;
  submittedAt: string;
  body: string;
  commit: { oid: string } | null;
}

interface ThreadCommentNode {
  author: { login: string } | null;
  body: string;
  path: string | null;
  line: number | null;
  createdAt: string;
  diffHunk: string | null;
}

interface ThreadNode {
  isResolved: boolean;
  isOutdated: boolean;
  comments: { nodes: ThreadCommentNode[] };
}

interface IssueCommentNode {
  author: { login: string } | null;
  body: string;
  createdAt: string;
}

interface StatusContextNode {
  __typename: string;
  name?: string | null;
  conclusion?: string | null;
  detailsUrl?: string | null;
  state?: string | null;
  context?: string | null;
  targetUrl?: string | null;
  startedAt?: string | null;
}

interface CommitRollup {
  state: string;
  contexts: { nodes: StatusContextNode[] };
}

interface PullRequestNode {
  headRefOid: string;
  headRefName: string;
  headRepositoryOwner: { login: string } | null;
  reviews: { nodes: ReviewNode[] };
  reviewThreads: { nodes: ThreadNode[] };
  comments: { nodes: IssueCommentNode[] };
  commits: {
    nodes: Array<{
      commit: {
        oid: string;
        pushedDate: string | null;
        committedDate: string | null;
        statusCheckRollup: CommitRollup | null;
      };
    }>;
  };
}

interface GraphQLEnvelope {
  data?: { repository?: { pullRequest?: PullRequestNode } };
  errors?: Array<{ message: string }>;
}

const QUERY = `query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      headRefName
      headRepositoryOwner { login }
      headRefOid
      reviews(first: 50) {
        nodes {
          author { login }
          state
          submittedAt
          body
          commit { oid }
        }
      }
      reviewThreads(first: 100) {
        nodes {
          isResolved
          isOutdated
          comments(first: 20) {
            nodes {
              author { login }
              body
              path
              line
              createdAt
              diffHunk
            }
          }
        }
      }
      comments(first: 50) {
        nodes {
          author { login }
          body
          createdAt
        }
      }
      commits(last: 1) {
        nodes {
          commit {
            oid
            pushedDate
            committedDate
            statusCheckRollup {
              state
              contexts(first: 50) {
                nodes {
                  __typename
                  ... on CheckRun {
                    name
                    startedAt
                    conclusion
                    detailsUrl
                  }
                  ... on StatusContext {
                    state
                    context
                    targetUrl
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}`;

const FAILED_CHECK_CONCLUSIONS: Record<string, true> = {
  FAILURE: true,
  TIMED_OUT: true,
  CANCELLED: true,
  ACTION_REQUIRED: true,
};
const FAILED_STATUS_STATES: Record<string, true> = { FAILURE: true, ERROR: true };
const BOT_AUTHOR = /bot|codex|roboomp/i;
const SUB_TAGS = /<\/?sub>/g;
const MARKDOWN_IMAGE = /!\[[^\]]*\]\([^)]*\)/g;
const BADGE_SEVERITY = /!\[(\w+) Badge\]/;
const USEFUL_LINE = /^Useful\? React with .*$/;

const fail = (message: string, code: number): never => {
  console.error(`Error: ${message}\n`);
  console.error(USAGE);
  process.exit(code);
};

const parseFlags = (argv: string[]): Flags => {
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      options: {
        repo: { type: 'string' },
        all: { type: 'boolean' },
        'limit-chars': { type: 'string' },
        'show-outdated': { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
      allowPositionals: true,
    });
    if (values.help) {
      console.log(USAGE);
      process.exit(0);
    }
    const positional = positionals[0];
    if (positionals.length !== 1 || positional === undefined || !/^\d+$/.test(positional)) {
      fail('exactly one PR number is required', 2);
    }
    let repo = 'can1357/oh-my-pi';
    if (values.repo !== undefined) repo = values.repo;
    if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) fail('--repo expects owner/name', 2);
    const limitRaw = values['limit-chars'];
    let limitChars: number | undefined;
    if (limitRaw !== undefined) limitChars = Number.parseInt(limitRaw, 10);
    if (limitChars !== undefined && (!Number.isFinite(limitChars) || limitChars < 1)) {
      fail('--limit-chars expects a positive integer', 2);
    }
    return {
      pr: Number.parseInt(positional, 10),
      repo,
      limitChars,
      showOutdated: values['show-outdated'] === true,
      all: values.all === true,
    };
  } catch (error) {
    let message = String(error);
    if (error instanceof Error) message = error.message;
    return fail(message, 2);
  }
};

interface SanitizedBody {
  severity: string | null;
  title: string;
  rest: string;
}

const sanitizeBody = (raw: string): SanitizedBody => {
  const captured = raw.match(BADGE_SEVERITY)?.[1];
  let severity: string | null = null;
  if (captured !== undefined) severity = captured;
  const lines = raw
    .replaceAll(SUB_TAGS, '')
    .replaceAll(MARKDOWN_IMAGE, '')
    .split('\n')
    .filter((line) => !USEFUL_LINE.test(line.trim()))
    .map((line) => line.trim())
    .filter((line) => line !== '');
  const firstLine = lines[0];
  let title = '';
  if (firstLine !== undefined) {
    title = firstLine.replace(/^\*\*/, '').replace(/\*\*$/, '').replace(/\s+/g, ' ').trim();
  }
  const rest = lines.slice(1).join('\n');
  return { severity, title, rest };
};

const optionalText = (value: string | null | undefined): string => {
  if (value === null || value === undefined) return '';
  return value;
};
const author = (node: { author: { login: string } | null }): string => node.author?.login ?? 'ghost';

const location = (comment: ThreadCommentNode): string => `${comment.path ?? '?'}:${comment.line ?? '?'}`;

const pluralize = (count: number, singular: string, plural: string): string => (count === 1 ? singular : plural);

interface DiffEntry {
  text: string;
  /** New-side line number, -1 for removed lines. */
  no: number;
}

type HeadDiff = Map<string, DiffEntry[]>;

interface PullRequestFileNode {
  filename?: string;
  patch?: string | null;
}

const parsePatch = (patch: string): DiffEntry[] => {
  let current = Number.NaN;
  return patch.split('\n').reduce<DiffEntry[]>((entries, line) => {
    const header = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (header?.[1] !== undefined) {
      current = Number(header[1]);
      return entries;
    }
    if (!Number.isFinite(current) || line.startsWith('\\')) return entries;
    if (line.startsWith('-')) {
      entries.push({ text: line, no: -1 });
      return entries;
    }
    entries.push({ text: line, no: current });
    current += 1;
    return entries;
  }, []);
};

const fileEntries = (file: PullRequestFileNode): Array<[string, DiffEntry[]]> => {
  if (typeof file.filename !== 'string' || typeof file.patch !== 'string') return [];
  return [[file.filename, parsePatch(file.patch)]];
};

/** One extra REST call: the head diff, so code snippets match github.com
 * instead of the frozen per-comment hunk (stale after force-pushes).
 * `--paginate --slurp` reads every page, so PRs over 100 files keep
 * head-anchored snippets; a gh without `--slurp` degrades to one page. */
const flattenPages = (parsed: unknown): PullRequestFileNode[] => {
  if (!Array.isArray(parsed)) return [];
  return parsed.flat() as PullRequestFileNode[];
};

const fetchFiles = (flags: Flags, pagination: string[]): PullRequestFileNode[] => {
  const proc = Bun.spawnSync(['gh', 'api', ...pagination, `repos/${flags.repo}/pulls/${flags.pr}/files?per_page=100`]);
  if (proc.exitCode !== 0) return [];
  try {
    return flattenPages(JSON.parse(proc.stdout.toString()));
  } catch {
    return [];
  }
};

const fetchHeadDiff = (flags: Flags): HeadDiff => {
  const pages = fetchFiles(flags, ['--paginate', '--slurp']);
  if (pages.length > 0) return new Map(pages.flatMap(fileEntries));
  return new Map(fetchFiles(flags, []).flatMap(fileEntries));
};

interface WorktreeEntry {
  path: string;
  head: string;
}

const parseWorktrees = (porcelain: string): WorktreeEntry[] => {
  let path = '';
  return porcelain.split('\n').reduce<WorktreeEntry[]>((entries, line) => {
    if (line.startsWith('worktree ')) {
      path = line.slice('worktree '.length);
      return entries;
    }
    if (line.startsWith('HEAD ')) {
      entries.push({ path, head: line.slice('HEAD '.length) });
      return entries;
    }
    return entries;
  }, []);
};

/** Pure git read at each run: point at the worktree already sitting on the
 * PR head, or warn that this machine has no matching checkout. Nothing is
 * ever written. */
const localCheckoutLine = (headRefOid: string): string => {
  const proc = Bun.spawnSync(['git', 'worktree', 'list', '--porcelain']);
  if (proc.exitCode !== 0) return `local: no checkout at ${headRefOid.slice(0, 9)}`;
  const match = parseWorktrees(proc.stdout.toString()).find((entry) => entry.head === headRefOid);
  if (match === undefined) return `local: no checkout at ${headRefOid.slice(0, 9)}`;
  return `local: worktree ${match.path}`;
};

const fetchPullRequest = (flags: Flags): PullRequestNode => {
  const [owner, name] = flags.repo.split('/');
  const proc = Bun.spawnSync(['gh', 'api', 'graphql', '-f', `query=${QUERY}`, '-F', `owner=${owner}`, '-F', `name=${name}`, '-F', `number=${flags.pr}`]);
  if (proc.exitCode !== 0) {
    console.error(proc.stderr.toString().trim());
    process.exit(1);
  }
  const envelope = JSON.parse(proc.stdout.toString()) as GraphQLEnvelope;
  if (envelope.errors?.length) {
    console.error(envelope.errors.map((error) => error.message).join('\n'));
    process.exit(1);
  }
  const pullRequest = envelope.data?.repository?.pullRequest;
  if (!pullRequest) fail(`PR ${flags.repo}#${flags.pr} not found`, 1);
  return pullRequest;
};

class PrFeedbackReport {
  readonly pullRequest: PullRequestNode;
  readonly headDiff: HeadDiff;
  readonly flags: Flags;

  constructor(pullRequest: PullRequestNode, headDiff: HeadDiff, flags: Flags) {
    this.pullRequest = pullRequest;
    this.headDiff = headDiff;
    this.flags = flags;
  }

  render(): void {
    console.log(this.#header());
    console.log(localCheckoutLine(this.pullRequest.headRefOid));
    console.log('');
    this.#openThreads().forEach((thread) => this.#renderThread(thread));
    if (this.flags.showOutdated) this.#renderOutdatedThreads();
    this.#renderHumanReviews();
    this.#renderConversation();
  }

  #threads(isResolved: boolean, isOutdated: boolean): ThreadNode[] {
    return this.pullRequest.reviewThreads.nodes.filter((thread) => thread.isResolved === isResolved && thread.isOutdated === isOutdated);
  }

  #openThreads(): ThreadNode[] {
    return this.#threads(false, false).filter((thread) => this.#hasNewMessage(thread));
  }

  #hasNewMessage(thread: ThreadNode): boolean {
    return thread.comments.nodes.some((comment) => this.#isNew(comment.createdAt));
  }

  /** Messages posted at/after the last push count as new; `--all` disables
   * the cutoff. Same-second bot reviews are included on purpose. */
  #isNew(timestamp: string): boolean {
    const cutoff = this.#cutoffMs();
    if (cutoff === null) return true;
    return Date.parse(timestamp) >= cutoff;
  }

  #cutoffMs(): number | null {
    if (this.flags.all) return null;
    const [lastCommit] = this.pullRequest.commits.nodes;
    if (lastCommit === undefined) return null;
    const { pushedDate, committedDate } = lastCommit.commit;
    let stamped = pushedDate;
    if (stamped === null) stamped = this.#firstCheckStartedAt(lastCommit.commit.statusCheckRollup);
    if (stamped === null) stamped = committedDate;
    if (stamped === null) return null;
    const parsed = Date.parse(stamped);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  }

  /** CI checks start within seconds of a push, so the earliest CheckRun
   * start is the closest thing to a push timestamp the API exposes
   * (Commit.pushedDate is null in practice on PR head commits). */
  #firstCheckStartedAt(rollup: CommitRollup | null): string | null {
    if (rollup === null) return null;
    const started = rollup.contexts.nodes
      .map((context) => context.startedAt)
      .filter((value): value is string => typeof value === 'string')
      .sort()[0];
    if (started === undefined) return null;
    return started;
  }

  #header(): string {
    const openThreads = this.#threads(false, false);
    const outdated = this.#threads(false, true).length;
    const resolved = this.#threads(true, false).length + this.#threads(true, true).length;
    const suffixes: string[] = [this.#scopeSuffix(openThreads)];
    if (outdated > 0) suffixes.push(this.#outdatedSuffix(outdated));
    if (resolved > 0) suffixes.push(`, ${resolved} resolved`);
    return `# ${this.flags.repo}#${this.flags.pr} @ ${this.pullRequest.headRefOid.slice(0, 9)} [${this.#headLabel()}]${suffixes.join('')}, ${this.#checksSummary()}`;
  }

  #headLabel(): string {
    const owner = this.pullRequest.headRepositoryOwner?.login;
    if (owner === undefined || owner === null) return this.pullRequest.headRefName;
    return `${owner}:${this.pullRequest.headRefName}`;
  }

  #scopeSuffix(openThreads: ThreadNode[]): string {
    if (this.flags.all) return ` — ${openThreads.length} open`;
    const fresh = openThreads.filter((thread) => this.#hasNewMessage(thread)).length;
    return ` — ${fresh} new since ${this.#sinceLabel()} of ${openThreads.length} open`;
  }

  #sinceLabel(): string {
    const cutoff = this.#cutoffMs();
    if (cutoff === null) return 'last push';
    return `push ${new Date(cutoff).toISOString()}`;
  }

  #outdatedSuffix(count: number): string {
    return this.flags.showOutdated ? `, ${count} outdated` : `, ${count} outdated (--show-outdated)`;
  }

  #checksSummary(): string {
    const [lastCommit] = this.pullRequest.commits.nodes;
    if (!lastCommit || lastCommit.commit.oid !== this.pullRequest.headRefOid) return 'checks unknown';
    const rollup = lastCommit.commit.statusCheckRollup;
    let contexts: StatusContextNode[] = [];
    if (rollup !== null) contexts = rollup.contexts.nodes;
    const failed = contexts.filter((context) => this.#isFailed(context));
    const pending = contexts.filter((context) => this.#isPending(context));
    if (failed.length) return `checks FAILED: ${this.#contextLines(failed).join(', ')}`;
    if (pending.length) return `checks pending: ${pending.map((context) => this.#contextLabel(context)).join(', ')}`;
    return 'checks ok';
  }

  #isFailed(context: StatusContextNode): boolean {
    const conclusion = optionalText(context.conclusion);
    const state = optionalText(context.state);
    if (context.__typename === 'CheckRun') return conclusion in FAILED_CHECK_CONCLUSIONS;
    return state in FAILED_STATUS_STATES;
  }

  #isPending(context: StatusContextNode): boolean {
    if (context.__typename === 'CheckRun') return context.conclusion === null || context.conclusion === undefined;
    return optionalText(context.state) === 'PENDING';
  }

  #contextLines(contexts: StatusContextNode[]): string[] {
    return contexts.map((context) => `${this.#contextLabel(context)} ${this.#contextUrl(context)}`.trim());
  }

  #contextLabel(context: StatusContextNode): string {
    let label = optionalText(context.name);
    if (context.__typename !== 'CheckRun') label = optionalText(context.context);
    if (label === '') label = '?';
    return label;
  }

  #contextUrl(context: StatusContextNode): string {
    let url = optionalText(context.detailsUrl);
    if (context.__typename !== 'CheckRun') url = optionalText(context.targetUrl);
    return url;
  }

  #renderThread(thread: ThreadNode): void {
    const [first, ...replies] = thread.comments.nodes;
    if (!first) return;
    const { severity, title, rest } = sanitizeBody(first.body);
    let tag = '';
    if (severity !== null) tag = ` · ${severity}`;
    console.log(`## ${location(first)} — ${title} [${author(first)}${tag}]`);
    const firstIsNew = this.#isNew(first.createdAt);
    if (!firstIsNew) console.log(`  (original remark ${first.createdAt}, before the last push)`);
    if (rest !== '') console.log(this.#indented(rest));
    const code = this.#codeWindow(first);
    if (code !== null) console.log(`  ${code.label}:\n${this.#indented(code.window)}`);
    this.#renderReplies(replies);
    console.log('');
  }

  #renderReplies(replies: ThreadCommentNode[]): void {
    if (this.flags.all) {
      this.#renderReplyCount(replies);
      return;
    }
    this.#renderFreshReplies(replies);
  }

  #renderReplyCount(replies: ThreadCommentNode[]): void {
    if (replies.length === 0) return;
    console.log(`  (+${replies.length} ${pluralize(replies.length, 'reply', 'replies')})`);
  }

  #renderFreshReplies(replies: ThreadCommentNode[]): void {
    const fresh = replies.filter((reply) => this.#isNew(reply.createdAt));
    fresh.forEach((reply) => {
      console.log(`  > ${author(reply)} · ${reply.createdAt}`);
      console.log(this.#indented(this.#replyBody(reply)));
    });
    const older = replies.length - fresh.length;
    if (older === 0) return;
    console.log(`  (+${older} ${pluralize(older, 'reply', 'replies')} before the last push)`);
  }

  #replyBody(reply: ThreadCommentNode): string {
    const { title, rest } = sanitizeBody(reply.body);
    if (rest === '') return title;
    return `${title}\n${rest}`;
  }

  #renderOutdated(thread: ThreadNode): void {
    const first = thread.comments.nodes[0];
    if (!first) return;
    console.log(`  ${location(first)} — ${sanitizeBody(first.body).title}`);
  }

  #renderOutdatedThreads(): void {
    const threads = this.#threads(false, true);
    if (threads.length === 0) return;
    console.log(`## Outdated (unresolved, probably superseded): ${threads.length}`);
    threads.forEach((thread) => this.#renderOutdated(thread));
    console.log('');
  }

  #renderHumanReviews(): void {
    const humans = this.pullRequest.reviews.nodes.filter((review) => (!review.commit || review.commit.oid === this.pullRequest.headRefOid) && !BOT_AUTHOR.test(author(review)) && this.#isNew(review.submittedAt));
    if (!humans.length) return;
    console.log(`## Reviews on current head: ${humans.length}`);
    humans.forEach((review) => {
      console.log(`### ${review.state} — ${author(review)}`);
      console.log(this.#indented(this.#reviewBody(review)));
      console.log('');
    });
  }

  #reviewBody(review: ReviewNode): string {
    if (review.body === '') return '(no comment)';
    return review.body;
  }

  #renderConversation(): void {
    const comments = this.pullRequest.comments.nodes.filter((comment) => this.#isNew(comment.createdAt));
    if (!comments.length) return;
    console.log(`## Conversation: ${comments.length}`);
    comments.forEach((comment) => {
      console.log(`### ${author(comment)} — ${comment.createdAt}`);
      console.log(this.#indented(comment.body));
      console.log('');
    });
  }

  #indented(text: string): string {
    let bounded = text;
    if (this.flags.limitChars !== undefined) {
      bounded = [...text.trim()].slice(0, this.flags.limitChars).join('');
    }
    return bounded
      .split('\n')
      .map((line) => `  ${line.replace(/\t/g, '  ').trimEnd()}`)
      .join('\n');
  }

  /** Code around the commented line cropped from the current head diff —
   * the same text github.com anchors the thread on. The comment's own
   * diffHunk is frozen at the commit where it was written and
   * server-cropped, so it is only a capped fallback. */
  #codeWindow(comment: ThreadCommentNode): { label: string; window: string } | null {
    if (comment.line === null) return this.#frozenCode(comment);
    if (comment.path === null) return this.#frozenCode(comment);
    const entries = this.headDiff.get(comment.path);
    if (entries === undefined) return this.#frozenCode(comment);
    const index = entries.findIndex((entry) => entry.no === comment.line);
    if (index === -1) return this.#frozenCode(comment);
    const snippet = entries
      .slice(Math.max(0, index - 3), index + 4)
      .map((entry) => entry.text)
      .join('\n');
    return { label: 'code (head)', window: snippet };
  }

  #frozenCode(comment: ThreadCommentNode): { label: string; window: string } | null {
    if (comment.diffHunk === null) return null;
    return { label: 'code (frozen at comment time, truncated)', window: this.#frozenWindow(comment.diffHunk) };
  }

  #frozenWindow(hunk: string): string {
    const lines = hunk.split('\n');
    if (lines.length <= 15) return hunk;
    return [...lines.slice(0, 15), '… (truncated)'].join('\n');
  }
}

const flags = parseFlags(process.argv.slice(2));
new PrFeedbackReport(fetchPullRequest(flags), fetchHeadDiff(flags), flags).render();
