'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Clock, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react';

interface IdleSessionWatcherProps {
  /**
   * Tiempo total de inactividad antes de cerrar sesión (en segundos).
   * Por defecto: 20 minutos = 1200 segundos.
   */
  timeoutSeconds?: number;
  /**
   * Segundos previos para mostrar el aviso con cuenta regresiva.
   * Por defecto: 60 segundos.
   */
  warningSeconds?: number;
  /**
   * Callback opcional si se requiere notificar al componente padre.
   */
  onSessionExpired?: () => void;
}

export default function IdleSessionWatcher({
  timeoutSeconds = 20 * 60, // 20 minutos
  warningSeconds = 60,      // 60 segundos de alerta previa
  onSessionExpired,
}: IdleSessionWatcherProps) {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(warningSeconds);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const lastActivityRef = useRef<number>(Date.now());
  const isWarningOpenRef = useRef<boolean>(false);
  const isExecutingLogoutRef = useRef<boolean>(false);

  // Asegurar que solo se monte en el cliente (Browser DOM)
  useEffect(() => {
    setMounted(true);
    lastActivityRef.current = Date.now();
  }, []);

  // Función de logout definitivo
  const executeLogout = useCallback(async (reason: 'timeout' | 'user') => {
    if (isExecutingLogoutRef.current) return;
    isExecutingLogoutRef.current = true;
    setIsLoggingOut(true);

    try {
      if (onSessionExpired) {
        onSessionExpired();
      }
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('[IdleSessionWatcher] Error al cerrar sesión:', e);
    } finally {
      // Redirigir al login con el motivo en la URL
      if (typeof window !== 'undefined') {
        window.location.href = reason === 'timeout' ? '/?reason=timeout' : '/';
      } else {
        router.push(reason === 'timeout' ? '/?reason=timeout' : '/');
      }
    }
  }, [onSessionExpired, router]);

  // Restablecer la actividad del usuario (mantiene viva la sesión)
  const resetActivity = useCallback(async () => {
    lastActivityRef.current = Date.now();
    isWarningOpenRef.current = false;
    setShowWarning(false);
    setRemainingSeconds(warningSeconds);

    // Enviar un ping liviano en segundo plano para verificar y refrescar
    try {
      await fetch('/api/auth/me', { cache: 'no-store' });
    } catch {
      // Si falla, el middleware o las APIs se encargarán
    }
  }, [warningSeconds]);

  // Escuchar eventos de interacción del usuario (throttled)
  useEffect(() => {
    if (!mounted) return;

    let throttleTimer: NodeJS.Timeout | null = null;

    const handleUserInteraction = () => {
      // Si el modal de alerta YA está visible, no auto-cerrar con un simple roce de mouse;
      // requerimos que el usuario interactúe conscientemente con los botones o presione teclado
      if (isWarningOpenRef.current) return;

      if (!throttleTimer) {
        lastActivityRef.current = Date.now();
        throttleTimer = setTimeout(() => {
          throttleTimer = null;
        }, 1000); // Throttle de 1 segundo para no saturar CPU
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, handleUserInteraction, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleUserInteraction);
      });
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [mounted]);

  // Intervalo que evalúa el tiempo transcurrido cada 1 segundo
  useEffect(() => {
    if (!mounted) return;

    const checkInterval = setInterval(() => {
      if (isExecutingLogoutRef.current) return;

      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastActivityRef.current) / 1000);
      const secondsUntilTotalTimeout = timeoutSeconds - elapsedSeconds;

      // Caso 1: Se agotó el tiempo total (timeout cumplido)
      if (secondsUntilTotalTimeout <= 0) {
        clearInterval(checkInterval);
        executeLogout('timeout');
        return;
      }

      // Caso 2: Estamos dentro de la ventana de advertencia (últimos warningSeconds)
      if (secondsUntilTotalTimeout <= warningSeconds) {
        if (!isWarningOpenRef.current) {
          isWarningOpenRef.current = true;
          setShowWarning(true);
        }
        setRemainingSeconds(secondsUntilTotalTimeout);
      } else {
        // Si por alguna razón el tiempo volvió a ser mayor, ocultar el aviso
        if (isWarningOpenRef.current) {
          isWarningOpenRef.current = false;
          setShowWarning(false);
        }
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [mounted, timeoutSeconds, warningSeconds, executeLogout]);

  // Si no está montado o no hay advertencia activa, no renderizar nada
  if (!mounted || !showWarning) return null;

  // Porcentaje restante para la barra de progreso
  const progressPercent = Math.max(0, Math.min(100, (remainingSeconds / warningSeconds) * 100));

  // RENDERIZADO CON REACT PORTAL DIRECTO A document.body:
  // Garantiza que NADA (modales z-50, z-[60], z-[100], print previews, drawers o backdrops)
  // pueda tapar u obstruir este aviso.
  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-warning-title"
      aria-describedby="idle-warning-desc"
      style={{ zIndex: 999999 }}
      className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl border-2 border-amber-400 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden animate-in zoom-in-95 duration-200 relative text-slate-800"
        style={{ zIndex: 1000000 }}
      >
        {/* Barra de progreso de cuenta regresiva superior */}
        <div className="h-2 w-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              remainingSeconds <= 15 ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="p-6 sm:p-7 text-center">
          {/* Icono de advertencia con pulso */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center mb-4 text-amber-600 shadow-inner relative">
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
            </span>
            <ShieldAlert className="w-8 h-8 animate-bounce" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/80 border border-amber-300 text-[11px] font-black uppercase tracking-wider text-amber-800 mb-2">
            <Clock className="w-3.5 h-3.5" />
            <span>Alerta de Inactividad</span>
          </div>

          <h2 id="idle-warning-title" className="text-xl sm:text-2xl font-black text-[#223a5e] tracking-tight">
            ¿Sigues trabajando ahí?
          </h2>

          <p id="idle-warning-desc" className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            No se ha detectado actividad en el sistema. Por seguridad y para proteger los datos confidenciales de la institución, tu sesión se cerrará automáticamente en:
          </p>

          {/* Contador grande destacado */}
          <div className="my-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 inline-flex flex-col items-center justify-center min-w-[140px] shadow-xs">
            <span
              className={`text-4xl sm:text-5xl font-black tracking-tight tabular-nums ${
                remainingSeconds <= 15 ? 'text-rose-600 animate-pulse' : 'text-amber-600'
              }`}
            >
              {remainingSeconds}
            </span>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              {remainingSeconds === 1 ? 'segundo restante' : 'segundos restantes'}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 font-medium mb-6">
            Presiona el botón verde para continuar en tu puesto sin perder tus cambios.
          </p>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={resetActivity}
              disabled={isLoggingOut}
              className="w-full sm:flex-1 py-3.5 px-5 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white font-extrabold text-sm shadow-lg shadow-[#2fbf71]/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Continuar Conectado</span>
            </button>

            <button
              type="button"
              onClick={() => executeLogout('user')}
              disabled={isLoggingOut}
              className="w-full sm:w-auto py-3.5 px-4 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200 hover:border-rose-200 active:scale-95 disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
