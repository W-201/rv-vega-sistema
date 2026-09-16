import React, { useState, useEffect } from 'react';
import { Boxes, Plus, AlertTriangle, ArrowDownLeft, ArrowUpRight, History, Search } from 'lucide-react';
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

  return (
    <div className="p-8 space-y-6">
      {/* Tab Switcher & Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('materiales')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              tab === 'materiales' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Catálogo de Insumos
          </button>
          <button
            onClick={() => setTab('kardex')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              tab === 'kardex' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Kardex / Movimientos</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMaterialModal(true)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Material</span>
          </button>
        </div>
      </div>

      {tab === 'materiales' ? (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por código SKU, nombre o categoría..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="p-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium"
            >
              <option value="Todas">Todas las Categorías</option>
              <option value="Metales/Perfiles">Metales / Perfiles</option>
              <option value="Soldadura/Consumibles">Soldadura / Consumibles</option>
              <option value="Pinturas/Acabados">Pinturas / Acabados</option>
              <option value="Fijaciones/Tornillería">Fijaciones / Tornillería</option>
            </select>

            <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={soloAlertas}
                onChange={(e) => setSoloAlertas(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span className="text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Solo Stock Crítico
              </span>
            </label>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Código SKU</th>
                    <th className="px-5 py-3">Nombre del Material</th>
                    <th className="px-5 py-3">Categoría</th>
                    <th className="px-5 py-3">Stock Actual</th>
                    <th className="px-5 py-3">Stock Mínimo</th>
                    <th className="px-5 py-3">Costo Unitario</th>
                    <th className="px-5 py-3">Valor Total</th>
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="text-center py-8 text-slate-400">Cargando inventario...</td>
                    </tr>
                  ) : materiales.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-8 text-slate-400">No se encontraron materiales</td>
                    </tr>
                  ) : (
                    materiales.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-5 py-3 font-mono font-bold text-slate-900">{m.codigo_sku}</td>
                        <td className="px-5 py-3 font-semibold text-slate-900">
                          {m.nombre}
                          <div className="text-[10px] text-slate-400">{m.ubicacion_almacen}</div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
                            {m.categoria}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className={m.en_alerta ? 'text-red-600' : 'text-slate-900'}>
                              {m.stock_actual} {m.unidad_medida}
                            </span>
                            {m.en_alerta && (
                              <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded font-bold">
                                Crítico
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 font-medium text-slate-500">
                          {m.stock_minimo} {m.unidad_medida}
                        </td>
                        <td className="px-5 py-3 text-slate-700">
                          S/ {Number(m.costo_unitario).toFixed(2)}
                        </td>
                        <td className="px-5 py-3 font-bold text-slate-900">
                          S/ {Number(m.valor_total).toFixed(2)}
                        </td>
                        <td className="px-5 py-3 text-right space-x-1.5">
                          <button
                            onClick={() => openMovimientoPara(m, 'ENTRADA')}
                            className="p-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-semibold"
                            title="Ingreso de Stock"
                          >
                            + Entrada
                          </button>
                          <button
                            onClick={() => openMovimientoPara(m, 'SALIDA_PRODUCCION')}
                            className="p-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-[11px] font-semibold"
                            title="Salida a Taller"
                          >
                            - Salida
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Kardex Table */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
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
              <tbody className="divide-y divide-slate-100">
                {kardex.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-500">
                      {new Date(k.fecha).toLocaleString('es-PE')}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        k.tipo_movimiento === 'ENTRADA' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {k.tipo_movimiento}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      {k.material_nombre} ({k.material_sku})
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-900">
                      {k.cantidad} {k.unidad_medida}
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-700">
                      {k.referencia_documento || '-'}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{k.motivo}</td>
                    <td className="px-5 py-3 text-slate-500">{k.usuario_nombre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nuevo Material */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Registrar Insumo / Materia Prima</h3>
              <button onClick={() => setShowMaterialModal(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>

            <form onSubmit={handleCreateMaterial} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Código SKU *</label>
                  <input type="text" required value={materialForm.codigo_sku} onChange={(e) => setMaterialForm({ ...materialForm, codigo_sku: e.target.value })} placeholder="MP-XXX-001" className="w-full p-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Categoría</label>
                  <select value={materialForm.categoria} onChange={(e) => setMaterialForm({ ...materialForm, categoria: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg">
                    <option value="Metales/Perfiles">Metales/Perfiles</option>
                    <option value="Soldadura/Consumibles">Soldadura/Consumibles</option>
                    <option value="Pinturas/Acabados">Pinturas/Acabados</option>
                    <option value="Fijaciones/Tornillería">Fijaciones/Tornillería</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre Completo del Insumo *</label>
                <input type="text" required value={materialForm.nombre} onChange={(e) => setMaterialForm({ ...materialForm, nombre: e.target.value })} placeholder="Ej. Plancha LAC 1/4 x 1.20 x 2.40m" className="w-full p-2 border border-slate-300 rounded-lg" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unidad Medida</label>
                  <input type="text" required value={materialForm.unidad_medida} onChange={(e) => setMaterialForm({ ...materialForm, unidad_medida: e.target.value })} placeholder="kg, m, galón" className="w-full p-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stock Inicial</label>
                  <input type="number" step="0.1" value={materialForm.stock_actual} onChange={(e) => setMaterialForm({ ...materialForm, stock_actual: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stock Mínimo</label>
                  <input type="number" step="0.1" value={materialForm.stock_minimo} onChange={(e) => setMaterialForm({ ...materialForm, stock_minimo: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Costo Unitario (S/)</label>
                  <input type="number" step="0.01" value={materialForm.costo_unitario} onChange={(e) => setMaterialForm({ ...materialForm, costo_unitario: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ubicación en Almacén</label>
                  <input type="text" value={materialForm.ubicacion_almacen} onChange={(e) => setMaterialForm({ ...materialForm, ubicacion_almacen: e.target.value })} placeholder="Nave A / Racks" className="w-full p-2 border border-slate-300 rounded-lg" />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowMaterialModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg">Guardar Insumo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Movimiento (Entrada / Salida) */}
      {showMovimientoModal && selectedMaterial && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 p-6 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900">
              Registrar Movimiento: <span className="text-blue-600">{selectedMaterial.nombre}</span>
            </h3>

            <form onSubmit={handleCreateMovimiento} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tipo de Movimiento</label>
                <select
                  value={movimientoForm.tipo_movimiento}
                  onChange={(e) => setMovimientoForm({ ...movimientoForm, tipo_movimiento: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                >
                  <option value="ENTRADA">ENTRADA (Compra / Ingreso)</option>
                  <option value="SALIDA_PRODUCCION">SALIDA A PRODUCCIÓN (Consumo en taller)</option>
                  <option value="AJUSTE_POSITIVO">AJUSTE POSITIVO</option>
                  <option value="AJUSTE_NEGATIVO">AJUSTE NEGATIVO</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cantidad ({selectedMaterial.unidad_medida})</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={movimientoForm.cantidad}
                  onChange={(e) => setMovimientoForm({ ...movimientoForm, cantidad: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Documento de Referencia</label>
                <input
                  type="text"
                  placeholder="Ej. Factura F001-1290 / OP-2026-003"
                  value={movimientoForm.referencia_documento}
                  onChange={(e) => setMovimientoForm({ ...movimientoForm, referencia_documento: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motivo</label>
                <input
                  type="text"
                  value={movimientoForm.motivo}
                  onChange={(e) => setMovimientoForm({ ...movimientoForm, motivo: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowMovimientoModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg">Confirmar Operación</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
