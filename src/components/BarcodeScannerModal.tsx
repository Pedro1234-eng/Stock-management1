import React, { useState, useEffect, useRef } from 'react';
import { Camera, Barcode, X, AlertCircle, RefreshCw, Check } from 'lucide-react';
import { Modal } from './Modal.tsx';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Quick preset samples for easy 1-click testing
  const sampleBarcodes = [
    { code: '890123456001', name: 'Portland Cement 50kg' },
    { code: '890123456002', name: 'Steel Rebar 12mm' },
    { code: '890123456003', name: 'Copper Wire 2.5mm' },
    { code: '890123456007', name: 'Brushless Cordless Drill' },
    { code: '890123456008', name: 'Heavy Duty Tape Measure' },
  ];

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Camera initialization error:', err);
      setCameraError(
        err.message || 'Camera permission denied or camera device is unavailable.'
      );
      setCameraActive(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setManualCode('');
      setCameraError(null);
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      onClose();
    }
  };

  const handleSampleClick = (code: string) => {
    onScan(code);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Barcode & SKU Scanner"
      subtitle="Scan using live camera, USB barcode wedge, or manual entry"
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Camera Viewfinder */}
        <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
          {cameraActive ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {/* Overlay targeting box and scanning laser animation */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-36 border-2 border-dashed border-amber-400/80 rounded-lg relative flex items-center justify-center">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse" />
                  <div className="text-[11px] font-mono text-amber-300 bg-slate-900/80 px-2 py-0.5 rounded">
                    Target barcode inside frame
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <Camera className="w-10 h-10 mb-2 text-slate-500" />
              {cameraError ? (
                <div className="text-xs text-amber-400/90 max-w-xs">{cameraError}</div>
              ) : (
                <div className="text-xs">Initializing camera feed...</div>
              )}
              <button
                onClick={startCamera}
                className="mt-3 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
              </button>
            </div>
          )}
        </div>

        {/* Manual Barcode / SKU Input Form */}
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Manual Barcode / SKU / Model
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Enter or scan barcode (e.g. 890123456001)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-medium text-sm rounded-xl transition-colors shrink-0 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Add
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Hardware USB scanners will automatically input into this field and press Enter.
          </p>
        </form>

        {/* 1-Click Quick Select from Seeded Catalog */}
        <div className="border-t border-slate-800 pt-4">
          <div className="text-xs font-semibold text-slate-400 mb-2">
            Quick Click Demo Barcodes:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
            {sampleBarcodes.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => handleSampleClick(item.code)}
                className="text-left p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/50 transition-all flex items-center justify-between group"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-medium text-slate-200 truncate group-hover:text-blue-400">
                    {item.name}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">{item.code}</div>
                </div>
                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white transition-colors shrink-0">
                  Select
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
