#!/usr/bin/env bun
/**
 * Actionable PR review feedback filtered with GitHub's own thread states.
 *
 * Prints unresolved review threads, current-head reviews, conversation
 * comments, and failed checks for a pull request. Resolved and outdated
 * threads are counted rather than dumped, so output stays proportional to
 * the remaining work instead of the review history. Complements
 * `read pr://<owner>/<repo>/<n>`, which returns the full history.
 *
 * Requires: gh (authenticated), bun.
 */

import { parseArgs } from "node:util";

const USAGE = `Usage: bun pr-feedback.ts <pr-number> [options]

Print unresolved PR review feedback (threads, reviews, comments, failed checks).

Options:
  --repo owner/name   Repository (default: can1357/oh-my-pi)
  --limit-chars N     Truncate bodies to N characters (default: 400)
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
  limitChars: number;
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
  url: string;
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
              url
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
    if (positionals.length !== 1 || !/^\d+$/.test(positionals[0] ?? "")) {
      fail("exactly one PR number is required", 2);
    }
    const limitChars = values["limit-chars"] === undefined ? 400 : Number.parseInt(values["limit-chars"], 10);
    if (!Number.isFinite(limitChars) || limitChars < 1) fail("--limit-chars expects a positive integer", 2);
    const repo = values.repo ?? "can1357/oh-my-pi";
    if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) fail("--repo expects owner/name", 2);
    return {
      pr: Number.parseInt(positionals[0], 10),
      repo,
      limitChars,
      showOutdated: values["show-outdated"] === true,
    };
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error), 2);
  }
};

const truncate = (text: string, limit: number): string => {
  const chars = [...text.trim()];
  return chars.length <= limit ? chars.join("") : `${chars.slice(0, limit).join("")}…`;
};

const indented = (text: string, limit: number): string =>
  truncate(text, limit)
    .split("\n")
    .map(line => `  ${line.trim()}`)
    .join("\n");

const author = (node: { author: { login: string } | null }): string => node.author?.login ?? "ghost";

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

const replySuffix = (count: number): string => (count === 1 ? "y" : "ies");

const renderThread = (thread: ThreadNode, flags: Flags): void => {
  const [first, ...replies] = thread.comments.nodes;
  if (!first) return;
  console.log(`${first.path ?? "?"}:${first.line ?? "?"} — ${author(first)}`);
  console.log(indented(first.body, flags.limitChars));
  if (replies.length) console.log(`  (+${replies.length} repl${replySuffix(replies.length)})`);
};

const renderOutdatedThread = (thread: ThreadNode): void => {
  const first = thread.comments.nodes[0];
  if (!first) return;
  console.log(`  ${first.path ?? "?"}:${first.line ?? "?"} — ${truncate(first.body, 120)}`);
};

const renderCurrentThreads = (threads: ThreadNode[], flags: Flags): void => {
  const current = threads.filter(thread => !thread.isResolved && !thread.isOutdated);
  if (!current.length) return;
  console.log(`## Open inline threads (current): ${current.length}`);
  current.forEach(thread => renderThread(thread, flags));
};

const renderOutdatedThreads = (threads: ThreadNode[], flags: Flags): void => {
  const outdated = threads.filter(thread => !thread.isResolved && thread.isOutdated);
  if (!outdated.length) return;
  console.log(`## Open but outdated: ${outdated.length} hidden (use --show-outdated)`);
  if (!flags.showOutdated) return;
  outdated.forEach(renderOutdatedThread);
};

const renderResolvedCount = (threads: ThreadNode[]): void => {
  const resolved = threads.filter(thread => thread.isResolved);
  if (!resolved.length) return;
  console.log(`## Resolved: ${resolved.length} (excluded)`);
};

const renderReview = (review: ReviewNode, flags: Flags): void => {
  console.log(`${review.state} ${author(review)}`);
  if (BOT_AUTHOR.test(author(review))) return;
  console.log(indented(review.body, Math.min(flags.limitChars, 300)));
};

const renderReviews = (reviews: ReviewNode[], head: string, flags: Flags): void => {
  const current = reviews.filter(review => !review.commit || review.commit.oid === head);
  if (!current.length) return;
  console.log(`## Reviews on current head: ${current.length}`);
  current.forEach(review => renderReview(review, flags));
};

const renderConversation = (comments: IssueCommentNode[], flags: Flags): void => {
  if (!comments.length) return;
  console.log(`## Conversation: ${comments.length}`);
  comments.forEach(comment => {
    console.log(`${author(comment)} — ${comment.createdAt}`);
    console.log(indented(comment.body, flags.limitChars));
  });
};

const isFailedContext = (context: StatusContextNode): boolean => {
  if (context.__typename === "CheckRun") return (context.conclusion ?? "") in FAILED_CHECK_CONCLUSIONS;
  return (context.state ?? "") in FAILED_STATUS_STATES;
};

const contextLabel = (context: StatusContextNode): string =>
  context.__typename === "CheckRun" ? context.name ?? "?" : context.context ?? "?";

const contextUrl = (context: StatusContextNode): string =>
  context.__typename === "CheckRun" ? context.detailsUrl ?? "" : context.targetUrl ?? "";

const renderChecks = (pullRequest: PullRequestNode): void => {
  const [lastCommit] = pullRequest.commits.nodes;
  if (!lastCommit || lastCommit.commit.oid !== pullRequest.headRefOid) {
    console.log("## Checks: unknown (head commit not found in rollup)");
    return;
  }
  const contexts = lastCommit.commit.statusCheckRollup?.contexts.nodes ?? [];
  const failed = contexts.filter(isFailedContext);
  if (!failed.length) {
    console.log("## Checks: ok");
    return;
  }
  console.log(`## Checks: ${failed.length} failed`);
  failed.forEach(context => console.log(`FAILED ${contextLabel(context)} ${contextUrl(context)}`.trimEnd()));
};

const flags = parseFlags(process.argv.slice(2));
const pullRequest = fetchPullRequest(flags);
console.log(`# ${flags.repo}#${flags.pr} @ ${pullRequest.headRefOid.slice(0, 9)}`);
console.log("");
renderCurrentThreads(pullRequest.reviewThreads.nodes, flags);
renderOutdatedThreads(pullRequest.reviewThreads.nodes, flags);
renderResolvedCount(pullRequest.reviewThreads.nodes);
renderReviews(pullRequest.reviews.nodes, pullRequest.headRefOid, flags);
renderConversation(pullRequest.comments.nodes, flags);
renderChecks(pullRequest);
