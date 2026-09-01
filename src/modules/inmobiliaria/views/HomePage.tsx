/**
 * ════════════════════════════════════════════════════════════════
 * HOME PAGE — Portal Inmobiliario
 * ════════════════════════════════════════════════════════════════
 * Página de inicio del portal inmobiliario.
 * Usa Design System: todos los colores/fuentes heredan automáticamente.
 *
 * Cambiar cliente = cambiar color automáticamente (sin tocar código)
 */

import {
  HeroSection,
  AboutSection,
  WhyUsSection,
  FeaturedLocations,
  FeaturedProperties,
  CtaSection,
  Footer,
} from '../components';

export function HomePage() {
  return (
    <main className="bg-app">
      {/* Hero Section — Búsqueda principal */}
      <HeroSection />

      {/* About Section — Quiénes somos */}
      <AboutSection />

      {/* Why Us Section — Por qué nosotros */}
      <WhyUsSection />

      {/* Featured Locations — Ubicaciones destacadas */}
      <FeaturedLocations />

      {/* Featured Properties — Propiedades destacadas */}
      <FeaturedProperties />

      {/* CTA Section — Vender o rentar */}
      <CtaSection />

      {/* Footer */}
      <Footer />

      {/* Botón flotante WhatsApp */}
      <FloatingWhatsAppButton />
    </main>
  );
}

/**
 * Botón flotante de WhatsApp
 * Disponible en toda la página
 */
function FloatingWhatsAppButton() {
  return (
    <a
      href="https://wa.me/524424682056"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 bg-accent hover:bg-accent/90 text-inverse p-4 rounded-full shadow-lg hover:shadow-xl transition-all z-40"
      title="Contactar por WhatsApp"
      aria-label="Chat en WhatsApp"
    >
      <svg
        className="w-6 h-6"
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.995 1.448l-.36-.18L2.753 5.32l1.454 4.285-.006.007a9.868 9.868 0 001.441 4.991c.821 1.35 2.002 2.529 3.403 3.414 1.4.885 3.001 1.378 4.6 1.378 1.156 0 2.297-.2 3.401-.586 1.104-.387 2.15-.945 3.089-1.659.939-.714 1.755-1.589 2.408-2.579.653-.989 1.142-2.077 1.438-3.23.297-1.153.456-2.35.456-3.548 0-2.658-1.055-5.163-2.973-7.058-1.917-1.896-4.49-2.944-7.18-2.944z" />
      </svg>
    </a>
  );
}
