
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Package, ShoppingCart, Users, TrendingUp, Search, Plus, 
  Trash2, Printer, FileText, PhoneCall, Save, Barcode, ShoppingBag, Leaf, Loader2, X, CreditCard, QrCode, Banknote, RefreshCcw, Filter, AlertTriangle, Percent, Minus, PlusCircle
} from 'lucide-react';
import { Product, Supplier, Sale } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';

interface RetailSystemProps {
  type: 'PETSHOP' | 'MATEANDO';
  onBack: () => void;
}

const RetailSystem: React.FC<RetailSystemProps> = ({ type, onBack }) => {
  const [activeTab, setActiveTab] = useState<'INVENTARIO' | 'VENTAS' | 'PROVEEDORES' | 'CONTROL'>('INVENTARIO');
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [cart, setCart] = useState<{ product: any; qty: number }[]>([]);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [saleSearchTerm, setSaleSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);

  const [formCost, setFormCost] = useState<string>('0');
  const [formMargin, setFormMargin] = useState<string>('30');
  const [formPrice, setFormPrice] = useState<number>(0);

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('EFECTIVO');
  const [selectedBillingType, setSelectedBillingType] = useState<'FACTURA' | 'COMPROBANTE'>('COMPROBANTE');
  
  // Nuevo estado para el tipo de ajuste y el porcentaje (sin signo)
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: prods } = await supabase.from('products').select('*').eq('category', type).order('name', { ascending: true });
      const { data: sups } = await supabase.from('suppliers').select('*').eq('category', type).order('name', { ascending: true });
      const { data: sales } = await supabase.from('sales').select('*, sale_items(*)').eq('system_type', type).order('created_at', { ascending: false });

      if (prods) setProducts(prods);
      if (sups) setSuppliers(sups);
      if (sales) setSalesHistory(sales);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const stockInput = (e.currentTarget.elements.namedItem('stock') as HTMLInputElement).value;
    const stockValue = Number(stockInput);

    if (stockValue < 0) {
      alert("Error: El stock no puede ser negativo.");
      return;
    }

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
      if (editingProduct) {
        ({ error } = await supabase.from('products').update(productData).eq('id', editingProduct.id));
      } else {
        ({ error } = await supabase.from('products').insert(productData));
      }
      if (error) throw error;
      setShowProductModal(false);
      setEditingProduct(null);
      fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const supplierData = {
      name: (e.currentTarget.elements.namedItem('sup_name') as HTMLInputElement).value,
      whatsapp: (e.currentTarget.elements.namedItem('sup_whatsapp') as HTMLInputElement).value,
      category: type
    };

    try {
      let error;
      if (editingSupplier) {
        ({ error } = await supabase.from('suppliers').update(supplierData).eq('id', editingSupplier.id));
      } else {
        ({ error } = await supabase.from('suppliers').insert(supplierData));
      }
      if (error) throw error;
      setShowSupplierModal(false);
      setEditingSupplier(null);
      fetchData();
    } catch (err: any) {
      alert("Error al guardar proveedor: " + err.message);
    }
  };

  const deleteProduct = async (id: string) => {
    if (confirm("¿Borrar producto y TODO su historial de ventas asociado? Esta acción no se puede deshacer.")) {
      setLoading(true);
      try {
        await supabase.from('sale_items').delete().eq('product_id', id);
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        fetchData();
      } catch (err: any) {
        alert("Error al eliminar: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const generatePDF = (saleData: any, items: any[]) => {
    const doc = new jsPDF();
    const isFactura = saleData.billing_type === 'FACTURA';
    const date = new Date(saleData.created_at).toLocaleString();

    doc.setFontSize(22);
    doc.text("VETERINARIA AMAZONIA", 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(isFactura ? "FACTURA ELECTRÓNICA - TIPO B" : "COMPROBANTE DE VENTA", 105, 30, { align: 'center' });
    doc.line(10, 35, 200, 35);
    doc.text(`Fecha: ${date}`, 10, 45);
    doc.text(`Medio de Pago: ${saleData.payment_method}`, 10, 50);
    doc.text(`ID Venta: ${saleData.id.slice(0, 8)}`, 150, 45);
    
    let y = 70;
    doc.setFont("helvetica", "bold");
    doc.text("Producto", 10, y);
    doc.text("Cant.", 120, y);
    doc.text("Subtotal", 180, y, { align: 'right' });
    doc.setFont("helvetica", "normal");
    
    y += 10;
    items.forEach(item => {
      doc.text(item.name.substring(0, 40), 10, y);
      doc.text(item.quantity.toString(), 120, y);
      doc.text(`$${item.subtotal.toFixed(2)}`, 180, y, { align: 'right' });
      y += 8;
    });
    doc.line(10, y, 200, y);
    y += 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL FINAL: $${saleData.total.toFixed(2)}`, 180, y, { align: 'right' });
    doc.save(`Amazonia_Venta_${saleData.id.slice(0,8)}.pdf`);
  };

  const handleCheckout = async () => {
    const subtotal = cart.reduce((acc, curr) => acc + (Number(curr.product.price) * curr.qty), 0);
    const adjNum = parseFloat(adjustmentPercent.replace(',', '.')) || 0;
    const finalAdj = adjustmentType === 'DESCUENTO' ? -Math.abs(adjNum) : Math.abs(adjNum);
    const total = subtotal * (1 + finalAdj / 100);

    const outOfStock = cart.filter(item => item.qty > item.product.stock);
    if (outOfStock.length > 0) {
      alert("Error: Algunos productos ya no tienen stock suficiente.");
      return;
    }

    setLoading(true);
    try {
      const { data: sale, error: saleError } = await supabase.from('sales').insert({
        total,
        payment_method: selectedPaymentMethod,
        billing_type: selectedBillingType,
        system_type: type
      }).select().single();

      if (saleError) throw saleError;
      const items = cart.map(c => ({
        sale_id: sale.id,
        product_id: c.product.id,
        name: c.product.name,
        quantity: c.qty,
        subtotal: (Number(c.product.price) * c.qty) * (1 + finalAdj / 100)
      }));
      await supabase.from('sale_items').insert(items);
      
      for (const item of cart) {
        await supabase.from('products').update({ stock: item.product.stock - item.qty }).eq('id', item.product.id);
      }

      generatePDF(sale, items);
      setCart([]);
      setAdjustmentPercent('0');
      setShowCheckoutModal(false);
      fetchData();
    } catch (error: any) {
      alert("Error al procesar venta: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (p: any) => {
    setCart(prev => {
      const exists = prev.find(item => item.product.id === p.id);
      if ((exists ? exists.qty : 0) >= p.stock) {
        alert("Sin stock disponible.");
        return prev;
      }
      if (exists) return prev.map(item => item.product.id === p.id ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { product: p, qty: 1 }];
    });
  };

  const handleNumericInput = (value: string, setter: (val: string) => void, allowNegative = true) => {
    const regex = allowNegative ? /[^0-9,.-]/g : /[^0-9,.]/g;
    const sanitized = value.replace(regex, '');
    const parts = sanitized.split(/[.,]/);
    if (parts.length > 2) return;
    setter(sanitized);
  };

  const subtotalCart = cart.reduce((a, c) => a + (Number(c.product.price) * c.qty), 0);
  const rawAdj = parseFloat(adjustmentPercent.replace(',', '.')) || 0;
  const adjValue = adjustmentType === 'DESCUENTO' ? -Math.abs(rawAdj) : Math.abs(rawAdj);
  const totalFinal = subtotalCart * (1 + adjValue / 100);

  const filteredSales = salesHistory.filter(sale => {
    const search = saleSearchTerm.toLowerCase();
    const hasItem = sale.sale_items?.some((i: any) => i.name.toLowerCase().includes(search));
    return sale.id.includes(search) || sale.payment_method.toLowerCase().includes(search) || hasItem;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      {/* Modal Checkout */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Finalizar Venta</h2>
              <button onClick={() => setShowCheckoutModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X /></button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Medio de Pago</label>
                <div className="grid grid-cols-2 gap-3">
                  {['EFECTIVO', 'TRANSFERENCIA', 'QR', 'TARJETA'].map(m => (
                    <button key={m} onClick={() => setSelectedPaymentMethod(m)} className={`p-4 rounded-2xl border-2 font-bold transition-all ${selectedPaymentMethod === m ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}>{m}</button>
                  ))}
                </div>
              </div>

              <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-200 relative overflow-hidden">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block text-center">Ajuste de Precio</label>
                
                <div className="flex gap-2 mb-6">
                  <button 
                    onClick={() => setAdjustmentType('DESCUENTO')}
                    className={`flex-1 py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all ${adjustmentType === 'DESCUENTO' ? 'bg-red-500 text-white shadow-lg shadow-red-100' : 'bg-white text-slate-400 border border-slate-100'}`}
                  >
                    <Minus size={14} /> DESCUENTO
                  </button>
                  <button 
                    onClick={() => setAdjustmentType('RECARGO')}
                    className={`flex-1 py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all ${adjustmentType === 'RECARGO' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-white text-slate-400 border border-slate-100'}`}
                  >
                    <PlusCircle size={14} /> RECARGO
                  </button>
                </div>

                <div className="flex items-center justify-center gap-4 relative">
                  <span className={`text-2xl font-black ${adjustmentType === 'DESCUENTO' ? 'text-red-500' : 'text-emerald-500'}`}>
                    {adjustmentType === 'DESCUENTO' ? '-' : '+'}
                  </span>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    value={adjustmentPercent} 
                    onChange={(e) => handleNumericInput(e.target.value, setAdjustmentPercent, false)} 
                    className="w-32 text-center text-5xl font-black bg-transparent outline-none text-slate-800 placeholder:text-slate-200"
                    placeholder="0"
                  />
                  <span className="text-2xl font-black text-slate-300">%</span>
                </div>
                
                <p className="text-[10px] text-center text-slate-400 mt-4 font-bold">Ingrese solo el número del porcentaje</p>
              </div>

              <div className="pt-6 border-t border-slate-100 flex flex-col gap-4">
                <div className="flex justify-between items-center text-sm font-bold text-slate-400">
                  <span>Subtotal</span>
                  <span>${subtotalCart.toFixed(2)}</span>
                </div>
                {adjValue !== 0 && (
                  <div className={`flex justify-between items-center text-sm font-bold ${adjustmentType === 'DESCUENTO' ? 'text-red-500' : 'text-emerald-500'}`}>
                    <span>{adjustmentType === 'DESCUENTO' ? 'Descuento' : 'Recargo'} ({Math.abs(rawAdj)}%)</span>
                    <span>{adjustmentType === 'DESCUENTO' ? '-' : '+'}${Math.abs(totalFinal - subtotalCart).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-5xl font-black text-slate-900 tracking-tighter mt-2">
                  <span>TOTAL</span>
                  <span>${totalFinal.toFixed(2)}</span>
                </div>
                <button 
                  onClick={handleCheckout} 
                  disabled={loading} 
                  className="w-full bg-slate-900 text-white py-7 rounded-[2rem] font-black text-xl shadow-2xl hover:scale-[1.01] transition-all active:scale-95 mt-6"
                >
                  {loading ? <Loader2 className="animate-spin mx-auto" /> : 'CONFIRMAR Y COBRAR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Proveedor */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black">{editingSupplier ? 'Editar' : 'Nuevo'} Proveedor</h2>
              <button onClick={() => setShowSupplierModal(false)}><X /></button>
            </div>
            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Nombre / Razón Social</label>
                <input name="sup_name" defaultValue={editingSupplier?.name} required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">WhatsApp (Sin +)</label>
                <input name="sup_whatsapp" defaultValue={editingSupplier?.whatsapp} required placeholder="54911..." className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <button type="submit" className={`w-full ${colors.primary} text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all`}>
                GUARDAR PROVEEDOR
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Producto */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black">{editingProduct ? 'Editar' : 'Nuevo'} Producto</h2>
              <button onClick={() => setShowProductModal(false)}><X /></button>
            </div>
            <form onSubmit={handleSaveProduct} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase">Nombre del Producto</label>
                <input name="name" defaultValue={editingProduct?.name} required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Código de Barras</label>
                <input name="barcode" defaultValue={editingProduct?.barcode} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Stock Mínimo (Alerta)</label>
                <input name="min_stock" type="number" defaultValue={editingProduct?.min_stock || 5} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" />
              </div>
              <div className="col-span-2 grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">Costo ($)</label>
                  <input type="text" value={formCost} onChange={(e) => handleNumericInput(e.target.value, setFormCost, false)} required className="w-full p-2 bg-white border rounded-lg font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">Margen (%)</label>
                  <input type="text" value={formMargin} onChange={(e) => handleNumericInput(e.target.value, setFormMargin, false)} required className="w-full p-2 bg-white border rounded-lg font-bold" />
                </div>
                <div className="flex flex-col justify-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Venta Final</label>
                  <div className="text-xl font-black text-slate-900">${formPrice}</div>
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase">Stock Actual (No Negativo)</label>
                <input name="stock" type="number" min="0" defaultValue={editingProduct?.stock || 0} required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <button type="submit" className={`col-span-2 ${colors.primary} text-white py-4 rounded-2xl font-black mt-4 shadow-lg active:scale-95 transition-all`}>
                GUARDAR EN INVENTARIO
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className={`${colors.primary} text-white px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50`}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition-colors"><ArrowLeft size={24} /></button>
          <h1 className="text-2xl font-black flex items-center gap-3 tracking-tight">{type === 'PETSHOP' ? <ShoppingBag /> : <Leaf />} Amazonia {type === 'PETSHOP' ? 'Petshop' : 'Mateando'}</h1>
        </div>
        <div className="flex bg-white/20 rounded-[1.5rem] p-1">
          {['INVENTARIO', 'VENTAS', 'PROVEEDORES', 'CONTROL'].map(id => (
            <button key={id} onClick={() => setActiveTab(id as any)} className={`px-6 py-2 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all ${activeTab === id ? 'bg-white text-slate-900 shadow-sm' : 'hover:bg-white/10'}`}>{id}</button>
          ))}
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'INVENTARIO' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input type="text" placeholder="Filtrar por nombre..." className="w-full pl-12 pr-4 py-4 rounded-3xl border border-slate-200 outline-none focus:shadow-md transition-shadow" onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <button onClick={() => { setEditingProduct(null); setFormCost('0'); setFormMargin('30'); setShowProductModal(true); }} className={`${colors.primary} text-white px-10 py-4 rounded-3xl font-black flex items-center gap-2 shadow-xl active:scale-95 transition-all`}><Plus size={20} /> NUEVO PRODUCTO</button>
            </div>
            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                  <tr><th className="px-8 py-6">Producto</th><th className="px-8 py-6">Stock</th><th className="px-8 py-6">Venta</th><th className="px-8 py-6 text-right">Acciones</th></tr>
                </thead>
                <tbody className="divide-y">
                  {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 group">
                      <td className="px-8 py-5">
                        <p className="font-black text-slate-800">{p.name}</p>
                        <p className="text-[10px] font-mono text-slate-300">{p.barcode || 'S/B'}</p>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`font-black text-lg ${p.stock <= p.min_stock ? 'text-red-500' : 'text-slate-900'}`}>{p.stock}</span>
                        {p.stock <= p.min_stock && <span className="ml-3 bg-red-100 text-red-700 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter">REPONER</span>}
                      </td>
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

        {activeTab === 'VENTAS' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-8">
              <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Caja Registradora</h3>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input type="text" placeholder="Filtrar..." className="w-full pl-10 pr-4 py-2 text-xs border rounded-2xl" onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-h-[45vh] overflow-y-auto pr-2">
                  {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => {
                    const out = p.stock <= 0;
                    return (
                      <button key={p.id} onClick={() => !out && handleAddToCart(p)} disabled={out} className={`p-6 border-2 rounded-[2rem] transition-all text-left relative overflow-hidden active:scale-95 ${out ? 'opacity-50 border-slate-100 grayscale' : 'border-slate-50 hover:border-blue-400 bg-slate-50/30'}`}>
                        {out && <div className="absolute top-0 right-0 bg-red-500 text-white px-3 py-1 text-[8px] font-black rotate-45 translate-x-3 -translate-y-1">SIN STOCK</div>}
                        <p className="font-black text-slate-800 truncate mb-1">{p.name}</p>
                        <div className="flex justify-between items-end">
                          <span className="text-2xl font-black text-slate-900">${p.price}</span>
                          <span className="text-[10px] font-black text-slate-400">Stock: {p.stock}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200">
                <h3 className="text-xl font-black mb-6 flex items-center gap-2"><RefreshCcw className="text-slate-300" /> Historial de Ventas</h3>
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                  {filteredSales.map(sale => (
                    <div key={sale.id} className="p-5 bg-slate-50 border border-slate-100 rounded-[2rem] flex justify-between items-center group">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">#{sale.id.slice(0,8)}</span>
                          <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg uppercase">{sale.payment_method}</span>
                          <span className="text-[10px] text-slate-400 font-bold">{new Date(sale.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium truncate">
                          {sale.sale_items?.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-2xl font-black text-slate-900">${sale.total.toFixed(2)}</p>
                        <button onClick={() => generatePDF(sale, sale.sale_items || [])} className="p-4 bg-white border border-slate-100 rounded-2xl hover:shadow-lg transition-all"><Printer size={20} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1 bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100 h-fit sticky top-24">
              <h3 className="text-xl font-black mb-8 text-slate-800 flex items-center gap-2"><ShoppingCart /> Carrito</h3>
              <div className="space-y-6 mb-8 max-h-[30vh] overflow-y-auto pr-2">
                {cart.length === 0 ? <p className="text-center text-slate-400 py-10 font-bold italic">Vacío</p> : cart.map(item => (
                  <div key={item.product.id} className="flex justify-between items-center animate-in slide-in-from-right-2">
                    <div className="flex-1 pr-4">
                      <p className="font-black text-sm text-slate-800 truncate">{item.product.name}</p>
                      <p className="text-[10px] font-bold text-slate-400">{item.qty} un x ${item.product.price}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-black text-slate-900">${(item.qty * item.product.price).toFixed(2)}</p>
                      <button onClick={() => setCart(prev => prev.filter(i => i.product.id !== item.product.id))} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t-2 border-dashed border-slate-100 pt-6 mb-8">
                <div className="flex justify-between items-center text-4xl font-black text-slate-900 tracking-tighter"><span>${subtotalCart.toFixed(2)}</span></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Subtotal de la compra</p>
              </div>
              <button onClick={() => setShowCheckoutModal(true)} disabled={cart.length === 0} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-lg tracking-tight shadow-xl active:scale-95 disabled:opacity-50 transition-all">
                FINALIZAR COMPRA
              </button>
            </div>
          </div>
        )}

        {activeTab === 'PROVEEDORES' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">Agenda de Proveedores</h2>
              <button onClick={() => { setEditingSupplier(null); setShowSupplierModal(true); }} className={`${colors.primary} text-white px-10 py-4 rounded-3xl font-black flex items-center gap-2 active:scale-95 transition-all shadow-xl`}><Plus size={20} /> AGREGAR PROVEEDOR</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {suppliers.map(s => (
                <div key={s.id} className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col items-center text-center group hover:shadow-2xl transition-all duration-300">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Users className="text-slate-300" size={32} /></div>
                  <h3 className="text-2xl font-black text-slate-800 mb-1">{s.name}</h3>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-10">Contacto Directo</p>
                  <div className="flex w-full gap-3">
                    <a href={`https://wa.me/${s.whatsapp}`} target="_blank" className="flex-2 bg-green-500 text-white py-4 px-6 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-green-600 transition-colors shadow-lg shadow-green-100"><PhoneCall size={18} /> PEDIR</a>
                    <button onClick={() => { setEditingSupplier(s); setShowSupplierModal(true); }} className="p-4 bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl hover:text-blue-500 transition-colors"><Save size={20} /></button>
                    <button onClick={() => { if(confirm("¿Eliminar proveedor?")) supabase.from('suppliers').delete().eq('id', s.id).then(() => fetchData()); }} className="p-4 bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'CONTROL' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Fondos para Reposición</p>
                <p className={`text-5xl font-black ${type === 'MATEANDO' ? 'text-emerald-600' : 'text-amber-600'} tracking-tighter`}>${salesHistory.reduce((total, sale) => total + (sale.sale_items?.reduce((acc: number, item: any) => acc + ((products.find(p => p.id === item.product_id)?.cost || 0) * item.quantity), 0) || 0), 0).toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-4 italic leading-relaxed">Este monto representa el costo de la mercadería vendida que debe reservarse.</p>
              </div>
              <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Ventas Brutas Totales</p>
                <p className="text-5xl font-black text-slate-900 tracking-tighter">${salesHistory.reduce((a, s) => a + Number(s.total), 0).toLocaleString()}</p>
              </div>
              <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Ganancia Estimada</p>
                <p className="text-5xl font-black text-blue-600 tracking-tighter">${(salesHistory.reduce((a, s) => a + Number(s.total), 0) - salesHistory.reduce((total, sale) => total + (sale.sale_items?.reduce((acc: number, item: any) => acc + ((products.find(p => p.id === item.product_id)?.cost || 0) * item.quantity), 0) || 0), 0)).toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-slate-100">
              <h3 className="text-2xl font-black text-slate-800 mb-10 tracking-tight">Análisis de Stock</h3>
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={products.slice(0, 15)}>
                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                    <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8'}} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="stock" radius={[12, 12, 12, 12]} barSize={45}>
                      {products.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.stock <= 0 ? '#ef4444' : entry.stock <= entry.min_stock ? '#f97316' : (type === 'MATEANDO' ? '#10b981' : '#f59e0b')} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {loading && (
        <div className="fixed bottom-10 right-10 bg-white p-5 rounded-3xl shadow-2xl flex items-center gap-4 border border-slate-100 z-[100] animate-pulse">
          <Loader2 className="animate-spin text-blue-500" size={20} />
          <span className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Sincronizando Amazonia...</span>
        </div>
      )}
    </div>
  );
};

export default RetailSystem;
