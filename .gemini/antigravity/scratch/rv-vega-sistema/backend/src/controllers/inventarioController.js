import { getDb, saveStore } from '../config/db.js';

export function getMateriales(req, res) {
  try {
    const db = getDb();
    const { categoria, alerta_stock, busqueda } = req.query;

    let list = db.materiales.map(m => {
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
