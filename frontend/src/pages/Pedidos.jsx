import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Filter, Calendar, Hammer, Eye, FileText, CheckCircle2, Search, Truck, Boxes } from 'lucide-react';
import { api } from '../services/api';

export default function Pedidos({ setActiveTab }) {
    const [pedidos, setPedidos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [filtroEstado, setFiltroEstado] = useState('Todos');
    const [filtroPrioridad, setFiltroPrioridad] = useState('Todos');
    const [filtroInsumos, setFiltroInsumos] = useState('Todos');
    const [busqueda, setBusqueda] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [detallePedido, setDetallePedido] = useState(null);

    const [clienteId, setClienteId] = useState('');
    const [fechaEntrega, setFechaEntrega] = useState('');
    const [prioridad, setPrioridad] = useState('Media');
    const [suministroInsumos, setSuministroInsumos] = useState('Cliente los trae');
    const [observaciones, setObservaciones] = useState('');
    const [items, setItems] = useState([
        { descripcion_producto: '', especificaciones: '', cantidad: 1, precio_unitario: 0 }
    ]);

    // Cliente seleccionado actualmente para mostrar su DNI/RUC
    const clienteSeleccionado = clientes.find(c => String(c.id) === String(clienteId));

    const loadPedidos = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filtroEstado !== 'Todos') params.append('estado', filtroEstado);
            if (filtroPrioridad !== 'Todos') params.append('prioridad', filtroPrioridad);
            if (filtroInsumos !== 'Todos') params.append('suministro_insumos', filtroInsumos);
            if (busqueda.trim()) params.append('busqueda', busqueda.trim());
            const data = await api.get(`/pedidos?${params.toString()}`);
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
    }, [filtroEstado, filtroPrioridad, filtroInsumos, busqueda]);

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
        if (!clienteId) {
            alert('Por favor, seleccione un cliente de la lista.');
            return;
        }
        try {
            await api.post('/pedidos', {
                cliente_id: clienteId,
                fecha_entrega_prometida: fechaEntrega,
                prioridad,
                suministro_insumos: suministroInsumos,
                observaciones,
                items
            });
            setShowModal(false);
            setItems([{ descripcion_producto: '', especificaciones: '', cantidad: 1, precio_unitario: 0 }]);
            setObservaciones('');
            setSuministroInsumos('Cliente los trae');
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

    const handleMarcarEntregado = async (pedido) => {
        if (confirm(`¿Confirmar entrega del pedido ${pedido.codigo_pedido} al cliente ${pedido.cliente_nombre}?`)) {
            try {
                await api.patch(`/pedidos/${pedido.id}/estado`, {
                    estado: 'Entregado',
                    fecha_entrega_real: new Date().toISOString().split('T')[0]
                });
                loadPedidos();
            } catch (err) {
                alert('Error al actualizar estado del pedido: ' + err.message);
            }
        }
    };

    // --- LÓGICA OE1: ALERTAS DE VENCIMIENTO ---
    const obtenerAlertaVencimiento = (fecha) => {
        if (!fecha) return { color: 'text-slate-700 dark:text-slate-300', mensaje: '' };
        const hoy = new Date();
        // Ajuste para comparar fechas sin horas
        hoy.setHours(0, 0, 0, 0);
        const fechaPactada = new Date(fecha + 'T00:00:00');

        const diffTime = fechaPactada - hoy;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { color: 'text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/40 px-1.5 py-0.5 rounded', mensaje: 'Vencido' };
        if (diffDays <= 3) return { color: 'text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/40 px-1.5 py-0.5 rounded', mensaje: `En ${diffDays} días` };
        return { color: 'text-slate-700 dark:text-slate-300', mensaje: '' };
    };

    const { subtotal, igv, total } = calcularTotales();

    return (
        <div className="p-8 space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            placeholder="Buscar código, cliente, RUC o producto..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Estado:</span>
                        <select
                            value={filtroEstado}
                            onChange={(e) => setFiltroEstado(e.target.value)}
                            className="text-xs p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                        >
                            <option value="Todos">Todos los Estados</option>
                            <option value="Pendiente">Pendiente</option>
                            <option value="En Planificación">En Planificación</option>
                            <option value="En Producción">En Producción</option>
                            <option value="Listo para Entrega">Listo para Entrega</option>
                            <option value="Entregado">Entregado</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Prioridad:</span>
                        <select
                            value={filtroPrioridad}
                            onChange={(e) => setFiltroPrioridad(e.target.value)}
                            className="text-xs p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                        >
                            <option value="Todos">Todas</option>
                            <option value="Urgente">Urgente</option>
                            <option value="Alta">Alta</option>
                            <option value="Media">Media</option>
                            <option value="Baja">Baja</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Insumos:</span>
                        <select
                            value={filtroInsumos}
                            onChange={(e) => setFiltroInsumos(e.target.value)}
                            className="text-xs p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                        >
                            <option value="Todos">Todos los Insumos</option>
                            <option value="Cliente los trae">Cliente los trae</option>
                            <option value="Empresa suministra">Empresa suministra</option>
                        </select>
                    </div>
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm shadow-blue-500/20 transition cursor-pointer shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Pedido</span>
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-5 py-3">Código</th>
                                <th className="px-5 py-3">Cliente</th>
                                <th className="px-5 py-3">Fecha Pactada</th>
                                <th className="px-5 py-3">Insumos</th>
                                <th className="px-5 py-3">Prioridad</th>
                                <th className="px-5 py-3">Estado</th>
                                <th className="px-5 py-3">Total (S/)</th>
                                <th className="px-5 py-3">Orden Prod. (OP)</th>
                                <th className="px-5 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="text-center py-8 text-slate-400 dark:text-slate-500">Cargando pedidos...</td>
                                </tr>
                            ) : pedidos.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="text-center py-8 text-slate-400 dark:text-slate-500">No se encontraron pedidos</td>
                                </tr>
                            ) : (
                                pedidos.map((p) => {
                                    const alerta = obtenerAlertaVencimiento(p.fecha_entrega_prometida);
                                    return (
                                        <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                                            <td className="px-5 py-3 font-mono font-bold text-blue-700 dark:text-blue-400">{p.codigo_pedido}</td>
                                            <td className="px-5 py-3">
                                                <div className="font-semibold text-slate-900 dark:text-slate-100">{p.cliente_nombre}</div>
                                                {p.cliente_doc && <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{p.cliente_doc}</div>}
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                                        <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                                        <span>{p.fecha_entrega_prometida}</span>
                                                    </div>
                                                    {alerta.mensaje && p.estado !== 'Entregado' && (
                                                        <span className={`text-[10px] w-fit ${alerta.color}`}>{alerta.mensaje}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                {p.suministro_insumos === 'Empresa suministra' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60" title="RV Vega suministra / compra los insumos">
                                                        <ShoppingBag className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                                        <span>Empresa suministra</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60" title="El comprador provee los insumos (modalidad habitual)">
                                                        <Boxes className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                                        <span>Cliente los trae</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                                                    p.prioridad === 'Urgente' 
                                                        ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/50' 
                                                        : p.prioridad === 'Alta' 
                                                        ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50' 
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                                }`}>
                                                    {p.prioridad}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                                                    p.estado === 'Entregado' 
                                                        ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50' 
                                                        : p.estado === 'Listo para Entrega'
                                                        ? 'bg-teal-100 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-900/50'
                                                        : p.estado === 'En Producción' 
                                                        ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900/50' 
                                                        : p.estado === 'En Planificación' 
                                                        ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-900/50' 
                                                        : 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900/50'
                                                }`}>
                                                    {p.estado}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 font-bold text-slate-900 dark:text-slate-100">
                                                S/ {p.total?.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-5 py-3">
                                                {p.codigo_op ? (
                                                    <div className="space-y-1">
                                                        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 text-[11px]">{p.codigo_op}</span>
                                                        <div className="w-20 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                                            <div className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full" style={{ width: `${p.op_avance || 0}%` }}></div>
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
                                            <td className="px-5 py-3 text-right space-x-1 whitespace-nowrap">
                                                {p.estado !== 'Entregado' && (
                                                    <button
                                                        onClick={() => handleMarcarEntregado(p)}
                                                        className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded transition cursor-pointer"
                                                        title="Confirmar Entrega al Cliente"
                                                    >
                                                        <Truck className="w-4 h-4 inline" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={async () => {
                                                        const det = await api.get(`/pedidos/${p.id}`);
                                                        setDetallePedido(det);
                                                    }}
                                                    className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded transition cursor-pointer"
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
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 dark:border-slate-800 my-8 transition-colors">
                        <div className="bg-slate-900 dark:bg-slate-950 px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
                            <h3 className="font-bold text-sm">Registrar Nuevo Pedido / Cotización</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
                        </div>

                        <form onSubmit={handleCreatePedido} className="p-6 space-y-4 text-xs">

                            {/* BLOQUE OE1: CÓDIGO AUTOGENERADO Y FECHA */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Código de Pedido</label>
                                    <input
                                        type="text"
                                        disabled
                                        value="AUTOGENERADO AL GUARDAR"
                                        className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono text-center font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Fecha Entrega *</label>
                                    <input
                                        type="date"
                                        required
                                        value={fechaEntrega}
                                        onChange={(e) => setFechaEntrega(e.target.value)}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* SELECCIÓN DE CLIENTE Y MOSTRAR DNI / RUC */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Cliente *</label>
                                    <select
                                        value={clienteId}
                                        onChange={(e) => setClienteId(e.target.value)}
                                        required
                                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">Seleccione un cliente...</option>
                                        {clientes.map(c => (
                                            <option key={c.id} value={c.id}>{c.razon_social}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">DNI / RUC del Cliente</label>
                                    <div className="relative flex items-center">
                                        <input
                                            type="text"
                                            readOnly
                                            disabled
                                            value={clienteSeleccionado ? clienteSeleccionado.numero_documento : ''}
                                            placeholder="Seleccione un cliente para ver su documento"
                                            className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 font-mono font-bold outline-none cursor-not-allowed"
                                        />
                                        {clienteSeleccionado && (
                                            <span className="absolute right-2 px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 uppercase tracking-wide border border-blue-200 dark:border-blue-900/40">
                                                {clienteSeleccionado.tipo_documento}
                                            </span>
                                        )}
                                    </div>
                                    {clienteSeleccionado && (
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                            Contacto: <span className="font-semibold text-slate-700 dark:text-slate-300">{clienteSeleccionado.contacto || 'Sin contacto'}</span> • Tel: <span className="font-semibold text-slate-700 dark:text-slate-300">{clienteSeleccionado.telefono || 'Sin teléfono'}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nivel de Prioridad</label>
                                <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="Baja">Baja</option>
                                    <option value="Media">Media</option>
                                    <option value="Alta">Alta</option>
                                    <option value="Urgente">Urgente</option>
                                </select>
                            </div>

                            {/* SUMINISTRO DE INSUMOS Y MATERIA PRIMA */}
                            <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between">
                                    <label className="block font-semibold text-slate-800 dark:text-slate-200">
                                        Suministro de Insumos / Materia Prima *
                                    </label>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Especifique quién provee los materiales
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    {/* Opción 1: Cliente los trae (Por defecto / Habitual) */}
                                    <div
                                        onClick={() => setSuministroInsumos('Cliente los trae')}
                                        className={`p-3 rounded-xl border-2 text-left transition flex items-start gap-3 cursor-pointer ${
                                            suministroInsumos === 'Cliente los trae'
                                                ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 dark:border-blue-500 shadow-sm'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/60'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            id="insumo_cliente"
                                            name="suministro_insumos"
                                            checked={suministroInsumos === 'Cliente los trae'}
                                            onChange={() => setSuministroInsumos('Cliente los trae')}
                                            className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <label htmlFor="insumo_cliente" className="cursor-pointer flex-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                                    Ellos los traen
                                                </span>
                                                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold border border-emerald-300 dark:border-emerald-800">
                                                    Habitual
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                                                El comprador provee los materiales. El taller solo cotiza mano de obra y fabricación.
                                            </p>
                                        </label>
                                    </div>

                                    {/* Opción 2: Compra por nuestra parte */}
                                    <div
                                        onClick={() => setSuministroInsumos('Empresa suministra')}
                                        className={`p-3 rounded-xl border-2 text-left transition flex items-start gap-3 cursor-pointer ${
                                            suministroInsumos === 'Empresa suministra'
                                                ? 'border-purple-600 bg-purple-50/80 dark:bg-purple-950/40 dark:border-purple-500 shadow-sm'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/60'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            id="insumo_empresa"
                                            name="suministro_insumos"
                                            checked={suministroInsumos === 'Empresa suministra'}
                                            onChange={() => setSuministroInsumos('Empresa suministra')}
                                            className="mt-0.5 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                        />
                                        <label htmlFor="insumo_empresa" className="cursor-pointer flex-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <ShoppingBag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                                    Compra por nuestra parte
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                                                Se añade la compra de insumos; RV Vega cotiza, adquiere y suministra los materiales.
                                            </p>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="border border-slate-200 dark:border-slate-750 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200">Ítems / Productos Solicitados</h4>
                                    <button type="button" onClick={handleAddItem} className="text-[11px] bg-blue-600 text-white font-semibold px-2 py-1 rounded hover:bg-blue-700 shadow-sm cursor-pointer">+ Agregar Ítem</button>
                                </div>

                                {items.map((it, idx) => (
                                    <div key={idx} className="p-2.5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2">
                                        <div className="grid grid-cols-12 gap-2">
                                            <div className="col-span-6">
                                                <input type="text" required placeholder="Descripción del producto o servicio" value={it.descripcion_producto} onChange={(e) => handleItemChange(idx, 'descripcion_producto', e.target.value)} className="w-full p-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
                                            </div>
                                            <div className="col-span-2">
                                                <input type="number" min="1" required placeholder="Cant." value={it.cantidad} onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)} className="w-full p-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs text-center focus:ring-2 focus:ring-blue-500 outline-none" />
                                            </div>
                                            <div className="col-span-3">
                                                <input type="number" step="0.01" min="0" required placeholder="P. Unitario (S/)" value={it.precio_unitario} onChange={(e) => handleItemChange(idx, 'precio_unitario', e.target.value)} className="w-full p-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs text-right focus:ring-2 focus:ring-blue-500 outline-none" />
                                            </div>
                                            <div className="col-span-1 text-center">
                                                {items.length > 1 && (
                                                    <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700 text-base">✕</button>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <input type="text" placeholder="Especificaciones técnicas (medidas, material, norma)" value={it.especificaciones} onChange={(e) => handleItemChange(idx, 'especificaciones', e.target.value)} className="w-full p-1.5 border border-slate-200 dark:border-slate-700 rounded text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                    </div>
                                ))}

                                <div className="text-right space-y-0.5 pt-2 text-xs text-slate-700 dark:text-slate-300">
                                    <div>Subtotal: <span className="font-semibold text-slate-900 dark:text-slate-100">S/ {subtotal.toFixed(2)}</span></div>
                                    <div>I.G.V. (18%): <span className="font-semibold text-slate-900 dark:text-slate-100">S/ {igv.toFixed(2)}</span></div>
                                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Total: S/ {total.toFixed(2)}</div>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Observaciones</label>
                                <textarea rows="2" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Condiciones especiales, lugar de despacho..." className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>

                            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm">Guardar Pedido</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {detallePedido && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 dark:border-slate-800 p-6 space-y-4 text-xs transition-colors">
                        <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-3">
                            <div>
                                <span className="font-mono text-sm font-bold text-blue-700 dark:text-blue-400">{detallePedido.codigo_pedido}</span>
                                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">{detallePedido.cliente?.razon_social}</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-[11px]">{detallePedido.cliente?.tipo_documento}: {detallePedido.cliente?.numero_documento}</p>
                            </div>
                            <button onClick={() => setDetallePedido(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg">✕</button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                            <div>Fecha Pedido: <span className="font-semibold text-slate-900 dark:text-slate-100">{detallePedido.fecha_pedido}</span></div>
                            <div>Fecha Entrega: <span className="font-semibold text-slate-900 dark:text-slate-100">{detallePedido.fecha_entrega_prometida}</span></div>
                            <div>Estado: <span className="font-bold text-blue-600 dark:text-blue-400">{detallePedido.estado}</span></div>
                            <div>Prioridad: <span className="font-semibold text-slate-900 dark:text-slate-100">{detallePedido.prioridad}</span></div>
                        </div>

                        {/* BANNER DE SUMINISTRO DE INSUMOS */}
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {detallePedido.suministro_insumos === 'Empresa suministra' ? (
                                    <ShoppingBag className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                ) : (
                                    <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                )}
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
                                        Suministro de Insumos
                                    </span>
                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                        {detallePedido.suministro_insumos === 'Empresa suministra'
                                            ? 'Compra de insumos por nuestra parte (RV Vega)'
                                            : 'Insumos provistos por el cliente (Ellos los traen)'}
                                    </span>
                                </div>
                            </div>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                                detallePedido.suministro_insumos === 'Empresa suministra'
                                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            }`}>
                                {detallePedido.suministro_insumos || 'Cliente los trae'}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200">Desglose de Ítems</h4>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                {detallePedido.detalles?.map(d => (
                                    <div key={d.id} className="p-2.5 flex justify-between items-center bg-white dark:bg-slate-850">
                                        <div>
                                            <div className="font-semibold text-slate-800 dark:text-slate-200">{d.descripcion_producto}</div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{d.especificaciones}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-slate-600 dark:text-slate-300">{d.cantidad} unid. x S/ {Number(d.precio_unitario).toFixed(2)}</div>
                                            <div className="font-bold text-slate-900 dark:text-slate-100">S/ {Number(d.total_linea).toFixed(2)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800 pt-3">
                            <div className="text-slate-500 dark:text-slate-400 text-[11px]">RV Vega Servicios Generales E.I.R.L.</div>
                            <div className="text-right font-bold text-sm text-slate-900 dark:text-slate-100">
                                Total Facturado: S/ {Number(detallePedido.total).toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}