#!/usr/bin/env bun
/**
 * Actionable PR review feedback filtered with GitHub's own thread states.
 *
 * Prints unresolved review threads (with diff hunks), current-head human
 * reviews, conversation comments, and failed checks for a pull request.
 * Resolved and outdated threads are counted in the status line only, so
 * output stays proportional to the remaining work instead of the review
 * history. Complements `read pr://<owner>/<repo>/<n>`, which returns the
 * full history.
 *
 * Requires: gh (authenticated), bun.
 */

import { parseArgs } from "node:util";

const USAGE = `Usage: bun pr-feedback.ts <pr-number> [options]

Print unresolved PR review feedback (threads with diff hunks, reviews, comments, failed checks).

Options:
  --repo owner/name   Repository (default: can1357/oh-my-pi)
  --limit-chars N     Truncate bodies to N characters (default: full text)
  --show-outdated     Also print unresolved outdated threads, one line each
  --help              Show this help

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
}

interface PullRequestNode {
  headRefOid: string;
  reviews: { nodes: ReviewNode[] };
  reviewThreads: { nodes: ThreadNode[] };
  comments: { nodes: IssueCommentNode[] };
  commits: {
    nodes: Array<{
      commit: {
        oid: string;
        statusCheckRollup: { state: string; contexts: { nodes: StatusContextNode[] } } | null;
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
            statusCheckRollup {
              state
              contexts(first: 50) {
                nodes {
                  __typename
                  ... on CheckRun {
                    name
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
        repo: { type: "string" },
        "limit-chars": { type: "string" },
        "show-outdated": { type: "boolean" },
        help: { type: "boolean", short: "h" },
      },
      allowPositionals: true,
    });
    if (values.help) {
      console.log(USAGE);
      process.exit(0);
    }
    const positional = positionals[0];
    if (positionals.length !== 1 || positional === undefined || !/^\d+$/.test(positional)) {
      fail("exactly one PR number is required", 2);
    }
    let repo = "can1357/oh-my-pi";
    if (values.repo !== undefined) repo = values.repo;
    if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) fail("--repo expects owner/name", 2);
    const limitRaw = values["limit-chars"];
    let limitChars: number | undefined;
    if (limitRaw !== undefined) limitChars = Number.parseInt(limitRaw, 10);
    if (limitChars !== undefined && (!Number.isFinite(limitChars) || limitChars < 1)) {
      fail("--limit-chars expects a positive integer", 2);
    }
    return {
      pr: Number.parseInt(positional, 10),
      repo,
      limitChars,
      showOutdated: values["show-outdated"] === true,
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
    .replaceAll(SUB_TAGS, "")
    .replaceAll(MARKDOWN_IMAGE, "")
    .split("\n")
    .filter(line => !USEFUL_LINE.test(line.trim()))
    .map(line => line.trim())
    .filter(line => line !== "");
  const firstLine = lines[0];
  let title = "";
  if (firstLine !== undefined) {
    title = firstLine.replace(/^\*\*/, "").replace(/\*\*$/, "").replace(/\s+/g, " ").trim();
  }
  const rest = lines.slice(1).join("\n");
  return { severity, title, rest };
};


const optionalText = (value: string | null | undefined): string => {
  if (value === null || value === undefined) return "";
  return value;
};
const author = (node: { author: { login: string } | null }): string => node.author?.login ?? "ghost";

const location = (comment: ThreadCommentNode): string => {
  let path = "?";
  if (comment.path !== null) path = comment.path;
  let line = "?";
  if (comment.line !== null) line = String(comment.line);
  return `${path}:${line}`;
};

const fetchPullRequest = (flags: Flags): PullRequestNode => {
  const [owner, name] = flags.repo.split("/");
  const proc = Bun.spawnSync([
    "gh",
    "api",
    "graphql",
    "-f",
    `query=${QUERY}`,
    "-F",
    `owner=${owner}`,
    "-F",
    `name=${name}`,
    "-F",
    `number=${flags.pr}`,
  ]);
  if (proc.exitCode !== 0) {
    console.error(proc.stderr.toString().trim());
    process.exit(1);
  }
  const envelope = JSON.parse(proc.stdout.toString()) as GraphQLEnvelope;
  if (envelope.errors?.length) {
    console.error(envelope.errors.map(error => error.message).join("\n"));
    process.exit(1);
  }
  const pullRequest = envelope.data?.repository?.pullRequest;
  if (!pullRequest) fail(`PR ${flags.repo}#${flags.pr} not found`, 1);
  return pullRequest;
};

class PrFeedbackReport {
  readonly pullRequest: PullRequestNode;
  readonly flags: Flags;

  constructor(pullRequest: PullRequestNode, flags: Flags) {
    this.pullRequest = pullRequest;
    this.flags = flags;
  }

  render(): void {
    console.log(this.#header());
    console.log("");
    this.#threads(false, false).forEach(thread => this.#renderThread(thread));
    if (this.flags.showOutdated) this.#threads(false, true).forEach(thread => this.#renderOutdated(thread));
    this.#renderHumanReviews();
    this.#renderConversation();
  }

  #threads(isResolved: boolean, isOutdated: boolean): ThreadNode[] {
    return this.pullRequest.reviewThreads.nodes.filter(
      thread => thread.isResolved === isResolved && thread.isOutdated === isOutdated,
    );
  }

  #header(): string {
    const open = this.#threads(false, false).length;
    const outdated = this.#threads(false, true).length;
    const resolved = this.#threads(true, false).length + this.#threads(true, true).length;
    const suffixes: string[] = [];
    if (outdated > 0 && this.flags.showOutdated) suffixes.push(`, ${outdated} outdated`);
    if (outdated > 0 && !this.flags.showOutdated) suffixes.push(`, ${outdated} outdated (--show-outdated)`);
    if (resolved > 0) suffixes.push(`, ${resolved} resolved`);
    return `# ${this.flags.repo}#${this.flags.pr} @ ${this.pullRequest.headRefOid.slice(0, 9)} — ${open} open${suffixes.join("")}, ${this.#checksSummary()}`;
  }

  #checksSummary(): string {
    const [lastCommit] = this.pullRequest.commits.nodes;
    if (!lastCommit || lastCommit.commit.oid !== this.pullRequest.headRefOid) return "checks unknown";
    const rollup = lastCommit.commit.statusCheckRollup;
    let contexts: StatusContextNode[] = [];
    if (rollup !== null) contexts = rollup.contexts.nodes;
    const failed = contexts.filter(context => {
      const isCheckRun = context.__typename === "CheckRun";
      const conclusion = optionalText(context.conclusion);
      const state = optionalText(context.state);
      if (isCheckRun) return conclusion in FAILED_CHECK_CONCLUSIONS;
      return state in FAILED_STATUS_STATES;
    });
    if (!failed.length) return "checks ok";
    const parts = failed.map(context => {
      const isCheckRun = context.__typename === "CheckRun";
      let label = optionalText(context.name);
      let url = optionalText(context.detailsUrl);
      if (!isCheckRun) {
        label = optionalText(context.context);
        url = optionalText(context.targetUrl);
      }
      if (label === "") label = "?";
      return `${label} ${url}`.trim();
    });
    return `checks FAILED: ${parts.join(", ")}`;
  }

  #renderThread(thread: ThreadNode): void {
    const [first, ...replies] = thread.comments.nodes;
    if (!first) return;
    const { severity, title, rest } = sanitizeBody(first.body);
    let tag = "";
    if (severity !== null) tag = ` · ${severity}`;
    console.log(`## ${location(first)} — ${title} [${author(first)}${tag}]`);
    if (rest !== "") console.log(this.#indented(rest));
    if (first.diffHunk !== null) {
      console.log(`  diff:\n${this.#indented(this.#diffWindow(first.diffHunk, first.line))}`);
    }
    let replyWord = "replies";
    if (replies.length === 1) replyWord = "reply";
    if (replies.length > 0) console.log(`  (+${replies.length} ${replyWord})`);
    console.log("");
  }

  #renderOutdated(thread: ThreadNode): void {
    const first = thread.comments.nodes[0];
    if (!first) return;
    console.log(`  ${location(first)} — ${sanitizeBody(first.body).title}`);
  }

  #renderHumanReviews(): void {
    const humans = this.pullRequest.reviews.nodes.filter(
      review =>
        (!review.commit || review.commit.oid === this.pullRequest.headRefOid) &&
        !BOT_AUTHOR.test(author(review)),
    );
    if (!humans.length) return;
    console.log(`## Reviews on current head: ${humans.length}`);
    humans.forEach(review => {
      console.log(`### ${review.state} — ${author(review)}`);
      console.log(this.#indented(review.body));
      console.log("");
    });
  }

  #renderConversation(): void {
    const comments = this.pullRequest.comments.nodes;
    if (!comments.length) return;
    console.log(`## Conversation: ${comments.length}`);
    comments.forEach(comment => {
      console.log(`### ${author(comment)} — ${comment.createdAt}`);
      console.log(this.#indented(comment.body));
      console.log("");
    });
  }

  #indented(text: string): string {
    let bounded = text;
    if (this.flags.limitChars !== undefined) {
      bounded = [...text.trim()].slice(0, this.flags.limitChars).join("");
    }
    return bounded
      .split("\n")
      .map(line => `  ${line.replace(/\t/g, "  ").trimEnd()}`)
      .join("\n");
  }

  /** Crop the hunk to a few lines around the commented line, like the
   * github.com comment bubble; falls back to the full hunk when the line
   * cannot be located (null line, hunk header drift). */
  #diffWindow(hunk: string, line: number | null): string {
    if (line === null) return hunk;
    const lines = hunk.split("\n");
    const header = lines.shift();
    if (header === undefined) return hunk;
    const matched = header.match(/\+(\d+)/);
    let start = Number.NaN;
    if (matched !== null && matched[1] !== undefined) start = Number(matched[1]);
    if (!Number.isFinite(start)) return hunk;
    let current = start;
    const entries = lines.reduce<Array<{ text: string; no: number }>>((acc, diffLine) => {
      if (diffLine.startsWith("\\")) return acc;
      if (diffLine.startsWith("-")) {
        acc.push({ text: diffLine, no: -1 });
        return acc;
      }
      acc.push({ text: diffLine, no: current });
      current++;
      return acc;
    }, []);
    const index = entries.findIndex(entry => entry.no === line);
    if (index === -1) return hunk;
    const windowEntries = entries.slice(Math.max(0, index - 3), index + 4).map(entry => entry.text);
    return [header, ...windowEntries].join("\n");
  }
}

const flags = parseFlags(process.argv.slice(2));
new PrFeedbackReport(fetchPullRequest(flags), flags).render();
