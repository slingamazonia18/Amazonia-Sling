
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowLeft, Calendar, Clock, User, Dog, Plus, ChevronLeft, ChevronRight, 
  Filter, Loader2, X, Trash2, ShoppingCart, Activity, Briefcase, Pill, Syringe, Box,
  Search, Barcode, Printer, Ban, Edit3, Settings, Layers, ArrowDownCircle, FileSpreadsheet,
  AlertTriangle, ShoppingBag, Minus
} from 'lucide-react';
import { Appointment, Product, ProductCategory, Supplier, Payment, Sale } from '../types';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';

interface ClinicSystemProps {
  onBack: () => void;
}

type TabType = 'TURNOS' | 'INVENTARIO' | 'VENDER' | 'HISTORIAL' | 'PROVEEDORES' | 'PAGOS' | 'CUENTAS';

const ClinicSystem: React.FC<ClinicSystemProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('TURNOS');
  const [loading, setLoading] = useState(true);
  
  // Estados de Datos
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  
  // Estados de UI/Modales
  const [showApptModal, setShowApptModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [voidingSale, setVoidingSale] = useState<any>(null);
  const [voidCode, setVoidCode] = useState('');
  
  // Estados de Filtros y Búsqueda
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('TODAS');
  const [historyFilter, setHistoryFilter] = useState<'HOY' | 'SEMANA' | 'MES' | 'AÑO' | 'CALENDARIO'>('HOY');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'TODOS' | 'PENDIENTE' | 'COMPLETO'>('TODOS');
  
  // Estados de Formulario / Venta
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cashDrawerFund, setCashDrawerFund] = useState('0');
  const [formCost, setFormCost] = useState('0');
  const [formMargin, setFormMargin] = useState('30');
  const [formPrice, setFormPrice] = useState(0);
  const [adjustmentPercent, setAdjustmentPercent] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'DESCUENTO' | 'RECARGO'>('DESCUENTO');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('EFECTIVO');
  
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [payTotal, setPayTotal] = useState('0');
  const [payDelivered, setPayDelivered] = useState('0');
  const [payDeadline, setPayDeadline] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const costNum = parseFloat(formCost.replace(',', '.')) || 0;
    const marginNum = parseFloat(formMargin.replace(',', '.')) || 0;
    const calculated = costNum * (1 + marginNum / 100);
    setFormPrice(Number(calculated.toFixed(2)));
  }, [formCost, formMargin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: appts } = await supabase.from('appointments').select('*').order('date', { ascending: true });
      const { data: prods } = await supabase.from('products').select('*').eq('category', 'CONSULTORIO').order('name', { ascending: true });
      const { data: cats } = await supabase.from('product_categories').select('*').eq('system_type', 'CONSULTORIO').order('name', { ascending: true });
      const { data: sups } = await supabase.from('suppliers').select('*').eq('category', 'CONSULTORIO').order('name', { ascending: true });
      const { data: payms } = await supabase.from('payments').select('*').eq('system_type', 'CONSULTORIO').order('date', { ascending: false });
      const { data: sales } = await supabase.from('sales').select('*, sale_items(*)').eq('system_type', 'CONSULTORIO').order('created_at', { ascending: false });

      if (appts) setAppointments(appts);
      if (prods) setProducts(prods);
      if (cats) setCategories(cats);
      if (sups) setSuppliers(sups);
      if (payms) setPayments(payms);
      if (sales) setSalesHistory(sales);
    } catch (err) {
      console.error("Error fetching clinic data:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGICA DE VENTAS ---
  const handleAddToCart = (p: Product) => {
    setCart(prev => {
      const exists = prev.find(item => item.product.id === p.id);
      if (exists) return prev.map(item => item.product.id === p.id ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { product: p, qty: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.product.id === productId); if (!item) return prev;
      const newQty = item.qty + delta;
      if (newQty <= 0) return prev.filter(i => i.product.id !== productId);
      return prev.map(i => i.product.id === productId ? { ...i, qty: newQty } : i);
    });
  };

  const handleCheckout = async () => {
    const subtotal = cart.reduce((acc, curr) => acc + (Number(curr.product.price) * curr.qty), 0);
    const adjNum = parseFloat(adjustmentPercent.replace(',', '.')) || 0;
    const finalAdj = adjustmentType === 'DESCUENTO' ? -Math.abs(adjNum) : Math.abs(adjNum);
    const total = subtotal * (1 + finalAdj / 100);
    setLoading(true);
    try {
      const { data: sale, error: saleError } = await supabase.from('sales').insert({
        total, payment_method: selectedPaymentMethod, billing_type: 'COMPROBANTE', system_type: 'CONSULTORIO', is_voided: false
      }).select().single();
      if (saleError) throw saleError;
      
      const items = cart.map(c => ({
        sale_id: sale.id, product_id: c.product.id, name: c.product.name, quantity: c.qty,
        subtotal: (Number(c.product.price) * c.qty) * (1 + finalAdj / 100)
      }));
      await supabase.from('sale_items').insert(items);
      
      for (const item of cart) { 
        await supabase.from('products').update({ stock: item.product.stock - item.qty }).eq('id', item.product.id); 
      }
      
      generatePDF(sale, items);
      setCart([]); 
      setAdjustmentPercent(''); 
      setShowCheckoutModal(false); 
      fetchData();
    } catch (error: any) { alert(error.message); }
    finally { setLoading(false); }
  };

  const generatePDF = (saleData: any, items: any[]) => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [80, 150] });
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("AMAZONIA CONSULTORIO", 40, 12, { align: 'center' });
    doc.setFontSize(7);
    doc.text("TICKET NO FISCAL - CONSUMO INTERNO", 40, 16, { align: 'center' });
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
    doc.save(`Ticket_Clinic_${saleData.id.slice(0,8)}.pdf`);
  };

  // --- LOGICA DE MEMO / FILTROS ---
  const filteredInventory = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode?.includes(searchTerm);
      const matchesCategory = categoryFilter === 'TODAS' || p.product_category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, categoryFilter]);

  const filteredHistory = useMemo(() => {
    const now = new Date();
    return salesHistory.filter(sale => {
      const saleDate = new Date(sale.created_at);
      const isSameDay = (d1: Date, d2: Date) => d1.toDateString() === d2.toDateString();
      switch(historyFilter) {
        case 'HOY': return isSameDay(saleDate, now);
        case 'SEMANA': { const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7); return saleDate >= weekAgo; }
        case 'MES': return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
        case 'AÑO': return saleDate.getFullYear() === now.getFullYear();
        case 'CALENDARIO': return isSameDay(saleDate, new Date(selectedDate + 'T12:00:00'));
        default: return true;
      }
    });
  }, [salesHistory, historyFilter, selectedDate]);

  const stats = useMemo(() => {
    const activeSales = filteredHistory.filter(s => !s.is_voided);
    const fondo = parseFloat(cashDrawerFund.replace(',', '.')) || 0;
    const ventaTotal = activeSales.reduce((a, s) => a + Number(s.total), 0);
    const total1 = fondo + ventaTotal;
    const tarjetas = activeSales.filter(s => s.payment_method !== 'EFECTIVO').reduce((a, s) => a + Number(s.total), 0);
    const egresos = payments.filter(p => p.type !== 'RETIRO').reduce((a, p) => a + (p.paid_amount || p.amount), 0);
    const retiros = payments.filter(p => p.type === 'RETIRO').reduce((a, p) => a + (p.paid_amount || p.amount), 0);
    const total2 = total1 - tarjetas - egresos - retiros;
    return { fondo, ventaTotal, total1, tarjetas, egresos, retiros, total2 };
  }, [filteredHistory, payments, cashDrawerFund]);

  const monthlySummary = useMemo(() => {
    const groups: Record<string, { year: number, month: number, purchases: number, paid: number, balance: number }> = {};
    payments.forEach(p => {
      const d = new Date(p.date + 'T12:00:00');
      const year = d.getFullYear();
      const month = d.getMonth();
      const key = `${year}-${month}`;
      if (!groups[key]) groups[key] = { year, month, purchases: 0, paid: 0, balance: 0 };
      groups[key].purchases += Number(p.total_amount || p.amount || 0);
      groups[key].paid += Number(p.paid_amount || p.amount || 0);
      groups[key].balance += Number(p.remaining_amount || 0);
    });
    return Object.values(groups).sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
  }, [payments]);

  const subtotalCart = cart.reduce((a, c) => a + (Number(c.product.price) * c.qty), 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      {/* Modales Compartidos */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-800">{editingProduct ? 'Editar' : 'Nuevo'} Insumo</h2>
              <button onClick={() => setShowProductModal(false)}><X /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const productData = {
                name: formData.get('name') as string,
                barcode: formData.get('barcode') as string,
                stock: Number(formData.get('stock')),
                min_stock: Number(formData.get('min_stock')),
                product_category: formData.get('product_category') as string,
                cost: parseFloat(formCost.replace(',', '.')) || 0,
                margin: parseFloat(formMargin.replace(',', '.')) || 0,
                price: formPrice,
                category: 'CONSULTORIO'
              };
              if (editingProduct) await supabase.from('products').update(productData).eq('id', editingProduct.id);
              else await supabase.from('products').insert(productData);
              setShowProductModal(false); fetchData();
            }} className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><input name="barcode" defaultValue={editingProduct?.barcode} placeholder="Código de Barras..." className="w-full p-4 bg-slate-50 border rounded-2xl font-mono" /></div>
              <div className="col-span-2">
                <select name="product_category" defaultValue={editingProduct?.product_category} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold uppercase text-xs">
                  <option value="">SIN CATEGORÍA</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-span-2"><input name="name" defaultValue={editingProduct?.name} required placeholder="Nombre del Insumo" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" /></div>
              <div><input name="stock" type="number" defaultValue={editingProduct?.stock || 0} required placeholder="Stock" className="w-full p-4 bg-slate-50 border rounded-2xl font-black" /></div>
              <div><input name="min_stock" type="number" defaultValue={editingProduct?.min_stock || 5} placeholder="Minimo" className="w-full p-4 bg-slate-50 border rounded-2xl font-black" /></div>
              <div className="col-span-2 grid grid-cols-3 gap-4 p-5 bg-slate-50 rounded-[2rem] border">
                <input type="text" value={formCost} onChange={(e) => setFormCost(e.target.value)} placeholder="Costo" className="w-full p-2.5 bg-white border rounded-xl font-bold" />
                <input type="text" value={formMargin} onChange={(e) => setFormMargin(e.target.value)} placeholder="Margen %" className="w-full p-2.5 bg-white border rounded-xl font-bold" />
                <div className="text-xl font-black text-center">${formPrice}</div>
              </div>
              <button type="submit" className="col-span-2 bg-sky-600 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest">GUARDAR INSUMO</button>
            </form>
          </div>
        </div>
      )}

      {showApptModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-800">Nuevo Turno</h2>
              <button onClick={() => setShowApptModal(false)}><X /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const { error } = await supabase.from('appointments').insert({
                client_name: formData.get('client_name'),
                pet_name: formData.get('pet_name'),
                date: formData.get('date'),
                time: formData.get('time'),
                type: formData.get('type')
              });
              if (!error) { setShowApptModal(false); fetchData(); }
            }} className="space-y-4">
              <input name="client_name" placeholder="Dueño" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
              <input name="pet_name" placeholder="Paciente" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
              <div className="grid grid-cols-2 gap-4">
                <input name="date" type="date" defaultValue={selectedDate} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
                <input name="time" type="time" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
              </div>
              <select name="type" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold">
                <option value="CONSULTA">CONSULTA</option>
                <option value="VACUNA">VACUNA</option>
                <option value="CIRUGIA">CIRUGÍA</option>
                <option value="CONTROL">CONTROL</option>
              </select>
              <button type="submit" className="w-full bg-sky-500 text-white py-5 rounded-3xl font-black uppercase tracking-widest">AGENDAR</button>
            </form>
          </div>
        </div>
      )}

      <nav className="bg-sky-500 text-white px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition-colors"><ArrowLeft size={24} /></button>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">Amazonia Consultorio</h1>
        </div>
        <div className="flex bg-white/20 rounded-2xl p-1 overflow-x-auto no-scrollbar max-w-[60vw]">
          {['TURNOS', 'INVENTARIO', 'VENDER', 'HISTORIAL', 'PROVEEDORES', 'PAGOS', 'CUENTAS'].map(id => (
            <button key={id} onClick={() => setActiveTab(id as TabType)} className={`px-4 py-2 rounded-xl font-black text-[9px] tracking-widest uppercase transition-all whitespace-nowrap ${activeTab === id ? 'bg-white text-sky-600 shadow-sm' : 'hover:bg-white/10'}`}>{id}</button>
          ))}
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'TURNOS' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-slate-800 outline-none mb-4" />
                <button onClick={() => setShowApptModal(true)} className="w-full bg-sky-500 text-white py-4 rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 text-xs uppercase"><Plus size={16}/> AGENDAR TURNO</button>
              </div>
            </div>
            <div className="lg:col-span-3 space-y-4">
              {appointments.filter(a => a.date === selectedDate).length === 0 ? (
                <div className="p-20 text-center opacity-30 italic font-black uppercase tracking-widest border border-dashed rounded-[3rem]">Sin turnos hoy</div>
              ) : (
                appointments.filter(a => a.date === selectedDate).map(appt => (
                  <div key={appt.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:shadow-lg transition-all">
                    <div className="flex items-center gap-6">
                      <div className="text-center min-w-[60px] border-r pr-6"><p className="text-[9px] font-black text-slate-300 uppercase">Hora</p><p className="text-xl font-black text-slate-800">{appt.time.slice(0,5)}</p></div>
                      <div><p className="text-[9px] font-black text-sky-500 uppercase tracking-widest">Paciente: {appt.pet_name}</p><h4 className="font-black text-slate-800 uppercase text-xs">{appt.client_name}</h4></div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="px-4 py-1 rounded-full text-[9px] font-black border uppercase bg-sky-50 text-sky-700">{appt.type}</span>
                      <button onClick={async () => { if(confirm("¿Eliminar?")) { await supabase.from('appointments').delete().eq('id', appt.id); fetchData(); } }} className="p-2 text-red-200 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'INVENTARIO' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-end gap-4">
              <div className="flex flex-1 gap-4">
                <div className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="text" placeholder="Buscar insumo..." className="w-full pl-12 pr-4 py-4 rounded-3xl border outline-none shadow-sm" onChange={(e) => setSearchTerm(e.target.value)} /></div>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-60 px-4 py-4 rounded-3xl border outline-none font-bold text-xs uppercase shadow-sm"><option value="TODAS">TODAS</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
              </div>
              <button onClick={() => setShowProductModal(true)} className="bg-sky-600 text-white px-8 py-4 rounded-3xl font-black flex items-center gap-2 shadow-xl uppercase text-xs"><Plus /> NUEVO INSUMO</button>
            </div>
            <div className="bg-white rounded-[3rem] shadow-sm border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400"><tr className="px-8"><th className="px-8 py-6">Insumo</th><th className="px-8 py-6">Stock</th><th className="px-8 py-6">Costo</th><th className="px-8 py-6 text-right">Acción</th></tr></thead>
                <tbody className="divide-y">
                  {filteredInventory.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 group transition-colors">
                      <td className="px-8 py-5"><p className="font-black text-slate-800 uppercase text-xs">{p.name}</p></td>
                      <td className="px-8 py-5"><span className={`font-black text-lg ${p.stock <= p.min_stock ? 'text-red-500' : 'text-slate-900'}`}>{p.stock}</span></td>
                      <td className="px-8 py-5 font-black text-slate-900">${p.cost}</td>
                      <td className="px-8 py-5 text-right"><button onClick={() => { setEditingProduct(p); setShowProductModal(true); }} className="p-2 text-blue-500"><Edit3 size={18} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'VENDER' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full animate-in fade-in">
            <div className="space-y-6">
              <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-xl text-white">
                <input ref={barcodeInputRef} type="text" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { const p = products.find(prod => prod.barcode === barcodeInput); if(p) handleAddToCart(p); setBarcodeInput(''); } }} placeholder="Lector de Barras..." className="w-full p-4 rounded-2xl bg-white/10 border border-white/20 text-white font-bold outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                  <button key={p.id} onClick={() => handleAddToCart(p)} className="p-4 border-2 rounded-[1.5rem] text-left hover:border-sky-400 bg-white transition-all active:scale-95">
                    <p className="font-black text-slate-800 text-xs uppercase mb-1">{p.name}</p>
                    <p className="text-lg font-black text-slate-900">${p.price}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border flex flex-col h-[calc(100vh-140px)] sticky top-24">
              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><ShoppingCart /> Consumo Interno / Venta</h3>
              <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                {cart.map(item => (
                  <div key={item.product.id} className="p-4 bg-slate-50 rounded-[1.5rem] border flex justify-between items-center animate-in slide-in-from-right duration-200">
                    <div className="flex-1 pr-2"><p className="font-black text-xs text-slate-800 truncate uppercase">{item.product.name}</p></div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center bg-white border rounded-lg p-1"><button onClick={() => updateCartQty(item.product.id, -1)} className="p-1"><Minus size={12} /></button><span className="w-8 text-center font-black text-xs">{item.qty}</span><button onClick={() => updateCartQty(item.product.id, 1)} className="p-1"><Plus size={12} /></button></div>
                      <p className="font-black text-slate-900 text-sm min-w-[70px] text-right">${(item.qty * item.product.price).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t pt-6">
                <div className="flex justify-between items-end mb-4"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p><div className="text-4xl font-black text-slate-900 tracking-tighter">${subtotalCart.toFixed(2)}</div></div>
                <button onClick={() => setShowCheckoutModal(true)} disabled={cart.length === 0} className="w-full bg-sky-600 text-white py-5 rounded-[1.5rem] font-black shadow-xl disabled:opacity-30 active:scale-95 transition-all uppercase tracking-widest">CONFIRMAR VENTA</button>
              </div>
            </div>
          </div>
        )}

        {/* ... (OTRAS PESTAÑAS: HISTORIAL, PROVEEDORES, PAGOS, CUENTAS) - Siguen la misma lógica comercial adaptada al sistema_type 'CONSULTORIO' ... */}
        {activeTab === 'CUENTAS' && (
           <div className="space-y-12 animate-in fade-in max-w-5xl mx-auto">
             <div className="bg-fuchsia-100 border-2 border-fuchsia-200 p-8 rounded-[3rem] shadow-sm">
               <div className="flex items-center gap-3 mb-6"><div className="p-3 bg-fuchsia-600 text-white rounded-2xl shadow-lg"><Activity size={24}/></div><h3 className="text-xl font-black text-fuchsia-800 uppercase tracking-tighter italic">Rendimiento Consultorio</h3></div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ingresos Totales (Ventas Insumos/Consultas)</p>
                    <p className="text-4xl font-black text-slate-900 tracking-tighter">${stats.ventaTotal.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Egresos (Insumos/Gastos)</p>
                    <p className="text-4xl font-black text-red-500 tracking-tighter">-${stats.egresos.toLocaleString()}</p>
                  </div>
               </div>
             </div>
           </div>
        )}

      </main>

      {loading && (<div className="fixed bottom-10 right-10 bg-white p-5 rounded-3xl shadow-2xl flex items-center gap-4 border z-[1000] animate-pulse"><Loader2 className="animate-spin text-sky-500" size={20} /><span className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Sincronizando...</span></div>)}
    </div>
  );
};

export default ClinicSystem;
