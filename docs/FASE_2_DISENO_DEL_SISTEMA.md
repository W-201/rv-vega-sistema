# Fase 2: Diseño del Sistema
## Empresa: RV Vega Servicios Generales E.I.R.L.
**Sistema de Información para la Gestión de la Producción y Pedidos**

---

## 2.1 Análisis del Sistema — Entregable 2.1.1: Modelo de Procesos

### 2.1.1.1 Diagramas de Procesos de Negocio (Notación BPMN / Flujo Operativo)

```mermaid
flowchart TD
    subgraph Ventas["Área Comercial / Ventas"]
        A(["Inicio: Solicitud de Cliente"]) --> B["Validar RUC (11 díg) / DNI (8 díg) en Padrón"]
        B --> C["Registrar Pedido y Cotización (Cálculo Subtotal + IGV 18%)"]
        C --> D["Emitir Pedido (Estado: Pendiente)"]
    end

    subgraph Produccion["Jefatura de Producción y Taller"]
        D --> E["Generar Orden de Producción (OP) y Asignar Prioridad"]
        E --> F["Crear Ruta Estándar de 5 Fases de Fabricación"]
        F --> G["Fase 1: Habilitado y Corte"]
        G --> H["Fase 2: Mecanizado y Perforado"]
        H --> I["Fase 3: Armado y Soldadura"]
        I --> J["Fase 4: Tratamiento, Pintura y Acabado"]
        J --> K["Fase 5: Control de Calidad y Embalaje"]
        K --> L{"¿Inspección Aprobada?"}
        L -- "Rechazado / Reproceso" --> I
        L -- "Aprobado" --> M["OP Completada (100%) -> Pedido: Listo para Entrega"]
    end

    subgraph Almacen["Almacén de Materia Prima"]
        F -.-> N["Verificar Stock de Insumos"]
        N --> O{"¿Stock <= Stock Mínimo?"}
        O -- "Sí" --> P["Activar Alerta de Stock Crítico y Sugerir Compra IA"]
        O -- "No" --> Q["Registrar Salida a Producción en Kardex"]
        Q -.-> G
    end

    subgraph Despacho["Despacho y Gerencia"]
        M --> R["Confirmar Entrega Real al Cliente (Estado: Entregado)"]
        R --> S(["Fin: Evaluar Cumplimiento OTIF, Costos y OEE"])
    end
```

### 2.1.1.2 Mapeo de Reglas de Negocio (RN)

| Código | Módulo | Regla de Negocio | Implementación Técnica |
| :--- | :--- | :--- | :--- |
| **RN-01** | Clientes | Todo cliente corporativo con **RUC** debe tener exactamente **11 dígitos numéricos**; con **DNI** debe tener exactamente **8 dígitos numéricos**. | Validación Regex en `clientesController.js` y `Clientes.jsx` + `CHECK` en BD. |
| **RN-02** | Clientes | El teléfono móvil de contacto debe tener exactamente **9 dígitos** e iniciar obligatoriamente con el dígito `9`. | Validación `/^9\d{8}$/` en Backend y Frontend. |
| **RN-03** | Pedidos | Todo pedido calcula automáticamente el **Subtotal** ($\sum \text{cantidad} \times \text{precio\_unitario}$), **IGV (18%)** y **Total**. | Calculado en `createPedido` (`pedidosController.js`) y vista previa en `Pedidos.jsx`. |
| **RN-04** | Pedidos | Alertas preventivas de vencimiento: si faltan $\le 3$ días para la `fecha_entrega_prometida`, se marca **Por vencer**; si superó la fecha y no está entregado, se marca **Vencido**. | Función `obtenerAlertaVencimiento` en `Pedidos.jsx` y motor predictivo en `aiService.js`. |
| **RN-05** | Producción | Toda Orden de Producción (OP) genera automáticamente las **5 fases estándar** metalmecánicas y sincroniza el estado del pedido asociado (*En Planificación → En Producción → Listo para Entrega*). | `createOrdenProduccion` y `updateEtapa` en `produccionController.js`. |
| **RN-06** | Producción | El porcentaje de avance de una OP se calcula ponderando las etapas finalizadas ($1.0$) y las etapas en proceso ($0.5$) sobre las 5 fases totales, registrando horas estimadas vs horas reales. | `updateEtapa` y `calcularMetricasTiempos` en `produccionController.js`. |
| **RN-07** | Inventario | Ninguna salida a producción o ajuste negativo puede exceder el `stock_actual` disponible. Si `stock_actual <= stock_minimo`, se activa el estado de **Stock Crítico**. | Validación transaccional en `registrarMovimiento` (`inventarioController.js`). |
| **RN-08** | Reportes / BI | Un pedido cumple **OTIF (On-Time In-Full)** sí y solo si `fecha_entrega_real <= fecha_entrega_prometida`. La meta gerencial de RV Vega es $\ge 90\%$. | `vista_reporte_otif` en SQL y `getReporteOTIF` en `reportesController.js`. |

---

## 2.2 Arquitectura del Diseño Técnico

### 2.2.1 Entregable: Arquitectura del Software

#### 2.2.1.1 Diagrama de Arquitectura del Sistema (Cliente-Servidor Multicapa)

```mermaid
flowchart LR
    subgraph Cliente["Capa de Presentación (Cliente Web - Vercel)"]
        UI["SPA React 18 + Vite + Tailwind CSS"]
        Charts["Motor Gráfico Recharts + Exportación XLSX/PDF"]
    end

    subgraph Servidor["Capa de Aplicación y Negocio (API REST - Render)"]
        API["Node.js 20 + Express 4.19"]
        Auth["Middleware JWT + RBAC + bcrypt"]
        Controllers["Controladores Modulares (Clientes, Pedidos, Producción, Inventario, Reportes, BI, IA)"]
    end

    subgraph Datos["Capa de Persistencia e Integración"]
        PG[("PostgreSQL 16.0 / Store Relacional Persistente")]
        Gemini["Google Gemini AI API (Copiloto & Predicción)"]
    end

    UI <-->|"HTTPS / JSON (REST)"| Auth
    Charts <-->|"Consultas Analíticas"| Auth
    Auth --> API
    API --> Controllers
    Controllers <-->|"SQL / Pool"| PG
    Controllers <-->|"Prompt Contextual"| Gemini
```

#### 2.2.1.2 Diagrama de Componentes del Software

```mermaid
classDiagram
    class Frontend_React_SPA {
        +AuthContext / ThemeContext
        +Dashboard.jsx
        +Clientes.jsx
        +Pedidos.jsx
        +Produccion.jsx (Kanban + Stepper)
        +Inventario.jsx (Catálogo + Kardex)
        +Reportes.jsx (OTIF, Costos, Operarios)
        +BusinessIntelligence.jsx (OEE)
        +AsistenteIA.jsx
    }

    class API_Gateway_Express {
        +authMiddleware (JWT Verification)
        +authRoutes
        +clientesRoutes
        +pedidosRoutes
        +produccionRoutes
        +inventarioRoutes
        +reportesRoutes
        +biRoutes
        +aiRoutes
    }

    class Capa_Persistencia {
        +db.js (Pool PostgreSQL 16 & Local Store)
        +schema.sql (12 Tablas + 3 Vistas + Índices)
        +reportes_queries.sql
    }

    Frontend_React_SPA --> API_Gateway_Express : Consume vía api.js
    API_Gateway_Express --> Capa_Persistencia : Consultas y Transacciones
```

---

### 2.2.2 Entregable: Script de Base de Datos y Modelo Entidad-Relación

```mermaid
erDiagram
    USUARIOS ||--o{ PEDIDOS : registra
    USUARIOS ||--o{ ORDENES_PRODUCCION : supervisa
    CLIENTES ||--o{ PEDIDOS : solicita
    PEDIDOS ||--|{ PEDIDO_DETALLES : contiene
    PEDIDOS ||--o| ORDENES_PRODUCCION : genera
    ORDENES_PRODUCCION ||--|{ ETAPAS_PRODUCCION : consta_de
    ORDENES_PRODUCCION ||--o{ PARADAS_PRODUCCION : registra
    ORDENES_PRODUCCION ||--o{ CONTROL_CALIDAD : evalua
    ORDENES_PRODUCCION ||--o{ CONSUMO_MATERIALES : consume
    MATERIALES ||--o{ MOVIMIENTOS_INVENTARIO : mueve_en_kardex
    MATERIALES ||--o{ CONSUMO_MATERIALES : suministra
```

- **Scripts DDL**: Ubicados en [`backend/database/schema.sql`](../backend/database/schema.sql), [`backend/database/seed.sql`](../backend/database/seed.sql) y [`backend/database/reportes_queries.sql`](../backend/database/reportes_queries.sql).

---

### 2.2.3 Entregable: Prototipo de Interfaces y Flujos de Navegación del Usuario

```mermaid
stateDiagram-v2
    [*] --> Login: Ingreso al Sistema
    Login --> Dashboard: Autenticación JWT Exitosa (RBAC)
    Dashboard --> Clientes: Gestión de Padrón RUC/DNI
    Dashboard --> Pedidos: Cotizaciones y Pedidos
    Pedidos --> Produccion: Generar Orden de Producción (OP)
    Produccion --> Produccion: Tablero Kanban / Registro de Horas y Paradas
    Dashboard --> Inventario: Catálogo de Materia Prima y Kardex
    Dashboard --> Reportes: Reportes OTIF, Costos y Operarios (Excel/PDF)
    Dashboard --> BI: Dashboard OEE (Disponibilidad x Rendimiento x Calidad)
    Dashboard --> AsistenteIA: Predicción de Riesgos y Copiloto Industrial
```
