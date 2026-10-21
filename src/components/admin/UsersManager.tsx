'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Shield,
  KeyRound,
  Edit3,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Mail,
  Phone,
  FileText,
  Lock,
  Sparkles,
  AlertCircle,
  X,
  UserCheck,
  Power,
  Sliders,
  AlertTriangle,
} from 'lucide-react';
import { ManagedUser, UserRole } from '@/types';
import { AlertType } from '@/components/ui/AlertToast';
import Pagination from '@/components/ui/Pagination';

interface UsersManagerProps {
  currentUserId: string;
  currentUserRole: UserRole;
  onNotify: (alert: { type: AlertType; title: string; message?: string }) => void;
}

export default function UsersManager({
  currentUserId,
  currentUserRole,
  onNotify,
}: UsersManagerProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');

  // Modales
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  // Usuario seleccionado para editar o resetear
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);

  // Formularios de Creación
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('MAESTRO');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDocument, setNewDocument] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);

  // Formulario de Edición
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('MAESTRO');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDocument, setEditDocument] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  // Formulario de Reset de Password
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [savingReset, setSavingReset] = useState(false);

  // Modal de Confirmación de Desactivación / Activación
  const [confirmStatusModal, setConfirmStatusModal] = useState<{
    isOpen: boolean;
    user: ManagedUser | null;
    action: 'deactivate' | 'activate';
  }>({
    isOpen: false,
    user: null,
    action: 'deactivate',
  });
  const [savingStatusToggle, setSavingStatusToggle] = useState(false);

  // Estados de Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Contadores globales por rol (independientes del filtro seleccionado)
  const [roleCounters, setRoleCounters] = useState({
    ALL: 0,
    MAESTRO: 0,
    COLABORADOR: 0,
    APODERADO: 0,
    ADMINISTRADOR: 0,
  });

  // Cargar lista de usuarios
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedRole !== 'ALL') params.append('role', selectedRole);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setUsers(data.users || []);
        if (data.roleCounters) {
          setRoleCounters(data.roleCounters);
        }
      } else {
        onNotify({ type: 'error', title: 'Error al cargar', message: data.message });
      }
    } catch {
      onNotify({ type: 'error', title: 'Error de red', message: 'No se pudo conectar con el servidor' });
    } finally {
      setLoading(false);
    }
  }, [search, selectedRole, onNotify]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Al cambiar de rol o buscar, reiniciar a la página 1
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedRole]);

  // Generar contraseña aleatoria segura
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 9; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  // Manejar creación
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) {
      onNotify({ type: 'warning', title: 'Campos incompletos', message: 'Nombre, usuario y contraseña son requeridos' });
      return;
    }

    setSavingCreate(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          username: newUsername,
          password: newPassword,
          role: newRole,
          email: newEmail,
          phone: newPhone,
          document: newDocument,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al registrar usuario');
      }

      onNotify({
        type: 'success',
        title: '¡Usuario Creado!',
        message: `El usuario @${newUsername.toLowerCase().trim()} se registró en el colegio.`,
      });

      // Limpiar formulario y cerrar
      setNewName('');
      setNewUsername('');
      setNewPassword('');
      setNewEmail('');
      setNewPhone('');
      setNewDocument('');
      setCreateModalOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      onNotify({ type: 'error', title: 'Error al crear', message: msg });
    } finally {
      setSavingCreate(false);
    }
  };

  // Abrir modal de edición
  const openEditModal = (u: ManagedUser) => {
    setSelectedUser(u);
    setEditName(u.name);
    setEditRole(u.role);
    setEditEmail(u.email || '');
    setEditPhone(u.phone || '');
    setEditDocument(u.document || '');
    setEditIsActive(u.is_active);
    setEditModalOpen(true);
  };

  // Manejar guardado de edición
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSavingEdit(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedUser.id,
          name: editName,
          role: editRole,
          email: editEmail,
          phone: editPhone,
          document: editDocument,
          is_active: editIsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al actualizar usuario');
      }

      onNotify({
        type: 'success',
        title: '¡Usuario Actualizado!',
        message: `Los datos de @${selectedUser.username} fueron actualizados.`,
      });

      setEditModalOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      onNotify({ type: 'error', title: 'Error al actualizar', message: msg });
    } finally {
      setSavingEdit(false);
    }
  };

  // Abrir modal de reseteo de contraseña
  const openResetModal = (u: ManagedUser) => {
    setSelectedUser(u);
    setResetPasswordVal(generateRandomPassword());
    setResetModalOpen(true);
  };

  // Manejar reseteo de contraseña
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (resetPasswordVal.length < 6) {
      onNotify({ type: 'warning', title: 'Contraseña muy corta', message: 'Debe contener mínimo 6 caracteres' });
      return;
    }

    setSavingReset(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_password',
          userId: selectedUser.id,
          newPassword: resetPasswordVal,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al cambiar clave');
      }

      onNotify({
        type: 'success',
        title: '¡Contraseña Reestablecida!',
        message: `Nueva clave temporal aplicada para @${selectedUser.username}.`,
      });

      setResetModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar';
      onNotify({ type: 'error', title: 'Error al restablecer', message: msg });
    } finally {
      setSavingReset(false);
    }
  };

  // Solicitar confirmación antes de desactivar o reactivar
  const promptToggleStatus = (u: ManagedUser) => {
    if (u.id === currentUserId) {
      onNotify({
        type: 'warning',
        title: 'Acción no permitida',
        message: 'Por seguridad no puedes desactivar tu propia cuenta activa.',
      });
      return;
    }

    setConfirmStatusModal({
      isOpen: true,
      user: u,
      action: u.is_active ? 'deactivate' : 'activate',
    });
  };

  // Ejecutar cambio de estado confirmado
  const executeToggleStatus = async () => {
    const u = confirmStatusModal.user;
    if (!u) return;

    setSavingStatusToggle(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_status',
          userId: u.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al cambiar estado');
      }

      onNotify({
        type: data.is_active ? 'success' : 'warning',
        title: data.is_active ? '¡Usuario Activado!' : '¡Usuario Desactivado!',
        message: data.message,
      });

      setConfirmStatusModal({ isOpen: false, user: null, action: 'deactivate' });
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar cambio';
      onNotify({ type: 'error', title: 'Error', message: msg });
    } finally {
      setSavingStatusToggle(false);
    }
  };

  // Formato visual para los roles
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMINISTRADOR':
        return { label: 'Administrador / Director', bg: 'bg-[#223a5e]/10 text-[#223a5e] border-[#223a5e]/20' };
      case 'MAESTRO':
        return { label: 'Docente / Maestro', bg: 'bg-[#e6f9ef] text-[#26995b] border-[#2fbf71]/30' };
      case 'COLABORADOR':
        return { label: 'Secretaría / Caja', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'APODERADO':
        return { label: 'Apoderado / Familia', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'SOPORTE':
        return { label: 'Soporte SaaS', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: role, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const paginatedUsers = users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      
      {/* Cabecera del Módulo con Branding Oficial */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#e6f9ef] text-[#26995b] text-xs font-bold uppercase tracking-wide mb-2">
            <Users className="w-3.5 h-3.5 text-[#2fbf71]" />
            <span>Pilar Administrativo &bull; Recursos Humanos</span>
          </div>
          <h2 className="text-2xl font-black text-[#223a5e] tracking-tight">Gestión de Personal & Usuarios</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Crea cuentas de acceso, asigna roles institucionales (Docentes, Secretaría, Apoderados) y gestiona credenciales seguras.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => fetchUsers()}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition cursor-pointer"
            title="Refrescar listado"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#2fbf71]' : ''}`} />
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold transition shadow-md shadow-[#2fbf71]/20 flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros Rápidos & Buscador */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Pestañas de Roles */}
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'MAESTRO', label: 'Docentes' },
            { id: 'COLABORADOR', label: 'Secretaría / Caja' },
            { id: 'APODERADO', label: 'Apoderados' },
            { id: 'ADMINISTRADOR', label: 'Directores' },
          ].map((tab) => {
            const count = roleCounters[tab.id as keyof typeof roleCounters] ?? 0;
            const isSelected = selectedRole === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedRole(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#223a5e] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Buscador */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, usuario o DNI..."
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

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#2fbf71]" />
            <p className="text-xs font-semibold">Cargando directorio de usuarios...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Users className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No se encontraron usuarios</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {search
                ? `No hay coincidencias para "${search}". Intenta con otro término.`
                : 'Aún no se han registrado usuarios bajo este criterio. Usa el botón "Nuevo Usuario" para comenzar.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-5">Usuario / Personal</th>
                  <th className="py-3.5 px-4">Rol Institucional</th>
                  <th className="py-3.5 px-4">Documento / Contacto</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedUsers.map((u) => {
                  const roleBadge = getRoleBadge(u.role);
                  const isSelf = u.id === currentUserId;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition">
                      
                      {/* Usuario e Identidad */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-[#2fbf71]/15 text-[#2fbf71] font-bold text-xs flex items-center justify-center border border-[#2fbf71]/30 shrink-0 overflow-hidden shadow-2xs">
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                            ) : (
                              <span>{u.name.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{u.name}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[9px] font-bold">
                                  Tú
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono font-medium">@{u.username}</span>
                          </div>
                        </div>
                      </td>

                      {/* Rol */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-bold border ${roleBadge.bg}`}
                        >
                          {roleBadge.label}
                        </span>
                      </td>

                      {/* Contacto & Documento */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="space-y-0.5">
                          {u.document && (
                            <div className="flex items-center gap-1.5 font-medium">
                              <FileText className="w-3 h-3 text-slate-400" />
                              <span>DNI: {u.document}</span>
                            </div>
                          )}
                          {u.email && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[160px]">{u.email}</span>
                            </div>
                          )}
                          {u.phone && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{u.phone}</span>
                            </div>
                          )}
                          {!u.document && !u.email && !u.phone && (
                            <span className="text-slate-400 italic text-[11px]">Sin datos registrados</span>
                          )}
                        </div>
                      </td>

                      {/* Estado Activo / Inactivo */}
                      <td className="py-3.5 px-4">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e6f9ef] text-[#26995b] text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2fbf71] animate-pulse" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[11px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Inactivo
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          
                          {/* Botón Editar */}
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-[#223a5e] transition cursor-pointer"
                            title="Editar usuario"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Botón Restablecer Contraseña */}
                          <button
                            onClick={() => openResetModal(u)}
                            className="p-1.5 rounded-xl hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition cursor-pointer"
                            title="Reestablecer contraseña"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Botón Desactivar / Activar con Confirmación */}
                          {!isSelf && (
                            <button
                              onClick={() => promptToggleStatus(u)}
                              className={`p-1.5 rounded-xl transition cursor-pointer ${
                                u.is_active
                                  ? 'hover:bg-rose-50 text-slate-500 hover:text-rose-600'
                                  : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-600'
                              }`}
                              title={u.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación de Usuarios */}
        {!loading && users.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={users.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newSize) => {
              setItemsPerPage(newSize);
              setCurrentPage(1);
            }}
            labelSingular="usuario"
            labelPlural="usuarios"
          />
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: NUEVO USUARIO                                                    */}
      {/* ========================================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Cabecera */}
            <div className="px-6 py-5 bg-gradient-to-r from-[#223a5e] to-[#1c2f4c] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#2fbf71] text-white flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">Registrar Nuevo Usuario</h3>
                  <p className="text-xs text-slate-300">Asigna credenciales y rol para el colegio</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleCreateUser} className="p-6 overflow-y-auto space-y-4 no-scrollbar">
              
              {/* Nombre Completo */}
              <div>
                <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. Prof. María del Carmen Ruiz"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition"
                />
              </div>

              {/* Usuario y Rol */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Usuario de Acceso *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase().trim())}
                    placeholder="ej. mruiz"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition"
                  />
                  <span className="text-[10px] text-slate-400">Sin espacios, único en el campus</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Rol Institucional *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition cursor-pointer"
                  >
                    <option value="MAESTRO">Docente (Maestro)</option>
                    <option value="COLABORADOR">Secretaría / Caja</option>
                    <option value="APODERADO">Apoderado / Padre</option>
                    <option value="ADMINISTRADOR">Administrador / Director</option>
                    {currentUserRole === 'SOPORTE' && <option value="SOPORTE">Soporte Técnico SaaS</option>}
                  </select>
                </div>
              </div>

              {/* Contraseña Inicial */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#223a5e] uppercase tracking-wider">
                    Contraseña Inicial *
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateRandomPassword())}
                    className="text-[11px] font-bold text-[#2fbf71] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Generar Segura
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Documento (DNI) y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Documento (DNI / CI)
                  </label>
                  <input
                    type="text"
                    value={newDocument}
                    onChange={(e) => setNewDocument(e.target.value)}
                    placeholder="Opcional"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Teléfono Celular
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Opcional"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Correo Electrónico */}
              <div>
                <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="ejemplo@colegio.edu.pe"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition"
                />
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
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
                  <span>{savingCreate ? 'Registrando...' : 'Crear Usuario'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDITAR USUARIO                                                   */}
      {/* ========================================================================= */}
      {editModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Cabecera */}
            <div className="px-6 py-5 bg-gradient-to-r from-[#223a5e] to-[#1c2f4c] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#2fbf71] text-white flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">Editar Datos de Usuario</h3>
                  <p className="text-xs text-slate-300 font-mono">@{selectedUser.username}</p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleEditUser} className="p-6 overflow-y-auto space-y-4 no-scrollbar">
              
              {/* Nombre Completo */}
              <div>
                <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition"
                />
              </div>

              {/* Rol y Estado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Rol Institucional *
                  </label>
                  <select
                    value={editRole}
                    disabled={selectedUser.id === currentUserId}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition cursor-pointer disabled:opacity-60"
                  >
                    <option value="MAESTRO">Docente (Maestro)</option>
                    <option value="COLABORADOR">Secretaría / Caja</option>
                    <option value="APODERADO">Apoderado / Padre</option>
                    <option value="ADMINISTRADOR">Administrador / Director</option>
                    {currentUserRole === 'SOPORTE' && <option value="SOPORTE">Soporte Técnico SaaS</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Estado de la Cuenta
                  </label>
                  <select
                    value={editIsActive ? 'true' : 'false'}
                    disabled={selectedUser.id === currentUserId}
                    onChange={(e) => setEditIsActive(e.target.value === 'true')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition cursor-pointer disabled:opacity-60"
                  >
                    <option value="true">Activo (Habilitado)</option>
                    <option value="false">Inactivo (Deshabilitado)</option>
                  </select>
                </div>
              </div>

              {/* Documento y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Documento (DNI / CI)
                  </label>
                  <input
                    type="text"
                    value={editDocument}
                    onChange={(e) => setEditDocument(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                    Teléfono Celular
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Correo Electrónico */}
              <div>
                <label className="block text-xs font-bold text-[#223a5e] mb-1 uppercase tracking-wider">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition"
                />
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold transition shadow-md shadow-[#2fbf71]/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingEdit && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{savingEdit ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REESTABLECER CONTRASEÑA                                          */}
      {/* ========================================================================= */}
      {resetModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            
            {/* Cabecera */}
            <div className="px-6 py-5 bg-gradient-to-r from-[#223a5e] to-[#1c2f4c] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#2fbf71] text-white flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">Reestablecer Contraseña</h3>
                  <p className="text-xs text-slate-300 font-mono">@{selectedUser.username}</p>
                </div>
              </div>
              <button
                onClick={() => setResetModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                Estás a punto de cambiar la clave de acceso para{' '}
                <strong className="text-[#223a5e] font-bold">{selectedUser.name}</strong>. Asegúrate de comunicarle la nueva clave provisional.
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#223a5e] uppercase tracking-wider">
                    Nueva Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => setResetPasswordVal(generateRandomPassword())}
                    className="text-[11px] font-bold text-[#2fbf71] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Generar otra
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={resetPasswordVal}
                    onChange={(e) => setResetPasswordVal(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2fbf71] focus:bg-white transition pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingReset}
                  className="px-5 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold transition shadow-md shadow-[#2fbf71]/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingReset && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{savingReset ? 'Actualizando...' : 'Aplicar Nueva Clave'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CONFIRMACIÓN DE DESACTIVACIÓN / ACTIVACIÓN DE USUARIO             */}
      {/* ========================================================================= */}
      {confirmStatusModal.isOpen && confirmStatusModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            
            {/* Cabecera con alerta visual distintiva */}
            <div
              className={`px-6 py-5 flex items-center justify-between text-white ${
                confirmStatusModal.action === 'deactivate'
                  ? 'bg-gradient-to-r from-rose-700 to-rose-600'
                  : 'bg-gradient-to-r from-[#2fbf71] to-[#26995b]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center font-bold">
                  {confirmStatusModal.action === 'deactivate' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">
                    {confirmStatusModal.action === 'deactivate'
                      ? '¿Desactivar acceso de usuario?'
                      : '¿Reactivar acceso de usuario?'}
                  </h3>
                  <p className="text-xs text-white/80 font-mono">
                    @{confirmStatusModal.user.username}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfirmStatusModal({ isOpen: false, user: null, action: 'deactivate' })
                }
                className="text-white/80 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido / Advertencia de Confirmación */}
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-10 h-10 rounded-2xl bg-[#2fbf71]/15 text-[#2fbf71] font-bold text-sm flex items-center justify-center border border-[#2fbf71]/30 shrink-0 overflow-hidden">
                  {confirmStatusModal.user.avatar ? (
                    <img
                      src={confirmStatusModal.user.avatar}
                      alt={confirmStatusModal.user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{confirmStatusModal.user.name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {confirmStatusModal.user.name}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    @{confirmStatusModal.user.username}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 text-[10px] font-bold uppercase">
                    {confirmStatusModal.user.role}
                  </span>
                </div>
              </div>

              {confirmStatusModal.action === 'deactivate' ? (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Consecuencia de esta acción:</span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-rose-700">
                    El usuario <strong>no podrá iniciar sesión</strong> en el campus virtual ni realizar ninguna actividad en el sistema hasta que vuelva a ser activado.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-[#e6f9ef] border border-[#2fbf71]/30 text-xs text-[#26995b] space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-[#26995b]">
                    <CheckCircle2 className="w-4 h-4 text-[#2fbf71] shrink-0" />
                    <span>Habilitación de cuenta:</span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-[#26995b]">
                    El usuario podrá ingresar nuevamente con sus credenciales habituales a todos los módulos permitidos de su rol.
                  </p>
                </div>
              )}

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={savingStatusToggle}
                  onClick={() =>
                    setConfirmStatusModal({ isOpen: false, user: null, action: 'deactivate' })
                  }
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={savingStatusToggle}
                  onClick={executeToggleStatus}
                  className={`px-5 py-2 rounded-xl text-white text-xs font-bold transition shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    confirmStatusModal.action === 'deactivate'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                      : 'bg-[#2fbf71] hover:bg-[#26995b] shadow-[#2fbf71]/20'
                  }`}
                >
                  {savingStatusToggle && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {savingStatusToggle
                      ? 'Procesando...'
                      : confirmStatusModal.action === 'deactivate'
                      ? 'Sí, Desactivar Usuario'
                      : 'Sí, Reactivar Usuario'}
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
