# Guía de Arquitectura e Integración de WhatsApp: CRM Agentico + Evolution API + GoHighLevel

Este documento detalla la arquitectura, endpoints, flujos de datos y soluciones técnicas implementadas para lograr la integración bidireccional completa y estable de **WhatsApp** en el **CRM Agentico**, conectado en tiempo real con **GoHighLevel (GHL)** y orquestado a través de **Evolution API**.

---

## 1. Diagrama de Arquitectura Global

```mermaid
flowchart TD
    subgraph WhatsApp["Dispositivo Móvil / Red WhatsApp"]
        WA_User["Usuario / Lead (WhatsApp)"]
    end

    subgraph VPS["Servidor VPS (2.24.65.127)"]
        Evo["Evolution API v2 (Docker :8085)\nInstancia: wa_OS9czz85LUvBeljk8FEv\nAPI Key: agencia_secret_wa_key_2026"]
    end

    subgraph NextJS["CRM Agentico (Next.js / Vercel o Coolify)"]
        SendRoute["POST /api/whatsapp/send\n(Envío de Texto)"]
        SendMediaRoute["POST /api/whatsapp/send-media\n(Fotos, Videos, PDFs, Audios PTT)"]
        WebhookRoute["POST /api/whatsapp/webhook\n(Recepción en tiempo real)"]
        ConversationsView["ConversationsView.tsx\n& LeadPanel.tsx"]
    end

    subgraph GHL["GoHighLevel Cloud (API v2)"]
        GHL_CDN["GHL Media / Filesafe CDN\n(POST /medias/upload-file)"]
        GHL_Conv["GHL Conversations API\n(POST /conversations/messages)"]
        GHL_Contacts["GHL Contacts API\n(Búsqueda y Asociación)"]
    end

    %% Flujo Saliente
    ConversationsView -->|Texto| SendRoute
    ConversationsView -->|Multimedia / Audio| SendMediaRoute
    SendMediaRoute -->|1. Sube archivo temporal| GHL_CDN
    GHL_CDN -.->|2. Retorna URL pública CDN| SendMediaRoute
    SendRoute -->|POST /message/sendText| Evo
    SendMediaRoute -->|POST /message/sendWhatsAppAudio o sendMedia| Evo
    Evo -->|Mensaje entregado| WA_User

    %% Sincronización Saliente con GHL
    SendRoute -->|Registra mensaje saliente| GHL_Conv
    SendMediaRoute -->|Registra mensaje + adjuntos| GHL_Conv

    %% Flujo Entrante
    WA_User -->|Envía texto, foto, audio o video| Evo
    Evo -->|Webhook HTTP POST 'messages.upsert'| WebhookRoute
    WebhookRoute -->|Descarga Base64 y sube a CDN| GHL_CDN
    WebhookRoute -->|Asocia teléfono con contacto| GHL_Contacts
    WebhookRoute -->|Registra mensaje entrante| GHL_Conv
    WebhookRoute -.->|Actualiza historial en tiempo real| ConversationsView
```

---

## 2. Componentes del Ecosistema

### A. Evolution API (Motor de Conexión a WhatsApp)
- **Tecnología**: Evolution API v2 corriendo en contenedor Docker en el VPS del cliente (`http://2.24.65.127:8085`).
- **Autenticación**: Cabecera `apikey: agencia_secret_wa_key_2026`.
- **Instancia activa**: `wa_OS9czz85LUvBeljk8FEv` (vinculada unívocamente a la subcuenta de GoHighLevel).
- **Configuración de la instancia**:
  - `webhook`: `https://app.crmagentico.online/api/whatsapp/webhook` (o URL del entorno activo).
  - `webhookEvents`: `['MESSAGES_UPSERT']`.
  - `webhookBase64: true`: Crucial para que Evolution API entregue el contenido binario de fotos, audios y documentos entrantes dentro del webhook sin llamadas adicionales.

### B. GoHighLevel (API 2.0 / LeadConnector)
- **Subcuenta (Location ID)**: `OS9czz85LUvBeljk8FEv`.
- **Bearer Token**: Obtenido dinámicamente de la base de datos PostgreSQL (`SELECT access_token FROM ghl_installations WHERE location_id = ...`) o vía `process.env.GHL_API_TOKEN`.
- **Servicios utilizados**:
  - `POST /medias/upload-file`: Bucket CDN público de alta velocidad (`filesafe.space`).
  - `GET /medias/files`: Biblioteca de más de 200 archivos y videos disponibles en la subcuenta.
  - `GET /conversations/search` y `POST /conversations/messages`: Sincronización bidireccional de conversaciones.
  - `POST /contacts/upsert`: Creación o enlace de contactos por número de teléfono.

---

## 3. Flujo de Envío de Mensajes (Outbound)

### A. Mensajes de Texto Simple
1. El usuario escribe en el compositor de [`ConversationsView.tsx`](file:///C:/Users/Med%20Lab/Documents/Clientes/CRM%20Agentico/lead-suite/src/modules/crm/views/ConversationsView.tsx) o [`LeadPanel.tsx`](file:///C:/Users/Med%20Lab/Documents/Clientes/CRM%20Agentico/lead-suite/src/modules/crm/components/LeadPanel.tsx).
2. Se envía una petición a [`POST /api/whatsapp/send`](file:///C:/Users/Med%20Lab/Documents/Clientes/CRM%20Agentico/lead-suite/app/api/whatsapp/send/route.ts) con:
   ```json
   {
     "number": "52155XXXXXXXX",
     "text": "Hola, ¿cómo estás?",
     "contactId": "GHL_CONTACT_ID",
     "accountId": "OS9czz85LUvBeljk8FEv"
   }
   ```
3. La ruta invoca Evolution API:
   ```http
   POST http://2.24.65.127:8085/message/sendText/wa_OS9czz85LUvBeljk8FEv
   Headers: { "apikey": "...", "Content-Type": "application/json" }
   Body: { "number": "52155XXXXXXXX", "text": "Hola, ¿cómo estás?" }
   ```
4. Simultáneamente, se registra en GoHighLevel (`POST /conversations/messages`) para que el equipo comercial vea la conversación idéntica en la app de GHL.

---

### B. Archivos Multimedia (Imágenes, Videos MP4, Documentos PDF)
1. **Origen del Archivo**:
   - **Local**: Subido desde la computadora mediante `<input type="file">`. El navegador lo lee en `base64`.
   - **Biblioteca GHL**: Seleccionado desde [`MediaLibraryModal.tsx`](file:///C:/Users/Med%20Lab/Documents/Clientes/CRM%20Agentico/lead-suite/src/modules/crm/components/MediaLibraryModal.tsx) (ya cuenta con una URL pública en el CDN).
2. Se invoca [`POST /api/whatsapp/send-media`](file:///C:/Users/Med%20Lab/Documents/Clientes/CRM%20Agentico/lead-suite/app/api/whatsapp/send-media/route.ts).
3. **Subida Automática a GoHighLevel CDN**:
   - Si el archivo viene en `base64` desde la PC, el backend lo convierte a `Blob` y lo sube vía `POST https://services.leadconnectorhq.com/medias/upload-file`.
   - GHL responde con una URL pública segura (`https://assets.cdn.filesafe.space/.../archivo.png`).
4. **Envío a Evolution API**:
   - Se invoca `POST /message/sendMedia/wa_OS9czz85LUvBeljk8FEv`:
     ```json
     {
       "number": "52155XXXXXXXX",
       "mediatype": "image",
       "mimetype": "image/jpeg",
       "caption": "Pie de foto opcional",
       "media": "https://assets.cdn.filesafe.space/.../archivo.jpg",
       "fileName": "presentacion.jpg"
     }
     ```
5. El mensaje se registra en GHL Conversations con `attachments: [cdnUrl]`.

---

### C. Grabación y Envío de Notas de Voz Nativas (WhatsApp PTT)
1. **Captura en el Navegador**:
   - Componente [`AudioRecorder.tsx`](file:///C:/Users/Med%20Lab/Documents/Clientes/CRM%20Agentico/lead-suite/src/modules/crm/components/AudioRecorder.tsx).
   - Usa `navigator.mediaDevices.getUserMedia({ audio: true })`.
   - Utiliza `MediaRecorder` con códec compatible (`audio/webm;codecs=opus` o `audio/ogg;codecs=opus`).
2. **Procesamiento del Audio**:
   - Al detener la grabación, se genera un `Blob` de audio y se codifica en Base64.
   - En [`POST /api/whatsapp/send-media`](file:///C:/Users/Med%20Lab/Documents/Clientes/CRM%20Agentico/lead-suite/app/api/whatsapp/send-media/route.ts), el audio se sube a GoHighLevel CDN (`.ogg` / `.webm`).
3. **Conversión y Entrega como PTT**:
   - Se llama a Evolution API:
     ```http
     POST http://2.24.65.127:8085/message/sendWhatsAppAudio/wa_OS9czz85LUvBeljk8FEv
     Headers: { "apikey": "...", "Content-Type": "application/json" }
     Body: {
       "number": "52155XXXXXXXX",
       "audio": "https://assets.cdn.filesafe.space/.../audio.ogg",
       "encoding": true
     }
     ```
   - **Resultado**: Evolution API procesa el audio con FFmpeg, lo convierte a Opus OGG con flag PTT (Push-To-Talk). En el teléfono del destinatario **aparece con el micrófono verde nativo de WhatsApp, ondas de reproducción y velocidad 1.5x / 2x**, en lugar de un archivo de audio genérico.

---

## 4. Flujo de Recepción de Mensajes (Inbound / Webhook)

1. Cuando el cliente responde en WhatsApp, Evolution API dispara una petición HTTP POST a [`/api/whatsapp/webhook`](file:///C:/Users/Med%20Lab/Documents/Clientes/CRM%20Agentico/lead-suite/app/api/whatsapp/webhook/route.ts).
2. **Extracción y Validación**:
   - Se valida que el evento sea `messages.upsert`.
   - Se extrae el número telefónico del remitente (`remoteJidAlt` o `remoteJid`).
   - Se descartan mensajes de grupos (`@g.us`).
3. **Manejo de Multimedia Entrante**:
   - Si el mensaje incluye foto, video, audio o documento, el webhook extrae el Base64 (incluido en `data.message` gracias a `webhookBase64: true` o consultado mediante `/chat/getBase64FromMediaMessage`).
   - Sube el archivo entrante a GoHighLevel CDN para preservarlo de forma permanente.
4. **Sincronización con GoHighLevel**:
   - Busca si el contacto ya existe en GHL por teléfono (`GET /contacts/search/duplicate?number=...`).
   - Si no existe, lo crea automáticamente (`POST /contacts/upsert`).
   - Registra el mensaje entrante en la conversación de GHL (`POST /conversations/messages` con `type: 'WhatsApp'`).
5. **Visualización en el CRM**:
   - El cliente polling (`loadLeadMessages`) en el CRM consulta el historial cada 3.5 segundos o al abrir el chat, renderizando los nuevos mensajes entrantes con sus imágenes, videos o reproductor de audio `<audio controls>`.

---

## 5. Problemas Críticos Superados y Soluciones Técnicas

| # | Desafío Encontrado | Causa Raíz | Solución Implementada |
|---|---|---|---|
| 1 | **Archivos locales no llegaban** | Evolution API rechazaba cadenas con prefijos `data:image/png;base64,...` devolviendo HTTP 400. | Se implementó limpieza de Data URIs con `media.split(';base64,')` y subida previa a CDN de GHL para enviar URLs públicas limpias. |
| 2 | **Audios no se reproducían como notas de voz** | Enviar Base64 sin codificar a `/sendMedia` generaba un archivo de audio plano descargable. | Se utilizó `/message/sendWhatsAppAudio` con `encoding: true` pasando la URL pública del CDN de GHL. |
| 3 | **Archivos entrantes desaparecían** | El webhook descartaba mensajes vacíos (`if (!textContent) return`). Cuando enviaban fotos sin texto o audios, se ignoraban. | Se detectan los tipos multimedia (`imageMessage`, `videoMessage`, etc.), se les asigna texto representativo (`📷 Foto recibida`) y se extrae el Base64 para subirlo a GHL. |
| 4 | **Envíos dobles de audio** | Al grabar audio convivían dos botones de enviar en pantalla y los usuarios hacían clic en ambos. | La barra de chat ahora se transforma dinámicamente al grabar ocultando el compositor de texto, dejando un solo botón de envío con bloqueo de clics repetidos (`isSending`). |
| 5 | **Cancelación súbita del micrófono** | Al cambiar el estado de grabación con un ternario de React, el componente de audio se desmontaba y cerraba el stream del micrófono en 0 segundos. | Se fijó una única instancia permanente de `AudioRecorder` montada en el árbol, y se agregó protección contra clics de menos de 800ms. |

---

## 6. Variables de Entorno Clave (`.env.local`)

```bash
# Evolution API (Servidor WhatsApp)
EVOLUTION_API_URL=http://2.24.65.127:8085
EVOLUTION_API_KEY=agencia_secret_wa_key_2026

# GoHighLevel (API v2)
GHL_API_TOKEN=pit-f7368d7d-1b53-4682-9096-cb7b87909966
GHL_LOCATION_ID=OS9czz85LUvBeljk8FEv

# Base de Datos PostgreSQL
DATABASE_URL=postgresql://postgres:password@host:5432/agencia_crm
```
