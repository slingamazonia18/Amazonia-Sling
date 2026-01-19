
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Dog, Plus, X, Trash2, ShoppingCart, Activity, 
  Search, Printer, Edit3, Settings, ArrowDownCircle, 
  ClipboardList, Thermometer, Weight, Save, Loader2, Package, Layers, Info
} from 'lucide-react';
import { Appointment, Product, ProductCategory, Supplier, Payment, ClinicalConsultation } from '../types';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';

interface ClinicSystemProps {
  onBack: () => void;
}

type TabType = 'TURNOS' | 'NUEVA CONSULTA' | 'INVENTARIO INSUMOS' | 'HISTORIAL CLINICO' | 'PROVEEDORES' | 'EGRESOS' | 'ESTADISTICAS';

const ClinicSystem: React.FC<ClinicSystemProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('TURNOS');
  const [loading, setLoading] = useState(true);
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [consultations, setConsultations] = useState<ClinicalConsultation[]>([]);
  
  const [showApptModal, setShowApptModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('TODAS');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const responses = await Promise.all([
        supabase.from('appointments').select('*').order('date', { ascending: true }),
        supabase.from('products').select('*').eq('category', 'CONSULTORIO').order('name', { ascending: true }),
        supabase.from('product_categories').select('*').eq('system_type', 'CONSULTORIO').order('name', { ascending: true }),
        supabase.from('suppliers').select('*').eq('category', 'CONSULTORIO').order('name', { ascending: true }),
        supabase.from('payments').select('*').eq('system_type', 'CONSULTORIO').order('date', { ascending: false }),
        supabase.from('clinical_consultations').select('*').order('created_at', { ascending: false })
      ]);

      const [appts, prods, cats, sups, payms, cons] = responses;

      if (appts.data) setAppointments(appts.data);
      if (prods.data) setProducts(prods.data);
      if (cats.data) setCategories(cats.data);
      if (sups.data) setSuppliers(sups.data);
      if (payms.data) setPayments(payms.data);
      if (cons.data) setConsultations(cons.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const productData = {
      name: formData.get('name') as string,
      barcode: formData.get('barcode') as string,
      stock: Number(formData.get('stock')) || 0,
      min_stock: Number(formData.get('min_stock')) || 0,
      product_category: formData.get('product_category') as string,
      cost: Number(formData.get('cost')) || 0,
      price: Number(formData.get('price')) || 0,
      category: 'CONSULTORIO'
    };

    try {
      let result;
      if (editingProduct) {
        result = await supabase.from('products').update(productData).eq('id', editingProduct.id);
      } else {
        result = await supabase.from('products').insert(productData);
      }
      
      if (result.error) throw result.error;
      
      setShowProductModal(false);
      setEditingProduct(null);
      fetchData();
    } catch (err: any) { 
      alert("Error DB al guardar insumo: " + err.message + "\n\n¿Ejecutó el script SQL en Supabase?"); 
    }
  };

  const handleSavePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('es-AR', { hour12: false });

      const { error } = await supabase.from('payments').insert({
        description: formData.get('description') as string,
        amount: Number(formData.get('amount')) || 0,
        date: formData.get('date') as string,
        time: timeStr,
        system_type: 'CONSULTORIO',
        payment_method: 'EFECTIVO',
        type: 'OTRO'
      });
      if (error) throw error;
      setShowPaymentModal(false);
      fetchData();
    } catch (err: any) { alert("Error al guardar gasto: " + err.message); }
  };

  const handleSaveConsultation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      client_name: formData.get('client_name') as string,
      pet_name: formData.get('pet_name') as string,
      weight: formData.get('weight') as string,
      temperature: formData.get('temperature') as string,
      reason: formData.get('reason') as string,
      diagnosis: formData.get('diagnosis') as string,
      treatment: formData.get('treatment') as string,
      amount: Number(formData.get('amount')) || 0,
      date: new Date().toISOString().split('T')[0]
    };

    try {
      const { error } = await supabase.from('clinical_consultations').insert(data);
      if (error) throw error;
      alert("Registro guardado con éxito.");
      (e.target as HTMLFormElement).reset();
      setActiveTab('HISTORIAL CLINICO');
      fetchData();
    } catch (err: any) { alert("Error al guardar consulta: " + err.message); }
  };

  const generateClinicalPDF = (c: ClinicalConsultation) => {
    const doc = new jsPDF();
    doc.setFillColor(14, 165, 233); 
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("AMAZONIA VETERINARIA", 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text("INFORME CLÍNICO / RECETA", 105, 28, { align: 'center' });
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(12);
    doc.text("DATOS DEL PACIENTE", 20, 55);
    doc.line(20, 57, 190, 57);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Paciente: ${c.pet_name.toUpperCase()}`, 20, 65);
    doc.text(`Prop: ${c.client_name.toUpperCase()}`, 20, 70);
    doc.text(`Fecha: ${new Date(c.date).toLocaleDateString()}`, 140, 65);
    doc.text(`Peso: ${c.weight || '--'} kg`, 140, 70);
    doc.text(`Temp: ${c.temperature || '--'} °C`, 140, 75);
    doc.setFont("helvetica", "bold");
    doc.text("MOTIVO:", 20, 90);
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(c.reason || '', 170), 20, 95);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVACIONES:", 20, 120);
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(c.diagnosis || '', 170), 20, 125);
    doc.setFont("helvetica", "bold");
    doc.text("TRATAMIENTO:", 20, 160);
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(c.treatment || '', 170), 20, 165);
    doc.line(70, 260, 140, 260);
    doc.text("FIRMA MÉDICA", 105, 265, { align: 'center' });
    doc.save(`Consulta_${c.pet_name}_${c.date}.pdf`);
  };

  const filteredInventory = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'TODAS' || p.product_category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, categoryFilter]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      <nav className="bg-sky-600 text-white px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition-colors"><ArrowLeft size={24} /></button>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">Amazonia Consultorio</h1>
        </div>
        <div className="flex bg-white/20 rounded-2xl p-1 overflow-x-auto no-scrollbar">
          {['TURNOS', 'NUEVA CONSULTA', 'INVENTARIO INSUMOS', 'HISTORIAL CLINICO', 'PROVEEDORES', 'EGRESOS', 'ESTADISTICAS'].map(id => (
            <button key={id} onClick={() => setActiveTab(id as TabType)} className={`px-4 py-2 rounded-xl font-black text-[9px] tracking-widest uppercase transition-all whitespace-nowrap ${activeTab === id ? 'bg-white text-sky-600 shadow-sm' : 'hover:bg-white/10'}`}>{id}</button>
          ))}
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'TURNOS' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border">
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl font-black mb-4" />
                <button onClick={() => setShowApptModal(true)} className="w-full bg-sky-500 text-white py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2"><Plus size={16}/> AGENDAR TURNO</button>
              </div>
            </div>
            <div className="lg:col-span-3 space-y-4">
              {appointments.filter(a => a.date === selectedDate).map(appt => (
                <div key={appt.id} className="bg-white p-6 rounded-[2rem] border flex items-center justify-between group">
                  <div className="flex items-center gap-6">
                    <div className="text-center min-w-[60px] border-r pr-6 font-black">{appt.time.slice(0,5)}</div>
                    <div><p className="text-[9px] font-black text-sky-500 uppercase">Paciente: {appt.pet_name}</p><h4 className="font-black text-slate-800 uppercase text-xs">{appt.client_name}</h4></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-4 py-1 rounded-full text-[9px] font-black border uppercase bg-sky-50 text-sky-700">{appt.type}</span>
                    <button onClick={async () => { if(confirm("¿Eliminar?")) { await supabase.from('appointments').delete().eq('id', appt.id); fetchData(); } }} className="text-red-300 opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'NUEVA CONSULTA' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl border">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-sky-500 text-white rounded-[1.5rem] shadow-lg"><ClipboardList size={32} /></div>
                <h2 className="text-3xl font-black text-slate-800 uppercase">Ficha Clínica</h2>
              </div>
              <form onSubmit={handleSaveConsultation} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <input name="client_name" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" placeholder="Dueño" />
                  <input name="pet_name" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" placeholder="Mascota" />
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <input name="weight" placeholder="Peso (kg)" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
                  <input name="temperature" placeholder="Temp (°C)" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
                  <input name="amount" type="number" placeholder="Cobro ($)" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
                </div>
                <textarea name="reason" rows={2} required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" placeholder="Motivo de la visita..."></textarea>
                <textarea name="diagnosis" rows={4} required className="w-full p-4 bg-slate-100 border rounded-2xl font-bold" placeholder="Observaciones físicas y diagnóstico..."></textarea>
                <textarea name="treatment" rows={3} className="w-full p-4 bg-sky-50 border border-sky-100 rounded-2xl font-bold" placeholder="Tratamiento, dosis e indicaciones..."></textarea>
                <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase flex items-center justify-center gap-3 shadow-xl"><Save size={24}/> GUARDAR REGISTRO MÉDICO</button>
              </form>
            </div>
          </div>
        )}

        {/* Listados */}
        {activeTab === 'HISTORIAL CLINICO' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-black text-slate-800 uppercase">Registros Médicos</h2><input type="text" placeholder="Buscar..." className="p-3 border rounded-2xl" onChange={(e) => setSearchTerm(e.target.value)} /></div>
            {consultations.filter(c => c.pet_name.toLowerCase().includes(searchTerm.toLowerCase())).map(con => (
              <div key={con.id} className="bg-white p-6 rounded-[2.5rem] border flex items-center justify-between group">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-sky-50 text-sky-600 rounded-2xl"><Dog size={32}/></div>
                  <div>
                    <h4 className="text-xl font-black text-slate-800 uppercase">{con.pet_name}</h4>
                    <p className="text-xs font-bold text-slate-400">Dueño: {con.client_name} • {new Date(con.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => generateClinicalPDF(con)} className="p-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase flex items-center gap-2"><Printer size={18}/> Descargar</button>
                  <button onClick={async () => { if(confirm("¿Borrar?")) { await supabase.from('clinical_consultations').delete().eq('id', con.id); fetchData(); } }} className="p-3 text-red-200 group-hover:text-red-500"><Trash2 size={20}/></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'INVENTARIO INSUMOS' && (
          <div className="space-y-6">
            <div className="flex justify-between items-end gap-4">
              <input type="text" placeholder="Buscar insumo..." className="flex-1 p-4 border rounded-3xl" onChange={(e) => setSearchTerm(e.target.value)} />
              <button onClick={() => setShowCategoryModal(true)} className="bg-slate-100 p-4 rounded-3xl font-black text-[10px] uppercase"><Settings size={16}/></button>
              <button onClick={() => { setEditingProduct(null); setShowProductModal(true); }} className="bg-sky-600 text-white px-8 py-4 rounded-3xl font-black uppercase text-xs"><Plus /> NUEVO INSUMO</button>
            </div>
            <div className="bg-white rounded-[3rem] border overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
                  <tr>
                    <th className="px-8 py-6">Nombre del Insumo</th>
                    <th className="px-8 py-6">Categoría</th>
                    <th className="px-8 py-6">Stock Actual</th>
                    <th className="px-8 py-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInventory.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 group transition-colors">
                      <td className="px-8 py-5 font-black uppercase text-xs text-slate-700">{p.name}</td>
                      <td className="px-8 py-5 font-bold uppercase text-[10px] text-slate-400">{p.product_category || 'SIN CATEGORÍA'}</td>
                      <td className={`px-8 py-5 font-black text-sm ${p.stock <= p.min_stock ? 'text-red-500 bg-red-50/30' : 'text-slate-900'}`}>{p.stock} <span className="text-[10px] text-slate-300 ml-1 font-bold">U.</span></td>
                      <td className="px-8 py-5 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingProduct(p); setShowProductModal(true); }} className="p-2 text-sky-500 hover:bg-sky-50 rounded-lg transition-colors"><Edit3 size={18} /></button>
                        <button onClick={async () => { if(confirm("¿Eliminar?")) { await supabase.from('products').delete().eq('id', p.id); fetchData(); } }} className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal Insumos (Rediseñado para asegurar guardado) */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in-95 overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800">
                {editingProduct ? 'Editar Insumo' : 'Nuevo Insumo'}
              </h2>
              <button onClick={() => { setShowProductModal(false); setEditingProduct(null); }}><X /></button>
            </div>
            <form onSubmit={handleSaveProduct} className="space-y-6">
              <input name="name" defaultValue={editingProduct?.name} required placeholder="Nombre del Producto" className="w-full p-4 bg-slate-50 border rounded-[1.5rem] font-bold outline-none" />
              <select name="product_category" defaultValue={editingProduct?.product_category} className="w-full p-4 bg-slate-50 border rounded-[1.5rem] font-black uppercase text-[11px]">
                <option value="">SIN CATEGORÍA</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input name="stock" type="number" defaultValue={editingProduct?.stock || 0} required placeholder="Stock" className="w-full p-4 bg-slate-50 border rounded-[1.5rem] font-black" />
                <input name="min_stock" type="number" defaultValue={editingProduct?.min_stock || 5} required placeholder="Mínimo" className="w-full p-4 bg-slate-50 border rounded-[1.5rem] font-black" />
              </div>
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-[2rem] border-dashed border">
                <input name="cost" type="number" defaultValue={editingProduct?.cost || 0} placeholder="Costo" className="w-full p-4 bg-white border rounded-2xl font-bold" />
                <input name="price" type="number" defaultValue={editingProduct?.price || 0} placeholder="Precio" className="w-full p-4 bg-white border rounded-2xl font-bold" />
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-xs flex items-center justify-center gap-3">
                <Save size={18}/> GUARDAR INSUMO
              </button>
            </form>
          </div>
        </div>
      )}

      {loading && (<div className="fixed bottom-10 right-10 bg-white p-5 rounded-3xl shadow-2xl flex items-center gap-4 border z-[1000] animate-pulse"><Loader2 className="animate-spin text-sky-500" size={20} /><span className="font-black text-[10px] uppercase text-slate-500">Actualizando...</span></div>)}
    </div>
  );
};

export default ClinicSystem;
