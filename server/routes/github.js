import { Router } from "express";
import { GitHubService, getGitHubService } from "../services/github.js";

const router = Router();

// POST /api/github/test — validate token + repo before saving
router.post("/test", async (req, res) => {
  const { token, repo } = req.body;
  if (!token || !repo) {
    return res.status(400).json({ error: "token and repo are required" });
  }
  if (!repo.includes("/")) {
    return res.status(400).json({ error: "repo must be in owner/repo format" });
  }

  const service = new GitHubService(token, repo);
  const result = await service.testConnection();
  res.json(result);
});

// Middleware for :connectorId routes — resolves connector and attaches service
function resolveConnector(req, res, next) {
  const db = req.app.get("db");
  const service = getGitHubService(db, req.params.connectorId);
  if (!service) {
    return res.status(404).json({ error: "GitHub connector not found or not enabled" });
  }
  req.github = service;
  next();
}

// GET /api/github/:connectorId/repo
router.get("/:connectorId/repo", resolveConnector, async (req, res) => {
  try {
    const repo = await req.github.getRepository();
    res.json(repo);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/github/:connectorId/issues
router.get("/:connectorId/issues", resolveConnector, async (req, res) => {
  try {
    const { state, labels, page, per_page } = req.query;
    const issues = await req.github.getIssues({
      state,
      labels,
      page: page ? Number(page) : undefined,
      perPage: per_page ? Number(per_page) : undefined,
    });
    res.json(issues);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/github/:connectorId/issues/:number
router.get("/:connectorId/issues/:number", resolveConnector, async (req, res) => {
  try {
    const issue = await req.github.getIssue(Number(req.params.number));
    res.json(issue);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/github/:connectorId/pulls
router.get("/:connectorId/pulls", resolveConnector, async (req, res) => {
  try {
    const { state, page, per_page } = req.query;
    const pulls = await req.github.getPullRequests({
      state,
      page: page ? Number(page) : undefined,
      perPage: per_page ? Number(per_page) : undefined,
    });
    res.json(pulls);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/github/:connectorId/pulls/:number
router.get("/:connectorId/pulls/:number", resolveConnector, async (req, res) => {
  try {
    const pr = await req.github.getPullRequest(Number(req.params.number));
    res.json(pr);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/github/:connectorId/files — directory listing
router.get("/:connectorId/files", resolveConnector, async (req, res) => {
  try {
    const { path: filePath, ref } = req.query;
    const tree = await req.github.getTree(filePath, ref);
    res.json(tree);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/github/:connectorId/files/content
router.get("/:connectorId/files/content", resolveConnector, async (req, res) => {
  try {
    const { path: filePath, ref } = req.query;
    if (!filePath) {
      return res.status(400).json({ error: "path query parameter is required" });
    }
    const content = await req.github.getFileContent(filePath, ref);
    res.json(content);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/github/:connectorId/commits
router.get("/:connectorId/commits", resolveConnector, async (req, res) => {
  try {
    const { count } = req.query;
    const commits = await req.github.getRecentCommits(count ? Number(count) : undefined);
    res.json(commits);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
