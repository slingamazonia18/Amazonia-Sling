
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowLeft, ShoppingCart, Search, Plus, Trash2, Edit3, Scan, 
  Loader2, History, CreditCard, Ban, TrendingUp, PiggyBank, Package, X, PhoneCall, Layers
} from 'lucide-react';
import { Product, Sale, Payment, Supplier, ProductCategory } from '../types';
import { supabase } from '../lib/supabase';

interface RetailSystemProps {
  type: 'PETSHOP' | 'MATEANDO';
  onBack: () => void;
}

type TabType = 'VENDER' | 'INVENTARIO' | 'HISTORIAL' | 'PROVEEDORES' | 'FINANZAS';

const RetailSystem: React.FC<RetailSystemProps> = ({ type, onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('VENDER');
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('EFECTIVO');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const colors = type === 'PETSHOP' ? {
    primary: 'bg-amber-500', hover: 'hover:bg-amber-600', text: 'text-amber-600'
  } : {
    primary: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-emerald-600'
  };

  // EFECTO DE TIEMPO REAL: Escucha cualquier cambio en la base de datos
  useEffect(() => {
    fetchData();
    
    // Suscripción global a cambios en el esquema público
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchData(); // Recargar datos automáticamente cuando algo cambie
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [type]);

  const fetchData = async () => {
    const { data: prods } = await supabase.from('products').select('*').eq('category', type).order('name');
    const { data: sups } = await supabase.from('suppliers').select('*').eq('category', type).order('name');
    const { data: sales } = await supabase.from('sales').select('*, sale_items(*)').eq('system_type', type).order('created_at', { ascending: false }).limit(50);
    const { data: payms } = await supabase.from('payments').select('*').eq('system_type', type).order('date', { ascending: false });
    const { data: cats } = await supabase.from('product_categories').select('*').eq('system_type', type);

    if (prods) setProducts(prods);
    if (sups) setSuppliers(sups);
    if (sales) setSalesHistory(sales);
    if (payms) setPayments(payms);
    if (cats) setCategories(cats);
    setLoading(false);
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput) return;
    const product = products.find(p => p.barcode === barcodeInput);
    if (product) {
      handleAddToCart(product);
      setBarcodeInput('');
    } else {
      setBarcodeInput('');
    }
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert("Sin stock disponible");
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { product, qty: 1 }];
    });
    barcodeInputRef.current?.focus();
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === id) {
        const newQty = Math.max(0, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }).filter(item => item.qty > 0));
  };

  const handleCheckout = async () => {
    const total = cart.reduce((acc, curr) => acc + (curr.product.price * curr.qty), 0);
    setLoading(true);
    try {
      const { data: sale, error } = await supabase.from('sales').insert({
        total, payment_method: selectedPaymentMethod, system_type: type, is_voided: false
      }).select().single();
      
      if (error) throw error;
      
      const items = cart.map(c => ({
        sale_id: sale.id, product_id: c.product.id, name: c.product.name, quantity: c.qty, subtotal: c.product.price * c.qty
      }));
      
      await supabase.from('sale_items').insert(items);
      for (const item of cart) {
        await supabase.from('products').update({ stock: item.product.stock - item.qty }).eq('id', item.product.id);
      }
      
      setCart([]);
      setShowCheckoutModal(false);
    } catch (err) { 
      alert("Error al procesar venta"); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = f.get('name') as string;
    const whatsapp = f.get('whatsapp') as string;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('suppliers').insert({
        name, whatsapp, category: type
      });
      if (error) throw error;
      setShowSupplierModal(false);
    } catch (err) {
      alert("Error al guardar proveedor");
    } finally {
      setLoading(false);
    }
  };

  const subtotalCart = cart.reduce((a, c) => a + (c.product.price * c.qty), 0);
  const filteredInventory = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode.includes(searchTerm));

  const stats = useMemo(() => {
    const validSales = salesHistory.filter(s => !s.is_voided);
    const totalVentas = validSales.reduce((acc, s) => acc + Number(s.total), 0);
    const totalEgresos = payments.reduce((acc, p) => acc + Number(p.amount), 0);
    return { totalVentas, totalEgresos, balance: totalVentas - totalEgresos };
  }, [salesHistory, payments]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className={`${colors.primary} text-white px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50`}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition-colors"><ArrowLeft size={24} /></button>
          <h1 className="text-2xl font-black uppercase tracking-tighter">Amazonia {type}</h1>
        </div>
        <div className="hidden md:flex bg-white/20 rounded-2xl p-1 gap-1">
          {['VENDER', 'INVENTARIO', 'HISTORIAL', 'PROVEEDORES', 'FINANZAS'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as TabType)} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-md' : 'hover:bg-white/10'}`}>{tab}</button>
          ))}
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'VENDER' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
            <div className="space-y-6">
              <form onSubmit={handleBarcodeSubmit} className="relative group">
                <Scan className={`absolute left-5 top-1/2 -translate-y-1/2 ${colors.text}`} size={24} />
                <input ref={barcodeInputRef} type="text" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} autoFocus className="w-full pl-16 p-6 bg-slate-900 text-white rounded-3xl outline-none text-xl font-black shadow-2xl focus:ring-4 focus:ring-blue-500/20 transition-all" placeholder="Escanear Producto..." />
              </form>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {products.filter(p => p.stock > 0).map(p => (
                  <button key={p.id} onClick={() => handleAddToCart(p)} className="p-4 border-2 rounded-2xl text-left bg-white hover:border-blue-500 transition-all active:scale-95 shadow-sm group">
                    <p className="font-black text-slate-800 text-[10px] uppercase truncate group-hover:text-blue-600">{p.name}</p>
                    <div className="flex justify-between mt-2 items-end">
                      <span className="font-black text-xl text-slate-900">${p.price}</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${p.stock < 5 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{p.stock} un</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[3rem] shadow-2xl border-t-8 border-slate-900 h-fit sticky top-28">
              <div className="flex items-center gap-3 mb-8"><ShoppingCart size={24} className="text-slate-400" /><h3 className="text-2xl font-black uppercase tracking-tight">Caja Actual</h3></div>
              <div className="space-y-4 max-h-[40vh] overflow-y-auto mb-8 pr-2 custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="text-center py-16 opacity-10">
                    <Package size={64} className="mx-auto mb-4" />
                    <p className="font-black uppercase text-sm">Carrito Vacío</p>
                  </div>
                ) : cart.map(item => (
                  <div key={item.product.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center border border-slate-100">
                    <div className="flex-1 mr-4">
                      <p className="font-black text-[11px] uppercase truncate text-slate-700">{item.product.name}</p>
                      <p className="text-[10px] font-bold text-slate-400">${item.product.price} c/u</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center bg-white border-2 rounded-xl p-1 shadow-sm">
                        <button onClick={() => updateCartQty(item.product.id, -1)} className="w-8 h-8 flex items-center justify-center font-black text-red-500">-</button>
                        <span className="w-10 text-center text-sm font-black">{item.qty}</span>
                        <button onClick={() => updateCartQty(item.product.id, 1)} className="w-8 h-8 flex items-center justify-center font-black text-blue-500">+</button>
                      </div>
                      <p className="font-black text-lg min-w-[80px] text-right text-slate-900">${(item.qty * item.product.price).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t-2 border-dashed pt-8">
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Monto Total</p>
                    <div className="text-6xl font-black tracking-tighter text-slate-900">${subtotalCart.toLocaleString()}</div>
                  </div>
                </div>
                <button onClick={() => setShowCheckoutModal(true)} disabled={cart.length === 0} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20">FINALIZAR COBRO</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'PROVEEDORES' && (
          <div className="space-y-6 animate-in fade-in">
             <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Directorio Proveedores</h2>
                <button onClick={() => setShowSupplierModal(true)} className={`${colors.primary} text-white px-8 py-4 rounded-3xl font-black uppercase text-xs shadow-xl flex items-center gap-2`}><Plus /> Nuevo Proveedor</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {suppliers.map(sup => (
                  <div key={sup.id} className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col gap-4 group hover:shadow-xl transition-all">
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{sup.name}</h3>
                    {sup.whatsapp && (
                      <a href={`https://wa.me/${sup.whatsapp}`} target="_blank" rel="noopener noreferrer" className="bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs text-center flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-600 transition-all"><PhoneCall size={18} /> PEDIDO WHATSAPP</a>
                    )}
                    <button onClick={async () => { if(confirm("¿Eliminar?")) await supabase.from('suppliers').delete().eq('id', sup.id); }} className="text-red-300 hover:text-red-500 text-[10px] font-black uppercase flex items-center gap-2 justify-center mt-2 opacity-50 group-hover:opacity-100 transition-all"><Trash2 size={14}/> Eliminar</button>
                  </div>
                ))}
                {suppliers.length === 0 && <div className="col-span-full p-20 text-center text-slate-300 font-black uppercase italic tracking-widest border-2 border-dashed rounded-[3rem]">No hay proveedores registrados</div>}
             </div>
          </div>
        )}

        {/* Los demás estados se actualizan por el canal de tiempo real global */}
        {activeTab === 'INVENTARIO' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input type="text" placeholder="Buscar por nombre o código..." className="w-full pl-12 p-4 rounded-2xl border shadow-sm outline-none" onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <button onClick={() => { setEditingProduct(null); setShowProductModal(true); }} className={`${colors.primary} text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-lg`}>+ Nuevo Producto</button>
            </div>
            <div className="bg-white rounded-[2rem] border overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b">
                  <tr><th className="p-6">Producto</th><th className="p-6">Código</th><th className="p-6">Stock</th><th className="p-6">Venta</th><th className="p-6 text-right">Acciones</th></tr>
                </thead>
                <tbody className="divide-y">
                  {filteredInventory.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 group transition-colors">
                      <td className="p-6"><p className="font-black text-slate-800 uppercase text-xs">{p.name}</p></td>
                      <td className="p-6 font-mono text-[10px] text-slate-400">{p.barcode || '---'}</td>
                      <td className="p-6"><span className={`font-black text-lg ${p.stock <= p.min_stock ? 'text-red-500' : 'text-slate-900'}`}>{p.stock}</span></td>
                      <td className="p-6 font-black text-slate-900">${p.price}</td>
                      <td className="p-6 text-right space-x-2">
                        <button onClick={() => { setEditingProduct(p); setShowProductModal(true); }} className="p-2 text-blue-400 hover:bg-blue-50 rounded-xl"><Edit3 size={18}/></button>
                        <button onClick={async () => { if(confirm("¿Eliminar?")) await supabase.from('products').delete().eq('id', p.id); }} className="p-2 text-red-300 hover:bg-red-50 hover:text-red-500 rounded-xl"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL PROVEEDOR */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black uppercase tracking-tight text-slate-800">Registrar Proveedor</h2><button onClick={() => setShowSupplierModal(false)}><X /></button></div>
            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Nombre / Empresa</label><input name="name" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold uppercase" placeholder="Ej: Distribuidora Yerba" /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">WhatsApp (Con código de país)</label><input name="whatsapp" placeholder="Ej: 5491122334455" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" /></div>
              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase shadow-xl hover:bg-black transition-all mt-4 tracking-widest">GUARDAR PROVEEDOR</button>
            </form>
          </div>
        </div>
      )}

      {/* OTROS MODALES (Checkout, Producto) siguen aquí... */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] w-full max-sm p-10 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black mb-8 uppercase text-center tracking-tighter">Finalizar Venta</h2>
            <div className="space-y-3 mb-8">
              {['EFECTIVO', 'TRANSFERENCIA', 'QR'].map(m => (
                <button key={m} onClick={() => setSelectedPaymentMethod(m)} className={`w-full p-5 rounded-2xl border-2 font-black transition-all flex items-center justify-between ${selectedPaymentMethod === m ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}>
                  {m}
                </button>
              ))}
            </div>
            <div className="bg-slate-900 p-6 rounded-3xl mb-8 text-center shadow-lg">
               <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Monto a Cobrar</p>
               <div className="text-4xl font-black text-white">${subtotalCart.toLocaleString()}</div>
            </div>
            <button onClick={handleCheckout} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black uppercase tracking-widest shadow-xl">CONFIRMAR PAGO</button>
            <button onClick={() => setShowCheckoutModal(false)} className="w-full mt-6 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-500">Volver</button>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed bottom-10 right-10 bg-white p-5 rounded-3xl shadow-2xl flex items-center gap-4 border-2 z-[1000] animate-bounce">
          <Loader2 className="animate-spin text-blue-500" size={24} />
          <span className="font-black text-[10px] uppercase text-slate-500">Sincronizando...</span>
        </div>
      )}
    </div>
  );
};

export default RetailSystem;
