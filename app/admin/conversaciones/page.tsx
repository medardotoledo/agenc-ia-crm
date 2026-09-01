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
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Conversaciones</h1>
      <ConversationsView />
    </div>
  );
}
