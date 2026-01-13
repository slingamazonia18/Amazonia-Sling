
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
      const { data: prods } = await supabase.from('products').select('*').eq('category', type);
      const { data: sups } = await supabase.from('suppliers').select('*').eq('category', type);
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
      if (editingProduct) {
        await supabase.from('products').update(productData).eq('id', editingProduct.id);
      } else {
        await supabase.from('products').insert(productData);
      }
      setShowProductModal(false);
      setEditingProduct(null);
      fetchData();
    } catch (err) {
      alert("Error al guardar producto");
    }
  };

  const deleteProduct = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este producto?")) {
      await supabase.from('products').delete().eq('id', id);
      fetchData();
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

      await supabase.from('sale_items').insert(items);
      
      for (const item of cart) {
        await supabase.from('products').update({ stock: item.product.stock - item.qty }).eq('id', item.product.id);
      }

      setCart([]);
      fetchData();
      alert(`Venta exitosa! ID: ${sale.id.slice(0,8)}`);
    } catch (error) {
      alert("Error al procesar la venta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
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
              <button type="submit" className={`col-span-2 ${colors.primary} text-white py-4 rounded-xl font-bold mt-4 shadow-lg`}>
                Guardar Producto
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
        <div className="flex bg-white/20 rounded-xl p-1">
          {['INVENTARIO', 'VENTAS', 'PROVEEDORES', 'CONTROL'].map(id => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === id ? 'bg-white text-slate-900 shadow-sm' : 'hover:bg-white/10'}`}
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
              <button onClick={() => { setEditingProduct(null); setShowProductModal(true); }} className={`${colors.primary} text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2`}>
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
                    <tr key={p.id} className="hover:bg-slate-50/50">
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
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => { setEditingProduct(p); setShowProductModal(true); }} className="text-blue-500 p-2 hover:bg-blue-50 rounded-lg"><Save size={18} /></button>
                        <button onClick={() => deleteProduct(p.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {products.filter(p => p.stock > 0).map(p => (
                    <button key={p.id} onClick={() => addToCart(p)} className="p-4 border rounded-xl hover:border-blue-500 hover:bg-blue-50 text-left transition-all group">
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-blue-600 font-black">${p.price}</span>
                        <span className="text-[10px] text-slate-400">Disponibles: {p.stock}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 h-fit sticky top-24">
              <h3 className="text-xl font-black mb-6">Resumen de Venta</h3>
              <div className="space-y-4 mb-6 max-h-96 overflow-auto">
                {cart.length === 0 ? <p className="text-center text-slate-400 py-10">Sin items</p> : cart.map(item => (
                  <div key={item.product.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm">{item.product.name}</p>
                      <p className="text-xs text-slate-400">{item.qty} x ${item.product.price}</p>
                    </div>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-red-400"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 text-2xl font-black flex justify-between mb-6">
                <span>TOTAL</span>
                <span>${calculateTotal()}</span>
              </div>
              <div className="space-y-2">
                <button onClick={() => handleCheckout('TARJETA', 'FACTURA')} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg">Facturar ARCA (Afip)</button>
                <button onClick={() => handleCheckout('EFECTIVO', 'COMPROBANTE')} className="w-full border-2 border-slate-200 py-4 rounded-2xl font-bold text-slate-600">Ticket Interno</button>
              </div>
            </div>
          </div>
        )}
        
        {/* ... Resto de tabs similares ... */}
      </main>
    </div>
  );
};

export default RetailSystem;
