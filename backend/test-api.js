import app from './src/index.js';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';
import { getDb, saveStore } from './src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storePath = path.resolve(__dirname, './database/local_store.json');

// Respaldo de datos originales para que las pruebas sean idempotentes y no ensucien la BD
const initialBackup = fs.existsSync(storePath) ? fs.readFileSync(storePath, 'utf8') : null;

function restoreBackup() {
  if (initialBackup) {
    fs.writeFileSync(storePath, initialBackup, 'utf8');
    const db = getDb();
    const parsed = JSON.parse(initialBackup);
    Object.keys(parsed).forEach(k => {
      db[k] = parsed[k];
    });
  }
}

const server = http.createServer(app);
const PORT = 5099;

server.listen(PORT, async () => {
  console.log('================================================================================');
  console.log('🧪 SUITE DE PRUEBAS UNITARIAS Y DE INTEGRACIÓN - RV VEGA E.I.R.L.');
  console.log('📋 Cobertura EDT/WBS: 3.2.1.3 | 3.2.2.3 | 3.3.1.4 | 3.4.1.4 | 3.5.1.4');
  console.log('================================================================================\n');

  const baseUrl = `http://localhost:${PORT}/api`;
  let passed = 0;
  let failed = 0;

  async function runTest(code, name, fn) {
    try {
      await fn();
      console.log(`✅ [${code}] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [${code}] FALLÓ: ${name} -> ${err.message}`);
      failed++;
    }
  }

  try {
    // 1. Health Check & Autenticación JWT
    let token = '';
    await runTest('3.1.1', 'Health Check y Autenticación JWT + bcrypt', async () => {
      const resHealth = await fetch(`${baseUrl}/health`);
      const health = await resHealth.json();
      assert.strictEqual(resHealth.status, 200);
      assert.strictEqual(health.estado, 'Operativo');

      const resLogin = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@rvvega.com', password: 'Admin123*' })
      });
      const loginData = await resLogin.json();
      assert.strictEqual(resLogin.status, 200);
      assert.ok(loginData.token, 'Token JWT debe existir');
      token = loginData.token;
    });

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // =========================================================================
    // 3.2 MÓDULO DE GESTIÓN DE CLIENTES (3.2.1.3 Unitarias & 3.2.2.3 Integración)
    // =========================================================================
    let testClienteId = null;

    await runTest('3.2.1.3-A', 'Unitaria Clientes: Validación de reglas de negocio (RUC 11 dígitos y Teléfono 9 dígitos)', async () => {
      const resInvalido = await fetch(`${baseUrl}/clientes`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          tipo_documento: 'RUC',
          numero_documento: '12345', // RUC inválido
          razon_social: 'EMPRESA TEST INVALIDA',
          contacto: 'Tester',
          telefono: '987654321',
          email: 'test@empresa.pe',
          direccion: 'Av. Industrial 100',
          ciudad: 'Lima'
        })
      });
      assert.strictEqual(resInvalido.status, 400, 'Debe rechazar RUC que no tenga 11 dígitos');
    });

    await runTest('3.2.1.3-B', 'Unitaria Clientes: Creación (POST), Búsqueda (GET) y Actualización (PUT)', async () => {
      const resCreate = await fetch(`${baseUrl}/clientes`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          tipo_documento: 'RUC',
          numero_documento: '20999888777',
          razon_social: 'METALMECÁNICA ANDINA DE PRUEBA S.A.C.',
          contacto: 'Ing. Jorge Ríos',
          telefono: '987123456',
          email: 'jrios@metalandina.pe',
          direccion: 'Av. Los Materiales 450',
          ciudad: 'Arequipa'
        })
      });
      const creado = await resCreate.json();
      assert.strictEqual(resCreate.status, 201);
      assert.strictEqual(creado.numero_documento, '20999888777');
      testClienteId = creado.id;

      // Búsqueda por query param
      const resSearch = await fetch(`${baseUrl}/clientes?busqueda=20999888777`, { headers: authHeaders });
      const encontrados = await resSearch.json();
      assert.strictEqual(encontrados.length, 1);

      // Actualización PUT
      const resUpdate = await fetch(`${baseUrl}/clientes/${testClienteId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          tipo_documento: 'RUC',
          numero_documento: '20999888777',
          razon_social: 'METALMECÁNICA ANDINA DE PRUEBA S.A.C. - ACTUALIZADO',
          contacto: 'Ing. Jorge Ríos',
          telefono: '987123456',
          email: 'jrios@metalandina.pe',
          direccion: 'Av. Los Materiales 450',
          ciudad: 'Arequipa'
        })
      });
      const actualizado = await resUpdate.json();
      assert.strictEqual(resUpdate.status, 200);
      assert.ok(actualizado.razon_social.includes('ACTUALIZADO'));
    });

    // =========================================================================
    // 3.3 MÓDULO DE GESTIÓN DE PEDIDOS (3.3.1.3 Búsqueda & 3.3.1.4 Unitarias)
    // =========================================================================
    let testPedidoId = null;

    await runTest('3.3.1.4-A', 'Unitaria Pedidos: Registro de pedido con cálculo automático de Subtotal, IGV (18%) y Total', async () => {
      const resPedido = await fetch(`${baseUrl}/pedidos`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          cliente_id: testClienteId,
          fecha_entrega_prometida: '2026-10-25',
          prioridad: 'Urgente',
          observaciones: 'Pedido de prueba unitaria',
          items: [
            { descripcion_producto: 'Estructura Metálica Techo', especificaciones: 'Acero ASTM A36', cantidad: 2, precio_unitario: 1000 },
            { descripcion_producto: 'Soporte Lateral', especificaciones: 'Plancha 1/4"', cantidad: 4, precio_unitario: 250 }
          ]
        })
      });
      const nuevoPed = await resPedido.json();
      assert.strictEqual(resPedido.status, 201);
      assert.strictEqual(nuevoPed.subtotal, 3000);
      assert.strictEqual(nuevoPed.igv, 540);
      assert.strictEqual(nuevoPed.total, 3540);
      assert.strictEqual(nuevoPed.suministro_insumos, 'Cliente los trae', 'Por defecto los insumos deben ser provistos por el cliente');
      testPedidoId = nuevoPed.id;
    });

    await runTest('3.3.1.4-C', 'Unitaria Pedidos: Especificación explícita de suministro de insumos por la empresa', async () => {
      const resPedidoInsumos = await fetch(`${baseUrl}/pedidos`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          cliente_id: 1,
          fecha_entrega_prometida: '2026-10-30',
          prioridad: 'Media',
          suministro_insumos: 'Empresa suministra',
          observaciones: 'Prueba de pedido con compra de insumos incluida',
          items: [
            { descripcion_producto: 'Portón corredizo con perfiles incluidos', especificaciones: 'Tubo 2x2', cantidad: 1, precio_unitario: 1200 }
          ]
        })
      });
      const pedInsumos = await resPedidoInsumos.json();
      assert.strictEqual(resPedidoInsumos.status, 201);
      assert.strictEqual(pedInsumos.suministro_insumos, 'Empresa suministra');
    });

    await runTest('3.3.1.4-B', 'Unitaria Pedidos: Servicio de búsqueda multicriterio (texto, estado y prioridad - 3.3.1.3)', async () => {
      const resBusqueda = await fetch(`${baseUrl}/pedidos?busqueda=METALMECÁNICA%20ANDINA&prioridad=Urgente`, {
        headers: authHeaders
      });
      const lista = await resBusqueda.json();
      assert.strictEqual(resBusqueda.status, 200);
      assert.ok(lista.some(p => p.id === testPedidoId), 'Debe encontrar el pedido creado mediante búsqueda por texto y prioridad');
    });

    await runTest('3.2.2.3', 'Integración Módulo de Clientes: Verificación de cartera e historial de pedidos asociados al cliente', async () => {
      const resCliDetalle = await fetch(`${baseUrl}/clientes/${testClienteId}`, { headers: authHeaders });
      const cliDetalle = await resCliDetalle.json();
      assert.strictEqual(resCliDetalle.status, 200);
      assert.ok(Array.isArray(cliDetalle.pedidos), 'El cliente debe incluir su historial de pedidos');
      assert.strictEqual(cliDetalle.pedidos.length, 1, 'El cliente debe reflejar exactamente el pedido recién integrado');
    });

    // =========================================================================
    // 3.4 MÓDULO DE PRODUCCIÓN (3.4.1.2 OPs, 3.4.1.3 Tiempos, 3.4.1.4 Unitarias)
    // =========================================================================
    let testOpId = null;
    let testEtapas = [];

    await runTest('3.4.1.4-A', 'Unitaria Producción: Generación de Orden de Trabajo (OP) con 5 fases estándar', async () => {
      const resOp = await fetch(`${baseUrl}/produccion`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          pedido_id: testPedidoId,
          prioridad: 'Urgente',
          fecha_inicio_programada: '2026-10-10',
          fecha_fin_programada: '2026-10-24',
          observaciones: 'OP de prueba automatizada'
        })
      });
      const nuevaOp = await resOp.json();
      assert.strictEqual(resOp.status, 201);
      assert.strictEqual(nuevaOp.etapas.length, 5, 'Debe generar las 5 etapas estándar de fabricación');
      testOpId = nuevaOp.id;
      testEtapas = nuevaOp.etapas;
    });

    await runTest('3.4.1.4-B', 'Unitaria Producción: Avance de etapas, registro de paradas/calidad y cálculo de tiempos (3.4.1.3)', async () => {
      // Finalizar etapa 1 con 12.5 horas reales
      const etapa1 = testEtapas[0];
      const resEtapa = await fetch(`${baseUrl}/produccion/etapas/${etapa1.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          estado: 'Finalizada',
          horas_reales: 12.5,
          operario_asignado: 'Juan Pérez T.'
        })
      });
      const dataEtapa = await resEtapa.json();
      assert.strictEqual(resEtapa.status, 200);
      assert.strictEqual(dataEtapa.op.porcentaje_avance, 20, '1 de 5 etapas finalizadas equivale al 20% de avance');
      assert.strictEqual(dataEtapa.op.estado, 'En Proceso');

      // Registrar parada de producción
      const resParada = await fetch(`${baseUrl}/produccion/paradas`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          orden_produccion_id: testOpId,
          etapa_id: etapa1.id,
          motivo: 'Falla de Máquina',
          minutos_parada: 60,
          descripcion: 'Cambio de disco de corte'
        })
      });
      assert.strictEqual(resParada.status, 201);

      // Registrar control de calidad
      const resCalidad = await fetch(`${baseUrl}/produccion/calidad`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          orden_produccion_id: testOpId,
          resultado: 'Aprobado',
          defectos_encontrados: 'Conforme',
          merma_porcentaje: 0.5
        })
      });
      assert.strictEqual(resCalidad.status, 201);

      // Verificar servicio de cálculo de tiempos (3.4.1.3)
      const resTiempos = await fetch(`${baseUrl}/produccion/tiempos`, { headers: authHeaders });
      const dataTiempos = await resTiempos.json();
      assert.strictEqual(resTiempos.status, 200);
      const opTiempos = dataTiempos.ordenes.find(o => o.id === testOpId);
      assert.ok(opTiempos, 'Debe incluir la OP en el cálculo de tiempos');
      assert.strictEqual(opTiempos.horas_reales_totales, 12.5);
      assert.strictEqual(opTiempos.minutos_parada_totales, 60);
      assert.strictEqual(opTiempos.horas_parada_totales, 1);
    });

    // =========================================================================
    // 3.5 MÓDULO DE INVENTARIO DE MATERIA PRIMA (3.5.1.4 Unitarias)
    // =========================================================================
    let testMaterialId = null;

    await runTest('3.5.1.4-A', 'Unitaria Inventario: Creación de material y consulta de alertas de stock', async () => {
      const resMat = await fetch(`${baseUrl}/inventario`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          codigo_sku: 'MP-TEST-999',
          nombre: 'Perfil Angular de Prueba 2"',
          categoria: 'Metales/Perfiles',
          unidad_medida: 'tubo',
          stock_actual: 10,
          stock_minimo: 15,
          costo_unitario: 50.0,
          ubicacion_almacen: 'Nave Test'
        })
      });
      const matCreado = await resMat.json();
      assert.strictEqual(resMat.status, 201);
      testMaterialId = matCreado.id;

      const resConsulta = await fetch(`${baseUrl}/inventario?busqueda=MP-TEST-999&alerta_stock=true`, { headers: authHeaders });
      const listaMats = await resConsulta.json();
      assert.strictEqual(listaMats.length, 1);
      assert.strictEqual(listaMats[0].en_alerta, true, 'Debe activar alerta cuando stock_actual <= stock_minimo');
    });

    await runTest('3.5.1.4-B', 'Unitaria Inventario: Movimientos Kardex (Entrada, Salida y bloqueo por sobregiro)', async () => {
      // Movimiento de ENTRADA (+20) -> Stock pasa de 10 a 30
      const resEntrada = await fetch(`${baseUrl}/inventario/movimiento`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          material_id: testMaterialId,
          tipo_movimiento: 'ENTRADA',
          cantidad: 20,
          motivo: 'Compra test',
          referencia_documento: 'FAC-TEST-001'
        })
      });
      const movEntrada = await resEntrada.json();
      assert.strictEqual(resEntrada.status, 201);
      assert.strictEqual(movEntrada.stock_actualizado, 30);
      assert.strictEqual(movEntrada.en_alerta, false);

      // Movimiento de SALIDA que excede stock (solicita 50 teniendo 30) -> Debe rechazar con 400
      const resSobregiro = await fetch(`${baseUrl}/inventario/movimiento`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          material_id: testMaterialId,
          tipo_movimiento: 'SALIDA_PRODUCCION',
          cantidad: 50,
          motivo: 'Intento de sobregiro'
        })
      });
      assert.strictEqual(resSobregiro.status, 400, 'Debe impedir salida mayor al stock disponible');
    });

    // =========================================================================
    // 3.6 MÓDULO DE REPORTES, BI E INTELIGENCIA ARTIFICIAL
    // =========================================================================
    await runTest('3.6.1.2', 'APIs REST de Reportes (OTIF, Costos, Productividad Operarios) y BI (OEE)', async () => {
      const [resOtif, resCostos, resOperarios, resBi] = await Promise.all([
        fetch(`${baseUrl}/reportes/otif`, { headers: authHeaders }),
        fetch(`${baseUrl}/reportes/costos`, { headers: authHeaders }),
        fetch(`${baseUrl}/reportes/operarios`, { headers: authHeaders }),
        fetch(`${baseUrl}/bi/dashboard`, { headers: authHeaders })
      ]);
      assert.strictEqual(resOtif.status, 200);
      assert.strictEqual(resCostos.status, 200);
      assert.strictEqual(resOperarios.status, 200);
      assert.strictEqual(resBi.status, 200);
    });

    await runTest('3.2.1.3-C', 'Unitaria Clientes: Deshabilitación lógica de cliente (DELETE)', async () => {
      const resDel = await fetch(`${baseUrl}/clientes/${testClienteId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      assert.strictEqual(resDel.status, 200);
    });

    console.log('\n================================================================================');
    console.log(`🎉 RESUMEN DE PRUEBAS: ${passed} exitosas | ${failed} fallidas`);
    console.log('================================================================================');

    restoreBackup();
    server.close();
    process.exit(failed === 0 ? 0 : 1);
  } catch (err) {
    console.error('❌ Error crítico en pruebas:', err);
    restoreBackup();
    server.close();
    process.exit(1);
  }
});
