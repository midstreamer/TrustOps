'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth, hasRole, ADMIN_SETUP_ROLES } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  Building2, KeyRound, LayoutDashboard, ListChecks, Palette, RefreshCw, Users, Wrench,
} from 'lucide-react';

const ADMIN_LINKS = [
  { href: '/app/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/app/admin/clients', label: 'Clients', icon: Building2 },
  { href: '/app/admin/users', label: 'Users', icon: Users },
  { href: '/app/admin/integration-keys', label: 'Integration Keys', icon: KeyRound },
  { href: '/app/admin/report-branding', label: 'Report Branding', icon: Palette },
  { href: '/app/admin/pilot-checklist', label: 'Pilot Checklist', icon: ListChecks },
  { href: '/app/admin/demo-reset', label: 'Demo Reset', icon: RefreshCw },
  { href: '/app/admin/setup', label: 'Legacy Setup', icon: Wrench },
];

export function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && user && !hasRole(user, ADMIN_SETUP_ROLES)) {
      router.replace('/app/cases');
    }
  }, [user, loading, router]);

  if (loading || !user) return null;
  if (!hasRole(user, ADMIN_SETUP_ROLES)) return null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Pilot Admin Console</p>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      <nav className="flex flex-wrap gap-2 border-b border-border pb-4">
        {ADMIN_LINKS.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors',
                active ? 'bg-primary/20 text-primary' : 'text-muted hover:bg-border/50 hover:text-foreground',
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
