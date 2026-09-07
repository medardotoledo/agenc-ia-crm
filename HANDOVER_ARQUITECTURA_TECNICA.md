# 📘 MANUAL DE TRASPASO TÉCNICO Y ARQUITECTURA (HANDOVER)
**CRM Agéntico · Fábrica de Agentes de IA & Conversaciones WhatsApp**
*Generado para continuidad técnica en OpenCode, Cursor, Claude Code o cualquier herramienta de desarrollo.*

---

## 1. Contexto General y Accesos a Infraestructura

| Componente | Detalle / Credencial |
| :--- | :--- |
| **Repositorio Local** | `C:\Users\Med Lab\Documents\Clientes\CRM Agentico\lead-suite` |
| **Git Remote** | `https://github.com/medardotoledo/agenc-ia-crm.git` (Rama principal: `main`) |
| **Último Commit Estable** | `d891186` (*feat(crm-chat): add global safety switch, renamed ai_agent/hybrid/human modes, db persistence and webhook safeguards*) |
| **Aplicación en Producción** | [https://app.crmagentico.online](https://app.crmagentico.online) |
| **Servidor VPS (Hetzner)** | Host: `2.24.65.127:22` \| Usuario: `root` \| PWD SSH: `dad&9(5RuCpP4sdz` |
| **Panel Coolify** | `http://2.24.65.127:8000` (PWD Coolify: `2mGvR76nm$*$2026`) |
| **ID Contenedor Coolify** | `73445fe0d45c` (Laravel/PHP backend de Coolify) |
| **UUID Aplicación Coolify** | `yv7qbcxgqirg8pkby1kvtfud` |
| **Contenedor PostgreSQL** | `azkancdwam1sgydtytdbjw6o` (Base de datos: `postgres`, Usuario: `postgres`) |
| **Subcuenta / Location ID GHL** | `OS9czz85LUvBeljk8FEv` |
| **Evolution API (WhatsApp)** | Instancia: `sub_OS9czz85LUvBeljk8FEv` \| Puerto: `8085` / `8080` |

---

## 2. Lo que se Construyó e Implementó en esta Fase

### A. Catálogo Multi-Producto Vertical y las 3 Zonas del Producto
- **Archivo Frontend**: `src/modules/crm/views/AgentsFactoryView.tsx`
- **Modelos de BD**: `ai_agent_products` y `ai_agent_knowledge`.
- **Estructura**:
  - **Zona 1 (Documentos de Estudio)**: Manuales PDF, Word, notas de voz y páginas web (`material_estudio`). Exclusivo para que la IA estudie; nunca se manda al cliente.
  - **Zona 2 (El Maletín)**: Fotos, videos y folletos en PDF (`material_compartible`). Archivos que la IA envía al WhatsApp del cliente cuando pregunta por ese producto.
  - **Zona 3 (Ficha de Conocimiento Sintetizada)**: Documento `.md` estructurado generado por la IA para ese producto con botón de descarga y copiado al portapapeles.
  - **Ruta de Síntesis**: `POST /api/agents/[id]/products/[productId]/digest`

### B. Web Scraping Automático en Zona 1 con Barra de Progreso Reactiva
- **Ruta API**: `app/api/agents/[id]/products/[productId]/scrape-url/route.ts`
- **Capacidades**:
  - Limpia scripts, estilos, cabeceras y footers de cualquier URL pública.
  - Genera documento Markdown estructurado con conteo de palabras.
  - Barra de progreso interactiva de 4 fases (25% conexión, 65% limpieza, 88% estructuración con IA, 100% completado).
  - Tarjetas inline de éxito/error con enlace directo para abrir la URL analizada.

### C. Gimnasio de Role-Playing con Calibración Humana (RLHF In-Place)
- **Ruta Simulación**: `POST /api/agents/[id]/factory/simulate/route.ts`
- **Ruta Guardado Calibrado**: `PUT /api/agents/[id]/simulations/[simId]/route.ts`
- **Capacidades**:
  - El supervisor o director puede editar las respuestas simuladas del agente directamente en pantalla.
  - Al dar clic en `[ 💾 Guardar Ajustes y Aprobar ]`, el sistema inyecta la objeción resuelta directamente en el documento cognitivo maestro `04-matriz-de-objeciones.md` en `ai_agent_brains`, permitiendo aprendizaje activo de la IA.

### D. Dictado por Voz con Capa de Pulido Cognitivo con IA (`es-MX`)
- **Web Speech API**: Integración nativa sin librerías externas pesadas ni costos de tokens de audio (`SpeechRecognition`, `lang = 'es-MX'`).
- **Pestaña Personalidad (`ia-soul`)**:
  - **Ruta API**: `POST /api/agents/[id]/soul/distill/route.ts`
  - Transcribe voz en vivo, elimina muletillas (*"este...", "o sea..."*).
  - Mueve automáticamente los 4 sliders de temperamento (1 al 10): Empatía, Formalidad, Agresividad de Cierre y Nivel Técnico.
  - Elige el preset idóneo (`calido_humano`, `vendedor_consultivo`, `tecnico_experto`, `paciencia_soporte`) y redacta las directrices de oro (`custom_rules`).
- **Zona 1 del Producto (Explicación del Experto/Fundador)**:
  - **Ruta API**: `POST /api/agents/[id]/products/[productId]/voice-note/route.ts`
  - Estructura grabaciones habladas de expertos en un documento técnico de estudio Markdown (`#`, `##`, diferenciadores contra la competencia, objeciones y garantías). Se guarda en `ai_agent_knowledge` (`file_type = 'voice_note'`).

### E. Doble Seguro de WhatsApp y Modos de Chat
- **Ruta API Control**: `app/api/crm/chat-control/route.ts`
- **Tabla en Postgres**: `crm_chat_controls` (`account_id`, `chat_id`, `ai_mode`, `assigned_agent_id`, `last_human_interaction`).
- **Columna en Postgres**: `account_ai_keys.is_global_auto_reply_enabled` (BOOLEAN DEFAULT FALSE).
- **1. Switch Maestro Global de Seguridad**:
  - Ubicado en la barra superior de `ConversationsView.tsx`.
  - En **Modo Seguro** (Apagado por defecto): ninguna IA responde por WhatsApp (diseñado para números personales).
  - En **Automatización Activa**: permite que los chats con IA respondan.
- **2. Modos por Chat Individual**:
  - 🤖 **`Agente IA`**: Piloto automático 100% autónomo.
  - ⚡ **`Híbrido`**: Copiloto; si tú escribes en el chat, la IA se silencia automáticamente durante 30 minutos.
  - 👤 **`Humano`**: Control 100% manual. La IA nunca responderá a ese contacto (modo por defecto).
- **3. Salvaguarda en el Webhook**:
  - `app/api/whatsapp/webhook/route.ts`: Evalúa el Switch Maestro Global y el modo del chat antes de cualquier despacho de IA.

### F. Resiliencia de Modelos Google Gemini
- Debido a que Google deprecó `gemini-2.0-flash` y `gemini-2.5-flash` para cuentas nuevas, todas las rutas usan una cascada de fallback automático:
  ```typescript
  const candidateModels = ['gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-3.6-flash'];
  ```

---

## 3. Comandos de Trabajo para OpenCode / Terminal

### Chequeo de Tipos (TypeScript)
Siempre ejecuta esto en `lead-suite` antes de hacer commit:
```bash
npx tsc --noEmit
```
*Debe salir con código 0 sin errores.*

### Guardar y Subir Cambios a GitHub
```bash
git add .
git commit -m "feat: descripcion del cambio"
git push origin main
```

### Disparar Despliegue en Coolify sin Entrar al Navegador
Ejecuta el script Node que se comunica por SSH con Coolify:
```bash
node scratch/trigger_coolify_deploy.js
```
*Te devolverá un `DISPATCHED_OK:<deployment_uuid>`.*

### Monitorear el Despliegue hasta que esté Live
Ejecuta el script monitor pasándole el UUID o directo:
```bash
node scratch/monitor_deploy.js <deployment_uuid>
```
*Esperar hasta ver `STATUS: finished`.*

### Ejecutar Consultas SQL en la Base de Datos PostgreSQL
Usa el script de consulta remota:
```bash
node scratch/run_remote_query.js "SELECT * FROM crm_chat_controls;"
```

---

## 4. Próximos Pasos Recomendados para la Siguiente Fase

1. **Despacho del Agente IA en el Webhook de WhatsApp**:
   - En `app/api/whatsapp/webhook/route.ts` (línea ~380), conectar la generación de texto con Gemini usando el Segundo Cerebro del agente y enviar el mensaje resultante a través del endpoint de Evolution API (`POST /message/sendText/:instance`).
2. **Integración de Voz Text-to-Speech con ElevenLabs**:
   - Añadir en `account_ai_keys` la columna `elevenlabs_api_key`.
   - Permitir que el agente responda con notas de voz grabadas con IA convirtiendo el texto a audio `.ogg` para WhatsApp.
3. **Telefonía y Llamadas con GoHighLevel / Twilio**:
   - Configurar los webhooks de voz entrante/saliente conectando el prompt del agente con un streaming de voz bidireccional.

---
*Fin del documento de traspaso técnico.*
