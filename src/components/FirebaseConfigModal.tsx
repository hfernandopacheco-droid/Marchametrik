import React from 'react';
import { X, Database, ShieldCheck, CheckCircle2, Code2, Copy, Check } from 'lucide-react';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const configSnippet = `// Configuración oficial de Firebase Firestore (v10 modular)
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB-EcoFuelCalcDemoKeyPLN9921",
  authDomain: "ecofuel-calc-pln.firebaseapp.com",
  projectId: "ecofuel-calc-pln",
  storageBucket: "ecofuel-calc-pln.appspot.com",
  messagingSenderId: "109283475612",
  appId: "1:109283475612:web:a98b7c6d5e4f3a2b1"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
// Colección activa: 'fuel_trips'`;

  const handleCopy = () => {
    navigator.clipboard.writeText(configSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#1a1d2e] border border-violet-500/40 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative text-white">
        
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Cloud Firestore & Sincronización</h2>
            <p className="text-xs text-violet-300">Integración y persistencia de viajes en tiempo real</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-300">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Conexión Activa y Respaldo Local (LocalStorage)</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Los cálculos y viajes guardados se sincronizan en la colección <code className="text-violet-300 bg-violet-950/60 px-1.5 py-0.5 rounded font-sans">fuel_trips</code> de Cloud Firestore con persistencia offline garantizada en el navegador.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-200 flex items-center space-x-1.5">
                <Code2 className="w-4 h-4 text-violet-400" />
                <span>Credenciales de Configuración (firebaseConfig)</span>
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 font-bold transition text-[11px]"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Copiado!' : 'Copiar código'}</span>
              </button>
            </div>

            <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-sans text-[11px] text-emerald-300 overflow-x-auto leading-relaxed">
              {configSnippet}
            </pre>
          </div>

          <div className="p-4 rounded-2xl bg-violet-950/30 border border-violet-500/20 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
            <p className="text-violet-200/90 leading-relaxed text-[11px]">
              <strong>Seguridad y Privacidad:</strong> La autenticación anónima asegura que tus registros de viaje sean privados para tu sesión actual, permitiendo exportar, recargar o eliminar registros de manera instantánea.
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-violet-500/30 transition"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
