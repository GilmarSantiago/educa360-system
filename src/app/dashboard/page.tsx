'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ProfileModal from '@/components/ProfileModal';
import AlertToast, { AlertNotification, AlertType } from '@/components/ui/AlertToast';
import UsersManager from '@/components/admin/UsersManager';
import TenantsManager from '@/components/admin/TenantsManager';
import FinancesManager from '@/components/admin/FinancesManager';
import AdministrationManager from '@/components/admin/AdministrationManager';
import InstitutionManager from '@/components/admin/InstitutionManager';
import IdleSessionWatcher from '@/components/IdleSessionWatcher';
import { AuthUser } from '@/types';
import {
  Building2,
  Users,
  BookOpen,
  HeartHandshake,
  DollarSign,
  CheckCircle2,
  Clock,
  PlusCircle,
  Sliders,
  Wallet,
  Calendar,
  Lock,
  FileCheck2,
  RefreshCw,
  Sparkles,
  GraduationCap,
  LogOut,
  UserCheck,
  ChevronDown,
  Shield,
  KeyRound,
  Layers,
} from 'lucide-react';

const VALID_TABS_BY_ROLE: Record<string, string[]> = {
  ADMINISTRADOR: [
    'overview',
    'admin_rules',
    'admin_staff',
    'admin_structure',
    'admin_guardians',
    'admin_students',
    'admin_enrollments',
    'admin_balance',
    'admin_tuitions',
    'admin_products',
    'admin_commitments',
    'admin_shifts',
    'admin_academic',
  ],
  COLABORADOR: [
    'colab_ops',
    'colab_enroll',
    'colab_cash',
    'colab_expenses',
  ],
  SOPORTE: [
    'saas_roi',
    'saas_tenants',
    'saas_users',
    'saas_overrides',
    'saas_audit',
  ],
  MAESTRO: [
    'teach_classes',
    'teach_grades',
    'teach_attendance',
  ],
  APODERADO: [
    'parent_student',
    'parent_grades',
    'parent_debts',
  ],
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');

  // Cambiar de pestaña y persistir en URL + localStorage
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('educa360_active_tab', tab);
      if (user?.role) {
        localStorage.setItem(`educa360_tab_${user.role}`, tab);
      }
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('tab', tab);
      window.history.replaceState({}, '', currentUrl.toString());
    }
  }, [user?.role]);

  // Notificaciones Toast / Alertas
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);

  // Estados de Perfil y Pestaña Inicial Solicitada
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<'info' | 'password'>('info');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Agregar notificación al sistema de alertas (referencialmente estable con useCallback)
  const addAlert = useCallback(({ type, title, message }: { type: AlertType; title: string; message?: string }) => {
    const id = `alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setAlerts((prev) => [...prev, { id, type, title, message }]);
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (!res.ok || !data.success || !data.user) {
          router.push('/');
          return;
        }

        setUser(data.user);

        const defaultTabs: Record<string, string> = {
          SOPORTE: 'saas_roi',
          ADMINISTRADOR: 'admin_rules',
          COLABORADOR: 'colab_ops',
          MAESTRO: 'teach_classes',
          APODERADO: 'parent_student',
        };

        // Recuperar módulo previo desde URL (?tab=...) o localStorage
        let savedTab: string | null = null;
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          savedTab =
            params.get('tab') ||
            localStorage.getItem(`educa360_tab_${data.user.role}`) ||
            localStorage.getItem('educa360_active_tab');
        }

        const validTabs = VALID_TABS_BY_ROLE[data.user.role] || [];
        const finalTab =
          savedTab && validTabs.includes(savedTab)
            ? savedTab
            : (defaultTabs[data.user.role] || 'overview');

        setActiveTab(finalTab);

        if (typeof window !== 'undefined') {
          localStorage.setItem('educa360_active_tab', finalTab);
          localStorage.setItem(`educa360_tab_${data.user.role}`, finalTab);
          const currentUrl = new URL(window.location.href);
          if (currentUrl.searchParams.get('tab') !== finalTab) {
            currentUrl.searchParams.set('tab', finalTab);
            window.history.replaceState({}, '', currentUrl.toString());
          }
        }
      } catch {
        router.push('/');
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [router]);

  // Cerrar menú de usuario al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch {
      router.push('/');
    }
  };

  const handleOpenProfileModal = useCallback((tab: 'info' | 'password' = 'info') => {
    setProfileInitialTab(tab);
    setIsProfileOpen(true);
    setUserMenuOpen(false);
  }, []);

  const handleOpenProfileInfo = useCallback(() => {
    handleOpenProfileModal('info');
  }, [handleOpenProfileModal]);

  const handleUserUpdated = useCallback((updatedData: {
    name: string;
    email?: string | null;
    phone?: string | null;
    avatar?: string | null;
  }) => {
    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        name: updatedData.name,
        email: updatedData.email,
        phone: updatedData.phone,
        avatar: updatedData.avatar !== undefined ? updatedData.avatar : prev.avatar,
      };
    });
  }, []);

  const handleAdminSubmoduleChange = useCallback((sub: string) => {
    const map: Record<string, string> = {
      structure: 'admin_structure',
      guardians: 'admin_guardians',
      students: 'admin_students',
      enrollments: 'admin_enrollments',
    };
    handleTabChange(map[sub] || 'admin_structure');
  }, [handleTabChange]);

  const handleFinancesSubmoduleChange = useCallback((sub: string) => {
    const map: Record<string, string> = {
      cashflow: 'admin_balance',
      tuitions: 'admin_tuitions',
      products: 'admin_products',
      obligations: 'admin_commitments',
      shifts: 'admin_shifts',
    };
    handleTabChange(map[sub] || 'admin_balance');
  }, [handleTabChange]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-[#2fbf71] mb-3" />
        <span className="text-sm font-semibold text-[#223a5e]">Cargando campus Educa360...</span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 overflow-hidden font-sans relative">
      {/* Sidebar Limpio con Branding Oficial */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenProfile={handleOpenProfileInfo}
      />

      {/* Área Principal de Contenido */}
      <div
        className="flex-1 flex flex-col min-w-0 overflow-y-auto no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        
        {/* Topbar Superior Limpio */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-xs">
          <div className="flex items-center gap-3">
            {user.tenantName ? (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#223a5e]/10 text-[#223a5e] flex items-center justify-center font-bold text-xs shrink-0">
                  <Building2 className="w-4 h-4 text-[#2fbf71]" />
                </div>
                <div>
                  <span className="text-xs font-black text-[#223a5e] tracking-tight block leading-tight">
                    {user.tenantName}
                  </span>
                  {user.role === 'ADMINISTRADOR' && (
                    <button
                      onClick={() => handleTabChange('admin_rules')}
                      className="text-[10px] text-slate-400 hover:text-[#2fbf71] font-bold underline cursor-pointer leading-none"
                      title="Configurar datos del colegio, logo y reglas"
                    >
                      Editar datos del colegio
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#223a5e]">
                <Building2 className="w-4 h-4 text-[#2fbf71]" />
                <span>Educa360</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Año Académico 2026 &bull; Vigente</span>
            </div>
            
            <div className="h-4 w-px bg-slate-200" />

            {/* Menú Desplegable de Usuario */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-[#2fbf71]/15 text-[#2fbf71] font-bold text-xs flex items-center justify-center border border-[#2fbf71]/30 overflow-hidden shrink-0">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{user.name.charAt(0)}</span>
                  )}
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-[#223a5e] leading-tight">{user.name}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">{user.role}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#2fbf71]/15 text-[#2fbf71] font-bold text-xs flex items-center justify-center border border-[#2fbf71]/30 overflow-hidden shrink-0">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{user.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#223a5e] truncate">{user.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">@{user.username}</p>
                      <span className="mt-0.5 inline-block px-1.5 py-0.2 rounded bg-[#e6f9ef] text-[#26995b] text-[9px] font-bold uppercase tracking-wide">
                        {user.role}
                      </span>
                    </div>
                  </div>

                  <div className="p-1.5 space-y-0.5">
                    <button
                      onClick={() => handleOpenProfileModal('info')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-[#2fbf71] hover:bg-slate-50 transition cursor-pointer text-left"
                    >
                      <UserCheck className="w-4 h-4 text-slate-400" />
                      <span>Ver y Editar Perfil</span>
                    </button>

                    {user.role === 'ADMINISTRADOR' && (
                      <button
                        onClick={() => {
                          handleTabChange('admin_rules');
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-[#2fbf71] hover:bg-slate-50 transition cursor-pointer text-left"
                      >
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span>Datos del Colegio & Reglas</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenProfileModal('password')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-[#223a5e] hover:bg-slate-50 transition cursor-pointer text-left"
                    >
                      <KeyRound className="w-4 h-4 text-slate-400" />
                      <span>Cambiar Contraseña</span>
                    </button>
                  </div>

                  <div className="pt-1 mt-1 border-t border-slate-100 p-1.5">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Contenido Principal */}
        <main className="p-6 sm:p-8 space-y-6 max-w-7xl">
          
          {/* ================================================== */}
          {/* 1. VISTA ADMINISTRADOR (Director - Los 3 Pilares)   */}
          {/* ================================================== */}
          {user.role === 'ADMINISTRADOR' && (
            activeTab === 'admin_staff' ? (
              <UsersManager
                currentUserId={user.id}
                currentUserRole={user.role}
                onNotify={addAlert}
              />
            ) : ['admin_structure', 'admin_guardians', 'admin_students', 'admin_enrollments'].includes(activeTab) ? (
              <AdministrationManager
                initialSubmodule={
                  activeTab === 'admin_guardians'
                    ? 'guardians'
                    : activeTab === 'admin_students'
                    ? 'students'
                    : activeTab === 'admin_enrollments'
                    ? 'enrollments'
                    : 'structure'
                }
                onNotify={addAlert}
                onSubmoduleChange={handleAdminSubmoduleChange}
              />
            ) : ['admin_balance', 'admin_tuitions', 'admin_products', 'admin_commitments', 'admin_shifts'].includes(activeTab) ? (
              <FinancesManager
                initialSubmodule={
                  activeTab === 'admin_tuitions'
                    ? 'tuitions'
                    : activeTab === 'admin_products'
                    ? 'products'
                    : activeTab === 'admin_commitments'
                    ? 'obligations'
                    : activeTab === 'admin_shifts'
                    ? 'shifts'
                    : 'cashflow'
                }
                onNotify={addAlert}
                onSubmoduleChange={handleFinancesSubmoduleChange}
              />
            ) : activeTab === 'admin_rules' ? (
              <InstitutionManager
                currentUser={user}
                onNotify={addAlert}
              />
            ) : (
              <div className="space-y-6">
                
                {/* Banner de Bienvenida Institucional */}
                <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-r from-[#223a5e] to-[#1c2f4c] text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                  <div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-semibold mb-2">
                      <Building2 className="w-3.5 h-3.5 text-[#2fbf71]" />
                      <span>Despacho de Dirección</span>
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-white">
                      Bienvenido, {user.name}
                    </h2>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl">
                      Gestiona tu colegio a través de los tres pilares fundamentales: Administrativo, Financiero y Académico.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenProfileModal('info')}
                      className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold transition cursor-pointer flex items-center gap-2 text-white"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-[#2fbf71]" />
                      <span>Mi Perfil</span>
                    </button>
                    <div className="px-4 py-2 rounded-xl bg-[#2fbf71] text-xs font-bold flex items-center gap-2 text-white">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Sistema Activo</span>
                    </div>
                  </div>
                </div>

                {/* Los 3 Pilares en Resumen */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div
                    onClick={() => handleTabChange('admin_structure')}
                    className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-start justify-between cursor-pointer hover:border-[#2fbf71]/50 hover:shadow-sm transition group"
                    title="Clic para gestionar estructura escolar, vacantes y matrículas"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-[#2fbf71] transition">Pilar Administrativo</span>
                      <p className="text-lg font-black text-[#223a5e] mt-1">Aulas & Matrícula</p>
                      <p className="text-xs text-slate-500 mt-0.5">Vacantes, padrón y familias &rarr;</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
                      <Layers className="w-5 h-5" />
                    </div>
                  </div>

                  <div
                    onClick={() => handleTabChange('admin_staff')}
                    className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-start justify-between cursor-pointer hover:border-[#2fbf71]/50 hover:shadow-sm transition group"
                    title="Clic para gestionar personal y usuarios"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-[#2fbf71] transition">Pilar Administrativo</span>
                      <p className="text-lg font-black text-[#223a5e] mt-1">Personal & Usuarios</p>
                      <p className="text-xs text-slate-500 mt-0.5">Docentes y accesos &rarr;</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#e6f9ef] text-[#2fbf71]">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>

                  <div
                    onClick={() => handleTabChange('admin_balance')}
                    className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-start justify-between cursor-pointer hover:border-[#2fbf71]/50 hover:shadow-sm transition group"
                    title="Clic para gestionar ingresos, gastos y balance"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-[#2fbf71] transition">Pilar Financiero</span>
                      <p className="text-lg font-black text-[#2fbf71] mt-1">Ingresos & Gastos</p>
                      <p className="text-xs text-slate-500 mt-0.5">Flujo de caja y arqueo &rarr;</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50 text-[#2fbf71]">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>

                  <div
                    onClick={() => handleTabChange('admin_rules')}
                    className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-start justify-between cursor-pointer hover:border-[#2fbf71]/50 hover:shadow-sm transition group"
                    title="Clic para configurar datos del colegio, logo y años lectivos"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-[#2fbf71] transition">Pilar Administrativo</span>
                      <p className="text-lg font-black text-[#223a5e] mt-1">Datos & Reglas</p>
                      <p className="text-xs text-slate-500 mt-0.5">Logo, RUC y ciclo escolar &rarr;</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                      <Building2 className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Panel de Configuración Rápida de Identidad y Ciclo Lectivo */}
                <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#2fbf71] flex items-center justify-center shrink-0">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-[#223a5e]">
                        Datos Institucionales & Reglas del Colegio
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Administra el logo oficial, RUC, contactos, ciclo escolar vigente y reglas de cobro.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleTabChange('admin_rules')}
                    className="px-5 py-2.5 rounded-xl bg-[#223a5e] hover:bg-[#1a2d4b] text-white text-xs font-bold transition cursor-pointer flex items-center gap-2 shrink-0 shadow-sm"
                  >
                    <Sliders className="w-4 h-4 text-[#2fbf71]" />
                    <span>Configurar Colegio</span>
                  </button>
                </div>
              </div>
            )
          )}

          {/* ================================================== */}
          {/* 2. VISTA COLABORADOR (Secretaría & Caja)           */}
          {/* ================================================== */}
          {user.role === 'COLABORADOR' && (
            activeTab === 'colab_enroll' ? (
              <AdministrationManager
                initialSubmodule="enrollments"
                onNotify={addAlert}
              />
            ) : ['colab_cash', 'colab_expenses'].includes(activeTab) ? (
              <FinancesManager
                initialSubmodule={activeTab === 'colab_expenses' ? 'cashflow' : 'tuitions'}
                onNotify={addAlert}
              />
            ) : (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="text-xs font-bold text-[#2fbf71] uppercase tracking-wider">Operaciones del Día</span>
                    <h2 className="text-2xl font-black text-[#223a5e]">Módulo de Secretaría & Caja</h2>
                    <p className="text-xs text-slate-500 mt-1">Inscripciones, cobro de mensualidades y cuadre de caja.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenProfileModal('info')}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#223a5e] text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Mi Perfil</span>
                    </button>
                    <div className="px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-[#2fbf71] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#2fbf71] animate-pulse" />
                      Caja Diaria: Abierta
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-xs font-bold text-slate-400 uppercase">Recaudación del Turno</span>
                    <p className="text-2xl font-black text-[#2fbf71] mt-1">S/ 3,850.00</p>
                    <p className="text-xs text-slate-500 mt-0.5">Efectivo: S/ 1,850 &bull; Yape/POS: S/ 2,000</p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-xs font-bold text-slate-400 uppercase">Inscripciones Hoy</span>
                    <p className="text-2xl font-black text-[#223a5e] mt-1">8 Alumnos</p>
                    <p className="text-xs text-slate-500 mt-0.5">Vacantes restantes: 24</p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-xs font-bold text-slate-400 uppercase">Egresos Menores</span>
                    <p className="text-2xl font-black text-rose-600 mt-1">S/ 120.00</p>
                    <p className="text-xs text-slate-500 mt-0.5">2 Salidas registradas con boleta</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    onClick={() => handleTabChange('colab_enroll')}
                    className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#2fbf71] text-left transition shadow-xs group cursor-pointer"
                  >
                    <PlusCircle className="w-6 h-6 text-[#2fbf71] mb-2" />
                    <p className="text-sm font-bold text-[#223a5e]">Nueva Matrícula</p>
                    <p className="text-xs text-slate-500 mt-1">Inscripción escolar, asignación de aula y plan de pensiones</p>
                  </button>

                  <button
                    onClick={() => handleTabChange('colab_cash')}
                    className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#2fbf71] text-left transition shadow-xs group cursor-pointer"
                  >
                    <Wallet className="w-6 h-6 text-[#2fbf71] mb-2" />
                    <p className="text-sm font-bold text-[#223a5e]">Cobrar en Ventanilla</p>
                    <p className="text-xs text-slate-500 mt-1">Emisión de recibo por concepto de pensión o matrícula</p>
                  </button>

                  <button
                    onClick={() => handleTabChange('colab_expenses')}
                    className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-rose-400 text-left transition shadow-xs group cursor-pointer"
                  >
                    <DollarSign className="w-6 h-6 text-rose-500 mb-2" />
                    <p className="text-sm font-bold text-[#223a5e]">Registrar Egreso Menor</p>
                    <p className="text-xs text-slate-500 mt-1">Salida de dinero de caja chica autorizada</p>
                  </button>
                </div>
              </div>
            )
          )}

          {/* ================================================== */}
          {/* 3. VISTA MAESTRO (Docente)                        */}
          {/* ================================================== */}
          {user.role === 'MAESTRO' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-[#2fbf71] uppercase tracking-wider">Pilar Académico</span>
                  <h2 className="text-2xl font-black text-[#223a5e]">Mis Salones & Asignaturas</h2>
                  <p className="text-xs text-slate-500 mt-1">Registro de calificaciones por periodo y asistencia.</p>
                </div>
                <button
                  onClick={() => handleOpenProfileModal('info')}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#223a5e] text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Mi Perfil Docente</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {[
                  { course: 'Álgebra y Funciones', grade: '3° Primaria A', students: 28, room: 'Aula 204' },
                  { course: 'Geometría y Medición', grade: '3° Primaria B', students: 26, room: 'Aula 205' },
                  { course: 'Aritmética Básica', grade: '4° Primaria A', students: 30, room: 'Aula 301' },
                ].map((c, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-md bg-[#e6f9ef] text-[#26995b] text-xs font-bold">
                        {c.grade}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">{c.room}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-[#223a5e] text-sm">{c.course}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{c.students} Estudiantes matriculados</p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => addAlert({ type: 'info', title: c.course, message: `Abriendo registro de notas para ${c.grade}.` })}
                        className="flex-1 py-1.5 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold transition cursor-pointer"
                      >
                        Subir Notas
                      </button>
                      <button
                        onClick={() => addAlert({ type: 'info', title: c.course, message: `Iniciando toma de asistencia para ${c.grade}.` })}
                        className="flex-1 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#223a5e] text-xs font-bold transition cursor-pointer"
                      >
                        Asistencia
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* 4. VISTA APODERADO (Familia)                      */}
          {/* ================================================== */}
          {user.role === 'APODERADO' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-xs font-bold text-[#2fbf71] uppercase tracking-wider">Portal del Apoderado</span>
                  <h2 className="text-2xl font-black text-[#223a5e]">Seguimiento de Mateo Pérez Ramos</h2>
                  <p className="text-xs text-slate-500 mt-1">Nivel Primaria &bull; 3° Grado - Sección A</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenProfileModal('info')}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#223a5e] text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Datos de Familia</span>
                  </button>
                  <div className="px-3.5 py-1.5 rounded-xl bg-[#e6f9ef] text-[#26995b] text-xs font-bold">
                    Estado: Al día
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <h3 className="text-sm font-bold text-[#223a5e] mb-4 flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-[#2fbf71]" />
                    <span>Calificaciones Recientes (II Bimestre)</span>
                  </h3>
                  <div className="space-y-2">
                    {[
                      { curso: 'Matemáticas (Álgebra)', nota: '17', estado: 'Aprobado', prof: 'Prof. Carlos Mendoza' },
                      { curso: 'Comunicación Integral', nota: '16', estado: 'Aprobado', prof: 'Prof. Lucía Reyes' },
                      { curso: 'Ciencia y Tecnología', nota: '18', estado: 'Sobresaliente', prof: 'Prof. Miguel Ángel' },
                      { curso: 'Inglés', nota: '15', estado: 'Aprobado', prof: 'Prof. Sarah Jenkins' },
                    ].map((row, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-[#223a5e]">{row.curso}</p>
                          <p className="text-[11px] text-slate-400">{row.prof}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-[#2fbf71]">{row.estado}</span>
                          <span className="w-8 h-8 rounded-lg bg-[#2fbf71] text-white font-black text-xs flex items-center justify-center">
                            {row.nota}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-[#223a5e] flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#2fbf71]" />
                    <span>Estado de Pensiones</span>
                  </h3>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Pensión Octubre</span>
                      <span className="text-[#2fbf71] font-bold">PAGADO</span>
                    </div>
                    <p className="text-sm font-black text-[#223a5e] mt-1">S/ 350.00</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Pensión Noviembre</span>
                      <span className="text-amber-600 font-bold">PENDIENTE</span>
                    </div>
                    <p className="text-sm font-black text-[#223a5e] mt-1">S/ 350.00</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Vencimiento: 05 de Noviembre</p>
                  </div>

                  <button
                    onClick={() => addAlert({ type: 'info', title: 'Subir Comprobante', message: 'Selecciona la foto de la constancia de pago de pensión.' })}
                    className="w-full py-2.5 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white font-bold text-xs shadow-md shadow-[#2fbf71]/20 transition cursor-pointer"
                  >
                    Subir Comprobante de Pago
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* 5. VISTA DISCRETA PARA SOPORTE (Dueño del SaaS)    */}
          {/* ================================================== */}
          {user.role === 'SOPORTE' && (
            activeTab === 'saas_tenants' ? (
              <TenantsManager onNotify={addAlert} />
            ) : activeTab === 'saas_users' ? (
              <UsersManager
                currentUserId={user.id}
                currentUserRole={user.role}
                onNotify={addAlert}
              />
            ) : (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Consola Privada del Desarrollador</span>
                    <h2 className="text-2xl font-black text-[#223a5e]">Métricas SaaS, Costos & Retorno de Inversión</h2>
                    <p className="text-xs text-slate-500 mt-1">Esta vista solo es visible para ti con tu cuenta de desarrollador.</p>
                  </div>
                <button
                  onClick={() => handleOpenProfileModal('info')}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200 hover:bg-purple-100 transition cursor-pointer flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Mi Perfil Dev</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div
                  onClick={() => handleTabChange('saas_tenants')}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs cursor-pointer hover:border-purple-300 transition group"
                  title="Gestionar Colegios Clientes"
                >
                  <span className="text-xs font-bold text-slate-400 uppercase group-hover:text-purple-600 transition">Colegios Registrados</span>
                  <p className="text-2xl font-black text-[#2fbf71] mt-1">Ver Clientes &rarr;</p>
                  <p className="text-xs text-slate-500 mt-0.5">Administrar colegios y directores</p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <span className="text-xs font-bold text-slate-400 uppercase">Costo Servidores & APIs</span>
                  <p className="text-2xl font-black text-rose-600 mt-1">$52.00</p>
                  <p className="text-xs text-slate-500 mt-0.5">Railway, RENIEC & Cloudflare</p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <span className="text-xs font-bold text-slate-400 uppercase">Utilidad Limpia</span>
                  <p className="text-2xl font-black text-emerald-600 mt-1">+$128.00</p>
                  <p className="text-xs text-slate-500 mt-0.5">Margen neto mensual</p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <span className="text-xs font-bold text-slate-400 uppercase">ROI Tecnológico</span>
                  <p className="text-2xl font-black text-purple-600 mt-1">246%</p>
                  <p className="text-xs text-slate-500 mt-0.5">Inversión recuperada</p>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <h3 className="text-sm font-bold text-[#223a5e] mb-4">Acciones de Soporte y Desbloqueos (Overrides)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    onClick={() => addAlert({ type: 'warning', title: 'Override Ejecutado', message: 'Se ha desbloqueado la sesión de caja sin requerir token.' })}
                    className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition cursor-pointer"
                  >
                    <p className="text-xs font-bold text-[#223a5e]">Desbloquear Caja Forzada</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Autorizar cierre omitiendo discrepancias</p>
                  </button>
                  <button
                    onClick={() => addAlert({ type: 'info', title: 'Credenciales', message: 'Enviando enlace de restablecimiento seguro al director.' })}
                    className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition cursor-pointer"
                  >
                    <p className="text-xs font-bold text-[#223a5e]">Reset de Credenciales Director</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Regenerar acceso administrativo</p>
                  </button>
                  <button
                    onClick={() => addAlert({ type: 'success', title: 'Auditoría OK', message: 'Base de datos PostgreSQL en estado óptimo con 0 errores.' })}
                    className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition cursor-pointer"
                  >
                    <p className="text-xs font-bold text-[#223a5e]">Ver Logs de Auditoría</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Consultar tabla v2.audit_logs en Postgres</p>
                  </button>
                </div>
              </div>
            </div>
            )
          )}

        </main>
      </div>

      {/* Modal de Edición de Perfil & Contraseña */}
      <ProfileModal
        isOpen={isProfileOpen}
        initialTab={profileInitialTab}
        onClose={() => setIsProfileOpen(false)}
        currentUser={user}
        onUserUpdated={handleUserUpdated}
        onNotify={addAlert}
      />

      {/* Sistema Flotante de Alertas Toast (renderizado al final para máxima visibilidad) */}
      <AlertToast alerts={alerts} onDismiss={dismissAlert} />

      {/* Monitor Central de Inactividad de Sesión (Superpuesto en nivel superior con React Portal) */}
      <IdleSessionWatcher />
    </div>
  );
}
