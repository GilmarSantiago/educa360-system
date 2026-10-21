'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Upload,
  Camera,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { AuthUser } from '@/types';
import { AlertType } from '@/components/ui/AlertToast';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  initialTab?: 'info' | 'password';
  onUserUpdated: (updatedUser: { name: string; email?: string | null; phone?: string | null; avatar?: string | null }) => void;
  onNotify?: (alert: { type: AlertType; title: string; message?: string }) => void;
}

// Avatares predefinidos de alta calidad estilo ilustrado profesional
const PRESET_AVATARS = [
  { id: 'av-1', name: 'Director Ejecutivo', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Alexander' },
  { id: 'av-2', name: 'Directora Académica', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Victoria' },
  { id: 'av-3', name: 'Profesor Ciencias', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Mason' },
  { id: 'av-4', name: 'Profesora Letras', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Sofia' },
  { id: 'av-5', name: 'Secretaría / Tesorería', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Elena' },
  { id: 'av-6', name: 'Administrador TI', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Adrian' },
  { id: 'av-7', name: 'Padre de Familia', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Carlos' },
  { id: 'av-8', name: 'Madre / Tutora', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Camila' },
];

export default function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  initialTab = 'info',
  onUserUpdated,
  onNotify,
}: ProfileModalProps) {
  // Pestaña activa (siempre respeta initialTab al abrirse)
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');

  // Formulario de Información Personal
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [document, setDocument] = useState('');
  const [address, setAddress] = useState('');
  const [avatar, setAvatar] = useState<string | null>(currentUser.avatar || null);
  const [savingInfo, setSavingInfo] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [infoMessage, setInfoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Formulario de Contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reiniciar estado y respetar pestaña inicial cada vez que se abre el modal
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setName(currentUser.name);
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setAvatar(currentUser.avatar || null);
      setInfoMessage(null);
      setPasswordMessage(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Cargar detalles completos del usuario desde PostgreSQL
      fetch('/api/user/profile')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.profile) {
            setName(data.profile.name || currentUser.name);
            setEmail(data.profile.email || '');
            setPhone(data.profile.phone || '');
            setDocument(data.profile.document || '');
            setAddress(data.profile.address || '');
            setAvatar(data.profile.avatar || null);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, initialTab, currentUser]);

  if (!isOpen) return null;

  // Subir archivo propio desde el explorador del usuario
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al subir la imagen');
      }

      setAvatar(data.avatarUrl);
      onUserUpdated({ name, email, phone, avatar: data.avatarUrl });
      onNotify?.({
        type: 'success',
        title: '¡Foto de perfil actualizada!',
        message: 'Tu imagen personalizada se subió y aplicó correctamente.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al subir foto';
      onNotify?.({ type: 'error', title: 'Error al subir imagen', message: msg });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Seleccionar avatar de la galería predefinida
  const handleSelectPreset = async (presetUrl: string) => {
    setUploadingAvatar(true);
    try {
      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al cambiar avatar');
      }

      setAvatar(presetUrl);
      onUserUpdated({ name, email, phone, avatar: presetUrl });
      onNotify?.({
        type: 'info',
        title: 'Avatar seleccionado',
        message: 'Se aplicó el nuevo avatar ilustrado a tu cuenta.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado';
      onNotify?.({ type: 'error', title: 'Error', message: msg });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Quitar foto y volver a inicial
  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al remover avatar');
      }

      setAvatar(null);
      onUserUpdated({ name, email, phone, avatar: null });
      onNotify?.({
        type: 'info',
        title: 'Foto removida',
        message: 'Tu perfil ahora muestra tus iniciales por defecto.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      onNotify?.({ type: 'error', title: 'Error', message: msg });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Guardar datos personales
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setInfoMessage({ type: 'error', text: 'El nombre completo es requerido' });
      onNotify?.({ type: 'warning', title: 'Campo incompleto', message: 'El nombre no puede estar en blanco' });
      return;
    }

    setSavingInfo(true);
    setInfoMessage(null);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, document, address, avatar }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al actualizar perfil');
      }

      setInfoMessage({ type: 'success', text: '¡Perfil actualizado correctamente!' });
      onUserUpdated({ name, email, phone, avatar });
      onNotify?.({
        type: 'success',
        title: '¡Perfil Actualizado!',
        message: 'Tus datos personales se han guardado exitosamente en el sistema.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado';
      setInfoMessage({ type: 'error', text: msg });
      onNotify?.({ type: 'error', title: 'Error al guardar', message: msg });
    } finally {
      setSavingInfo(false);
    }
  };

  // Cambiar contraseña
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Por favor completa todos los campos' });
      onNotify?.({ type: 'warning', title: 'Campos incompletos', message: 'Ingresa tu contraseña actual y la nueva' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres' });
      onNotify?.({ type: 'warning', title: 'Contraseña muy corta', message: 'Debe contener 6 o más caracteres' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Las nuevas contraseñas no coinciden' });
      onNotify?.({ type: 'error', title: 'No coinciden', message: 'La confirmación de contraseña es distinta' });
      return;
    }

    setSavingPassword(true);
    setPasswordMessage(null);

    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al cambiar contraseña');
      }

      setPasswordMessage({ type: 'success', text: '¡Contraseña cambiada con éxito!' });
      onNotify?.({
        type: 'success',
        title: '¡Contraseña Actualizada!',
        message: 'Tu contraseña de acceso fue cambiada y encriptada correctamente.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar cambio';
      setPasswordMessage({ type: 'error', text: msg });
      onNotify?.({ type: 'error', title: 'Error de Seguridad', message: msg });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Cabecera del Modal con Branding Oficial */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#223a5e] to-[#1c2f4c] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#2fbf71] text-white flex items-center justify-center font-bold text-lg shadow-sm overflow-hidden shrink-0">
              {avatar ? (
                <img src={avatar} alt="Foto de perfil" className="w-full h-full object-cover" />
              ) : (
                <span>{name.charAt(0) || 'U'}</span>
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight leading-tight">Mi Perfil & Seguridad</h3>
              <p className="text-xs text-slate-300 font-medium">
                {currentUser.tenant?.name || 'Administración Central'} &bull; @{currentUser.username}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de Pestañas con Restauración Automática */}
        <div className="flex border-b border-slate-100 px-6 bg-slate-50/70 text-xs font-bold">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'info'
                ? 'border-[#2fbf71] text-[#2fbf71]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Datos Personales & Foto</span>
          </button>

          <button
            onClick={() => setActiveTab('password')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'password'
                ? 'border-[#2fbf71] text-[#2fbf71]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Actualizar Contraseña</span>
          </button>
        </div>

        {/* Contenido del Formulario */}
        <div
          className="p-6 overflow-y-auto flex-1 space-y-5 no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          
          {/* TAB 1: DATOS PERSONALES & FOTO */}
          {activeTab === 'info' && (
            <div className="space-y-5">
              
              {/* Sección de Foto de Perfil */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#223a5e] flex items-center gap-1.5 uppercase tracking-wider">
                    <Camera className="w-3.5 h-3.5 text-[#2fbf71]" />
                    <span>Foto de Perfil</span>
                  </span>
                  {uploadingAvatar && (
                    <span className="text-[11px] font-semibold text-[#2fbf71] flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Guardando foto...
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Vista Previa del Avatar */}
                  <div className="relative w-16 h-16 rounded-2xl bg-[#2fbf71]/15 border-2 border-[#2fbf71] flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black text-[#2fbf71]">{name.charAt(0) || 'U'}</span>
                    )}
                  </div>

                  {/* Botones para Subir o Eliminar Foto */}
                  <div className="flex-1 space-y-1.5 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-[#223a5e] flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#2fbf71]" />
                        <span>Subir mi foto</span>
                      </button>

                      {avatar && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          disabled={uploadingAvatar}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600 flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Quitar foto</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Soporta JPG, PNG o WebP (hasta 2MB). Almacenamiento directo en base de datos (sin archivos locales).
                    </p>
                  </div>
                </div>

                {/* Galería de Avatares Predefinidos */}
                <div>
                  <p className="text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#2fbf71]" />
                    <span>Colección de Avatares Ilustrados:</span>
                  </p>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {PRESET_AVATARS.map((p) => {
                      const isSelected = avatar === p.url;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectPreset(p.url)}
                          title={p.name}
                          className={`w-11 h-11 rounded-xl p-0.5 border-2 transition cursor-pointer overflow-hidden ${
                            isSelected
                              ? 'border-[#2fbf71] ring-2 ring-[#2fbf71]/30 scale-105 bg-[#e6f9ef]'
                              : 'border-slate-200 hover:border-[#2fbf71]/50 bg-white'
                          }`}
                        >
                          <img src={p.url} alt={p.name} className="w-full h-full object-cover rounded-lg" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Formulario de Campos de Texto */}
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {infoMessage && (
                  <div
                    className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in ${
                      infoMessage.type === 'success'
                        ? 'bg-[#e6f9ef] border border-[#2fbf71]/30 text-[#26995b]'
                        : 'bg-rose-50 border border-rose-200 text-rose-700'
                    }`}
                  >
                    {infoMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-[#2fbf71] shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    )}
                    <span>{infoMessage.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#223a5e] uppercase tracking-wider mb-1">
                      Rol Asignado
                    </label>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 rounded-xl text-xs text-slate-600 font-bold border border-slate-200">
                      <Shield className="w-3.5 h-3.5 text-[#2fbf71]" />
                      <span>{currentUser.role}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#223a5e] uppercase tracking-wider mb-1">
                      Usuario (Identificador)
                    </label>
                    <input
                      type="text"
                      value={currentUser.username}
                      disabled
                      className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-bold cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#223a5e] uppercase tracking-wider mb-1">
                    Nombre Completo *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-[#2fbf71] focus:ring-2 focus:ring-[#2fbf71]/15 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#223a5e] uppercase tracking-wider mb-1">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ejemplo@educa360.com"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-[#2fbf71] transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#223a5e] uppercase tracking-wider mb-1">
                      Teléfono / Celular
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="999 888 777"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-[#2fbf71] transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#223a5e] uppercase tracking-wider mb-1">
                      Documento de Identidad (DNI)
                    </label>
                    <div className="relative">
                      <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={document}
                        onChange={(e) => setDocument(e.target.value)}
                        placeholder="DNI o Cédula"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-[#2fbf71] transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#223a5e] uppercase tracking-wider mb-1">
                      Dirección
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Av. Principal #123"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-[#2fbf71] transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingInfo}
                    className="px-5 py-2.5 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white font-bold text-xs shadow-md shadow-[#2fbf71]/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {savingInfo ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <span>Guardar Cambios</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: CAMBIO DE CONTRASEÑA */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordMessage && (
                <div
                  className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in ${
                    passwordMessage.type === 'success'
                      ? 'bg-[#e6f9ef] border border-[#2fbf71]/30 text-[#26995b]'
                      : 'bg-rose-50 border border-rose-200 text-rose-700'
                  }`}
                >
                  {passwordMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#2fbf71] shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span>{passwordMessage.text}</span>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <p className="font-semibold">Requisitos de seguridad:</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  La nueva contraseña debe tener un mínimo de 6 caracteres. Al cambiarla, tu sesión continuará activa de manera segura.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#223a5e] uppercase tracking-wider mb-1">
                  Contraseña Actual *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Tu contraseña actual"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-[#2fbf71] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#223a5e] uppercase tracking-wider mb-1">
                  Nueva Contraseña *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-[#2fbf71] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#223a5e] uppercase tracking-wider mb-1">
                  Confirmar Nueva Contraseña *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-[#2fbf71] transition"
                  />
                </div>
                {newPassword && confirmPassword && (
                  <p
                    className={`text-[11px] font-semibold mt-1 ${
                      newPassword === confirmPassword ? 'text-[#2fbf71]' : 'text-rose-500'
                    }`}
                  >
                    {newPassword === confirmPassword ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-5 py-2.5 rounded-xl bg-[#223a5e] hover:bg-[#1c2f4c] text-white font-bold text-xs shadow-md shadow-[#223a5e]/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingPassword ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Actualizando...</span>
                    </>
                  ) : (
                    <span>Actualizar Contraseña</span>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}
