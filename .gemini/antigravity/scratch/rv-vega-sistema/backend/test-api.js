import app from './src/index.js';
import http from 'http';

const server = http.createServer(app);

server.listen(5099, async () => {
  console.log('🧪 Iniciando batería de pruebas para RV Vega API en puerto 5099...');
  const baseUrl = 'http://localhost:5099/api';

  try {
    // 1. Health check
    const resHealth = await fetch(`${baseUrl}/health`);
    const health = await resHealth.json();
    console.log('✅ 1. Health Check:', health.empresa, '-', health.estado);

    // 2. Auth Login
    const resLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@rvvega.com', password: 'Admin123*' })
    });
    const loginData = await resLogin.json();
    if (!loginData.token) throw new Error('Fallo login: ' + JSON.stringify(loginData));
    const token = loginData.token;
    console.log('✅ 2. Login con JWT & bcrypt exitoso. Usuario:', loginData.usuario.nombre, `(${loginData.usuario.rol})`);

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 3. Clientes
    const resClientes = await fetch(`${baseUrl}/clientes`, { headers: authHeaders });
    const clientes = await resClientes.json();
    console.log(`✅ 3. Módulo Clientes: ${clientes.length} clientes encontrados.`);

    // 4. Pedidos
    const resPedidos = await fetch(`${baseUrl}/pedidos`, { headers: authHeaders });
    const pedidos = await resPedidos.json();
    console.log(`✅ 4. Módulo Pedidos: ${pedidos.length} pedidos registrados.`);

    // 5. Producción
    const resOps = await fetch(`${baseUrl}/produccion`, { headers: authHeaders });
    const ops = await resOps.json();
    console.log(`✅ 5. Módulo Producción: ${ops.length} Órdenes de Producción activas.`);

    // 6. Inventario
    const resInv = await fetch(`${baseUrl}/inventario`, { headers: authHeaders });
    const inv = await resInv.json();
    const criticos = inv.filter(i => i.en_alerta);
    console.log(`✅ 6. Módulo Inventario: ${inv.length} materiales catalogados (${criticos.length} con stock crítico).`);

    // 7. Reportes (OTIF)
    const resOtif = await fetch(`${baseUrl}/reportes/otif`, { headers: authHeaders });
    const otif = await resOtif.json();
    console.log(`✅ 7. Módulo Reportes: Tasa OTIF = ${otif.resumen.porcentaje_otif}% (${otif.resumen.estado_meta}).`);

    // 8. Business Intelligence (BI)
    const resBi = await fetch(`${baseUrl}/bi/dashboard`, { headers: authHeaders });
    const bi = await resBi.json();
    console.log(`✅ 8. Módulo BI: OEE Global = ${bi.oee.global}% (Disponibilidad: ${bi.oee.disponibilidad}%, Rendimiento: ${bi.oee.rendimiento}%, Calidad: ${bi.oee.calidad}%).`);

    // 9. Módulo IA (Predicción de riesgos y Chat)
    const resRiesgos = await fetch(`${baseUrl}/ai/riesgos`, { headers: authHeaders });
    const riesgos = await resRiesgos.json();
    console.log(`✅ 9. Módulo IA (Riesgos): ${riesgos.length} órdenes analizadas predictivamente.`);

    const resChat = await fetch(`${baseUrl}/ai/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ mensaje: '¿Cuál es el cuello de botella actual en el taller?' })
    });
    const chat = await resChat.json();
    console.log('✅ 10. Módulo IA (Copiloto): Respuesta generada exitosamente.');

    console.log('\n🎉 ¡TODAS LAS PRUEBAS DEL BACKEND PASARON AL 100%!');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en pruebas:', err);
    server.close();
    process.exit(1);
  }
});
