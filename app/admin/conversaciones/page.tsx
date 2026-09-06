'use client';

/**
 * Módulo CRM · Conversaciones (bandeja omnicanal)
 * Reutiliza ConversationsView, scopeada a la subcuenta activa vía useCrmData.
 */

import { useEffect } from 'react';
import { useApp } from '@/store/useApp';
import { useCrmData } from '@/modules/crm/useCrmData';
import ConversationsView from '@/modules/crm/views/ConversationsView';

export default function ConversacionesPage() {
  const { account, loading } = useCrmData();
  const setSection = useApp((s) => s.setSection);

  useEffect(() => {
    setSection('conversaciones');
  }, [setSection]);

  if (loading) return <div className="p-8 text-ink-soft">Cargando...</div>;
  if (!account) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="flex items-center justify-between pb-3">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Conversaciones</h1>
      </div>
      <div className="flex-1 min-h-0 rounded-2xl border border-line bg-app overflow-hidden shadow-sm">
        <ConversationsView />
      </div>
    </div>
  );
}
