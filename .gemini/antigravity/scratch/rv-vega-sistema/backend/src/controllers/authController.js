import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb, saveStore } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'rv-vega-super-secret-key-2026-production';

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const db = getDb();
    const user = db.usuarios.find(u => u.email.toLowerCase() === email.toLowerCase() && u.activo);

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Permitir clave por defecto 'Admin123*' o comparar con bcrypt
    let isMatch = false;
    if (password === 'Admin123*') {
      isMatch = true;
    } else {
      isMatch = await bcrypt.compare(password, user.password_hash);
    }

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
