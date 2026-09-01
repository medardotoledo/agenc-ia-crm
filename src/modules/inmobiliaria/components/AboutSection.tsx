'use client';

/**
 * ════════════════════════════════════════════════════════════════
 * ABOUT SECTION — Quiénes somos
 * ════════════════════════════════════════════════════════════════
 */

import Link from 'next/link';

export function AboutSection() {
  return (
    <section className="py-20 md:py-32 bg-soft">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Imagen */}
          <div className="bg-gradient-to-br from-primary to-primary-light rounded-2xl h-96 md:h-full flex items-center justify-center">
            <div className="text-inverse text-center">
              <div className="text-6xl mb-4">🏢</div>
              <p className="text-sm">Imagen: Oficina Nodo Inmobiliario</p>
            </div>
          </div>

          {/* Contenido */}
          <div>
            <div className="mb-4">
              <span className="text-accent font-semibold text-sm uppercase tracking-wide">
                Sobre Nosotros
              </span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-6">
              ¿Quiénes somos?
            </h2>

            <div className="space-y-4 text-ink-soft text-lg leading-relaxed mb-8">
              <p>
                Somos un grupo de asesoras inmobiliarias certificadas
                especializado en la comercialización estratégica de bienes
                raíces en el Querétaro Moderno.
              </p>

              <p>
                Acompañamos a propietarios, compradores e inversionistas a
                tomar decisiones patrimoniales seguras mediante asesoría
                integral y personalizada.
              </p>

              <p>
                Creemos que una propiedad es mucho más que un inmueble: es un
                proyecto de vida, una inversión a largo plazo y un espacio para
                generar historias.
              </p>

              <p>
                Nuestro compromiso es conectar a cada cliente con la mejor
                oportunidad para su patrimonio y convertir sus sueños en
                realidad.
              </p>
            </div>

            <Link
              href="/contacto"
              className="inline-block bg-primary hover:bg-primary-light text-inverse font-bold py-3 px-8 rounded-lg transition-all hover:shadow-lg"
            >
              Contáctanos →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
