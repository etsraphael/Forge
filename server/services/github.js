import { Octokit } from '@octokit/rest'

export class GitHubService {
  constructor(token, repo) {
    this.octokit = new Octokit({ auth: token })
    const [owner, name] = repo.split('/')
    this.owner = owner
    this.repo = name
  }

  async testConnection() {
    try {
      const [{ data: user, headers }, { data: repoInfo }] = await Promise.all([
        this.octokit.rest.users.getAuthenticated(),
        this.octokit.rest.repos.get({ owner: this.owner, repo: this.repo }),
      ])

      return {
        valid: true,
        user: user.login,
        scopes: headers['x-oauth-scopes'] || '',
        repoInfo: {
          fullName: repoInfo.full_name,
          description: repoInfo.description,
          language: repoInfo.language,
          defaultBranch: repoInfo.default_branch,
          private: repoInfo.private,
        },
      }
    } catch (err) {
      return {
        valid: false,
        error: err.message,
        status: err.status,
      }
    }
  }

  async getRepository() {
    const { data } = await this.octokit.rest.repos.get({
      owner: this.owner,
      repo: this.repo,
    })
    return {
      fullName: data.full_name,
      description: data.description,
      language: data.language,
      defaultBranch: data.default_branch,
      stargazersCount: data.stargazers_count,
      openIssuesCount: data.open_issues_count,
      private: data.private,
      updatedAt: data.updated_at,
    }
  }

  async getIssues({ state = 'open', labels, page = 1, perPage = 20 } = {}) {
    const params = {
      owner: this.owner,
      repo: this.repo,
      state,
      page,
      per_page: perPage,
      sort: 'updated',
      direction: 'desc',
    }
    if (labels) params.labels = labels

    const { data } = await this.octokit.rest.issues.listForRepo(params)
    // Filter out pull requests (GitHub API returns PRs as issues)
    return data
      .filter((i) => !i.pull_request)
      .map((i) => ({
        number: i.number,
        title: i.title,
        state: i.state,
        labels: i.labels.map((l) => (typeof l === 'string' ? l : l.name)),
        user: i.user?.login,
        createdAt: i.created_at,
        updatedAt: i.updated_at,
        comments: i.comments,
        body: i.body?.slice(0, 500) || '',
      }))
  }

  async getIssue(number) {
    const [{ data: issue }, { data: comments }] = await Promise.all([
      this.octokit.rest.issues.get({
        owner: this.owner,
        repo: this.repo,
        issue_number: number,
      }),
      this.octokit.rest.issues.listComments({
        owner: this.owner,
        repo: this.repo,
        issue_number: number,
        per_page: 20,
      }),
    ])

    return {
      number: issue.number,
      title: issue.title,
      state: issue.state,
      body: issue.body || '',
      labels: issue.labels.map((l) => (typeof l === 'string' ? l : l.name)),
      user: issue.user?.login,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      comments: comments.map((c) => ({
        user: c.user?.login,
        body: c.body?.slice(0, 500) || '',
        createdAt: c.created_at,
      })),
    }
  }

  async getPullRequests({ state = 'open', page = 1, perPage = 20 } = {}) {
    const { data } = await this.octokit.rest.pulls.list({
      owner: this.owner,
      repo: this.repo,
      state,
      page,
      per_page: perPage,
      sort: 'updated',
      direction: 'desc',
    })

    return data.map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      user: pr.user?.login,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      head: pr.head?.ref,
      base: pr.base?.ref,
      draft: pr.draft,
      mergeable: pr.mergeable,
    }))
  }

  async getPullRequest(number) {
    const [{ data: pr }, { data: files }] = await Promise.all([
      this.octokit.rest.pulls.get({
        owner: this.owner,
        repo: this.repo,
        pull_number: number,
      }),
      this.octokit.rest.pulls.listFiles({
        owner: this.owner,
        repo: this.repo,
        pull_number: number,
        per_page: 50,
      }),
    ])

    return {
      number: pr.number,
      title: pr.title,
      state: pr.state,
      body: pr.body || '',
      user: pr.user?.login,
      head: pr.head?.ref,
      base: pr.base?.ref,
      draft: pr.draft,
      mergeable: pr.mergeable,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
      files: files.map((f) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
      })),
    }
  }

  async getFileContent(filePath, ref) {
    const params = {
      owner: this.owner,
      repo: this.repo,
      path: filePath,
    }
    if (ref) params.ref = ref

    const { data } = await this.octokit.rest.repos.getContent(params)

    if (Array.isArray(data)) {
      // It's a directory
      return {
        type: 'directory',
        entries: data.map((e) => ({
          name: e.name,
          type: e.type,
          path: e.path,
          size: e.size,
        })),
      }
    }

    return {
      type: 'file',
      name: data.name,
      path: data.path,
      size: data.size,
      content:
        data.encoding === 'base64'
          ? Buffer.from(data.content, 'base64').toString('utf-8')
          : data.content,
    }
  }

  async getTree(treePath = '', ref) {
    const params = {
      owner: this.owner,
      repo: this.repo,
      path: treePath || '',
    }
    if (ref) params.ref = ref

    const { data } = await this.octokit.rest.repos.getContent(params)

    if (!Array.isArray(data)) {
      return [
        { name: data.name, type: data.type, path: data.path, size: data.size },
      ]
    }
    return data.map((e) => ({
      name: e.name,
      type: e.type,
      path: e.path,
      size: e.size,
    }))
  }

  async getRecentCommits(count = 10) {
    const { data } = await this.octokit.rest.repos.listCommits({
      owner: this.owner,
      repo: this.repo,
      per_page: count,
    })

    return data.map((c) => ({
      sha: c.sha.slice(0, 7),
      message: c.commit.message.split('\n')[0],
      author: c.commit.author?.name || c.author?.login,
      date: c.commit.author?.date,
    }))
  }

  async searchCode(query) {
    const { data } = await this.octokit.rest.search.code({
      q: `${query} repo:${this.owner}/${this.repo}`,
      per_page: 10,
    })

    return {
      totalCount: data.total_count,
      items: data.items.map((item) => ({
        name: item.name,
        path: item.path,
        htmlUrl: item.html_url,
      })),
    }
  }
}

/**
 * Create a GitHubService from a stored connector ID.
 */
export function getGitHubService(db, connectorId) {
  const row = db
    .prepare('SELECT * FROM provider_settings WHERE id = ?')
    .get(connectorId)
  if (!row) return null

  const config = JSON.parse(row.config || '{}')
  if (config.category !== 'repository' || row.provider !== 'github') return null
  if (!config.token || !config.repo) return null

  return new GitHubService(config.token, config.repo)
}

/**
 * Get the first enabled GitHub connector's service, or null.
 * When projectId is provided, only returns connectors for that project.
 */
export function getFirstGitHubService(db, projectId) {
  const query = projectId
    ? 'SELECT * FROM provider_settings WHERE enabled = 1 AND project_id = ? ORDER BY created_at ASC'
    : 'SELECT * FROM provider_settings WHERE enabled = 1 ORDER BY created_at ASC'
  const rows = projectId
    ? db.prepare(query).all(projectId)
    : db.prepare(query).all()
  for (const row of rows) {
    const config = JSON.parse(row.config || '{}')
    if (
      config.category === 'repository' &&
      row.provider === 'github' &&
      config.token &&
      config.repo
    ) {
      return new GitHubService(config.token, config.repo)
    }
  }
  return null
}
