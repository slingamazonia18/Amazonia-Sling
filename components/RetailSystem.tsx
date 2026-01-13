
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Package, ShoppingCart, Users, TrendingUp, Search, Plus, 
  Trash2, Printer, FileText, PhoneCall, Save, Barcode, ShoppingBag, Leaf, Loader2, X
} from 'lucide-react';
import { Product, Supplier, Sale } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '../lib/supabase';

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
  const [loading, setLoading] = useState(true);
  
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: prods, error: pErr } = await supabase.from('products').select('*').eq('category', type);
      const { data: sups, error: sErr } = await supabase.from('suppliers').select('*').eq('category', type);
      const { data: sales, error: slErr } = await supabase.from('sales').select('*, sale_items(*)').eq('system_type', type).order('created_at', { ascending: false });

      if (pErr) console.error("Error productos:", pErr);
      if (sErr) console.error("Error proveedores:", sErr);
      if (slErr) console.error("Error ventas:", slErr);

      if (prods) setProducts(prods);
      if (sups) setSuppliers(sups);
      if (sales) setSalesHistory(sales);
    } catch (error) {
      console.error("Error general fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const productData = {
      name: formData.get('name'),
      barcode: formData.get('barcode'),
      stock: Number(formData.get('stock')),
      min_stock: Number(formData.get('min_stock')),
      cost: Number(formData.get('cost')),
      margin: Number(formData.get('margin')),
      price: Number(formData.get('price')),
      category: type
    };

    try {
      let error;
      if (editingProduct) {
        ({ error } = await supabase.from('products').update(productData).eq('id', editingProduct.id));
      } else {
        ({ error } = await supabase.from('products').insert(productData));
      }
      
      if (error) {
        alert("Error Supabase: " + error.message);
      } else {
        setShowProductModal(false);
        setEditingProduct(null);
        fetchData();
      }
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const supplierData = {
      name: formData.get('name'),
      whatsapp: formData.get('whatsapp'),
      category: type
    };

    try {
      let error;
      if (editingSupplier) {
        ({ error } = await supabase.from('suppliers').update(supplierData).eq('id', editingSupplier.id));
      } else {
        ({ error } = await supabase.from('suppliers').insert(supplierData));
      }

      if (error) {
        alert("Error Supabase: " + error.message);
      } else {
        setShowSupplierModal(false);
        setEditingSupplier(null);
        fetchData();
      }
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
    }
  };

  const deleteProduct = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este producto?")) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) alert(error.message);
      else fetchData();
    }
  };

  const deleteSupplier = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este proveedor?")) {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) alert(error.message);
      else fetchData();
    }
  };

  const addToCart = (p: Product) => {
    setCart(prev => {
      const exists = prev.find(item => item.product.id === p.id);
      if (exists) return prev.map(item => item.product.id === p.id ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { product: p, qty: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.product.id !== id));
  };

  const calculateTotal = () => cart.reduce((acc, curr) => acc + (Number(curr.product.price) * curr.qty), 0);

  const handleCheckout = async (method: string, billingType: string) => {
    const total = calculateTotal();
    if (total === 0) return;
    setLoading(true);
    
    try {
      const { data: sale, error: saleError } = await supabase.from('sales').insert({
        total,
        payment_method: method,
        billing_type: billingType,
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
        await supabase.from('products').update({ stock: item.product.stock - item.qty }).eq('id', item.product.id);
      }

      setCart([]);
      fetchData();
      alert(`Venta exitosa!`);
    } catch (error: any) {
      alert("Error al procesar venta: " + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  const totalVentasHoy = salesHistory.reduce((acc, sale) => acc + Number(sale.total), 0);
  const itemsCriticos = products.filter(p => p.stock <= p.min_stock).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
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
                <label className="text-xs font-bold text-slate-400">Nombre</label>
                <input name="name" defaultValue={editingProduct?.name} required className="w-full p-3 bg-slate-50 border rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400">Cod. Barras</label>
                <input name="barcode" defaultValue={editingProduct?.barcode} className="w-full p-3 bg-slate-50 border rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400">Stock Actual</label>
                <input name="stock" type="number" defaultValue={editingProduct?.stock || 0} className="w-full p-3 bg-slate-50 border rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400">Stock Mínimo</label>
                <input name="min_stock" type="number" defaultValue={editingProduct?.min_stock || 0} className="w-full p-3 bg-slate-50 border rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400">Costo ($)</label>
                <input name="cost" type="number" step="0.01" defaultValue={editingProduct?.cost || 0} className="w-full p-3 bg-slate-50 border rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400">Margen (%)</label>
                <input name="margin" type="number" defaultValue={editingProduct?.margin || 30} className="w-full p-3 bg-slate-50 border rounded-xl" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-400">Precio de Venta ($)</label>
                <input name="price" type="number" step="0.01" defaultValue={editingProduct?.price || 0} className="w-full p-3 bg-slate-900 text-white border rounded-xl" />
              </div>
              <button type="submit" className={`col-span-2 ${colors.primary} text-white py-4 rounded-xl font-bold mt-4 shadow-lg transition-all active:scale-95`}>
                Guardar Producto
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{editingSupplier ? 'Editar' : 'Nuevo'} Proveedor</h2>
              <button onClick={() => setShowSupplierModal(false)}><X /></button>
            </div>
            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nombre de la Empresa</label>
                <input name="name" defaultValue={editingSupplier?.name} required className="w-full p-3 bg-slate-50 border rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">WhatsApp (incluir código de país)</label>
                <input name="whatsapp" placeholder="Ej: 54911..." defaultValue={editingSupplier?.whatsapp} required className="w-full p-3 bg-slate-50 border rounded-xl" />
              </div>
              <button type="submit" className={`w-full ${colors.primary} text-white py-4 rounded-xl font-bold mt-4 shadow-lg transition-all active:scale-95`}>
                Guardar Proveedor
              </button>
            </form>
          </div>
        </div>
      )}

      <nav className={`${colors.primary} text-white px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50`}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition-colors"><ArrowLeft size={24} /></button>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            {type === 'PETSHOP' ? <ShoppingBag /> : <Leaf />}
            Amazonia {type === 'PETSHOP' ? 'Petshop' : 'Mateando'}
          </h1>
        </div>
        <div className="flex bg-white/20 rounded-xl p-1 overflow-x-auto max-w-[50vw]">
          {['INVENTARIO', 'VENTAS', 'PROVEEDORES', 'CONTROL'].map(id => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === id ? 'bg-white text-slate-900 shadow-sm' : 'hover:bg-white/10'}`}
            >
              {id.charAt(0) + id.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'INVENTARIO' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input type="text" placeholder="Buscar productos..." className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none" onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <button onClick={() => { setEditingProduct(null); setShowProductModal(true); }} className={`${colors.primary} text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-transform active:scale-95`}>
                <Plus size={20} /> Nuevo Producto
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-slate-50 border-b text-xs font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Producto</th>
                    <th className="px-6 py-4">Barras</th>
                    <th className="px-6 py-4">Stock</th>
                    <th className="px-6 py-4">Precio</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 group">
                      <td className="px-6 py-4 font-bold">{p.name}</td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">{p.barcode || '-'}</td>
                      <td className="px-6 py-4 font-medium">{p.stock}</td>
                      <td className="px-6 py-4 font-black text-slate-900">${p.price}</td>
                      <td className="px-6 py-4">
                        {p.stock <= p.min_stock ? (
                          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black">REPONER</span>
                        ) : (
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black">OK</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingProduct(p); setShowProductModal(true); }} className="text-blue-500 p-2 hover:bg-blue-50 rounded-lg"><Save size={18} /></button>
                        <button onClick={() => deleteProduct(p.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center text-slate-400">No hay productos registrados</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'VENTAS' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">Selección de Productos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2">
                  {products.filter(p => p.stock > 0).map(p => (
                    <button key={p.id} onClick={() => addToCart(p)} className="p-4 border rounded-xl hover:border-blue-500 hover:bg-blue-50 text-left transition-all group active:scale-[0.98]">
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-blue-600 font-black">${p.price}</span>
                        <span className="text-[10px] text-slate-400">Stock: {p.stock}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <h3 className="text-lg font-bold mb-4">Ventas Recientes</h3>
                <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-2">
                  {salesHistory.slice(0,10).map(sale => (
                    <div key={sale.id} className="p-3 border rounded-xl flex justify-between items-center bg-slate-50">
                      <div>
                        <p className="font-bold text-slate-800">${sale.total} <span className="text-[10px] font-normal text-slate-400">- {sale.payment_method}</span></p>
                        <p className="text-[10px] text-slate-400">{new Date(sale.created_at).toLocaleString()}</p>
                      </div>
                      <button className="p-2 hover:bg-white rounded-lg border shadow-sm"><Printer size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 h-fit sticky top-24">
              <h3 className="text-xl font-black mb-6">Carrito de Venta</h3>
              <div className="space-y-4 mb-6 max-h-[300px] overflow-auto pr-2">
                {cart.length === 0 ? <p className="text-center text-slate-400 py-10">Sin items</p> : cart.map(item => (
                  <div key={item.product.id} className="flex justify-between items-center animate-in fade-in slide-in-from-right-2">
                    <div className="flex-1">
                      <p className="font-bold text-sm truncate">{item.product.name}</p>
                      <p className="text-xs text-slate-400">{item.qty} x ${item.product.price}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-800">${Number(item.product.price) * item.qty}</span>
                      <button onClick={() => removeFromCart(item.product.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 text-2xl font-black flex justify-between mb-6 text-slate-900">
                <span>TOTAL</span>
                <span>${calculateTotal()}</span>
              </div>
              <div className="space-y-2">
                <button onClick={() => handleCheckout('TARJETA', 'FACTURA')} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-colors active:scale-95">Facturar ARCA (AFIP)</button>
                <button onClick={() => handleCheckout('EFECTIVO', 'COMPROBANTE')} className="w-full border-2 border-slate-200 py-4 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-colors active:scale-95">Solo Comprobante</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'PROVEEDORES' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-800">Directorio de Proveedores</h2>
              <button onClick={() => { setEditingSupplier(null); setShowSupplierModal(true); }} className={`${colors.primary} text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95`}>
                <Plus size={20} /> Nuevo Proveedor
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suppliers.map(s => (
                <div key={s.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center group transition-all hover:shadow-md">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Users className="text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">{s.name}</h3>
                  <p className="text-sm text-slate-400 mb-6">WhatsApp: {s.whatsapp}</p>
                  <div className="w-full flex gap-2">
                    <a 
                      href={`https://wa.me/${s.whatsapp}`} 
                      target="_blank" 
                      className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 transition-colors"
                    >
                      <PhoneCall size={18} /> Pedir
                    </a>
                    <button onClick={() => { setEditingSupplier(s); setShowSupplierModal(true); }} className="p-3 border rounded-xl hover:bg-slate-50"><Save size={18} /></button>
                    <button onClick={() => deleteSupplier(s.id)} className="p-3 border rounded-xl hover:bg-red-50 text-red-400"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
              {suppliers.length === 0 && (
                <div className="col-span-full py-20 bg-white rounded-3xl border border-dashed text-center text-slate-400">
                  No hay proveedores registrados para {type}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'CONTROL' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Ventas del Día</p>
                <p className="text-4xl font-black text-blue-600">${totalVentasHoy}</p>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Stock Crítico</p>
                <p className="text-4xl font-black text-red-500">{itemsCriticos}</p>
                <p className="text-xs text-slate-400">Productos por debajo del mínimo</p>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Valor Inventario</p>
                <p className="text-4xl font-black text-emerald-600">${products.reduce((acc, p) => acc + (p.cost * p.stock), 0)}</p>
                <p className="text-xs text-slate-400">Precio de costo acumulado</p>
              </div>
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black text-slate-800">Análisis de Stock</h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-xs font-bold text-slate-500">Stock OK</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-xs font-bold text-slate-500">Reponer</span></div>
                </div>
              </div>
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={products.slice(0, 15)}>
                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} fontSize={10} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="stock" radius={[8, 8, 0, 0]} barSize={40}>
                      {products.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.stock <= entry.min_stock ? '#ef4444' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-8 p-6 bg-slate-50 rounded-2xl border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><TrendingUp size={24} /></div>
                  <div>
                    <p className="font-bold text-slate-800">Recomendación Automática</p>
                    <p className="text-sm text-slate-500">Sugiere reponer <strong>{itemsCriticos}</strong> productos basándose en las ventas recientes.</p>
                  </div>
                </div>
                <button onClick={() => setActiveTab('PROVEEDORES')} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all">Ir a Pedidos</button>
              </div>
            </div>
          </div>
        )}
      </main>

      {loading && (
        <div className="fixed bottom-10 right-10 bg-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 border animate-bounce z-[100]">
          <Loader2 className="animate-spin text-blue-500" />
          <span className="font-bold text-sm text-slate-600 tracking-tight">Sincronizando con Amazonia...</span>
        </div>
      )}
    </div>
  );
};

export default RetailSystem;
