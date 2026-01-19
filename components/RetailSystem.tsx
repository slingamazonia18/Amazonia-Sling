
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowLeft, Package, ShoppingCart, Users, TrendingUp, Search, Plus, 
  Trash2, Printer, FileText, PhoneCall, Save, Barcode, ShoppingBag, Leaf, Loader2, X, CreditCard, QrCode, Banknote, RefreshCcw, Filter, AlertTriangle, Percent, Minus, PlusCircle, Calendar, Receipt, Briefcase, Landmark,
  Clock, Scan, Ban, ShieldCheck, History, Calculator, PiggyBank, Wallet, ArrowDownCircle, ArrowUpCircle, Settings, Layers, ListFilter, AlertCircle, Edit3, FileSpreadsheet
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
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [cashDrawerFund, setCashDrawerFund] = useState<string>('0');
  const [historyFilter, setHistoryFilter] = useState<'HOY' | 'SEMANA' | 'MES' | 'AÑO' | 'CALENDARIO'>('HOY');
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('TODAS');
  
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'TODOS' | 'PENDIENTE' | 'COMPLETO'>('TODOS');

  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  
  const [voidingSale, setVoidingSale] = useState<any>(null);
  const [voidCode, setVoidCode] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const modalBarcodeRef = useRef<HTMLInputElement>(null);
  const modalNameRef = useRef<HTMLInputElement>(null);
  const [barcodeInput, setBarcodeInput] = useState('');

  const [formCost, setFormCost] = useState<string>('0');
  const [formMargin, setFormMargin] = useState<string>('30');
  const [formPrice, setFormPrice] = useState<number>(0);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('EFECTIVO');
  const [selectedBillingType, setSelectedBillingType] = useState<'FACTURA' | 'COMPROBANTE'>('COMPROBANTE');
  const [adjustmentType, setAdjustmentType] = useState<'DESCUENTO' | 'RECARGO'>('DESCUENTO');
  const [adjustmentPercent, setAdjustmentPercent] = useState<string>(''); 

  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [payTotal, setPayTotal] = useState('0');
  const [payDelivered, setPayDelivered] = useState('0');
  const [payDeadline, setPayDeadline] = useState('');

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: prods } = await supabase.from('products').select('*').eq('category', type).order('name', { ascending: true });
      const { data: cats } = await supabase.from('product_categories').select('*').eq('system_type', type).order('name', { ascending: true });
      const { data: sups } = await supabase.from('suppliers').select('*').eq('category', type).order('name', { ascending: true });
      const { data: payms } = await supabase.from('payments').select('*').eq('system_type', type).order('date', { ascending: false });
      const { data: sales } = await supabase.from('sales').select('*, sale_items(*)').eq('system_type', type).order('created_at', { ascending: false });

      if (prods) setProducts(prods);
      if (cats) setCategories(cats);
      if (sups) setSuppliers(sups);
      if (payms) setPayments(payms);
      if (sales) setSalesHistory(sales);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const total = parseFloat(payTotal.replace(',', '.')) || 0;
    const entrega = parseFloat(payDelivered.replace(',', '.')) || 0;
    const restante = total - entrega;
    const fechaBase = formData.get('date') as string;
    
    let dueDate = fechaBase;
    const diasPlazo = parseInt(payDeadline) || 0;
    if (diasPlazo > 0) {
      const d = new Date(fechaBase + 'T12:00:00');
      d.setDate(d.getDate() + diasPlazo);
      dueDate = d.toISOString().split('T')[0];
    }

    const paymentData = {
      description: formData.get('description') as string,
      amount: entrega,
      total_amount: total,
      paid_amount: entrega,
      remaining_amount: restante,
      status: isPartialPayment && restante > 0 ? 'PENDIENTE' : 'COMPLETO',
      deadline_days: diasPlazo,
      due_date: dueDate,
      type: formData.get('type') as any,
      date: fechaBase,
      time: formData.get('time') as string,
      payment_method: formData.get('payment_method') as string,
      system_type: type
    };

    try {
      const { error } = await supabase.from('payments').insert(paymentData);
      if (error) throw error;
      setShowPaymentModal(false);
      setPayTotal('0');
      setPayDelivered('0');
      setPayDeadline('');
      setIsPartialPayment(false);
      fetchData();
    } catch (err: any) { alert(err.message); }
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

  const handleAddToCart = (p: Product) => {
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
      generatePDF(sale, items); 
      setCart([]); 
      setAdjustmentPercent(''); 
      setShowCheckoutModal(false); 
      fetchData();
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

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const stockValue = Number((e.currentTarget.elements.namedItem('stock') as HTMLInputElement).value);
    const productData = {
      name: (e.currentTarget.elements.namedItem('name') as HTMLInputElement).value,
      barcode: (e.currentTarget.elements.namedItem('barcode') as HTMLInputElement).value,
      stock: stockValue,
      min_stock: Number((e.currentTarget.elements.namedItem('min_stock') as HTMLInputElement).value),
      product_category: (e.currentTarget.elements.namedItem('product_category') as HTMLSelectElement).value,
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

  const handleNumericInput = (value: string, setter: (val: string) => void) => {
    setter(value.replace(/[^0-9,.]/g, ''));
  };

  const filteredInventory = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode.includes(searchTerm);
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
        case 'CALENDARIO': return isSameDay(saleDate, new Date(selectedHistoryDate + 'T12:00:00'));
        default: return true;
      }
    });
  }, [salesHistory, historyFilter, selectedHistoryDate]);

  const filteredPayments = useMemo(() => {
    const now = new Date();
    return payments.filter(p => {
      const pDate = new Date(p.date + 'T12:00:00');
      const isSameDay = (d1: Date, d2: Date) => d1.toDateString() === d2.toDateString();
      const matchesTime = (() => {
        switch(historyFilter) {
          case 'HOY': return isSameDay(pDate, now);
          case 'SEMANA': { const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7); return pDate >= weekAgo; }
          case 'MES': return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
          case 'AÑO': return pDate.getFullYear() === now.getFullYear();
          case 'CALENDARIO': return isSameDay(pDate, new Date(selectedHistoryDate + 'T12:00:00'));
          default: return true;
        }
      })();
      const matchesStatus = paymentStatusFilter === 'TODOS' || p.status === paymentStatusFilter;
      const matchesSearch = p.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTime && matchesStatus && matchesSearch;
    });
  }, [payments, historyFilter, selectedHistoryDate, paymentStatusFilter, searchTerm]);

  const monthlySummary = useMemo(() => {
    const groups: Record<string, { year: number, month: number, purchases: number, paid: number, balance: number }> = {};
    const monthNames = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

    payments.forEach(p => {
      const d = new Date(p.date + 'T12:00:00');
      const year = d.getFullYear();
      const month = d.getMonth();
      const key = `${year}-${month}`;

      if (!groups[key]) {
        groups[key] = { year, month, purchases: 0, paid: 0, balance: 0 };
      }

      groups[key].purchases += Number(p.total_amount || p.amount || 0);
      groups[key].paid += Number(p.paid_amount || p.amount || 0);
      groups[key].balance += Number(p.remaining_amount || 0);
    });

    return Object.values(groups).sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
  }, [payments]);

  const subtotalCart = cart.reduce((a, c) => a + (Number(c.product.price) * c.qty), 0);

  const stats = useMemo(() => {
    const activeSales = filteredHistory.filter(s => !s.is_voided);
    const fondo = parseFloat(cashDrawerFund.replace(',', '.')) || 0;
    const ventaTotal = activeSales.reduce((a, s) => a + Number(s.total), 0);
    const total1 = fondo + ventaTotal;
    const tarjetas = activeSales.filter(s => s.payment_method !== 'EFECTIVO').reduce((a, s) => a + Number(s.total), 0);
    const egresos = filteredPayments.filter(p => p.type !== 'RETIRO').reduce((a, p) => a + (p.paid_amount || p.amount), 0);
    const retiros = filteredPayments.filter(p => p.type === 'RETIRO').reduce((a, p) => a + (p.paid_amount || p.amount), 0);
    const total2 = total1 - tarjetas - egresos - retiros;
    return { fondo, ventaTotal, total1, tarjetas, egresos, retiros, total2 };
  }, [filteredHistory, filteredPayments, cashDrawerFund]);

  const stockAlerts = useMemo(() => products.filter(p => p.stock <= p.min_stock), [products]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      {/* Modales */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-800">{editingProduct ? 'Editar' : 'Nuevo'} Producto</h2>
              <button onClick={() => setShowProductModal(false)}><X /></button>
            </div>
            <form onSubmit={handleSaveProduct} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Código</label>
                <input ref={modalBarcodeRef} name="barcode" defaultValue={editingProduct?.barcode} className="w-full pl-6 pr-4 py-4 bg-slate-50 border rounded-2xl outline-none font-mono text-lg" placeholder="Escanee..." />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Categoría</label>
                <select name="product_category" defaultValue={editingProduct?.product_category} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold uppercase text-xs">
                  <option value="">SIN CATEGORÍA</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Nombre</label>
                <input ref={modalNameRef} name="name" defaultValue={editingProduct?.name} required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
              </div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Stock Actual</label><input name="stock" type="number" defaultValue={editingProduct?.stock || 0} required className="w-full p-4 bg-slate-50 border rounded-2xl font-black" /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Mínimo</label><input name="min_stock" type="number" defaultValue={editingProduct?.min_stock || 5} className="w-full p-4 bg-slate-50 border rounded-2xl font-black" /></div>
              <div className="col-span-2 grid grid-cols-3 gap-4 p-5 bg-slate-50 rounded-[2rem] border">
                <div><label className="text-[9px] font-black text-slate-400 mb-1 block">Costo ($)</label><input type="text" value={formCost} onChange={(e) => handleNumericInput(e.target.value, setFormCost)} className="w-full p-2.5 bg-white border rounded-xl font-bold" /></div>
                <div><label className="text-[9px] font-black text-slate-400 mb-1 block">Margen (%)</label><input type="text" value={formMargin} onChange={(e) => handleNumericInput(e.target.value, setFormMargin)} className="w-full p-2.5 bg-white border rounded-xl font-bold" /></div>
                <div className="flex flex-col justify-center text-center"><label className="text-[9px] font-black text-slate-400 mb-1 block">P. Venta</label><div className="text-xl font-black text-slate-900">${formPrice}</div></div>
              </div>
              <button type="submit" className={`col-span-2 ${colors.primary} text-white py-5 rounded-[1.5rem] font-black mt-4 uppercase text-xs tracking-widest`}>GUARDAR PRODUCTO</button>
            </form>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black text-slate-800 uppercase">Registrar Egreso</h2><button onClick={() => setShowPaymentModal(false)}><X /></button></div>
            <form onSubmit={handleSavePayment} className="space-y-4">
              <div><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Descripción</label><input name="description" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" /></div>
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                <button type="button" onClick={() => setIsPartialPayment(false)} className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${!isPartialPayment ? 'bg-white shadow-sm' : 'text-slate-400'}`}>PAGO COMPLETO</button>
                <button type="button" onClick={() => setIsPartialPayment(true)} className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${isPartialPayment ? 'bg-white shadow-sm text-amber-600' : 'text-slate-400'}`}>PAGO PARCIAL</button>
              </div>
              {!isPartialPayment ? (
                <div><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Monto Total ($)</label><input value={payTotal} onChange={(e) => { handleNumericInput(e.target.value, setPayTotal); setPayDelivered(e.target.value); }} className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-2xl" /></div>
              ) : (
                <div className="space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-black text-slate-400 mb-1 block">Factura Total</label><input value={payTotal} onChange={(e) => handleNumericInput(e.target.value, setPayTotal)} className="w-full p-4 bg-slate-50 border rounded-2xl font-black" /></div>
                    <div><label className="text-[10px] font-black text-amber-500 mb-1 block">Entrega Hoy</label><input value={payDelivered} onChange={(e) => handleNumericInput(e.target.value, setPayDelivered)} className="w-full p-4 bg-amber-50 border border-amber-100 rounded-2xl font-black text-amber-700" /></div>
                  </div>
                  <div><label className="text-[10px] font-black text-slate-400 mb-1 block">Plazo (Días)</label><input value={payDeadline} onChange={(e) => handleNumericInput(e.target.value, setPayDeadline)} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" placeholder="Días para el vencimiento..." /></div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <select name="type" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-xs"><option value="PROVEEDOR">PROVEEDOR</option><option value="SERVICIO">SERVICIO</option><option value="RETIRO">RETIRO</option></select>
                <select name="payment_method" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-xs"><option value="EFECTIVO">EFECTIVO</option><option value="TRANSFERENCIA">TRANSF.</option></select>
              </div>
              <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
              <button type="submit" className={`w-full ${isPartialPayment ? 'bg-amber-500' : 'bg-red-500'} text-white py-4 rounded-2xl font-black uppercase tracking-widest`}>GUARDAR EGRESO</button>
            </form>
          </div>
        </div>
      )}

      {showSummaryModal && (
        <div className="fixed inset-0 bg-black/70 z-[130] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl p-10 shadow-2xl animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg">
                  <FileSpreadsheet size={24} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Resumen Mensual de Compras</h2>
              </div>
              <button onClick={() => setShowSummaryModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                <X />
              </button>
            </div>

            <div className="overflow-x-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                    <th className="px-6 py-4 rounded-l-2xl">AÑO</th>
                    <th className="px-6 py-4 text-center">MES</th>
                    <th className="px-6 py-4 text-right">TOTAL COMPRAS / MES</th>
                    <th className="px-6 py-4 text-right">TOTAL PAGO / MES</th>
                    <th className="px-6 py-4 text-right rounded-r-2xl">SALDO / MES</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySummary.map((row, i) => {
                    const monthNames = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
                    return (
                      <tr key={i} className="bg-slate-50/50 hover:bg-slate-100/50 transition-colors group">
                        <td className="px-6 py-5 rounded-l-2xl font-black text-slate-400">{row.year}</td>
                        <td className="px-6 py-5 text-center font-black text-slate-800 tracking-tight">{monthNames[row.month]}</td>
                        <td className="px-6 py-5 text-right font-black text-slate-900">${row.purchases.toLocaleString()}</td>
                        <td className="px-6 py-5 text-right font-black text-emerald-600">${row.paid.toLocaleString()}</td>
                        <td className="px-6 py-5 text-right font-black text-red-500 rounded-r-2xl bg-red-50/30">${row.balance.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {monthlySummary.length === 0 && (
                <div className="py-20 text-center opacity-20 italic">No hay datos suficientes para generar un resumen mensual.</div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
              <span>SISTEMA AMAZONIA PRO</span>
              <span>DATOS CALCULADOS EN TIEMPO REAL</span>
            </div>
          </div>
        </div>
      )}

      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/70 z-[120] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-5"><h2 className="text-xl font-black text-slate-800 uppercase">Cobro</h2><button onClick={() => setShowCheckoutModal(false)}><X size={18} /></button></div>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-2">
                {['EFECTIVO', 'QR', 'TRANSFERENCIA', 'CREDITO', 'DEBITO'].map(m => (
                  <button key={m} onClick={() => setSelectedPaymentMethod(m)} className={`py-2 px-3 rounded-xl border-2 text-[10px] font-black transition-all ${selectedPaymentMethod === m ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-50 text-slate-400'}`}>{m}</button>
                ))}
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border">
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setAdjustmentType('DESCUENTO')} className={`flex-1 py-2 rounded-lg font-black text-[9px] ${adjustmentType === 'DESCUENTO' ? 'bg-red-500 text-white' : 'bg-white border'}`}>DESCUENTO</button>
                  <button onClick={() => setAdjustmentType('RECARGO')} className={`flex-1 py-2 rounded-lg font-black text-[9px] ${adjustmentType === 'RECARGO' ? 'bg-emerald-500 text-white' : 'bg-white border'}`}>AUMENTO</button>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg font-black">{adjustmentType === 'DESCUENTO' ? '-' : '+'}</span>
                  <input type="text" value={adjustmentPercent} onChange={(e) => handleNumericInput(e.target.value, setAdjustmentPercent)} className="w-16 text-center text-3xl font-black bg-transparent outline-none" placeholder="0" />
                  <span className="text-lg font-black text-slate-300">%</span>
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center text-3xl font-black text-slate-900 mb-4">
                  <span>TOTAL</span>
                  <span>${(subtotalCart * (1 + (adjustmentType === 'DESCUENTO' ? -(parseFloat(adjustmentPercent) || 0) : (parseFloat(adjustmentPercent) || 0))/100)).toFixed(2)}</span>
                </div>
                <button onClick={handleCheckout} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl uppercase">CONFIRMAR COBRO</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navegación Principal */}
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
              <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input type="text" placeholder="Producto o Código..." className="w-full pl-12 pr-4 py-4 rounded-3xl border outline-none shadow-sm" onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full md:w-60 pl-4 pr-10 py-4 rounded-3xl border outline-none font-bold text-xs uppercase shadow-sm"><option value="TODAS">TODAS LAS CATEGORÍAS</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowCategoryModal(true)} className="bg-slate-100 text-slate-600 px-6 py-4 rounded-3xl font-black flex items-center gap-2 uppercase text-[10px] hover:bg-slate-200 transition-all"><Settings size={16}/> CATEGORÍAS</button>
                <button onClick={() => { setEditingProduct(null); setShowProductModal(true); }} className={`${colors.primary} text-white px-10 py-4 rounded-3xl font-black flex items-center gap-2 shadow-xl uppercase text-[10px] hover:scale-105 active:scale-95 transition-all`}><Plus /> NUEVO PRODUCTO</button>
              </div>
            </div>
            <div className="bg-white rounded-[3rem] shadow-sm border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                  <tr><th className="px-8 py-6">Producto</th><th className="px-8 py-6">Stock</th><th className="px-8 py-6">Venta</th><th className="px-8 py-6 text-right">Acciones</th></tr>
                </thead>
                <tbody className="divide-y">
                  {filteredInventory.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 group transition-colors">
                      <td className="px-8 py-5"><p className="font-black text-slate-800">{p.name}</p><p className="text-[10px] text-slate-300 font-mono">{p.barcode || 'S/B'}</p></td>
                      <td className="px-8 py-5"><span className={`font-black text-lg ${p.stock <= p.min_stock ? 'text-red-500' : 'text-slate-900'}`}>{p.stock}</span></td>
                      <td className="px-8 py-5 font-black text-slate-900">${p.price}</td>
                      <td className="px-8 py-5 text-right flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => { setEditingProduct(p); setShowProductModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl"><Edit3 size={18} /></button><button onClick={() => { if(confirm("¿Eliminar?")) supabase.from('products').delete().eq('id', p.id).then(() => fetchData()) }} className="p-2 text-red-300 hover:text-red-500 rounded-xl"><Trash2 size={18} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredInventory.length === 0 && <div className="p-20 text-center text-slate-300 font-black uppercase italic tracking-widest">No hay productos</div>}
            </div>
          </div>
        )}

        {activeTab === 'VENDER' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full animate-in fade-in">
            <div className="space-y-8 flex flex-col h-full">
              <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-xl text-white">
                <form onSubmit={handleBarcodeSubmit} className="relative">
                  <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={24} />
                  <input ref={barcodeInputRef} type="text" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} placeholder="Escanee código..." className="w-full pl-14 pr-4 py-5 rounded-2xl bg-white/10 border border-white/20 text-white text-xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-700" />
                </form>
              </div>
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border flex flex-col flex-1 max-h-[600px]">
                <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-2 custom-scrollbar">
                  {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                    <button key={p.id} onClick={() => p.stock > 0 && handleAddToCart(p)} className={`p-4 border-2 rounded-[1.5rem] text-left flex flex-col justify-between transition-all ${p.stock <= 0 ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:border-blue-400 bg-slate-50/30 active:scale-95'}`}>
                      <p className="font-black text-slate-800 line-clamp-2 mb-2 text-xs uppercase">{p.name}</p>
                      <div className="flex justify-between items-end"><span className="text-lg font-black text-slate-900">${p.price}</span><span className="text-[9px] font-black text-slate-400 uppercase">Stock: {p.stock}</span></div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border flex flex-col h-[calc(100vh-140px)] sticky top-24">
              <div className="flex items-center gap-2 mb-6"><div className="p-2 bg-slate-900 text-white rounded-xl shadow-lg"><ShoppingCart size={20} /></div><h3 className="text-xl font-black text-slate-800 tracking-tight">Carrito de Ventas</h3></div>
              <div className="flex-1 space-y-4 overflow-y-auto pr-2 mb-6 custom-scrollbar">
                {cart.length === 0 ? <div className="h-full flex flex-col items-center justify-center opacity-10"><ShoppingBag size={60}/><p className="font-black mt-2">VACÍO</p></div> : cart.map(item => (
                  <div key={item.product.id} className="p-4 bg-slate-50 rounded-[1.5rem] border flex justify-between items-center animate-in slide-in-from-right duration-200">
                    <div className="flex-1 min-w-0 pr-2"><p className="font-black text-xs text-slate-800 truncate uppercase">{item.product.name}</p><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">${item.product.price} c/u</p></div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-white border rounded-lg p-0.5 shadow-sm"><button onClick={() => updateCartQty(item.product.id, -1)} className="p-1 hover:bg-slate-100 rounded"><Minus size={10} /></button><span className="w-6 text-center font-black text-xs">{item.qty}</span><button onClick={() => updateCartQty(item.product.id, 1)} className="p-1 hover:bg-slate-100 rounded"><Plus size={10} /></button></div>
                      <p className="font-black text-slate-900 text-sm min-w-[70px] text-right">${(item.qty * item.product.price).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-end mb-4"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total a Cobrar</p><div className="text-4xl font-black text-slate-900 tracking-tighter">${subtotalCart.toFixed(2)}</div></div>
                <button onClick={() => setShowCheckoutModal(true)} disabled={cart.length === 0} className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black shadow-xl disabled:opacity-30 active:scale-95 transition-all uppercase tracking-widest">COBRAR VENTA</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'HISTORIAL DE VENTAS' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white p-6 rounded-[3rem] border shadow-sm flex flex-col md:flex-row gap-6 justify-between items-center">
              <div className="flex flex-wrap gap-2">
                {['HOY', 'SEMANA', 'MES', 'AÑO'].map(f => (
                  <button key={f} onClick={() => setHistoryFilter(f as any)} className={`px-6 py-2 rounded-xl font-black text-[10px] transition-all uppercase tracking-widest ${historyFilter === f ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>{f}</button>
                ))}
              </div>
              <div className="flex items-center gap-2"><Calendar size={16} className="text-slate-400"/><input type="date" value={selectedHistoryDate} onChange={(e) => { setSelectedHistoryDate(e.target.value); setHistoryFilter('CALENDARIO'); }} className="bg-slate-100 p-3 rounded-xl text-xs font-black outline-none border-none" /></div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {filteredHistory.map(sale => (
                <div key={sale.id} className={`bg-white p-6 rounded-[2.5rem] border shadow-sm flex items-center gap-6 group hover:shadow-md transition-all ${sale.is_voided ? 'opacity-40 grayscale italic' : ''}`}>
                  <div className="flex flex-col items-center min-w-[100px] border-r pr-6">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">{new Date(sale.created_at).toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'})}</span>
                    <span className="text-xl font-black text-slate-800">${sale.total.toFixed(2)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-2 mb-1">
                      <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full uppercase border border-blue-100">{sale.payment_method}</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${sale.is_voided ? 'bg-red-50 text-red-500 border-red-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'}`}>{sale.is_voided ? 'ANULADA' : 'ACTIVA'}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-500 truncate uppercase">{sale.sale_items?.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}</p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => generatePDF(sale, sale.sale_items || [])} className="p-3 text-slate-400 hover:text-blue-500 border rounded-xl hover:bg-blue-50"><Printer size={20} /></button>
                    {!sale.is_voided && <button onClick={() => { setVoidingSale(sale); setShowVoidModal(true); }} className="p-3 text-red-300 hover:text-red-500 border rounded-xl hover:bg-red-50"><Ban size={20} /></button>}
                  </div>
                </div>
              ))}
              {filteredHistory.length === 0 && <div className="p-20 text-center text-slate-300 font-black uppercase italic tracking-widest border border-dashed rounded-[3rem]">Sin ventas registradas</div>}
            </div>
          </div>
        )}

        {activeTab === 'PAGOS' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Egresos de Caja</h2>
              <div className="flex gap-2">
                <button onClick={() => setShowSummaryModal(true)} className="bg-slate-900 text-white px-8 py-4 rounded-3xl font-black flex items-center gap-2 shadow-xl uppercase text-xs hover:scale-105 active:scale-95 transition-all">
                  <FileSpreadsheet size={18} /> GENERAR RESUMEN
                </button>
                <button onClick={() => setShowPaymentModal(true)} className="bg-red-500 text-white px-8 py-4 rounded-3xl font-black flex items-center gap-2 shadow-xl uppercase text-xs hover:scale-105 active:scale-95 transition-all">
                  <ArrowDownCircle size={18} /> REGISTRAR GASTO
                </button>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[3rem] border shadow-sm flex gap-4 items-center">
              {['TODOS', 'PENDIENTE', 'COMPLETO'].map(s => (
                <button key={s} onClick={() => setPaymentStatusFilter(s as any)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${paymentStatusFilter === s ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>{s}</button>
              ))}
            </div>
            <div className="bg-white rounded-[3rem] shadow-sm border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  <tr><th className="px-8 py-6">Descripción / Tipo</th><th className="px-8 py-6">Monto / Deuda</th><th className="px-8 py-6">Estado / Vence</th><th className="px-8 py-6 text-right">Acción</th></tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPayments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 group transition-colors">
                      <td className="px-8 py-5"><p className="font-black text-slate-800 uppercase">{p.description}</p><p className="text-[10px] text-slate-300 font-bold uppercase">{p.date} • {p.type}</p></td>
                      <td className="px-8 py-5">
                        <p className="font-black text-lg text-red-500">-${p.paid_amount || p.amount}</p>
                        {p.status === 'PENDIENTE' && <p className="text-[10px] font-black text-amber-600 uppercase tracking-tighter">DEBE: ${p.remaining_amount}</p>}
                      </td>
                      <td className="px-8 py-5">
                        <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${p.status === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{p.status || 'COMPLETO'}</span>
                        {p.due_date && <p className="text-[9px] text-slate-400 mt-1 font-bold uppercase tracking-tighter">VENCE: {p.due_date}</p>}
                      </td>
                      <td className="px-8 py-5 text-right"><button onClick={() => { if(confirm("¿Eliminar pago?")) supabase.from('payments').delete().eq('id', p.id).then(() => fetchData()) }} className="p-2 text-red-300 hover:text-red-500 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPayments.length === 0 && <div className="p-20 text-center text-slate-300 font-black uppercase italic tracking-widest">Sin egresos registrados</div>}
            </div>
          </div>
        )}

        {activeTab === 'PROVEEDORES' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center"><h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Agenda de Proveedores</h2><button onClick={() => setShowSupplierModal(true)} className={`${colors.primary} text-white px-8 py-4 rounded-3xl font-black uppercase text-xs shadow-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all`}><Plus /> NUEVO PROVEEDOR</button></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {suppliers.map(sup => (
                <div key={sup.id} className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col gap-4 group hover:shadow-xl transition-all border-slate-100">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{sup.name}</h3>
                  {sup.whatsapp && (
                    <a href={`https://wa.me/${sup.whatsapp}`} target="_blank" rel="noopener noreferrer" className="bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs text-center flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-600 active:scale-95 transition-all"><PhoneCall size={18} /> PEDIDO WHATSAPP</a>
                  )}
                  <button onClick={() => { if(confirm("¿Eliminar?")) supabase.from('suppliers').delete().eq('id', sup.id).then(() => fetchData()) }} className="text-red-300 hover:text-red-500 text-[10px] font-black uppercase flex items-center gap-2 justify-center mt-2 opacity-50 group-hover:opacity-100 transition-all"><Trash2 size={14}/> Eliminar</button>
                </div>
              ))}
              {suppliers.length === 0 && <div className="col-span-full p-20 text-center text-slate-300 font-black uppercase italic tracking-widest border-2 border-dashed rounded-[3rem]">No hay proveedores registrados</div>}
            </div>
          </div>
        )}

        {activeTab === 'CUENTAS' && (
          <div className="space-y-12 animate-in fade-in max-w-5xl mx-auto">
            <div className="bg-red-50 border-2 border-red-100 p-8 rounded-[3rem] shadow-sm">
              <div className="flex items-center gap-3 mb-6"><div className="p-3 bg-red-500 text-white rounded-2xl shadow-lg"><AlertTriangle size={24}/></div><h3 className="text-xl font-black text-red-800 uppercase tracking-tighter italic">Alertas de Stock Bajo</h3></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stockAlerts.map(p => (
                  <div key={p.id} className="bg-white p-4 rounded-2xl border-2 border-red-100 shadow-sm flex justify-between items-center animate-pulse"><div><p className="font-black text-slate-800 text-xs uppercase">{p.name}</p></div><span className="text-lg font-black text-red-600">{p.stock}</span></div>
                ))}
                {stockAlerts.length === 0 && <p className="col-span-full text-center text-emerald-500 font-black uppercase tracking-widest text-xs">¡Todo el stock está al día!</p>}
              </div>
            </div>

            <div className="bg-white rounded-[3rem] border-2 border-slate-100 overflow-hidden shadow-2xl transition-all hover:shadow-blue-100/50">
              <div className="bg-fuchsia-300 p-6 flex justify-between items-center"><h3 className="text-2xl font-black italic text-slate-900 tracking-tighter uppercase">fondo inicial de caja</h3><div className="flex items-center bg-white/40 rounded-xl px-3 border border-white/20"><span className="text-sm font-black">$</span><input type="text" value={cashDrawerFund} onChange={(e) => handleNumericInput(e.target.value, setCashDrawerFund)} className="bg-transparent border-none outline-none w-24 p-2 text-right font-black" placeholder="0" /></div></div>
              <div className="p-8 space-y-4 font-black italic text-slate-700 uppercase text-sm">
                <div className="flex justify-between items-center"><span>Venta Total Registrada</span><span>${stats.ventaTotal.toLocaleString()}</span></div>
                <div className="flex justify-between items-center text-xl font-black text-slate-900 border-t-2 border-slate-900 pt-2 tracking-tighter"><span>TOTAL EN CAJA</span><span>${stats.total1.toLocaleString()}</span></div>
                <div className="flex justify-between items-center text-slate-500 pt-4"><span>Total Tarjetas / Digital (No Efectivo)</span><span className="text-red-400">-${stats.tarjetas.toLocaleString()}</span></div>
                <div className="flex justify-between items-center text-slate-500"><span>Egresos / Pagos Realizados</span><span className="text-red-400">-${stats.egresos.toLocaleString()}</span></div>
                <div className="flex justify-between items-center text-slate-500 pb-2"><span>Retiros de Capital</span><span className="text-red-400">-${stats.retiros.toLocaleString()}</span></div>
                <div className="flex justify-between items-center text-4xl font-black text-slate-900 border-t-4 border-slate-900 pt-4 uppercase tracking-tighter"><span>SALDO REAL EFECTIVO</span><span className="bg-yellow-200 px-6 py-1 rounded-3xl ring-4 ring-yellow-50 shadow-inner">${stats.total2.toLocaleString()}</span></div>
                <div className="mt-8 pt-6 border-t border-dashed opacity-70 flex justify-between items-center text-amber-600 uppercase text-xs font-black tracking-widest italic"><span>DEUDA PENDIENTE PROVEEDORES</span><span>${payments.filter(p => p.status === 'PENDIENTE').reduce((acc, curr) => acc + (curr.remaining_amount || 0), 0).toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER DE CARGA */}
      {loading && (<div className="fixed bottom-10 right-10 bg-white p-5 rounded-3xl shadow-2xl flex items-center gap-4 border z-[1000] animate-pulse"><Loader2 className="animate-spin text-blue-500" size={20} /><span className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Procesando...</span></div>)}
      
      {/* Modal Código de Seguridad */}
      {showVoidModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-sm p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black uppercase flex items-center gap-2"><Ban className="text-red-500" /> ANULAR VENTA</h2><button onClick={() => setShowVoidModal(false)}><X /></button></div>
            <p className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-widest text-center">Código Requerido (1960)</p>
            <input type="password" value={voidCode} onChange={(e) => setVoidCode(e.target.value)} placeholder="••••" className="w-full p-4 bg-slate-50 border-2 rounded-2xl text-center text-3xl font-black outline-none focus:border-red-500 shadow-inner" />
            <div className="grid grid-cols-1 gap-3 mt-6">
              <button onClick={() => handleVoidSale(true)} className="w-full bg-red-500 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-red-600 transition-all">ANULAR Y REINTEGRAR STOCK</button>
              <button onClick={() => handleVoidSale(false)} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-black transition-all">ANULAR SIN REINTEGRAR</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Categorías */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black text-slate-800 uppercase flex items-center gap-2"><Layers className="text-blue-500" /> GESTIÓN CATEGORÍAS</h2><button onClick={() => setShowCategoryModal(false)}><X /></button></div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const name = (e.currentTarget.elements.namedItem('cat_name') as HTMLInputElement).value;
              supabase.from('product_categories').insert({ name, system_type: type }).then(() => { fetchData(); (e.target as HTMLFormElement).reset(); });
            }} className="mb-6 flex gap-2">
              <input name="cat_name" placeholder="Ej: Juguetes, Yerba Compuesta..." required className="flex-1 p-4 bg-slate-50 border rounded-2xl outline-none font-bold" />
              <button type="submit" className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg hover:bg-black active:scale-90 transition-all"><Plus /></button>
            </form>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {categories.map(c => (
                <div key={c.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border transition-all hover:bg-white group"><span className="font-bold text-slate-700 uppercase text-xs">{c.name}</span><button onClick={() => { if(confirm("¿Eliminar?")) supabase.from('product_categories').delete().eq('id', c.id).then(() => fetchData()) }} className="text-red-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Proveedor */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black uppercase tracking-tight">Nuevo Proveedor</h2><button onClick={() => setShowSupplierModal(false)}><X /></button></div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              supabase.from('suppliers').insert({ name: formData.get('name') as string, whatsapp: formData.get('whatsapp') as string, category: type }).then(() => { setShowSupplierModal(false); fetchData(); });
            }} className="space-y-4">
              <div><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Nombre Comercial / Dueño</label><input name="name" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold uppercase" placeholder="Ej: Distribuidora Yerba" /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">WhatsApp (Formato 54911...)</label><input name="whatsapp" placeholder="5491133445566" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" /></div>
              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase shadow-xl hover:bg-black transition-all mt-4 tracking-widest">GUARDAR PROVEEDOR</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetailSystem;
