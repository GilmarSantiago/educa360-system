'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Loader2,
  DollarSign,
  GraduationCap,
  Building2,
  ShieldCheck,
  Clock,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<{
    type: 'timeout' | 'expired';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const reason = params.get('reason');
      if (reason === 'timeout') {
        setSessionNotice({
          type: 'timeout',
          message: 'Tu sesión se cerró automáticamente tras 20 minutos de inactividad para resguardar la privacidad de los datos escolares.',
        });
      } else if (reason === 'expired') {
        setSessionNotice({
          type: 'expired',
          message: 'Tu sesión ha vencido por seguridad. Por favor, ingresa tus credenciales nuevamente.',
        });
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor ingresa tu usuario y contraseña');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Credenciales inválidas');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al conectar';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative p-4 sm:p-6"
      style={{
        backgroundImage: "url('/images/login-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Overlay institucional con los colores de marca Educa360 */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a]/85 via-[#223a5e]/75 to-[#2fbf71]/50 backdrop-blur-[2px] pointer-events-none" />

      {/* Contenedor Principal */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Columna Izquierda: Presentación Institucional (Los 3 Pilares) */}
        <div className="lg:col-span-7 text-white space-y-6 px-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold tracking-wide text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-[#2fbf71] animate-pulse" />
            Plataforma Integral de Gestión Educativa
          </div>

          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-none">
              <span className="text-[#2fbf71]">Educa</span>
              <span className="text-white">360</span>
            </h1>
            <p className="mt-3 text-base sm:text-lg text-slate-200 font-medium max-w-lg leading-relaxed">
              La solución tecnológica integral diseñada para optimizar y conectar todos los procesos de tu institución educativa.
            </p>
          </div>

          {/* Tarjetas de los 3 Pilares */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 hover:bg-white/15 transition">
              <div className="w-8 h-8 rounded-xl bg-[#2fbf71]/20 border border-[#2fbf71]/40 flex items-center justify-center mb-2.5">
                <Building2 className="w-4 h-4 text-[#2fbf71]" />
              </div>
              <h3 className="text-sm font-bold text-white">Administrativo</h3>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                Matrículas, legajos, reglas escolares y estructura por niveles.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 hover:bg-white/15 transition">
              <div className="w-8 h-8 rounded-xl bg-blue-400/20 border border-blue-400/40 flex items-center justify-center mb-2.5">
                <DollarSign className="w-4 h-4 text-blue-300" />
              </div>
              <h3 className="text-sm font-bold text-white">Financiero</h3>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                Caja diaria, pensiones, cobranzas, egresos y control de moras.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 hover:bg-white/15 transition">
              <div className="w-8 h-8 rounded-xl bg-teal-400/20 border border-teal-400/40 flex items-center justify-center mb-2.5">
                <GraduationCap className="w-4 h-4 text-teal-300" />
              </div>
              <h3 className="text-sm font-bold text-white">Académico</h3>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                Calificaciones, asistencia, horarios y libretas de notas.
              </p>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Tarjeta de Acceso Limpia con Branding Oficial */}
        <div className="lg:col-span-5">
          <div className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-xl border border-white/50 rounded-[32px] p-8 sm:p-9 shadow-2xl shadow-slate-950/40">
            
            <div className="text-center mb-6">
              <div className="inline-block mb-2">
                <span className="text-3xl font-black tracking-tight">
                  <span className="text-[#2fbf71]">Educa</span>
                  <span className="text-[#223a5e]">360</span>
                </span>
              </div>
              <h2 className="text-base font-extrabold text-[#223a5e] tracking-tight uppercase">
                Iniciar Sesión
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Ingresa tus credenciales para acceder al campus
              </p>
            </div>

            {sessionNotice && (
              <div
                className={`mb-4 p-3.5 rounded-2xl border flex items-start gap-3 text-xs leading-relaxed animate-in fade-in duration-200 ${
                  sessionNotice.type === 'timeout'
                    ? 'bg-amber-50/95 border-amber-200 text-amber-900'
                    : 'bg-blue-50/95 border-blue-200 text-blue-900'
                }`}
              >
                <Clock
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    sessionNotice.type === 'timeout' ? 'text-amber-600' : 'text-blue-600'
                  }`}
                />
                <div>
                  <p className="font-extrabold text-[11px] uppercase tracking-wider">
                    {sessionNotice.type === 'timeout'
                      ? 'Sesión Cerrada por Inactividad'
                      : 'Sesión Finalizada'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-700 font-medium">
                    {sessionNotice.message}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-700 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#223a5e] uppercase tracking-wider mb-1.5 pl-1">
                  Usuario o Correo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Tu usuario asignado"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#2fbf71] focus:ring-2 focus:ring-[#2fbf71]/20 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#223a5e] uppercase tracking-wider mb-1.5 pl-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#2fbf71] focus:ring-2 focus:ring-[#2fbf71]/20 transition-all font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white font-bold text-sm shadow-lg shadow-[#2fbf71]/30 flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Validando...</span>
                  </>
                ) : (
                  <>
                    <span>Acceder al Sistema</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500 font-medium">
              Plataforma institucional segura con autenticación encriptada
            </div>

            <div className="mt-4 text-center text-[11px] text-slate-400">
              &copy; 2026 Educa360 System &bull; Todos los derechos reservados
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
