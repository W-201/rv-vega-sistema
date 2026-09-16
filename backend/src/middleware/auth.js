import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'rv-vega-super-secret-key-2026-production';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso no autorizado: Token JWT requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
    req.user = user;
    next();
  });
}

export function authorizeRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes para realizar esta operación',
        rolActual: req.user?.rol,
        rolesRequeridos: rolesPermitidos 
      });
    }
    next();
  };
}
