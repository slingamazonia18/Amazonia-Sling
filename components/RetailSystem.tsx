
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowLeft, Package, ShoppingCart, Users, TrendingUp, Search, Plus, 
  Trash2, Printer, PhoneCall, Save, Barcode, ShoppingBag, Leaf, Loader2, X, Minus, Ban, Edit3, Settings, Scan, Layers, Calculator, FileSpreadsheet, ArrowDownCircle, History
} from 'lucide-react';
import { Product, Supplier, Sale, Payment, ProductCategory } from '../types';
import { supabase } from '../lib/supabase';

interface RetailSystemProps {
  type: 'PETSHOP' | 'MATEANDO';
  onBack: () => void;
}

type TabType = 'INVENTARIO' | 'VENDER' | 'HISTORIAL DE VENTAS' | 'PROVEEDORES' | 'PAGOS' | 'CUENTAS';

const RetailSystem: React.FC<RetailSystemProps> = ({ type, onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('INVENTARIO');
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('EFECTIVO');

  const colors = type === 'PETSHOP' ? {
    primary: 'bg-amber-500', text: 'text-amber-600'
  } : {
    primary: 'bg-emerald-600', text: 'text-emerald-600'
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel(`retail-sync-${type}`)
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [type]);

  const fetchData = async () => {
    try {
      const [prods, sups, payms, sales] = await Promise.all([
        supabase.from('products').select('*').eq('category', type).order('name'),
        supabase.from('suppliers').select('*').eq('category', type).order('name'),
        supabase.from('payments').select('*').eq('system_type', type).order('date', { ascending: false }),
        supabase.from('sales').select('*, sale_items(*)').eq('system_type', type).order('created_at', { ascending: false })
      ]);

      if (prods.error) throw new Error("Error en Tabla Productos");
      if (sups.error) throw new Error("Error en Tabla Proveedores");

      setProducts(prods.data || []);
      setSuppliers(sups.data || []);
      setPayments(payms.data || []);
      setSalesHistory(sales.data || []);
      setErrorStatus(null);
    } catch (error: any) {
      console.error("Error sincronizando:", error);
      setErrorStatus(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = useMemo(() => {
    return products.filter(p => 
      (p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.barcode?.includes(searchTerm))
    );
  }, [products, searchTerm]);

  const handleAddToCart = (p: Product) => {
    if (p.stock <= 0) { alert("Sin stock"); return; }
    setCart(prev => {
      const exists = prev.find(item => item.product.id === p.id);
      if (exists) return prev.map(item => item.product.id === p.id ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { product: p, qty: 1 }];
    });
  };

  if (errorStatus) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
        <Ban size={64} className="text-red-500 mb-6" />
        <h2 className="text-3xl font-black mb-4 uppercase">Error de Conexión</h2>
        <p className="text-slate-400 mb-8 max-w-md">Parece que las tablas no están creadas en Supabase o falta el script SQL inicial.</p>
        <button onClick={() => window.location.reload()} className="bg-white text-slate-900 px-10 py-4 rounded-3xl font-black uppercase tracking-widest">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      <nav className={`${colors.primary} text-white px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50`}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition-colors"><ArrowLeft size={24} /></button>
          <h1 className="text-2xl font-black italic uppercase">AMAZONIA {type}</h1>
        </div>
        <div className="flex bg-white/20 rounded-[1.5rem] p-1 overflow-x-auto no-scrollbar">
          {['INVENTARIO', 'VENDER', 'HISTORIAL DE VENTAS', 'PROVEEDORES', 'PAGOS', 'CUENTAS'].map(id => (
            <button key={id} onClick={() => setActiveTab(id as TabType)} className={`px-4 py-2 rounded-xl font-black text-[9px] tracking-widest uppercase transition-all whitespace-nowrap ${activeTab === id ? 'bg-white text-slate-900 shadow-sm' : 'hover:bg-white/10'}`}>{id}</button>
          ))}
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'INVENTARIO' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input type="text" placeholder="Buscar..." className="w-full pl-12 pr-4 py-4 rounded-3xl border shadow-sm outline-none" onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <button onClick={() => setShowProductModal(true)} className={`${colors.primary} text-white px-10 py-4 rounded-3xl font-black flex items-center gap-2 shadow-xl uppercase text-[10px]`}>+ NUEVO PRODUCTO</button>
            </div>
            
            {loading ? (
              <div className="py-40 flex flex-col items-center"><Loader2 className="animate-spin text-slate-300" size={48} /></div>
            ) : (
              <div className="bg-white rounded-[3rem] shadow-sm border overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                    <tr><th className="px-8 py-6">Producto</th><th className="px-8 py-6">Stock</th><th className="px-8 py-6">Venta</th><th className="px-8 py-6 text-right">Acciones</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredInventory.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 group">
                        <td className="px-8 py-5"><p className="font-black text-slate-800 uppercase text-xs">{p.name}</p></td>
                        <td className="px-8 py-5 font-black text-lg">{p.stock}</td>
                        <td className="px-8 py-5 font-black text-slate-900">${p.price}</td>
                        <td className="px-8 py-5 text-right flex justify-end gap-2">
                           <button onClick={async () => { if(confirm("¿Eliminar?")) await supabase.from('products').delete().eq('id', p.id); }} className="p-2 text-red-300 hover:text-red-500 rounded-xl"><Trash2 size={18}/></button>
                        </td>
                      </tr>
                    ))}
                    {filteredInventory.length === 0 && (
                      <tr><td colSpan={4} className="p-20 text-center text-slate-300 font-black uppercase tracking-widest italic">No hay productos en esta sección</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {/* El resto de las pestañas siguen igual... */}
      </main>

      {loading && (
        <div className="fixed bottom-10 right-10 bg-white p-5 rounded-3xl shadow-2xl flex items-center gap-4 border z-[1000] animate-pulse">
          <Loader2 className="animate-spin text-blue-500" size={20} />
          <span className="font-black text-[10px] uppercase text-slate-500">Conectando Amazonia...</span>
        </div>
      )}
    </div>
  );
};

export default RetailSystem;
