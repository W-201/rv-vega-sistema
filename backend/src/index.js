import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/authRoutes.js';
import clientesRoutes from './routes/clientesRoutes.js';
import pedidosRoutes from './routes/pedidosRoutes.js';
import produccionRoutes from './routes/produccionRoutes.js';
import inventarioRoutes from './routes/inventarioRoutes.js';
import reportesRoutes from './routes/reportesRoutes.js';
import biRoutes from './routes/biRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/produccion', produccionRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/bi', biRoutes);
app.use('/api/ai', aiRoutes);

// Endpoint de Diagnóstico y Salud
app.get('/api/health', (req, res) => {
  res.json({
    empresa: 'RV Vega Servicios Generales E.I.R.L.',
    sistema: 'Sistema de Información para la Gestión de Producción y Pedidos',
    estado: 'Operativo',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    entorno: process.env.NODE_ENV || 'development'
  });
});

// Manejador global de errores
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno en el servidor de RV Vega'
  });
});

const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isMainModule && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log('==========================================================');
    console.log('🏢 RV Vega Servicios Generales E.I.R.L.');
    console.log('🚀 Servidor Backend iniciado exitosamente');
    console.log(`🌐 Puerto: ${PORT} | Modo: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 URL Base: http://localhost:${PORT}/api`);
    console.log('==========================================================');
  });
}

export default app;
