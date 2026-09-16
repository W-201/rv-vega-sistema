import { getDb, saveStore } from '../config/db.js';

export function getClientes(req, res) {
  try {
    const db = getDb();
    const { busqueda } = req.query;
    let list = db.clientes.filter(c => c.activo !== false);

    if (busqueda) {
      const q = busqueda.toLowerCase();
      list = list.filter(c =>
        c.razon_social.toLowerCase().includes(q) ||
        c.numero_documento.includes(q) ||
        (c.contacto && c.contacto.toLowerCase().includes(q))
      );
    }

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener clientes: ' + err.message });
  }
}

export function getClienteById(req, res) {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    const cliente = db.clientes.find(c => c.id === id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    // Incluir pedidos del cliente
    const pedidos = db.pedidos.filter(p => p.cliente_id === id);
    res.json({ ...cliente, pedidos });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener cliente: ' + err.message });
  }
}

export function createCliente(req, res) {
  try {
    const { tipo_documento, numero_documento, razon_social, contacto, telefono, email, direccion, ciudad } = req.body;

    if (!numero_documento || !razon_social) {
      return res.status(400).json({ error: 'Número de documento y Razón Social son requeridos' });
    }

    const db = getDb();
    const existe = db.clientes.find(c => c.numero_documento === numero_documento);
    if (existe) {
      return res.status(400).json({ error: 'Ya existe un cliente con ese número de documento' });
    }

    const newId = db.clientes.length > 0 ? Math.max(...db.clientes.map(c => c.id)) + 1 : 1;
    const nuevoCliente = {
      id: newId,
      tipo_documento: tipo_documento || 'RUC',
      numero_documento,
      razon_social,
      contacto: contacto || '',
      telefono: telefono || '',
      email: email || '',
      direccion: direccion || '',
      ciudad: ciudad || 'Lima',
      activo: true,
      creado_en: new Date().toISOString()
    };

    db.clientes.push(nuevoCliente);
    saveStore();

    res.status(201).json(nuevoCliente);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear cliente: ' + err.message });
  }
}

export function updateCliente(req, res) {
  try {
    const id = parseInt(req.params.id);
    const db = getDb();
    const idx = db.clientes.findIndex(c => c.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Cliente no encontrado' });

    const updated = {
      ...db.clientes[idx],
      ...req.body,
      id
    };

    db.clientes[idx] = updated;
    saveStore();

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar cliente: ' + err.message });
  }
}

export function deleteCliente(req, res) {
  try {
    const id = parseInt(req.params.id);
    const db = getDb();
    const idx = db.clientes.findIndex(c => c.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Cliente no encontrado' });

    db.clientes[idx].activo = false;
    saveStore();

    res.json({ mensaje: 'Cliente deshabilitado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar cliente: ' + err.message });
  }
}
