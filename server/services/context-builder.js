import { getFirstGitHubService } from "./github.js";

// Simple in-memory cache for GitHub data (5-minute TTL)
let githubCache = { data: null, timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function formatRelativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function buildTaskContext(db) {
  const tasks = db
    .prepare("SELECT * FROM board_tasks ORDER BY column_id, sort_order ASC")
    .all();

  if (tasks.length === 0) return "";

  const columns = {};
  for (const task of tasks) {
    const col = task.column_id;
    if (!columns[col]) columns[col] = [];
    columns[col].push(task);
  }

  const columnOrder = ["in-progress", "todo", "review", "ideas", "shipped"];
  const columnLabels = {
    "in-progress": "In Progress",
    todo: "To Do",
    review: "Review",
    ideas: "Ideas",
    shipped: "Shipped",
  };

  let text = "## Your Task Board\n\n";
  for (const col of columnOrder) {
    const colTasks = columns[col];
    if (!colTasks || colTasks.length === 0) continue;

    text += `### ${columnLabels[col] || col} (${colTasks.length})\n`;
    for (const t of colTasks) {
      const desc = t.description
        ? ` — "${t.description.slice(0, 80)}${t.description.length > 80 ? "…" : ""}"`
        : "";
      text += `- [${t.id}] ${t.title} (${t.priority} priority)${desc}\n`;
    }
    text += "\n";
  }

  return text;
}

async function fetchGitHubContext(db) {
  // Check cache
  if (githubCache.data && Date.now() - githubCache.timestamp < CACHE_TTL) {
    return githubCache.data;
  }

  const github = getFirstGitHubService(db);
  if (!github) return "";

  try {
    const [repo, commits, issues, pulls] = await Promise.all([
      github.getRepository(),
      github.getRecentCommits(5),
      github.getIssues({ state: "open", perPage: 10 }),
      github.getPullRequests({ state: "open", perPage: 5 }),
    ]);

    let text = `## Connected Repository: ${repo.fullName}\n`;
    text += `Description: ${repo.description || "No description"}\n`;
    text += `Primary language: ${repo.language || "Unknown"}\n\n`;

    // Recent commits
    if (commits.length > 0) {
      text += `### Recent Commits\n`;
      for (const c of commits) {
        text += `- ${c.sha} ${c.message} (${formatRelativeTime(c.date)})\n`;
      }
      text += "\n";
    }

    // Open issues
    if (issues.length > 0) {
      text += `### Open Issues (${repo.openIssuesCount} total, showing ${issues.length} most recent)\n`;
      for (const i of issues) {
        const labels = i.labels.length > 0 ? ` [${i.labels.join(", ")}]` : "";
        text += `- #${i.number} ${i.title}${labels}\n`;
      }
      text += "\n";
    }

    // Open PRs
    if (pulls.length > 0) {
      text += `### Open Pull Requests (${pulls.length})\n`;
      for (const p of pulls) {
        const draft = p.draft ? " (draft)" : "";
        text += `- #${p.number} ${p.title} by @${p.user}${draft} (${p.head} → ${p.base})\n`;
      }
      text += "\n";
    }

    githubCache = { data: text, timestamp: Date.now() };
    return text;
  } catch (err) {
    console.error("Failed to fetch GitHub context:", err.message);
    return "";
  }
}

/**
 * Build the full system context for the AI, combining task board and GitHub data.
 */
export async function buildContext(db) {
  const preamble =
    "You are a helpful AI assistant integrated into Forge, a project management and automation dashboard. " +
    "You have read-only access to the user's task board and connected GitHub repository. " +
    "Use this context to answer questions about tasks, issues, pull requests, and code. " +
    "Be concise and specific when referencing items.\n\n";

  const [taskCtx, githubCtx] = await Promise.all([
    buildTaskContext(db),
    fetchGitHubContext(db),
  ]);

  if (!taskCtx && !githubCtx) return "";

  return preamble + taskCtx + githubCtx;
}
