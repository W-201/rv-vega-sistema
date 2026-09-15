import { getDb } from '../config/db.js';

export function getReporteOTIF(req, res) {
  try {
    const db = getDb();
    const { fecha_desde, fecha_hasta } = req.query;

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
      pedidos: pedidosEvaluados
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al generar reporte OTIF: ' + err.message });
  }
}

export function getReporteCostos(req, res) {
  try {
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
      ordenes: ops
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al generar reporte de costos: ' + err.message });
  }
}

export function getReporteOperarios(req, res) {
  try {
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
