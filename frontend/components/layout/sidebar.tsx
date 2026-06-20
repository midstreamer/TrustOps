'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, hasRole, SOC_ROLES, MANAGER_ROLES, CLIENT_ROLES, ADMIN_SETUP_ROLES } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  Shield, LayoutDashboard, FolderOpen, FileText, Settings, LogOut, Users, Brain, Wrench, Plug, ScrollText, KeyRound,
} from 'lucide-react';

const navItems = [
  { href: '/app/cases', label: 'Case Queue', icon: FolderOpen, roles: SOC_ROLES },
  { href: '/app/manager', label: 'Manager Dashboard', icon: LayoutDashboard, roles: MANAGER_ROLES },
  { href: '/app/trust-metrics', label: 'Trust Metrics', icon: Brain, roles: MANAGER_ROLES },
  { href: '/app/integrations', label: 'Integrations', icon: Plug, roles: MANAGER_ROLES },
  { href: '/app/audit', label: 'Audit Log', icon: ScrollText, roles: MANAGER_ROLES },
  { href: '/app/admin', label: 'Pilot Admin', icon: KeyRound, roles: ADMIN_SETUP_ROLES },
  { href: '/app/admin/setup', label: 'Admin Setup', icon: Wrench, roles: ADMIN_SETUP_ROLES },
  { href: '/app/client-dashboard', label: 'Client Dashboard', icon: Users, roles: [...CLIENT_ROLES, ...MANAGER_ROLES] },
  { href: '/app/reports', label: 'Reports', icon: FileText, roles: [...MANAGER_ROLES, ...CLIENT_ROLES] },
  { href: '/app/settings/sla', label: 'SLA Settings', icon: Settings, roles: MANAGER_ROLES },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <div className="font-bold text-foreground">TrustOps</div>
          <div className="text-xs text-muted">SOC Operations</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems
          .filter((item) => hasRole(user, item.roles))
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                pathname.startsWith(item.href)
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted hover:bg-border/50 hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
      </nav>
      <div className="border-t border-border p-4">
        <div className="mb-2 text-sm font-medium">{user?.name}</div>
        <div className="mb-3 text-xs text-muted">{user?.roles.join(', ')}</div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-border/50 hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
