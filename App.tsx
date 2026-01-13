
import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Stethoscope, 
  Leaf, 
  ArrowLeft,
  LayoutDashboard,
  Settings,
  Bell
} from 'lucide-react';
import { SystemType } from './types';
import RetailSystem from './components/RetailSystem';
import ClinicSystem from './components/ClinicSystem';

const App: React.FC = () => {
  const [currentSystem, setCurrentSystem] = useState<SystemType>('HUB');

  const systems = [
    {
      id: 'MATEANDO' as SystemType,
      title: 'Mateando',
      description: 'Gestión de Yerbas e Insumos',
      icon: <Leaf className="w-12 h-12" />,
      color: 'bg-emerald-600',
      hover: 'hover:bg-emerald-700',
      accent: 'emerald'
    },
    {
      id: 'PETSHOP' as SystemType,
      title: 'Petshop',
      description: 'Alimentos y Accesorios',
      icon: <ShoppingBag className="w-12 h-12" />,
      color: 'bg-amber-500',
      hover: 'hover:bg-amber-600',
      accent: 'amber'
    },
    {
      id: 'CONSULTORIO' as SystemType,
      title: 'Consultorio',
      description: 'Atención Médica y Turnos',
      icon: <Stethoscope className="w-12 h-12" />,
      color: 'bg-sky-500',
      hover: 'hover:bg-sky-600',
      accent: 'sky'
    }
  ];

  const renderContent = () => {
    switch (currentSystem) {
      case 'PETSHOP':
        return <RetailSystem type="PETSHOP" onBack={() => setCurrentSystem('HUB')} />;
      case 'MATEANDO':
        return <RetailSystem type="MATEANDO" onBack={() => setCurrentSystem('HUB')} />;
      case 'CONSULTORIO':
        return <ClinicSystem onBack={() => setCurrentSystem('HUB')} />;
      default:
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
            <header className="text-center mb-12">
              <h1 className="text-5xl font-extrabold text-slate-800 mb-2">Veterinaria Amazonia</h1>
              <p className="text-slate-500 text-lg">Sistema de Gestión Integral 3-en-1</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
              {systems.map((sys) => (
                <button
                  key={sys.id}
                  onClick={() => setCurrentSystem(sys.id)}
                  className={`${sys.color} ${sys.hover} transition-all duration-300 transform hover:-translate-y-2 p-10 rounded-3xl shadow-xl flex flex-col items-center text-white text-center group`}
                >
                  <div className="mb-6 p-4 bg-white/20 rounded-full group-hover:scale-110 transition-transform">
                    {sys.icon}
                  </div>
                  <h2 className="text-3xl font-bold mb-3">{sys.title}</h2>
                  <p className="text-white/80">{sys.description}</p>
                </button>
              ))}
            </div>

            <footer className="mt-20 flex gap-6 text-slate-400">
              <div className="flex items-center gap-2 cursor-pointer hover:text-slate-600">
                <LayoutDashboard size={20} />
                <span>Dashboard Global</span>
              </div>
              <div className="flex items-center gap-2 cursor-pointer hover:text-slate-600">
                <Settings size={20} />
                <span>Configuración</span>
              </div>
              <div className="flex items-center gap-2 cursor-pointer hover:text-slate-600 relative">
                <Bell size={20} />
                <span>Notificaciones</span>
                <span className="absolute -top-1 -right-1 bg-red-500 w-2 h-2 rounded-full"></span>
              </div>
            </footer>
          </div>
        );
    }
  };

  return <>{renderContent()}</>;
};

export default App;
