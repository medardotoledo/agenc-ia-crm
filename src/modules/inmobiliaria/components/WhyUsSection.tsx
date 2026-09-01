'use client';

/**
 * ════════════════════════════════════════════════════════════════
 * WHY US SECTION — Por qué trabajar con nosotros
 * ════════════════════════════════════════════════════════════════
 */

const REASONS = [
  {
    title: 'Formación y Certificación',
    description:
      'Liderado por Paty, quien además de asesora experta, se desempeña como capacitadora y evaluadora oficial.',
    icon: '🎓',
    team: 'Certificación Oficial',
  },
  {
    title: 'Comercialización de Desarrollos',
    description:
      'Especializadas en la promoción estratégica de nuevos desarrollos residenciales y comerciales.',
    icon: '🏗️',
    team: 'Dayana, Brenda, Diana, Lety y Vero',
  },
  {
    title: 'Corretaje y Captación Directa',
    description:
      'Expertas dedicadas a la captación directa de propiedades y corretaje residencial.',
    icon: '🔗',
    team: 'Ana, Claudia N., Mary Carmen y Claudia G.',
  },
  {
    title: 'Diseño y Arquitectura',
    description:
      'Servicios integrales de mantenimiento, diseño arquitectónico y remodelaciones.',
    icon: '🎨',
    team: 'Liderado por Vero Oropeza',
  },
];

export function WhyUsSection() {
  return (
    <section className="py-20 md:py-32 bg-app">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-accent font-semibold text-sm uppercase tracking-wide">
            Diferenciación y Confianza
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-ink mt-4">
            ¿Por qué trabajar con nosotros?
          </h2>
          <p className="text-ink-soft mt-4 max-w-2xl mx-auto text-lg">
            No somos una inmobiliaria tradicional. Somos una red de consultoras
            inmobiliarias certificadas que creen en{' '}
            <span className="text-primary font-semibold">
              escuchar primero, asesorar después
            </span>
          </p>
        </div>

        {/* Grid de razones */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {REASONS.map((reason) => (
            <div
              key={reason.title}
              className="bg-soft rounded-lg p-6 hover:shadow-lg transition-all hover:border-accent border border-line"
            >
              <div className="text-4xl mb-4">{reason.icon}</div>
              <h3 className="text-lg font-bold text-ink mb-3">
                {reason.title}
              </h3>
              <p className="text-sm text-ink-soft mb-4 leading-relaxed">
                {reason.description}
              </p>
              <p className="text-xs font-semibold text-primary">
                {reason.team}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
