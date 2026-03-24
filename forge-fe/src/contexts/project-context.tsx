import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Project } from '@/types'

const STORAGE_KEY = 'forge-selected-project-id'

interface ProjectContextValue {
  projects: Project[]
  selectedProject: Project | null
  setSelectedProject: (project: Project) => void
  createProject: (name: string, color: string) => Promise<Project>
  updateProject: (id: string, data: { name: string; color: string }) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  loading: boolean
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProjectState] = useState<Project | null>(
    null,
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data: Project[]) => {
        setProjects(data)
        const savedId = localStorage.getItem(STORAGE_KEY)
        const saved = data.find((p) => p.id === savedId)
        const fallback = data.find((p) => p.id === 'default') ?? data[0]
        setSelectedProjectState(saved ?? fallback ?? null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const setSelectedProject = useCallback((project: Project) => {
    setSelectedProjectState(project)
    localStorage.setItem(STORAGE_KEY, project.id)
  }, [])

  const createProject = useCallback(
    async (name: string, color: string): Promise<Project> => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      })
      if (!res.ok) throw new Error('Failed to create project')
      const project: Project = await res.json()
      setProjects((prev) => [...prev, project])
      setSelectedProject(project)
      return project
    },
    [setSelectedProject],
  )

  const updateProject = useCallback(
    async (id: string, data: { name: string; color: string }): Promise<Project> => {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update project')
      const updated: Project = await res.json()
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)))
      setSelectedProjectState((current) =>
        current?.id === id ? updated : current,
      )
      return updated
    },
    [],
  )

  const deleteProject = useCallback(
    async (id: string): Promise<void> => {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete project')
      setProjects((prev) => {
        const next = prev.filter((p) => p.id !== id)
        setSelectedProjectState((current) => {
          if (current?.id === id) {
            const fallback =
              next.find((p) => p.id === 'default') ?? next[0] ?? null
            if (fallback) localStorage.setItem(STORAGE_KEY, fallback.id)
            return fallback
          }
          return current
        })
        return next
      })
    },
    [],
  )

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProject,
        setSelectedProject,
        createProject,
        updateProject,
        deleteProject,
        loading,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject must be used within ProjectProvider')
  return ctx
}
