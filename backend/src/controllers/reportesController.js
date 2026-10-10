import { getDb, query, usePostgres } from '../config/db.js';

export async function getReporteOTIF(req, res) {
  try {
    const { fecha_desde, fecha_hasta } = req.query;

    if (usePostgres) {
      let sql = `
        SELECT 
          p.id,
          p.codigo_pedido,
          COALESCE(c.razon_social, 'Cliente General') AS cliente,
          p.fecha_entrega_prometida::TEXT AS fecha_pactada,
          p.fecha_entrega_real::TEXT AS fecha_real,
          (p.fecha_entrega_real - p.fecha_entrega_prometida) AS dias_desviacion,
          (p.fecha_entrega_real <= p.fecha_entrega_prometida) AS cumple_otif,
          p.total::NUMERIC AS total
        FROM pedidos p
        LEFT JOIN clientes c ON p.cliente_id = c.id
        WHERE p.estado = 'Entregado' AND p.fecha_entrega_real IS NOT NULL
      `;
      const params = [];
      if (fecha_desde) {
        params.push(fecha_desde);
        sql += ` AND p.fecha_pedido >= $${params.length}`;
      }
      if (fecha_hasta) {
        params.push(fecha_hasta);
        sql += ` AND p.fecha_pedido <= $${params.length}`;
      }
      sql += ` ORDER BY p.fecha_entrega_real DESC`;

      const result = await query(sql, params);
      const pedidosEvaluados = result.rows.map(r => ({
        id: r.id,
        codigo_pedido: r.codigo_pedido,
        cliente: r.cliente,
        fecha_pactada: r.fecha_pactada,
        fecha_real: r.fecha_real,
        dias_desviacion: Number(r.dias_desviacion),
        cumple_otif: Boolean(r.cumple_otif),
        total: Number(r.total)
      }));

      const totalEvaluados = pedidosEvaluados.length;
      const aTiempo = pedidosEvaluados.filter(p => p.cumple_otif).length;
      const conRetraso = totalEvaluados - aTiempo;
      const porcentajeOtif = totalEvaluados > 0 ? Math.round((aTiempo / totalEvaluados) * 1000) / 10 : 100;

      return res.json({
        resumen: {
          total_evaluados: totalEvaluados,
          a_tiempo: aTiempo,
          con_retraso: conRetraso,
          porcentaje_otif: porcentajeOtif,
          estado_meta: porcentajeOtif >= 90 ? 'Excelente (>=90%)' : porcentajeOtif >= 80 ? 'Aceptable' : 'Crítico (<80%)'
        },
        pedidos: pedidosEvaluados,
        modo_ejecucion: 'SQL_POSTGRESQL'
      });
    }

    // Modo Almacén Local Persistente (Fallback de desarrollo ágil)
    const db = getDb();
    let pedidos = db.pedidos.filter(p => p.estado === 'Entregado' && p.fecha_entrega_real);

    if (fecha_desde) pedidos = pedidos.filter(p => p.fecha_pedido >= fecha_desde);
    if (fecha_hasta) pedidos = pedidos.filter(p => p.fecha_pedido <= fecha_hasta);

    let aTiempo = 0;
    let conRetraso = 0;

    const pedidosEvaluados = pedidos.map(p => {
      const fechaPactada = new Date(p.fecha_entrega_prometida);
      const fechaReal = new Date(p.fecha_entrega_real);
      const diffMs = fechaReal.getTime() - fechaPactada.getTime();
      const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const cumpleTiempo = diffDias <= 0;

      if (cumpleTiempo) aTiempo++;
      else conRetraso++;

      const cliente = db.clientes.find(c => c.id === p.cliente_id);

      return {
        id: p.id,
        codigo_pedido: p.codigo_pedido,
        cliente: cliente ? cliente.razon_social : 'Cliente Desconocido',
        fecha_pactada: p.fecha_entrega_prometida,
        fecha_real: p.fecha_entrega_real,
        dias_desviacion: diffDias,
        cumple_otif: cumpleTiempo,
        total: p.total
      };
    });

    const totalEvaluados = pedidosEvaluados.length;
    const porcentajeOtif = totalEvaluados > 0 ? Math.round((aTiempo / totalEvaluados) * 1000) / 10 : 100;

    res.json({
      resumen: {
        total_evaluados: totalEvaluados,
        a_tiempo: aTiempo,
        con_retraso: conRetraso,
        porcentaje_otif: porcentajeOtif,
        estado_meta: porcentajeOtif >= 90 ? 'Excelente (>=90%)' : porcentajeOtif >= 80 ? 'Aceptable' : 'Crítico (<80%)'
      },
      pedidos: pedidosEvaluados,
      modo_ejecucion: 'LOCAL_STORE'
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al generar reporte OTIF: ' + err.message });
  }
}

export async function getReporteCostos(req, res) {
  try {
    if (usePostgres) {
      const sql = `
        SELECT 
          op.codigo_op,
          COALESCE(p.codigo_pedido, '-') AS codigo_pedido,
          COALESCE(c.razon_social, '-') AS cliente,
          op.estado,
          COALESCE(p.subtotal, 0)::NUMERIC AS venta_subtotal,
          COALESCE(op.costo_estimado, 0)::NUMERIC AS costo_estimado,
          COALESCE(op.costo_real, op.costo_estimado, 0)::NUMERIC AS costo_real,
          (COALESCE(p.subtotal, 0) - COALESCE(op.costo_real, op.costo_estimado, 0))::NUMERIC AS margen_bruto,
          CASE 
            WHEN COALESCE(p.subtotal, 0) > 0 
              THEN ROUND(((COALESCE(p.subtotal, 0) - COALESCE(op.costo_real, op.costo_estimado, 0)) / p.subtotal) * 100)
            ELSE 0 
          END::NUMERIC AS porcentaje_margen
        FROM ordenes_produccion op
        LEFT JOIN pedidos p ON op.pedido_id = p.id
        LEFT JOIN clientes c ON p.cliente_id = c.id
        ORDER BY op.id ASC
      `;

      const result = await query(sql);
      const ops = result.rows.map(r => ({
        codigo_op: r.codigo_op,
        codigo_pedido: r.codigo_pedido,
        cliente: r.cliente,
        estado: r.estado,
        venta_subtotal: Number(r.venta_subtotal),
        costo_estimado: Number(r.costo_estimado),
        costo_real: Number(r.costo_real),
        margen_bruto: Number(r.margen_bruto),
        porcentaje_margen: Number(r.porcentaje_margen)
      }));

      const totalVenta = ops.reduce((acc, curr) => acc + curr.venta_subtotal, 0);
      const totalCosto = ops.reduce((acc, curr) => acc + curr.costo_real, 0);
      const margenGlobal = totalVenta - totalCosto;

      return res.json({
        resumen: {
          total_venta: Math.round(totalVenta * 100) / 100,
          total_costo_produccion: Math.round(totalCosto * 100) / 100,
          margen_global: Math.round(margenGlobal * 100) / 100,
          margen_porcentaje_promedio: totalVenta > 0 ? Math.round((margenGlobal / totalVenta) * 100) : 0
        },
        ordenes: ops,
        modo_ejecucion: 'SQL_POSTGRESQL'
      });
    }

    // Modo Almacén Local Persistente
    const db = getDb();
    const ops = db.ordenes_produccion.map(op => {
      const pedido = db.pedidos.find(p => p.id === op.pedido_id);
      const cliente = pedido ? db.clientes.find(c => c.id === pedido.cliente_id) : null;
      const ventaTotal = pedido ? pedido.subtotal : 0;
      const costoEstimado = op.costo_estimado || 0;
      const costoReal = op.costo_real || costoEstimado;
      const margenEstimado = ventaTotal - costoReal;
      const porcentajeMargen = ventaTotal > 0 ? Math.round((margenEstimado / ventaTotal) * 100) : 0;

      return {
        codigo_op: op.codigo_op,
        codigo_pedido: pedido ? pedido.codigo_pedido : '-',
        cliente: cliente ? cliente.razon_social : '-',
        estado: op.estado,
        venta_subtotal: ventaTotal,
        costo_estimado: costoEstimado,
        costo_real: costoReal,
        margen_bruto: margenEstimado,
        porcentaje_margen: porcentajeMargen
      };
    });

    const totalVenta = ops.reduce((acc, curr) => acc + curr.venta_subtotal, 0);
    const totalCosto = ops.reduce((acc, curr) => acc + curr.costo_real, 0);
    const margenGlobal = totalVenta - totalCosto;

    res.json({
      resumen: {
        total_venta: Math.round(totalVenta * 100) / 100,
        total_costo_produccion: Math.round(totalCosto * 100) / 100,
        margen_global: Math.round(margenGlobal * 100) / 100,
        margen_porcentaje_promedio: totalVenta > 0 ? Math.round((margenGlobal / totalVenta) * 100) : 0
      },
      ordenes: ops,
      modo_ejecucion: 'LOCAL_STORE'
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al generar reporte de costos: ' + err.message });
  }
}

export async function getReporteOperarios(req, res) {
  try {
    if (usePostgres) {
      const sql = `
        SELECT 
          COALESCE(ep.operario_asignado, 'Sin Asignar') AS operario,
          COUNT(ep.id)::INT AS etapas_asignadas,
          COUNT(CASE WHEN ep.estado = 'Finalizada' THEN 1 END)::INT AS etapas_finalizadas,
          ROUND(SUM(COALESCE(ep.horas_estimadas, 0)), 1)::NUMERIC AS horas_estimadas,
          ROUND(SUM(COALESCE(ep.horas_reales, 0)), 1)::NUMERIC AS horas_reales,
          CASE 
            WHEN SUM(COALESCE(ep.horas_reales, 0)) > 0 
              THEN ROUND((SUM(COALESCE(ep.horas_estimadas, 0)) / SUM(COALESCE(ep.horas_reales, 0))) * 100)
            ELSE 100 
          END::NUMERIC AS eficiencia_porcentaje
        FROM etapas_produccion ep
        GROUP BY COALESCE(ep.operario_asignado, 'Sin Asignar')
        ORDER BY operario ASC
      `;

      const result = await query(sql);
      const data = result.rows.map(r => ({
        operario: r.operario,
        etapas_asignadas: Number(r.etapas_asignadas),
        etapas_finalizadas: Number(r.etapas_finalizadas),
        horas_estimadas: Number(r.horas_estimadas),
        horas_reales: Number(r.horas_reales),
        eficiencia_porcentaje: Number(r.eficiencia_porcentaje)
      }));

      return res.json(data);
    }

    // Modo Almacén Local Persistente
    const db = getDb();
    const mapa = {};

    db.etapas_produccion.forEach(e => {
      const opName = e.operario_asignado || 'Sin Asignar';
      if (!mapa[opName]) {
        mapa[opName] = {
          operario: opName,
          etapas_asignadas: 0,
          etapas_finalizadas: 0,
          horas_estimadas: 0,
          horas_reales: 0
        };
      }
      mapa[opName].etapas_asignadas++;
      if (e.estado === 'Finalizada') mapa[opName].etapas_finalizadas++;
      mapa[opName].horas_estimadas += Number(e.horas_estimadas || 0);
      mapa[opName].horas_reales += Number(e.horas_reales || 0);
    });

    const resultados = Object.values(mapa).map(o => {
      const eficiencia = o.horas_reales > 0
        ? Math.round((o.horas_estimadas / o.horas_reales) * 100)
        : 100;
      return {
        ...o,
        horas_estimadas: Math.round(o.horas_estimadas * 10) / 10,
        horas_reales: Math.round(o.horas_reales * 10) / 10,
        eficiencia_porcentaje: eficiencia
      };
    });

    res.json(resultados);
  } catch (err) {
    res.status(500).json({ error: 'Error al generar reporte de operarios: ' + err.message });
  }
}
