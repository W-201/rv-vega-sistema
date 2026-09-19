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

    if (
      !tipo_documento?.toString().trim() ||
      !numero_documento?.toString().trim() ||
      !razon_social?.toString().trim() ||
      !contacto?.toString().trim() ||
      !telefono?.toString().trim() ||
      !email?.toString().trim() ||
      !direccion?.toString().trim() ||
      !ciudad?.toString().trim()
    ) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios. Por favor, complete la información.' });
    }

    const docTrimmed = numero_documento.toString().trim();
    if (tipo_documento === 'RUC' && !/^\d{11}$/.test(docTrimmed)) {
      return res.status(400).json({ error: 'El RUC debe tener exactamente 11 dígitos numéricos' });
    }

    if (tipo_documento === 'DNI' && !/^\d{8}$/.test(docTrimmed)) {
      return res.status(400).json({ error: 'El DNI debe tener exactamente 8 dígitos numéricos' });
    }

    const telTrimmed = telefono.toString().trim();
    if (!/^9\d{8}$/.test(telTrimmed)) {
      return res.status(400).json({ error: 'El teléfono móvil debe tener exactamente 9 dígitos y comenzar obligatoriamente con el número 9' });
    }

    const db = getDb();
    const existe = db.clientes.find(c => c.numero_documento === docTrimmed);
    if (existe) {
      return res.status(400).json({ error: 'Ya existe un cliente con ese número de documento' });
    }

    const newId = db.clientes.length > 0 ? Math.max(...db.clientes.map(c => c.id)) + 1 : 1;
    const nuevoCliente = {
      id: newId,
      tipo_documento: tipo_documento || 'RUC',
      numero_documento: docTrimmed,
      razon_social: razon_social.trim(),
      contacto: contacto.trim(),
      telefono: telTrimmed,
      email: email.trim(),
      direccion: direccion.trim(),
      ciudad: ciudad.trim(),
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

    const { tipo_documento, numero_documento, razon_social, contacto, telefono, email, direccion, ciudad } = req.body;

    if (
      !tipo_documento?.toString().trim() ||
      !numero_documento?.toString().trim() ||
      !razon_social?.toString().trim() ||
      !contacto?.toString().trim() ||
      !telefono?.toString().trim() ||
      !email?.toString().trim() ||
      !direccion?.toString().trim() ||
      !ciudad?.toString().trim()
    ) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios. Por favor, complete la información.' });
    }

    const docTrimmed = numero_documento.toString().trim();
    if (tipo_documento === 'RUC' && !/^\d{11}$/.test(docTrimmed)) {
      return res.status(400).json({ error: 'El RUC debe tener exactamente 11 dígitos numéricos' });
    }

    if (tipo_documento === 'DNI' && !/^\d{8}$/.test(docTrimmed)) {
      return res.status(400).json({ error: 'El DNI debe tener exactamente 8 dígitos numéricos' });
    }

    const telTrimmed = telefono.toString().trim();
    if (!/^9\d{8}$/.test(telTrimmed)) {
      return res.status(400).json({ error: 'El teléfono móvil debe tener exactamente 9 dígitos y comenzar obligatoriamente con el número 9' });
    }

    // Comprobar que no exista otro cliente con el mismo número de documento
    const yaExiste = db.clientes.find(c => c.id !== id && c.numero_documento === docTrimmed);
    if (yaExiste) {
      return res.status(400).json({ error: 'Ya existe otro cliente con ese número de documento' });
    }

    const updated = {
      ...db.clientes[idx],
      tipo_documento,
      numero_documento: docTrimmed,
      razon_social: razon_social.trim(),
      contacto: contacto.trim(),
      telefono: telTrimmed,
      email: email.trim(),
      direccion: direccion.trim(),
      ciudad: ciudad.trim(),
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
