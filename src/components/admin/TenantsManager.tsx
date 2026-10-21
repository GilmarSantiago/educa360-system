'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2,
  PlusCircle,
  Search,
  RefreshCw,
  Shield,
  UserCheck,
  CheckCircle2,
  XCircle,
  DollarSign,
  Users,
  Power,
  Sparkles,
  Eye,
  EyeOff,
  X,
  Mail,
  Phone,
  Layers,
  Calendar,
  KeyRound,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { TenantItem } from '@/types';
import { AlertType } from '@/components/ui/AlertToast';
import Pagination from '@/components/ui/Pagination';

interface TenantsManagerProps {
  onNotify: (alert: { type: AlertType; title: string; message?: string }) => void;
}

export default function TenantsManager({ onNotify }: TenantsManagerProps) {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Modal de Confirmación para Suspender / Reactivar Colegio
  const [confirmTenantModal, setConfirmTenantModal] = useState<{
    isOpen: boolean;
    tenant: TenantItem | null;
    action: 'suspend' | 'activate';
  }>({
    isOpen: false,
    tenant: null,
    action: 'suspend',
  });
  const [savingTenantToggle, setSavingTenantToggle] = useState(false);

  // Formulario: Datos del Colegio
  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [schoolPlan, setSchoolPlan] = useState<'BASIC' | 'PRO' | 'ENTERPRISE'>('PRO');
  const [monthlyFee, setMonthlyFee] = useState('180');
  const [schoolRuc, setSchoolRuc] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [schoolPhone, setSchoolPhone] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');

  // Formulario: Datos del Primer Director
  const [adminName, setAdminName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminDocument, setAdminDocument] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);

  // Generador de código automático a partir del nombre
  const handleNameChange = (val: string) => {
    setSchoolName(val);
    if (!schoolCode || schoolCode === slugify(schoolName)) {
      setSchoolCode(slugify(val));
    }
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '')
      .replace(/^-+|-+$/g, '');
  };

  // Generador de clave segura
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 9; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  // Cargar colegios desde PostgreSQL
  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/tenants');
      const data = await res.json();

      if (res.ok && data.success) {
        setTenants(data.tenants || []);
      } else {
        onNotify({ type: 'error', title: 'Error al cargar colegios', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error de red', message: 'No se pudo conectar con el servidor' });
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Manejar creación
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim() || !schoolCode.trim() || !adminName.trim() || !adminUsername.trim() || !adminPassword.trim()) {
      onNotify({
        type: 'warning',
        title: 'Campos incompletos',
        message: 'Completa los datos del colegio y las credenciales iniciales del Director.',
      });
      return;
    }

    setSavingCreate(true);
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: schoolName,
          code: schoolCode,
          plan: schoolPlan,
          monthly_fee: Number(monthlyFee) || 0,
          ruc: schoolRuc,
          email: schoolEmail,
          phone: schoolPhone,
          address: schoolAddress,
          adminName,
          adminUsername,
          adminPassword,
          adminEmail,
          adminPhone,
          adminDocument,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al registrar colegio');
      }

      onNotify({
        type: 'success',
        title: '¡Colegio & Director Creados!',
        message: `El colegio "${schoolName}" y el director @${adminUsername} fueron registrados exitosamente.`,
      });

      // Limpiar formulario y cerrar modal
      setSchoolName('');
      setSchoolCode('');
      setSchoolRuc('');
      setSchoolEmail('');
      setSchoolPhone('');
      setSchoolAddress('');
      setAdminName('');
      setAdminUsername('');
      setAdminPassword('');
      setAdminEmail('');
      setAdminPhone('');
      setAdminDocument('');
      setCreateModalOpen(false);
      fetchTenants();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear colegio';
      onNotify({ type: 'error', title: 'Error', message: msg });
    } finally {
      setSavingCreate(false);
    }
  };

  // Solicitar confirmación antes de suspender o reactivar colegio
  const promptToggleStatus = (t: TenantItem) => {
    setConfirmTenantModal({
      isOpen: true,
      tenant: t,
      action: t.status === 'ACTIVE' ? 'suspend' : 'activate',
    });
  };

  // Ejecutar cambio de estado confirmado
  const executeToggleStatus = async () => {
    const t = confirmTenantModal.tenant;
    if (!t) return;

    setSavingTenantToggle(true);
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: t.id,
          action: 'toggle_status',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al cambiar estado');
      }

      onNotify({
        type: data.status === 'ACTIVE' ? 'success' : 'warning',
        title: data.status === 'ACTIVE' ? '¡Colegio Activado!' : '¡Colegio Suspendido!',
        message: data.message,
      });

      setConfirmTenantModal({ isOpen: false, tenant: null, action: 'suspend' });
      fetchTenants();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al modificar estado';
      onNotify({ type: 'error', title: 'Error', message: msg });
    } finally {
      setSavingTenantToggle(false);
    }
  };

  // Filtro de búsqueda
  const filteredTenants = useMemo(() => {
    const q = search.toLowerCase().trim();
    return tenants.filter((t) => {
      return (
        t.name.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        (t.admin_name && t.admin_name.toLowerCase().includes(q)) ||
        (t.admin_username && t.admin_username.toLowerCase().includes(q))
      );
    });
  }, [tenants, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const paginatedTenants = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTenants.slice(start, start + itemsPerPage);
  }, [filteredTenants, currentPage, itemsPerPage]);

  // Métricas rápidas
  const totalMonthlyRevenue = tenants.reduce((acc, t) => acc + (Number(t.monthly_fee) || 0), 0);
  const activeTenantsCount = tenants.filter((t) => t.status === 'ACTIVE').length;
  const totalUsersAcrossAllSchools = tenants.reduce((acc, t) => acc + (Number(t.total_users) || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Cabecera del Módulo con Branding Oficial SaaS */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold uppercase tracking-wide mb-2">
            <Building2 className="w-3.5 h-3.5 text-purple-600" />
            <span>Consola Central SaaS &bull; Onboarding de Clientes</span>
          </div>
          <h2 className="text-2xl font-black text-[#223a5e] tracking-tight">Colegios Clientes (Instituciones SaaS)</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Registra nuevos colegios en la plataforma, aprovisiona la cuenta del Director y administra licencias activas.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => fetchTenants()}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition cursor-pointer"
            title="Refrescar colegios"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#2fbf71]' : ''}`} />
          </button>

          <button
            onClick={() => {
              setAdminPassword(generateRandomPassword());
              setCreateModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold transition shadow-md shadow-[#2fbf71]/20 flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Nuevo Colegio</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas SaaS en Tiempo Real */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase">Colegios Activos</span>
          <p className="text-2xl font-black text-[#223a5e] mt-1">{activeTenantsCount} / {tenants.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Instituciones operativas</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase">Facturación Mensual SaaS</span>
          <p className="text-2xl font-black text-[#2fbf71] mt-1">${totalMonthlyRevenue.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Ingresos recurrentes (MRR)</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase">Usuarios Totales</span>
          <p className="text-2xl font-black text-blue-600 mt-1">{totalUsersAcrossAllSchools}</p>
          <p className="text-xs text-slate-500 mt-0.5">Directores, docentes y personal</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase">Base de Datos</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">Schema v2</p>
          <p className="text-xs text-slate-500 mt-0.5">PostgreSQL &bull; Multi-Tenant</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre de colegio, código o director..."
            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2fbf71] shadow-2xs transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Listado de Colegios */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#2fbf71]" />
            <p className="text-xs font-semibold">Cargando colegios clientes...</p>
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Building2 className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No hay colegios registrados</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {search
                ? `No se encontraron coincidencias para "${search}".`
                : 'Usa el botón "Registrar Nuevo Colegio" para dar de alta al primer colegio cliente y su respectivo director.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-5">Colegio / Institución</th>
                    <th className="py-3.5 px-4">Plan SaaS & Tarifa</th>
                    <th className="py-3.5 px-4">Director / Administrador</th>
                    <th className="py-3.5 px-4">Usuarios</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedTenants.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition">
                      
                      {/* Nombre & Código */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-[#223a5e]/10 text-[#223a5e] font-bold text-xs flex items-center justify-center border border-[#223a5e]/20 shrink-0">
                            <Building2 className="w-4 h-4 text-[#223a5e]" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{t.name}</p>
                            <span className="text-[11px] text-[#2fbf71] font-mono font-semibold">
                              id: {t.code}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Plan & Tarifa */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-[#e6f9ef] text-[#26995b] font-bold text-[10px] tracking-wide uppercase border border-[#2fbf71]/30">
                            Plan {t.plan}
                          </span>
                          <p className="text-xs font-extrabold text-[#223a5e]">
                            ${Number(t.monthly_fee || 0).toFixed(2)} / mes
                          </p>
                        </div>
                      </td>

                      {/* Director Asignado */}
                      <td className="py-3.5 px-4">
                        {t.admin_name ? (
                          <div>
                            <p className="font-bold text-slate-800 text-xs">{t.admin_name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">@{t.admin_username}</p>
                            {t.admin_email && <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{t.admin_email}</p>}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Sin director asignado</span>
                        )}
                      </td>

                      {/* Conteo de Usuarios */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t.total_users || 0} usuarios</span>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4">
                        {t.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e6f9ef] text-[#26995b] text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2fbf71] animate-pulse" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Suspendido
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => promptToggleStatus(t)}
                          className={`p-1.5 rounded-xl transition cursor-pointer ${
                            t.status === 'ACTIVE'
                              ? 'hover:bg-rose-50 text-slate-400 hover:text-rose-600'
                              : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-600'
                          }`}
                          title={t.status === 'ACTIVE' ? 'Suspender acceso al colegio' : 'Reactivar colegio'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              totalItems={filteredTenants.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
              itemsPerPageOptions={[5, 10, 20, 50]}
              labelSingular="colegio"
              labelPlural="colegios"
            />
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR COLEGIO + PRIMER DIRECTOR                                */}
      {/* ========================================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Cabecera del Modal */}
            <div className="px-6 py-5 bg-gradient-to-r from-[#223a5e] to-[#1c2f4c] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#2fbf71] text-white flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">Alta de Colegio & Primer Director</h3>
                  <p className="text-xs text-slate-300">Crea la institución y genera el usuario de acceso para su Director</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario con 2 Secciones Claras */}
            <form onSubmit={handleCreateTenant} className="p-6 overflow-y-auto space-y-6 no-scrollbar">
              
              {/* SECCIÓN 1: DATOS DE LA INSTITUCIÓN */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <Building2 className="w-4 h-4 text-[#2fbf71]" />
                  <span className="text-xs font-bold text-[#223a5e] uppercase tracking-wider">
                    1. Información del Colegio (Institución)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#223a5e] mb-1">
                      Nombre del Colegio *
                    </label>
                    <input
                      type="text"
                      required
                      value={schoolName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Ej. Colegio San Agustín"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#223a5e] mb-1">
                      Código / Identificador Único *
                    </label>
                    <input
                      type="text"
                      required
                      value={schoolCode}
                      onChange={(e) => setSchoolCode(slugify(e.target.value))}
                      placeholder="ej. sanagustin"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white font-mono transition"
                    />
                    <span className="text-[10px] text-slate-400">Identificador interno del colegio</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#223a5e] mb-1">
                      Plan SaaS *
                    </label>
                    <select
                      value={schoolPlan}
                      onChange={(e) => setSchoolPlan(e.target.value as 'BASIC' | 'PRO' | 'ENTERPRISE')}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition cursor-pointer"
                    >
                      <option value="BASIC">Plan Básico</option>
                      <option value="PRO">Plan PRO (Recomendado)</option>
                      <option value="ENTERPRISE">Plan Enterprise</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#223a5e] mb-1">
                      Tarifa Mensual ($ USD) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={monthlyFee}
                      onChange={(e) => setMonthlyFee(e.target.value)}
                      placeholder="180"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#223a5e] mb-1">
                      RUC Institucional
                    </label>
                    <input
                      type="text"
                      value={schoolRuc}
                      onChange={(e) => setSchoolRuc(e.target.value)}
                      placeholder="20123456789"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#223a5e] mb-1">
                      Correo Institucional
                    </label>
                    <input
                      type="email"
                      value={schoolEmail}
                      onChange={(e) => setSchoolEmail(e.target.value)}
                      placeholder="contacto@colegio.edu.pe"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#223a5e] mb-1">
                      Teléfono Institucional
                    </label>
                    <input
                      type="text"
                      value={schoolPhone}
                      onChange={(e) => setSchoolPhone(e.target.value)}
                      placeholder="+51 987 654 321"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: DATOS DEL PRIMER ADMINISTRADOR (DIRECTOR) */}
              <div className="space-y-3.5 pt-2">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <UserCheck className="w-4 h-4 text-[#2fbf71]" />
                  <span className="text-xs font-bold text-[#223a5e] uppercase tracking-wider">
                    2. Cuenta del Director / Dueño del Colegio (Rol Administrador)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#223a5e] mb-1">
                      Nombre Completo del Director *
                    </label>
                    <input
                      type="text"
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="Ej. Dr. Mario Vargas Llosa"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#223a5e] mb-1">
                      Usuario de Acceso del Director *
                    </label>
                    <input
                      type="text"
                      required
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(slugify(e.target.value))}
                      placeholder="ej. director.sanagustin"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white font-mono transition"
                    />
                    <span className="text-[10px] text-slate-400">Usuario con el que iniciará sesión</span>
                  </div>
                </div>

                {/* Contraseña Inicial del Director */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#223a5e]">
                      Contraseña Inicial del Director *
                    </label>
                    <button
                      type="button"
                      onClick={() => setAdminPassword(generateRandomPassword())}
                      className="text-[11px] font-bold text-[#2fbf71] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Generar Segura
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#223a5e] mb-1">
                      DNI del Director
                    </label>
                    <input
                      type="text"
                      value={adminDocument}
                      onChange={(e) => setAdminDocument(e.target.value)}
                      placeholder="09876543"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#223a5e] mb-1">
                      Correo del Director
                    </label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="director@colegio.edu.pe"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#223a5e] mb-1">
                      Celular del Director
                    </label>
                    <input
                      type="text"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      placeholder="999 888 777"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCreate}
                  className="px-5 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold transition shadow-md shadow-[#2fbf71]/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingCreate && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{savingCreate ? 'Creando Institución...' : 'Guardar Colegio & Director'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRMACIÓN DE SUSPENSIÓN / REACTIVACIÓN DE COLEGIO               */}
      {/* ========================================================================= */}
      {confirmTenantModal.isOpen && confirmTenantModal.tenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            
            {/* Cabecera de Alerta */}
            <div
              className={`px-6 py-5 flex items-center justify-between text-white ${
                confirmTenantModal.action === 'suspend'
                  ? 'bg-gradient-to-r from-rose-700 to-rose-600'
                  : 'bg-gradient-to-r from-[#2fbf71] to-[#26995b]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center font-bold">
                  {confirmTenantModal.action === 'suspend' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">
                    {confirmTenantModal.action === 'suspend'
                      ? '¿Suspender colegio cliente?'
                      : '¿Reactivar colegio cliente?'}
                  </h3>
                  <p className="text-xs text-white/80 font-mono">
                    id: {confirmTenantModal.tenant.code}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfirmTenantModal({ isOpen: false, tenant: null, action: 'suspend' })
                }
                className="text-white/80 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido / Advertencia de Impacto */}
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-10 h-10 rounded-2xl bg-[#223a5e]/10 text-[#223a5e] font-bold text-sm flex items-center justify-center border border-[#223a5e]/20 shrink-0">
                  <Building2 className="w-5 h-5 text-[#223a5e]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {confirmTenantModal.tenant.name}
                  </p>
                  <p className="text-[11px] text-[#2fbf71] font-mono font-semibold">
                    Código: {confirmTenantModal.tenant.code}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 text-[10px] font-bold uppercase">
                    Plan {confirmTenantModal.tenant.plan}
                  </span>
                </div>
              </div>

              {confirmTenantModal.action === 'suspend' ? (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Impacto de suspender este colegio:</span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-rose-700">
                    Todos los directores, docentes, colaboradores y apoderados vinculados a <strong>{confirmTenantModal.tenant.name}</strong> verán bloqueado su ingreso al campus virtual de forma inmediata.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-[#e6f9ef] border border-[#2fbf71]/30 text-xs text-[#26995b] space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-[#26995b]">
                    <CheckCircle2 className="w-4 h-4 text-[#2fbf71] shrink-0" />
                    <span>Habilitación del servicio:</span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-[#26995b]">
                    El acceso será restablecido para todos los usuarios pertenecientes a esta institución.
                  </p>
                </div>
              )}

              {/* Botones de Confirmación */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={savingTenantToggle}
                  onClick={() =>
                    setConfirmTenantModal({ isOpen: false, tenant: null, action: 'suspend' })
                  }
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={savingTenantToggle}
                  onClick={executeToggleStatus}
                  className={`px-5 py-2 rounded-xl text-white text-xs font-bold transition shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    confirmTenantModal.action === 'suspend'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                      : 'bg-[#2fbf71] hover:bg-[#26995b] shadow-[#2fbf71]/20'
                  }`}
                >
                  {savingTenantToggle && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {savingTenantToggle
                      ? 'Procesando...'
                      : confirmTenantModal.action === 'suspend'
                      ? 'Sí, Suspender Colegio'
                      : 'Sí, Reactivar Colegio'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
