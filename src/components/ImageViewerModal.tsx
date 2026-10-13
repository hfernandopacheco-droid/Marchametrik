import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, Download, Maximize2 } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  imageUrl,
  title,
  onClose,
}) => {
  const [scale, setScale] = useState(1);

  if (!isOpen || !imageUrl) return null;

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.min(prev + 0.3, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.max(prev - 0.3, 0.7));
  };

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(1);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/92 backdrop-blur-xl flex flex-col items-center justify-between p-4 animate-in fade-in duration-200 select-none"
    >
      {/* Top action bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl flex items-center justify-between py-2 px-4 rounded-2xl bg-[#121620]/80 border border-slate-800 text-white shadow-xl z-20"
      >
        <div className="flex items-center space-x-2 truncate">
          <span className="text-xs font-black text-white truncate">
            {title || 'Foto de Comprobante / Registro'}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-[#00D4FF] font-bold border border-blue-400/30">
            Vista Completa (100%)
          </span>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Acercar"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Alejar"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Restablecer tamaño"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          {imageUrl && (
            <a
              href={imageUrl}
              download="comprobante_litrometrik.jpg"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Descargar imagen"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white transition cursor-pointer ml-1"
            title="Cerrar visor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main photo container (Full picture view, no cutoffs!) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex-1 w-full max-w-5xl flex items-center justify-center p-2 overflow-auto"
      >
        <div className="relative transition-transform duration-200 ease-out flex items-center justify-center max-w-full max-h-full">
          <img
            src={imageUrl}
            alt={title || 'Foto de comprobante'}
            style={{ transform: `scale(${scale})` }}
            className="max-h-[80vh] max-w-[92vw] sm:max-w-[85vw] object-contain rounded-2xl shadow-2xl border border-slate-700/60 transition-transform cursor-grab active:cursor-grabbing"
          />
        </div>
      </div>

      {/* Bottom hint bar */}
      <div className="text-center pb-2 text-[11px] text-slate-400 font-medium">
        Toca el fondo o la X para cerrar • Imagen completa sin recortes
      </div>
    </div>
  );
};
