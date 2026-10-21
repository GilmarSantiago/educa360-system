'use client';

import React from 'react';
import { X, Printer, CheckCircle2, ShieldCheck, Building2, User, Calendar, CreditCard, FileText } from 'lucide-react';
import { OfficialReceiptData } from '@/types';

interface OfficialReceiptPrintModalProps {
  receipt: OfficialReceiptData | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function OfficialReceiptPrintModal({
  receipt,
  isOpen,
  onClose,
}: OfficialReceiptPrintModalProps) {
  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatSoles = (val: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
    }).format(val);
  };

  const formatDateDisplay = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      {/* Botones Flotantes de Acción en Pantalla */}
      <div className="fixed top-4 right-4 flex items-center gap-2 print:hidden z-60">
        <button
          onClick={handlePrint}
          className="px-4 py-2.5 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold transition flex items-center gap-2 shadow-lg cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Recibo</span>
        </button>
        <button
          onClick={onClose}
          className="p-2.5 rounded-xl bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 transition shadow-lg cursor-pointer"
          title="Cerrar vista previa"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Contenedor del Comprobante (Diseño Voucher / Facturación Imprimible) */}
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 print:m-0 print:p-0 print:w-full print:max-w-none print:shadow-none print:border-none print:rounded-none">
        {/* Barra superior de estado (solo en pantalla) */}
        <div className="bg-[#223a5e] text-white px-6 py-3 flex items-center justify-between text-xs print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#2fbf71]" />
            <span className="font-bold">Pago Liquidado en Caja Oficial</span>
          </div>
          <span className="text-slate-300 font-mono text-[11px]">{receipt.receipt_number}</span>
        </div>

        {/* Hoja del Recibo */}
        <div className="p-8 sm:p-10 text-slate-800 space-y-6 print:p-6 print:space-y-4">
          {/* 1. Membrete Institucional y Folio */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-3.5">
              {receipt.institution?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={receipt.institution.logo}
                  alt={receipt.institution.name}
                  className="w-16 h-16 object-contain rounded-xl border border-slate-100 p-1 bg-white"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#223a5e] to-[#2fbf71] text-white flex items-center justify-center font-black text-xl shadow-md">
                  <Building2 className="w-7 h-7" />
                </div>
              )}
              <div>
                <h1 className="text-lg font-black text-[#223a5e] tracking-tight leading-tight">
                  {receipt.institution?.name || 'COLEGIO EDUCA360'}
                </h1>
                {receipt.institution?.ruc && (
                  <p className="text-xs font-bold text-slate-500 font-mono">
                    RUC: {receipt.institution.ruc}
                  </p>
                )}
                {receipt.institution?.address && (
                  <p className="text-[11px] text-slate-500 leading-tight">
                    {receipt.institution.address}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-3 text-[10px] text-slate-400 mt-0.5">
                  {receipt.institution?.phone && <span>Tel: {receipt.institution.phone}</span>}
                  {receipt.institution?.email && <span>Email: {receipt.institution.email}</span>}
                </div>
              </div>
            </div>

            {/* Cuadro de Folio y Comprobante */}
            <div className="text-right sm:min-w-[190px] border-2 border-slate-800 rounded-2xl p-3 bg-slate-50/50">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                COMPROBANTE DE PAGO
              </span>
              <p className="text-sm font-black text-[#223a5e] uppercase">RECIBO DE CAJA</p>
              <p className="font-mono font-black text-base text-[#26995b] mt-0.5 tracking-tight">
                {receipt.receipt_number}
              </p>
            </div>
          </div>

          {/* 2. Metadatos de Fecha y Cajero */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Fecha de Pago</span>
              <span className="font-semibold text-slate-700">{formatDateDisplay(receipt.payment_date)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Medio de Pago</span>
              <span className="font-bold text-[#223a5e]">{receipt.payment_method}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Cajero(a)</span>
              <span className="font-semibold text-slate-700 truncate block">{receipt.cashier_name}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Estado</span>
              <span className="inline-flex items-center gap-1 font-bold text-[#26995b]">
                <ShieldCheck className="w-3.5 h-3.5" /> CANCELADO
              </span>
            </div>
          </div>

          {/* 3. Datos del Alumno y Apoderado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px]">
                <User className="w-3.5 h-3.5 text-[#2fbf71]" />
                <span>Datos del Estudiante</span>
              </div>
              <p className="font-bold text-sm text-[#223a5e] leading-snug">{receipt.student?.name}</p>
              <p className="text-slate-600 font-semibold">{receipt.student?.grade_section}</p>
              {receipt.student?.document_number && (
                <p className="text-[11px] text-slate-400 font-mono">DNI: {receipt.student.document_number}</p>
              )}
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px]">
                <FileText className="w-3.5 h-3.5 text-[#223a5e]" />
                <span>Datos del Apoderado / Pagador</span>
              </div>
              <p className="font-bold text-sm text-slate-800 leading-snug">
                {receipt.guardian?.name || 'Apoderado no registrado'}
              </p>
              {receipt.guardian?.phone && (
                <p className="text-[11px] text-slate-500 font-mono">Teléfono: {receipt.guardian.phone}</p>
              )}
              {receipt.guardian?.document_number && (
                <p className="text-[11px] text-slate-400 font-mono">DNI: {receipt.guardian.document_number}</p>
              )}
            </div>
          </div>

          {/* 4. Tabla de Conceptos Cobrados */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                  <th className="py-2.5 px-4 w-12 text-center">#</th>
                  <th className="py-2.5 px-4">Concepto / Descripción</th>
                  <th className="py-2.5 px-4 w-28">Período</th>
                  <th className="py-2.5 px-4 text-right w-32">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipt.items?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 text-center font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                    <td className="py-2.5 px-4">
                      <p className="font-bold text-slate-800">{item.concept_label}</p>
                      {item.concept_type && (
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">
                          {item.concept_type}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600 text-[11px]">
                      {item.period_month || '2026'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                      {formatSoles(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={3} className="py-3 px-4 text-right font-bold text-slate-700 uppercase text-xs">
                    Total Cancelado
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-base text-[#26995b]">
                    {formatSoles(receipt.total_amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 5. Notas u Observaciones */}
          {receipt.notes && (
            <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-600">
              <span className="font-bold text-slate-700 block mb-0.5">Observaciones:</span>
              <p className="text-[11px]">{receipt.notes}</p>
            </div>
          )}

          {/* 6. Bloque de Firmas y Sellos */}
          <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-1">
              <div className="border-t border-slate-400 w-44 mx-auto pt-2" />
              <p className="font-bold text-slate-700 uppercase text-[11px]">Caja / Administración</p>
              <p className="text-[10px] text-slate-400">{receipt.institution?.name}</p>
            </div>
            <div className="space-y-1">
              <div className="border-t border-slate-400 w-44 mx-auto pt-2" />
              <p className="font-bold text-slate-700 uppercase text-[11px]">Firma de Conformidad</p>
              <p className="text-[10px] text-slate-400">{receipt.guardian?.name || 'Cliente'}</p>
            </div>
          </div>

          {/* 7. Pie de Página */}
          <div className="text-center pt-4 border-t border-slate-100 text-[10px] text-slate-400">
            <p>Este documento es un comprobante interno oficial emitido electrónicamente por Educa360.</p>
            <p className="font-mono mt-0.5">Generado el: {new Date().toLocaleString('es-PE')}</p>
          </div>
        </div>

        {/* Barra inferior en pantalla para cerrar / imprimir */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#26995b] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Recibo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
