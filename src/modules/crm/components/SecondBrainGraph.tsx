'use client';

import React, { useState, useMemo } from 'react';
import { Sparkles, Layers, Package, Bot, Shield, FileText, FolderHeart, Info, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

export interface GraphNode {
  id: string;
  label: string;
  type: 'core' | 'agent' | 'product' | 'study' | 'shareable' | 'sheet';
  x: number;
  y: number;
  color: string;
  icon?: string;
  details?: string;
}

export interface GraphLink {
  source: string;
  target: string;
  color?: string;
}

interface SecondBrainGraphProps {
  businessName?: string;
  agents: Array<{ id: string; name: string; role: string }>;
  products: Array<{ id: string; name: string; short_description?: string; study_files_count?: number; shareable_files_count?: number; has_knowledge_sheet?: boolean }>;
  onSelectProduct?: (productId: string) => void;
}

export function SecondBrainGraph({
  businessName = 'Mi Empresa',
  agents = [],
  products = [],
  onSelectProduct,
}: SecondBrainGraphProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);

  // Generación matemática de la red neuronal radial
  const { nodes, links } = useMemo(() => {
    const nList: GraphNode[] = [];
    const lList: GraphLink[] = [];

    const centerX = 400;
    const centerY = 280;

    // 1. Nodo Núcleo Central: La Empresa
    nList.push({
      id: 'core',
      label: businessName,
      type: 'core',
      x: centerX,
      y: centerY,
      color: '#4f46e5',
      details: 'Núcleo Central del Segundo Cerebro: Coordina productos, agentes y memoria compartida.',
    });

    // 2. Nodos de Agentes (Arriba en arco)
    const agentRadius = 140;
    agents.forEach((ag, idx) => {
      const angle = Math.PI + (idx - (agents.length - 1) / 2) * 0.7;
      const x = centerX + agentRadius * Math.cos(angle);
      const y = centerY + agentRadius * Math.sin(angle) - 30;

      nList.push({
        id: 'agent-' + ag.id,
        label: ag.name,
        type: 'agent',
        x,
        y,
        color: '#8b5cf6',
        details: `Agente Activo: ${ag.role}. Consulta el catálogo compartido para atender clientes.`,
      });

      lList.push({ source: 'core', target: 'agent-' + ag.id, color: '#a78bfa' });
    });

    // 3. Nodos de Productos (Abajo en abanico)
    const productRadius = 160;
    products.forEach((prod, idx) => {
      const totalProds = Math.max(products.length, 1);
      const startAngle = 0.2;
      const endAngle = Math.PI - 0.2;
      const angle = startAngle + (idx / Math.max(totalProds - 1, 1)) * (endAngle - startAngle);
      const px = centerX + productRadius * Math.cos(angle);
      const py = centerY + productRadius * Math.sin(angle);

      nList.push({
        id: 'prod-' + prod.id,
        label: prod.name,
        type: 'product',
        x: px,
        y: py,
        color: '#06b6d4',
        details: prod.short_description || 'Cápsula de producto en el catálogo.',
      });

      lList.push({ source: 'core', target: 'prod-' + prod.id, color: '#67e8f9' });

      // Subnodos de cada producto (Documentos de estudio, WhatsApp, Ficha)
      // Zona 1: Estudio
      const sId = 'study-' + prod.id;
      nList.push({
        id: sId,
        label: 'Estudio (' + (prod.study_files_count || 0) + ')',
        type: 'study',
        x: px - 35,
        y: py + 55,
        color: '#f59e0b',
        details: 'Zona 1: Documentos técnicos y manuales que la IA estudia de forma confidencial.',
      });
      lList.push({ source: 'prod-' + prod.id, target: sId, color: '#fcd34d' });

      // Zona 2: WhatsApp
      const wId = 'wa-' + prod.id;
      nList.push({
        id: wId,
        label: 'WhatsApp (' + (prod.shareable_files_count || 0) + ')',
        type: 'shareable',
        x: px,
        y: py + 70,
        color: '#10b981',
        details: 'Zona 2: Archivos multimedia (videos, fotos, PDFs) listos para enviar por WhatsApp.',
      });
      lList.push({ source: 'prod-' + prod.id, target: wId, color: '#6ee7b7' });

      // Zona 3: Ficha
      const fId = 'sheet-' + prod.id;
      nList.push({
        id: fId,
        label: prod.has_knowledge_sheet ? 'Ficha Lista' : 'Ficha Pendiente',
        type: 'sheet',
        x: px + 35,
        y: py + 55,
        color: prod.has_knowledge_sheet ? '#6366f1' : '#94a3b8',
        details: 'Zona 3: Ficha de Conocimiento (Información estructurada para la IA).',
      });
      lList.push({ source: 'prod-' + prod.id, target: fId, color: '#c7d2fe' });
    });

    return { nodes: nList, links: lList };
  }, [businessName, agents, products]);

  const getNode = (id: string) => nodes.find((n) => n.id === id);

  return (
    <div className="bg-slate-950 rounded-3xl border border-slate-800 p-6 text-white shadow-2xl relative overflow-hidden">
      {/* Fondo estelar sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Header del Grafo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Red Neuronal del Segundo Cerebro
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Grafo Interactivo
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualiza cómo los agentes comparten el conocimiento central y las cápsulas de cada producto.
            </p>
          </div>
        </div>

        {/* Controles del Grafo */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.15, 1.6))}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Acercar"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.15, 0.7))}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Alejar"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setZoom(1); setSelectedNode(null); }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Restablecer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas SVG Interactivo */}
      <div className="w-full h-[460px] overflow-hidden relative z-10 flex items-center justify-center select-none">
        <svg
          viewBox="0 0 800 560"
          className="w-full h-full cursor-grab active:cursor-grabbing transition-transform duration-300"
          style={{ transform: `scale(${zoom})` }}
        >
          <defs>
            {/* Filtro de brillo neón */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Líneas de conexión */}
          {links.map((link, idx) => {
            const s = getNode(link.source);
            const t = getNode(link.target);
            if (!s || !t) return null;

            const isHighlighted =
              hoveredNode === s.id || hoveredNode === t.id || selectedNode?.id === s.id || selectedNode?.id === t.id;

            return (
              <line
                key={idx}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={isHighlighted ? '#818cf8' : link.color || '#334155'}
                strokeWidth={isHighlighted ? 2.5 : 1.2}
                strokeOpacity={isHighlighted ? 0.9 : 0.35}
                strokeDasharray={s.type === 'product' && t.type !== 'core' ? '3,3' : undefined}
                className="transition-all duration-300"
              />
            );
          })}

          {/* Nodos */}
          {nodes.map((node) => {
            const isHovered = hoveredNode === node.id;
            const isSelected = selectedNode?.id === node.id;
            const isCore = node.type === 'core';
            const isAgent = node.type === 'agent';
            const isProduct = node.type === 'product';

            const radius = isCore ? 34 : isAgent ? 24 : isProduct ? 20 : 12;

            return (
              <g
                key={node.id}
                className="cursor-pointer transition-transform duration-200"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => {
                  setSelectedNode(node);
                  if (node.type === 'product' && onSelectProduct) {
                    const rawId = node.id.replace('prod-', '');
                    onSelectProduct(rawId);
                  }
                }}
              >
                {/* Aura de brillo */}
                {(isHovered || isSelected || isCore) && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius + 8}
                    fill={node.color}
                    opacity={isHovered || isSelected ? 0.35 : 0.18}
                    filter="url(#glow)"
                  />
                )}

                {/* Círculo del nodo */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius}
                  fill={isHovered ? '#ffffff' : node.color}
                  stroke={isHovered || isSelected ? '#ffffff' : '#1e293b'}
                  strokeWidth={2}
                  className="transition-colors duration-200 shadow-md"
                />

                {/* Emoji / Letra central */}
                <text
                  x={node.x}
                  y={node.y + 4}
                  textAnchor="middle"
                  fontSize={isCore ? 16 : isAgent ? 12 : isProduct ? 11 : 9}
                  fill={isHovered ? '#0f172a' : '#ffffff'}
                  fontWeight="bold"
                  className="pointer-events-none"
                >
                  {isCore ? '🏢' : isAgent ? '🤖' : isProduct ? '📦' : node.type === 'study' ? '🔒' : node.type === 'shareable' ? '📱' : '🧠'}
                </text>

                {/* Etiqueta del nodo */}
                <text
                  x={node.x}
                  y={node.y + radius + 14}
                  textAnchor="middle"
                  fontSize={isCore ? 12 : isAgent ? 11 : isProduct ? 10 : 8}
                  fill={isHovered || isSelected ? '#ffffff' : '#cbd5e1'}
                  fontWeight={isCore || isAgent || isProduct ? '600' : '400'}
                  className="pointer-events-none drop-shadow"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tarjeta de Detalle del Nodo Seleccionado */}
        {selectedNode && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-xs bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl animate-fade-in text-xs z-20">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: selectedNode.color }}
                />
                {selectedNode.label}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white font-bold px-1"
              >
                ✕
              </button>
            </div>
            <p className="text-slate-300 leading-relaxed">{selectedNode.details}</p>
          </div>
        )}
      </div>

      {/* Leyenda Inferior */}
      <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 relative z-10">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" /> Empresa (Núcleo)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Agentes Activos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" /> Productos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Documentos Estudio
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> WhatsApp
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" /> Ficha de Conocimiento
          </span>
        </div>
        <span className="italic text-[10px] text-slate-500">
          Haz clic en cualquier nodo para inspeccionarlo
        </span>
      </div>
    </div>
  );
}
