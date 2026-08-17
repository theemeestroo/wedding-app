'use client'

import { createContext, useContext } from 'react'
import type { CurrentProject } from './project'

const ProjectContext = createContext<CurrentProject | null>(null)

export function ProjectProvider({
  project,
  children,
}: {
  project: CurrentProject
  children: React.ReactNode
}) {
  return <ProjectContext.Provider value={project}>{children}</ProjectContext.Provider>
}

export function useProject(): CurrentProject {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject must be used inside <ProjectProvider>')
  return ctx
}
