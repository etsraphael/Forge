import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router'
import {
  Anvil,
  Settings,
  LayoutDashboard,
  ListTodo,
  BarChart3,
  MessageSquare,
  Plug,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { ProjectSwitcher } from '@/components/project-switcher'

const navItems: {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/insights', label: 'Insights', icon: BarChart3 },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/connectors', label: 'Connectors', icon: Plug },
]

interface SidebarLinkProps {
  to: string
  icon: LucideIcon
  label: string
  badge?: number
  end?: boolean
  onClick?: () => void
}

function SidebarLink({
  to,
  icon: Icon,
  label,
  badge,
  end,
  onClick,
}: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 rounded-lg mx-2 px-3 py-2 text-sm font-medium transition-colors duration-150',
          isActive
            ? 'bg-sidebar-accent text-sidebar-foreground'
            : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-sidebar-primary" />
          )}
          <Icon className="size-[18px] shrink-0" />
          <span>{label}</span>
          {badge != null && badge > 0 && (
            <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              {badge}
            </span>
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const closeSidebar = () => setSidebarOpen(false)

  const sidebarContent = (
    <>
      {/* Nav items */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-1 py-3">
        {navItems.map((item) => (
          <SidebarLink
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            end={item.end}
            badge={item.label === 'Overview' ? pendingCount : undefined}
            onClick={closeSidebar}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="mx-3 border-t border-sidebar-border" />
      <div className="space-y-1 px-1 py-3">
        <div className="flex items-center gap-2 mx-2 px-3 py-2 text-xs font-medium text-sidebar-foreground/40">
          <span className="size-1.5 rounded-full bg-green" />
          System OK
        </div>
        <SidebarLink
          to="/settings"
          icon={Settings}
          label="Settings"
          onClick={closeSidebar}
        />
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-64 lg:flex-col bg-sidebar border-r border-sidebar-border">
        {/* Sidebar header */}
        <div className="flex h-14 items-center gap-2.5 px-5">
          <Anvil className="size-5 text-sidebar-primary" />
          <span className="text-lg font-semibold text-sidebar-foreground">
            Forge
          </span>
        </div>
        <div className="px-4 pb-3">
          <ProjectSwitcher />
        </div>
        <div className="mx-3 border-t border-sidebar-border" />
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden animate-in fade-in duration-200"
          onClick={closeSidebar}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar border-r border-sidebar-border',
          'transition-transform duration-300 ease-in-out lg:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Drawer header */}
        <div className="flex h-14 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <Anvil className="size-5 text-sidebar-primary" />
            <span className="text-lg font-semibold text-sidebar-foreground">
              Forge
            </span>
          </div>
          <button
            onClick={closeSidebar}
            className="rounded-lg p-1 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="px-4 pb-3">
          <ProjectSwitcher />
        </div>
        <div className="mx-3 border-t border-sidebar-border" />
        {sidebarContent}
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col lg:pl-64 min-w-0">
        {/* Mobile header */}
        <header className="flex h-14 items-center gap-3 border-b border-border px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <Anvil className="size-4 text-primary" />
            <span className="font-semibold text-foreground">Forge</span>
          </div>
          <div className="ml-auto">
            <span className="size-1.5 rounded-full bg-green block" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
