import { getDb, saveStore } from '../config/db.js';

export function getPedidos(req, res) {
  try {
    const db = getDb();
    const { estado, prioridad, cliente_id } = req.query;

    let list = db.pedidos.map(p => {
      const cliente = db.clientes.find(c => c.id === p.cliente_id);
      const detalles = db.pedido_detalles.filter(d => d.pedido_id === p.id);
      const op = db.ordenes_produccion.find(o => o.pedido_id === p.id);
      return {
        ...p,
        cliente_nombre: cliente ? cliente.razon_social : 'Desconocido',
        cliente_doc: cliente ? cliente.numero_documento : '',
        detalles_count: detalles.length,
        detalles,
        orden_produccion_id: op ? op.id : null,
        codigo_op: op ? op.codigo_op : null,
        op_avance: op ? op.porcentaje_avance : null,
        op_estado: op ? op.estado : null
      };
    });

    if (estado && estado !== 'Todos') {
      list = list.filter(p => p.estado === estado);
    }
    if (prioridad && prioridad !== 'Todos') {
      list = list.filter(p => p.prioridad === prioridad);
    }
    if (cliente_id) {
      list = list.filter(p => p.cliente_id === parseInt(cliente_id));
    }

    // Orden descendente por id
    list.sort((a, b) => b.id - a.id);

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener pedidos: ' + err.message });
  }
}

export function getPedidoById(req, res) {
  try {
    const id = parseInt(req.params.id);
    const db = getDb();
    const pedido = db.pedidos.find(p => p.id === id);
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

    const cliente = db.clientes.find(c => c.id === pedido.cliente_id);
    const detalles = db.pedido_detalles.filter(d => d.pedido_id === id);
    const op = db.ordenes_produccion.find(o => o.pedido_id === id);

    let etapas = [];
    if (op) {
      etapas = db.etapas_produccion.filter(e => e.orden_produccion_id === op.id);
    }

    res.json({
      ...pedido,
      cliente,
      detalles,
      orden_produccion: op ? { ...op, etapas } : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener detalle del pedido: ' + err.message });
  }
}

export function createPedido(req, res) {
  try {
    const { cliente_id, fecha_entrega_prometida, prioridad, observaciones, items } = req.body;

    if (!cliente_id || !fecha_entrega_prometida || !items || !items.length) {
      return res.status(400).json({ error: 'Cliente, fecha prometida y al menos 1 ítem son requeridos' });
    }

    const db = getDb();
    const cliente = db.clientes.find(c => c.id === parseInt(cliente_id));
    if (!cliente) return res.status(404).json({ error: 'Cliente no existe' });

    const newId = db.pedidos.length > 0 ? Math.max(...db.pedidos.map(p => p.id)) + 1 : 1;
    const year = new Date().getFullYear();
    const codigo_pedido = `PED-${year}-${String(newId).padStart(4, '0')}`;

    // Calcular montos
    let subtotal = 0;
    const detallesCreados = [];
    let detalleId = db.pedido_detalles.length > 0 ? Math.max(...db.pedido_detalles.map(d => d.id)) + 1 : 1;

    for (const item of items) {
      const cant = parseInt(item.cantidad) || 1;
      const precio = parseFloat(item.precio_unitario) || 0;
      const totalLinea = cant * precio;
      subtotal += totalLinea;

      detallesCreados.push({
        id: detalleId++,
        pedido_id: newId,
        descripcion_producto: item.descripcion_producto,
        especificaciones: item.especificaciones || '',
        cantidad: cant,
        precio_unitario: precio,
        total_linea: totalLinea
      });
    }

    const igv = Math.round(subtotal * 0.18 * 100) / 100;
    const total = Math.round((subtotal + igv) * 100) / 100;

    const nuevoPedido = {
      id: newId,
      codigo_pedido,
      cliente_id: parseInt(cliente_id),
      fecha_pedido: new Date().toISOString().split('T')[0],
      fecha_entrega_prometida,
      fecha_entrega_real: null,
      estado: 'Pendiente',
      prioridad: prioridad || 'Media',
      subtotal,
      igv,
      total,
      observaciones: observaciones || '',
      creado_por: req.user?.id || 1,
      creado_en: new Date().toISOString()
    };

    db.pedidos.push(nuevoPedido);
    db.pedido_detalles.push(...detallesCreados);
    saveStore();

    res.status(201).json({
      ...nuevoPedido,
      cliente_nombre: cliente.razon_social,
      detalles: detallesCreados
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear pedido: ' + err.message });
  }
}

export function updatePedidoEstado(req, res) {
  try {
    const id = parseInt(req.params.id);
    const { estado, fecha_entrega_real } = req.body;
    const db = getDb();
    const idx = db.pedidos.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Pedido no encontrado' });

    db.pedidos[idx].estado = estado;
    if (fecha_entrega_real) {
      db.pedidos[idx].fecha_entrega_real = fecha_entrega_real;
    } else if (estado === 'Entregado' && !db.pedidos[idx].fecha_entrega_real) {
      db.pedidos[idx].fecha_entrega_real = new Date().toISOString().split('T')[0];
    }

    saveStore();
    res.json(db.pedidos[idx]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar estado: ' + err.message });
  }
}
