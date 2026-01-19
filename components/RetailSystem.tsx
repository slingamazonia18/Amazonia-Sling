
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowLeft, ShoppingCart, Search, Plus, Trash2, PhoneCall, Barcode, ShoppingBag, 
  Leaf, Loader2, X, Minus, Ban, Edit3, Scan, DollarSign, Banknote, QrCode, CreditCard, 
  Landmark, ArrowUpRight, ArrowDownLeft, List, Package, History, TrendingUp, ArrowDownCircle, Printer
} from 'lucide-react';
import { Product, Supplier, Sale, Payment, ProductCategory, SaleItem } from '../types';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';

interface RetailSystemProps {
  type: 'PETSHOP' | 'MATEANDO';
  onBack: () => void;
}

type TabType = 'INVENTARIO' | 'VENDER' | 'HISTORIAL DE VENTAS' | 'PROVEEDORES' | 'PAGOS' | 'CUENTAS';
type PaymentMethod = 'EFECTIVO' | 'QR' | 'DEBITO' | 'CREDITO' | 'TRANSFERENCIA';

const RetailSystem: React.FC<RetailSystemProps> = ({ type, onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('INVENTARIO');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('TODAS');
  
  const [showProductModal, setShowProductModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formCost, setFormCost] = useState<string>('0');
  const [formMargin, setFormMargin] = useState<string>('30');
  const [formPrice, setFormPrice] = useState<number>(0);

  // Checkout States
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('EFECTIVO');
  const [discountPct, setDiscountPct] = useState<string>(''); 
  const [increasePct, setIncreasePct] = useState<string>(''); 

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [barcodeInput, setBarcodeInput] = useState('');

  const colors = type === 'PETSHOP' ? {
    primary: 'bg-amber-500', 
    text: 'text-amber-600',
    light: 'bg-amber-50',
    hover: 'hover:bg-amber-600'
  } : {
    primary: 'bg-emerald-600', 
    text: 'text-emerald-600',
    light: 'bg-emerald-50',
    hover: 'hover:bg-emerald-700'
  };

  useEffect(() => {
    fetchData();

    // SUSCRIPCION REALTIME
    const channel = supabase
      .channel(`retail-realtime-${type}`)
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
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
    } catch (err) {
      console.error("Error sincronizando:", err);
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
    } else {
      alert("Producto no encontrado");
      setBarcodeInput('');
    }
    barcodeInputRef.current?.focus();
  };

  const handleAddToCart = (p: Product) => {
    if (p.stock <= 0) { alert("Sin stock disponible"); return; }
    setCart(prev => {
      const exists = prev.find(item => item.product.id === p.id);
      if (exists) {
        if (exists.qty >= p.stock) { alert("Máximo stock alcanzado"); return prev; }
        return prev.map(item => item.product.id === p.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { product: p, qty: 1 }];
    });
  };

  const subtotalCart = useMemo(() => cart.reduce((a, c) => a + (c.qty * c.product.price), 0), [cart]);
  
  const finalTotal = useMemo(() => {
    const disc = parseFloat(discountPct) || 0;
    const inc = parseFloat(increasePct) || 0;
    let total = subtotalCart;
    if (disc > 0) total -= (subtotalCart * (disc / 100));
    if (inc > 0) total += (subtotalCart * (inc / 100));
    return total;
  }, [subtotalCart, discountPct, increasePct]);

  const generatePDF = (saleData: any, items: any[]) => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [80, 150] });
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    if (saleData.is_voided) {
      doc.setTextColor(255, 0, 0);
      doc.text("VENTA ANULADA", 40, 5, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }
    doc.text("AMAZONIA VETERINARIA", 40, 12, { align: 'center' });
    doc.setFontSize(7);
    doc.text(saleData.billing_type === 'FACTURA' ? "FACTURA TIPO B" : "TICKET NO FISCAL", 40, 16, { align: 'center' });
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha: ${new Date(saleData.created_at).toLocaleString('es-AR')}`, 5, 22);
    doc.line(5, 28, 75, 28);
    let y = 32;
    items.forEach(item => {
      doc.text(`${item.quantity}x ${item.name.substring(0, 20)}`, 5, y);
      doc.text(`$${item.subtotal.toFixed(2)}`, 75, y, { align: 'right' });
      y += 5;
    });
    doc.line(5, y, 75, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", 5, y);
    doc.text(`$${saleData.total.toFixed(2)}`, 75, y, { align: 'right' });
    doc.save(`Ticket_${saleData.id.slice(0,8)}.pdf`);
  };

  const handleCheckout = async () => {
    try {
      setLoading(true);
      const { data: sale, error: saleError } = await supabase.from('sales').insert({
        total: finalTotal,
        payment_method: paymentMethod,
        billing_type: 'COMPROBANTE',
        system_type: type,
        is_voided: false
      }).select().single();
      
      if (saleError) throw saleError;

      const items = cart.map(c => ({
        sale_id: sale.id,
        product_id: c.product.id,
        name: c.product.name,
        quantity: c.qty,
        subtotal: c.product.price * c.qty
      }));

      await supabase.from('sale_items').insert(items);
      
      for (const item of cart) {
        await supabase.from('products').update({ stock: item.product.stock - item.qty }).eq('id', item.product.id);
      }
      
      generatePDF(sale, items);
      setCart([]);
      setDiscountPct('');
      setIncreasePct('');
      setShowCheckoutModal(false);
      alert("Venta completada");
    } catch (err: any) {
      alert("Error en venta: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode.includes(searchTerm);
      const matchesCategory = categoryFilter === 'TODAS' || p.product_category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, categoryFilter]);

  const stats = useMemo(() => {
    const validSales = salesHistory.filter(s => !s.is_voided);
    const totalRevenue = validSales.reduce((a, b) => a + Number(b.total), 0);
    const totalExpenses = payments.reduce((a, b) => a + Number(b.amount), 0);
    
    let totalCogs = 0;
    const prodCosts = new Map<string, number>(products.map(p => [p.id, Number(p.cost)]));
    validSales.forEach(s => {
      s.sale_items?.forEach((item: SaleItem) => {
        const cost = prodCosts.get(item.product_id) || 0;
        totalCogs += cost * item.quantity;
      });
    });

    return { totalRevenue, totalCogs, totalExpenses, netProfit: totalRevenue - totalCogs - totalExpenses };
  }, [salesHistory, payments, products]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <nav className={`${colors.primary} text-white px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50`}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition-colors"><ArrowLeft size={24} /></button>
          <h1 className="text-2xl font-black italic uppercase">Amazonia {type}</h1>
        </div>
        <div className="flex bg-white/20 rounded-[1.5rem] p-1 overflow-x-auto no-scrollbar max-w-2xl">
          {['INVENTARIO', 'VENDER', 'HISTORIAL DE VENTAS', 'PROVEEDORES', 'PAGOS', 'CUENTAS'].map(id => (
            <button key={id} onClick={() => setActiveTab(id as TabType)} className={`px-4 py-2 rounded-xl font-black text-[9px] tracking-widest uppercase transition-all whitespace-nowrap ${activeTab === id ? 'bg-white text-slate-900 shadow-sm' : 'hover:bg-white/10'}`}>{id}</button>
          ))}
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'INVENTARIO' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
              <div className="flex flex-1 gap-4 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input type="text" placeholder="Buscar producto..." className="w-full pl-12 pr-4 py-4 rounded-3xl border shadow-sm outline-none" onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <select className="px-6 py-4 rounded-3xl border bg-white font-bold text-xs uppercase outline-none" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="TODAS">TODAS LAS CATEGORÍAS</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowCategoryModal(true)} className="bg-slate-100 text-slate-600 px-6 py-4 rounded-3xl font-black flex items-center gap-2 shadow-sm uppercase text-[10px] hover:bg-slate-200 transition-all"><List size={16}/> CATEGORÍAS</button>
                <button onClick={() => { setEditingProduct(null); setShowProductModal(true); }} className={`${colors.primary} text-white px-10 py-4 rounded-3xl font-black flex items-center gap-2 shadow-xl uppercase text-[10px]`}>+ NUEVO PRODUCTO</button>
              </div>
            </div>
            <div className="bg-white rounded-[3rem] shadow-sm border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                  <tr><th className="px-8 py-6">Producto</th><th className="px-8 py-6">Categoría</th><th className="px-8 py-6">Stock</th><th className="px-8 py-6">Precio</th><th className="px-8 py-6 text-right">Acciones</th></tr>
                </thead>
                <tbody className="divide-y">
                  {filteredInventory.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 group transition-colors">
                      <td className="px-8 py-5"><p className="font-black text-slate-800 uppercase text-xs">{p.name}</p><span className="text-[9px] text-slate-400 font-mono">{p.barcode || 'S/B'}</span></td>
                      <td className="px-8 py-5"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${colors.light} ${colors.text}`}>{p.product_category || 'Gral'}</span></td>
                      <td className={`px-8 py-5 font-black text-lg ${p.stock <= (p.min_stock || 5) ? 'text-red-500' : 'text-slate-900'}`}>{p.stock}</td>
                      <td className="px-8 py-5 font-black text-slate-900">${Number(p.price).toFixed(2)}</td>
                      <td className="px-8 py-5 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingProduct(p); setFormCost(p.cost?.toString() || '0'); setFormMargin(p.margin?.toString() || '30'); setShowProductModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl"><Edit3 size={18}/></button>
                        <button onClick={async () => { if(confirm("¿Eliminar?")) { await supabase.from('products').delete().eq('id', p.id); fetchData(); } }} className="p-2 text-red-300 hover:text-red-500 rounded-xl"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'VENDER' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in h-full">
             <div className="space-y-4">
                <form onSubmit={handleBarcodeSubmit} className="relative">
                  <Scan className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                  <input ref={barcodeInputRef} type="text" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} autoFocus className="w-full pl-16 p-6 bg-slate-900 text-white rounded-3xl outline-none text-xl font-black shadow-2xl" placeholder="Escanear o buscar..." />
                </form>
                <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                   {products.filter(p => p.stock > 0 && p.name.toLowerCase().includes(barcodeInput.toLowerCase())).map(p => (
                     <button key={p.id} onClick={() => handleAddToCart(p)} className="p-4 border-2 rounded-2xl text-left bg-white hover:border-blue-500 transition-all active:scale-95 shadow-sm group">
                       <p className="font-black text-slate-800 text-[10px] uppercase truncate mb-1">{p.name}</p>
                       <div className="flex justify-between items-end">
                         <span className="font-black text-xl text-slate-900">${Number(p.price).toFixed(2)}</span>
                         <span className={`text-[9px] font-black ${p.stock < (p.min_stock || 5) ? 'text-red-500' : 'text-slate-400'}`}>STK: {p.stock}</span>
                       </div>
                     </button>
                   ))}
                </div>
             </div>
             <div className="bg-white p-8 rounded-[3rem] shadow-2xl border flex flex-col h-fit sticky top-28">
                <div className="flex items-center gap-3 mb-6 font-black uppercase text-xl italic"><ShoppingCart size={24}/> Carrito Actual</div>
                <div className="space-y-3 mb-8 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                   {cart.length === 0 ? <div className="py-20 text-center text-slate-200 font-black italic uppercase">Caja vacía</div> : cart.map(item => (
                     <div key={item.product.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center border">
                        <div className="flex-1 font-black uppercase text-xs">{item.product.name}</div>
                        <div className="flex items-center gap-4">
                           <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-xl border">
                             <button onClick={() => setCart(c => c.map(i => i.product.id === item.product.id && i.qty > 1 ? {...i, qty: i.qty - 1} : i))}><Minus size={14}/></button>
                             <span className="font-black text-xs w-6 text-center">{item.qty}</span>
                             <button onClick={() => handleAddToCart(item.product)}><Plus size={14}/></button>
                           </div>
                           <p className="font-black text-slate-900 text-sm w-20 text-right">${(item.qty * item.product.price).toFixed(2)}</p>
                           <button onClick={() => setCart(c => c.filter(i => i.product.id !== item.product.id))} className="text-red-300 hover:text-red-500"><X size={16}/></button>
                        </div>
                     </div>
                   ))}
                </div>
                <div className="border-t pt-6">
                   <div className="flex justify-between items-end mb-6">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto Total</p>
                      <div className="text-5xl font-black text-slate-900 tracking-tighter">${subtotalCart.toFixed(2)}</div>
                   </div>
                   <button onClick={() => setShowCheckoutModal(true)} disabled={cart.length === 0} className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl disabled:opacity-20 active:scale-95 transition-all">COBRAR AHORA</button>
                </div>
             </div>
          </div>
        )}

        {/* HISTORIAL */}
        {activeTab === 'HISTORIAL DE VENTAS' && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-3xl font-black uppercase italic text-slate-800">Historial de Ventas</h2>
            <div className="bg-white rounded-[3rem] shadow-sm border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                  <tr><th className="px-8 py-6">Fecha</th><th className="px-8 py-6">Detalle</th><th className="px-8 py-6">Total</th><th className="px-8 py-6">Pago</th><th className="px-8 py-6 text-right">Acción</th></tr>
                </thead>
                <tbody className="divide-y">
                  {salesHistory.map(sale => (
                    <tr key={sale.id} className={`${sale.is_voided ? 'opacity-40 grayscale' : ''} hover:bg-slate-50/50 group`}>
                      <td className="px-8 py-5"><p className="font-black text-slate-800 text-xs">{new Date(sale.created_at).toLocaleDateString()}</p></td>
                      <td className="px-8 py-5"><div className="flex flex-wrap gap-1 text-[9px] uppercase font-bold text-slate-400">{sale.sale_items?.map(i => `${i.name} x${i.quantity}`).join(', ')}</div></td>
                      <td className="px-8 py-5 font-black text-lg text-slate-900">${Number(sale.total).toFixed(2)}</td>
                      <td className="px-8 py-5"><span className="text-[9px] font-black uppercase bg-slate-100 px-3 py-1 rounded-full">{sale.payment_method}</span></td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2">
                           <button onClick={() => generatePDF(sale, sale.sale_items || [])} className="p-2 text-blue-400 hover:text-blue-600"><Printer size={18}/></button>
                           {sale.is_voided ? <span className="text-red-500 font-black text-[9px]">ANULADA</span> : <button onClick={async () => { if(confirm("¿Anular venta?")) { await supabase.from('sales').update({ is_voided: true }).eq('id', sale.id); fetchData(); } }} className="text-red-300 hover:text-red-500"><Ban size={18}/></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'PAGOS' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black uppercase italic text-slate-800">Registro de Pagos</h2>
              <button onClick={() => setShowPaymentModal(true)} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] shadow-lg tracking-widest">+ NUEVO PAGO</button>
            </div>
            <div className="bg-white rounded-[3rem] shadow-sm border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                  <tr><th className="px-8 py-6">Fecha</th><th className="px-8 py-6">Descripción</th><th className="px-8 py-6">Monto</th><th className="px-8 py-6 text-right">Acción</th></tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map(pay => (
                    <tr key={pay.id} className="hover:bg-slate-50/50 group">
                      <td className="px-8 py-5 font-black text-slate-400 text-xs">{new Date(pay.date).toLocaleDateString()}</td>
                      <td className="px-8 py-5 font-bold uppercase text-xs">{pay.description}</td>
                      <td className="px-8 py-5 font-black text-lg text-red-500">-${Number(pay.amount).toFixed(2)}</td>
                      <td className="px-8 py-5 text-right"><button onClick={async () => { if(confirm("¿Borrar?")) { await supabase.from('payments').delete().eq('id', pay.id); fetchData(); } }} className="text-red-200 hover:text-red-500"><Trash2 size={18}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'CUENTAS' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-8 rounded-[3rem] shadow-sm border flex flex-col items-center">
                <DollarSign className="text-emerald-500 mb-4" size={32}/>
                <p className="text-[10px] font-black text-slate-400 uppercase">Ingresos Totales</p>
                <p className="text-3xl font-black">${stats.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-white p-8 rounded-[3rem] shadow-sm border flex flex-col items-center">
                <Package className="text-amber-500 mb-4" size={32}/>
                <p className="text-[10px] font-black text-slate-400 uppercase">Reposición</p>
                <p className="text-3xl font-black">${stats.totalCogs.toLocaleString()}</p>
              </div>
              <div className="bg-white p-8 rounded-[3rem] shadow-sm border flex flex-col items-center">
                <History className="text-red-500 mb-4" size={32}/>
                <p className="text-[10px] font-black text-slate-400 uppercase">Egresos Registrados</p>
                <p className="text-3xl font-black">${stats.totalExpenses.toLocaleString()}</p>
              </div>
              <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl flex flex-col items-center text-white">
                <TrendingUp className="text-emerald-400 mb-4" size={32}/>
                <p className="text-[10px] font-black uppercase opacity-50">Utilidad Neta</p>
                <p className="text-3xl font-black">${stats.netProfit.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL COBRO */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 relative overflow-hidden">
            <button onClick={() => setShowCheckoutModal(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900"><X size={24}/></button>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-8 text-center">Finalizar Cobro</h2>
            <div className="space-y-8">
               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 text-center">Método de Pago</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'EFECTIVO', icon: <Banknote size={20}/>, label: 'Efectivo' },
                      { id: 'QR', icon: <QrCode size={20}/>, label: 'QR' },
                      { id: 'DEBITO', icon: <CreditCard size={20}/>, label: 'Débito' },
                      { id: 'CREDITO', icon: <CreditCard size={20}/>, label: 'Crédito' },
                      { id: 'TRANSFERENCIA', icon: <Landmark size={20}/>, label: 'Transf.' },
                    ].map((m) => (
                      <button 
                        key={m.id} 
                        onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${paymentMethod === m.id ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-105' : 'bg-white border-slate-100 text-slate-400'}`}
                      >
                        {m.icon}
                        <span className="text-[8px] font-black uppercase truncate w-full text-center">{m.label}</span>
                      </button>
                    ))}
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-[2rem]">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-emerald-600 flex items-center gap-1"><ArrowDownLeft size={12}/> Descuento %</label>
                    <input type="number" value={discountPct} onChange={e => setDiscountPct(e.target.value)} placeholder="0" className="w-full p-4 bg-white border rounded-2xl font-black text-center outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-amber-600 flex items-center gap-1"><ArrowUpRight size={12}/> Recargo %</label>
                    <input type="number" value={increasePct} onChange={e => setIncreasePct(e.target.value)} placeholder="0" className="w-full p-4 bg-white border rounded-2xl font-black text-center outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
               </div>
               <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Final</p>
                  <div className="text-6xl font-black tracking-tighter text-slate-900">${finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
               </div>
               <button onClick={handleCheckout} className="w-full bg-emerald-500 text-white py-6 rounded-[1.8rem] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-lg flex items-center justify-center gap-3"><ArrowDownCircle size={24}/> CONFIRMAR VENTA</button>
            </div>
          </div>
        </div>
      )}

      {/* OTROS MODALES SIMILARES AQUÍ... */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in-95 my-10 relative">
            <button onClick={() => setShowProductModal(false)} className="absolute top-8 right-8 text-slate-300"><X/></button>
            <h2 className="text-2xl font-black uppercase tracking-tight italic mb-6">{editingProduct ? 'Editar' : 'Nuevo'} Producto</h2>
            <form onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const data = {
                    name: (f.get('name') as string).toUpperCase(),
                    barcode: f.get('barcode') as string,
                    stock: Number(f.get('stock')),
                    min_stock: Number(f.get('min_stock')),
                    cost: parseFloat(formCost.replace(',', '.')) || 0,
                    margin: parseFloat(formMargin.replace(',', '.')) || 30,
                    price: formPrice,
                    category: type,
                    product_category: f.get('product_category') as string
                };
                if (editingProduct) await supabase.from('products').update(data).eq('id', editingProduct.id);
                else await supabase.from('products').insert(data);
                setShowProductModal(false); fetchData();
            }} className="grid grid-cols-2 gap-4">
                <input name="name" defaultValue={editingProduct?.name} required placeholder="Nombre" className="col-span-2 p-4 bg-slate-50 border rounded-2xl font-bold uppercase" />
                <div className="col-span-2">
                  <select name="product_category" defaultValue={editingProduct?.product_category} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold uppercase text-xs">
                    <option value="">SIN CATEGORÍA</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <input name="barcode" defaultValue={editingProduct?.barcode} placeholder="Código" className="col-span-2 p-4 bg-slate-50 border rounded-2xl font-mono" />
                <input name="stock" type="number" defaultValue={editingProduct?.stock || 0} placeholder="Stock" className="p-4 bg-slate-50 border rounded-2xl font-black" />
                <input name="min_stock" type="number" defaultValue={editingProduct?.min_stock || 5} placeholder="Alerta Mínimo" className="p-4 bg-slate-50 border rounded-2xl font-black" />
                <div className="flex flex-col"><label className="text-[9px] font-black ml-2 uppercase opacity-40">Costo</label><input value={formCost} onChange={e => setFormCost(e.target.value)} className="p-4 bg-slate-50 border rounded-2xl font-black" /></div>
                <div className="flex flex-col"><label className="text-[9px] font-black ml-2 uppercase opacity-40">Margen %</label><input value={formMargin} onChange={e => setFormMargin(e.target.value)} className="p-4 bg-slate-50 border rounded-2xl font-black text-blue-600" /></div>
                <div className="col-span-2 text-center py-6 bg-slate-900 text-white rounded-[2rem] mt-2"><p className="text-[10px] font-black uppercase opacity-50 tracking-widest mb-1">Precio Final</p><p className="text-4xl font-black">${formPrice.toLocaleString()}</p></div>
                <button type="submit" className="col-span-2 bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-widest mt-4">GUARDAR PRODUCTO</button>
            </form>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-[150] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in-95 relative">
            <button onClick={() => setShowPaymentModal(false)} className="absolute top-8 right-8 text-slate-300"><X size={24}/></button>
            <h2 className="text-2xl font-black uppercase italic mb-8">Registrar Egreso</h2>
            <form onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                await supabase.from('payments').insert({
                    description: (f.get('description') as string).toUpperCase(),
                    amount: Number(f.get('amount')),
                    type: 'OTROS',
                    date: new Date().toISOString().split('T')[0],
                    time: new Date().toLocaleTimeString('es-AR', { hour12: false }),
                    system_type: type,
                    payment_method: 'EFECTIVO'
                });
                setShowPaymentModal(false); fetchData();
            }} className="space-y-6">
                <input name="description" required placeholder="Descripción del gasto" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold uppercase" />
                <input name="amount" type="number" required placeholder="Monto $" className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-red-600" />
                <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl">REGISTRAR PAGO</button>
            </form>
          </div>
        </div>
      )}

      {loading && (<div className="fixed bottom-10 right-10 bg-white p-5 rounded-3xl shadow-2xl flex items-center gap-4 border z-[1000] animate-pulse"><Loader2 className="animate-spin text-blue-500" size={20} /><span className="font-black text-[10px] uppercase text-slate-500">Sincronizando...</span></div>)}
    </div>
  );
};

export default RetailSystem;
