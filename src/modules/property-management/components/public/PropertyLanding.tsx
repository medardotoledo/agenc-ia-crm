// ════════════════════════════════════════════════════════════════
// PropertyLanding — Landing page estilo Houzez premium
// Secciones con descansos visuales, sin sidebar de portal
// ════════════════════════════════════════════════════════════════

import type { CSSProperties } from 'react';
import type { Property, Account, Agent } from '@/types/database';
import {
  BedDouble, Bath, Car, Maximize2, Landmark,
  CalendarDays, MapPin, Phone, MessageCircle,
  CheckCircle2, ChevronRight, Layers, Calendar, Download,
} from 'lucide-react';
import { PropertyCarousel } from './PropertyCarousel';
import ContactForm from './ContactForm';

function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price);
  } catch {
    return `$${price.toLocaleString('es-MX')} ${currency}`;
  }
}

export default function PropertyLanding({
  property,
  account,
  agents,
}: {
  property: Property;
  account: Account | null;
  agents: Agent[];
}) {
  const amenities = (property.amenities ?? '')
    .split(',').map((a) => a.trim()).filter(Boolean);

  const agent = agents[0] ?? null;
  const waPhone = agent?.whatsapp ?? agent?.phone ?? '';
  const waMsg = encodeURIComponent(`Hola, me interesa la propiedad: ${property.title}`);
  const waLink = waPhone ? `https://wa.me/${waPhone.replace(/\D/g, '')}?text=${waMsg}` : '#formulario';
  const coverImage = property.gallery_images?.[0];

  const brandStyle: CSSProperties = {
    ...(account?.brand_primary ? { ['--color-primary' as string]: account.brand_primary } : {}),
    ...(account?.brand_primary_light ? { ['--color-primary-light' as string]: account.brand_primary_light } : {}),
    ...(account?.brand_accent ? { ['--color-accent' as string]: account.brand_accent } : {}),
  };

  const opColor = property.operation === 'Renta' ? 'bg-emerald-500 text-white' : 'bg-primary text-inverse';

  return (
    <div style={brandStyle} className="min-h-screen bg-app">

      {/* ══════════ HEADER ══════════ */}
      <header className="sticky top-0 z-30 border-b border-line bg-app/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <a href="/" className="flex items-center gap-3">
            {account?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={account.logo_url} alt={account.name} className="h-9 w-9 rounded-lg object-cover" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-inverse">
                {(account?.name ?? 'I').slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="hidden font-bold text-ink sm:block">{account?.name ?? 'Inmobiliaria'}</span>
          </a>
          <nav className="hidden items-center gap-1 text-xs text-ink-soft md:flex">
            <a href="/" className="hover:text-primary transition-colors px-1">Inicio</a>
            <ChevronRight size={12} className="opacity-40" />
            <a href="/propiedades" className="hover:text-primary transition-colors px-1">Propiedades</a>
            <ChevronRight size={12} className="opacity-40" />
            <span className="max-w-[180px] truncate text-ink font-medium px-1">{property.title}</span>
          </nav>
          <a href="#formulario" className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-inverse hover:bg-primary-light transition-colors">
            Contactar
          </a>
        </div>
      </header>

      {/* ══════════ HERO ══════════ */}
      <section className="relative overflow-hidden">
        {/* Fondo con imagen desenfocada */}
        {coverImage && (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverImage} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-dark/75 backdrop-blur-sm" />
          </div>
        )}
        {!coverImage && <div className="absolute inset-0 bg-gradient-to-br from-dark to-dark/80" />}

        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center md:py-20">
          <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${opColor}`}>
              {property.operation}
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/80">
              {property.property_type}
            </span>
          </div>

          <h1 className="text-3xl font-bold text-white sm:text-4xl md:text-5xl leading-tight">
            {property.title}
          </h1>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-white/70 text-sm">
            <MapPin size={14} className="shrink-0" />
            <span>{[property.neighborhood, property.city, property.state].filter(Boolean).join(', ')}</span>
          </div>

          <div className="mt-6 text-4xl font-bold text-white md:text-5xl">
            {formatPrice(property.price, property.currency)}
            {property.operation === 'Renta' && <span className="text-xl font-normal text-white/60"> / mes</span>}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity shadow-lg"
            >
              <MessageCircle size={17} />
              Enviar WhatsApp
            </a>
            <a
              href="#formulario"
              className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-dark hover:bg-white/90 transition-colors shadow-lg"
            >
              <Calendar size={17} />
              Agendar visita
            </a>
          </div>
        </div>
      </section>

      {/* ══════════ BARRA DE DESCARGA ══════════ */}
      <div className="border-b border-line bg-app/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <p className="text-sm text-ink-soft hidden sm:block">
            Descarga la ficha técnica de esta propiedad en PDF
          </p>
          <a
            href={`/api/properties/${property.slug || property.id}/pdf`}
            download
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-inverse hover:bg-primary-light transition-colors shadow-sm"
          >
            <Download size={15} />
            Descargar ficha técnica
          </a>
        </div>
      </div>

      {/* ══════════ CARRUSEL ══════════ */}
      <section className="bg-dark py-10">
        <div className="mx-auto max-w-5xl px-4">
          <PropertyCarousel images={property.gallery_images ?? []} title={property.title} />
        </div>
      </section>

      {/* ══════════ STATS (oscuro con imagen de fondo) ══════════ */}
      {(property.bedrooms || property.bathrooms || property.construction_sqm || property.lot_sqm) && (
        <section className="relative overflow-hidden py-24">
          {coverImage && (
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={property.gallery_images?.[1] ?? coverImage} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-dark/82" />
            </div>
          )}
          {!coverImage && <div className="absolute inset-0 bg-dark" />}

          <div className="relative mx-auto max-w-5xl px-4 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-accent">
              Datos de la propiedad
            </p>
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Cada metro cuadrado,{' '}
              <em className="text-accent not-italic font-light">pensado para ti</em>
            </h2>

            <div className="mt-14 grid grid-cols-2 divide-x divide-white/10 border border-white/10 md:grid-cols-4">
              {property.construction_sqm != null && (
                <div className="px-6 py-8 text-center">
                  <div className="text-5xl font-bold text-white md:text-6xl">
                    {property.construction_sqm}<span className="text-2xl text-accent">m²</span>
                  </div>
                  <div className="mt-2 text-[11px] font-bold uppercase tracking-widest text-white/50">Construcción</div>
                </div>
              )}
              {property.bedrooms != null && (
                <div className="px-6 py-8 text-center">
                  <div className="text-5xl font-bold text-white md:text-6xl">{property.bedrooms}</div>
                  <div className="mt-2 text-[11px] font-bold uppercase tracking-widest text-white/50">Recámaras</div>
                </div>
              )}
              {property.bathrooms != null && (
                <div className="px-6 py-8 text-center">
                  <div className="text-5xl font-bold text-white md:text-6xl">{property.bathrooms}</div>
                  <div className="mt-2 text-[11px] font-bold uppercase tracking-widest text-white/50">Baños</div>
                </div>
              )}
              {property.lot_sqm != null && (
                <div className="px-6 py-8 text-center">
                  <div className="text-5xl font-bold text-white md:text-6xl">
                    {property.lot_sqm}<span className="text-2xl text-accent">m²</span>
                  </div>
                  <div className="mt-2 text-[11px] font-bold uppercase tracking-widest text-white/50">Terreno</div>
                </div>
              )}
            </div>

            {/* Specs secundarios */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-white/60">
              {property.parking_spaces != null && (
                <span className="flex items-center gap-1.5"><Car size={14} className="text-accent" />{property.parking_spaces} estacionamientos</span>
              )}
              {property.levels != null && (
                <span className="flex items-center gap-1.5"><Layers size={14} className="text-accent" />{property.levels} niveles</span>
              )}
              {property.condition && (
                <span className="flex items-center gap-1.5"><CalendarDays size={14} className="text-accent" />{property.condition}</span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ══════════ DESCRIPCIÓN ══════════ */}
      {(property.description_long || property.description_short) && (
        <section className="bg-soft py-20 md:py-28">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-primary">Descripción</p>
            <h2 className="mb-8 text-3xl font-bold text-ink md:text-4xl italic leading-tight">
              &ldquo;Espacios que superan expectativas&rdquo;
            </h2>
            <p className="mx-auto max-w-2xl text-[15px] leading-relaxed text-ink-soft whitespace-pre-line">
              {property.description_long || property.description_short}
            </p>
          </div>
        </section>
      )}

      {/* ══════════ AMENIDADES ══════════ */}
      {amenities.length > 0 && (
        <section className="bg-app py-20 md:py-28">
          <div className="mx-auto max-w-5xl px-4">
            <div className="text-center mb-12">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-primary">Lo que incluye</p>
              <h2 className="text-3xl font-bold text-ink md:text-4xl">Amenidades</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {amenities.map((a, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-line bg-soft px-4 py-3.5">
                  <CheckCircle2 size={17} className="shrink-0 text-primary" />
                  <span className="text-sm text-ink">{a}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════ GALERÍA ══════════ */}
      {(property.gallery_images?.length ?? 0) > 2 && (
        <section className="bg-soft py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center mb-12">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-primary">Fotos</p>
              <h2 className="text-3xl font-bold text-ink md:text-4xl italic">
                &ldquo;Ver para enamorarse&rdquo;
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {property.gallery_images.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt={`${property.title} — foto ${i + 1}`}
                  className={`w-full rounded-xl object-cover ${i === 0 ? 'col-span-2 row-span-2 h-80' : 'h-40'}`}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════ VIDEO ══════════ */}
      {property.video_url && (
        <section className="bg-dark py-20 md:py-28">
          <div className="mx-auto max-w-5xl px-4">
            <div className="text-center mb-10">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-accent">Video</p>
              <h2 className="text-3xl font-bold text-white md:text-4xl">
                Recorre la propiedad
              </h2>
            </div>
            <div className="overflow-hidden rounded-2xl aspect-video shadow-2xl">
              <iframe
                src={property.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/')}
                title="Video de la propiedad"
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      )}

      {/* ══════════ PLANOS ══════════ */}
      {property.floor_plans?.length > 0 && (
        <section className="bg-soft py-20 md:py-28">
          <div className="mx-auto max-w-5xl px-4">
            <div className="text-center mb-12">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-primary">Distribución</p>
              <h2 className="text-3xl font-bold text-ink md:text-4xl">
                Planos de la propiedad
              </h2>
            </div>
            <div className={`grid gap-6 ${property.floor_plans.length === 1 ? 'max-w-2xl mx-auto' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {property.floor_plans.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt={`Plano ${i + 1}`}
                  className="w-full rounded-2xl border border-line bg-app object-contain shadow-sm"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════ ZONA ══════════ */}
      {property.description_zone && (
        <section className="bg-app py-20 md:py-28">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-primary">La zona</p>
            <h2 className="mb-8 text-3xl font-bold text-ink md:text-4xl italic leading-tight">
              &ldquo;Ubicación privilegiada&rdquo;
            </h2>
            <p className="text-[15px] leading-relaxed text-ink-soft whitespace-pre-line">
              {property.description_zone}
            </p>
          </div>
        </section>
      )}

      {/* ══════════ MAPA ══════════ */}
      {(property as any).latitude && (property as any).longitude && (
        <section className="bg-soft py-20 md:py-28">
          <div className="mx-auto max-w-5xl px-4">
            <div className="text-center mb-10">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-primary">Ubicación</p>
              <h2 className="text-3xl font-bold text-ink md:text-4xl">A minutos de todo</h2>
            </div>
            <div className="overflow-hidden rounded-2xl border border-line shadow-sm">
              <iframe
                title="Mapa de ubicación"
                src={`https://maps.google.com/maps?q=${(property as any).latitude},${(property as any).longitude}&z=15&output=embed`}
                className="h-[380px] w-full"
                loading="lazy"
              />
            </div>
          </div>
        </section>
      )}

      {/* ══════════ ASESOR + CTA ══════════ */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 bg-dark" />
        {coverImage && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
          </>
        )}

        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-accent">Tu asesor</p>
          <h2 className="mb-10 text-3xl font-bold text-white md:text-4xl">
            Da el primer paso hoy
          </h2>

          {agent && (
            <div className="mb-10 flex flex-col items-center gap-4">
              {agent.photo_id ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={agent.photo_id} alt={agent.name} className="h-24 w-24 rounded-full object-cover ring-4 ring-accent/40" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-2xl font-bold text-inverse">
                  {agent.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-xl font-bold text-white">{agent.name}</div>
                {agent.title && <div className="text-sm text-white/60 mt-1">{agent.title}</div>}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-xl bg-[#25D366] px-8 py-4 text-base font-bold text-white hover:opacity-90 transition-opacity shadow-xl"
            >
              <MessageCircle size={20} />
              Escribir por WhatsApp
            </a>
            {agent?.phone && (
              <a
                href={`tel:${agent.phone}`}
                className="flex items-center gap-2.5 rounded-xl border border-white/25 bg-white/10 px-8 py-4 text-base font-semibold text-white hover:bg-white/20 transition-colors"
              >
                <Phone size={18} />
                Llamar
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ══════════ FORMULARIO ══════════ */}
      <section id="formulario" className="scroll-mt-20 bg-soft py-20 md:py-28">
        <div className="mx-auto max-w-xl px-4">
          <div className="text-center mb-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-primary">Contacto</p>
            <h2 className="text-3xl font-bold text-ink md:text-4xl">
              ¿Te interesa esta propiedad?
            </h2>
            <p className="mt-3 text-ink-soft">Déjanos tus datos y te contactamos hoy mismo.</p>
          </div>
          <div className="rounded-2xl bg-app p-8 shadow-sm border border-line">
            <ContactForm
              accountId={property.account_id}
              propertyId={property.id}
              propertyTitle={property.title}
            />
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="border-t border-line bg-app">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-ink-soft">
          <span>© {new Date().getFullYear()} {account?.name ?? 'Inmobiliaria'} · Todos los derechos reservados</span>
          <a href="/propiedades" className="hover:text-primary transition-colors">← Ver más propiedades</a>
        </div>
      </footer>
    </div>
  );
}
