
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowLeft, Package, ShoppingCart, Users, TrendingUp, Search, Plus, 
  Trash2, Printer, PhoneCall, Save, Barcode, ShoppingBag, Leaf, Loader2, X, Minus, Ban, Edit3, Settings, Scan, Layers, Calculator, FileSpreadsheet, ArrowDownCircle, History
} from 'lucide-react';
import { Product, Supplier, Sale, Payment, ProductCategory } from '../types';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';

interface RetailSystemProps {
  type: 'PETSHOP' | 'MATEANDO';
  onBack: () => void;
}

type TabType = 'INVENTARIO' | 'VENDER' | 'HISTORIAL DE VENTAS' | 'PROVEEDORES' | 'PAGOS' | 'CUENTAS';

const RetailSystem: React.FC<RetailSystemProps> = ({ type, onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('INVENTARIO');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [cashDrawerFund, setCashDrawerFund] = useState<string>('0');
  const [historyFilter, setHistoryFilter] = useState<'HOY' | 'SEMANA' | 'MES' | 'AÑO' | 'CALENDARIO'>('HOY');
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('TODAS');
  
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  
  const [voidingSale, setVoidingSale] = useState<any>(null);
  const [voidCode, setVoidCode] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formCost, setFormCost] = useState<string>('0');
  const [formMargin, setFormMargin] = useState<string>('30');
  const [formPrice, setFormPrice] = useState<number>(0);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('EFECTIVO');
  const [adjustmentType, setAdjustmentType] = useState<'DESCUENTO' | 'RECARGO'>('DESCUENTO');
  const [adjustmentPercent, setAdjustmentPercent] = useState<string>(''); 

  const colors = type === 'PETSHOP' ? {
    primary: 'bg-amber-500', text: 'text-amber-600'
  } : {
    primary: 'bg-emerald-600', text: 'text-emerald-600'
  };

  // FETCH Y TIEMPO REAL
  useEffect(() => {
    fetchData();

    // SUSCRIPCIÓN EN TIEMPO REAL MULTI-TABLA
    const channel = supabase
      .channel(`retail-sync-${type}`)
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        // Recargar datos cuando ocurra cualquier cambio en la DB
        console.log("Cambio detectado, actualizando interfaz...");
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [type]);

  useEffect(() => {
    const costNum = parseFloat(formCost.replace(',', '.')) || 0;
    const marginNum = parseFloat(formMargin.replace(',', '.')) || 0;
    setFormPrice(Number((costNum * (1 + marginNum / 100)).toFixed(2)));
  }, [formCost, formMargin]);

  const fetchData = async () => {
    try {
      const [prods, cats, sups, payms, sales] = await Promise.all([
        supabase.from('products').select('*').eq('category', type).order('name'),
        supabase.from('product_categories').select('*').eq('system_type', type).order('name'),
        supabase.from('suppliers').select('*').eq('category', type).order('name'),
        supabase.from('payments').select('*').eq('system_type', type).order('date', { ascending: false }),
        supabase.from('sales').select('*, sale_items(*)').eq('system_type', type).order('created_at', { ascending: false })
      ]);

      if (prods.data) setProducts(prods.data);
      if (cats.data) setCategories(cats.data);
      if (sups.data) setSuppliers(sups.data);
      if (payms.data) setPayments(payms.data);
      if (sales.data) setSalesHistory(sales.data);
    } catch (error) {
      console.error("Error sincronizando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find(p => p.barcode === barcodeInput);
    if (product) {
      handleAddToCart(product);
      setBarcodeInput('');
    }
    barcodeInputRef.current?.focus();
  };

  const handleAddToCart = (p: Product) => {
    if (p.stock <= 0) { alert("Sin stock"); return; }
    setCart(prev => {
      const exists = prev.find(item => item.product.id === p.id);
      if (exists) return prev.map(item => item.product.id === p.id ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { product: p, qty: 1 }];
    });
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0));
  };

  const handleCheckout = async () => {
    const subtotal = cart.reduce((acc, curr) => acc + (curr.product.price * curr.qty), 0);
    const adj = (parseFloat(adjustmentPercent) || 0) / 100;
    const total = subtotal * (1 + (adjustmentType === 'DESCUENTO' ? -adj : adj));
    
    setLoading(true);
    try {
      const { data: sale, error } = await supabase.from('sales').insert({
        total, payment_method: selectedPaymentMethod, billing_type: 'COMPROBANTE', system_type: type, is_voided: false
      }).select().single();
      
      if (error) throw error;
      
      const items = cart.map(c => ({
        sale_id: sale.id, product_id: c.product.id, name: c.product.name, quantity: c.qty, subtotal: c.product.price * c.qty
      }));
      
      await supabase.from('sale_items').insert(items);
      for (const item of cart) {
        await supabase.from('products').update({ stock: item.product.stock - item.qty }).eq('id', item.product.id);
      }
      
      setCart([]); setShowCheckoutModal(false); setAdjustmentPercent('');
      // No hace falta llamar a fetchData() manualmente, el Realtime lo hará
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const filteredInventory = useMemo(() => {
    return products.filter(p => (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode.includes(searchTerm)) && (categoryFilter === 'TODAS' || p.product_category === categoryFilter));
  }, [products, searchTerm, categoryFilter]);

  const stats = useMemo(() => {
    const activeSales = salesHistory.filter(s => !s.is_voided && new Date(s.created_at).toDateString() === new Date().toDateString());
    const fondo = parseFloat(cashDrawerFund.replace(',', '.')) || 0;
    const ventaTotal = activeSales.reduce((a, s) => a + Number(s.total), 0);
    const tarjetas = activeSales.filter(s => s.payment_method !== 'EFECTIVO').reduce((a, s) => a + Number(s.total), 0);
    const egresos = payments.filter(p => p.date === new Date().toISOString().split('T')[0]).reduce((a, p) => a + (p.paid_amount || p.amount), 0);
    return { fondo, ventaTotal, tarjetas, egresos, real: (fondo + ventaTotal) - tarjetas - egresos };
  }, [salesHistory, payments, cashDrawerFund]);

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
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input type="text" placeholder="Buscar..." className="w-full pl-12 pr-4 py-4 rounded-3xl border shadow-sm outline-none" onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <button onClick={() => { setEditingProduct(null); setShowProductModal(true); }} className={`${colors.primary} text-white px-10 py-4 rounded-3xl font-black flex items-center gap-2 shadow-xl uppercase text-[10px]`}>+ NUEVO PRODUCTO</button>
            </div>
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
                      <td className="px-8 py-5 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100">
                        <button onClick={() => { setEditingProduct(p); setFormCost(p.cost.toString()); setFormMargin(p.margin.toString()); setShowProductModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl"><Edit3 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'VENDER' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
             <div className="space-y-4">
                <form onSubmit={handleBarcodeSubmit} className="relative group">
                  <Scan className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                  <input ref={barcodeInputRef} type="text" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} autoFocus className="w-full pl-16 p-6 bg-slate-900 text-white rounded-3xl outline-none text-xl font-black shadow-2xl" placeholder="Escanee Código..." />
                </form>
                <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                   {products.filter(p => p.stock > 0).map(p => (
                     <button key={p.id} onClick={() => handleAddToCart(p)} className="p-4 border-2 rounded-2xl text-left bg-white hover:border-blue-500 transition-all active:scale-95 shadow-sm">
                       <p className="font-black text-slate-800 text-[10px] uppercase truncate">{p.name}</p>
                       <div className="flex justify-between mt-2 items-end"><span className="font-black text-xl text-slate-900">${p.price}</span><span className="text-[9px] font-black text-slate-400">STOCK: {p.stock}</span></div>
                     </button>
                   ))}
                </div>
             </div>
             <div className="bg-white p-8 rounded-[3rem] shadow-2xl border flex flex-col h-fit sticky top-28">
                <div className="flex items-center gap-3 mb-6"><ShoppingCart size={24}/><h3 className="text-xl font-black uppercase">Carrito Actual</h3></div>
                <div className="space-y-3 mb-8 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                   {cart.map(item => (
                     <div key={item.product.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center border">
                        <div className="flex-1"><p className="font-black text-xs uppercase">{item.product.name}</p><p className="text-[10px] font-bold text-slate-400">${item.product.price} c/u</p></div>
                        <div className="flex items-center gap-4">
                           <div className="flex items-center bg-white border rounded-xl p-1 shadow-sm">
                              <button onClick={() => updateCartQty(item.product.id, -1)} className="w-6 h-6 flex items-center justify-center font-black">-</button>
                              <span className="w-8 text-center text-xs font-black">{item.qty}</span>
                              <button onClick={() => updateCartQty(item.product.id, 1)} className="w-6 h-6 flex items-center justify-center font-black">+</button>
                           </div>
                           <p className="font-black text-slate-900 text-sm w-20 text-right">${(item.qty * item.product.price).toFixed(2)}</p>
                        </div>
                     </div>
                   ))}
                </div>
                <div className="border-t-2 border-dashed pt-6 mt-auto">
                   <div className="flex justify-between items-end mb-6">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total a Pagar</p>
                      <div className="text-5xl font-black text-slate-900">${cart.reduce((a,c) => a + (c.qty * c.product.price), 0).toFixed(2)}</div>
                   </div>
                   <button onClick={() => setShowCheckoutModal(true)} disabled={cart.length === 0} className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl disabled:opacity-20 active:scale-95 transition-all">FINALIZAR COBRO</button>
                </div>
             </div>
          </div>
        )}

        {/* Los demás estados siguen igual pero se refrescan solos por el useEffect global */}
      </main>

      {/* FOOTER DE CARGA */}
      {loading && (<div className="fixed bottom-10 right-10 bg-white p-5 rounded-3xl shadow-2xl flex items-center gap-4 border z-[1000] animate-pulse"><Loader2 className="animate-spin text-blue-500" size={20} /><span className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Sincronizando...</span></div>)}
      
      {/* MODALES DE GESTIÓN... (Sin cambios, el guardado disparará el Realtime) */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/70 z-[120] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-sm p-8 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black mb-8 uppercase text-center tracking-tighter italic">Finalizar Cobro</h2>
            <div className="space-y-3 mb-8">
              {['EFECTIVO', 'TRANSFERENCIA', 'QR'].map(m => (
                <button key={m} onClick={() => setSelectedPaymentMethod(m)} className={`w-full p-5 rounded-2xl border-2 font-black transition-all flex items-center justify-between ${selectedPaymentMethod === m ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}>{m}</button>
              ))}
            </div>
            <button onClick={handleCheckout} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95">CONFIRMAR VENTA</button>
            <button onClick={() => setShowCheckoutModal(false)} className="w-full mt-6 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-500 transition-colors">Volver</button>
          </div>
        </div>
      )}

      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black text-slate-800">{editingProduct ? 'Editar' : 'Nuevo'} Producto</h2><button onClick={() => setShowProductModal(false)}><X /></button></div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const data = {
                name: (f.get('name') as string).toUpperCase(),
                barcode: f.get('barcode') as string,
                stock: Number(f.get('stock')),
                min_stock: Number(f.get('min_stock')),
                cost: parseFloat(formCost),
                margin: parseFloat(formMargin),
                price: formPrice,
                category: type
              };
              if(editingProduct) await supabase.from('products').update(data).eq('id', editingProduct.id);
              else await supabase.from('products').insert(data);
              setShowProductModal(false);
            }} className="grid grid-cols-2 gap-4">
              <input name="name" defaultValue={editingProduct?.name} required placeholder="Nombre del producto" className="col-span-2 w-full p-4 bg-slate-50 border rounded-2xl font-bold uppercase" />
              <input name="barcode" defaultValue={editingProduct?.barcode} placeholder="Código de barras" className="col-span-2 w-full p-4 bg-slate-50 border rounded-2xl font-mono text-sm" />
              <input name="stock" type="number" defaultValue={editingProduct?.stock || 0} required placeholder="Stock Actual" className="w-full p-4 bg-slate-50 border rounded-2xl font-black" />
              <input name="min_stock" type="number" defaultValue={editingProduct?.min_stock || 5} placeholder="Min. Stock Alerta" className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-red-500" />
              <input value={formCost} onChange={(e) => setFormCost(e.target.value)} placeholder="Costo $" className="w-full p-4 bg-slate-50 border rounded-2xl font-black" />
              <input value={formMargin} onChange={(e) => setFormMargin(e.target.value)} placeholder="Margen %" className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-blue-600" />
              <button type="submit" className="col-span-2 bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest mt-4">GUARDAR PRODUCTO</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetailSystem;
