import { getDb, saveStore } from '../config/db.js';

// Función de cálculo de tiempos de producción (Requerimiento 3.4.1.3)
export function calcularMetricasTiempos(etapas = [], paradas = []) {
  const horas_estimadas_totales = Math.round(etapas.reduce((acc, e) => acc + Number(e.horas_estimadas || 0), 0) * 100) / 100;
  const horas_reales_totales = Math.round(etapas.reduce((acc, e) => acc + Number(e.horas_reales || 0), 0) * 100) / 100;
  const minutos_parada_totales = paradas.reduce((acc, p) => acc + Number(p.minutos_parada || 0), 0);
  const horas_parada_totales = Math.round((minutos_parada_totales / 60) * 100) / 100;

  // Para eficiencia de tiempo, comparamos las etapas que ya tienen horas reales registradas
  const etapasConAvance = etapas.filter(e => Number(e.horas_reales || 0) > 0);
  const estConAvance = etapasConAvance.reduce((acc, e) => acc + Number(e.horas_estimadas || 0), 0);
  const realConAvance = etapasConAvance.reduce((acc, e) => acc + Number(e.horas_reales || 0), 0);

  const eficiencia_tiempo_pct = realConAvance > 0
    ? Math.round((estConAvance / realConAvance) * 1000) / 10
    : 100.0;

  const desviacion_horas = Math.round((horas_reales_totales - estConAvance) * 100) / 100;
  const tiempo_ciclo_total_horas = Math.round((horas_reales_totales + horas_parada_totales) * 100) / 100;

  return {
    horas_estimadas_totales,
    horas_reales_totales,
    minutos_parada_totales,
    horas_parada_totales,
    eficiencia_tiempo_pct,
    desviacion_horas,
    tiempo_ciclo_total_horas
  };
}

export function getCalculoTiemposProduccion(req, res) {
  try {
    const db = getDb();
    const resumenPorOp = db.ordenes_produccion.map(op => {
      const etapas = db.etapas_produccion.filter(e => e.orden_produccion_id === op.id);
      const paradas = db.paradas_produccion.filter(p => p.orden_produccion_id === op.id);
      const tiempos = calcularMetricasTiempos(etapas, paradas);
      return {
        id: op.id,
        codigo_op: op.codigo_op,
        estado: op.estado,
        porcentaje_avance: op.porcentaje_avance,
        ...tiempos
      };
    });

    const todasEtapas = db.etapas_produccion;
    const todasParadas = db.paradas_produccion;
    const global = calcularMetricasTiempos(todasEtapas, todasParadas);

    res.json({
      global,
      ordenes: resumenPorOp
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al calcular tiempos de producción: ' + err.message });
  }
}

export function getOrdenesProduccion(req, res) {
  try {
    const db = getDb();
    const { estado } = req.query;

    let ops = db.ordenes_produccion.map(op => {
      const pedido = db.pedidos.find(p => p.id === op.pedido_id);
      const cliente = pedido ? db.clientes.find(c => c.id === pedido.cliente_id) : null;
      const etapas = db.etapas_produccion.filter(e => e.orden_produccion_id === op.id);
      const paradas = db.paradas_produccion.filter(p => p.orden_produccion_id === op.id);
      const responsable = db.usuarios.find(u => u.id === op.responsable_id);
      const tiempos = calcularMetricasTiempos(etapas, paradas);

      return {
        ...op,
        codigo_pedido: pedido ? pedido.codigo_pedido : 'Sin Pedido',
        cliente_nombre: cliente ? cliente.razon_social : 'Sin Cliente',
        fecha_entrega_prometida: pedido ? pedido.fecha_entrega_prometida : null,
        responsable_nombre: responsable ? responsable.nombre : 'Por asignar',
        total_etapas: etapas.length,
        etapas_finalizadas: etapas.filter(e => e.estado === 'Finalizada').length,
        ...tiempos,
        etapas,
        paradas
      };
    });

    if (estado && estado !== 'Todos') {
      ops = ops.filter(o => o.estado === estado);
    }

    ops.sort((a, b) => b.id - a.id);
    res.json(ops);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar OPs: ' + err.message });
  }
}

export function getOrdenById(req, res) {
  try {
    const id = parseInt(req.params.id);
    const db = getDb();
    const op = db.ordenes_produccion.find(o => o.id === id);
    if (!op) return res.status(404).json({ error: 'Orden de producción no encontrada' });

    const pedido = db.pedidos.find(p => p.id === op.pedido_id);
    const cliente = pedido ? db.clientes.find(c => c.id === pedido.cliente_id) : null;
    const etapas = db.etapas_produccion.filter(e => e.orden_produccion_id === id);
    const paradas = db.paradas_produccion.filter(p => p.orden_produccion_id === id);
    const consumos = db.consumo_materiales ? db.consumo_materiales.filter(c => c.orden_produccion_id === id) : [];
    const calidades = db.control_calidad.filter(c => c.orden_produccion_id === id);
    const tiempos = calcularMetricasTiempos(etapas, paradas);

    res.json({
      ...op,
      ...tiempos,
      pedido,
      cliente,
      etapas,
      paradas,
      consumos,
      calidades
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar OP: ' + err.message });
  }
}

export function createOrdenProduccion(req, res) {
  try {
    const { pedido_id, prioridad, fecha_inicio_programada, fecha_fin_programada, responsable_id, observaciones } = req.body;

    const db = getDb();
    const pedido = db.pedidos.find(p => p.id === parseInt(pedido_id));
    if (!pedido) return res.status(404).json({ error: 'Pedido asociado no existe' });

    const newId = db.ordenes_produccion.length > 0 ? Math.max(...db.ordenes_produccion.map(o => o.id)) + 1 : 1;
    const year = new Date().getFullYear();
    const codigo_op = `OP-${year}-${String(newId).padStart(3, '0')}`;

    const nuevaOp = {
      id: newId,
      codigo_op,
      pedido_id: parseInt(pedido_id),
      estado: 'Planificada',
      prioridad: prioridad || pedido.prioridad || 'Media',
      fecha_inicio_programada: fecha_inicio_programada || new Date().toISOString().split('T')[0],
      fecha_fin_programada: fecha_fin_programada || pedido.fecha_entrega_prometida,
      fecha_inicio_real: null,
      fecha_fin_real: null,
      porcentaje_avance: 0,
      costo_estimado: Math.round(pedido.subtotal * 0.65),
      costo_real: 0.00,
      responsable_id: responsable_id ? parseInt(responsable_id) : 1,
      observaciones: observaciones || `Generada para atender ${pedido.codigo_pedido}`,
      creado_en: new Date().toISOString()
    };

    let etapaId = db.etapas_produccion.length > 0 ? Math.max(...db.etapas_produccion.map(e => e.id)) + 1 : 1;
    const etapasEstandar = [
      {
        id: etapaId++,
        orden_produccion_id: newId,
        numero_fase: 1,
        nombre_etapa: 'Habilitado y Corte',
        descripcion: 'Corte, dimensionamiento y preparación de perfiles / planchas',
        operario_asignado: 'Juan Pérez T.',
        horas_estimadas: 14.0,
        horas_reales: 0.0,
        estado: 'Pendiente',
        fecha_inicio: null,
        fecha_fin: null
      },
      {
        id: etapaId++,
        orden_produccion_id: newId,
        numero_fase: 2,
        nombre_etapa: 'Mecanizado y Perforado',
        descripcion: 'Taladrado, biselado y preparación de uniones mecánicas',
        operario_asignado: 'Marcos Quispe',
        horas_estimadas: 10.0,
        horas_reales: 0.0,
        estado: 'Pendiente',
        fecha_inicio: null,
        fecha_fin: null
      },
      {
        id: etapaId++,
        orden_produccion_id: newId,
        numero_fase: 3,
        nombre_etapa: 'Armado y Soldadura',
        descripcion: 'Fijación, apuntalado y cordones continuos estructurales',
        operario_asignado: 'Juan Pérez T.',
        horas_estimadas: 24.0,
        horas_reales: 0.0,
        estado: 'Pendiente',
        fecha_inicio: null,
        fecha_fin: null
      },
      {
        id: etapaId++,
        orden_produccion_id: newId,
        numero_fase: 4,
        nombre_etapa: 'Tratamiento, Pintura y Acabado',
        descripcion: 'Desengrase, base anticorrosiva y esmalte de terminación',
        operario_asignado: 'Raúl Gómez',
        horas_estimadas: 16.0,
        horas_reales: 0.0,
        estado: 'Pendiente',
        fecha_inicio: null,
        fecha_fin: null
      },
      {
        id: etapaId++,
        orden_produccion_id: newId,
        numero_fase: 5,
        nombre_etapa: 'Control de Calidad y Despacho',
        descripcion: 'Verificación dimensional, pruebas de soldadura y embalaje',
        operario_asignado: 'Carlos Mendoza',
        horas_estimadas: 6.0,
        horas_reales: 0.0,
        estado: 'Pendiente',
        fecha_inicio: null,
        fecha_fin: null
      }
    ];

    db.ordenes_produccion.push(nuevaOp);
    db.etapas_produccion.push(...etapasEstandar);

    const pedidoIdx = db.pedidos.findIndex(p => p.id === parseInt(pedido_id));
    if (pedidoIdx !== -1) {
      db.pedidos[pedidoIdx].estado = 'En Planificación';
    }

    saveStore();

    res.status(201).json({
      ...nuevaOp,
      etapas: etapasEstandar
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear OP: ' + err.message });
  }
}

export function updateEtapa(req, res) {
  try {
    const etapaId = parseInt(req.params.etapaId);
    const { estado, horas_reales, operario_asignado } = req.body;
    const db = getDb();

    const idx = db.etapas_produccion.findIndex(e => e.id === etapaId);
    if (idx === -1) return res.status(404).json({ error: 'Etapa no encontrada' });

    const nowIso = new Date().toISOString();
    if (estado) db.etapas_produccion[idx].estado = estado;
    if (horas_reales !== undefined) db.etapas_produccion[idx].horas_reales = parseFloat(horas_reales);
    if (operario_asignado) db.etapas_produccion[idx].operario_asignado = operario_asignado;

    if (estado === 'En Proceso' && !db.etapas_produccion[idx].fecha_inicio) {
      db.etapas_produccion[idx].fecha_inicio = nowIso;
    }
    if (estado === 'Finalizada') {
      db.etapas_produccion[idx].fecha_fin = nowIso;
    }

    const opId = db.etapas_produccion[idx].orden_produccion_id;
    const etapasOp = db.etapas_produccion.filter(e => e.orden_produccion_id === opId);
    const finalizadas = etapasOp.filter(e => e.estado === 'Finalizada').length;
    const enProceso = etapasOp.filter(e => e.estado === 'En Proceso').length;

    const opIdx = db.ordenes_produccion.findIndex(o => o.id === opId);
    if (opIdx !== -1) {
      const avanceTotal = Math.min(100, Math.round(((finalizadas + enProceso * 0.5) / etapasOp.length) * 100));
      db.ordenes_produccion[opIdx].porcentaje_avance = avanceTotal;

      if (avanceTotal > 0 && !db.ordenes_produccion[opIdx].fecha_inicio_real) {
        db.ordenes_produccion[opIdx].fecha_inicio_real = nowIso;
        db.ordenes_produccion[opIdx].estado = 'En Proceso';

        const pedIdx = db.pedidos.findIndex(p => p.id === db.ordenes_produccion[opIdx].pedido_id);
        if (pedIdx !== -1) db.pedidos[pedIdx].estado = 'En Producción';
      }

      if (avanceTotal === 100) {
        db.ordenes_produccion[opIdx].fecha_fin_real = nowIso;
        db.ordenes_produccion[opIdx].estado = 'Completada';

        const pedIdx = db.pedidos.findIndex(p => p.id === db.ordenes_produccion[opIdx].pedido_id);
        if (pedIdx !== -1) db.pedidos[pedIdx].estado = 'Listo para Entrega';
      }
    }

    saveStore();

    res.json({
      etapa: db.etapas_produccion[idx],
      op: opIdx !== -1 ? db.ordenes_produccion[opIdx] : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar etapa: ' + err.message });
  }
}

export function addParadaProduccion(req, res) {
  try {
    const { orden_produccion_id, etapa_id, motivo, minutos_parada, descripcion } = req.body;
    const db = getDb();

    const newId = db.paradas_produccion.length > 0 ? Math.max(...db.paradas_produccion.map(p => p.id)) + 1 : 1;
    const nuevaParada = {
      id: newId,
      orden_produccion_id: parseInt(orden_produccion_id),
      etapa_id: etapa_id ? parseInt(etapa_id) : null,
      motivo: motivo || 'Falla no clasificada',
      minutos_parada: parseInt(minutos_parada) || 0,
      descripcion: descripcion || '',
      fecha: new Date().toISOString()
    };

    db.paradas_produccion.push(nuevaParada);
    saveStore();

    res.status(201).json(nuevaParada);
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar parada: ' + err.message });
  }
}

export function addControlCalidad(req, res) {
  try {
    const { orden_produccion_id, resultado, defectos_encontrados, acciones_correctivas, merma_porcentaje } = req.body;
    const db = getDb();

    const newId = db.control_calidad.length > 0 ? Math.max(...db.control_calidad.map(c => c.id)) + 1 : 1;
    const nuevoControl = {
      id: newId,
      orden_produccion_id: parseInt(orden_produccion_id),
      inspector_id: req.user?.id || 2,
      resultado: resultado || 'Aprobado',
      defectos_encontrados: defectos_encontrados || 'Conforme a especificaciones',
      acciones_correctivas: acciones_correctivas || 'Ninguna',
      merma_porcentaje: parseFloat(merma_porcentaje) || 0.0,
      fecha_inspeccion: new Date().toISOString()
    };

    db.control_calidad.push(nuevoControl);
    saveStore();

    res.status(201).json(nuevoControl);
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar calidad: ' + err.message });
  }
}

export function updateOrdenEstado(req, res) {
  try {
    const id = parseInt(req.params.id);
    const { estado, costo_real, observaciones } = req.body;
    const db = getDb();

    const idx = db.ordenes_produccion.findIndex(o => o.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Orden de producción no encontrada' });

    const nowIso = new Date().toISOString();
    if (estado) {
      db.ordenes_produccion[idx].estado = estado;
      if (estado === 'En Proceso' && !db.ordenes_produccion[idx].fecha_inicio_real) {
        db.ordenes_produccion[idx].fecha_inicio_real = nowIso;
      }
      if (estado === 'Completada') {
        db.ordenes_produccion[idx].porcentaje_avance = 100;
        db.ordenes_produccion[idx].fecha_fin_real = nowIso;
        const pedIdx = db.pedidos.findIndex(p => p.id === db.ordenes_produccion[idx].pedido_id);
        if (pedIdx !== -1 && db.pedidos[pedIdx].estado !== 'Entregado') {
          db.pedidos[pedIdx].estado = 'Listo para Entrega';
        }
      }
    }
    if (costo_real !== undefined) {
      db.ordenes_produccion[idx].costo_real = parseFloat(costo_real) || 0;
    }
    if (observaciones !== undefined) {
      db.ordenes_produccion[idx].observaciones = observaciones;
    }

    saveStore();
    res.json(db.ordenes_produccion[idx]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar estado de OP: ' + err.message });
  }
}
