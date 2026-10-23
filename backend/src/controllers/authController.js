import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'rv-vega-super-secret-key-2026-production';
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('⚠️ ADVERTENCIA DE SEGURIDAD: JWT_SECRET no está definido en las variables de entorno de producción.');
}

export async function login(req, res) {
  try {
    const { email, username, password } = req.body;
    const identifier = (email || username || '').trim();
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const db = getDb();
    const cleanId = identifier.toLowerCase();
    const user = db.usuarios.find(u => 
      (u.email.toLowerCase() === cleanId || 
       u.email.toLowerCase().split('@')[0] === cleanId ||
       (u.nombre && u.nombre.toLowerCase() === cleanId)) && 
      u.activo
    );

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificación segura con hash bcrypt (sin contraseñas maestras o puertas traseras)
    const isMatch = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;

    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const payload = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      mensaje: 'Autenticación exitosa',
      token,
      usuario: payload
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno de autenticación' });
  }
}

export function getProfile(req, res) {
  res.json({ usuario: req.user });
}

export function listUsers(req, res) {
  const db = getDb();
  const users = db.usuarios.map(u => ({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    activo: u.activo
  }));
  res.json(users);
}
