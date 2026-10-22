import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Boxes, Plus, AlertTriangle, ArrowDownLeft, ArrowUpRight, History, Search, CheckCircle, Edit2, Trash2 } from 'lucide-react';
import { api } from '../services/api';

export default function Inventario() {
    const [materiales, setMateriales] = useState([]);
    const [kardex, setKardex] = useState([]);
    const [tab, setTab] = useState('materiales'); // 'materiales' | 'kardex'
    const [categoria, setCategoria] = useState('Todas');
    const [soloAlertas, setSoloAlertas] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [loading, setLoading] = useState(true);

    // Modales
    const [showMaterialModal, setShowMaterialModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState(null);
    const [editForm, setEditForm] = useState({
        codigo_sku: '',
        nombre: '',
        categoria: 'Metales/Perfiles',
        unidad_medida: 'und',
        stock_actual: 0,
        stock_minimo: 5,
        costo_unitario: 0,
        ubicacion_almacen: 'Almacén Central'
    });
    const [deletingId, setDeletingId] = useState(null);
    const [showMovimientoModal, setShowMovimientoModal] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);

    const [materialForm, setMaterialForm] = useState({
        codigo_sku: '',
        nombre: '',
        categoria: 'Metales/Perfiles',
        unidad_medida: 'und',
        stock_actual: 0,
        stock_minimo: 5,
        costo_unitario: 0,
        ubicacion_almacen: 'Almacén Central'
    });

    const [movimientoForm, setMovimientoForm] = useState({
        material_id: '',
        tipo_movimiento: 'ENTRADA',
        cantidad: 1,
        motivo: 'Compra de reposición',
        referencia_documento: ''
    });

    const loadData = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();
            if (categoria !== 'Todas') queryParams.append('categoria', categoria);
            if (soloAlertas) queryParams.append('alerta_stock', 'true');
            if (busqueda) queryParams.append('busqueda', busqueda);

            const mats = await api.get(`/inventario?${queryParams.toString()}`);
            setMateriales(mats);

            const kdx = await api.get('/inventario/kardex');
            setKardex(kdx);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [categoria, soloAlertas, busqueda]);

    const handleCreateMaterial = async (e) => {
        e.preventDefault();
        try {
            await api.post('/inventario', materialForm);
            setShowMaterialModal(false);
            setMaterialForm({
                codigo_sku: '',
                nombre: '',
                categoria: 'Metales/Perfiles',
                unidad_medida: 'und',
                stock_actual: 0,
                stock_minimo: 5,
                costo_unitario: 0,
                ubicacion_almacen: 'Almacén Central'
            });
            loadData();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const handleOpenEdit = (m) => {
        setEditingMaterial(m);
        setEditForm({
            codigo_sku: m.codigo_sku,
            nombre: m.nombre,
            categoria: m.categoria,
            unidad_medida: m.unidad_medida,
            stock_actual: m.stock_actual,
            stock_minimo: m.stock_minimo,
            costo_unitario: m.costo_unitario,
            ubicacion_almacen: m.ubicacion_almacen || 'Almacén Central'
        });
        setShowEditModal(true);
    };

    const handleUpdateMaterial = async (e) => {
        e.preventDefault();
        if (!editingMaterial) return;
        try {
            const res = await api.put(`/inventario/${editingMaterial.id}`, editForm);
            setShowEditModal(false);
            setEditingMaterial(null);
            await loadData();
            alert(res.mensaje || 'Insumo actualizado exitosamente');
        } catch (err) {
            alert('Error al actualizar insumo: ' + err.message);
        }
    };

    const handleDeleteMaterial = async (m) => {
        const confirmMsg = `¿Estás seguro de que deseas eliminar o retirar el insumo "${m.nombre}" (${m.codigo_sku})?\n\n- Si fue un error de digitación y NO tiene movimientos en el Kardex, se eliminará definitivamente.\n- Si ya tiene movimientos registrados, se retirará del catálogo activo de almacén para proteger la trazabilidad contable.`;
        if (!window.confirm(confirmMsg)) return;

        try {
            setDeletingId(m.id);
            const res = await api.delete(`/inventario/${m.id}`);
            alert(res.mensaje || 'Insumo procesado con éxito');
            await loadData();
        } catch (err) {
            alert('Error al eliminar material: ' + err.message);
        } finally {
            setDeletingId(null);
        }
    };

    const handleCreateMovimiento = async (e) => {
        e.preventDefault();
        try {
            await api.post('/inventario/movimiento', movimientoForm);
            setShowMovimientoModal(false);
            loadData();
            alert('Movimiento de almacén registrado con éxito');
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const openMovimientoPara = (m, tipo) => {
        setSelectedMaterial(m);
        setMovimientoForm({
            material_id: m.id,
            tipo_movimiento: tipo,
            cantidad: 1,
            motivo: tipo === 'ENTRADA' ? 'Ingreso de mercadería' : 'Despacho a taller',
            referencia_documento: ''
        });
        setShowMovimientoModal(true);
    };

    // --- LÓGICA OE3: CÁLCULO DE ESTADO DE STOCK ---
    const obtenerEstadoStock = (actual, minimo) => {
        const act = Number(actual);
        const min = Number(minimo);
        if (act <= min) {
            return {
                texto: 'Stock Crítico',
                bg: 'bg-red-100 dark:bg-red-950/60',
                text: 'text-red-700 dark:text-red-400',
                border: 'border-red-200 dark:border-red-800/50',
                icon: <AlertTriangle className="w-3.5 h-3.5" />
            };
        }
        if (act <= min * 1.3) {
            return {
                texto: 'Stock Bajo',
                bg: 'bg-amber-100 dark:bg-amber-950/60',
                text: 'text-amber-700 dark:text-amber-400',
                border: 'border-amber-200 dark:border-amber-800/50',
                icon: <AlertTriangle className="w-3.5 h-3.5" />
            };
        }
        return {
            texto: 'Óptimo',
            bg: 'bg-emerald-100 dark:bg-emerald-950/60',
            text: 'text-emerald-700 dark:text-emerald-400',
            border: 'border-emerald-200 dark:border-emerald-800/50',
            icon: <CheckCircle className="w-3.5 h-3.5" />
        };
    };

    // Filtrado local por si el backend no procesa el queryParam "alerta_stock"
    const materialesFiltrados = soloAlertas
        ? materiales.filter(m => Number(m.stock_actual) <= Number(m.stock_minimo))
        : materiales;

    return (
        <div className="p-8 space-y-6">
            {/* Tab Switcher & Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setTab('materiales')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            tab === 'materiales'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        Catálogo de Insumos
                    </button>
                    <button
                        onClick={() => setTab('kardex')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            tab === 'kardex'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        <History className="w-3.5 h-3.5" />
                        <span>Kardex / Movimientos</span>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowMaterialModal(true)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nuevo Material</span>
                    </button>
                </div>
            </div>

            {tab === 'materiales' ? (
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-sm transition">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                placeholder="Buscar por código SKU, nombre o categoría..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <select
                            value={categoria}
                            onChange={(e) => setCategoria(e.target.value)}
                            className="p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="Todas">Todas las Categorías</option>
                            <option value="Metales/Perfiles">Metales / Perfiles</option>
                            <option value="Soldadura/Consumibles">Soldadura / Consumibles</option>
                            <option value="Pinturas/Acabados">Pinturas / Acabados</option>
                            <option value="Fijaciones/Tornillería">Fijaciones / Tornillería</option>
                        </select>

                        <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer bg-red-50 dark:bg-red-950/40 px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-900/40 hover:bg-red-100 dark:hover:bg-red-900/60 transition">
                            <input
                                type="checkbox"
                                checked={soloAlertas}
                                onChange={(e) => setSoloAlertas(e.target.checked)}
                                className="rounded text-red-600 focus:ring-red-500"
                            />
                            <span className="text-red-700 dark:text-red-400 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Solo Stock Crítico
                            </span>
                        </label>
                    </div>

                    {/* Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 uppercase font-semibold border-b border-slate-200 dark:border-slate-700/80">
                                    <tr>
                                        <th className="px-5 py-3">Código SKU</th>
                                        <th className="px-5 py-3">Insumo / Ubicación</th>
                                        <th className="px-5 py-3">Categoría</th>
                                        <th className="px-5 py-3">Estado (OE3)</th>
                                        <th className="px-5 py-3">Stock Actual</th>
                                        <th className="px-5 py-3">Stock Mín.</th>
                                        <th className="px-5 py-3">Valor Total</th>
                                        <th className="px-5 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="8" className="text-center py-8 text-slate-400">Cargando inventario...</td>
                                        </tr>
                                    ) : materialesFiltrados.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="text-center py-8 text-slate-400 flex flex-col items-center gap-2">
                                                <Boxes className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                                No se encontraron materiales con los filtros actuales
                                            </td>
                                        </tr>
                                    ) : (
                                        materialesFiltrados.map((m) => {
                                            const estado = obtenerEstadoStock(m.stock_actual, m.stock_minimo);
                                            return (
                                                <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                                                    <td className="px-5 py-3 font-mono font-bold text-slate-900 dark:text-white">{m.codigo_sku}</td>
                                                    <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">
                                                        {m.nombre}
                                                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Ubic: {m.ubicacion_almacen}</div>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                                                            {m.categoria}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <span className={`flex items-center gap-1 w-fit px-2 py-1 rounded border ${estado.bg} ${estado.text} ${estado.border} font-bold text-[10px]`}>
                                                            {estado.icon}
                                                            {estado.texto}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <span className={`font-bold text-sm ${estado.texto === 'Stock Crítico' ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                                                            {m.stock_actual} <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">{m.unidad_medida}</span>
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 font-medium text-slate-500 dark:text-slate-400">
                                                        {m.stock_minimo} {m.unidad_medida}
                                                    </td>
                                                    <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">
                                                        S/ {Number(m.valor_total).toFixed(2)}
                                                    </td>
                                                    <td className="px-5 py-3 text-right space-x-1.5 whitespace-nowrap">
                                                        <button
                                                            onClick={() => openMovimientoPara(m, 'ENTRADA')}
                                                            className="px-2 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 shadow-sm cursor-pointer"
                                                            title="Ingreso de Stock"
                                                        >
                                                            <ArrowDownLeft className="w-3.5 h-3.5" />
                                                            Entrada
                                                        </button>
                                                        <button
                                                            onClick={() => openMovimientoPara(m, 'SALIDA_PRODUCCION')}
                                                            className="px-2 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 shadow-sm cursor-pointer"
                                                            title="Salida a Taller"
                                                        >
                                                            <ArrowUpRight className="w-3.5 h-3.5" />
                                                            Salida
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenEdit(m)}
                                                            className="px-2 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 shadow-sm cursor-pointer"
                                                            title="Editar Insumo (Corregir digitación)"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                            Editar
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteMaterial(m)}
                                                            disabled={deletingId === m.id}
                                                            className="px-2 py-1.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
                                                            title="Eliminar Insumo"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            Eliminar
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
                </div>
            ) : (
                /* Kardex Table */
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 uppercase font-semibold border-b border-slate-200 dark:border-slate-700/80">
                                <tr>
                                    <th className="px-5 py-3">Fecha</th>
                                    <th className="px-5 py-3">Tipo Movimiento</th>
                                    <th className="px-5 py-3">Insumo</th>
                                    <th className="px-5 py-3">Cantidad</th>
                                    <th className="px-5 py-3">Documento Ref.</th>
                                    <th className="px-5 py-3">Motivo</th>
                                    <th className="px-5 py-3">Usuario</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {kardex.map((k) => (
                                    <tr key={k.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                                        <td className="px-5 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                            {new Date(k.fecha).toLocaleString('es-PE')}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                k.tipo_movimiento === 'ENTRADA'
                                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
                                                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50'
                                            }`}>
                                                {k.tipo_movimiento}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">
                                            {k.material_nombre} <span className="font-mono font-normal text-slate-400 dark:text-slate-500">({k.material_sku})</span>
                                        </td>
                                        <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">
                                            {k.tipo_movimiento === 'ENTRADA' ? '+' : '-'}{k.cantidad} {k.unidad_medida}
                                        </td>
                                        <td className="px-5 py-3 font-mono text-slate-700 dark:text-slate-300">
                                            {k.referencia_documento || '-'}
                                        </td>
                                        <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{k.motivo}</td>
                                        <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{k.usuario_nombre}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Nuevo Material */}
            {showMaterialModal && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm z-[999] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800">
                        <div className="bg-slate-900 dark:bg-slate-950 px-6 py-4 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                            <h3 className="font-bold text-sm">Registrar Insumo / Materia Prima</h3>
                            <button onClick={() => setShowMaterialModal(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
                        </div>

                        <form onSubmit={handleCreateMaterial} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Código SKU *</label>
                                    <input type="text" required value={materialForm.codigo_sku} onChange={(e) => setMaterialForm({ ...materialForm, codigo_sku: e.target.value })} placeholder="MP-XXX-001" className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
                                    <select value={materialForm.categoria} onChange={(e) => setMaterialForm({ ...materialForm, categoria: e.target.value })} className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                        <option value="Metales/Perfiles">Metales/Perfiles</option>
                                        <option value="Soldadura/Consumibles">Soldadura/Consumibles</option>
                                        <option value="Pinturas/Acabados">Pinturas/Acabados</option>
                                        <option value="Fijaciones/Tornillería">Fijaciones/Tornillería</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nombre Completo del Insumo *</label>
                                <input type="text" required value={materialForm.nombre} onChange={(e) => setMaterialForm({ ...materialForm, nombre: e.target.value })} placeholder="Ej. Plancha LAC 1/4 x 1.20 x 2.40m" className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>

                            <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Und. Medida</label>
                                    <input type="text" required value={materialForm.unidad_medida} onChange={(e) => setMaterialForm({ ...materialForm, unidad_medida: e.target.value })} placeholder="kg, m, und" className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Stock Inicial</label>
                                    <input type="number" step="0.1" value={materialForm.stock_actual} onChange={(e) => setMaterialForm({ ...materialForm, stock_actual: e.target.value })} className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block font-bold text-red-600 dark:text-red-400 mb-1">Stock Mínimo (Alerta)</label>
                                    <input type="number" step="0.1" value={materialForm.stock_minimo} onChange={(e) => setMaterialForm({ ...materialForm, stock_minimo: e.target.value })} className="w-full p-2 border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Costo Unitario (S/)</label>
                                    <input type="number" step="0.01" value={materialForm.costo_unitario} onChange={(e) => setMaterialForm({ ...materialForm, costo_unitario: e.target.value })} className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ubicación en Almacén</label>
                                    <input type="text" value={materialForm.ubicacion_almacen} onChange={(e) => setMaterialForm({ ...materialForm, ubicacion_almacen: e.target.value })} placeholder="Nave A / Racks" className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>

                            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onClick={() => setShowMaterialModal(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm">Guardar Insumo</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal Editar Insumo / Corregir Digitación */}
            {showEditModal && editingMaterial && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm z-[999] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800">
                        <div className="bg-slate-900 dark:bg-slate-950 px-6 py-4 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                            <div className="flex items-center gap-2">
                                <Edit2 className="w-4 h-4 text-blue-400" />
                                <h3 className="font-bold text-sm">Editar Insumo / Corregir Digitación</h3>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
                        </div>

                        <form onSubmit={handleUpdateMaterial} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Código SKU *</label>
                                    <input
                                        type="text"
                                        required
                                        value={editForm.codigo_sku}
                                        onChange={(e) => setEditForm({ ...editForm, codigo_sku: e.target.value })}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
                                    <select
                                        value={editForm.categoria}
                                        onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="Metales/Perfiles">Metales/Perfiles</option>
                                        <option value="Soldadura/Consumibles">Soldadura/Consumibles</option>
                                        <option value="Pinturas/Acabados">Pinturas/Acabados</option>
                                        <option value="Fijaciones/Tornillería">Fijaciones/Tornillería</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nombre Completo del Insumo *</label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.nombre}
                                    onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                                    className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Und. Medida</label>
                                    <input
                                        type="text"
                                        required
                                        value={editForm.unidad_medida}
                                        onChange={(e) => setEditForm({ ...editForm, unidad_medida: e.target.value })}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Stock en Planta</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={editForm.stock_actual}
                                        onChange={(e) => setEditForm({ ...editForm, stock_actual: e.target.value })}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-red-600 dark:text-red-400 mb-1">Stock Mínimo (Alerta)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={editForm.stock_minimo}
                                        onChange={(e) => setEditForm({ ...editForm, stock_minimo: e.target.value })}
                                        className="w-full p-2 border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Costo Unitario (S/)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editForm.costo_unitario}
                                        onChange={(e) => setEditForm({ ...editForm, costo_unitario: e.target.value })}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ubicación en Almacén</label>
                                    <input
                                        type="text"
                                        value={editForm.ubicacion_almacen}
                                        onChange={(e) => setEditForm({ ...editForm, ubicacion_almacen: e.target.value })}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm"
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal Registrar Movimiento (Entrada / Salida) */}
            {showMovimientoModal && selectedMaterial && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm z-[999] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800 p-6 space-y-4 text-xs">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                            Registrar Movimiento: <span className="text-blue-600 dark:text-blue-400">{selectedMaterial.nombre}</span>
                        </h3>

                        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60 flex justify-between items-center">
                            <span className="text-slate-600 dark:text-slate-300 font-semibold">Stock Actual:</span>
                            <span className="font-bold text-sm text-slate-900 dark:text-white">{selectedMaterial.stock_actual} {selectedMaterial.unidad_medida}</span>
                        </div>

                        <form onSubmit={handleCreateMovimiento} className="space-y-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipo de Movimiento</label>
                                <select
                                    value={movimientoForm.tipo_movimiento}
                                    onChange={(e) => setMovimientoForm({ ...movimientoForm, tipo_movimiento: e.target.value })}
                                    className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="ENTRADA">ENTRADA (Compra / Ingreso)</option>
                                    <option value="SALIDA_PRODUCCION">SALIDA A PRODUCCIÓN (Consumo en taller)</option>
                                    <option value="AJUSTE_POSITIVO">AJUSTE POSITIVO</option>
                                    <option value="AJUSTE_NEGATIVO">AJUSTE NEGATIVO</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Cantidad a Mover ({selectedMaterial.unidad_medida})</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    max={movimientoForm.tipo_movimiento.includes('SALIDA') || movimientoForm.tipo_movimiento === 'AJUSTE_NEGATIVO' ? selectedMaterial.stock_actual : undefined}
                                    required
                                    value={movimientoForm.cantidad}
                                    onChange={(e) => setMovimientoForm({ ...movimientoForm, cantidad: e.target.value })}
                                    className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Documento de Referencia</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Factura F001-1290 / OP-2026-003"
                                    value={movimientoForm.referencia_documento}
                                    onChange={(e) => setMovimientoForm({ ...movimientoForm, referencia_documento: e.target.value })}
                                    className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Motivo</label>
                                <input
                                    type="text"
                                    value={movimientoForm.motivo}
                                    onChange={(e) => setMovimientoForm({ ...movimientoForm, motivo: e.target.value })}
                                    className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onClick={() => setShowMovimientoModal(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm">Confirmar Operación</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}