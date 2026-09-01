'use client';

/**
 * /admin — landing del panel. Muestra el Dashboard del CRM (resumen real)
 * de la subcuenta activa. Es el destino del enlace "Dashboard" del menú.
 */

import { useEffect } from 'react';
import { useApp } from '@/store/useApp';
import { useCrmData } from '@/modules/crm/useCrmData';
import Dashboard from '@/modules/crm/views/Dashboard';

export default function AdminHomePage() {
  const { account, loading } = useCrmData();
  const setSection = useApp((s) => s.setSection);

  useEffect(() => {
    setSection('dashboard');
  }, [setSection]);

  if (loading) return <div className="p-8 text-ink-soft">Cargando...</div>;
  if (!account) return null;

  return <Dashboard />;
}
