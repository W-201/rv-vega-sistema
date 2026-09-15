import { getDb } from '../config/db.js';

export function getBIDashboard(req, res) {
  try {
    const db = getDb();

    // 1. Cálculo de OEE (Eficiencia General del Proceso)
    // a) Disponibilidad: Tiempo planificado vs tiempo de paradas registradas
    const totalMinutosParada = db.paradas_produccion.reduce((acc, p) => acc + (p.minutos_parada || 0), 0);
    const tiempoPlanificadoEstimadoMinutos = 480 * 20; // 20 días x 8h = 9600 min
    const disponibilidad = Math.max(70, Math.min(99, Math.round(((tiempoPlanificadoEstimadoMinutos - totalMinutosParada) / tiempoPlanificadoEstimadoMinutos) * 100)));

    // b) Rendimiento: Horas estimadas vs horas reales en etapas finalizadas
    const etapasFinalizadas = db.etapas_produccion.filter(e => e.estado === 'Finalizada');
    const totEstimadas = etapasFinalizadas.reduce((acc, e) => acc + Number(e.horas_estimadas || 0), 0);
    const totReales = etapasFinalizadas.reduce((acc, e) => acc + Number(e.horas_reales || 0), 0);
    const rendimiento = totReales > 0 ? Math.min(100, Math.round((totEstimadas / totReales) * 100)) : 88;

    // c) Calidad: Basado en inspecciones y mermas
    const inspecciones = db.control_calidad || [];
    const mermaPromedio = inspecciones.length > 0
      ? inspecciones.reduce((acc, c) => acc + Number(c.merma_porcentaje || 0), 0) / inspecciones.length
      : 2.0;
    const calidad = Math.round((100 - mermaPromedio) * 10) / 10;

    // d) OEE Global
    const oeeGlobal = Math.round(((disponibilidad / 100) * (rendimiento / 100) * (calidad / 100)) * 1000) / 10;

    // 2. Cuellos de Botella por Etapa
    const etapasPorNombre = {};
    db.etapas_produccion.forEach(e => {
      if (!etapasPorNombre[e.nombre_etapa]) {
        etapasPorNombre[e.nombre_etapa] = {
          etapa: e.nombre_etapa,
          horas_estimadas: 0,
          horas_reales: 0,
          en_proceso: 0,
          pendientes: 0
        };
      }
      etapasPorNombre[e.nombre_etapa].horas_estimadas += Number(e.horas_estimadas || 0);
      etapasPorNombre[e.nombre_etapa].horas_reales += Number(e.horas_reales || 0);
      if (e.estado === 'En Proceso') etapasPorNombre[e.nombre_etapa].en_proceso++;
      if (e.estado === 'Pendiente') etapasPorNombre[e.nombre_etapa].pendientes++;
    });

    const cuellosBotella = Object.values(etapasPorNombre).map(item => ({
      ...item,
      diferencia_horas: Math.round((item.horas_reales - item.horas_estimadas) * 10) / 10
    }));

    // 3. Distribución de Causas de Parada
    const paradasPorMotivo = {};
    db.paradas_produccion.forEach(p => {
      paradasPorMotivo[p.motivo] = (paradasPorMotivo[p.motivo] || 0) + p.minutos_parada;
    });
    const dataParadas = Object.keys(paradasPorMotivo).map(k => ({
      motivo: k,
      minutos: paradasPorMotivo[k]
    }));

    // 4. Ventas y Facturación Mensual
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set'];
    const ventasMensuales = [
      { mes: 'Mayo', ventas: 28400, produccion: 26000, costo: 18200 },
      { mes: 'Junio', ventas: 34200, produccion: 32500, costo: 22100 },
      { mes: 'Julio', ventas: 41500, produccion: 39000, costo: 26800 },
      { mes: 'Agosto', ventas: 37062, produccion: 35400, costo: 24100 },
      { mes: 'Setiembre', ventas: 31742, produccion: 29500, costo: 20500 }
    ];

    // 5. Estado de Pedidos
    const estadosPedidos = {
      Pendiente: db.pedidos.filter(p => p.estado === 'Pendiente').length,
      En_Planificacion: db.pedidos.filter(p => p.estado === 'En Planificación').length,
      En_Produccion: db.pedidos.filter(p => p.estado === 'En Producción').length,
      Entregado: db.pedidos.filter(p => p.estado === 'Entregado').length
    };

    // 6. Resumen de Inventario Crítico
    const materialesCriticos = db.materiales
      .filter(m => Number(m.stock_actual) <= Number(m.stock_minimo))
      .map(m => ({
        sku: m.codigo_sku,
        nombre: m.nombre,
        actual: m.stock_actual,
        minimo: m.stock_minimo,
        unidad: m.unidad_medida
      }));

    res.json({
      oee: {
        global: oeeGlobal,
        disponibilidad,
        rendimiento,
        calidad,
        clasificacion: oeeGlobal >= 85 ? 'Clase Mundial (>=85%)' : oeeGlobal >= 75 ? 'Aceptable (75-84%)' : 'Requiere Mejora (<75%)'
      },
      cuellos_botella: cuellosBotella,
      paradas_produccion: dataParadas,
      ventas_mensuales: ventasMensuales,
      estados_pedidos: estadosPedidos,
      materiales_criticos: materialesCriticos,
      resumen_kpis: {
        total_pedidos: db.pedidos.length,
        ops_activas: db.ordenes_produccion.filter(o => o.estado === 'En Proceso').length,
        total_clientes: db.clientes.length,
        materiales_en_alerta: materialesCriticos.length
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al calcular BI: ' + err.message });
  }
}
