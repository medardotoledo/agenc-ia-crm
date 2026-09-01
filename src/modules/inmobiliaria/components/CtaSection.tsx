'use client';

/**
 * ════════════════════════════════════════════════════════════════
 * CTA SECTION — Call To Action (Vender o rentar propiedad)
 * ════════════════════════════════════════════════════════════════
 */

export function CtaSection() {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-r from-primary to-primary-light">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-inverse mb-6">
            ¿Quieres vender o rentar tu propiedad?
          </h2>

          <p className="text-lg text-inverse/80 mb-8">
            Te ayudamos en todo el proceso de comercialización y avalúo con
            nuestro amplio inventario y base de datos de clientes.
          </p>

          <a
            href="https://wa.me/524424682056"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-accent hover:bg-accent/90 text-primary font-bold py-4 px-8 rounded-lg transition-all hover:shadow-lg text-lg"
          >
            📱 Contáctanos por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
