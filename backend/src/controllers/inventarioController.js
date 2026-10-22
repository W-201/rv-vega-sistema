import { getDb, saveStore } from '../config/db.js';

export function getMateriales(req, res) {
  try {
    const db = getDb();
    const { categoria, alerta_stock, busqueda, incluir_inactivos } = req.query;

    let list = (db.materiales || [])
      .filter(m => incluir_inactivos === 'true' || m.activo !== false)
      .map(m => {
        const enAlerta = Number(m.stock_actual) <= Number(m.stock_minimo);
        const valorTotal = Math.round(Number(m.stock_actual) * Number(m.costo_unitario) * 100) / 100;
        return {
          ...m,
          en_alerta: enAlerta,
          valor_total: valorTotal
        };
      });

    if (categoria && categoria !== 'Todas') {
      list = list.filter(m => m.categoria === categoria);
    }
    if (alerta_stock === 'true') {
      list = list.filter(m => m.en_alerta);
    }
    if (busqueda) {
      const q = busqueda.toLowerCase();
      list = list.filter(m =>
        m.nombre.toLowerCase().includes(q) ||
        m.codigo_sku.toLowerCase().includes(q) ||
        m.categoria.toLowerCase().includes(q)
      );
    }

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener inventario: ' + err.message });
  }
}

export function getKardex(req, res) {
  try {
    const db = getDb();
    const { material_id } = req.query;

    let list = db.movimientos_inventario.map(k => {
      const mat = db.materiales.find(m => m.id === k.material_id);
      const user = db.usuarios.find(u => u.id === k.registrado_por);
      return {
        ...k,
        material_nombre: mat ? mat.nombre : 'Desconocido',
        material_sku: mat ? mat.codigo_sku : '',
        unidad_medida: mat ? mat.unidad_medida : '',
        usuario_nombre: user ? user.nombre : 'Sistema'
      };
    });

    if (material_id) {
      list = list.filter(k => k.material_id === parseInt(material_id));
    }

    list.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar Kardex: ' + err.message });
  }
}

export function createMaterial(req, res) {
  try {
    const { codigo_sku, nombre, categoria, unidad_medida, stock_actual, stock_minimo, costo_unitario, ubicacion_almacen } = req.body;

    if (!codigo_sku || !nombre || !unidad_medida) {
      return res.status(400).json({ error: 'Código SKU, nombre y unidad de medida son requeridos' });
    }

    const db = getDb();
    const existe = db.materiales.find(m => m.codigo_sku === codigo_sku);
    if (existe) return res.status(400).json({ error: 'El código SKU ya existe' });

    const newId = db.materiales.length > 0 ? Math.max(...db.materiales.map(m => m.id)) + 1 : 1;
    const nuevo = {
      id: newId,
      codigo_sku,
      nombre,
      categoria: categoria || 'Metales/Perfiles',
      unidad_medida,
      stock_actual: parseFloat(stock_actual) || 0,
      stock_minimo: parseFloat(stock_minimo) || 5,
      costo_unitario: parseFloat(costo_unitario) || 0,
      ubicacion_almacen: ubicacion_almacen || 'Almacén Central',
      activo: true,
      creado_en: new Date().toISOString()
    };

    db.materiales.push(nuevo);
    saveStore();

    res.status(201).json(nuevo);
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar material: ' + err.message });
  }
}

export function updateMaterial(req, res) {
  try {
    const { id } = req.params;
    const { codigo_sku, nombre, categoria, unidad_medida, stock_actual, stock_minimo, costo_unitario, ubicacion_almacen } = req.body;

    const db = getDb();
    const matIdx = db.materiales.findIndex(m => m.id === parseInt(id));
    if (matIdx === -1) {
      return res.status(404).json({ error: 'Material no encontrado' });
    }

    // Si se modifica el SKU, verificar que no colisione con otro
    if (codigo_sku && codigo_sku.trim() !== db.materiales[matIdx].codigo_sku) {
      const existeSku = db.materiales.some(m => m.id !== parseInt(id) && m.codigo_sku.toLowerCase() === codigo_sku.trim().toLowerCase());
      if (existeSku) {
        return res.status(400).json({ error: 'El código SKU ingresado ya pertenece a otro material' });
      }
      db.materiales[matIdx].codigo_sku = codigo_sku.trim();
    }

    if (nombre) db.materiales[matIdx].nombre = nombre.trim();
    if (categoria) db.materiales[matIdx].categoria = categoria.trim();
    if (unidad_medida) db.materiales[matIdx].unidad_medida = unidad_medida.trim();
    if (ubicacion_almacen !== undefined) db.materiales[matIdx].ubicacion_almacen = ubicacion_almacen.trim();

    if (stock_minimo !== undefined && !isNaN(parseFloat(stock_minimo))) {
      db.materiales[matIdx].stock_minimo = parseFloat(stock_minimo);
    }
    if (costo_unitario !== undefined && !isNaN(parseFloat(costo_unitario))) {
      db.materiales[matIdx].costo_unitario = parseFloat(costo_unitario);
    }
    // Permitir ajustar stock_actual si se corrige digitación inicial
    if (stock_actual !== undefined && !isNaN(parseFloat(stock_actual))) {
      db.materiales[matIdx].stock_actual = parseFloat(stock_actual);
    }

    db.materiales[matIdx].actualizado_en = new Date().toISOString();
    saveStore();

    const matActualizado = db.materiales[matIdx];
    res.json({
      mensaje: 'Material actualizado exitosamente',
      material: {
        ...matActualizado,
        en_alerta: Number(matActualizado.stock_actual) <= Number(matActualizado.stock_minimo),
        valor_total: Math.round(Number(matActualizado.stock_actual) * Number(matActualizado.costo_unitario) * 100) / 100
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar material: ' + err.message });
  }
}

export function deleteMaterial(req, res) {
  try {
    const { id } = req.params;
    const matId = parseInt(id);
    const db = getDb();

    const matIdx = db.materiales.findIndex(m => m.id === matId);
    if (matIdx === -1) {
      return res.status(404).json({ error: 'Material no encontrado' });
    }

    // Verificar si tiene movimientos en Kardex o referencias en órdenes / compras
    const kardexCount = (db.movimientos_inventario || []).filter(k => k.material_id === matId).length;
    const consumoCount = (db.consumo_materiales || []).filter(c => c.material_id === matId).length;
    const reqComprasCount = (db.requerimientos_compras || []).filter(r => r.material_id === matId).length;

    const tieneRegistrosHistoricos = kardexCount > 0 || consumoCount > 0 || reqComprasCount > 0;

    if (tieneRegistrosHistoricos) {
      // Inactivación lógica segura para proteger la trazabilidad contable
      db.materiales[matIdx].activo = false;
      db.materiales[matIdx].desactivado_en = new Date().toISOString();
      saveStore();
      return res.json({
        mensaje: `El material tiene historial registrado (${kardexCount} mov. Kardex). Ha sido retirado del inventario activo preservando la trazabilidad.`,
        tipo: 'inactivado',
        id: matId
      });
    } else {
      // Eliminación física directa (material nuevo sin movimientos por error de digitación)
      db.materiales.splice(matIdx, 1);
      saveStore();
      return res.json({
        mensaje: 'Material eliminado definitivamente del catálogo.',
        tipo: 'eliminado',
        id: matId
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar material: ' + err.message });
  }
}

export function registrarMovimiento(req, res) {
  try {
    const { material_id, tipo_movimiento, cantidad, motivo, referencia_documento } = req.body;
    const db = getDb();

    const matIdx = db.materiales.findIndex(m => m.id === parseInt(material_id));
    if (matIdx === -1) return res.status(404).json({ error: 'Material no encontrado' });

    const cantNum = parseFloat(cantidad);
    if (!cantNum || cantNum <= 0) {
      return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
    }

    const material = db.materiales[matIdx];
    let nuevoStock = Number(material.stock_actual);

    if (tipo_movimiento === 'ENTRADA' || tipo_movimiento === 'AJUSTE_POSITIVO') {
      nuevoStock += cantNum;
    } else if (tipo_movimiento === 'SALIDA_PRODUCCION' || tipo_movimiento === 'AJUSTE_NEGATIVO') {
      if (nuevoStock < cantNum) {
        return res.status(400).json({ 
          error: `Stock insuficiente. Disponible: ${nuevoStock} ${material.unidad_medida}, Solicitado: ${cantNum}` 
        });
      }
      nuevoStock -= cantNum;
    } else {
      return res.status(400).json({ error: 'Tipo de movimiento inválido' });
    }

    db.materiales[matIdx].stock_actual = Math.round(nuevoStock * 100) / 100;

    const newKardexId = db.movimientos_inventario.length > 0 ? Math.max(...db.movimientos_inventario.map(k => k.id)) + 1 : 1;
    const movimiento = {
      id: newKardexId,
      material_id: parseInt(material_id),
      tipo_movimiento,
      cantidad: cantNum,
      costo_unitario: material.costo_unitario,
      referencia_documento: referencia_documento || 'Operación Manual',
      motivo: motivo || 'Movimiento de almacén',
      registrado_por: req.user?.id || 1,
      fecha: new Date().toISOString()
    };

    db.movimientos_inventario.push(movimiento);
    saveStore();

    res.status(201).json({
      movimiento,
      stock_actualizado: db.materiales[matIdx].stock_actual,
      en_alerta: db.materiales[matIdx].stock_actual <= db.materiales[matIdx].stock_minimo
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar movimiento: ' + err.message });
  }
}
