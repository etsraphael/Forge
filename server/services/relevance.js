const taskPatterns = [
  /\btasks?\b/,
  /\bboard\b/,
  /\btodo\b/,
  /\bin[- ]progress\b/,
  /\bbacklog\b/,
  /\bpriority\b/,
  /\bsprint\b/,
  /\bstatus\b/,
  /\bwhat.{0,20}(working|next|should)\b/,
  /\bbt-\d+\b/,
  /\bshipped\b/,
  /\bideas?\b/,
  /\breview\b/,
  /\bcreate\s+(a\s+)?task\b/,
  /\badd\s+(a\s+)?task\b/,
  /\bmake\s+(a\s+)?task\b/,
  /\bdelete\s+(a\s+)?task\b/,
  /\bremove\s+(a\s+)?task\b/,
  /\bupdate\s+(a\s+)?task\b/,
  /\bedit\s+(a\s+)?task\b/,
  /\bmove\s+(a\s+)?task\b/,
];

const issuePatterns = [
  /\bissues?\b/,
  /\bbugs?\b/,
  /\bfeature request\b/,
  /\blabels?\b/,
  /\bopen issues?\b/,
];

const prPatterns = [
  /\bpull requests?\b/,
  /\bprs?\b/,
  /\bmerge\b/,
  /\bdraft pr\b/,
  /\breview pr\b/,
  /\bbranch(es)?\b/,
];

const commitPatterns = [
  /\bcommits?\b/,
  /\bpush(ed)?\b/,
  /\brecent changes\b/,
  /\bchangelog\b/,
  /\bwhat changed\b/,
  /\blast commit\b/,
  /\bhistory\b/,
];

const repoPatterns = [
  /\brepo(sitory)?\b/,
  /\bcodebase\b/,
  /\bfiles?\b/,
  /\bdirector(y|ies)\b/,
  /\bfolder\b/,
  /\btree\b/,
  /\blocal\b/,
  /\bproject structure\b/,
];

const hashNumberPattern = /#\d+/;

/**
 * Detect which context sections are relevant to the user's message.
 * Pure function — synchronous, no side effects.
 */
export function detectRelevance(userMessage) {
  const msg = (userMessage || "").toLowerCase();

  const tasks = taskPatterns.some((p) => p.test(msg));

  const issues = issuePatterns.some((p) => p.test(msg));
  const prs = prPatterns.some((p) => p.test(msg));
  const commits = commitPatterns.some((p) => p.test(msg));
  const repo = repoPatterns.some((p) => p.test(msg));

  // #42 style references → include issues (and PRs if PR keywords also present)
  const hasHash = hashNumberPattern.test(msg);
  const issuesFromHash = hasHash && !prs;
  const prsFromHash = hasHash && prs;

  const anyGitHub = issues || issuesFromHash || prs || prsFromHash || commits || repo;

  return {
    tasks,
    github: {
      repo: repo || anyGitHub, // always include repo header if any GitHub section triggers
      issues: issues || issuesFromHash,
      prs: prs || prsFromHash,
      commits,
    },
  };
}
