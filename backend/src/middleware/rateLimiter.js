// Middleware de Rate Limiting ligero y seguro para autenticación (prevención de ataques de fuerza bruta)
const loginAttempts = new Map();

// Limpieza periódica de registros antiguos cada 15 minutos para evitar fugas de memoria
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of loginAttempts.entries()) {
    if (now > record.resetTime) {
      loginAttempts.delete(ip);
    }
  }
}, 15 * 60 * 1000).unref();

export function loginRateLimiter(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutos
  const maxAttempts = 15; // Máximo 15 intentos fallidos

  const record = loginAttempts.get(ip) || { count: 0, resetTime: now + windowMs };

  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }

  if (record.count >= maxAttempts) {
    return res.status(429).json({
      error: 'Demasiados intentos fallidos de inicio de sesión desde esta dirección. Por seguridad, intente en 15 minutos.'
    });
  }

  // Interceptar respuesta para contar sólo fallos (401 / 400) y reiniciar en éxito (200)
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode === 401) {
      record.count++;
      loginAttempts.set(ip, record);
    } else if (res.statusCode >= 200 && res.statusCode < 300) {
      loginAttempts.delete(ip);
    }
    return originalJson(body);
  };

  next();
}
