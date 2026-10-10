-- Datos Iniciales / Semilla para RV Vega Servicios Generales E.I.R.L.
-- Contraseña por defecto para todos los usuarios: Admin123* (hash bcrypt generado)
-- Hash: /qQYw0Q7p/.gMhI5vWjZt59k7b9a5Wj7YjU7P2fV6q (o generado dinámicamente)

-- 1. Usuarios Iniciales
INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
('Ing. Roberto Vega', 'admin@rvvega.com', '/qQYw0Q7p/.gMhI5vWjZt59k7b9a5Wj7YjU7P2fV6q', 'admin'),
('Carlos Mendoza', 'produccion@rvvega.com', '/qQYw0Q7p/.gMhI5vWjZt59k7b9a5Wj7YjU7P2fV6q', 'jefe_produccion'),
('Juan Pérez T.', 'operario1@rvvega.com', '/qQYw0Q7p/.gMhI5vWjZt59k7b9a5Wj7YjU7P2fV6q', 'operario'),
('Lucía Ramírez', 'ventas@rvvega.com', '/qQYw0Q7p/.gMhI5vWjZt59k7b9a5Wj7YjU7P2fV6q', 'ventas');

-- 2. Clientes
INSERT INTO clientes (tipo_documento, numero_documento, razon_social, contacto, telefono, email, direccion, ciudad) VALUES
('RUC', '20518923411', 'CONSTRUCTORA E INMOBILIARIA DEL SUR S.A.C.', 'Arq. Miguel Ángel Torres', '987654321', 'compras@inmodelsur.pe', 'Av. Javier Prado Este 2450, San Borja', 'Lima'),
('RUC', '20492817293', 'AGROINDUSTRIAS DEL VALLE S.A.', 'Ing. Carmen Salazar', '998112233', 'csalazar@agrovalle.com.pe', 'Carretera Central Km 18, Ate', 'Lima'),
('RUC', '20601284751', 'LOGÍSTICA INTEGRAL PERUANA S.A.C.', 'Sr. Jorge Valdivia', '976543120', 'operaciones@logiperu.com', 'Av. Néstor Gambetta 4500, Callao', 'Callao'),
('RUC', '20100239482', 'INDUSTRIAS METALMECÁNICAS LIMA S.A.', 'Lic. Patricia Vega', '954321876', 'pvega@metalima.pe', 'Av. Argentina 1920, Cercado de Lima', 'Lima'),
('DNI', '42819204', 'FERNANDO ALARCÓN RÍOS', 'Fernando Alarcón', '943210987', 'f.alarcon@gmail.com', 'Calle Los Sauces 142, Surco', 'Lima');

-- 3. Materia Prima e Insumos
INSERT INTO materiales (codigo_sku, nombre, categoria, unidad_medida, stock_actual, stock_minimo, costo_unitario, ubicacion_almacen) VALUES
('MP-MET-001', 'Plancha de Acero LAC 1/4\" x 1.20m x 2.40m', 'Metales/Perfiles', 'plancha', 35.00, 10.00, 245.00, 'Nave A - Racks Metálicos'),
('MP-MET-002', 'Tubo Cuadrado Estructural 2\" x 2\" x 2mm', 'Metales/Perfiles', 'tubo', 52.00, 15.00, 68.50, 'Nave A - Caballete 3'),
('MP-MET-003', 'Ángulo Estructural 1 1/2\" x 3/16\" x 6m', 'Metales/Perfiles', 'tubo', 18.00, 20.00, 52.00, 'Nave A - Caballete 1'),
('MP-SOL-001', 'Electrodo de Soldadura Cellocord E6011 (Caja 20kg)', 'Soldadura/Consumibles', 'kg', 85.00, 25.00, 14.50, 'Estantería B - Insumos'),
('MP-SOL-002', 'Alambre Tubular MIG ER70S-6 (Carrete 15kg)', 'Soldadura/Consumibles', 'kg', 12.00, 15.00, 19.80, 'Estantería B - Insumos'),
('MP-PIN-001', 'Pintura Anticorrosiva Epóxica Gris (Galón)', 'Pinturas/Acabados', 'galón', 28.00, 10.00, 95.00, 'Zona Química - Pinturas'),
('MP-PIN-002', 'Esmalte Poliuretano Industrial Blanco (Galón)', 'Pinturas/Acabados', 'galón', 8.00, 12.00, 120.00, 'Zona Química - Pinturas'),
('MP-FIJ-001', 'Perno Hexagonal Grado 5 con Tuerca 1/2\" x 2\"', 'Fijaciones/Tornillería', 'und', 340.00, 100.00, 3.20, 'Gaveta C-12'),
('MP-DIS-001', 'Disco de Corte 7\" x 1/8\" Dewalt', 'Soldadura/Consumibles', 'und', 45.00, 20.00, 8.50, 'Gaveta C-05');

-- 4. Pedidos Registrados
INSERT INTO pedidos (codigo_pedido, cliente_id, fecha_pedido, fecha_entrega_prometida, fecha_entrega_real, estado, prioridad, subtotal, igv, total, observaciones, creado_por) VALUES
('PED-2026-0001', 1, '2026-08-10', '2026-08-25', '2026-08-25', 'Entregado', 'Alta', 8500.00, 1530.00, 10030.00, 'Fabricación de 10 barandas metálicas de seguridad para obra San Borja', 1),
('PED-2026-0002', 2, '2026-08-15', '2026-09-02', '2026-09-03', 'Entregado', 'Media', 12400.00, 2232.00, 14632.00, 'Tolva metálica para descarga de granos con recubrimiento epóxico', 1),
('PED-2026-0003', 3, '2026-09-01', '2026-09-18', NULL, 'En Producción', 'Urgente', 15800.00, 2844.00, 18644.00, 'Estructura soporte para faja transportadora de 12 metros', 1),
('PED-2026-0004', 4, '2026-09-05', '2026-09-22', NULL, 'En Planificación', 'Media', 6200.00, 1116.00, 7316.00, 'Fabricación de 4 portones corredizos industriales con malla electro-soldada', 4),
('PED-2026-0005', 1, '2026-09-10', '2026-09-30', NULL, 'Pendiente', 'Baja', 4900.00, 882.00, 5782.00, 'Mantenimiento preventivo y repuestos para cerco perimétrico', 4);

-- 5. Detalles de Pedidos
INSERT INTO pedido_detalles (pedido_id, descripcion_producto, especificaciones, cantidad, precio_unitario, total_linea) VALUES
(1, 'Baranda de seguridad modular 2m', 'Tubo de 2\" con pintura epóxica amarillo tránsito', 10, 850.00, 8500.00),
(2, 'Tolva receptora de acero LAC 1/4\"', 'Capacidad 1.5m3 con refuerzos en ángulo de 2\"', 1, 12400.00, 12400.00),
(3, 'Bastidor de faja transportadora 12m', 'Perfiles U y ángulos estructurales ensamblados', 1, 15800.00, 15800.00),
(4, 'Portón industrial corredizo 3m x 2.5m', 'Estructura tubular con riel inferior y rodamientos pesados', 4, 1550.00, 6200.00),
(5, 'Paquete de postes y refuerzos de anclaje', 'Acero galvanizado con platina base', 20, 245.00, 4900.00);

-- 6. Órdenes de Producción (OP)
INSERT INTO ordenes_produccion (codigo_op, pedido_id, estado, prioridad, fecha_inicio_programada, fecha_fin_programada, fecha_inicio_real, fecha_fin_real, porcentaje_avance, costo_estimado, costo_real, responsable_id, observaciones) VALUES
('OP-2026-001', 1, 'Completada', 'Alta', '2026-08-11', '2026-08-24', '2026-08-11 08:30:00', '2026-08-24 17:00:00', 100, 5200.00, 5350.00, 2, 'Entregado a tiempo sin no conformidades'),
('OP-2026-002', 2, 'Completada', 'Media', '2026-08-16', '2026-09-01', '2026-08-16 08:00:00', '2026-09-02 11:30:00', 100, 7800.00, 8100.00, 2, 'Ligero retraso por secado de pintura epóxica'),
('OP-2026-003', 3, 'En Proceso', 'Urgente', '2026-09-02', '2026-09-17', '2026-09-02 08:15:00', NULL, 70, 9400.00, 6800.00, 2, 'Fase de soldadura completada; en proceso de arenado y pintura');

-- 7. Etapas de Producción para OP-2026-003 (En Proceso)
INSERT INTO etapas_produccion (orden_produccion_id, numero_fase, nombre_etapa, descripcion, operario_asignado, horas_estimadas, horas_reales, estado, fecha_inicio, fecha_fin) VALUES
(3, 1, 'Habilitado y Corte', 'Trazado, oxicorte y corte por sierra de perfiles y platinas', 'Juan Pérez T.', 16.00, 15.50, 'Finalizada', '2026-09-02 08:30:00', '2026-09-04 17:00:00'),
(3, 2, 'Mecanizado y Perforado', 'Taladrado de agujeros para anclajes y empalmes de pernos', 'Marcos Quispe', 12.00, 13.00, 'Finalizada', '2026-09-05 08:00:00', '2026-09-06 18:00:00'),
(3, 3, 'Armado y Soldadura', 'Ensamble de bastidores en mesa de trabajo y soldadura MIG', 'Juan Pérez T.', 32.00, 34.00, 'Finalizada', '2026-09-08 08:00:00', '2026-09-12 17:30:00'),
(3, 4, 'Tratamiento y Pintura', 'Limpieza mecánica, aplicación de base epóxica y esmalte poliuretano', 'Raúl Gómez', 20.00, 8.00, 'En Proceso', '2026-09-14 08:30:00', NULL),
(3, 5, 'Control de Calidad y Embalaje', 'Inspección dimensional, prueba de adherencia y embalaje para despacho', 'Ing. Carlos Mendoza', 8.00, 0.00, 'Pendiente', NULL, NULL);

-- 8. Movimientos de Inventario (Kardex)
INSERT INTO movimientos_inventario (material_id, tipo_movimiento, cantidad, costo_unitario, referencia_documento, motivo, registrado_por, fecha) VALUES
(1, 'ENTRADA', 40.00, 245.00, 'F001-9821', 'Compra mensual a Aceros Arequipa', 1, '2026-08-01 09:00:00'),
(1, 'SALIDA_PRODUCCION', 5.00, 245.00, 'OP-2026-001', 'Consumo para barandas', 2, '2026-08-12 10:00:00'),
(2, 'SALIDA_PRODUCCION', 14.00, 68.50, 'OP-2026-003', 'Consumo para bastidor de faja', 2, '2026-09-03 08:30:00');

-- 9. Controles de Calidad
INSERT INTO control_calidad (orden_produccion_id, inspector_id, resultado, defectos_encontrados, acciones_correctivas, merma_porcentaje) VALUES
(1, 2, 'Aprobado', 'Ninguno crítico', 'Ninguna requerida', 1.20),
(2, 2, 'Aprobado con Observaciones', 'Porosidad leve en cordón secundario de base', 'Resanado y aplicación de cordón de refuerzo', 2.80);

-- 10. Registro de Paradas / Incidencias
INSERT INTO paradas_produccion (orden_produccion_id, etapa_id, motivo, minutos_parada, descripcion) VALUES
(3, 3, 'Falta de Material', 90, 'Espera de reposición de alambre MIG en almacén central'),
(2, 4, 'Humedad Ambiental', 180, 'Retraso de secado por alta humedad matutina en cabina de pintura');
