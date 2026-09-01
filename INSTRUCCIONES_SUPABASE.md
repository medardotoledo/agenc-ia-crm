# 📋 INSTRUCCIONES: Crear tablas en Supabase

**IMPORTANTE:** Ejecutar ANTES de continuar con Fase 1.

---

## ✅ Paso 1: Abrir Supabase Dashboard

1. Ir a: https://app.supabase.com
2. Seleccionar tu proyecto: **lead-suite** (o el que uses)
3. En el menu izquierdo, ir a: **SQL Editor**
4. Click en **"Nuevo query"** (botón azul)

---

## 📝 Paso 2: Ejecutar SQL Schema

1. Copiar TODO el contenido de: `supabase/schema.sql` (en este directorio)
2. Pegarlo en el SQL Editor
3. Click en **"Ejecutar"** (botón azul de play)

**Esperado:** Sin errores, todas las tablas creadas

---

## 🔍 Paso 3: Verificar Tablas

En el menú izquierdo, ir a **Database → Tables** y verificar que existen:

- ✅ accounts
- ✅ properties
- ✅ agents
- ✅ leads
- ✅ ai_generation_logs
- ✅ easybroker_sync_logs
- ✅ images

---

## 🔐 Paso 4: Verificar RLS (Row Level Security)

1. En **SQL Editor**, ejecutar este query para verificar que RLS está HABILITADO:

```sql
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('accounts', 'properties', 'agents', 'leads', 'images', 'ai_generation_logs', 'easybroker_sync_logs')
ORDER BY tablename;
```

**Esperado:** `rowsecurity = true` para todas las tablas

---

## 🧪 Paso 5: Test (Opcional)

Crear un usuario de prueba en Supabase:

1. Menu izquierdo: **Authentication → Users**
2. Click **"Add user"**
3. Email: `test@example.com`
4. Password: `password123`
5. Marcar: **Auto-confirm user**
6. Click **"Create user"**

---

## ✨ Paso 6: Instalar dependencias

En terminal (en directorio del proyecto):

```bash
npm install
```

---

## 🚀 Paso 7: Iniciar servidor de desarrollo

```bash
npm run dev
```

Debería ver: `ready - started server on 0.0.0.0:3000`

---

## 🌐 Paso 8: Probar Auth

1. Ir a: http://localhost:3000/auth/login
2. Ingresar credenciales de prueba:
   - Email: `test@example.com`
   - Password: `password123`
3. Debería redirigir a: `/admin`

**Si falla:** Revisar console (F12) por errores de Supabase

---

## ⚠️ Troubleshooting

**Error: "PostgreSQL error"**
- Verificar que el SQL se ejecutó correctamente en Supabase
- Revisar que no hay caracteres especiales en el SQL

**Error: "Auth failed"**
- Verificar que el usuario existe en Supabase → Authentication
- Revisar que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` están en `.env.local`

**Error: "Connection refused"**
- Verificar que Next.js está corriendo (`npm run dev`)
- Revisar que puerto 3000 no está en uso

---

## 📚 Siguientes pasos

Una vez completado:
- ✅ Fase 1 completada (Auth + Supabase + Tipos)
- ➡️ Fase 2: Property CRUD (formulario 6 tabs)

---

**Fecha:** 12-jun-2026  
**Tiempo estimado:** 10 minutos
