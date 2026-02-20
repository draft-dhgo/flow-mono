import { NavLink } from 'react-router-dom';
import { LayoutDashboard, GitBranch, Server, Workflow, ListChecks } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/workflow-runs', label: 'Runs', icon: ListChecks },
  { to: '/workflows', label: 'Workflows', icon: Workflow },
  { to: '/gits', label: 'Git', icon: GitBranch },
  { to: '/mcp-servers', label: 'MCP Servers', icon: Server },
];

export function Sidebar() {
  return (
    <aside className="w-60 border-r bg-sidebar text-sidebar-foreground flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Workflow Manager</h2>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
