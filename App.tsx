
import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Stethoscope, Leaf, Calculator, Tags, Lock, LogIn, PiggyBank
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
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const saved = localStorage.getItem('amazonia_auth');
      if (saved === 'true') setIsAuthenticated(true);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      calculateGlobalResupply();
      const sub = supabase.channel('global-updates').on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, calculateGlobalResupply).subscribe();
      return () => { supabase.removeChannel(sub); };
    }
  }, [isAuthenticated]);

  const calculateGlobalResupply = async () => {
    try {
      const { data: sales } = await supabase.from('sales').select('*, sale_items(*)').eq('is_voided', false);
      const { data: products } = await supabase.from('products').select('id, cost');
      
      const costMap = new Map<string, number>((products || []).map(p => [p.id, Number(p.cost) || 0]));
      const totals = { MATEANDO: 0, PETSHOP: 0 };

      sales?.forEach((sale: any) => {
        sale.sale_items?.forEach((item: any) => {
          const cost = costMap.get(item.product_id) || 0;
          if (sale.system_type === 'MATEANDO') totals.MATEANDO += cost * item.quantity;
          if (sale.system_type === 'PETSHOP') totals.PETSHOP += cost * item.quantity;
        });
      });
      setResupplyFund(totals);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.toLowerCase() === 'amazonia' && password === '1960') {
      setIsAuthenticated(true);
      localStorage.setItem('amazonia_auth', 'true');
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('amazonia_auth');
    setCurrentSystem('HUB');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md bg-white p-10 rounded-[3rem] shadow-2xl border animate-in zoom-in-95">
          <div className="flex flex-col items-center mb-10">
            <div className="p-5 bg-slate-900 text-white rounded-[2rem] shadow-xl mb-6"><Lock size={40} /></div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase italic">Amazonia</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Sistema Realtime Pro</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Usuario" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="••••" required />
            {loginError && <div className="text-red-500 text-[10px] font-black uppercase text-center">Acceso Denegado</div>}
            <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"><LogIn size={20} /> ENTRAR</button>
          </form>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentSystem) {
      case 'PETSHOP': return <RetailSystem type="PETSHOP" onBack={() => setCurrentSystem('HUB')} />;
      case 'MATEANDO': return <RetailSystem type="MATEANDO" onBack={() => setCurrentSystem('HUB')} />;
      case 'CONSULTORIO': return <ClinicSystem onBack={() => setCurrentSystem('HUB')} />;
      case 'TARIFAS': return <TariffSystem onBack={() => setCurrentSystem('HUB')} />;
      default:
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 animate-in fade-in duration-700">
            <header className="text-center mb-12">
              <button onClick={handleLogout} className="text-[9px] font-black text-slate-300 hover:text-red-500 uppercase tracking-widest mb-4 transition-colors">Cerrar Sesión</button>
              <h1 className="text-6xl font-black text-slate-800 mb-2 tracking-tighter italic">Amazonia</h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.5em]">Central de Operaciones</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl px-4">
              {[
                { id: 'MATEANDO', title: 'Mateando', icon: <Leaf className="w-12 h-12" />, color: 'bg-emerald-600', desc: 'Yerbas e Insumos' },
                { id: 'PETSHOP', title: 'Petshop', icon: <ShoppingBag className="w-12 h-12" />, color: 'bg-amber-500', desc: 'Alimentos y Accesorios' },
                { id: 'CONSULTORIO', title: 'Clínica', icon: <Stethoscope className="w-12 h-12" />, color: 'bg-sky-500', desc: 'Salud y Farmacia' },
                { id: 'TARIFAS', title: 'Tarifas', icon: <Tags className="w-12 h-12" />, color: 'bg-indigo-600', desc: 'Peluquería Canina' }
              ].map((sys) => (
                <button key={sys.id} onClick={() => setCurrentSystem(sys.id as SystemType)} className={`${sys.color} hover:scale-105 transition-all p-10 rounded-[3rem] shadow-xl flex flex-col items-center text-white text-center group active:scale-95`}>
                  <div className="mb-6 p-5 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors">{sys.icon}</div>
                  <h2 className="text-2xl font-black mb-2 tracking-tight uppercase">{sys.title}</h2>
                  <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">{sys.desc}</p>
                </button>
              ))}
            </div>

            <div className="mt-12 w-full max-w-4xl bg-white p-10 rounded-[4rem] shadow-sm border border-slate-100">
               <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg"><PiggyBank size={28}/></div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic">Fondo de Reposición (Mateando/Pet)</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-8 bg-emerald-50 rounded-[3rem] border-2 border-emerald-100 shadow-sm">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-2">Inversión Yerbas</p>
                    <p className="text-5xl font-black text-emerald-900 tracking-tighter">${resupplyFund.MATEANDO.toLocaleString()}</p>
                  </div>
                  <div className="p-8 bg-amber-50 rounded-[3rem] border-2 border-amber-100 shadow-sm">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-2">Inversión Petshop</p>
                    <p className="text-5xl font-black text-amber-900 tracking-tighter">${resupplyFund.PETSHOP.toLocaleString()}</p>
                  </div>
               </div>
               <p className="mt-6 text-center text-[9px] font-bold text-slate-300 uppercase italic">Cálculo basado en el costo real de los productos vendidos (is_voided=false)</p>
            </div>
          </div>
        );
    }
  };

  return <>{renderContent()}</>;
};

export default App;
