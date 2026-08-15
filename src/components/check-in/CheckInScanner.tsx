"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Camera, CameraOff, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CheckInScannerProps {
  onScanSuccess: (token: string) => void;
  active: boolean;
  disabled?: boolean;
}

// Declaración de interfaz para BarcodeDetector API de HTML5
interface BarcodeDetectorFormat {
  format: string;
  rawValue: string;
}

interface BarcodeDetectorOptions {
  formats: string[];
}

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: BarcodeDetectorOptions): {
        detect: (image: HTMLVideoElement | HTMLCanvasElement | ImageBitmap) => Promise<BarcodeDetectorFormat[]>;
      };
      getSupportedFormats: () => Promise<string[]>;
    };
  }
}

export const CheckInScanner: React.FC<CheckInScannerProps> = ({
  onScanSuccess,
  active,
  disabled = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraSupported, setCameraSupported] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Verificar si el navegador soporta BarcodeDetector nativo
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isSupported = "BarcodeDetector" in window;
      setCameraSupported(isSupported);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setErrorMessage(null);
    if (!window.BarcodeDetector) {
      setErrorMessage("El escáner de cámara no está disponible en este dispositivo. Utiliza el código manual.");
      return;
    }

    try {
      setScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const barcodeDetector = new window.BarcodeDetector({ formats: ["qr_code"] });

      const detectLoop = async () => {
        if (!videoRef.current || !streamRef.current) return;

        try {
          if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const qrToken = barcodes[0].rawValue;
              if (qrToken) {
                stopCamera();
                onScanSuccess(qrToken);
                return;
              }
            }
          }
        } catch {
          // Ignorar frames sin código detectado
        }

        animationFrameId.current = requestAnimationFrame(detectLoop);
      };

      detectLoop();
    } catch (err: unknown) {
      console.error("Error al acceder a la cámara:", err);
      setErrorMessage("No se pudo acceder a la cámara. Por favor otorga permisos o usa el código manual.");
      stopCamera();
    }
  }, [onScanSuccess, stopCamera]);

  useEffect(() => {
    if (active && !disabled && cameraSupported) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [active, disabled, cameraSupported, startCamera, stopCamera]);

  if (cameraSupported === false) {
    return (
      <div className="w-full bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-2xl flex flex-col items-center text-center space-y-3">
        <CameraOff className="w-10 h-10 text-amber-600" />
        <h3 className="font-semibold text-base">Cámara no disponible en este navegador</h3>
        <p className="text-xs text-amber-700 max-w-sm">
          El escáner de cámara no está disponible en este dispositivo. Utiliza el código manual.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center space-y-4">
      <div className="relative w-full aspect-square max-w-[360px] bg-slate-900 rounded-2xl overflow-hidden shadow-xl border-2 border-slate-700 flex items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover ${scanning ? "block" : "hidden"}`}
        />

        {!scanning && (
          <div className="flex flex-col items-center justify-center p-6 text-slate-400 space-y-3 text-center">
            <Camera className="w-12 h-12 text-slate-500" />
            <p className="text-sm font-medium text-slate-300">
              Presiona para activar el escáner de cámara
            </p>
          </div>
        )}

        {scanning && (
          <div className="absolute inset-0 pointer-events-none border-2 border-sky-400/60 m-8 rounded-xl flex items-center justify-center">
            <div className="w-full h-0.5 bg-sky-400/80 animate-pulse shadow-sm shadow-sky-400"></div>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 text-xs font-medium text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 max-w-[360px] w-full">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex gap-3">
        {!scanning ? (
          <Button
            onClick={startCamera}
            disabled={disabled}
            className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center gap-2 text-base shadow-md"
          >
            <Camera className="w-5 h-5" /> Activar Cámara
          </Button>
        ) : (
          <Button
            onClick={stopCamera}
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold py-3 px-6 rounded-xl flex items-center gap-2 text-base"
          >
            <CameraOff className="w-5 h-5" /> Detener Cámara
          </Button>
        )}
      </div>
    </div>
  );
};
