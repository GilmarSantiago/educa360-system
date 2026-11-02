'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2,
  PlusCircle,
  RefreshCw,
  DollarSign,
  Users,
  Power,
  Layers,
} from 'lucide-react';
import { TenantItem } from '@/shared/types';
import { AlertType } from '@/shared/ui/AlertToast';
import Pagination from '@/shared/ui/Pagination';
import {
  ModuleViewTemplate,
  DataTableTemplate,
  ConfirmDialogTemplate,
  StatCard,
  StatusBadge,
  Button,
} from '@/shared';
import CreateTenantModal from '../modals/CreateTenantModal';

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

  const promptToggleStatus = (t: TenantItem) => {
    setConfirmTenantModal({
      isOpen: true,
      tenant: t,
      action: t.status === 'ACTIVE' ? 'suspend' : 'activate',
    });
  };

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

  const totalMonthlyRevenue = tenants.reduce((acc, t) => acc + (Number(t.monthly_fee) || 0), 0);
  const activeTenantsCount = tenants.filter((t) => t.status === 'ACTIVE').length;
  const totalUsersAcrossAllSchools = tenants.reduce((acc, t) => acc + (Number(t.total_users) || 0), 0);

  return (
    <ModuleViewTemplate
      badgeText="Consola Central SaaS • Onboarding de Clientes"
      title="Colegios Clientes (Instituciones SaaS)"
      subtitle="Registra nuevos colegios en la plataforma, aprovisiona la cuenta del Director y administra licencias activas."
      icon={Building2}
      actions={
        <>
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            loading={loading}
            onClick={() => fetchTenants()}
            title="Refrescar colegios"
          />
          <Button
            variant="success"
            size="sm"
            icon={PlusCircle}
            onClick={() => setCreateModalOpen(true)}
          >
            Registrar Nuevo Colegio
          </Button>
        </>
      }
      statsGrid={
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard
            title="Colegios Activos"
            value={`${activeTenantsCount} / ${tenants.length}`}
            subtitle="Instituciones operativas"
            icon={Building2}
            variant="indigo"
          />
          <StatCard
            title="Facturación Mensual SaaS"
            value={`$${totalMonthlyRevenue.toFixed(2)}`}
            subtitle="Ingresos recurrentes (MRR)"
            icon={DollarSign}
            variant="emerald"
          />
          <StatCard
            title="Usuarios Totales"
            value={totalUsersAcrossAllSchools}
            subtitle="Directores, docentes y personal"
            icon={Users}
            variant="violet"
          />
          <StatCard
            title="Base de Datos"
            value="Schema v2"
            subtitle="PostgreSQL • Multi-Tenant"
            icon={Layers}
            variant="slate"
          />
        </div>
      }
    >
      <DataTableTemplate
        title="Directorio de Instituciones Clientes"
        subtitle="Gestión centralizada de accesos, planes y facturación SaaS"
        searchPlaceholder="Buscar por nombre de colegio, código o director..."
        searchValue={search}
        onSearchChange={setSearch}
        loading={loading}
        loadingText="Cargando colegios clientes..."
        isEmpty={filteredTenants.length === 0}
        emptyIcon={Building2}
        emptyTitle="No hay colegios registrados"
        emptyDescription={
          search
            ? `No se encontraron coincidencias para "${search}".`
            : 'Usa el botón "Registrar Nuevo Colegio" para dar de alta al primer colegio cliente y su respectivo director.'
        }
        footer={
          filteredTenants.length > 0 ? (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredTenants.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(size: number) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
              itemsPerPageOptions={[5, 10, 20, 50]}
              labelSingular="colegio"
              labelPlural="colegios"
            />
          ) : undefined
        }
      >
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
                <td className="py-3.5 px-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-100 shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{t.name}</p>
                      <span className="text-[11px] text-emerald-600 font-mono font-semibold">
                        id: {t.code}
                      </span>
                    </div>
                  </div>
                </td>

                <td className="py-3.5 px-4">
                  <div className="space-y-0.5">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] tracking-wide uppercase border border-emerald-200">
                      Plan {t.plan}
                    </span>
                    <p className="text-xs font-extrabold text-slate-800">
                      ${Number(t.monthly_fee || 0).toFixed(2)} / mes
                    </p>
                  </div>
                </td>

                <td className="py-3.5 px-4">
                  {t.admin_name ? (
                    <div>
                      <p className="font-bold text-slate-800 text-xs">{t.admin_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">@{t.admin_username}</p>
                      {t.admin_email && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                          {t.admin_email}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-xs">Sin director asignado</span>
                  )}
                </td>

                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.total_users || 0} usuarios</span>
                  </div>
                </td>

                <td className="py-3.5 px-4">
                  <StatusBadge status={t.status} />
                </td>

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
      </DataTableTemplate>

      {/* Modal Modularizado: Crear Nuevo Colegio */}
      <CreateTenantModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchTenants}
        onNotify={onNotify}
      />

      {/* Plantilla Estándar de Confirmación: Suspender / Reactivar Colegio */}
      <ConfirmDialogTemplate
        isOpen={confirmTenantModal.isOpen && Boolean(confirmTenantModal.tenant)}
        onClose={() => setConfirmTenantModal({ isOpen: false, tenant: null, action: 'suspend' })}
        onConfirm={executeToggleStatus}
        loading={savingTenantToggle}
        variant={confirmTenantModal.action === 'suspend' ? 'danger' : 'success'}
        title={
          confirmTenantModal.action === 'suspend'
            ? '¿Suspender colegio cliente?'
            : '¿Reactivar colegio cliente?'
        }
        subtitle={
          confirmTenantModal.tenant
            ? `${confirmTenantModal.tenant.name} (id: ${confirmTenantModal.tenant.code})`
            : ''
        }
        confirmLabel={
          confirmTenantModal.action === 'suspend'
            ? 'Sí, Suspender Colegio'
            : 'Sí, Reactivar Colegio'
        }
        description={
          confirmTenantModal.action === 'suspend' ? (
            <div className="space-y-1.5">
              <p className="font-bold">Impacto de suspender este colegio:</p>
              <p className="text-xs">
                Todos los directores, docentes, colaboradores y apoderados vinculados a{' '}
                <strong>{confirmTenantModal.tenant?.name}</strong> verán bloqueado su ingreso al
                campus virtual de forma inmediata.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="font-bold">Habilitación del servicio:</p>
              <p className="text-xs">
                El acceso será restablecido inmediatamente para todos los usuarios pertenecientes a{' '}
                <strong>{confirmTenantModal.tenant?.name}</strong>.
              </p>
            </div>
          )
        }
      />
    </ModuleViewTemplate>
  );
}
