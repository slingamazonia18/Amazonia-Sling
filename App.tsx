
import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Stethoscope, 
  Leaf, 
  LayoutDashboard,
  Wallet
} from 'lucide-react';
import { SystemType } from './types';
import RetailSystem from './components/RetailSystem';
import ClinicSystem from './components/ClinicSystem';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [currentSystem, setCurrentSystem] = useState<SystemType>('HUB');
  const [resupplyFund, setResupplyFund] = useState({ MATEANDO: 0, PETSHOP: 0 });

  useEffect(() => {
    if (currentSystem === 'HUB') {
      calculateGlobalResupply();
    }
  }, [currentSystem]);

  const calculateGlobalResupply = async () => {
    try {
      // Obtenemos ventas e items para calcular el costo total de lo vendido (lo que hay que reponer)
      const { data: sales, error } = await supabase
        .from('sales')
        .select(`
          system_type,
          sale_items (
            quantity,
            product_id
          )
        `);
      
      if (error) throw error;

      // Obtenemos todos los productos para saber su costo actual
      const { data: products } = await supabase.from('products').select('id, cost');
      
      // Fix: Use explicit types for the Map to ensure 'cost' is recognized as a number
      const costMap = new Map<string, number>(
        (products || []).map(p => [p.id, Number(p.cost) || 0])
      );

      const totals = { MATEANDO: 0, PETSHOP: 0 };
      sales?.forEach((sale: any) => {
        sale.sale_items?.forEach((item: any) => {
          // Fix: Explicitly treat cost and quantity as numbers to avoid TS arithmetic errors on lines 48-49
          const costValue = Number(costMap.get(item.product_id)) || 0;
          const qtyValue = Number(item.quantity) || 0;
          
          if (sale.system_type === 'MATEANDO') totals.MATEANDO += costValue * qtyValue;
          if (sale.system_type === 'PETSHOP') totals.PETSHOP += costValue * qtyValue;
        });
      });
      setResupplyFund(totals);
    } catch (err) {
      console.error("Error calculando repositorio:", err);
    }
  };

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
              <h1 className="text-5xl font-extrabold text-slate-800 mb-2 tracking-tight">Veterinaria Amazonia</h1>
              <p className="text-slate-500 text-lg">Sistema de Gestión Integral 3-en-1</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
              {systems.map((sys) => (
                <button
                  key={sys.id}
                  onClick={() => setCurrentSystem(sys.id)}
                  className={`${sys.color} ${sys.hover} transition-all duration-300 transform hover:-translate-y-2 p-10 rounded-[3rem] shadow-xl flex flex-col items-center text-white text-center group`}
                >
                  <div className="mb-6 p-4 bg-white/20 rounded-full group-hover:scale-110 transition-transform">
                    {sys.icon}
                  </div>
                  <h2 className="text-3xl font-bold mb-3">{sys.title}</h2>
                  <p className="text-white/80">{sys.description}</p>
                </button>
              ))}
            </div>

            <div className="mt-16 w-full max-w-4xl bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                  <Wallet size={24} />
                </div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Repositorio de Fondos (Reposición)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Reserva Mateando</p>
                  <p className="text-3xl font-black text-emerald-800">${resupplyFund.MATEANDO.toLocaleString()}</p>
                  <p className="text-[10px] text-emerald-500 mt-2 font-bold italic">Monto destinado puramente a reponer stock vendido.</p>
                </div>
                <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Reserva Petshop</p>
                  <p className="text-3xl font-black text-amber-800">${resupplyFund.PETSHOP.toLocaleString()}</p>
                  <p className="text-[10px] text-amber-500 mt-2 font-bold italic">Monto destinado puramente a reponer stock vendido.</p>
                </div>
              </div>
              <div className="mt-6 p-4 bg-slate-50 rounded-2xl border text-center">
                <p className="text-xs text-slate-400 font-medium">Fondo Total Amazonia: <span className="text-slate-900 font-black">${(resupplyFund.MATEANDO + resupplyFund.PETSHOP).toLocaleString()}</span></p>
              </div>
            </div>
          </div>
        );
    }
  };

  return <>{renderContent()}</>;
};

export default App;
