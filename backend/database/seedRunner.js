import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeed() {
  console.log('🌱 Inicializando datos semilla de RV Vega...');

  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const seedPath = path.resolve(__dirname, 'seed.sql');
  const localStorePath = path.resolve(__dirname, 'local_store.json');

  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    console.log('📡 Detectada conexión a PostgreSQL. Aplicando schema.sql y seed.sql...');
    const client = new Client({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' || connectionString.includes('render.com') || connectionString.includes('aivencloud.com')
        ? { rejectUnauthorized: false }
        : false,
    });

    try {
      await client.connect();
      console.log('🔌 Conectado a PostgreSQL exitosamente.');

      if (fs.existsSync(schemaPath)) {
        console.log('📄 Ejecutando schema.sql...');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await client.query(schemaSql);
        console.log('✅ Tablas creadas correctamente.');
      }

      if (fs.existsSync(seedPath)) {
        console.log('📄 Ejecutando seed.sql...');
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        await client.query(seedSql);
        console.log('✅ Datos semilla insertados en PostgreSQL.');
      }
    } catch (err) {
      console.error('❌ Error al ejecutar seed en PostgreSQL:', err.message);
    } finally {
      await client.end();
    }
  } else {
    console.log('ℹ️ DATABASE_URL no configurada. Verificando almacenamiento local persistente (local_store.json)...');
  }

  // Verificar o restaurar almacén local persistente
  if (!fs.existsSync(localStorePath)) {
    console.log('📝 Creando archivo local_store.json inicial...');
    const { getDb } = await import('../src/config/db.js');
    getDb();
    console.log('✅ Almacén local inicializado exitosamente.');
  } else {
    console.log('✅ Almacén local existente verificado.');
  }

  console.log('🎉 Inicialización completada exitosamente.');
}

runSeed().catch(err => {
  console.error('Error fatal al ejecutar seedRunner:', err);
  process.exit(1);
});
