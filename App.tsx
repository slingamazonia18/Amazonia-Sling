
import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Stethoscope, 
  Leaf, 
  LayoutDashboard,
  Wallet,
  Calculator,
  Tags,
  Lock,
  User,
  LogIn,
  AlertCircle
} from 'lucide-react';
import { SystemType } from './types';
import RetailSystem from './components/RetailSystem';
import ClinicSystem from './components/ClinicSystem';
import TariffSystem from './components/TariffSystem';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentSystem, setCurrentSystem] = useState<SystemType>('HUB');
  const [resupplyFund, setResupplyFund] = useState({ MATEANDO: 0, PETSHOP: 0 });
  
  // Login States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);

  useEffect(() => {
    if (isAuthenticated && currentSystem === 'HUB') {
      calculateGlobalResupply();
    }
  }, [currentSystem, isAuthenticated]);

  const calculateGlobalResupply = async () => {
    try {
      const { data: sales, error } = await supabase
        .from('sales')
        .select('*, sale_items(*)');
      
      if (error) {
        console.warn("Error consultando ventas:", error.message);
        return;
      }

      const { data: products } = await supabase.from('products').select('id, cost');
      const costMap = new Map<string, number>(
        (products || []).map(p => [p.id, Number(p.cost) || 0])
      );

      const totals = { MATEANDO: 0, PETSHOP: 0 };
      sales?.forEach((sale: any) => {
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

  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const validUser = normalizeText(username) === 'amazonia';
    const validPass = password === '1960';

    if (validUser && validPass) {
      setIsAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-500">
          <div className="flex flex-col items-center mb-10">
            <div className="p-5 bg-slate-900 text-white rounded-[2rem] shadow-xl mb-6">
              <Lock size={40} />
            </div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase text-center">Acceso Amazonia</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Sistema de Gestión Pro</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Usuario</label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold" 
                  placeholder="Nombre de usuario"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold" 
                  placeholder="••••"
                  required
                />
              </div>
            </div>

            {loginError && (
              <div className="flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-xl border border-red-100 animate-bounce">
                <AlertCircle size={18} />
                <span className="text-xs font-black uppercase">Credenciales incorrectas</span>
              </div>
            )}

            <button 
              type="submit" 
              className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <LogIn size={20} /> INICIAR SESIÓN
            </button>
          </form>
          
          <p className="mt-10 text-center text-[9px] font-black text-slate-300 uppercase tracking-widest italic">
            Amazonia Veterinaria © 2024
          </p>
        </div>
      </div>
    );
  }

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
              <div className="flex justify-center mb-4">
                 <button 
                  onClick={() => setIsAuthenticated(false)}
                  className="text-[9px] font-black text-slate-300 hover:text-red-500 uppercase tracking-widest transition-colors"
                >
                  Cerrar Sesión
                </button>
              </div>
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
