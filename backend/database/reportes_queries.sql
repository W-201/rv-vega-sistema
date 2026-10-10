-- ============================================================================
-- CONSULTAS SQL OFICIALES PARA EL MÓDULO DE REPORTES GERENCIALES (REQUERIMIENTO 3.6.1)
-- Empresa: RV Vega Servicios Generales E.I.R.L.
-- ============================================================================

-- 1. CONSULTA SQL: REPORTE DE CUMPLIMIENTO OTIF (On-Time In-Full)
-- Calcula el índice de entregas a tiempo, días de desviación y monto facturado
-- Parámetros opcionales: $1 (fecha_desde), $2 (fecha_hasta)
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
WHERE p.estado = 'Entregado' 
  AND p.fecha_entrega_real IS NOT NULL
  AND (CAST($1 AS DATE) IS NULL OR p.fecha_pedido >= $1)
  AND (CAST($2 AS DATE) IS NULL OR p.fecha_pedido <= $2)
ORDER BY p.fecha_entrega_real DESC;

-- KPI Consolidado OTIF:
SELECT 
    COUNT(*) AS total_evaluados,
    COUNT(CASE WHEN p.fecha_entrega_real <= p.fecha_entrega_prometida THEN 1 END) AS a_tiempo,
    COUNT(CASE WHEN p.fecha_entrega_real > p.fecha_entrega_prometida THEN 1 END) AS con_retraso,
    ROUND((COUNT(CASE WHEN p.fecha_entrega_real <= p.fecha_entrega_prometida THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 1) AS porcentaje_otif
FROM pedidos p
WHERE p.estado = 'Entregado' AND p.fecha_entrega_real IS NOT NULL;


-- 2. CONSULTA SQL: REPORTE FINANCIERO DE COSTOS, VENTAS Y MÁRGENES
-- Cruce entre Órdenes de Producción, Pedidos y Clientes
SELECT 
    op.codigo_op,
    p.codigo_pedido,
    COALESCE(c.razon_social, 'Cliente General') AS cliente,
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
LEFT JOIN clientes c ON p.cliente_id = c.id
ORDER BY op.id ASC;

-- Resumen Global de Costos y Rentabilidad:
SELECT 
    ROUND(SUM(COALESCE(p.subtotal, 0)), 2) AS total_venta,
    ROUND(SUM(COALESCE(op.costo_real, op.costo_estimado, 0)), 2) AS total_costo_produccion,
    ROUND(SUM(COALESCE(p.subtotal, 0) - COALESCE(op.costo_real, op.costo_estimado, 0)), 2) AS margen_global,
    ROUND(((SUM(COALESCE(p.subtotal, 0) - COALESCE(op.costo_real, op.costo_estimado, 0)) / NULLIF(SUM(COALESCE(p.subtotal, 0)), 0)) * 100), 1) AS margen_porcentaje_promedio
FROM ordenes_produccion op
LEFT JOIN pedidos p ON op.pedido_id = p.id;


-- 3. CONSULTA SQL: REPORTE DE PRODUCTIVIDAD Y HORAS POR OPERARIO
-- Agrupamiento y cálculo de ratio de eficiencia (Horas Estándar vs Horas Reales)
SELECT 
    COALESCE(ep.operario_asignado, 'Sin Asignar') AS operario,
    COUNT(ep.id) AS etapas_asignadas,
    COUNT(CASE WHEN ep.estado = 'Finalizada' THEN 1 END) AS etapas_finalizadas,
    ROUND(SUM(COALESCE(ep.horas_estimadas, 0)), 1) AS horas_estimadas,
    ROUND(SUM(COALESCE(ep.horas_reales, 0)), 1) AS horas_reales,
    CASE 
        WHEN SUM(COALESCE(ep.horas_reales, 0)) > 0 
            THEN ROUND((SUM(COALESCE(ep.horas_estimadas, 0)) / SUM(COALESCE(ep.horas_reales, 0))) * 100)
        ELSE 100
    END AS eficiencia_porcentaje
FROM etapas_produccion ep
GROUP BY COALESCE(ep.operario_asignado, 'Sin Asignar')
ORDER BY eficiencia_porcentaje DESC;
