import { getFirstGitHubService } from "./github.js";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const githubCache = {
  repo: { data: null, ts: 0 },
  commits: { data: null, ts: 0 },
  issues: { data: null, ts: 0 },
  prs: { data: null, ts: 0 },
};

const PREAMBLE_MINIMAL =
  "You are a helpful AI assistant in Forge, a project management dashboard. " +
  "The user's task board and GitHub repository are available if needed — the user can ask about them.\n\n";

const PREAMBLE_FULL =
  "You are a helpful AI assistant integrated into Forge, a project management and automation dashboard. " +
  "You have read-only access to the user's task board and connected GitHub repository. " +
  "Use this context to answer questions about tasks, issues, pull requests, and code. " +
  "Be concise and specific when referencing items.\n\n";

const columnLabels = {
  "in-progress": "In Progress",
  todo: "To Do",
  review: "Review",
  ideas: "Ideas",
  shipped: "Shipped",
};

function formatRelativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// --- Task context builders ---

function buildFilteredTaskContext(db) {
  const activeTasks = db
    .prepare(
      `SELECT id, title, type, column_id, priority, description
       FROM board_tasks
       WHERE column_id IN ('in-progress', 'todo', 'review')
       ORDER BY
         CASE column_id WHEN 'in-progress' THEN 1 WHEN 'todo' THEN 2 WHEN 'review' THEN 3 END,
         CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
         sort_order ASC
       LIMIT 20`
    )
    .all();

  // Counts for excluded columns
  const excluded = db
    .prepare(
      `SELECT column_id, COUNT(*) as count FROM board_tasks
       WHERE column_id IN ('ideas', 'shipped') GROUP BY column_id`
    )
    .all();

  if (activeTasks.length === 0 && excluded.length === 0) return "";

  const columns = {};
  for (const task of activeTasks) {
    const col = task.column_id;
    if (!columns[col]) columns[col] = [];
    columns[col].push(task);
  }

  let text = "## Your Task Board\n\n";
  for (const col of ["in-progress", "todo", "review"]) {
    const colTasks = columns[col];
    if (!colTasks || colTasks.length === 0) continue;

    text += `### ${columnLabels[col]} (${colTasks.length})\n`;
    for (const t of colTasks) {
      let desc = "";
      if (t.priority === "high" && t.description) {
        desc = ` — "${t.description.slice(0, 120)}${t.description.length > 120 ? "…" : ""}"`;
      } else if (t.priority === "medium" && t.description) {
        desc = ` — "${t.description.slice(0, 60)}${t.description.length > 60 ? "…" : ""}"`;
      }
      text += `- [${t.id}] ${t.title} (${t.priority})${desc}\n`;
    }
    text += "\n";
  }

  // Summary of excluded columns
  const excludedParts = excluded.map((e) => `${e.count} ${columnLabels[e.column_id] || e.column_id}`);
  if (excludedParts.length > 0) {
    text += `Also: ${excludedParts.join(", ")} (not shown)\n\n`;
  }

  return text;
}

function buildTaskCommandContext(db, task) {
  const siblings = db
    .prepare(
      "SELECT id, title, priority FROM board_tasks WHERE column_id = ? AND id != ? ORDER BY sort_order LIMIT 5"
    )
    .all(task.column_id, task.id);

  let text = "You are an AI assistant in Forge, a project management tool. You are running a command on a specific task.\n\n";

  if (siblings.length > 0) {
    text += `Other tasks in "${columnLabels[task.column_id] || task.column_id}": `;
    text += siblings.map((s) => s.title).join(", ") + "\n\n";
  }

  return text;
}

// --- GitHub context builders (per-section, independently cached) ---

function getCached(key) {
  const entry = githubCache[key];
  if (entry.data && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key, data) {
  githubCache[key] = { data, ts: Date.now() };
}

async function fetchRepoContext(github) {
  const cached = getCached("repo");
  if (cached) return cached;

  const repo = await github.getRepository();
  const text =
    `## Connected Repository: ${repo.fullName}\n` +
    `Description: ${repo.description || "No description"}\n` +
    `Primary language: ${repo.language || "Unknown"}\n\n`;

  setCache("repo", text);
  return text;
}

async function fetchCommitsContext(github) {
  const cached = getCached("commits");
  if (cached) return cached;

  const commits = await github.getRecentCommits(5);
  if (commits.length === 0) return "";

  let text = "### Recent Commits\n";
  for (const c of commits) {
    text += `- ${c.sha} ${c.message} (${formatRelativeTime(c.date)})\n`;
  }
  text += "\n";

  setCache("commits", text);
  return text;
}

async function fetchIssuesContext(github) {
  const cached = getCached("issues");
  if (cached) return cached;

  const [repo, issues] = await Promise.all([
    github.getRepository(),
    github.getIssues({ state: "open", perPage: 10 }),
  ]);

  if (issues.length === 0) return "";

  let text = `### Open Issues (${repo.openIssuesCount} total, showing ${issues.length} most recent)\n`;
  for (const i of issues) {
    const labels = i.labels.length > 0 ? ` [${i.labels.join(", ")}]` : "";
    text += `- #${i.number} ${i.title}${labels}\n`;
  }
  text += "\n";

  setCache("issues", text);
  return text;
}

async function fetchPRsContext(github) {
  const cached = getCached("prs");
  if (cached) return cached;

  const pulls = await github.getPullRequests({ state: "open", perPage: 5 });
  if (pulls.length === 0) return "";

  let text = `### Open Pull Requests (${pulls.length})\n`;
  for (const p of pulls) {
    const draft = p.draft ? " (draft)" : "";
    text += `- #${p.number} ${p.title} by @${p.user}${draft} (${p.head} → ${p.base})\n`;
  }
  text += "\n";

  setCache("prs", text);
  return text;
}

async function fetchFilteredGitHubContext(db, flags) {
  const github = getFirstGitHubService(db);
  if (!github) return "";

  try {
    const fetches = [];
    if (flags.repo) fetches.push(fetchRepoContext(github));
    if (flags.commits) fetches.push(fetchCommitsContext(github));
    if (flags.issues) fetches.push(fetchIssuesContext(github));
    if (flags.prs) fetches.push(fetchPRsContext(github));

    const parts = await Promise.all(fetches);
    return parts.join("");
  } catch (err) {
    console.error("Failed to fetch GitHub context:", err.message);
    return "";
  }
}

// --- Main entry point ---

/**
 * Build selective system context for the AI.
 * @param {object} db - Database instance
 * @param {object} [options]
 * @param {object} [options.relevance] - Output from detectRelevance()
 * @param {'chat'|'task-command'} [options.mode] - Context mode
 * @param {object} [options.task] - The specific task (for task-command mode)
 */
export async function buildContext(db, { relevance, mode, task } = {}) {
  // Task-command mode: lightweight context only
  if (mode === "task-command" && task) {
    return buildTaskCommandContext(db, task);
  }

  // No relevance provided (backward compat): include everything
  if (!relevance) {
    const [taskCtx, githubCtx] = await Promise.all([
      buildFilteredTaskContext(db),
      fetchFilteredGitHubContext(db, { repo: true, commits: true, issues: true, prs: true }),
    ]);
    if (!taskCtx && !githubCtx) return "";
    return PREAMBLE_FULL + taskCtx + githubCtx;
  }

  // Relevance-based: only include what's needed
  const needsTasks = relevance.tasks;
  const gh = relevance.github;
  const anyGitHub = gh && (gh.repo || gh.commits || gh.issues || gh.prs);

  if (!needsTasks && !anyGitHub) {
    return PREAMBLE_MINIMAL;
  }

  const fetches = [];
  if (needsTasks) fetches.push(buildFilteredTaskContext(db));
  if (anyGitHub) fetches.push(fetchFilteredGitHubContext(db, gh));

  const parts = await Promise.all(fetches);
  return PREAMBLE_FULL + parts.join("");
}
