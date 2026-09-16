# Sistema de Información para la Gestión de la Producción y Pedidos
## Empresa: RV Vega Servicios Generales E.I.R.L.

Sistema web integral de clase empresarial diseñado para optimizar la eficiencia del proceso productivo, erradicar cuellos de botella, reducir mermas y garantizar entregas a tiempo (*On-Time In-Full - OTIF*) en la empresa **RV Vega Servicios Generales E.I.R.L.**

---

## 1. Módulos y Funcionalidades del Producto

1. **Gestión de Clientes**:
   - Padrón empresarial con RUC / DNI, razón social, contactos directos, teléfonos, emails y direcciones.
   - Historial de pedidos por cliente y filtros de búsqueda en tiempo real.
2. **Gestión de Pedidos**:
   - Registro de pedidos y cotizaciones con desglose de ítems, especificaciones técnicas y cálculo automático de subtotal, IGV (18%) y total.
   - Control de ciclo de vida: *Pendiente → En Planificación → En Producción → Listo para Entrega → Entregado*.
   - Generación de Órdenes de Producción (OP) con un solo clic.
3. **Planificación y Seguimiento de Producción**:
   - Control de Órdenes de Trabajo y balanceo de carga en taller.
   - Ruta estándar de fabricación de 5 fases: *Habilitado y Corte → Mecanizado y Perforado → Armado y Soldadura → Tratamiento y Pintura → Control de Calidad y Despacho*.
   - Avance de fases, registro de horas reales vs horas estándar y control de tiempos muertos/paradas de producción.
4. **Control de Inventario de Materia Prima**:
   - Catálogo de insumos (metales, soldadura, pinturas epóxicas, tornillería).
   - Semáforo y alertas inmediatas de stock crítico (< stock de seguridad).
   - Kardex completo de movimientos (Entradas por compra, Salidas a producción y Ajustes).
5. **Reportes Gerenciales**:
   - Reporte de Cumplimiento de Entregas (OTIF) con cálculo de desviación en días.
   - Reporte Financiero de Producción (Venta vs Costo Real vs Margen Bruto en S/ y %).
   - Reporte de Productividad por Operario.
   - Exportación a CSV/Excel y plantilla de impresión ejecutiva en PDF.
6. **Inteligencia de Negocios (Business Intelligence - BI)**:
   - Dashboard interactivo con Recharts.
   - Cálculo del OEE (Overall Equipment Effectiveness / Eficiencia General) descomponiendo Disponibilidad, Rendimiento y Calidad.
   - Gráfico de cuellos de botella por etapa de taller y pareto de causas de paradas de planta.
   - Gráfica de evolución mensual de ventas vs costos de producción.
7. **Módulo de Asistencia / Análisis mediante Inteligencia Artificial (IA)**:
   - **Predicción de Riesgo de Retrasos**: Algoritmo predictivo que evalúa holguras de tiempo, cargas pendientes y paradas registradas para emitir alertas tempranas y acciones correctivas.
   - **Compras Inteligentes Asistidas**: Sugerencia de reabastecimiento económico de materias primas con stock crítico.
   - **Copiloto de Planta y Taller**: Chat interactivo con IA (soporta Google Gemini API con fallback contextualizado para RV Vega).

---

## 2. Entorno Operativo y Seguridad

- **Frontend**: React v18.2.0 + Vite + Tailwind CSS + Lucide Icons + Recharts (preparado para **Vercel** con `vercel.json`).
- **Backend**: Node.js v20.x LTS + Express v4.19.2 (preparado para **Render** con `render.yaml`).
- **Base de Datos**: PostgreSQL v16.0 (compatible con Render PostgreSQL / Aiven). Incluye scripts SQL completos (`database/schema.sql` y `database/seed.sql`) y capa relacional local persistente para ejecución inmediata en Windows.
- **Seguridad**:
  - Cifrado de credenciales con `bcrypt` v5.1.1.
  - Sesiones y autorización con JSON Web Tokens (`jsonwebtoken` v9.0.2).
  - Control de acceso basado en roles (RBAC): Administrador, Jefe de Producción, Operario, Ventas.

---

## 3. Guía de Ejecución Local (Windows)

### Requisitos
- Node.js v20.x o superior instalado.

### Paso 1: Iniciar el Backend
```powershell
cd rv-vega-sistema\backend
npm start
```
> El backend se iniciará en `http://localhost:5000/api`

### Paso 2: Iniciar el Frontend
En otra consola:
```powershell
cd rv-vega-sistema\frontend
npm run dev
```
> El frontend estará disponible en `http://localhost:3000`

---

## 4. Credenciales de Acceso Demo

| Rol | Correo | Contraseña |
|---|---|---|
| **Administrador / Gerencia** | `admin@rvvega.com` | `Admin123*` |
| **Jefe de Producción** | `produccion@rvvega.com` | `Admin123*` |
| **Operario de Taller** | `operario1@rvvega.com` | `Admin123*` |
| **Ventas / Atención** | `ventas@rvvega.com` | `Admin123*` |

*(La pantalla de login incluye botones de acceso rápido con 1 clic para alternar entre roles).*

---

## 5. Guía de Despliegue en la Nube

### Despliegue del Backend en Render
1. Conecta tu repositorio en [Render.com](https://render.com).
2. Selecciona **Web Service** apuntando al directorio raíz del backend (`/backend`).
3. Render detectará automáticamente el archivo `render.yaml`.
4. En las variables de entorno, configura `DATABASE_URL` con tu base de datos PostgreSQL 16 de Render o Aiven.
5. (Opcional) Agrega `GEMINI_API_KEY` para habilitar el modelo de Google Gemini en el Copiloto de IA.

### Despliegue del Frontend en Vercel
1. Conecta el repositorio en [Vercel.com](https://vercel.com).
2. Selecciona el directorio `/frontend` como *Root Directory*.
3. Framework Preset: **Vite**.
4. Variable de entorno: `VITE_API_URL=https://tu-backend-en-render.onrender.com/api`.
5. Haz clic en **Deploy**. El archivo `vercel.json` ya incluye las reglas de enrutamiento SPA.