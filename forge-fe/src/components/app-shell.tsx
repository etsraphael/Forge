import { NavLink, Outlet } from 'react-router'
import { Anvil, Settings } from 'lucide-react'

import { cn } from '@/lib/utils'
import { ProjectSwitcher } from '@/components/project-switcher'

const navItems = [
  { to: '/', label: 'Overview', end: true },
  { to: '/tasks', label: 'Tasks' },
  { to: '/insights', label: 'Insights' },
]

interface NavTabProps {
  to: string
  label: string
  badge?: number
  end?: boolean
}

function NavTab({ to, label, badge, end }: NavTabProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'relative px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className="flex items-center gap-1.5">
            {label}
            {badge != null && badge > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {badge}
              </span>
            )}
          </span>
          {isActive && (
            <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
          )}
        </>
      )}
    </NavLink>
  )
}

interface AppShellProps {
  pendingCount?: number
}

export function AppShell({ pendingCount }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          {/* Left: logo + project */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Anvil className="size-5 text-primary" />
              <span className="text-lg font-semibold text-foreground">
                Forge
              </span>
            </div>
            <div className="h-5 w-px bg-border" />
            <ProjectSwitcher />
          </div>

          {/* Right: system status + settings */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-green-dim px-2.5 py-1 text-xs font-medium text-green">
              <span className="size-1.5 rounded-full bg-green" />
              System OK
            </div>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                cn(
                  'rounded-lg p-1.5 transition-colors',
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Settings className="size-4" />
            </NavLink>
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="mx-auto flex max-w-7xl gap-1 px-6">
          {navItems.map((item) => (
            <NavTab
              key={item.to}
              to={item.to}
              label={item.label}
              end={item.end}
              badge={item.label === 'Overview' ? pendingCount : undefined}
            />
          ))}
        </nav>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}
