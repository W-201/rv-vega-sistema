import http from 'http';
import app from './src/index.js';

// Configuración de la prueba de rendimiento
const PORT = 5088;
const CONCURRENCY = 15;
const TOTAL_REQUESTS_PER_ENDPOINT = 150;
const BASE_URL = `http://localhost:${PORT}/api`;

// SLA / Umbrales de Aceptación para Reportes Gerenciales
const SLA_MAX_AVG_LATENCY_MS = 100;
const SLA_MAX_P95_LATENCY_MS = 200;
const SLA_MAX_ERROR_RATE_PCT = 0;

function calculatePercentile(sortedArray, percentile) {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
}

async function runBenchmarkForEndpoint(endpointPath, token) {
  const url = `${BASE_URL}${endpointPath}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Warmup (5 peticiones previas)
  for (let i = 0; i < 5; i++) {
    await fetch(url, { headers });
  }

  const latencies = [];
  let successfulRequests = 0;
  let failedRequests = 0;

  const startTimeGlobal = performance.now();

  let completed = 0;
  const executeWorker = async () => {
    while (completed < TOTAL_REQUESTS_PER_ENDPOINT) {
      completed++;
      const reqStart = performance.now();
      try {
        const res = await fetch(url, { headers });
        const reqEnd = performance.now();
        const latency = reqEnd - reqStart;
        if (res.status === 200) {
          successfulRequests++;
          latencies.push(latency);
        } else {
          failedRequests++;
        }
      } catch (err) {
        failedRequests++;
      }
    }
  };

  // Ejecución concurrente
  const workers = [];
  for (let w = 0; w < CONCURRENCY; w++) {
    workers.push(executeWorker());
  }
  await Promise.all(workers);

  const totalDurationMs = performance.now() - startTimeGlobal;
  const totalDurationSec = totalDurationMs / 1000;
  const rps = TOTAL_REQUESTS_PER_ENDPOINT / totalDurationSec;

  latencies.sort((a, b) => a - b);

  const min = latencies[0] || 0;
  const max = latencies[latencies.length - 1] || 0;
  const sum = latencies.reduce((acc, val) => acc + val, 0);
  const avg = latencies.length > 0 ? sum / latencies.length : 0;
  const p50 = calculatePercentile(latencies, 50);
  const p90 = calculatePercentile(latencies, 90);
  const p95 = calculatePercentile(latencies, 95);
  const p99 = calculatePercentile(latencies, 99);
  const errorRate = (failedRequests / TOTAL_REQUESTS_PER_ENDPOINT) * 100;

  const cumpleSLA = avg <= SLA_MAX_AVG_LATENCY_MS && p95 <= SLA_MAX_P95_LATENCY_MS && errorRate <= SLA_MAX_ERROR_RATE_PCT;

  return {
    endpoint: endpointPath,
    total: TOTAL_REQUESTS_PER_ENDPOINT,
    concurrency: CONCURRENCY,
    success: successfulRequests,
    failed: failedRequests,
    rps: Math.round(rps * 10) / 10,
    min: Math.round(min * 100) / 100,
    avg: Math.round(avg * 100) / 100,
    p50: Math.round(p50 * 100) / 100,
    p90: Math.round(p90 * 100) / 100,
    p95: Math.round(p95 * 100) / 100,
    p99: Math.round(p99 * 100) / 100,
    max: Math.round(max * 100) / 100,
    errorRate,
    cumpleSLA
  };
}

async function main() {
  process.env.NODE_ENV = 'test';
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(PORT, resolve));

  console.log('\n================================================================================');
  console.log('⚡ PRUEBAS DE RENDIMIENTO DE REPORTES (REQUERIMIENTO 3.6.1)');
  console.log('🏢 Empresa: RV Vega Servicios Generales E.I.R.L.');
  console.log(`🌐 Servidor de Benchmark activo en: http://localhost:${PORT}`);
  console.log(`📊 Parámetros: ${TOTAL_REQUESTS_PER_ENDPOINT} peticiones por endpoint | Concurrencia: ${CONCURRENCY} hilos`);
  console.log(`🎯 SLA Objetivo: Latencia promedio <= ${SLA_MAX_AVG_LATENCY_MS}ms | p95 <= ${SLA_MAX_P95_LATENCY_MS}ms | Tasa de error = 0%`);
  console.log('================================================================================\n');

  try {
    // 1. Obtención de token de sesión administrativa
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@rvvega.com', password: 'Admin123*' })
    });
    const loginData = await loginRes.json();
    if (!loginData.token) {
      throw new Error('No se pudo autenticar para la prueba de carga: ' + JSON.stringify(loginData));
    }
    const token = loginData.token;
    console.log('🔑 Sesión autenticada correctamente (JWT emitido para usuario Administrador).\n');

    const endpoints = [
      '/reportes/otif',
      '/reportes/costos',
      '/reportes/operarios',
      '/bi/dashboard'
    ];

    const results = [];

    for (const ep of endpoints) {
      process.stdout.write(`⏳ Ejecutando benchmark sobre [GET ${ep}]... `);
      const res = await runBenchmarkForEndpoint(ep, token);
      results.push(res);
      console.log(`✅ Completado (${res.rps} req/s, prom: ${res.avg}ms, p95: ${res.p95}ms)`);
    }

    console.log('\n================================================================================');
    console.log('📋 MATRIZ DE RESULTADOS DE RENDIMIENTO Y LATENCIA');
    console.log('================================================================================');

    console.table(results.map(r => ({
      'Endpoint': r.endpoint,
      'Peticiones': r.total,
      'Throughput (req/s)': r.rps,
      'Mín (ms)': r.min,
      'Promedio (ms)': r.avg,
      'p50 (ms)': r.p50,
      'p95 (ms)': r.p95,
      'p99 (ms)': r.p99,
      'Máx (ms)': r.max,
      'Fallos': `${r.failed} (${r.errorRate}%)`,
      'Cumple SLA': r.cumpleSLA ? '✅ APROBADO' : '❌ DESAPROBADO'
    })));

    const allPassed = results.every(r => r.cumpleSLA);
    if (allPassed) {
      console.log('\n🏆 CONCLUSIÓN: TODAS LAS APIS DE REPORTES SUPERARON LAS PRUEBAS DE RENDIMIENTO CON ÉXITO.');
      console.log('   Los tiempos de respuesta y rendimiento garantizan alta disponibilidad para la gerencia.');
    } else {
      console.warn('\n⚠️ ADVERTENCIA: Algunos endpoints superaron los umbrales esperados del SLA.');
    }
    console.log('================================================================================\n');

    server.close();
    process.exit(allPassed ? 0 : 1);
  } catch (err) {
    console.error('❌ Error durante la ejecución del benchmark:', err);
    server.close();
    process.exit(1);
  }
}

main();
