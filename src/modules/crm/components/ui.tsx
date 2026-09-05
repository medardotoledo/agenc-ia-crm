'use client'

import { MessageCircle, Mail, ChevronDown } from 'lucide-react'

/* lucide eliminÃ³ los Ã­conos de marca â€” SVGs propios para FB e IG */
function FacebookIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 8h2.5l.5-3h-3V3.5c0-.9.3-1.5 1.6-1.5H17V0h-2.6C11.6 0 10 1.7 10 4.7V5H7.5v3H10v8h4V8z" transform="translate(1 4) scale(0.85)" />
    </svg>
  )
}
function InstagramIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}
import type { Channel, Stage, Temperature } from '@/types'
import { STAGE_META, TEMP_META, AVATAR_COLORS, initials } from '@/lib/data/mock'
import { useApp } from '@/store/useApp'

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-7 w-7 text-[10px]', md: 'h-9 w-9 text-xs', lg: 'h-11 w-11 text-sm' }
  const color = AVATAR_COLORS[name.length % AVATAR_COLORS.length]
  return (
    <div className={`${sizes[size]} ${color} flex shrink-0 items-center justify-center rounded-full font-bold`}>
      {initials(name)}
    </div>
  )
}

export function StagePill({ stage }: { stage: Stage }) {
  const m = STAGE_META[stage] || { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', label: 'Etapa' }
  const label = useApp((s) => s.stageLabels[stage]) ?? m.label
  return (
    <span className={`${m.bg} ${m.text} inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap`}>
      {label}
    </span>
  )
}

/** Pill de etapa interactiva â€” click abre el selector y cambia la etapa ahÃ­ mismo */
export function StageSelect({ value, onChange }: { value: Stage; onChange: (s: Stage) => void }) {
  const m = STAGE_META[value] || { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', label: 'Etapa' }
  const labels = useApp((s) => s.stageLabels)
  return (
    <div className={`${m.bg} ${m.text} relative inline-flex items-center rounded-full transition-colors`} title="Cambiar etapa">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Stage)}
        className="cursor-pointer appearance-none bg-transparent py-0.5 pr-6 pl-2.5 text-xs font-semibold outline-none"
      >
        {Object.entries(STAGE_META).map(([k, s]) => (
          <option key={k} value={k}>{labels[k] ?? s.label}</option>
        ))}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-1.5" />
    </div>
  )
}

export function TempBadge({ temp }: { temp: Temperature }) {
  const m = TEMP_META[temp] || { bg: 'bg-slate-100', text: 'text-slate-700', icon: '❓', label: 'Desconocido' }
  return (
    <span className={`${m.bg} ${m.text} inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap`}>
      <span>{m.icon}</span> {m.label}
    </span>
  )
}

export function ScoreBar({ score, lost }: { score: number; lost?: boolean }) {
  const color = lost ? 'bg-danger' : score >= 70 ? 'bg-primary-light' : score >= 45 ? 'bg-success' : 'bg-accent'
  return (
    <div className="flex w-24 items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-soft">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium text-ink-soft">{score}</span>
    </div>
  )
}

const CHANNEL_STYLE: Record<Channel, { bg: string; Icon: React.ComponentType<{ size?: number }> }> = {
  whatsapp: { bg: 'bg-ch-whatsapp', Icon: MessageCircle },
  facebook: { bg: 'bg-ch-facebook', Icon: FacebookIcon },
  instagram: { bg: 'bg-ch-instagram', Icon: InstagramIcon },
  email: { bg: 'bg-ch-email', Icon: Mail },
}

export function ChannelDot({ channel, size = 16 }: { channel: Channel; size?: number }) {
  const { bg, Icon } = CHANNEL_STYLE[channel] || { bg: 'bg-slate-300', Icon: MessageCircle }
  return (
    <span className={`${bg} inline-flex items-center justify-center rounded-full text-inverse`} style={{ width: size, height: size }}>
      <Icon size={size * 0.62} />
    </span>
  )
}

export const CHANNEL_LABEL: Record<Channel, string> = {
  whatsapp: 'WhatsApp', facebook: 'Facebook', instagram: 'Instagram', email: 'Email',
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-app ${className}`}>{children}</div>
}



