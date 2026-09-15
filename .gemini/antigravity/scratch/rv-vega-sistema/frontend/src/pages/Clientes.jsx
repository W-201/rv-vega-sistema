import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Phone, Mail, MapPin, Building, Trash2, Edit, CheckCircle } from 'lucide-react';
import { api } from '../services/api';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);

  const [formData, setFormData] = useState({
    tipo_documento: 'RUC',
    numero_documento: '',
    razon_social: '',
    contacto: '',
    telefono: '',
    email: '',
    direccion: '',
    ciudad: 'Lima'
  });

  const loadClientes = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/clientes?busqueda=${encodeURIComponent(busqueda)}`);
      setClientes(data);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientes();
  }, [busqueda]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCliente) {
        await api.put(`/clientes/${editingCliente.id}`, formData);
      } else {
        await api.post('/clientes', formData);
      }
      setShowModal(false);
      setEditingCliente(null);
      setFormData({
        tipo_documento: 'RUC',
        numero_documento: '',
        razon_social: '',
        contacto: '',
        telefono: '',
        email: '',
        direccion: '',
        ciudad: 'Lima'
      });
      loadClientes();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleEdit = (c) => {
    setEditingCliente(c);
    setFormData({
      tipo_documento: c.tipo_documento,
      numero_documento: c.numero_documento,
      razon_social: c.razon_social,
      contacto: c.contacto || '',
      telefono: c.telefono || '',
      email: c.email || '',
      direccion: c.direccion || '',
      ciudad: c.ciudad || 'Lima'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('¿Desea deshabilitar este cliente?')) {
      try {
        await api.delete(`/clientes/${id}`);
        loadClientes();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por RUC, nombre o contacto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={() => {
            setEditingCliente(null);
            setFormData({
              tipo_documento: 'RUC',
              numero_documento: '',
              razon_social: '',
              contacto: '',
              telefono: '',
              email: '',
              direccion: '',
              ciudad: 'Lima'
            });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Cliente</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Documento</th>
                <th className="px-5 py-3">Razón Social / Nombre</th>
                <th className="px-5 py-3">Contacto Directo</th>
                <th className="px-5 py-3">Teléfono / Email</th>
                <th className="px-5 py-3">Ubicación</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-slate-400">Cargando clientes...</td>
                </tr>
              ) : clientes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-slate-400">No se encontraron clientes registrados</td>
                </tr>
              ) : (
                clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3 font-mono font-bold text-slate-800">
                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[11px] mr-1.5 font-sans font-semibold">
                        {c.tipo_documento}
                      </span>
                      {c.numero_documento}
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-900">{c.razon_social}</td>
                    <td className="px-5 py-3 text-slate-700">{c.contacto || '-'}</td>
                    <td className="px-5 py-3 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{c.telefono || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{c.email || '-'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 text-slate-600">
                        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-xs">{c.direccion ? `${c.direccion}, ${c.ciudad}` : c.ciudad}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right space-x-2">
                      <button onClick={() => handleEdit(c)} className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition" title="Editar">
                        <Edit className="w-4 h-4 inline" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition" title="Deshabilitar">
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">{editingCliente ? 'Editar Datos de Cliente' : 'Registrar Nuevo Cliente'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo Doc.</label>
                  <select value={formData.tipo_documento} onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg">
                    <option value="RUC">RUC</option>
                    <option value="DNI">DNI</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Número de Documento *</label>
                  <input type="text" required value={formData.numero_documento} onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })} placeholder="20XXXXXXXXX" className="w-full p-2 border border-slate-300 rounded-lg" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Razón Social o Nombre Completo *</label>
                <input type="text" required value={formData.razon_social} onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })} placeholder="Ej. CONSTRUCTORA DEL SUR S.A.C." className="w-full p-2 border border-slate-300 rounded-lg" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Persona de Contacto</label>
                  <input type="text" value={formData.contacto} onChange={(e) => setFormData({ ...formData, contacto: e.target.value })} placeholder="Ej. Ing. Miguel Torres" className="w-full p-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teléfono Móvil</label>
                  <input type="text" value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} placeholder="987654321" className="w-full p-2 border border-slate-300 rounded-lg" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="contacto@empresa.pe" className="w-full p-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ciudad / Región</label>
                  <input type="text" value={formData.ciudad} onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })} placeholder="Lima / Callao" className="w-full p-2 border border-slate-300 rounded-lg" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dirección Fiscal / Planta</label>
                <input type="text" value={formData.direccion} onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} placeholder="Av. Ejemplo 123, Distrito" className="w-full p-2 border border-slate-300 rounded-lg" />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm">
                  {editingCliente ? 'Actualizar Cliente' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
