import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, Phone, Mail, MapPin, Trash2, Edit, ChevronDown, Check } from 'lucide-react';
import { api } from '../services/api';

// Lista oficial de los 24 departamentos del Perú y la Provincia Constitucional del Callao
const DEPARTAMENTOS_PERU = [
  'Amazonas',
  'Áncash',
  'Apurímac',
  'Arequipa',
  'Ayacucho',
  'Cajamarca',
  'Callao',
  'Cusco',
  'Huancavelica',
  'Huánuco',
  'Ica',
  'Junín',
  'La Libertad',
  'Lambayeque',
  'Lima',
  'Loreto',
  'Madre de Dios',
  'Moquegua',
  'Pasco',
  'Piura',
  'Puno',
  'San Martín',
  'Tacna',
  'Tumbes',
  'Ucayali'
];

const normalizeText = (text) =>
  (text || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

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

  const [showCiudadDropdown, setShowCiudadDropdown] = useState(false);
  const ciudadContainerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ciudadContainerRef.current && !ciudadContainerRef.current.contains(event.target)) {
        setShowCiudadDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filtrar sugerencias de los 24 departamentos y el Callao según lo escrito (sin distinguir mayúsculas ni tildes)
  const ciudadesFiltradas = DEPARTAMENTOS_PERU.filter(dep =>
    normalizeText(dep).includes(normalizeText(formData.ciudad))
  );

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

  const handleTipoDocChange = (e) => {
    const newTipo = e.target.value;
    const maxLen = newTipo === 'RUC' ? 11 : 8;
    setFormData(prev => ({
      ...prev,
      tipo_documento: newTipo,
      numero_documento: prev.numero_documento.replace(/\D/g, '').slice(0, maxLen)
    }));
  };

  const handleNumeroDocChange = (e) => {
    const cleanNumbers = e.target.value.replace(/\D/g, '');
    const maxLen = formData.tipo_documento === 'RUC' ? 11 : 8;
    setFormData(prev => ({
      ...prev,
      numero_documento: cleanNumbers.slice(0, maxLen)
    }));
  };

  const handleTelefonoChange = (e) => {
    const cleanNumbers = e.target.value.replace(/\D/g, '');
    // Solo permitir si está vacío (al borrar) o si empieza estrictamente con el número 9
    if (cleanNumbers.length > 0 && cleanNumbers[0] !== '9') {
      return; // Bloquea cualquier número que no inicie con 9
    }
    setFormData(prev => ({
      ...prev,
      telefono: cleanNumbers.slice(0, 9)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { tipo_documento, numero_documento, razon_social, contacto, telefono, email, direccion, ciudad } = formData;

    // Validar que todos los campos estén completos (no vacíos)
    if (
      !tipo_documento?.trim() ||
      !numero_documento?.trim() ||
      !razon_social?.trim() ||
      !contacto?.trim() ||
      !telefono?.trim() ||
      !email?.trim() ||
      !direccion?.trim() ||
      !ciudad?.trim()
    ) {
      alert('Todos los campos son obligatorios. Por favor, complete todos los campos del formulario.');
      return;
    }

    // Validación estricta de longitud de documento
    if (tipo_documento === 'RUC' && numero_documento.trim().length !== 11) {
      alert('El RUC debe tener exactamente 11 dígitos numéricos.');
      return;
    }

    if (tipo_documento === 'DNI' && numero_documento.trim().length !== 8) {
      alert('El DNI debe tener exactamente 8 dígitos numéricos.');
      return;
    }

    // Validación estricta de teléfono móvil (9 dígitos y debe iniciar con 9)
    if (!/^9\d{8}$/.test(telefono.trim())) {
      alert('El teléfono móvil debe tener exactamente 9 dígitos y comenzar obligatoriamente con el número 9 (ejemplo: 987654321).');
      return;
    }

    // Validación de formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      alert('Por favor, ingrese un correo electrónico válido (ejemplo: contacto@empresa.pe).');
      return;
    }

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por RUC, nombre o contacto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 uppercase font-semibold border-b border-slate-200 dark:border-slate-700/80">
              <tr>
                <th className="px-5 py-3">Documento</th>
                <th className="px-5 py-3">Razón Social / Nombre</th>
                <th className="px-5 py-3">Contacto Directo</th>
                <th className="px-5 py-3">Teléfono / Email</th>
                <th className="px-5 py-3">Ubicación</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
                  <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[11px] mr-1.5 font-sans font-semibold border border-slate-200 dark:border-slate-700">
                        {c.tipo_documento}
                      </span>
                      {c.numero_documento}
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">{c.razon_social}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{c.contacto || '-'}</td>
                    <td className="px-5 py-3 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{c.telefono || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{c.email || '-'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-xs">{c.direccion ? `${c.direccion}, ${c.ciudad}` : c.ciudad}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right space-x-2">
                      <button onClick={() => handleEdit(c)} className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition" title="Editar">
                        <Edit className="w-4 h-4 inline" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition" title="Deshabilitar">
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

      {showModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm z-[999] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800">
            <div className="bg-slate-900 dark:bg-slate-950 px-6 py-4 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <h3 className="font-bold text-sm">{editingCliente ? 'Editar Datos de Cliente' : 'Registrar Nuevo Cliente'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipo Doc. *</label>
                  <select
                    value={formData.tipo_documento}
                    onChange={handleTipoDocChange}
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="RUC">RUC</option>
                    <option value="DNI">DNI</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">Número de Documento *</label>
                    <span className={`text-[10px] font-medium ${formData.numero_documento.length === (formData.tipo_documento === 'RUC' ? 11 : 8) ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      {formData.numero_documento.length} / {formData.tipo_documento === 'RUC' ? 11 : 8} dígitos
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={formData.tipo_documento === 'RUC' ? 11 : 8}
                    value={formData.numero_documento}
                    onChange={handleNumeroDocChange}
                    placeholder={formData.tipo_documento === 'RUC' ? '20XXXXXXXXX (11 dígitos)' : 'XXXXXXXX (8 dígitos)'}
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Razón Social o Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.razon_social}
                  onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                  placeholder="Ej. CONSTRUCTORA DEL SUR S.A.C."
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Persona de Contacto *</label>
                  <input
                    type="text"
                    required
                    value={formData.contacto}
                    onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                    placeholder="Ej. Ing. Miguel Torres"
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">Teléfono Móvil *</label>
                    <span className={`text-[10px] font-medium ${formData.telefono.length === 9 && formData.telefono.startsWith('9') ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      {formData.telefono.length} / 9 (Inicia con 9)
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={9}
                    value={formData.telefono}
                    onChange={handleTelefonoChange}
                    placeholder="9XXXXXXXX (9 dígitos)"
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contacto@empresa.pe"
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="relative" ref={ciudadContainerRef}>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">Ciudad / Región *</label>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowCiudadDropdown(prev => !prev)}
                      className="text-[10px] text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <span>{showCiudadDropdown ? 'Ocultar lista' : 'Ver 25 regiones'}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${showCiudadDropdown ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.ciudad}
                      onFocus={() => setShowCiudadDropdown(true)}
                      onChange={(e) => {
                        setFormData({ ...formData, ciudad: e.target.value });
                        setShowCiudadDropdown(true);
                      }}
                      placeholder="Escriba o seleccione un departamento..."
                      className="w-full pl-3 pr-8 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowCiudadDropdown(prev => !prev)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title="Desplegar lista de regiones"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${showCiudadDropdown ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''}`} />
                    </button>
                  </div>

                  {/* Menú de Sugerencias y Selección de Departamentos */}
                  {showCiudadDropdown && ciudadesFiltradas.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                      {ciudadesFiltradas.map((dep) => {
                        const isSelected = formData.ciudad?.toLowerCase() === dep.toLowerCase();
                        return (
                          <button
                            key={dep}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, ciudad: dep });
                              setShowCiudadDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-slate-700 flex items-center justify-between transition cursor-pointer ${
                              isSelected ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold' : 'text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            <span>{dep}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Dirección Fiscal / Planta *</label>
                <input
                  type="text"
                  required
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  placeholder="Av. Ejemplo 123, Distrito"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm cursor-pointer">
                  {editingCliente ? 'Actualizar Cliente' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
,
        document.body
      )}
    </div>
  );
}
