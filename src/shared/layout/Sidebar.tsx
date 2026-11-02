'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Building2,
  Users,
  BookOpen,
  HeartHandshake,
  BarChart3,
  DollarSign,
  ClipboardList,
  Wallet,
  CalendarCheck,
  LogOut,
  Layers,
  FileText,
  BadgeAlert,
  ChevronRight,
  ChevronDown,
  UserCheck,
  Landmark,
  ShoppingBag,
  Sliders,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { AuthUser, UserRole } from '@/types';

interface SubmoduleItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

interface ModuleItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  submodules?: SubmoduleItem[];
}

interface MenuCategory {
  title?: string;
  modules: ModuleItem[];
}

interface SidebarProps {
  user: AuthUser;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenProfile?: () => void;
}

// Definición de Menús con Módulos y Submódulos jerárquicos
const ROLE_MENUS: Record<
  UserRole,
  {
    roleTitle: string;
    categories: MenuCategory[];
  }
> = {
  // 1. SOPORTE (Consola Central SaaS)
  SOPORTE: {
    roleTitle: 'Consola Master SaaS',
    categories: [
      {
        title: 'Administración Global',
        modules: [
          {
            id: 'mod_saas_pillar',
            label: 'Gestión SaaS',
            icon: Building2,
            badge: '5',
            submodules: [
              { id: 'saas_roi', label: 'Finanzas SaaS & ROI', icon: BarChart3 },
              { id: 'saas_tenants', label: 'Colegios Clientes', icon: Building2 },
              { id: 'saas_users', label: 'Usuarios Globales', icon: Users },
              { id: 'saas_overrides', label: 'Consola de Soporte', icon: BadgeAlert },
              { id: 'saas_audit', label: 'Auditoría & Logs', icon: FileText },
            ],
          },
        ],
      },
    ],
  },

  // 2. ADMINISTRADOR (Director del Colegio)
  ADMINISTRADOR: {
    roleTitle: 'Dirección General',
    categories: [
      {
        title: 'Resumen',
        modules: [
          {
            id: 'overview',
            label: 'Panel General',
            icon: BarChart3,
          },
        ],
      },
      {
        title: 'Pilares del Colegio',
        modules: [
          {
            id: 'mod_admin_pillar',
            label: 'Pilar Administrativo',
            icon: Layers,
            badge: '6',
            submodules: [
              { id: 'admin_rules', label: 'Datos & Reglas', icon: Building2 },
              { id: 'admin_staff', label: 'Personal & Usuarios', icon: Users },
              { id: 'admin_structure', label: 'Aulas & Vacantes', icon: Layers },
              { id: 'admin_guardians', label: 'Familias & Apoderados', icon: HeartHandshake },
              { id: 'admin_students', label: 'Padrón de Alumnos', icon: GraduationCap },
              { id: 'admin_enrollments', label: 'Admisión & Matrículas', icon: ClipboardList },
            ],
          },
          {
            id: 'mod_finance_pillar',
            label: 'Pilar Financiero',
            icon: DollarSign,
            badge: '5',
            submodules: [
              { id: 'admin_balance', label: 'Flujo de Caja', icon: DollarSign },
              { id: 'admin_tuitions', label: 'Pensiones & Moras', icon: Users },
              { id: 'admin_products', label: 'Productos & Uniformes', icon: ShoppingBag },
              { id: 'admin_commitments', label: 'Servicios & Préstamos', icon: Landmark },
              { id: 'admin_shifts', label: 'Arqueo de Caja Diaria', icon: Wallet },
            ],
          },
          {
            id: 'mod_academic_pillar',
            label: 'Pilar Académico',
            icon: GraduationCap,
            badge: '1',
            submodules: [
              { id: 'admin_academic', label: 'Calificaciones', icon: ClipboardList },
            ],
          },
        ],
      },
    ],
  },

  // 3. COLABORADOR (Secretaría & Caja)
  COLABORADOR: {
    roleTitle: 'Secretaría y Tesorería',
    categories: [
      {
        title: 'Operaciones',
        modules: [
          {
            id: 'mod_colab_ops',
            label: 'Gestión Diaria',
            icon: Wallet,
            badge: '4',
            submodules: [
              { id: 'colab_ops', label: 'Panel de Turno', icon: BarChart3 },
              { id: 'colab_enroll', label: 'Admisión & Matrícula', icon: ClipboardList },
              { id: 'colab_cash', label: 'Caja & Cobranzas', icon: Wallet },
              { id: 'colab_expenses', label: 'Registro de Egresos', icon: DollarSign },
            ],
          },
        ],
      },
    ],
  },

  // 4. MAESTRO (Docente)
  MAESTRO: {
    roleTitle: 'Portal del Docente',
    categories: [
      {
        title: 'Aula & Alumnos',
        modules: [
          {
            id: 'mod_teacher_ops',
            label: 'Pilar Académico',
            icon: BookOpen,
            badge: '3',
            submodules: [
              { id: 'teach_classes', label: 'Mis Aulas & Cursos', icon: BookOpen },
              { id: 'teach_grades', label: 'Subir Calificaciones', icon: ClipboardList },
              { id: 'teach_attendance', label: 'Toma de Asistencia', icon: CalendarCheck },
            ],
          },
        ],
      },
    ],
  },

  // 5. APODERADO (Familia)
  APODERADO: {
    roleTitle: 'Portal Familiar',
    categories: [
      {
        title: 'Seguimiento Familiar',
        modules: [
          {
            id: 'mod_parent_ops',
            label: 'Mi Estudiante',
            icon: HeartHandshake,
            badge: '3',
            submodules: [
              { id: 'parent_student', label: 'Ficha de mi Hijo', icon: Users },
              { id: 'parent_grades', label: 'Libreta de Notas', icon: ClipboardList },
              { id: 'parent_debts', label: 'Pensiones & Pagos', icon: Wallet },
            ],
          },
        ],
      },
    ],
  },
};

export default function Sidebar({ user, activeTab, setActiveTab, onOpenProfile }: SidebarProps) {
  const router = useRouter();
  const currentConfig = ROLE_MENUS[user.role] || ROLE_MENUS.ADMINISTRADOR;
  const prevActiveTabRef = useRef<string | null>(null);

  // Estado para controlar módulos abiertos / colapsados
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    mod_admin_pillar: true,
    mod_finance_pillar: false,
    mod_academic_pillar: false,
    mod_saas_pillar: true,
    mod_colab_ops: true,
    mod_teacher_ops: true,
    mod_parent_ops: true,
  });

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch {
      router.push('/');
    }
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const isCurrentlyOpen = Boolean(prev[moduleId]);
      if (isCurrentlyOpen) {
        // Si el usuario hace clic en el pilar que ya está abierto, se minimiza
        return {
          ...prev,
          [moduleId]: false,
        };
      }
      // Al desplegar un pilar, todos los demás pilares se minimizan automáticamente
      const next: Record<string, boolean> = {};
      for (const cat of currentConfig.categories) {
        for (const mod of cat.modules) {
          if (mod.submodules && mod.submodules.length > 0) {
            next[mod.id] = false;
          }
        }
      }
      next[moduleId] = true;
      return next;
    });
  };

  // Auto-expandir únicamente el pilar que contiene el submódulo activo cuando la pestaña activa cambia
  useEffect(() => {
    if (!activeTab) return;
    // Si la pestaña no ha cambiado, no sobreescribir la interacción manual del usuario en el acordeón
    if (prevActiveTabRef.current === activeTab) return;
    prevActiveTabRef.current = activeTab;

    for (const cat of currentConfig.categories) {
      for (const mod of cat.modules) {
        if (mod.submodules?.some((s) => s.id === activeTab)) {
          setExpandedModules(() => {
            const next: Record<string, boolean> = {};
            for (const c of currentConfig.categories) {
              for (const m of c.modules) {
                if (m.submodules && m.submodules.length > 0) {
                  next[m.id] = m.id === mod.id;
                }
              }
            }
            return next;
          });
          return;
        }
      }
    }
  }, [activeTab, currentConfig]);

  return (
    <aside className="w-64 h-screen max-h-screen bg-white border-r border-slate-200/90 flex flex-col shrink-0 shadow-xs select-none z-20 overflow-hidden">
      {/* 1. Cabecera Fija del Sidebar con Branding Oficial */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#2fbf71] flex items-center justify-center shadow-md shadow-[#2fbf71]/20 shrink-0">
            <GraduationCap className="w-5 h-5 text-white stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 leading-none">
              <span className="text-lg font-black tracking-tight text-[#2fbf71]">Educa</span>
              <span className="text-lg font-black tracking-tight text-[#223a5e]">360</span>
            </div>
            <p
              className="text-[11px] font-bold text-slate-500 truncate max-w-[145px] mt-1"
              title={user.tenant ? user.tenant.name : 'Plataforma SaaS'}
            >
              {user.tenant ? user.tenant.name : 'Plataforma SaaS'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Área Central Navegable con Scroll Suave */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-3 space-y-4"
        style={{ scrollbarWidth: 'thin' }}
      >
        {currentConfig.categories.map((cat, catIdx) => (
          <div key={catIdx} className="space-y-1.5">
            {cat.title && (
              <div className="px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                {cat.title}
              </div>
            )}

            {cat.modules.map((mod) => {
              const Icon = mod.icon;
              const hasSubmodules = Boolean(mod.submodules && mod.submodules.length > 0);
              const isExpanded = Boolean(expandedModules[mod.id]);
              const hasActiveChild = mod.submodules?.some((s) => s.id === activeTab);
              const isDirectActive = activeTab === mod.id;

              // Caso A: Módulo con Submódulos (Acordeón desplegable)
              if (hasSubmodules && mod.submodules) {
                return (
                  <div key={mod.id} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleModule(mod.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                        hasActiveChild
                          ? 'bg-slate-100/80 text-[#223a5e]'
                          : 'text-slate-700 hover:text-[#223a5e] hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 ${
                            hasActiveChild ? 'text-[#2fbf71]' : 'text-slate-500'
                          }`}
                        />
                        <span>{mod.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {mod.badge && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                              hasActiveChild
                                ? 'bg-[#2fbf71] text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {mod.badge}
                          </span>
                        )}
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                            isExpanded ? 'rotate-0' : '-rotate-90'
                          }`}
                        />
                      </div>
                    </button>

                    {/* Submódulos Desplegados */}
                    {isExpanded && (
                      <div className="ml-4 pl-2.5 border-l-2 border-slate-200 space-y-1 py-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                        {mod.submodules.map((sub) => {
                          const SubIcon = sub.icon;
                          const isSubActive = activeTab === sub.id;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => setActiveTab(sub.id)}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                                isSubActive
                                  ? 'bg-[#e6f9ef] text-[#26995b] font-bold shadow-2xs'
                                  : 'text-slate-600 hover:text-[#223a5e] hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <SubIcon
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isSubActive ? 'text-[#2fbf71]' : 'text-slate-400'
                                  }`}
                                />
                                <span className="truncate">{sub.label}</span>
                              </div>
                              {isSubActive && (
                                <div className="w-1.5 h-1.5 rounded-full bg-[#2fbf71] shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Caso B: Módulo Directo sin Submódulos (ej. Panel General)
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setActiveTab(mod.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    isDirectActive
                      ? 'bg-[#e6f9ef] text-[#26995b] shadow-2xs'
                      : 'text-slate-700 hover:text-[#223a5e] hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 ${
                        isDirectActive ? 'text-[#2fbf71]' : 'text-slate-500'
                      }`}
                    />
                    <span>{mod.label}</span>
                  </div>
                  {isDirectActive && <ChevronRight className="w-3.5 h-3.5 text-[#2fbf71]" />}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* 3. Pie Fijo del Sidebar: Tarjeta de Usuario & Cerrar Sesión (SIEMPRE VISIBLE) */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/80 shrink-0 space-y-2 mt-auto">
        <button
          type="button"
          onClick={onOpenProfile}
          className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 transition text-left cursor-pointer group shadow-2xs"
          title="Abrir Mi Perfil"
        >
          <div className="w-8 h-8 rounded-full bg-[#2fbf71]/15 text-[#2fbf71] font-bold text-xs flex items-center justify-center border border-[#2fbf71]/30 shrink-0 overflow-hidden">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span>{user.name.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#223a5e] truncate group-hover:text-[#2fbf71] transition">
              {user.name}
            </p>
            <span className="inline-block px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-600 text-[9px] font-black uppercase tracking-wider">
              {user.role}
            </span>
          </div>
          <UserCheck className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#2fbf71] transition shrink-0" />
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
