'use client';

/**
 * HeroSection — Hero inmobiliario con flip card 3D.
 * Frente: búsqueda clásica con filtros.
 * Reverso: chat conversacional con IA (Modo Agente).
 */

import { useState } from 'react';
import { Sparkles, SlidersHorizontal } from 'lucide-react';
import { SearchForm } from './SearchForm';
import { AgentChat } from './AgentChat';

export function HeroSection() {
  const [searchType, setSearchType] = useState<'rent' | 'buy'>('rent');
  const [agentMode, setAgentMode] = useState(false);

  return (
    <section className="relative min-h-screen bg-gradient-to-b from-primary via-primary to-soft pt-20">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative container mx-auto px-4 md:px-6 lg:px-8 py-16">
        {/* Badge */}
        <div className="mb-8 text-center">
          <span className="inline-block rounded-full bg-accent/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-accent">
            Exclusividad & Confianza
          </span>
        </div>

        {/* Headline */}
        <div className="mx-auto mb-10 max-w-4xl text-center">
          <h1 className="mb-4 text-4xl font-bold leading-tight text-inverse md:text-5xl lg:text-6xl">
            Encontramos el hogar que entiende tu{' '}
            <span className="text-accent">estilo de vida</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-inverse/80 md:text-xl">
            En Nodo Inmobiliario no nos limitamos a vender casas; escuchamos tus
            necesidades para guiarte con calidez hacia tu espacio ideal en el Querétaro Moderno.
          </p>
        </div>

        {/* ── FLIP CARD ── */}
        <div className="mx-auto max-w-4xl" style={{ perspective: '1200px' }}>
          {/* Toggle button — flota arriba de la tarjeta */}
          <div className="mb-3 flex justify-end">
            <button
              onClick={() => setAgentMode((v) => !v)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-lg transition-all duration-300 ${
                agentMode
                  ? 'bg-app text-ink hover:bg-soft'
                  : 'bg-accent text-inverse hover:bg-accent/90 shadow-accent/30'
              }`}
            >
              {agentMode ? (
                <><SlidersHorizontal size={15} /> Ver filtros</>
              ) : (
                <><Sparkles size={15} className="animate-pulse" /> ✦ Modo Agente</>
              )}
            </button>
          </div>

          {/* La tarjeta que gira */}
          <div
            className="relative w-full transition-transform duration-700 ease-in-out"
            style={{
              transformStyle: 'preserve-3d',
              transform: agentMode ? 'rotateY(180deg)' : 'rotateY(0deg)',
              minHeight: agentMode ? '520px' : 'auto',
            }}
          >
            {/* FRENTE — Filtros clásicos */}
            <div
              className="w-full"
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            >
              <SearchForm
                searchType={searchType}
                onSearchTypeChange={setSearchType}
              />
            </div>

            {/* REVERSO — Modo Agente IA */}
            <div
              className="absolute inset-0 w-full overflow-hidden rounded-2xl shadow-2xl"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <AgentChat />
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="mt-12 text-center">
          <div className="mb-1 text-sm text-inverse/60">Desplázate para explorar</div>
          <div className="animate-bounce text-inverse/60">
            <svg className="mx-auto h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
