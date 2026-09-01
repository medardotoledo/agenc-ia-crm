// ════════════════════════════════════════════════════════════════
// PropertyPDF — Ficha técnica estilo flyer premium
// @react-pdf/renderer — A4 portrait
// ════════════════════════════════════════════════════════════════

import {
  Document, Page, View, Text, Image, StyleSheet,
} from '@react-pdf/renderer';
import type { Property, Account, Agent } from '@/types/database';

/* ─── Helpers ─── */
function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency', currency, maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `$${price.toLocaleString('es-MX')} ${currency}`;
  }
}

function truncate(str: string | undefined | null, max: number) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function fullAddress(p: Property) {
  return [p.street, p.neighborhood, p.city, p.state]
    .filter(Boolean).join(', ');
}

const W = '#ffffff';
const DARK = '#111827';
const GRAY = '#6b7280';
const LIGHT = '#f9fafb';
const BORDER = '#e5e7eb';

/* ─── Estilos ─── */
function makeStyles(primary: string, accent: string) {
  return StyleSheet.create({
    page: {
      backgroundColor: W,
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: DARK,
    },

    /* ── HEADER ── */
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: primary,
    },
    headerLogoWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerLogo: { width: 40, height: 40, borderRadius: 8, objectFit: 'cover' },
    headerLogoFallback: {
      width: 40, height: 40, borderRadius: 8,
      backgroundColor: accent,
      alignItems: 'center', justifyContent: 'center',
    },
    headerLogoText: { color: W, fontSize: 20, fontFamily: 'Helvetica-Bold' },
    headerAgency: { color: W, fontSize: 13, fontFamily: 'Helvetica-Bold' },
    headerTagline: { color: 'rgba(255,255,255,0.65)', fontSize: 7.5, marginTop: 1 },
    headerRight: { alignItems: 'flex-end', gap: 1 },
    headerAgentName: { color: W, fontSize: 9.5, fontFamily: 'Helvetica-Bold' },
    headerContactLine: { color: 'rgba(255,255,255,0.80)', fontSize: 7.5 },

    /* ── TIRA DE OPERACIÓN (debajo del header) ── */
    opStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 10,
      backgroundColor: LIGHT,
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
    },
    opLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    opBadge: {
      paddingHorizontal: 12, paddingVertical: 4,
      borderRadius: 4,
      fontSize: 11, fontFamily: 'Helvetica-Bold',
    },
    opPropType: { fontSize: 10, color: GRAY, fontFamily: 'Helvetica-Bold' },
    opPrice: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: primary },
    opPriceRenta: { fontSize: 8, color: GRAY, marginTop: 2 },

    /* ── HERO IMAGE ── */
    heroWrap: {
      marginHorizontal: 16,
      marginTop: 10,
      borderRadius: 10,
      overflow: 'hidden',
      shadowColor: '#000000',
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
    },
    heroImg: { width: '100%', height: 260, objectFit: 'cover' },
    heroPlaceholder: { width: '100%', height: 260, backgroundColor: primary },

    /* ── TÍTULO + UBICACIÓN ── */
    titleWrap: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
    },
    titleText: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: DARK, lineHeight: 1.3 },
    addressText: { fontSize: 8.5, color: GRAY, marginTop: 3 },

    /* ── GALERÍA (3 fotos) ── */
    galleryWrap: { paddingHorizontal: 16, paddingTop: 8 },
    galleryRow: { flexDirection: 'row', gap: 6 },
    galleryImg: {
      flex: 1, height: 88,
      borderRadius: 7, objectFit: 'cover',
      shadowColor: '#000000',
      shadowOpacity: 0.12,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },

    /* ── SPECS STRIP ── */
    specsStrip: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginTop: 10,
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: BORDER,
    },
    specCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 9,
      backgroundColor: LIGHT,
      borderRightWidth: 1,
      borderRightColor: BORDER,
    },
    specCellLast: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 9,
      backgroundColor: LIGHT,
    },
    specVal: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: primary },
    specLbl: { fontSize: 6.5, color: GRAY, marginTop: 2, textAlign: 'center' },

    /* ── DOS COLUMNAS: descripción + amenidades ── */
    twoCol: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    colLeft: { flex: 3 },
    colRight: { flex: 2 },
    sectionLabel: {
      fontSize: 7, fontFamily: 'Helvetica-Bold',
      color: accent, letterSpacing: 1.3,
      textTransform: 'uppercase', marginBottom: 6,
    },
    bodyText: { fontSize: 8.5, color: '#374151', lineHeight: 1.65 },

    amenGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    amenChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 7, paddingVertical: 3.5,
      backgroundColor: LIGHT,
      borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    },
    amenDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: accent },
    amenText: { fontSize: 7, color: '#374151' },

    /* ── ZONA / DETALLES EXTRA ── */
    extraSection: {
      marginHorizontal: 16,
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: BORDER,
    },

    /* ── CHIPS (condición, etc.) ── */
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 3.5,
      backgroundColor: LIGHT, borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    },
    chipDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: primary },
    chipText: { fontSize: 7.5, color: DARK },

    /* ── LUGARES CERCANOS ── */
    nearbyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    nearbyChip: {
      paddingHorizontal: 8, paddingVertical: 3.5,
      backgroundColor: '#eff6ff', borderRadius: 20, borderWidth: 1, borderColor: '#bfdbfe',
    },
    nearbyText: { fontSize: 7.5, color: '#1e40af' },

    /* ── PLANOS ── */
    plansRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    planImg: {
      width: '47%', height: 140,
      borderRadius: 8, objectFit: 'contain',
      backgroundColor: LIGHT, borderWidth: 1, borderColor: BORDER,
    },

    /* ── ASESOR ── */
    agentSection: {
      marginHorizontal: 16,
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: BORDER,
      paddingTop: 10,
    },
    agentsRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
    agentCard: {
      flex: 1,
      flexDirection: 'row', alignItems: 'center', gap: 12,
      padding: 10,
      backgroundColor: LIGHT,
      borderRadius: 10, borderWidth: 1, borderColor: BORDER,
    },
    agentPhoto: {
      width: 56, height: 56, borderRadius: 28,
      objectFit: 'cover',
      borderWidth: 2.5, borderColor: primary,
    },
    agentPhotoFallback: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: primary,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: accent,
    },
    agentInitials: { color: W, fontSize: 16, fontFamily: 'Helvetica-Bold' },
    agentInfo: { flex: 1 },
    agentName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK },
    agentTitle: { fontSize: 8, color: GRAY, marginTop: 2 },
    agentLine: { fontSize: 8.5, color: '#374151', marginTop: 3 },
    agentLineBold: { fontFamily: 'Helvetica-Bold', color: DARK },

    /* ── FOOTER ── */
    footer: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 24, paddingVertical: 8,
      backgroundColor: primary,
    },
    footerLeft: { fontSize: 7.5, color: 'rgba(255,255,255,0.75)' },
    footerRight: { fontSize: 7.5, color: W, fontFamily: 'Helvetica-Bold' },

    /* Padding antes del footer */
    bodyEnd: { height: 44 },
  });
}

/* ─── Componente ─── */
interface Props {
  property: Property;
  account: Account | null;
  agents: Agent[];
}

export function PropertyPDF({ property, account, agents }: Props) {
  const primary = account?.brand_primary ?? '#1e3a8a';
  const accent = account?.brand_accent ?? '#f59e0b';
  const s = makeStyles(primary, accent);

  const amenities = (property.amenities ?? '').split(',').map((a) => a.trim()).filter(Boolean);
  const cover = property.gallery_images?.[0];
  const gallery = (property.gallery_images ?? []).slice(1, 4);

  const opIsRenta = property.operation === 'Renta';
  const opBg = opIsRenta ? '#059669' : primary;

  const specs = [
    property.bedrooms != null && { value: String(property.bedrooms), label: 'Recámaras' },
    property.bathrooms != null && { value: String(property.bathrooms), label: 'Baños' },
    property.half_baths != null && { value: String(property.half_baths), label: 'Medios baños' },
    property.construction_sqm != null && { value: `${property.construction_sqm} m²`, label: 'Construcción' },
    property.lot_sqm != null && { value: `${property.lot_sqm} m²`, label: 'Terreno' },
    property.parking_spaces != null && { value: String(property.parking_spaces), label: 'Estac.' },
    property.levels != null && { value: String(property.levels), label: 'Niveles' },
    property.age_years != null && { value: `${property.age_years} años`, label: 'Antigüedad' },
  ].filter(Boolean) as { value: string; label: string }[];

  const chips = [
    property.condition && `Condición: ${property.condition}`,
    property.postal_code && `CP: ${property.postal_code}`,
  ].filter(Boolean) as string[];

  const nearby = property.nearby_places ?? [];
  const address = fullAddress(property);

  return (
    <Document
      title={property.title}
      author={account?.name ?? 'Inmobiliaria'}
      subject="Ficha técnica de propiedad"
    >
      <Page size="A4" style={s.page}>

        {/* ══ HEADER ══ */}
        <View style={s.header} fixed>
          <View style={s.headerLogoWrap}>
            {account?.logo_url ? (
              <Image src={account.logo_url} style={s.headerLogo} />
            ) : (
              <View style={s.headerLogoFallback}>
                <Text style={s.headerLogoText}>
                  {(account?.name ?? 'I').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={s.headerAgency}>{account?.name ?? 'Inmobiliaria'}</Text>
              {account?.tagline && <Text style={s.headerTagline}>{account.tagline}</Text>}
            </View>
          </View>
          {agents[0] && (
            <View style={s.headerRight}>
              <Text style={s.headerAgentName}>{agents[0].name}</Text>
              {agents[0].phone && <Text style={s.headerContactLine}>Tel: {agents[0].phone}</Text>}
              {agents[0].whatsapp && <Text style={s.headerContactLine}>WA: {agents[0].whatsapp}</Text>}
              {agents[0].email && <Text style={s.headerContactLine}>{agents[0].email}</Text>}
            </View>
          )}
        </View>

        {/* ══ TIRA OPERACIÓN + PRECIO ══ */}
        <View style={s.opStrip}>
          <View style={s.opLeft}>
            <View style={[s.opBadge, { backgroundColor: opBg }]}>
              <Text style={{ color: W, fontSize: 11, fontFamily: 'Helvetica-Bold' }}>
                {property.operation.toUpperCase()}
              </Text>
            </View>
            <Text style={s.opPropType}>{property.property_type}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.opPrice}>{formatPrice(property.price, property.currency)}</Text>
            {opIsRenta && <Text style={s.opPriceRenta}>/ mes</Text>}
          </View>
        </View>

        {/* ══ HERO ══ */}
        <View style={s.heroWrap}>
          {cover ? (
            <Image src={cover} style={s.heroImg} />
          ) : (
            <View style={s.heroPlaceholder} />
          )}
        </View>

        {/* ══ GALERÍA ══ */}
        {gallery.length > 0 && (
          <View style={s.galleryWrap}>
            <View style={s.galleryRow}>
              {gallery.map((url, i) => (
                <Image key={i} src={url} style={s.galleryImg} />
              ))}
            </View>
          </View>
        )}

        {/* ══ TÍTULO + DIRECCIÓN ══ */}
        <View style={s.titleWrap}>
          <Text style={s.titleText}>{property.title}</Text>
          {address ? <Text style={s.addressText}>{address}</Text> : null}
        </View>

        {/* ══ SPECS STRIP ══ */}
        {specs.length > 0 && (
          <View style={s.specsStrip} wrap={false}>
            {specs.map((sp, i) => (
              <View key={i} style={i < specs.length - 1 ? s.specCell : s.specCellLast}>
                <Text style={s.specVal}>{sp.value}</Text>
                <Text style={s.specLbl}>{sp.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ══ CHIPS EXTRA (condición, etc.) ══ */}
        {chips.length > 0 && (
          <View style={[s.chipsRow, { paddingHorizontal: 16, marginTop: 6 }]}>
            {chips.map((c, i) => (
              <View key={i} style={s.chip}>
                <View style={s.chipDot} />
                <Text style={s.chipText}>{c}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ══ DESCRIPCIÓN + AMENIDADES (2 columnas) ══ */}
        {((property.description_long || property.description_short) || amenities.length > 0) && (
          <View style={s.twoCol} wrap={false}>
            {(property.description_long || property.description_short) && (
              <View style={s.colLeft}>
                <Text style={s.sectionLabel}>Descripción</Text>
                <Text style={s.bodyText}>
                  {truncate(property.description_long ?? property.description_short, 600)}
                </Text>
              </View>
            )}
            {amenities.length > 0 && (
              <View style={s.colRight}>
                <Text style={s.sectionLabel}>Amenidades</Text>
                <View style={s.amenGrid}>
                  {amenities.slice(0, 16).map((a, i) => (
                    <View key={i} style={s.amenChip}>
                      <View style={s.amenDot} />
                      <Text style={s.amenText}>{a}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ══ DESCRIPCIÓN DE ZONA ══ */}
        {property.description_zone && (
          <View style={s.extraSection} wrap={false}>
            <Text style={s.sectionLabel}>La zona</Text>
            <Text style={s.bodyText}>{truncate(property.description_zone, 400)}</Text>
          </View>
        )}

        {/* ══ LUGARES CERCANOS ══ */}
        {nearby.length > 0 && (
          <View style={s.extraSection} wrap={false}>
            <Text style={s.sectionLabel}>Lugares cercanos</Text>
            <View style={s.nearbyRow}>
              {nearby.slice(0, 12).map((pl, i) => (
                <View key={i} style={s.nearbyChip}>
                  <Text style={s.nearbyText}>
                    {pl.name ?? pl.type}{pl.distance ? ` · ${pl.distance}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ══ PLANOS ══ */}
        {property.floor_plans?.length > 0 && (
          <View style={s.extraSection} wrap={false}>
            <Text style={s.sectionLabel}>Planos de la propiedad</Text>
            <View style={s.plansRow}>
              {property.floor_plans.slice(0, 4).map((url, i) => (
                <Image key={i} src={url} style={s.planImg} />
              ))}
            </View>
          </View>
        )}

        {/* ══ ASESOR(ES) ══ */}
        {agents.length > 0 && (
          <View style={s.agentSection} wrap={false}>
            <Text style={s.sectionLabel}>
              {agents.length === 1 ? 'Tu asesor inmobiliario' : 'Tus asesores inmobiliarios'}
            </Text>
            <View style={s.agentsRow}>
              {agents.slice(0, 2).map((agent) => (
                <View key={agent.id} style={s.agentCard}>
                  {agent.photo_id ? (
                    <Image src={agent.photo_id} style={s.agentPhoto} />
                  ) : (
                    <View style={s.agentPhotoFallback}>
                      <Text style={s.agentInitials}>
                        {agent.name.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={s.agentInfo}>
                    <Text style={s.agentName}>{agent.name}</Text>
                    {agent.title && <Text style={s.agentTitle}>{agent.title}</Text>}
                    {agent.phone && (
                      <Text style={s.agentLine}>
                        <Text style={s.agentLineBold}>Tel: </Text>{agent.phone}
                      </Text>
                    )}
                    {agent.whatsapp && (
                      <Text style={s.agentLine}>
                        <Text style={s.agentLineBold}>WhatsApp: </Text>{agent.whatsapp}
                      </Text>
                    )}
                    {agent.email && <Text style={s.agentLine}>{agent.email}</Text>}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={s.bodyEnd} />

        {/* ══ FOOTER ══ */}
        <View style={s.footer} fixed>
          <Text style={s.footerLeft}>
            {property.title} · {[property.city, property.state].filter(Boolean).join(', ')}
          </Text>
          <Text style={s.footerRight}>{account?.name ?? 'Inmobiliaria'}</Text>
        </View>

      </Page>
    </Document>
  );
}
