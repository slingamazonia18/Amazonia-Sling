
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowLeft, Package, ShoppingCart, Users, TrendingUp, Search, Plus, 
  Trash2, Printer, FileText, PhoneCall, Save, Barcode, ShoppingBag, Leaf, Loader2, X, CreditCard, QrCode, Banknote, RefreshCcw, Filter, AlertTriangle, Percent, Minus, PlusCircle, Calendar, Receipt, Briefcase, Landmark,
  Clock, Scan, Ban, ShieldCheck, History, Calculator
} from 'lucide-react';
import { Product, Supplier, Sale, Payment } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';

interface RetailSystemProps {
  type: 'PETSHOP' | 'MATEANDO';
  onBack: () => void;
}

type TabType = 'INVENTARIO' | 'VENDER' | 'HISTORIAL DE VENTAS' | 'PROVEEDORES' | 'PAGOS' | 'CUENTAS';

const RetailSystem: React.FC<RetailSystemProps> = ({ type, onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('INVENTARIO');
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cart, setCart] = useState<{ product: any; qty: number }[]>([]);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros de Historial
  const [historyFilter, setHistoryFilter] = useState<'HOY' | 'SEMANA' | 'MES' | 'AÑO' | 'CALENDARIO'>('HOY');
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modales y estados de formulario
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  
  // Estado Anulación
  const [voidingSale, setVoidingSale] = useState<any>(null);
  const [voidCode, setVoidCode] = useState('');
  const [showVoidModal, setShowVoidModal] = useState(false);

  // Barcode Refs
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const modalBarcodeRef = useRef<HTMLInputElement>(null);
  const modalNameRef = useRef<HTMLInputElement>(null);
  const [barcodeInput, setBarcodeInput] = useState('');

  // Precios
  const [formCost, setFormCost] = useState<string>('0');
  const [formMargin, setFormMargin] = useState<string>('30');
  const [formPrice, setFormPrice] = useState<number>(0);

  // Checkout Settings
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('EFECTIVO');
  const [selectedBillingType, setSelectedBillingType] = useState<'FACTURA' | 'COMPROBANTE'>('COMPROBANTE');
  const [adjustmentType, setAdjustmentType] = useState<'DESCUENTO' | 'RECARGO'>('DESCUENTO');
  const [adjustmentPercent, setAdjustmentPercent] = useState<string>('0'); 

  const colors = type === 'PETSHOP' ? {
    primary: 'bg-amber-500', hover: 'hover:bg-amber-600', text: 'text-amber-600',
    border: 'border-amber-200', light: 'bg-amber-50'
  } : {
    primary: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-emerald-600',
    border: 'border-emerald-200', light: 'bg-emerald-50'
  };

  useEffect(() => {
    fetchData();
  }, [type]);

  useEffect(() => {
    const costNum = parseFloat(formCost.replace(',', '.')) || 0;
    const marginNum = parseFloat(formMargin.replace(',', '.')) || 0;
    const calculated = costNum * (1 + marginNum / 100);
    setFormPrice(Number(calculated.toFixed(2)));
  }, [formCost, formMargin]);

  useEffect(() => {
    if (activeTab === 'VENDER' && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [activeTab]);

  useEffect(() => {
    if (showProductModal && modalBarcodeRef.current) {
      setTimeout(() => modalBarcodeRef.current?.focus(), 100);
    }
  }, [showProductModal]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: prods } = await supabase.from('products').select('*').eq('category', type).order('name', { ascending: true });
      const { data: sups } = await supabase.from('suppliers').select('*').eq('category', type).order('name', { ascending: true });
      const { data: payms } = await supabase.from('payments').select('*').eq('system_type', type).order('date', { ascending: false });
      const { data: sales } = await supabase.from('sales').select('*, sale_items(*)').eq('system_type', type).order('created_at', { ascending: false });

      if (prods) setProducts(prods);
      if (sups) setSuppliers(sups);
      if (payms) setPayments(payms);
      if (sales) setSalesHistory(sales);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput) return;
    const product = products.find(p => p.barcode === barcodeInput);
    if (product) {
      handleAddToCart(product);
      setBarcodeInput('');
    } else {
      alert("Producto no encontrado.");
      setBarcodeInput('');
    }
    barcodeInputRef.current?.focus();
  };

  const handleModalBarcodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); modalNameRef.current?.focus(); }
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const stockValue = Number((e.currentTarget.elements.namedItem('stock') as HTMLInputElement).value);
    if (stockValue < 0) { alert("Stock no válido."); return; }
    const productData = {
      name: (e.currentTarget.elements.namedItem('name') as HTMLInputElement).value,
      barcode: (e.currentTarget.elements.namedItem('barcode') as HTMLInputElement).value,
      stock: stockValue,
      min_stock: Number((e.currentTarget.elements.namedItem('min_stock') as HTMLInputElement).value),
      cost: parseFloat(formCost.replace(',', '.')) || 0,
      margin: parseFloat(formMargin.replace(',', '.')) || 0,
      price: formPrice,
      category: type
    };
    try {
      let error;
      if (editingProduct) { ({ error } = await supabase.from('products').update(productData).eq('id', editingProduct.id)); }
      else { ({ error } = await supabase.from('products').insert(productData)); }
      if (error) throw error;
      setShowProductModal(false); setEditingProduct(null); fetchData();
    } catch (err: any) { alert(err.message); }
  };

  /**
   * Deletes a product after user confirmation.
   */
  const deleteProduct = async (id: string) => {
    if (confirm("¿Está seguro de eliminar este producto?")) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        fetchData();
      } catch (err: any) { alert(err.message); }
    }
  };

  const generatePDF = (saleData: any, items: any[]) => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [80, 150] });
    const isVoided = saleData.is_voided;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    if (isVoided) {
      doc.setTextColor(255, 0, 0);
      doc.text("VENTA ANULADA", 40, 5, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }
    doc.text("AMAZONIA VETERINARIA", 40, 12, { align: 'center' });
    doc.setFontSize(7);
    doc.text(saleData.billing_type === 'FACTURA' ? "FACTURA TIPO B" : "TICKET NO FISCAL", 40, 16, { align: 'center' });
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha: ${new Date(saleData.created_at).toLocaleString('es-AR')}`, 5, 22);
    doc.text(`ID: ${saleData.id.slice(0, 8)}`, 5, 25);
    doc.line(5, 28, 75, 28);
    let y = 32;
    doc.text("DESCRIPCIÓN", 5, y);
    doc.text("CANT", 50, y);
    doc.text("TOTAL", 75, y, { align: 'right' });
    y += 5;
    items.forEach(item => {
      doc.text(item.name.substring(0, 25), 5, y);
      doc.text(item.quantity.toString(), 52, y);
      doc.text(`$${item.subtotal.toFixed(2)}`, 75, y, { align: 'right' });
      y += 4;
    });
    doc.line(5, y, 75, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", 5, y);
    doc.text(`$${saleData.total.toFixed(2)}`, 75, y, { align: 'right' });
    doc.save(`Ticket_Amazonia_${saleData.id.slice(0,8)}.pdf`);
  };

  const handleCheckout = async () => {
    const subtotal = cart.reduce((acc, curr) => acc + (Number(curr.product.price) * curr.qty), 0);
    const adjNum = parseFloat(adjustmentPercent.replace(',', '.')) || 0;
    const finalAdj = adjustmentType === 'DESCUENTO' ? -Math.abs(adjNum) : Math.abs(adjNum);
    const total = subtotal * (1 + finalAdj / 100);
    setLoading(true);
    try {
      const { data: sale, error: saleError } = await supabase.from('sales').insert({
        total, payment_method: selectedPaymentMethod, billing_type: selectedBillingType, system_type: type, is_voided: false
      }).select().single();
      if (saleError) throw saleError;
      const items = cart.map(c => ({
        sale_id: sale.id, product_id: c.product.id, name: c.product.name, quantity: c.qty,
        subtotal: (Number(c.product.price) * c.qty) * (1 + finalAdj / 100)
      }));
      await supabase.from('sale_items').insert(items);
      for (const item of cart) { await supabase.from('products').update({ stock: item.product.stock - item.qty }).eq('id', item.product.id); }
      generatePDF(sale, items); setCart([]); setAdjustmentPercent('0'); setShowCheckoutModal(false); fetchData();
    } catch (error: any) { alert(error.message); }
    finally { setLoading(false); }
  };

  const handleVoidSale = async (reintegrateStock: boolean) => {
    if (voidCode !== '1960') { alert("Código de seguridad incorrecto."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from('sales').update({ is_voided: true }).eq('id', voidingSale.id);
      if (error) throw error;
      if (reintegrateStock) {
        for (const item of voidingSale.sale_items) {
          const { data: prod } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
          if (prod) await supabase.from('products').update({ stock: prod.stock + item.quantity }).eq('id', item.product_id);
        }
      }
      setShowVoidModal(false); setVoidingSale(null); setVoidCode(''); fetchData();
    } catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };

  /**
   * Saves or updates a supplier.
   */
  const handleSaveSupplier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const supplierData = {
      name: formData.get('sup_name') as string,
      whatsapp: formData.get('sup_whatsapp') as string,
      category: type
    };
    try {
      const { error } = await supabase.from('suppliers').insert(supplierData);
      if (error) throw error;
      setShowSupplierModal(false);
      fetchData();
    } catch (err: any) { alert(err.message); }
  };

  /**
   * Registers a new payment (egress).
   */
  const handleSavePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    const paymentData = {
      description: formData.get('description') as string,
      amount: parseFloat((formData.get('amount') as string).replace(',', '.')) || 0,
      type: formData.get('type') as any,
      date: formData.get('date') as string,
      time: formData.get('time') as string,
      payment_method: formData.get('payment_method') as string,
      system_type: type
    };
    try {
      const { error } = await supabase.from('payments').insert(paymentData);
      if (error) throw error;
      setShowPaymentModal(false);
      fetchData();
    } catch (err: any) { alert(err.message); }
  };

  const handleAddToCart = (p: any) => {
    setCart(prev => {
      const exists = prev.find(item => item.product.id === p.id);
      if ((exists ? exists.qty : 0) >= p.stock) { alert("Sin stock"); return prev; }
      if (exists) return prev.map(item => item.product.id === p.id ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { product: p, qty: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.product.id === productId); if (!item) return prev;
      const newQty = item.qty + delta;
      if (newQty <= 0) return prev.filter(i => i.product.id !== productId);
      if (newQty > item.product.stock) return prev;
      return prev.map(i => i.product.id === productId ? { ...i, qty: newQty } : i);
    });
  };

  const handleNumericInput = (value: string, setter: (val: string) => void) => {
    setter(value.replace(/[^0-9,.]/g, ''));
  };

  const filteredHistory = useMemo(() => {
    const now = new Date();
    return salesHistory.filter(sale => {
      const saleDate = new Date(sale.created_at);
      const isSameDay = (d1: Date, d2: Date) => d1.toDateString() === d2.toDateString();
      
      switch(historyFilter) {
        case 'HOY': return isSameDay(saleDate, now);
        case 'SEMANA': {
          const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7);
          return saleDate >= weekAgo;
        }
        case 'MES': return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
        case 'AÑO': return saleDate.getFullYear() === now.getFullYear();
        case 'CALENDARIO': return isSameDay(saleDate, new Date(selectedHistoryDate + 'T12:00:00'));
        default: return true;
      }
    });
  }, [salesHistory, historyFilter, selectedHistoryDate]);

  const subtotalCart = cart.reduce((a, c) => a + (Number(c.product.price) * c.qty), 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      {/* Modal Anulación */}
      {showVoidModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 uppercase flex items-center gap-2"><Ban className="text-red-500" /> ANULAR VENTA</h2>
              <button onClick={() => setShowVoidModal(false)}><X /></button>
            </div>
            <p className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-widest text-center">Ingrese código de seguridad para confirmar la anulación de la venta.</p>
            <div className="space-y-6">
              <input 
                type="password" 
                value={voidCode} 
                onChange={(e) => setVoidCode(e.target.value)} 
                placeholder="CÓDIGO (1960)"
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-2xl font-black outline-none focus:border-red-500 transition-all"
              />
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => handleVoidSale(true)} 
                  className="w-full bg-red-500 text-white py-4 rounded-2xl font-black text-xs shadow-lg hover:bg-red-600 transition-all uppercase tracking-widest"
                >ANULAR Y REINTEGRAR STOCK</button>
                <button 
                  onClick={() => handleVoidSale(false)} 
                  className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black text-xs shadow-lg hover:bg-black transition-all uppercase tracking-widest"
                >ANULAR SIN REINTEGRAR STOCK</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-black text-slate-800 uppercase">Cobro</h2>
              <button onClick={() => setShowCheckoutModal(false)}><X size={18} /></button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Medio de Pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {['EFECTIVO', 'TRANSFERENCIA', 'QR', 'TARJETA'].map(m => (
                    <button key={m} onClick={() => setSelectedPaymentMethod(m)} className={`py-2 px-3 rounded-xl border-2 text-[10px] font-black transition-all ${selectedPaymentMethod === m ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-50 text-slate-400 hover:border-slate-200'}`}>{m}</button>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border">
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setAdjustmentType('DESCUENTO')} className={`flex-1 py-2 rounded-lg font-black text-[9px] ${adjustmentType === 'DESCUENTO' ? 'bg-red-500 text-white' : 'bg-white text-slate-400 border'}`}>DESCUENTO</button>
                  <button onClick={() => setAdjustmentType('RECARGO')} className={`flex-1 py-2 rounded-lg font-black text-[9px] ${adjustmentType === 'RECARGO' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 border'}`}>RECARGO</button>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg font-black">{adjustmentType === 'DESCUENTO' ? '-' : '+'}</span>
                  <input type="text" value={adjustmentPercent} onChange={(e) => handleNumericInput(e.target.value, setAdjustmentPercent)} className="w-16 text-center text-3xl font-black bg-transparent outline-none" placeholder="0" />
                  <span className="text-lg font-black text-slate-300">%</span>
                </div>
              </div>
              <div className="pt-4 border-t flex flex-col gap-2">
                <div className="flex justify-between items-center text-3xl font-black text-slate-900"><span>TOTAL</span><span>${(subtotalCart * (1 + (adjustmentType === 'DESCUENTO' ? -Number(adjustmentPercent) : Number(adjustmentPercent))/100)).toFixed(2)}</span></div>
                <button onClick={handleCheckout} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all mt-2">CONFIRMAR COBRO</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className={`${colors.primary} text-white px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50`}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition-colors"><ArrowLeft size={24} /></button>
          <h1 className="text-2xl font-black flex items-center gap-3 tracking-tight">Amazonia {type}</h1>
        </div>
        <div className="flex bg-white/20 rounded-[1.5rem] p-1 overflow-x-auto max-w-3xl no-scrollbar">
          {['INVENTARIO', 'VENDER', 'HISTORIAL DE VENTAS', 'PROVEEDORES', 'PAGOS', 'CUENTAS'].map(id => (
            <button key={id} onClick={() => setActiveTab(id as TabType)} className={`px-4 py-2 rounded-xl font-black text-[9px] tracking-widest uppercase transition-all whitespace-nowrap ${activeTab === id ? 'bg-white text-slate-900 shadow-sm' : 'hover:bg-white/10'}`}>{id}</button>
          ))}
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'INVENTARIO' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input type="text" placeholder="Buscar..." className="w-full pl-12 pr-4 py-4 rounded-3xl border outline-none shadow-sm" onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <button onClick={() => { setEditingProduct(null); setShowProductModal(true); }} className={`${colors.primary} text-white px-10 py-4 rounded-3xl font-black flex items-center gap-2 shadow-xl active:scale-95 transition-all uppercase text-xs tracking-widest`}><Plus /> NUEVO PRODUCTO</button>
            </div>
            <div className="bg-white rounded-[3rem] shadow-sm border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                  <tr><th className="px-8 py-6">Producto</th><th className="px-8 py-6">Stock</th><th className="px-8 py-6">Venta</th><th className="px-8 py-6 text-right">Acciones</th></tr>
                </thead>
                <tbody className="divide-y">
                  {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 group">
                      <td className="px-8 py-5"><p className="font-black text-slate-800">{p.name}</p><p className="text-[10px] font-mono text-slate-300">{p.barcode || 'S/B'}</p></td>
                      <td className="px-8 py-5"><span className={`font-black text-lg ${p.stock <= p.min_stock ? 'text-red-500' : 'text-slate-900'}`}>{p.stock}</span></td>
                      <td className="px-8 py-5 font-black text-slate-900">${p.price}</td>
                      <td className="px-8 py-5 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingProduct(p); setFormCost(p.cost.toString()); setFormMargin(p.margin.toString()); setShowProductModal(true); }} className="p-3 text-blue-500 hover:bg-blue-50 rounded-2xl"><Save size={20} /></button>
                        <button onClick={() => deleteProduct(p.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-2xl"><Trash2 size={20} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'VENDER' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full animate-in fade-in duration-500">
            <div className="space-y-8 flex flex-col h-full">
              <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-xl text-white">
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2"><Scan size={20} className="text-blue-400" /><h3 className="text-sm font-black uppercase tracking-widest">Escáner Activo</h3></div>
                </div>
                <form onSubmit={handleBarcodeSubmit} className="relative">
                  <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={24} />
                  <input 
                    ref={barcodeInputRef}
                    type="text" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Escanee código..." 
                    className="w-full pl-14 pr-4 py-5 rounded-2xl bg-white/10 border border-white/20 text-white text-xl font-bold placeholder:text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </form>
              </div>
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border flex flex-col flex-1">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Selección Manual</h3>
                  <div className="relative w-48"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} /><input type="text" placeholder="Buscar..." className="w-full pl-9 pr-3 py-1.5 text-xs border rounded-xl outline-none" onChange={(e) => setSearchTerm(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-2">
                  {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                    <button key={p.id} onClick={() => p.stock > 0 && handleAddToCart(p)} className={`p-4 border-2 rounded-[1.5rem] transition-all text-left flex flex-col justify-between ${p.stock <= 0 ? 'opacity-50 grayscale' : 'border-slate-50 hover:border-blue-400 bg-slate-50/30 active:scale-95'}`}>
                      <p className="font-black text-slate-800 line-clamp-2 mb-2 text-sm">{p.name}</p>
                      <div className="flex justify-between items-end"><span className="text-xl font-black text-slate-900">${p.price}</span><span className="text-[9px] font-black text-slate-400 uppercase">Stock: {p.stock}</span></div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border flex flex-col sticky top-24 h-[calc(100vh-140px)]">
              <div className="flex items-center gap-2 mb-6"><div className="p-2.5 bg-slate-900 text-white rounded-xl"><ShoppingCart size={20} /></div><h3 className="text-xl font-black text-slate-800 tracking-tight">Carrito</h3></div>
              <div className="flex-1 space-y-4 overflow-y-auto pr-2 mb-6">
                {cart.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-20"><ShoppingBag size={40} className="mb-2" /><p className="font-bold">Vacío</p></div> : cart.map(item => (
                  <div key={item.product.id} className="p-4 bg-slate-50 rounded-[1.5rem] border flex justify-between items-center">
                    <div className="flex-1 min-w-0 pr-2"><p className="font-black text-xs text-slate-800 truncate">{item.product.name}</p><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">${item.product.price}</p></div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-white border rounded-lg p-0.5"><button onClick={() => updateCartQty(item.product.id, -1)} className="p-1 hover:bg-slate-50 rounded"><Minus size={10} /></button><span className="w-6 text-center font-black text-xs">{item.qty}</span><button onClick={() => updateCartQty(item.product.id, 1)} className="p-1 hover:bg-slate-50 rounded"><Plus size={10} /></button></div>
                      <p className="font-black text-slate-900 text-base min-w-[60px] text-right">${(item.qty * item.product.price).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-end mb-4"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">A cobrar</p><div className="text-3xl font-black text-slate-900 tracking-tighter">${subtotalCart.toFixed(2)}</div></div>
                <button onClick={() => setShowCheckoutModal(true)} disabled={cart.length === 0} className="w-full bg-slate-900 text-white py-4 rounded-[1.5rem] font-black shadow-xl disabled:opacity-30 flex items-center justify-center gap-2">PAGAR</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'HISTORIAL DE VENTAS' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-6 rounded-[3rem] border shadow-sm flex flex-col md:flex-row gap-6 justify-between items-center">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'HOY', icon: <Clock size={14}/> },
                  { id: 'SEMANA', icon: <Calendar size={14}/> },
                  { id: 'MES', icon: <TrendingUp size={14}/> },
                  { id: 'AÑO', icon: <History size={14}/> }
                ].map(f => (
                  <button 
                    key={f.id} 
                    onClick={() => setHistoryFilter(f.id as any)}
                    className={`px-6 py-2 rounded-xl font-black text-[10px] tracking-widest flex items-center gap-2 transition-all ${historyFilter === f.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                  >
                    {f.icon} {f.id}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 bg-slate-100 p-2 rounded-[1.5rem]">
                <button 
                  onClick={() => setHistoryFilter('CALENDARIO')} 
                  className={`px-4 py-2 rounded-xl font-black text-[10px] flex items-center gap-2 ${historyFilter === 'CALENDARIO' ? 'bg-white text-slate-900' : 'text-slate-400'}`}
                ><Filter size={14}/> FECHA:</button>
                <input 
                  type="date" 
                  value={selectedHistoryDate} 
                  onChange={(e) => { setSelectedHistoryDate(e.target.value); setHistoryFilter('CALENDARIO'); }}
                  className="bg-transparent border-none outline-none text-xs font-black text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredHistory.length === 0 ? (
                <div className="bg-white py-20 rounded-[3rem] border border-dashed flex flex-col items-center text-slate-300">
                  <History size={60} className="mb-4 opacity-10" />
                  <p className="font-bold">No se encontraron ventas para este período</p>
                </div>
              ) : filteredHistory.map(sale => (
                <div key={sale.id} className={`bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col md:flex-row items-center gap-6 group transition-all ${sale.is_voided ? 'opacity-50 grayscale' : 'hover:shadow-xl'}`}>
                  <div className="flex flex-col items-center min-w-[100px] border-r pr-6">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{new Date(sale.created_at).toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'})}</span>
                    <span className="text-xl font-black text-slate-800">${sale.total.toFixed(2)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">{sale.payment_method}</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${sale.is_voided ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                        {sale.is_voided ? 'ANULADA' : 'ACTIVA'}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 truncate italic">
                      {sale.sale_items?.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => generatePDF(sale, sale.sale_items || [])} className="p-3 bg-slate-50 text-slate-400 hover:text-blue-500 rounded-2xl border transition-all"><Printer size={20} /></button>
                    {!sale.is_voided && (
                      <button onClick={() => { setVoidingSale(sale); setShowVoidModal(true); }} className="p-3 bg-red-50 text-red-300 hover:text-red-500 rounded-2xl border border-red-100 transition-all"><Ban size={20} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'PAGOS' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">Egresos</h2>
              <button onClick={() => setShowPaymentModal(true)} className={`${colors.primary} text-white px-8 py-4 rounded-3xl font-black flex items-center gap-2 shadow-xl active:scale-95 uppercase text-xs tracking-widest`}><Plus size={20} /> NUEVO PAGO</button>
            </div>
            <div className="bg-white rounded-[3rem] shadow-sm border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  <tr><th className="px-8 py-5">Concepto</th><th className="px-8 py-5">Fecha</th><th className="px-8 py-5 text-right">Monto</th><th className="px-8 py-5 text-right">Acción</th></tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 group">
                      <td className="px-8 py-5"><p className="font-black text-slate-800">{p.description}</p><p className="text-[10px] font-bold text-slate-300 uppercase">{p.type}</p></td>
                      <td className="px-8 py-5 text-xs text-slate-500">{p.date}</td>
                      <td className="px-8 py-5 text-right font-black text-red-500">-${Number(p.amount).toFixed(2)}</td>
                      <td className="px-8 py-5 text-right opacity-0 group-hover:opacity-100"><button onClick={() => supabase.from('payments').delete().eq('id', p.id).then(() => fetchData())} className="text-slate-300 hover:text-red-500"><Trash2 size={18}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'CUENTAS' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-10 rounded-[3rem] shadow-sm border">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Fondos Reposición (Activos)</p>
                <p className="text-5xl font-black tracking-tighter text-blue-600">
                  ${salesHistory.filter(s => !s.is_voided).reduce((total, sale) => total + (sale.sale_items?.reduce((acc: number, item: any) => acc + ((products.find(p => p.id === item.product_id)?.cost || 0) * item.quantity), 0) || 0), 0).toLocaleString()}
                </p>
                <p className="text-[9px] text-slate-400 font-bold mt-4 italic uppercase">Excluye ventas anuladas.</p>
              </div>
              <div className="bg-white p-10 rounded-[3rem] shadow-sm border">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Ingreso Bruto Neto</p>
                <p className="text-5xl font-black text-slate-900 tracking-tighter">
                  ${salesHistory.filter(s => !s.is_voided).reduce((a, s) => a + Number(s.total), 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-white p-10 rounded-[3rem] shadow-sm border">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Ganancia Líquida</p>
                <p className="text-5xl font-black text-emerald-600 tracking-tighter">
                  ${(
                    salesHistory.filter(s => !s.is_voided).reduce((a, s) => a + Number(s.total), 0) - 
                    salesHistory.filter(s => !s.is_voided).reduce((total, sale) => total + (sale.sale_items?.reduce((acc: number, item: any) => acc + ((products.find(p => p.id === item.product_id)?.cost || 0) * item.quantity), 0) || 0), 0) - 
                    payments.reduce((a,p) => a + Number(p.amount), 0)
                  ).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="bg-white p-12 rounded-[4rem] border">
              <h3 className="text-2xl font-black text-slate-800 mb-10 tracking-tight flex items-center gap-3"><BarChart size={24}/> Gráfico de Existencias</h3>
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={products.slice(0, 15)}><XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} /><YAxis axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8'}} /><Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '24px', border: 'none' }} /><Bar dataKey="stock" radius={[12, 12, 12, 12]} barSize={45}>{products.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.stock <= entry.min_stock ? '#ef4444' : (type === 'MATEANDO' ? '#10b981' : '#f59e0b')} />))}</Bar></BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Modal Producto */}
        {showProductModal && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black text-slate-800">{editingProduct ? 'Editar' : 'Nuevo'} Producto</h2><button onClick={() => setShowProductModal(false)}><X /></button></div>
              <form onSubmit={handleSaveProduct} className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Código (Escanee ahora)</label>
                  <input ref={modalBarcodeRef} name="barcode" defaultValue={editingProduct?.barcode} onKeyDown={handleModalBarcodeKeyDown} className="w-full pl-6 pr-4 py-4 bg-slate-50 border rounded-2xl outline-none font-mono text-lg" placeholder="Escanee producto..." />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nombre del Producto</label>
                  <input ref={modalNameRef} name="name" defaultValue={editingProduct?.name} required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold" />
                </div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Stock Actual</label><input name="stock" type="number" defaultValue={editingProduct?.stock || 0} required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-black" /></div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Alerta Stock</label><input name="min_stock" type="number" defaultValue={editingProduct?.min_stock || 5} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-black" /></div>
                <div className="col-span-2 grid grid-cols-3 gap-4 p-5 bg-slate-50 rounded-[2rem] border">
                  <div><label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Costo ($)</label><input type="text" value={formCost} onChange={(e) => handleNumericInput(e.target.value, setFormCost)} required className="w-full p-2.5 bg-white border rounded-xl font-bold" /></div>
                  <div><label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Margen (%)</label><input type="text" value={formMargin} onChange={(e) => handleNumericInput(e.target.value, setFormMargin)} required className="w-full p-2.5 bg-white border rounded-xl font-bold" /></div>
                  <div className="flex flex-col justify-center text-center"><label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">P. Venta</label><div className="text-2xl font-black text-slate-900">${formPrice}</div></div>
                </div>
                <button type="submit" className={`col-span-2 ${colors.primary} text-white py-5 rounded-[1.5rem] font-black mt-4 shadow-xl active:scale-95 transition-all text-xs tracking-widest uppercase`}>GUARDAR PRODUCTO</button>
              </form>
            </div>
          </div>
        )}

        {/* Modal Proveedores */}
        {showSupplierModal && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black">Nuevo Proveedor</h2><button onClick={() => setShowSupplierModal(false)}><X /></button></div>
              <form onSubmit={handleSaveSupplier} className="space-y-4">
                <input name="sup_name" placeholder="Nombre" defaultValue={editingSupplier?.name} required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" />
                <input name="sup_whatsapp" placeholder="WhatsApp (549...)" defaultValue={editingSupplier?.whatsapp} required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" />
                <button type="submit" className={`w-full ${colors.primary} text-white py-4 rounded-2xl font-black shadow-lg uppercase text-xs tracking-widest`}>GUARDAR</button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'PROVEEDORES' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center"><h2 className="text-3xl font-black text-slate-800 tracking-tight">Agenda</h2><button onClick={() => { setEditingSupplier(null); setShowSupplierModal(true); }} className={`${colors.primary} text-white px-10 py-4 rounded-3xl font-black shadow-xl uppercase text-xs tracking-widest`}><Plus /> AGREGAR</button></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {suppliers.map(s => (
                <div key={s.id} className="bg-white p-10 rounded-[3rem] shadow-sm border text-center group hover:shadow-2xl transition-all">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6"><Users className="text-slate-300" size={32} /></div>
                  <h3 className="text-2xl font-black text-slate-800 mb-1">{s.name}</h3>
                  <div className="flex w-full gap-3 mt-8">
                    <a href={`https://wa.me/${s.whatsapp}`} target="_blank" className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-black text-xs hover:bg-green-600 shadow-lg shadow-green-100 uppercase tracking-widest">PEDIR</a>
                    <button onClick={() => { if(confirm("¿Borrar?")) supabase.from('suppliers').delete().eq('id', s.id).then(() => fetchData()); }} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Pagos */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-5"><h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Nuevo Egreso</h2><button onClick={() => setShowPaymentModal(false)}><X size={18}/></button></div>
              <form onSubmit={(e) => { e.preventDefault(); handleSavePayment(e as any); }} className="space-y-3">
                <input name="description" placeholder="Descripción" required className="w-full p-3 bg-slate-50 border rounded-xl text-xs outline-none" />
                <div className="grid grid-cols-2 gap-3">
                  <input name="amount" placeholder="Monto ($)" required className="w-full p-3 bg-slate-50 border rounded-xl text-xs outline-none font-bold" />
                  <select name="type" className="w-full p-3 bg-slate-50 border rounded-xl text-[10px] outline-none font-bold">
                    <option value="PROVEEDOR">Proveedor</option>
                    <option value="SERVICIO">Servicio</option>
                    <option value="EMPLEADO">Empleado</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full p-3 bg-slate-50 border rounded-xl text-[10px] outline-none" />
                  <input name="time" type="time" defaultValue={new Date().toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit', hour12: false})} required className="w-full p-3 bg-slate-50 border rounded-xl text-[10px] outline-none" />
                </div>
                <select name="payment_method" className="w-full p-3 bg-slate-50 border rounded-xl text-[10px] outline-none font-bold">
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                </select>
                <button type="submit" className={`w-full ${colors.primary} text-white py-4 rounded-xl font-black text-xs shadow-lg uppercase tracking-widest`}>REGISTRAR GASTO</button>
              </form>
            </div>
          </div>
        )}
      </main>
      {loading && (<div className="fixed bottom-10 right-10 bg-white p-5 rounded-3xl shadow-2xl flex items-center gap-4 border z-[1000] animate-pulse"><Loader2 className="animate-spin text-blue-500" size={20} /><span className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Actualizando...</span></div>)}
    </div>
  );
};

export default RetailSystem;
