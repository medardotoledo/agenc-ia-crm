import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/design-system';
import { getThemeForInstance } from '@/lib/theme-resolver';

export const metadata: Metadata = {
  title: 'Lead-Suite | CRM Inmobiliario',
  description: 'CRM agéntico para inmobiliarias con IA integrada',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ════════════════════════════════════════════════════════════
  // THEME RESOLVER — obtiene el tema de la instancia actual
  //
  // 1. Consulta Supabase por el tema del cliente/instancia
  // 2. Si existe → retorna BrandTheme (colores personalizados)
  // 3. Si NO existe → retorna null → usa DEFAULT de tokens.css
  // 4. ThemeProvider inyecta los valores como CSS variables
  // 5. Toda la app hereda el tema automáticamente ✨
  // ════════════════════════════════════════════════════════════

  const theme = await getThemeForInstance();

  return (
    <html lang="es">
      <head>
        {/* tokens.css define las variables CSS por defecto (Nivel Matriz) */}
        {/* ThemeProvider sobrescribe solo los que el cliente customizó */}
      </head>
      <body>
        <ThemeProvider theme={theme}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
