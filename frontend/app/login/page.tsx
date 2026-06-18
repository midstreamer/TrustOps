'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('analyst1@trustops.demo');
  const [password, setPassword] = useState('TrustOps123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refresh } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api<{ access_token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(res.access_token);
      const me = await api<{ roles: string[] }>('/auth/me');
      await refresh();
      const roles = me.roles;
      if (roles.some((r) => ['Client Admin', 'Client Viewer'].includes(r))) {
        router.push('/app/client-dashboard');
      } else if (roles.some((r) => ['SOC Manager', 'Platform Admin'].includes(r))) {
        router.push('/app/manager');
      } else {
        router.push('/app/cases');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Shield className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-2xl font-bold">TrustOps</h1>
          <p className="mt-2 text-muted">SOC Case Management Platform</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6">
          <div>
            <label className="mb-1 block text-sm text-muted">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">Password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div className="rounded-lg bg-red-900/30 p-3 text-sm text-red-300">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted">
          Demo: analyst1@trustops.demo / TrustOps123!
        </p>
      </div>
    </div>
  );
}
