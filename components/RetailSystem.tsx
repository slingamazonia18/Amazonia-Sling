
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Package, ShoppingCart, Users, TrendingUp, Search, Plus, 
  Trash2, Printer, FileText, PhoneCall, Save, Barcode, ShoppingBag, Leaf, Loader2, X, CreditCard, QrCode, Banknote, RefreshCcw, Filter, AlertTriangle
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

  // Estados como STRINGS para permitir que el campo esté vacío y manejar decimales con coma/punto
  const [formCost, setFormCost] = useState<string>('0');
  const [formMargin, setFormMargin] = useState<string>('30');
  const [formPrice, setFormPrice] = useState<number>(0);

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('EFECTIVO');
  const [selectedBillingType, setSelectedBillingType] = useState<'FACTURA' | 'COMPROBANTE'>('COMPROBANTE');

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

  // Al cambiar costo o margen (strings), calculamos el precio final (number)
  useEffect(() => {
    const costNum = parseFloat(formCost.replace(',', '.')) || 0;
    const marginNum = parseFloat(formMargin.replace(',', '.')) || 0;
    const calculated = costNum * (1 + marginNum / 100);
    setFormPrice(Number(calculated.toFixed(2)));
  }, [formCost, formMargin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: prods, error: pErr } = await supabase.from('products').select('*').eq('category', type).order('name', { ascending: true });
      const { data: sups, error: sErr } = await supabase.from('suppliers').select('*').eq('category', type).order('name', { ascending: true });
      const { data: sales, error: slErr } = await supabase.from('sales').select('*, sale_items(*)').eq('system_type', type).order('created_at', { ascending: false });

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
    const productData = {
      name: (e.currentTarget.elements.namedItem('name') as HTMLInputElement).value,
      barcode: (e.currentTarget.elements.namedItem('barcode') as HTMLInputElement).value,
      stock: Number((e.currentTarget.elements.namedItem('stock') as HTMLInputElement).value),
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
      alert("Error al guardar: " + err.message);
    }
  };

  const deleteProduct = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este producto?")) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) {
          if (error.code === '23503') {
            alert("No se puede eliminar el producto porque ya tiene ventas registradas. Puede cambiar el stock a 0 en su lugar.");
          } else {
            throw error;
          }
        } else {
          fetchData();
        }
      } catch (err: any) {
        alert("Error al eliminar: " + err.message);
      }
    }
  };

  const generatePDF = (saleData: any, items: any[]) => {
    const doc = new jsPDF();
    const isFactura = saleData.billing_type === 'FACTURA';
    const date = new Date(saleData.created_at).toLocaleString();

    doc.setFontSize(22);
    doc.setTextColor(40);
    doc.text("VETERINARIA AMAZONIA", 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(isFactura ? "FACTURA ELECTRÓNICA - TIPO B" : "COMPROBANTE DE VENTA (NO VÁLIDO COMO FACTURA)", 105, 30, { align: 'center' });
    doc.setDrawColor(200);
    doc.line(10, 35, 200, 35);
    doc.setFontSize(10);
    doc.text(`Fecha: ${date}`, 10, 45);
    doc.text(`Sistema: ${saleData.system_type}`, 10, 50);
    doc.text(`Medio de Pago: ${saleData.payment_method}`, 10, 55);
    doc.text(`ID Venta: ${saleData.id.slice(0, 8)}`, 150, 45);
    doc.setFont("helvetica", "bold");
    doc.text("Producto", 10, 70);
    doc.text("Cant.", 120, 70);
    doc.text("P. Unit", 150, 70);
    doc.text("Subtotal", 180, 70);
    doc.setFont("helvetica", "normal");
    
    let y = 78;
    items.forEach(item => {
      doc.text(item.name.substring(0, 40), 10, y);
      doc.text(item.quantity.toString(), 120, y);
      doc.text(`$${(item.subtotal / item.quantity).toFixed(2)}`, 150, y);
      doc.text(`$${item.subtotal.toFixed(2)}`, 180, y);
      y += 8;
    });
    doc.line(10, y, 200, y);
    y += 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: $${saleData.total.toFixed(2)}`, 180, y, { align: 'right' });

    if (isFactura) {
      doc.setFontSize(8);
      doc.text("CAE: 74291837429183", 10, y + 10);
      doc.text("Vto CAE: 31/12/2024", 10, y + 15);
      doc.setFillColor(240, 240, 240);
      doc.rect(10, y + 20, 30, 30, 'F');
      doc.text("[ QR ARCA ]", 15, y + 38);
    }
    doc.save(`Amazonia_${isFactura ? 'Factura' : 'Ticket'}_${saleData.id.slice(0,8)}.pdf`);
  };

  const handleCheckout = async () => {
    const total = cart.reduce((acc, curr) => acc + (Number(curr.product.price) * curr.qty), 0);
    if (total === 0) return;

    const outOfStock = cart.filter(item => item.qty > item.product.stock);
    if (outOfStock.length > 0) {
      alert(`Error: Stock insuficiente para los siguientes productos: \n${outOfStock.map(i => `- ${i.product.name} (Disponible: ${i.product.stock})`).join('\n')}`);
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
        subtotal: Number(c.product.price) * c.qty
      }));
      const { error: itemError } = await supabase.from('sale_items').insert(items);
      if (itemError) throw itemError;
      
      for (const item of cart) {
        const newStock = item.product.stock - item.qty;
        await supabase.from('products').update({ stock: newStock }).eq('id', item.product.id);
      }

      generatePDF(sale, items);
      setCart([]);
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
      const currentQty = exists ? exists.qty : 0;
      
      if (currentQty >= p.stock) {
        alert(`Stock máximo alcanzado para ${p.name}. (Disponible: ${p.stock})`);
        return prev;
      }

      if (exists) {
        return prev.map(item => item.product.id === p.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { product: p, qty: 1 }];
    });
  };

  const handleNumericInput = (value: string, setter: (val: string) => void) => {
    // Permite números y un solo separador decimal (coma o punto), bloquea letras
    const sanitized = value.replace(/[^0-9,.]/g, '');
    // Asegura que solo haya un punto o coma
    const parts = sanitized.split(/[.,]/);
    if (parts.length > 2) return;
    setter(sanitized);
  };

  const filteredSales = salesHistory.filter(sale => {
    const search = saleSearchTerm.toLowerCase();
    const hasItem = sale.sale_items?.some((i: any) => i.name.toLowerCase().includes(search));
    const dateStr = new Date(sale.created_at).toLocaleString().toLowerCase();
    return sale.id.includes(search) || sale.payment_method.toLowerCase().includes(search) || hasItem || dateStr.includes(search);
  });

  const reposicionActual = salesHistory.reduce((total, sale) => {
    const saleCost = sale.sale_items?.reduce((acc: number, item: any) => {
      const product = products.find(p => p.id === item.product_id);
      return acc + ((product?.cost || 0) * item.quantity);
    }, 0) || 0;
    return total + saleCost;
  }, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black text-slate-800">Finalizar Venta</h2>
              <button onClick={() => setShowCheckoutModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
            </div>
            <div className="space-y-8">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-4">1. Medio de Pago</label>
                <div className="grid grid-cols-2 gap-3">
                  {['EFECTIVO', 'TRANSFERENCIA', 'QR', 'TARJETA'].map(m => (
                    <button key={m} onClick={() => setSelectedPaymentMethod(m)} className={`p-4 rounded-2xl border-2 font-bold transition-all ${selectedPaymentMethod === m ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}>{m}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-4">2. Documento</label>
                <div className="flex gap-4">
                  <button onClick={() => setSelectedBillingType('COMPROBANTE')} className={`flex-1 p-5 rounded-2xl border-2 font-black transition-all ${selectedBillingType === 'COMPROBANTE' ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-slate-100 text-slate-400'}`}>TICKET</button>
                  <button onClick={() => setSelectedBillingType('FACTURA')} className={`flex-1 p-5 rounded-2xl border-2 font-black transition-all ${selectedBillingType === 'FACTURA' ? 'border-blue-600 bg-blue-600 text-white shadow-lg' : 'border-slate-100 text-slate-400'}`}>FACTURA ARCA</button>
                </div>
              </div>
              <div className="pt-6 border-t flex flex-col gap-4">
                <div className="flex justify-between items-center text-3xl font-black"><span>TOTAL</span><span>${cart.reduce((a, c) => a + (Number(c.product.price) * c.qty), 0).toFixed(2)}</span></div>
                <button onClick={handleCheckout} disabled={loading} className="w-full bg-blue-600 text-white py-6 rounded-[1.5rem] font-black text-xl shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3">
                  {loading ? <Loader2 className="animate-spin" /> : 'CONFIRMAR COBRO'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{editingProduct ? 'Editar' : 'Nuevo'} Producto</h2>
              <button onClick={() => setShowProductModal(false)}><X /></button>
            </div>
            <form onSubmit={handleSaveProduct} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nombre</label>
                <input name="name" defaultValue={editingProduct?.name} required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cod. Barras</label>
                <input name="barcode" defaultValue={editingProduct?.barcode} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Stock Mínimo</label>
                <input name="min_stock" type="number" defaultValue={editingProduct?.min_stock || 5} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" />
              </div>
              <div className="col-span-2 grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase">Costo ($)</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    value={formCost} 
                    onChange={(e) => handleNumericInput(e.target.value, setFormCost)} 
                    required 
                    className="w-full p-2 bg-white border rounded-lg font-bold outline-blue-500" 
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase">Margen (%)</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    value={formMargin} 
                    onChange={(e) => handleNumericInput(e.target.value, setFormMargin)} 
                    required 
                    className="w-full p-2 bg-white border rounded-lg font-bold outline-blue-500" 
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase">Precio Final</label>
                  <div className="w-full p-2 bg-slate-900 text-white border border-slate-900 rounded-lg font-black text-center">${formPrice}</div>
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Stock Actual</label>
                <input name="stock" type="number" defaultValue={editingProduct?.stock || 0} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" />
              </div>
              <button type="submit" className={`col-span-2 ${colors.primary} text-white py-4 rounded-2xl font-black mt-4 shadow-lg active:scale-95 transition-all`}>
                GUARDAR PRODUCTO
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Nav */}
      <nav className={`${colors.primary} text-white px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50`}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full"><ArrowLeft size={24} /></button>
          <h1 className="text-2xl font-bold flex items-center gap-3">{type === 'PETSHOP' ? <ShoppingBag /> : <Leaf />} Amazonia {type === 'PETSHOP' ? 'Petshop' : 'Mateando'}</h1>
        </div>
        <div className="flex bg-white/20 rounded-xl p-1">
          {['INVENTARIO', 'VENTAS', 'PROVEEDORES', 'CONTROL'].map(id => (
            <button key={id} onClick={() => setActiveTab(id as any)} className={`px-4 py-2 rounded-lg font-bold text-xs tracking-widest uppercase transition-all ${activeTab === id ? 'bg-white text-slate-900 shadow-sm' : 'hover:bg-white/10'}`}>{id}</button>
          ))}
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'INVENTARIO' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input type="text" placeholder="Buscar productos..." className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 outline-none" onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <button onClick={() => { 
                setEditingProduct(null); 
                setFormCost('0');
                setFormMargin('30');
                setShowProductModal(true); 
              }} className={`${colors.primary} text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg active:scale-95 transition-all`}>
                <Plus size={20} /> NUEVO PRODUCTO
              </button>
            </div>
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  <tr>
                    <th className="px-6 py-5">Producto</th>
                    <th className="px-6 py-5">Stock</th>
                    <th className="px-6 py-5">Costo</th>
                    <th className="px-6 py-5">Precio</th>
                    <th className="px-6 py-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 group">
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-800">{p.name}</p>
                        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">{p.barcode || 'SIN BARRAS'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-black ${p.stock <= p.min_stock ? 'text-red-500' : 'text-slate-900'}`}>{p.stock}</span>
                        {p.stock <= p.min_stock && <span className="ml-2 bg-red-100 text-red-700 px-2 py-0.5 rounded text-[8px] font-black uppercase">{p.stock <= 0 ? 'SIN STOCK' : 'REPONER'}</span>}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-500">${p.cost}</td>
                      <td className="px-6 py-4 font-black text-slate-900">${p.price}</td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { 
                          setEditingProduct(p); 
                          setFormCost(p.cost.toString());
                          setFormMargin(p.margin.toString());
                          setShowProductModal(true); 
                        }} className="p-3 text-blue-500 hover:bg-blue-50 rounded-xl"><Save size={18} /></button>
                        <button onClick={() => deleteProduct(p.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'VENTAS' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-black text-slate-800">Caja Registradora</h3>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input type="text" placeholder="Filtrar productos..." className="w-full pl-10 pr-4 py-2 text-xs border rounded-xl" onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-h-[40vh] overflow-y-auto pr-2">
                  {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => {
                    const isOutOfStock = p.stock <= 0;
                    return (
                      <button 
                        key={p.id} 
                        onClick={() => !isOutOfStock && handleAddToCart(p)} 
                        disabled={isOutOfStock}
                        className={`p-4 border-2 rounded-2xl transition-all text-left bg-white active:scale-95 group relative overflow-hidden ${isOutOfStock ? 'border-slate-100 opacity-60 grayscale' : 'border-slate-100 hover:border-blue-500'}`}
                      >
                        {isOutOfStock && (
                          <div className="absolute top-0 right-0 bg-red-500 text-white px-3 py-1 text-[8px] font-black uppercase rotate-45 translate-x-3 -translate-y-1 shadow-md">
                            AGOTADO
                          </div>
                        )}
                        <p className="font-black text-slate-800 truncate">{p.name}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className={`font-black text-lg ${isOutOfStock ? 'text-slate-400' : 'text-blue-600'}`}>${p.price}</span>
                          <span className={`text-[10px] font-black uppercase ${isOutOfStock ? 'text-red-500' : 'text-slate-300'}`}>Stock: {p.stock}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><RefreshCcw className="text-slate-400" size={20}/> Historial de Ventas</h3>
                  <div className="relative w-72">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Buscar por ID, producto o fecha..." className="w-full pl-10 pr-4 py-3 rounded-xl border outline-none text-sm" value={saleSearchTerm} onChange={(e) => setSaleSearchTerm(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                  {filteredSales.map(sale => (
                    <div key={sale.id} className="p-4 bg-slate-50 border rounded-2xl flex justify-between items-center group">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">#{sale.id.slice(0,8)}</span>
                          <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded uppercase">{sale.payment_method}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{new Date(sale.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-slate-600 font-bold truncate">
                          {sale.sale_items?.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-xl font-black text-slate-900">${sale.total.toFixed(2)}</p>
                        <button onClick={() => generatePDF(sale, sale.sale_items || [])} className="p-3 bg-white border rounded-xl hover:shadow-md active:scale-90 transition-all"><Printer size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200 h-fit sticky top-24">
              <h3 className="text-xl font-black mb-8 text-slate-800">Carrito</h3>
              <div className="space-y-6 mb-8 max-h-[35vh] overflow-y-auto pr-2">
                {cart.length === 0 ? <p className="text-center text-slate-400 py-10 font-bold">Vacío</p> : cart.map(item => (
                  <div key={item.product.id} className="flex justify-between items-center">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-black text-sm text-slate-800 truncate">{item.product.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{item.qty} un x ${item.product.price}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-black text-slate-900">${(item.qty * item.product.price).toFixed(2)}</p>
                      <button onClick={() => setCart(prev => prev.filter(i => i.product.id !== item.product.id))} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t-2 border-dashed border-slate-100 pt-6 mb-8">
                <div className="flex justify-between items-center text-3xl font-black text-slate-900">
                  <span>TOTAL</span>
                  <span>${cart.reduce((a, c) => a + (Number(c.product.price) * c.qty), 0).toFixed(2)}</span>
                </div>
              </div>
              <button 
                onClick={() => setShowCheckoutModal(true)} 
                disabled={cart.length === 0} 
                className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-lg tracking-tight shadow-xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {cart.some(i => i.qty > i.product.stock) ? <AlertTriangle size={20} /> : null}
                {cart.some(i => i.qty > i.product.stock) ? 'STOCK INSUFICIENTE' : 'COBRAR VENTA'}
              </button>
              {cart.some(i => i.qty > i.product.stock) && (
                <p className="mt-4 text-[10px] font-black text-red-500 uppercase text-center animate-pulse">Hay productos que superan el stock disponible.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'CONTROL' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Reserva Reposición (Costo)</p>
                <p className={`text-4xl font-black ${type === 'MATEANDO' ? 'text-emerald-600' : 'text-amber-600'}`}>${reposicionActual.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-2 italic">Esto es lo recaudado para reponer stock.</p>
              </div>
              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Ventas Brutas</p>
                <p className="text-4xl font-black text-slate-900">${salesHistory.reduce((a, s) => a + Number(s.total), 0).toLocaleString()}</p>
              </div>
              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Margen Estimado</p>
                <p className="text-4xl font-black text-blue-600">${(salesHistory.reduce((a, s) => a + Number(s.total), 0) - reposicionActual).toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200">
              <h3 className="text-2xl font-black text-slate-800 mb-8">Niveles de Inventario</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={products.slice(0, 15)}>
                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} fontSize={10} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="stock" radius={[10, 10, 0, 0]} barSize={40}>
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

        {activeTab === 'PROVEEDORES' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-800">Proveedores de {type}</h2>
              <button onClick={() => { setEditingSupplier(null); setShowSupplierModal(true); }} className={`${colors.primary} text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 active:scale-95 transition-all shadow-lg`}><Plus size={20} /> NUEVO PROVEEDOR</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {suppliers.map(s => (
                <div key={s.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center group hover:shadow-xl transition-all">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Users className="text-slate-300" /></div>
                  <h3 className="text-xl font-black text-slate-800 mb-1">{s.name}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-8">WhatsApp: {s.whatsapp}</p>
                  <div className="flex w-full gap-2">
                    <a href={`https://wa.me/${s.whatsapp}`} target="_blank" className="flex-1 bg-green-500 text-white py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-green-600 transition-colors"><PhoneCall size={18} /> PEDIR</a>
                    <button onClick={() => { setEditingSupplier(s); setShowSupplierModal(true); }} className="p-3 border rounded-2xl hover:bg-slate-50"><Save size={18} /></button>
                    <button onClick={() => {
                      if(confirm("Eliminar proveedor?")) {
                        supabase.from('suppliers').delete().eq('id', s.id).then(() => fetchData());
                      }
                    }} className="p-3 border rounded-2xl hover:bg-red-50 text-red-400"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      
      {loading && (
        <div className="fixed bottom-10 right-10 bg-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 border z-[100] animate-pulse">
          <Loader2 className="animate-spin text-blue-500" />
          <span className="font-bold text-xs uppercase tracking-widest text-slate-500">Amazonia Sincronizando...</span>
        </div>
      )}
    </div>
  );
};

export default RetailSystem;
