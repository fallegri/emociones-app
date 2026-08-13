# 🎭 EmotionAI - Detección de Emociones en Tiempo Real

Sistema web de detección facial de emociones en tiempo real con análisis automático, mensajes contextuales y dashboard analítico.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)
![Neon](https://img.shields.io/badge/DB-Neon_PostgreSQL-green?logo=postgresql)

## ✨ Características

- **🎥 Detección en tiempo real**: Usa la cámara web para detectar rostros y emociones automáticamente, sin necesidad de tomar fotos ni cargar imágenes
- **😊 7 emociones detectadas**: Feliz, Triste, Enojado, Sorprendido, Disgustado, Temeroso, Neutral
- **👥 Soporte multi-persona**: Detecta múltiples rostros simultáneamente y calcula la emoción dominante del grupo (moda estadística)
- **💬 Mensajes contextuales**: Genera mensajes acordes a la emoción detectada (individual y grupal)
- **📊 Dashboard analítico**: Gráficos de picos de afluencia por hora, distribución de emociones, historial
- **💾 Persistencia automática**: Guarda automáticamente cada 5 segundos: evento, fecha, conteo de personas, emociones
- **🚀 Serverless**: Desplegable en Vercel con Neon PostgreSQL

## 🛠️ Stack Tecnológico

| Tecnología | Uso |
|-----------|-----|
| **Next.js 16** | Framework fullstack (App Router) |
| **TypeScript** | Tipado estático |
| **Tailwind CSS 4** | Estilos |
| **face-api.js** | Detección facial y emociones (TensorFlow.js) |
| **Drizzle ORM** | ORM para PostgreSQL |
| **Neon PostgreSQL** | Base de datos serverless |
| **Recharts** | Gráficos del dashboard |
| **Vercel** | Hosting y deployment |

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/fallegri/emociones-app.git
cd emociones-app
npm install
```

### 2. Configurar base de datos (Neon)

1. Crear una cuenta en [Neon](https://console.neon.tech)
2. Crear un nuevo proyecto y base de datos
3. Copiar el connection string

### 3. Variables de entorno

Crear archivo `.env.local`:

```env
DATABASE_URL=postgresql://username:password@ep-xxxx.us-east-2.aws.neon.tech/emociones_db?sslmode=require
```

### 4. Ejecutar migración

```bash
npm run db:migrate
```

### 5. Iniciar en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## 📦 Deploy en Vercel

### Opción 1: Desde GitHub (Recomendado)

1. Conecta tu repositorio en [vercel.com](https://vercel.com)
2. Agrega la variable de entorno `DATABASE_URL` en Settings → Environment Variables
3. Deploy automático en cada push

### Opción 2: CLI

```bash
npm i -g vercel
vercel --prod
```

## 📊 Funcionalidades

### Página Principal (`/`)
- Input para nombre del evento
- Detección facial automática en tiempo real
- Recuadros alrededor de rostros detectados con etiqueta de emoción
- Contador de personas
- Mensaje contextual según emoción dominante
- Para grupos: mensaje basado en la moda de las emociones detectadas

### Dashboard (`/dashboard`)
- **Picos de afluencia por hora**: Gráfico de barras con total de personas y capturas
- **Distribución de emociones**: Gráfico circular con porcentajes
- **Estadísticas generales**: Total capturas, personas, promedio
- **Historial de capturas**: Tabla con últimas 20 detecciones
- **Filtro por evento**: Seleccionar evento específico para ver sus métricas

## 🗃️ Esquema de Base de Datos

```sql
CREATE TABLE emotion_captures (
  id SERIAL PRIMARY KEY,
  event_name VARCHAR(255) NOT NULL,
  captured_at TIMESTAMP DEFAULT NOW() NOT NULL,
  person_count INTEGER NOT NULL,
  emotions JSONB NOT NULL,
  dominant_emotion VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  hour INTEGER NOT NULL
);
```

## 🔧 Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Iniciar producción |
| `npm run db:migrate` | Ejecutar migración en Neon |
| `npm run models:download` | Descargar modelos de IA |

## 📝 Notas

- Los modelos de face-api.js (~500KB) están incluidos en `/public/models`
- La detección funciona 100% en el navegador (client-side) - no se envían imágenes al servidor
- Solo se guardan las emociones detectadas y metadatos, nunca imágenes
- Se requiere HTTPS para acceso a la cámara en producción (Vercel provee SSL automático)
- Compatible con Chrome, Firefox y Edge (WebRTC requerido)

## 📄 Licencia

MIT
