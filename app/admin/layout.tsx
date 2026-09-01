'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ThemeProvider } from '@/design-system';
import { useActiveModules } from '@/core/modules/useActiveModules';
import { ActiveAccountProvider, useActiveAccount } from '@/core/account/activeAccount';
import { LayoutDashboard, Settings, Bell, LogOut, Briefcase } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ActiveAccountProvider>
      <AdminShell>{children}</AdminShell>
    </ActiveAccountProvider>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  // Cuenta ACTIVA (subcuenta seleccionada por el dueño de agencia, o la propia).
  const { account, accounts, isAgency, setActiveAccount, loading } = useActiveAccount();
  const pathname = usePathname();
  const router = useRouter();

  // Navegación generada desde los MÓDULOS ACTIVOS de la subcuenta activa.
  // Dashboard y Configuración son del Núcleo (siempre presentes).
  const { modules } = useActiveModules(account?.id);
  const nav = [
    {
      group: 'PRINCIPAL',
      items: [{ href: '/admin', label: 'Dashboard', Icon: LayoutDashboard }],
    },
    // Solo el dueño de agencia ve la gestión de subcuentas/usuarios.
    ...(isAgency
      ? [{ group: 'AGENCIA', items: [{ href: '/admin/agency', label: 'Subcuentas', Icon: Briefcase }] }]
      : []),
    ...modules.map((m) => ({ group: m.navGroup, items: m.nav })),
    {
      group: 'CONFIG',
      items: [{ href: '/admin/settings', label: 'Configuración', Icon: Settings }],
    },
  ];

  // Tema de marca de la instancia (campos vacíos => hereda de la Matriz)
  const theme = {
    primary: account?.brand_primary,
    primaryLight: account?.brand_primary_light,
    accent: account?.brand_accent,
    sidebar: account?.brand_sidebar,
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-soft">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <div className="text-sm font-medium text-ink-soft">Cargando sesión...</div>
        </div>
      </div>
    );
  }

  const instanceName = account?.name ?? 'Mi cuenta';
  const instanceLabel = account?.display_label ?? 'Inmobiliaria';
  const userInitials = (user.email ?? '?').slice(0, 2).toUpperCase();

  return (
    <ThemeProvider theme={theme}>
      <div className="min-h-screen bg-soft">
        <div className="flex">
          {/* ───── Sidebar ───── */}
          <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-sidebar text-inverse">
            {/* Marca de la instancia */}
            <div className="flex items-center gap-3 px-5 pt-6 pb-8">
              {account?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={account.logo_url} alt={instanceName} className="h-8 w-8 rounded-lg object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-inverse">
                  {instanceName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-bold leading-tight">{instanceName}</div>
                <div className="text-[10px] font-bold tracking-[0.14em] text-accent">
                  {instanceLabel.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Selector de subcuenta (dueño de Agencia) */}
            {isAgency && accounts.length > 0 && (
              <div className="px-3 pb-5">
                <div className="px-2 pb-1 text-[10px] font-bold tracking-[0.14em] text-inverse/35">
                  SUBCUENTA
                </div>
                <select
                  value={account?.id ?? ''}
                  onChange={(e) => setActiveAccount(e.target.value)}
                  className="w-full rounded-lg border border-inverse/15 bg-inverse/10 px-2 py-1.5 text-xs font-medium text-inverse focus:outline-none"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id} className="text-ink">
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Navegación */}
            <nav className="flex-1 space-y-6 overflow-y-auto px-3">
              {nav.map((g) => (
                <div key={g.group}>
                  <div className="px-2 pb-2 text-[10px] font-bold tracking-[0.18em] text-inverse/35">
                    {g.group}
                  </div>
                  <div className="space-y-0.5">
                    {g.items.map(({ href, label, Icon }) => {
                      const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));
                      return (
                        <Link
                          key={href}
                          href={href}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            active
                              ? 'bg-primary text-inverse shadow-[inset_2px_0_0_var(--color-accent)]'
                              : 'text-inverse/60 hover:bg-inverse/5 hover:text-inverse'
                          }`}
                        >
                          <Icon size={16} strokeWidth={2.2} />
                          <span className="flex-1">{label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* Usuario / salir */}
            <div className="m-3 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-accent">{user.email}</div>
                <div className="text-[11px] text-inverse/50">Sesión activa</div>
              </div>
              <button
                onClick={() => signOut().then(() => router.push('/auth/login'))}
                title="Cerrar sesión"
                className="shrink-0 rounded-lg p-1.5 text-inverse/40 hover:bg-inverse/10 hover:text-inverse"
              >
                <LogOut size={15} />
              </button>
            </div>
          </aside>

          {/* ───── Contenido ───── */}
          <div className="ml-60 flex-1">
            {/* Topbar */}
            <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-app px-6 py-3">
              <div className="text-sm font-semibold text-ink-soft">
                {instanceName} · <span className="text-ink-soft/60">{instanceLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="relative rounded-lg p-2 text-ink-soft hover:bg-soft" aria-label="Notificaciones">
                  <Bell size={18} />
                  <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-inverse">
                    3
                  </span>
                </button>
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-inverse"
                  title={user.email}
                >
                  {userInitials}
                </div>
              </div>
            </header>

            {/* Main */}
            <main className="p-8">{children}</main>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
