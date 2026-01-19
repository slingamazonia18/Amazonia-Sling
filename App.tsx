
import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Stethoscope, 
  Leaf, 
  LayoutDashboard,
  Wallet,
  Calculator,
  Tags
} from 'lucide-react';
import { SystemType } from './types';
import RetailSystem from './components/RetailSystem';
import ClinicSystem from './components/ClinicSystem';
import TariffSystem from './components/TariffSystem';
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
      // Usamos * para evitar errores si la columna is_voided aún no se ha creado
      const { data: sales, error } = await supabase
        .from('sales')
        .select('*, sale_items(*)');
      
      if (error) {
        console.warn("Error consultando ventas (puede ser por columna faltante):", error.message);
        return;
      }

      const { data: products } = await supabase.from('products').select('id, cost');
      const costMap = new Map<string, number>(
        (products || []).map(p => [p.id, Number(p.cost) || 0])
      );

      const totals = { MATEANDO: 0, PETSHOP: 0 };
      sales?.forEach((sale: any) => {
        // Manejamos is_voided de forma segura (si no existe, asumimos false)
        const isVoided = sale.is_voided === true;
        if (!isVoided) {
          sale.sale_items?.forEach((item: any) => {
            const costValue = Number(costMap.get(item.product_id)) || 0;
            const qtyValue = Number(item.quantity) || 0;
            
            if (sale.system_type === 'MATEANDO') totals.MATEANDO += costValue * qtyValue;
            if (sale.system_type === 'PETSHOP') totals.PETSHOP += costValue * qtyValue;
          });
        }
      });
      setResupplyFund(totals);
    } catch (err) {
      console.error("Error crítico calculando repositorio:", err);
    }
  };

  const systems = [
    {
      id: 'MATEANDO' as SystemType,
      title: 'Mateando',
      description: 'Yerbas e Insumos',
      icon: <Leaf className="w-12 h-12" />,
      color: 'bg-emerald-600',
      hover: 'hover:bg-emerald-700'
    },
    {
      id: 'PETSHOP' as SystemType,
      title: 'Petshop',
      description: 'Alimentos y Accesorios',
      icon: <ShoppingBag className="w-12 h-12" />,
      color: 'bg-amber-500',
      hover: 'hover:bg-amber-600'
    },
    {
      id: 'CONSULTORIO' as SystemType,
      title: 'Consultorio',
      description: 'Atención Médica',
      icon: <Stethoscope className="w-12 h-12" />,
      color: 'bg-sky-500',
      hover: 'hover:bg-sky-600'
    },
    {
      id: 'TARIFAS' as SystemType,
      title: 'Tarifas',
      description: 'Precios Peluquería',
      icon: <Tags className="w-12 h-12" />,
      color: 'bg-indigo-600',
      hover: 'hover:bg-indigo-700'
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
      case 'TARIFAS':
        return <TariffSystem onBack={() => setCurrentSystem('HUB')} />;
      default:
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
            <header className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
              <h1 className="text-5xl font-extrabold text-slate-800 mb-2 tracking-tighter">Veterinaria Amazonia</h1>
              <p className="text-slate-400 text-lg font-medium uppercase tracking-[0.3em] text-[10px]">Gestión Integral Profesional</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl">
              {systems.map((sys) => (
                <button
                  key={sys.id}
                  onClick={() => setCurrentSystem(sys.id)}
                  className={`${sys.color} ${sys.hover} transition-all duration-300 transform hover:-translate-y-2 p-10 rounded-[3rem] shadow-xl flex flex-col items-center text-white text-center group`}
                >
                  <div className="mb-6 p-5 bg-white/20 rounded-full group-hover:scale-110 transition-transform">
                    {sys.icon}
                  </div>
                  <h2 className="text-2xl font-black mb-2 tracking-tight">{sys.title}</h2>
                  <p className="text-white/80 text-xs font-medium">{sys.description}</p>
                </button>
              ))}
            </div>

            <div className="mt-12 w-full max-w-4xl bg-white p-10 rounded-[4rem] shadow-sm border">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-slate-900 text-white rounded-2xl shadow-lg">
                  <Calculator size={24} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Estado de Fondos (Reposición)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 shadow-inner">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Fondo Mateando</p>
                  <p className="text-4xl font-black text-emerald-800 tracking-tighter">${resupplyFund.MATEANDO.toLocaleString()}</p>
                  <p className="text-[10px] text-emerald-500 mt-4 font-bold italic uppercase">Capital de mercadería vendida.</p>
                </div>
                <div className="p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100 shadow-inner">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Fondo Petshop</p>
                  <p className="text-4xl font-black text-amber-800 tracking-tighter">${resupplyFund.PETSHOP.toLocaleString()}</p>
                  <p className="text-[10px] text-amber-500 mt-4 font-bold italic uppercase">Capital de mercadería vendida.</p>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return <>{renderContent()}</>;
};

export default App;
