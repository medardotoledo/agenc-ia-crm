'use client';

/**
 * ════════════════════════════════════════════════════════════════
 * FOOTER — Pie de página
 * ════════════════════════════════════════════════════════════════
 */

import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-sidebar text-inverse">
      {/* Main footer content */}
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="text-3xl">🏠</div>
              <div>
                <h3 className="font-bold text-lg">Nodo</h3>
                <p className="text-xs text-inverse/70">Inmobiliario</p>
              </div>
            </div>
            <p className="text-sm text-inverse/70">
              Grupo de asesoras inmobiliarias certificadas especializado en la
              comercialización estratégica de bienes raíces.
            </p>

            {/* Redes sociales */}
            <div className="flex gap-3 mt-6">
              <a
                href="https://www.facebook.com/nodoinmobiliarioqro"
                target="_blank"
                rel="noopener noreferrer"
                className="text-inverse/70 hover:text-accent transition-colors"
                title="Facebook"
              >
                f
              </a>
              <a
                href="https://www.instagram.com/nodoinmobiliarioqro"
                target="_blank"
                rel="noopener noreferrer"
                className="text-inverse/70 hover:text-accent transition-colors"
                title="Instagram"
              >
                📷
              </a>
              <a
                href="https://www.tiktok.com/@nodo.inmobiliario5"
                target="_blank"
                rel="noopener noreferrer"
                className="text-inverse/70 hover:text-accent transition-colors"
                title="TikTok"
              >
                🎵
              </a>
              <a
                href="https://www.youtube.com/@nodoinmobiliario"
                target="_blank"
                rel="noopener noreferrer"
                className="text-inverse/70 hover:text-accent transition-colors"
                title="YouTube"
              >
                ▶️
              </a>
            </div>
          </div>

          {/* Navegación */}
          <div>
            <h4 className="font-bold text-lg mb-6">Navegación</h4>
            <ul className="space-y-2 text-sm text-inverse/70">
              <li>
                <Link href="/" className="hover:text-accent transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <Link
                  href="/propiedades"
                  className="hover:text-accent transition-colors"
                >
                  Propiedades
                </Link>
              </li>
              <li>
                <Link
                  href="/quienes-somos"
                  className="hover:text-accent transition-colors"
                >
                  Nosotras
                </Link>
              </li>
              <li>
                <Link
                  href="/servicios"
                  className="hover:text-accent transition-colors"
                >
                  Servicios
                </Link>
              </li>
            </ul>
          </div>

          {/* Servicios */}
          <div>
            <h4 className="font-bold text-lg mb-6">Servicios</h4>
            <ul className="space-y-2 text-sm text-inverse/70">
              <li>
                <Link
                  href="/propiedades?operacion=Venta"
                  className="hover:text-accent transition-colors"
                >
                  Comprar Propiedad
                </Link>
              </li>
              <li>
                <Link
                  href="/propiedades?operacion=Renta"
                  className="hover:text-accent transition-colors"
                >
                  Rentar Propiedad
                </Link>
              </li>
              <li>
                <Link
                  href="/contacto"
                  className="hover:text-accent transition-colors"
                >
                  Comercialización Estratégica
                </Link>
              </li>
              <li>
                <Link
                  href="/contacto"
                  className="hover:text-accent transition-colors"
                >
                  Diseño y Remodelaciones
                </Link>
              </li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="font-bold text-lg mb-6">Contacto</h4>
            <ul className="space-y-3 text-sm">
              <li className="text-inverse/70">
                <a
                  href="tel:+524428465028"
                  className="hover:text-accent transition-colors"
                >
                  📱 +52 (442) 846 5028
                </a>
              </li>
              <li className="text-inverse/70">
                <a
                  href="mailto:nodoinmobiliarioqro@gmail.com"
                  className="hover:text-accent transition-colors"
                >
                  ✉️ nodoinmobiliarioqro@gmail.com
                </a>
              </li>
              <li className="text-inverse/70 text-xs">
                📍 Campo Real 988, El Refugio, 76146 Santiago de Querétaro, Qro.
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-inverse/10 pt-8 text-center text-sm text-inverse/60">
          <p>
            © {currentYear} Nodo Inmobiliario — Todos los derechos reservados.
          </p>
          <p className="mt-2">
            Creado por{' '}
            <a
              href="https://medtoledo.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Med Toledo
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
