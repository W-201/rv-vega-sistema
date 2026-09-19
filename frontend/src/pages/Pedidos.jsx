import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Filter, Calendar, Hammer, Eye, FileText, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function Pedidos({ setActiveTab }) {
    const [pedidos, setPedidos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [filtroEstado, setFiltroEstado] = useState('Todos');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [detallePedido, setDetallePedido] = useState(null);

    const [clienteId, setClienteId] = useState('');
    const [fechaEntrega, setFechaEntrega] = useState('');
    const [prioridad, setPrioridad] = useState('Media');
    const [observaciones, setObservaciones] = useState('');
    const [items, setItems] = useState([
        { descripcion_producto: '', especificaciones: '', cantidad: 1, precio_unitario: 0 }
    ]);

    // --- NUEVOS ESTADOS PARA OE1 ---
    const [documentoBuscado, setDocumentoBuscado] = useState('');
    const [buscandoDoc, setBuscandoDoc] = useState(false);

    const loadPedidos = async () => {
        try {
            setLoading(true);
            const data = await api.get(`/pedidos?estado=${filtroEstado}`);
            setPedidos(data);
        } catch (err) {
            console.error('Error al cargar pedidos:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadClientes = async () => {
        try {
            const data = await api.get('/clientes');
            setClientes(data);
            if (data.length > 0) setClienteId(data[0].id);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        loadPedidos();
    }, [filtroEstado]);

    useEffect(() => {
        loadClientes();
    }, []);

    const handleAddItem = () => {
        setItems([...items, { descripcion_producto: '', especificaciones: '', cantidad: 1, precio_unitario: 0 }]);
    };

    const handleItemChange = (idx, field, val) => {
        const updated = [...items];
        updated[idx][field] = val;
        setItems(updated);
    };

    const handleRemoveItem = (idx) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== idx));
        }
    };

    const calcularTotales = () => {
        const subtotal = items.reduce((acc, it) => acc + (Number(it.cantidad || 0) * Number(it.precio_unitario || 0)), 0);
        const igv = Math.round(subtotal * 0.18 * 100) / 100;
        const total = Math.round((subtotal + igv) * 100) / 100;
        return { subtotal, igv, total };
    };

    const handleCreatePedido = async (e) => {
        e.preventDefault();
        try {
            await api.post('/pedidos', {
                cliente_id: clienteId,
                fecha_entrega_prometida: fechaEntrega,
                prioridad,
                observaciones,
                items
            });
            setShowModal(false);
            setItems([{ descripcion_producto: '', especificaciones: '', cantidad: 1, precio_unitario: 0 }]);
            setObservaciones('');
            setDocumentoBuscado('');
            loadPedidos();
        } catch (err) {
            alert('Error al crear pedido: ' + err.message);
        }
    };

    const handleCrearOP = async (pedidoId) => {
        try {
            await api.post('/produccion', { pedido_id: pedidoId });
            alert('¡Orden de Producción generada con éxito!');
            loadPedidos();
        } catch (err) {
            alert('Error al generar OP: ' + err.message);
        }
    };

    // --- LÓGICA OE1: VALIDACIÓN DE DNI/RUC ---
    const handleBuscarDocumento = async () => {
        if (documentoBuscado.length !== 8 && documentoBuscado.length !== 11) {
            alert("El documento debe tener 8 (DNI) u 11 (RUC) dígitos.");
            return;
        }
        setBuscandoDoc(true);
        try {
            // Por ahora busca en los clientes cargados. Luego se puede conectar a SUNAT/RENIEC.
            const clienteEncontrado = clientes.find(c => c.numero_documento === documentoBuscado);
            if (clienteEncontrado) {
                setClienteId(clienteEncontrado.id);
                alert(`✔ Cliente seleccionado: ${clienteEncontrado.razon_social}`);
            } else {
                alert("Cliente no encontrado. Debe registrarlo primero en el módulo de Clientes.");
            }
        } catch (err) {
            alert("Error al consultar el documento.");
        } finally {
            setBuscandoDoc(false);
        }
    };

    // --- LÓGICA OE1: ALERTAS DE VENCIMIENTO ---
    const obtenerAlertaVencimiento = (fecha) => {
        if (!fecha) return { color: 'text-slate-700', mensaje: '' };
        const hoy = new Date();
        // Ajuste para comparar fechas sin horas
        hoy.setHours(0, 0, 0, 0);
        const fechaPactada = new Date(fecha + 'T00:00:00');

        const diffTime = fechaPactada - hoy;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { color: 'text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded', mensaje: 'Vencido' };
        if (diffDays <= 3) return { color: 'text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded', mensaje: `En ${diffDays} días` };
        return { color: 'text-slate-700', mensaje: '' };
    };

    const { subtotal, igv, total } = calcularTotales();

    return (
        <div className="p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600">Estado:</span>
                    <select
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                        className="text-xs p-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                        <option value="Todos">Todos los Estados</option>
                        <option value="Pendiente">Pendiente</option>
                        <option value="En Planificación">En Planificación</option>
                        <option value="En Producción">En Producción</option>
                        <option value="Entregado">Entregado</option>
                    </select>
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Pedido</span>
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-3">Código</th>
                                <th className="px-5 py-3">Cliente</th>
                                <th className="px-5 py-3">Fecha Pactada</th>
                                <th className="px-5 py-3">Prioridad</th>
                                <th className="px-5 py-3">Estado</th>
                                <th className="px-5 py-3">Total (S/)</th>
                                <th className="px-5 py-3">Orden Prod. (OP)</th>
                                <th className="px-5 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-8 text-slate-400">Cargando pedidos...</td>
                                </tr>
                            ) : pedidos.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-8 text-slate-400">No se encontraron pedidos</td>
                                </tr>
                            ) : (
                                pedidos.map((p) => {
                                    const alerta = obtenerAlertaVencimiento(p.fecha_entrega_prometida);
                                    return (
                                        <tr key={p.id} className="hover:bg-slate-50/60 transition">
                                            <td className="px-5 py-3 font-mono font-bold text-blue-700">{p.codigo_pedido}</td>
                                            <td className="px-5 py-3 font-semibold text-slate-900">{p.cliente_nombre}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-slate-700">
                                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                        <span>{p.fecha_entrega_prometida}</span>
                                                    </div>
                                                    {alerta.mensaje && p.estado !== 'Entregado' && (
                                                        <span className={`text-[10px] w-fit ${alerta.color}`}>{alerta.mensaje}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${p.prioridad === 'Urgente' ? 'bg-red-100 text-red-700' : p.prioridad === 'Alta' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                                                    }`}>
                                                    {p.prioridad}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${p.estado === 'Entregado' ? 'bg-emerald-100 text-emerald-800' : p.estado === 'En Producción' ? 'bg-blue-100 text-blue-800' : p.estado === 'En Planificación' ? 'bg-purple-100 text-purple-800' : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {p.estado}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 font-bold text-slate-900">
                                                S/ {p.total?.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-5 py-3">
                                                {p.codigo_op ? (
                                                    <div className="space-y-1">
                                                        <span className="font-mono font-semibold text-blue-600 text-[11px]">{p.codigo_op}</span>
                                                        <div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                                            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${p.op_avance || 0}%` }}></div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleCrearOP(p.id)}
                                                        className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded text-[11px] flex items-center gap-1 shadow-sm transition cursor-pointer"
                                                    >
                                                        <Hammer className="w-3 h-3" />
                                                        <span>Generar OP</span>
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <button
                                                    onClick={async () => {
                                                        const det = await api.get(`/pedidos/${p.id}`);
                                                        setDetallePedido(det);
                                                    }}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                                                    title="Ver Ficha Técnica"
                                                >
                                                    <Eye className="w-4 h-4 inline" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 my-8">
                        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
                            <h3 className="font-bold text-sm">Registrar Nuevo Pedido / Cotización</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
                        </div>

                        <form onSubmit={handleCreatePedido} className="p-6 space-y-4 text-xs">

                            {/* BLOQUE OE1: CÓDIGO AUTOGENERADO Y FECHA */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Código de Pedido</label>
                                    <input
                                        type="text"
                                        disabled
                                        value="AUTOGENERADO AL GUARDAR"
                                        className="w-full p-2 border border-slate-200 rounded-lg bg-slate-200 text-slate-500 font-mono text-center font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Fecha Entrega *</label>
                                    <input
                                        type="date"
                                        required
                                        value={fechaEntrega}
                                        onChange={(e) => setFechaEntrega(e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* BLOQUE OE1: VALIDACIÓN RUC Y SELECCIÓN DE CLIENTE */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Validar DNI / RUC</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Ingrese 8 u 11 dígitos"
                                            value={documentoBuscado}
                                            onChange={(e) => setDocumentoBuscado(e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleBuscarDocumento}
                                            disabled={buscandoDoc}
                                            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold transition whitespace-nowrap"
                                        >
                                            {buscandoDoc ? '...' : 'Buscar'}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Cliente Seleccionado *</label>
                                    <select
                                        value={clienteId}
                                        onChange={(e) => setClienteId(e.target.value)}
                                        required
                                        className="w-full p-2 border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">Seleccione un cliente...</option>
                                        {clientes.map(c => (
                                            <option key={c.id} value={c.id}>{c.razon_social} ({c.numero_documento})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Nivel de Prioridad</label>
                                <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="Baja">Baja</option>
                                    <option value="Media">Media</option>
                                    <option value="Alta">Alta</option>
                                    <option value="Urgente">Urgente</option>
                                </select>
                            </div>

                            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-3">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-slate-800">Ítems / Productos Solicitados</h4>
                                    <button type="button" onClick={handleAddItem} className="text-[11px] bg-blue-600 text-white font-semibold px-2 py-1 rounded hover:bg-blue-700">+ Agregar Ítem</button>
                                </div>

                                {items.map((it, idx) => (
                                    <div key={idx} className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-2">
                                        <div className="grid grid-cols-12 gap-2">
                                            <div className="col-span-6">
                                                <input type="text" required placeholder="Descripción del producto o servicio" value={it.descripcion_producto} onChange={(e) => handleItemChange(idx, 'descripcion_producto', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
                                            </div>
                                            <div className="col-span-2">
                                                <input type="number" min="1" required placeholder="Cant." value={it.cantidad} onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded text-xs text-center focus:ring-2 focus:ring-blue-500 outline-none" />
                                            </div>
                                            <div className="col-span-3">
                                                <input type="number" step="0.01" min="0" required placeholder="P. Unitario (S/)" value={it.precio_unitario} onChange={(e) => handleItemChange(idx, 'precio_unitario', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded text-xs text-right focus:ring-2 focus:ring-blue-500 outline-none" />
                                            </div>
                                            <div className="col-span-1 text-center">
                                                {items.length > 1 && (
                                                    <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700 text-base">✕</button>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <input type="text" placeholder="Especificaciones técnicas (medidas, material, norma)" value={it.especificaciones} onChange={(e) => handleItemChange(idx, 'especificaciones', e.target.value)} className="w-full p-1.5 border border-slate-200 rounded text-[11px] text-slate-600 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                    </div>
                                ))}

                                <div className="text-right space-y-0.5 pt-2 text-xs">
                                    <div>Subtotal: <span className="font-semibold">S/ {subtotal.toFixed(2)}</span></div>
                                    <div>I.G.V. (18%): <span className="font-semibold">S/ {igv.toFixed(2)}</span></div>
                                    <div className="text-sm font-bold text-slate-900">Total: S/ {total.toFixed(2)}</div>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Observaciones</label>
                                <textarea rows="2" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Condiciones especiales, lugar de despacho..." className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>

                            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm">Guardar Pedido</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {detallePedido && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 p-6 space-y-4 text-xs">
                        <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                            <div>
                                <span className="font-mono text-sm font-bold text-blue-700">{detallePedido.codigo_pedido}</span>
                                <h3 className="font-bold text-base text-slate-900">{detallePedido.cliente?.razon_social}</h3>
                                <p className="text-slate-500 text-[11px]">{detallePedido.cliente?.tipo_documento}: {detallePedido.cliente?.numero_documento}</p>
                            </div>
                            <button onClick={() => setDetallePedido(null)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-slate-600">
                            <div>Fecha Pedido: <span className="font-semibold text-slate-900">{detallePedido.fecha_pedido}</span></div>
                            <div>Fecha Entrega: <span className="font-semibold text-slate-900">{detallePedido.fecha_entrega_prometida}</span></div>
                            <div>Estado: <span className="font-bold text-blue-600">{detallePedido.estado}</span></div>
                            <div>Prioridad: <span className="font-semibold">{detallePedido.prioridad}</span></div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-bold text-slate-800">Desglose de Ítems</h4>
                            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                                {detallePedido.detalles?.map(d => (
                                    <div key={d.id} className="p-2.5 flex justify-between items-center">
                                        <div>
                                            <div className="font-semibold text-slate-800">{d.descripcion_producto}</div>
                                            <div className="text-[11px] text-slate-500">{d.especificaciones}</div>
                                        </div>
                                        <div className="text-right">
                                            <div>{d.cantidad} unid. x S/ {Number(d.precio_unitario).toFixed(2)}</div>
                                            <div className="font-bold text-slate-900">S/ {Number(d.total_linea).toFixed(2)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                            <div className="text-slate-500 text-[11px]">RV Vega Servicios Generales E.I.R.L.</div>
                            <div className="text-right font-bold text-sm text-slate-900">
                                Total Facturado: S/ {Number(detallePedido.total).toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}