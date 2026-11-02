'use client';

import React from 'react';

export type LogoVariant = 'stacked' | 'horizontal' | 'compact' | 'icon';
export type LogoTheme = 'light' | 'dark' | 'mono-navy' | 'mono-white';

export interface Educa360LogoProps {
  /**
   * - 'stacked': Versión principal cuadrada/apilada (como el logo original: EDUCA + 3 escalones arriba, 360 al centro y subtítulo abajo)
   * - 'horizontal': Versión horizontal amplia (Isotipo a la izquierda + EDUCA 360 + subtítulo)
   * - 'compact': Versión horizontal compacta ideal para Sidebar y barras superiores
   * - 'icon': Isotipo cuadrado (1:1) para ícono de app, avatar o favicon
   */
  variant?: LogoVariant;
  /**
   * - 'light': Colores oficiales sobre fondo claro (#2fbf71 y #223a5e)
   * - 'dark': Colores adaptados para fondo oscuro (#2fbf71 y #ffffff)
   * - 'mono-navy': 100% azul institucional (#223a5e) para documentos o timbrados
   * - 'mono-white': 100% blanco (#ffffff) para marcas de agua o fondos sólidos
   */
  theme?: LogoTheme;
  /** Mostrar el lema "Software de Gestión Educativa" (por defecto true en 'stacked' y 'horizontal') */
  showTagline?: boolean;
  /** Subtítulo personalizado (ej. nombre del colegio en el Sidebar) */
  subtitle?: string;
  /** Clases adicionales de Tailwind (ej. para controlar ancho/alto) */
  className?: string;
}

function getThemeColors(theme: LogoTheme) {
  switch (theme) {
    case 'dark':
      return {
        green: '#2fbf71',
        navy: '#ffffff',
        stepBottom: '#94a3b8',
        stepMiddle: '#2fbf71',
        stepTop: '#ffffff',
        tagline: '#6ee7b7',
        iconBg: '#1e293b',
        iconBorder: '#334155',
      };
    case 'mono-navy':
      return {
        green: '#223a5e',
        navy: '#223a5e',
        stepBottom: '#223a5e',
        stepMiddle: '#223a5e',
        stepTop: '#223a5e',
        tagline: '#223a5e',
        iconBg: '#f1f5f9',
        iconBorder: '#cbd5e1',
      };
    case 'mono-white':
      return {
        green: '#ffffff',
        navy: '#ffffff',
        stepBottom: 'rgba(255,255,255,0.75)',
        stepMiddle: '#ffffff',
        stepTop: 'rgba(255,255,255,0.9)',
        tagline: 'rgba(255,255,255,0.85)',
        iconBg: 'rgba(255,255,255,0.12)',
        iconBorder: 'rgba(255,255,255,0.25)',
      };
    case 'light':
    default:
      return {
        green: '#2fbf71',
        navy: '#223a5e',
        stepBottom: '#223a5e',
        stepMiddle: '#2fbf71',
        stepTop: '#223a5e',
        tagline: '#2fbf71',
        iconBg: '#ffffff',
        iconBorder: '#e2e8f0',
      };
  }
}

export function Educa360Logo({
  variant = 'stacked',
  theme = 'light',
  showTagline,
  subtitle,
  className = '',
}: Educa360LogoProps) {
  const colors = getThemeColors(theme);
  const displayTagline = showTagline !== undefined ? showTagline : variant === 'stacked' || variant === 'horizontal';
  const taglineText = subtitle || 'Software de Gestión Educativa';

  // 1. VERSIÓN ISOTIPO CUADRADO (1:1) - App Icon / Favicon / Avatar
  if (variant === 'icon') {
    return (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`select-none shrink-0 ${className || 'w-10 h-10'}`}
        role="img"
        aria-label="Educa360 Isotipo"
      >
        {/* Fondo cuadrado redondeado */}
        <rect
          x="4"
          y="4"
          width="112"
          height="112"
          rx="26"
          fill={theme === 'light' ? '#223a5e' : colors.iconBg}
          stroke={theme === 'light' ? '#1a2e4b' : colors.iconBorder}
          strokeWidth="2"
        />
        {/* 3 Escalones ascendentes (Símbolo de los 3 Pilares) */}
        <rect
          x="46"
          y="38"
          width="24"
          height="9"
          rx="3"
          fill={theme === 'light' ? '#94a3b8' : colors.stepBottom}
        />
        <rect
          x="59"
          y="26"
          width="24"
          height="9"
          rx="3"
          fill={theme === 'mono-navy' ? '#223a5e' : '#2fbf71'}
        />
        <rect
          x="72"
          y="14"
          width="24"
          height="9"
          rx="3"
          fill="#ffffff"
        />
        {/* Sigla E + 360 en el isotipo */}
        <text
          x="22"
          y="45"
          fill={theme === 'mono-navy' ? '#223a5e' : '#2fbf71'}
          fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
          fontWeight="900"
          fontSize="16"
          letterSpacing="1"
        >
          EDUCA
        </text>
        <text
          x="60"
          y="94"
          textAnchor="middle"
          fill={theme === 'mono-navy' ? '#223a5e' : '#ffffff'}
          fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
          fontWeight="900"
          fontSize="48"
          letterSpacing="-2"
        >
          360
        </text>
      </svg>
    );
  }

  // 2. VERSIÓN COMPACTA PARA SIDEBAR / TOPBAR
  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-9 h-9 shrink-0 drop-shadow-xs"
          role="img"
          aria-label="Educa360 Icon"
        >
          <rect x="4" y="4" width="112" height="112" rx="26" fill="#223a5e" />
          <rect x="46" y="38" width="24" height="9" rx="3" fill="#64748b" />
          <rect x="59" y="26" width="24" height="9" rx="3" fill="#2fbf71" />
          <rect x="72" y="14" width="24" height="9" rx="3" fill="#ffffff" />
          <text
            x="22"
            y="45"
            fill="#2fbf71"
            fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
            fontWeight="900"
            fontSize="15"
            letterSpacing="0.8"
          >
            EDUCA
          </text>
          <text
            x="60"
            y="94"
            textAnchor="middle"
            fill="#ffffff"
            fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
            fontWeight="900"
            fontSize="48"
            letterSpacing="-2"
          >
            360
          </text>
        </svg>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-0.5 leading-none">
            <span
              className="text-lg font-black tracking-tight"
              style={{ color: colors.green }}
            >
              EDUCA
            </span>
            <span
              className="text-lg font-black tracking-tight"
              style={{ color: colors.navy }}
            >
              360
            </span>
          </div>
          {(displayTagline || subtitle) && (
            <p
              className="text-[11px] font-bold truncate max-w-[150px] mt-0.5 leading-tight"
              style={{ color: theme === 'dark' ? '#cbd5e1' : '#64748b' }}
              title={taglineText}
            >
              {taglineText}
            </p>
          )}
        </div>
      </div>
    );
  }

  // 3. VERSIÓN HORIZONTAL COMPLETA (Cabeceras, Reportes, Recibos, Presentación)
  if (variant === 'horizontal') {
    return (
      <svg
        viewBox="0 0 460 110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`select-none ${className || 'h-14 w-auto'}`}
        role="img"
        aria-label="Educa360 Software de Gestión Educativa"
      >
        {/* Bloque Izquierdo: Isotipo con los 3 escalones */}
        <rect
          x="4"
          y="7"
          width="96"
          height="96"
          rx="22"
          fill={theme === 'light' ? '#223a5e' : colors.iconBg}
          stroke={theme === 'light' ? 'none' : colors.iconBorder}
          strokeWidth="2"
        />
        <rect x="20" y="54" width="28" height="11" rx="3.5" fill={theme === 'light' ? '#94a3b8' : colors.stepBottom} />
        <rect x="38" y="38" width="28" height="11" rx="3.5" fill={colors.green} />
        <rect x="56" y="22" width="28" height="11" rx="3.5" fill="#ffffff" />
        <text
          x="52"
          y="88"
          textAnchor="middle"
          fill="#ffffff"
          fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
          fontWeight="900"
          fontSize="26"
          letterSpacing="-1"
        >
          360
        </text>

        {/* Bloque Derecho: Logotipo Horizontal + Escalones Superiores */}
        <text
          x="118"
          y="64"
          fill={colors.green}
          fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
          fontWeight="900"
          fontSize="50"
          letterSpacing="-1"
        >
          EDUCA
        </text>
        <text
          x="292"
          y="64"
          fill={colors.navy}
          fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
          fontWeight="900"
          fontSize="54"
          letterSpacing="-2"
        >
          360
        </text>

        {/* 3 Escalones sobre el 0 del bloque horizontal */}
        <rect x="394" y="20" width="20" height="7.5" rx="2.5" fill={colors.stepBottom} />
        <rect x="406" y="11" width="20" height="7.5" rx="2.5" fill={colors.stepMiddle} />
        <rect x="418" y="2" width="20" height="7.5" rx="2.5" fill={colors.stepTop} />

        {displayTagline && (
          <text
            x="120"
            y="90"
            fill={colors.tagline}
            fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            fontWeight="500"
            fontSize="17.5"
            letterSpacing="1.2"
          >
            {taglineText}
          </text>
        )}
      </svg>
    );
  }

  // 4. VERSIÓN PRINCIPAL APILADA / CUADRADA (Fiel al diseño original enviado por el usuario)
  return (
    <svg
      viewBox={displayTagline ? '0 0 360 225' : '0 0 360 190'}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className || 'w-56 h-auto'}`}
      role="img"
      aria-label="Educa360 Software de Gestión Educativa"
    >
      {/* Texto Superior: EDUCA */}
      <text
        x="22"
        y="68"
        fill={colors.green}
        fontFamily="system-ui, -apple-system, 'Segoe UI', Montserrat, Roboto, Helvetica, Arial, sans-serif"
        fontWeight="900"
        fontSize="54"
        letterSpacing="0.5"
      >
        EDUCA
      </text>

      {/* Los 3 Escalones Ascendentes sobre el número 0 (Derecha superior) */}
      {/* Escalón 1 (Inferior): Azul Marino */}
      <rect
        x="248"
        y="53"
        width="36"
        height="14"
        rx="4"
        fill={colors.stepBottom}
      />
      {/* Escalón 2 (Medio): Verde Educa360 */}
      <rect
        x="269"
        y="35"
        width="36"
        height="14"
        rx="4"
        fill={colors.stepMiddle}
      />
      {/* Escalón 3 (Superior): Azul Marino */}
      <rect
        x="290"
        y="17"
        width="36"
        height="14"
        rx="4"
        fill={colors.stepTop}
      />

      {/* Número Central: 360 en peso Black */}
      <text
        x="178"
        y="178"
        textAnchor="middle"
        fill={colors.navy}
        fontFamily="system-ui, -apple-system, 'Segoe UI', Montserrat, Roboto, Helvetica, Arial, sans-serif"
        fontWeight="900"
        fontSize="144"
        letterSpacing="-6"
      >
        360
      </text>

      {/* Lema Inferior: Software de Gestión Educativa */}
      {displayTagline && (
        <text
          x="180"
          y="208"
          textAnchor="middle"
          fill={colors.tagline}
          fontFamily="system-ui, -apple-system, 'Segoe UI', Montserrat, Roboto, Helvetica, Arial, sans-serif"
          fontWeight="400"
          fontSize="20.5"
          letterSpacing="0.4"
        >
          {taglineText}
        </text>
      )}
    </svg>
  );
}

export default Educa360Logo;

