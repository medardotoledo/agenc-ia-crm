'use client';

/**
 * Módulo CRM · Fábrica de Agentes de IA
 * Arquitectura No-Code para Setters, Closers y Soporte con Segundo Cerebro y Gimnasio de Role-Playing.
 */

import { useEffect } from 'react';
import { useApp } from '@/store/useApp';
import { useCrmData } from '@/modules/crm/useCrmData';
import AgentsFactoryView from '@/modules/crm/views/AgentsFactoryView';

export default function FabricaAgentesPage() {
  const { account, loading } = useCrmData();
  const setSection = useApp((s) => s.setSection);

  useEffect(() => {
    // Si la sección existe en useApp o se registra
    try {
      setSection('fabrica-agentes' as any);
    } catch {}
  }, [setSection]);

  if (loading) return <div className="p-8 text-ink-soft">Cargando Fábrica de Agentes...</div>;
  if (!account) return null;

  return (
    <div className="flex flex-col min-h-full">
      <AgentsFactoryView />
    </div>
  );
}
