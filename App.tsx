
import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Stethoscope, 
  Leaf, 
  Calculator,
  Tags,
  Lock,
  User,
  LogIn,
  AlertCircle,
  PiggyBank
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
    if (isAuthenticated) {
      calculateGlobalResupply();
      
      // SUSCRIPCIÓN EN TIEMPO REAL: Actualiza fondos globales cuando cambia cualquier venta
      const channel = supabase
        .channel('global-sales-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
          calculateGlobalResupply();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated]);

  const calculateGlobalResupply = async () => {
    try {
      const { data: sales } = await supabase.from('sales').select('*, sale_items(*)').eq('is_voided', false);
      const { data: products } = await supabase.from('products').select('id, cost');
      
      const costMap = new Map<string, number>(
        (products || []).map(p => [p.id, Number(p.cost) || 0])
      );

      const totals = { MATEANDO: 0, PETSHOP: 0 };
      sales?.forEach((sale: any) => {
        sale.sale_items?.forEach((item: any) => {
          const costValue = costMap.get(item.product_id) || 0;
          if (sale.system_type === 'MATEANDO') totals.MATEANDO += costValue * item.quantity;
          if (sale.system_type === 'PETSHOP') totals.PETSHOP += costValue * item.quantity;
        });
      });
      setResupplyFund(totals);
    } catch (err) {
      console.error("Error calculando repositorio:", err);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.toLowerCase() === 'amazonia' && password === '1960') {
      setIsAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const systems = [
    { id: 'MATEANDO' as SystemType, title: 'Mateando', description: 'Yerbas e Insumos', icon: <Leaf className="w-12 h-12" />, color: 'bg-emerald-600' },
    { id: 'PETSHOP' as SystemType, title: 'Petshop', description: 'Alimentos y Accesorios', icon: <ShoppingBag className="w-12 h-12" />, color: 'bg-amber-500' },
    { id: 'CONSULTORIO' as SystemType, title: 'Consultorio', description: 'Atención Médica', icon: <Stethoscope className="w-12 h-12" />, color: 'bg-sky-500' },
    { id: 'TARIFAS' as SystemType, title: 'Tarifas', description: 'Precios Peluquería', icon: <Tags className="w-12 h-12" />, color: 'bg-indigo-600' }
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md bg-white p-10 rounded-[3rem] shadow-2xl border animate-in zoom-in-95 duration-500">
          <div className="flex flex-col items-center mb-10">
            <div className="p-5 bg-slate-900 text-white rounded-[2rem] shadow-xl mb-6"><Lock size={40} /></div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase italic">Amazonia</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" placeholder="Usuario" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" placeholder="••••" required />
            {loginError && <div className="text-red-500 text-xs font-black uppercase text-center">Error de acceso</div>}
            <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl">ENTRAR</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      {currentSystem === 'HUB' ? (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
          <header className="text-center mb-12">
            <button onClick={() => setIsAuthenticated(false)} className="text-[9px] font-black text-slate-300 hover:text-red-500 uppercase tracking-widest mb-4">Cerrar Sesión</button>
            <h1 className="text-5xl font-black text-slate-800 mb-2 tracking-tighter italic">Veterinaria Amazonia</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Gestión Integral Profesional</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl">
            {systems.map((sys) => (
              <button key={sys.id} onClick={() => setCurrentSystem(sys.id)} className={`${sys.color} hover:scale-105 transition-all p-10 rounded-[3rem] shadow-xl flex flex-col items-center text-white text-center group`}>
                <div className="mb-6 p-5 bg-white/20 rounded-full group-hover:scale-110 transition-transform">{sys.icon}</div>
                <h2 className="text-2xl font-black mb-2 tracking-tight uppercase">{sys.title}</h2>
                <p className="text-white/80 text-xs font-medium uppercase">{sys.description}</p>
              </button>
            ))}
          </div>

          <div className="mt-12 w-full max-w-4xl bg-white p-10 rounded-[4rem] shadow-sm border">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 bg-slate-900 text-white rounded-2xl shadow-lg"><Calculator size={24} /></div>
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic">Fondos de Reposición</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 shadow-inner">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Mateando</p>
                <p className="text-4xl font-black text-emerald-800 tracking-tighter">${resupplyFund.MATEANDO.toLocaleString()}</p>
              </div>
              <div className="p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100 shadow-inner">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Petshop</p>
                <p className="text-4xl font-black text-amber-800 tracking-tighter">${resupplyFund.PETSHOP.toLocaleString()}</p>
              </div>
            </div>
            <p className="mt-6 text-center text-[9px] font-bold text-slate-300 uppercase italic">Los cambios se reflejan en tiempo real en todos los dispositivos.</p>
          </div>
        </div>
      ) : (
        currentSystem === 'PETSHOP' ? <RetailSystem type="PETSHOP" onBack={() => setCurrentSystem('HUB')} /> :
        currentSystem === 'MATEANDO' ? <RetailSystem type="MATEANDO" onBack={() => setCurrentSystem('HUB')} /> :
        currentSystem === 'CONSULTORIO' ? <ClinicSystem onBack={() => setCurrentSystem('HUB')} /> :
        <TariffSystem onBack={() => setCurrentSystem('HUB')} />
      )}
    </>
  );
};

export default App;
