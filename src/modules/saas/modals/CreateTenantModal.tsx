'use client';

import React, { useState } from 'react';
import { Building2, UserCheck, Sparkles, Eye, EyeOff } from 'lucide-react';
import { ModalTemplate, Button } from '@/shared';
import { AlertType } from '@/shared/ui/AlertToast';

interface CreateTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onNotify: (alert: { type: AlertType; title: string; message?: string }) => void;
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '')
    .replace(/^-+|-+$/g, '');

const generateRandomPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let pass = '';
  for (let i = 0; i < 9; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
};

export default function CreateTenantModal({
  isOpen,
  onClose,
  onSuccess,
  onNotify,
}: CreateTenantModalProps) {
  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [schoolPlan, setSchoolPlan] = useState<'BASIC' | 'PRO' | 'ENTERPRISE'>('PRO');
  const [monthlyFee, setMonthlyFee] = useState('180');
  const [schoolRuc, setSchoolRuc] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [schoolPhone, setSchoolPhone] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');

  const [adminName, setAdminName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState(() => generateRandomPassword());
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminDocument, setAdminDocument] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);

  const handleNameChange = (val: string) => {
    setSchoolName(val);
    if (!schoolCode || schoolCode === slugify(schoolName)) {
      setSchoolCode(slugify(val));
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !schoolName.trim() ||
      !schoolCode.trim() ||
      !adminName.trim() ||
      !adminUsername.trim() ||
      !adminPassword.trim()
    ) {
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

      setSchoolName('');
      setSchoolCode('');
      setSchoolRuc('');
      setSchoolEmail('');
      setSchoolPhone('');
      setSchoolAddress('');
      setAdminName('');
      setAdminUsername('');
      setAdminPassword(generateRandomPassword());
      setAdminEmail('');
      setAdminPhone('');
      setAdminDocument('');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear colegio';
      onNotify({ type: 'error', title: 'Error', message: msg });
    } finally {
      setSavingCreate(false);
    }
  };

  return (
    <ModalTemplate
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      variant="indigo"
      icon={Building2}
      title="Alta de Colegio & Primer Director"
      subtitle="Crea la institución y genera el usuario de acceso para su Director"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={savingCreate}>
            Cancelar
          </Button>
          <Button
            variant="success"
            size="sm"
            loading={savingCreate}
            onClick={handleCreateTenant}
          >
            {savingCreate ? 'Creando Institución...' : 'Guardar Colegio & Director'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleCreateTenant} className="space-y-6">
        {/* SECCIÓN 1: DATOS DE LA INSTITUCIÓN */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              1. Información del Colegio (Institución)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre del Colegio *
              </label>
              <input
                type="text"
                required
                value={schoolName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ej. Colegio San Agustín"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Código / Identificador Único *
              </label>
              <input
                type="text"
                required
                value={schoolCode}
                onChange={(e) => setSchoolCode(slugify(e.target.value))}
                placeholder="ej. sanagustin"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono transition"
              />
              <span className="text-[10px] text-slate-400">Identificador interno del colegio</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Plan SaaS *
              </label>
              <select
                value={schoolPlan}
                onChange={(e) => setSchoolPlan(e.target.value as 'BASIC' | 'PRO' | 'ENTERPRISE')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition cursor-pointer"
              >
                <option value="BASIC">Plan Básico</option>
                <option value="PRO">Plan PRO (Recomendado)</option>
                <option value="ENTERPRISE">Plan Enterprise</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tarifa Mensual ($ USD) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(e.target.value)}
                placeholder="180"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                RUC Institucional
              </label>
              <input
                type="text"
                value={schoolRuc}
                onChange={(e) => setSchoolRuc(e.target.value)}
                placeholder="20123456789"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Correo Institucional
              </label>
              <input
                type="email"
                value={schoolEmail}
                onChange={(e) => setSchoolEmail(e.target.value)}
                placeholder="contacto@colegio.edu.pe"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Teléfono Institucional
              </label>
              <input
                type="text"
                value={schoolPhone}
                onChange={(e) => setSchoolPhone(e.target.value)}
                placeholder="+51 987 654 321"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: DATOS DEL PRIMER ADMINISTRADOR (DIRECTOR) */}
        <div className="space-y-3.5 pt-2">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              2. Cuenta del Director / Dueño del Colegio (Rol Administrador)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre Completo del Director *
              </label>
              <input
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Ej. Dr. Mario Vargas Llosa"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Usuario de Acceso del Director *
              </label>
              <input
                type="text"
                required
                value={adminUsername}
                onChange={(e) => setAdminUsername(slugify(e.target.value))}
                placeholder="ej. director.sanagustin"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono transition"
              />
              <span className="text-[10px] text-slate-400">Usuario con el que iniciará sesión</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Contraseña Inicial del Director *
              </label>
              <button
                type="button"
                onClick={() => setAdminPassword(generateRandomPassword())}
                className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition pr-10 font-mono"
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
              <label className="block text-xs font-bold text-slate-700 mb-1">
                DNI del Director
              </label>
              <input
                type="text"
                value={adminDocument}
                onChange={(e) => setAdminDocument(e.target.value)}
                placeholder="09876543"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Correo del Director
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="director@colegio.edu.pe"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Celular del Director
              </label>
              <input
                type="text"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                placeholder="999 888 777"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
            </div>
          </div>
        </div>
      </form>
    </ModalTemplate>
  );
}
