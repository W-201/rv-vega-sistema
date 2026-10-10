-- Esquema de Base de Datos - PostgreSQL 16.0
-- Empresa: RV Vega Servicios Generales E.I.R.L.
-- Sistema de Gestión de Producción y Pedidos

DROP TABLE IF EXISTS ai_logs CASCADE;
DROP TABLE IF EXISTS kpi_records CASCADE;
DROP TABLE IF EXISTS control_calidad CASCADE;
DROP TABLE IF EXISTS paradas_produccion CASCADE;
DROP TABLE IF EXISTS etapas_produccion CASCADE;
DROP TABLE IF EXISTS consumo_materiales CASCADE;
DROP TABLE IF EXISTS bom_detalles CASCADE;
DROP TABLE IF EXISTS ordenes_produccion CASCADE;
DROP TABLE IF EXISTS movimientos_inventario CASCADE;
DROP TABLE IF EXISTS materiales CASCADE;
DROP TABLE IF EXISTS pedido_detalles CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- 1. Tabla de Usuarios (Seguridad RBAC)
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(30) NOT NULL DEFAULT 'operario' CHECK (rol IN ('admin', 'jefe_produccion', 'operario', 'ventas')),
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Clientes
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    tipo_documento VARCHAR(10) NOT NULL DEFAULT 'RUC' CHECK (tipo_documento IN ('RUC', 'DNI')),
    numero_documento VARCHAR(20) UNIQUE NOT NULL,
    razon_social VARCHAR(150) NOT NULL,
    contacto VARCHAR(100),
    telefono VARCHAR(30),
    email VARCHAR(100),
    direccion TEXT,
    ciudad VARCHAR(50) DEFAULT 'Lima',
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Pedidos
CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    codigo_pedido VARCHAR(30) UNIQUE NOT NULL,
    cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    fecha_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_entrega_prometida DATE NOT NULL,
    fecha_entrega_real DATE,
    estado VARCHAR(30) NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'En Planificación', 'En Producción', 'Control de Calidad', 'Listo para Entrega', 'Entregado', 'Cancelado')),
    prioridad VARCHAR(20) NOT NULL DEFAULT 'Media' CHECK (prioridad IN ('Baja', 'Media', 'Alta', 'Urgente')),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    igv NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (igv >= 0),
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
    observaciones TEXT,
    creado_por INT REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Detalle de Pedidos
CREATE TABLE pedido_detalles (
    id SERIAL PRIMARY KEY,
    pedido_id INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    descripcion_producto VARCHAR(200) NOT NULL,
    especificaciones TEXT,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(12, 2) NOT NULL CHECK (precio_unitario >= 0),
    total_linea NUMERIC(12, 2) NOT NULL CHECK (total_linea >= 0)
);

-- 5. Catálogo de Materia Prima e Insumos
CREATE TABLE materiales (
    id SERIAL PRIMARY KEY,
    codigo_sku VARCHAR(30) UNIQUE NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    categoria VARCHAR(50) NOT NULL, -- 'Metales/Perfiles', 'Pinturas/Acabados', 'Fijaciones/Tornillería', 'Soldadura/Consumibles', 'Eléctricos'
    unidad_medida VARCHAR(20) NOT NULL, -- 'kg', 'm', 'plancha', 'galón', 'tubo', 'und'
    stock_actual NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (stock_actual >= 0),
    stock_minimo NUMERIC(12, 2) NOT NULL DEFAULT 5.00 CHECK (stock_minimo >= 0),
    costo_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (costo_unitario >= 0),
    ubicacion_almacen VARCHAR(50) DEFAULT 'Almacén Central',
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Movimientos de Inventario (Kardex)
CREATE TABLE movimientos_inventario (
    id SERIAL PRIMARY KEY,
    material_id INT NOT NULL REFERENCES materiales(id) ON DELETE RESTRICT,
    tipo_movimiento VARCHAR(20) NOT NULL CHECK (tipo_movimiento IN ('ENTRADA', 'SALIDA_PRODUCCION', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO')),
    cantidad NUMERIC(12, 2) NOT NULL CHECK (cantidad > 0),
    costo_unitario NUMERIC(12, 2) NOT NULL CHECK (costo_unitario >= 0),
    referencia_documento VARCHAR(50), -- Nro Factura Proveedor, Nro OP
    motivo TEXT,
    registrado_por INT REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Órdenes de Producción (OP)
CREATE TABLE ordenes_produccion (
    id SERIAL PRIMARY KEY,
    codigo_op VARCHAR(30) UNIQUE NOT NULL,
    pedido_id INT NOT NULL REFERENCES pedidos(id) ON DELETE RESTRICT,
    estado VARCHAR(30) NOT NULL DEFAULT 'Planificada' CHECK (estado IN ('Planificada', 'En Proceso', 'Pausada', 'Completada', 'Cancelada')),
    prioridad VARCHAR(20) NOT NULL DEFAULT 'Media' CHECK (prioridad IN ('Baja', 'Media', 'Alta', 'Urgente')),
    fecha_inicio_programada DATE NOT NULL,
    fecha_fin_programada DATE NOT NULL,
    fecha_inicio_real TIMESTAMP,
    fecha_fin_real TIMESTAMP,
    porcentaje_avance INT NOT NULL DEFAULT 0 CHECK (porcentaje_avance BETWEEN 0 AND 100),
    costo_estimado NUMERIC(12, 2) DEFAULT 0.00 CHECK (costo_estimado >= 0),
    costo_real NUMERIC(12, 2) DEFAULT 0.00 CHECK (costo_real >= 0),
    responsable_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    observaciones TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Etapas del Proceso Productivo por Orden de Producción
CREATE TABLE etapas_produccion (
    id SERIAL PRIMARY KEY,
    orden_produccion_id INT NOT NULL REFERENCES ordenes_produccion(id) ON DELETE CASCADE,
    numero_fase INT NOT NULL CHECK (numero_fase > 0),
    nombre_etapa VARCHAR(80) NOT NULL, -- 'Habilitado y Corte', 'Mecanizado y Ensamble', 'Soldadura/Estructura', 'Acabado y Pintura', 'Control de Calidad'
    descripcion TEXT,
    operario_asignado VARCHAR(100),
    horas_estimadas NUMERIC(6, 2) NOT NULL DEFAULT 1.00 CHECK (horas_estimadas > 0),
    horas_reales NUMERIC(6, 2) NOT NULL DEFAULT 0.00 CHECK (horas_reales >= 0),
    estado VARCHAR(30) NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'En Proceso', 'Finalizada', 'Detenida')),
    fecha_inicio TIMESTAMP,
    fecha_fin TIMESTAMP
);

-- 9. Lista de Materiales (BOM) y Consumos por Orden
CREATE TABLE consumo_materiales (
    id SERIAL PRIMARY KEY,
    orden_produccion_id INT NOT NULL REFERENCES ordenes_produccion(id) ON DELETE CASCADE,
    material_id INT NOT NULL REFERENCES materiales(id) ON DELETE RESTRICT,
    cantidad_requerida NUMERIC(12, 2) NOT NULL CHECK (cantidad_requerida >= 0),
    cantidad_consumida NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (cantidad_consumida >= 0),
    cantidad_merma NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (cantidad_merma >= 0),
    costo_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (costo_total >= 0)
);

-- 10. Control de Calidad e Inspección
CREATE TABLE control_calidad (
    id SERIAL PRIMARY KEY,
    orden_produccion_id INT NOT NULL REFERENCES ordenes_produccion(id) ON DELETE CASCADE,
    inspector_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    resultado VARCHAR(30) NOT NULL CHECK (resultado IN ('Aprobado', 'Rechazado', 'Aprobado con Observaciones')),
    defectos_encontrados TEXT,
    acciones_correctivas TEXT,
    merma_porcentaje NUMERIC(5, 2) DEFAULT 0.00 CHECK (merma_porcentaje BETWEEN 0 AND 100),
    fecha_inspeccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Registro de Paradas / Incidencias
CREATE TABLE paradas_produccion (
    id SERIAL PRIMARY KEY,
    orden_produccion_id INT NOT NULL REFERENCES ordenes_produccion(id) ON DELETE CASCADE,
    etapa_id INT REFERENCES etapas_produccion(id) ON DELETE SET NULL,
    motivo VARCHAR(100) NOT NULL, -- 'Falla de Máquina', 'Falta de Material', 'Corte de Fluido Eléctrico', 'Reproceso', 'Otro'
    minutos_parada INT NOT NULL DEFAULT 0 CHECK (minutos_parada >= 0),
    descripcion TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Historial de Consultas y Predicciones de IA
CREATE TABLE ai_logs (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL, -- 'prediccion_retraso', 'optimizacion_secuencia', 'chat_advisor'
    consulta TEXT,
    respuesta TEXT,
    metadata JSONB,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimización de consultas y reportes (2.2.2 / 3.6.1)
CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_ordenes_pedido ON ordenes_produccion(pedido_id);
CREATE INDEX idx_etapas_op ON etapas_produccion(orden_produccion_id);
CREATE INDEX idx_movimientos_material ON movimientos_inventario(material_id);

-- ============================================================================
-- 13. VISTAS SQL PARA MÓDULO DE REPORTES GERENCIALES (3.6.1)
-- ============================================================================

-- Vista SQL 1: Reporte de Cumplimiento de Entregas (OTIF)
CREATE OR REPLACE VIEW vista_reporte_otif AS
SELECT 
    p.id,
    p.codigo_pedido,
    c.razon_social AS cliente,
    p.fecha_pedido,
    p.fecha_entrega_prometida AS fecha_pactada,
    p.fecha_entrega_real AS fecha_real,
    (p.fecha_entrega_real - p.fecha_entrega_prometida) AS dias_desviacion,
    CASE 
        WHEN p.fecha_entrega_real <= p.fecha_entrega_prometida THEN TRUE
        ELSE FALSE
    END AS cumple_otif,
    p.total
FROM pedidos p
LEFT JOIN clientes c ON p.cliente_id = c.id
WHERE p.estado = 'Entregado' AND p.fecha_entrega_real IS NOT NULL;

-- Vista SQL 2: Reporte Financiero de Costos y Márgenes de Producción
CREATE OR REPLACE VIEW vista_reporte_costos AS
SELECT 
    op.codigo_op,
    p.codigo_pedido,
    c.razon_social AS cliente,
    op.estado,
    COALESCE(p.subtotal, 0) AS venta_subtotal,
    COALESCE(op.costo_estimado, 0) AS costo_estimado,
    COALESCE(op.costo_real, op.costo_estimado, 0) AS costo_real,
    (COALESCE(p.subtotal, 0) - COALESCE(op.costo_real, op.costo_estimado, 0)) AS margen_bruto,
    CASE 
        WHEN COALESCE(p.subtotal, 0) > 0 
            THEN ROUND(((COALESCE(p.subtotal, 0) - COALESCE(op.costo_real, op.costo_estimado, 0)) / p.subtotal) * 100, 2)
        ELSE 0
    END AS porcentaje_margen
FROM ordenes_produccion op
LEFT JOIN pedidos p ON op.pedido_id = p.id
LEFT JOIN clientes c ON p.cliente_id = c.id;

-- Vista SQL 3: Reporte de Productividad y Eficiencia por Operario
CREATE OR REPLACE VIEW vista_reporte_operarios AS
SELECT 
    COALESCE(ep.operario_asignado, 'Sin Asignar') AS operario,
    COUNT(ep.id) AS etapas_asignadas,
    COUNT(CASE WHEN ep.estado = 'Finalizada' THEN 1 END) AS etapas_finalizadas,
    ROUND(SUM(COALESCE(ep.horas_estimadas, 0)), 2) AS horas_estimadas,
    ROUND(SUM(COALESCE(ep.horas_reales, 0)), 2) AS horas_reales,
    CASE 
        WHEN SUM(COALESCE(ep.horas_reales, 0)) > 0 
            THEN ROUND((SUM(COALESCE(ep.horas_estimadas, 0)) / SUM(COALESCE(ep.horas_reales, 0))) * 100, 2)
        ELSE 100.00
    END AS eficiencia_porcentaje
FROM etapas_produccion ep
GROUP BY COALESCE(ep.operario_asignado, 'Sin Asignar');

