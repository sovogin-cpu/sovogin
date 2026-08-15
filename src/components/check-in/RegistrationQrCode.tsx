"use client";

import React from "react";
import QRCode from "react-qr-code";

interface RegistrationQrCodeProps {
  token: string;
  size?: number;
  className?: string;
}

/**
 * Renderiza una credencial QR estándar ISO/IEC 18004 utilizando react-qr-code.
 * Funciona 100% offline sin dependencias de servicios o APIs externas.
 */
export const RegistrationQrCode: React.FC<RegistrationQrCodeProps> = ({
  token,
  size = 200,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-md border border-slate-200 ${className}`}
    >
      <div className="w-full max-w-[220px] aspect-square flex items-center justify-center p-2 bg-white rounded-lg">
        <QRCode
          value={token}
          size={size}
          bgColor="#FFFFFF"
          fgColor="#0F172A"
          level="M"
          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
        />
      </div>
      <div className="mt-3 text-center">
        <span className="block text-[11px] font-mono font-medium text-slate-500 tracking-wider break-all max-w-[240px]">
          {token}
        </span>
      </div>
    </div>
  );
};
