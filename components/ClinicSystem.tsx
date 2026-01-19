
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowLeft, Calendar, Clock, User, Dog, Plus, ChevronLeft, ChevronRight, 
  Filter, Loader2, X, Trash2, ShoppingCart, Activity, Briefcase, Pill, Syringe, Box,
  Search, Barcode, Printer, Ban, Edit3, Settings, Layers, ArrowDownCircle, FileSpreadsheet,
  AlertTriangle, ShoppingBag, Minus, FileText, ClipboardList, Thermometer, Weight, Save
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
  
  // Datos
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [consultations, setConsultations] = useState<ClinicalConsultation[]>([]);
  
  // UI Modales
  const [showApptModal, setShowApptModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Estados de Filtros
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('TODAS');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: appts } = await supabase.from('appointments').select('*').order('date', { ascending: true });
      const { data: prods } = await supabase.from('products').select('*').eq('category', 'CONSULTORIO').order('name', { ascending: true });
      const { data: cats } = await supabase.from('product_categories').select('*').eq('system_type', 'CONSULTORIO').order('name', { ascending: true });
      const { data: sups } = await supabase.from('suppliers').select('*').eq('category', 'CONSULTORIO').order('name', { ascending: true });
      const { data: payms } = await supabase.from('payments').select('*').eq('system_type', 'CONSULTORIO').order('date', { ascending: false });
      const { data: cons } = await supabase.from('clinical_consultations').select('*').order('created_at', { ascending: false });

      if (appts) setAppointments(appts);
      if (prods) setProducts(prods);
      if (cats) setCategories(cats);
      if (sups) setSuppliers(sups);
      if (payms) setPayments(payms);
      if (cons) setConsultations(cons);
    } catch (err) {
      console.error("Error fetching clinic data:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- GENERACIÓN DE PDF DE CONSULTA ---
  const generateClinicalPDF = (c: ClinicalConsultation) => {
    const doc = new jsPDF();
    
    // Encabezado
    doc.setFillColor(14, 165, 233); // Sky Blue 500
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("AMAZONIA VETERINARIA", 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text("INFORME CLÍNICO / RECETA", 105, 28, { align: 'center' });

    // Datos Paciente
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DATOS DEL PACIENTE", 20, 50);
    doc.line(20, 52, 190, 52);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Paciente: ${c.pet_name.toUpperCase()}`, 20, 60);
    doc.text(`Propietario: ${c.client_name.toUpperCase()}`, 20, 65);
    doc.text(`Fecha: ${new Date(c.date).toLocaleDateString()}`, 140, 60);
    doc.text(`Peso: ${c.weight || '--'} kg`, 140, 65);
    doc.text(`Temp: ${c.temperature || '--'} °C`, 140, 70);

    // Contenido Clínico
    doc.setFont("helvetica", "bold");
    doc.text("MOTIVO DE CONSULTA:", 20, 85);
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(c.reason || 'No especificado', 170), 20, 90);

    doc.setFont("helvetica", "bold");
    doc.text("OBSERVACIONES / DIAGNÓSTICO:", 20, 110);
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(c.diagnosis || 'Sin observaciones adicionales', 170), 20, 115);

    doc.setFont("helvetica", "bold");
    doc.text("TRATAMIENTO INDICADO:", 20, 150);
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(c.treatment || 'Consultar con el médico', 170), 20, 155);

    // Firma
    doc.line(70, 260, 140, 260);
    doc.setFontSize(8);
    doc.text("FIRMA Y SELLO PROFESIONAL", 105, 265, { align: 'center' });

    doc.save(`Consulta_${c.pet_name}_${c.date}.pdf`);
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
      alert("Consulta registrada con éxito.");
      (e.target as HTMLFormElement).reset();
      setActiveTab('HISTORIAL CLINICO');
    } catch (err: any) { alert(err.message); }
  };

  const handleSaveCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = (e.currentTarget.elements.namedItem('cat_name') as HTMLInputElement).value;
    try {
      const { error } = await supabase.from('product_categories').insert({ name, system_type: 'CONSULTORIO' });
      if (error) throw error;
      (e.target as HTMLFormElement).reset();
      fetchData();
    } catch (err: any) { alert(err.message); }
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
      {/* Modales */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 uppercase">Categorías Consultorio</h2>
              <button onClick={() => setShowCategoryModal(false)}><X /></button>
            </div>
            <form onSubmit={handleSaveCategory} className="mb-6 flex gap-2">
              <input name="cat_name" placeholder="Ej: Medicamentos, Descartables" required className="flex-1 p-4 bg-slate-50 border rounded-2xl font-bold" />
              <button type="submit" className="p-4 bg-sky-600 text-white rounded-2xl"><Plus /></button>
            </form>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {categories.map(c => (
                <div key={c.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border">
                  <span className="font-bold text-slate-700 uppercase text-xs">{c.name}</span>
                  <button onClick={async () => { if(confirm("¿Eliminar?")) { await supabase.from('product_categories').delete().eq('id', c.id); fetchData(); } }} className="text-red-300 hover:text-red-500"><Trash2 size={18}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
                cost: parseFloat((formData.get('cost') as string) || '0'),
                price: parseFloat((formData.get('price') as string) || '0'),
                category: 'CONSULTORIO'
              };
              if (editingProduct) await supabase.from('products').update(productData).eq('id', editingProduct.id);
              else await supabase.from('products').insert(productData);
              setShowProductModal(false); fetchData();
            }} className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><input name="name" defaultValue={editingProduct?.name} required placeholder="Nombre del Medicamento / Insumo" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" /></div>
              <div className="col-span-2">
                <select name="product_category" defaultValue={editingProduct?.product_category} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold uppercase text-xs">
                  <option value="">SIN CATEGORÍA</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div><label className="text-[10px] font-black ml-2 mb-1 block">Stock</label><input name="stock" type="number" defaultValue={editingProduct?.stock || 0} required className="w-full p-4 bg-slate-50 border rounded-2xl font-black" /></div>
              <div><label className="text-[10px] font-black ml-2 mb-1 block">Minimo</label><input name="min_stock" type="number" defaultValue={editingProduct?.min_stock || 5} className="w-full p-4 bg-slate-50 border rounded-2xl font-black" /></div>
              <div><label className="text-[10px] font-black ml-2 mb-1 block">Costo ($)</label><input name="cost" type="number" defaultValue={editingProduct?.cost} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" /></div>
              <div><label className="text-[10px] font-black ml-2 mb-1 block">Precio Venta ($)</label><input name="price" type="number" defaultValue={editingProduct?.price} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" /></div>
              <button type="submit" className="col-span-2 bg-sky-600 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest mt-4">GUARDAR EN INVENTARIO</button>
            </form>
          </div>
        </div>
      )}

      {showApptModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black text-slate-800">Agendar Turno</h2><button onClick={() => setShowApptModal(false)}><X /></button></div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              await supabase.from('appointments').insert({
                client_name: formData.get('client_name'),
                pet_name: formData.get('pet_name'),
                date: formData.get('date'),
                time: formData.get('time'),
                type: formData.get('type')
              });
              setShowApptModal(false); fetchData();
            }} className="space-y-4">
              <input name="client_name" placeholder="Dueño" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
              <input name="pet_name" placeholder="Paciente" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
              <div className="grid grid-cols-2 gap-4">
                <input name="date" type="date" defaultValue={selectedDate} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
                <input name="time" type="time" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
              </div>
              <select name="type" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold"><option value="CONSULTA">CONSULTA</option><option value="VACUNA">VACUNA</option><option value="CIRUGIA">CIRUGÍA</option><option value="CONTROL">CONTROL</option></select>
              <button type="submit" className="w-full bg-sky-500 text-white py-5 rounded-3xl font-black uppercase tracking-widest">GUARDAR TURNO</button>
            </form>
          </div>
        </div>
      )}

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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in">
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-slate-800 mb-4" />
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
                      <div className="text-center min-w-[60px] border-r pr-6"><p className="text-[9px] font-black text-slate-300">Hora</p><p className="text-xl font-black text-slate-800">{appt.time.slice(0,5)}</p></div>
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

        {activeTab === 'NUEVA CONSULTA' && (
          <div className="animate-in slide-in-from-bottom duration-500 max-w-4xl mx-auto">
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-sky-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-sky-500 text-white rounded-[1.5rem] shadow-lg"><ClipboardList size={32} /></div>
                <div><h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Ficha de Consulta Médica</h2><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Complete los campos clínicos</p></div>
              </div>
              <form onSubmit={handleSaveConsultation} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Dueño / Cliente</label><input name="client_name" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" placeholder="Nombre completo" /></div>
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Nombre Paciente</label><input name="pet_name" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" placeholder="Mascota" /></div>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="relative"><Weight className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input name="weight" placeholder="Peso (kg)" className="w-full pl-12 p-4 bg-slate-50 border rounded-2xl font-bold" /></div>
                  <div className="relative"><Thermometer className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input name="temperature" placeholder="Temp (°C)" className="w-full pl-12 p-4 bg-slate-50 border rounded-2xl font-bold" /></div>
                  <div className="relative"><ShoppingCart className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input name="amount" type="number" placeholder="Costo Consulta ($)" className="w-full pl-12 p-4 bg-slate-50 border rounded-2xl font-bold" /></div>
                </div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Motivo de la consulta</label><textarea name="reason" rows={2} required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" placeholder="Escriba aquí el motivo por el cual asiste..."></textarea></div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Diagnóstico y Observaciones</label><textarea name="diagnosis" rows={4} required className="w-full p-4 bg-slate-100 border rounded-2xl font-bold focus:bg-white transition-all" placeholder="Descripción detallada de los hallazgos médicos..."></textarea></div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Tratamiento e Indicaciones</label><textarea name="treatment" rows={3} className="w-full p-4 bg-sky-50 border border-sky-100 rounded-2xl font-bold" placeholder="Medicamentos, dosis y cuidados..."></textarea></div>
                <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-3"><Save size={24}/> FINALIZAR Y GUARDAR CONSULTA</button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'HISTORIAL CLINICO' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center mb-4"><h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Historial de Pacientes</h2><div className="relative w-64"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input type="text" placeholder="Buscar paciente..." className="w-full pl-12 p-3 bg-white border rounded-2xl outline-none" onChange={(e) => setSearchTerm(e.target.value)} /></div></div>
            <div className="grid grid-cols-1 gap-4">
              {consultations.filter(c => c.pet_name.toLowerCase().includes(searchTerm.toLowerCase())).map(con => (
                <div key={con.id} className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                  <div className="flex items-center gap-6 flex-1">
                    <div className="bg-sky-50 p-4 rounded-2xl text-sky-600"><Dog size={32}/></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1"><h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">{con.pet_name}</h4><span className="text-[9px] font-black bg-slate-100 px-2 py-0.5 rounded-full text-slate-400">{new Date(con.date).toLocaleDateString()}</span></div>
                      <p className="text-xs font-bold text-slate-500 uppercase">Prop: {con.client_name}</p>
                      <p className="text-[10px] font-medium text-slate-400 line-clamp-1 mt-1 italic">"{con.diagnosis}"</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => generateClinicalPDF(con)} className="p-4 bg-slate-900 text-white rounded-2xl hover:scale-110 active:scale-95 transition-all flex items-center gap-2 text-[10px] font-black uppercase"><Printer size={18}/> Imprimir Informe</button>
                    <button onClick={async () => { if(confirm("¿Eliminar registro?")) { await supabase.from('clinical_consultations').delete().eq('id', con.id); fetchData(); } }} className="p-3 text-red-200 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={20}/></button>
                  </div>
                </div>
              ))}
              {consultations.length === 0 && <div className="p-20 text-center opacity-20 italic font-black uppercase tracking-widest border border-dashed rounded-[3rem]">No hay consultas registradas</div>}
            </div>
          </div>
        )}

        {activeTab === 'INVENTARIO INSUMOS' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-end gap-4">
              <div className="flex flex-1 gap-4">
                <div className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="text" placeholder="Buscar insumo médico..." className="w-full pl-12 pr-4 py-4 rounded-3xl border outline-none shadow-sm" onChange={(e) => setSearchTerm(e.target.value)} /></div>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-60 px-4 py-4 rounded-3xl border outline-none font-bold text-xs uppercase shadow-sm"><option value="TODAS">TODAS LAS CATEGORÍAS</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowCategoryModal(true)} className="bg-slate-100 text-slate-600 px-6 py-4 rounded-3xl font-black flex items-center gap-2 uppercase text-[10px]"><Settings size={16}/> CATEGORÍAS</button>
                <button onClick={() => { setEditingProduct(null); setShowProductModal(true); }} className="bg-sky-600 text-white px-8 py-4 rounded-3xl font-black flex items-center gap-2 shadow-xl uppercase text-xs"><Plus /> NUEVO INSUMO</button>
              </div>
            </div>
            <div className="bg-white rounded-[3rem] shadow-sm border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400"><tr className="px-8"><th className="px-8 py-6">Insumo</th><th className="px-8 py-6">Stock</th><th className="px-8 py-6">Costo</th><th className="px-8 py-6 text-right">Acción</th></tr></thead>
                <tbody className="divide-y">
                  {filteredInventory.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 group transition-colors">
                      <td className="px-8 py-5"><p className="font-black text-slate-800 uppercase text-xs">{p.name}</p><p className="text-[9px] text-slate-300 font-bold uppercase">{p.product_category || 'Sin Categoría'}</p></td>
                      <td className="px-8 py-5"><span className={`font-black text-lg ${p.stock <= p.min_stock ? 'text-red-500' : 'text-slate-900'}`}>{p.stock}</span></td>
                      <td className="px-8 py-5 font-black text-slate-900">${p.cost}</td>
                      <td className="px-8 py-5 text-right"><button onClick={() => { setEditingProduct(p); setShowProductModal(true); }} className="p-2 text-sky-500"><Edit3 size={18} /></button><button onClick={async () => { if(confirm("¿Eliminar?")) { await supabase.from('products').delete().eq('id', p.id); fetchData(); } }} className="p-2 text-red-200 hover:text-red-500"><Trash2 size={18}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredInventory.length === 0 && <div className="p-20 text-center text-slate-300 font-black uppercase italic tracking-widest">No hay insumos cargados</div>}
            </div>
          </div>
        )}

        {activeTab === 'PROVEEDORES' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center"><h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Proveedores de Insumos</h2><button onClick={() => setShowSupplierModal(true)} className="bg-sky-600 text-white px-8 py-4 rounded-3xl font-black flex items-center gap-2 uppercase text-xs"><Plus /> NUEVO PROVEEDOR</button></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {suppliers.map(sup => (
                <div key={sup.id} className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col gap-4 group hover:shadow-xl transition-all border-slate-100">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{sup.name}</h3>
                  <a href={`https://wa.me/${sup.whatsapp}`} target="_blank" rel="noopener noreferrer" className="bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs text-center flex items-center justify-center gap-2 shadow-lg"><Activity size={18} /> PEDIDO WHATSAPP</a>
                  <button onClick={async () => { if(confirm("¿Eliminar?")) { await supabase.from('suppliers').delete().eq('id', sup.id); fetchData(); } }} className="text-red-300 hover:text-red-500 text-[10px] font-black uppercase flex items-center gap-2 justify-center mt-2 opacity-50 group-hover:opacity-100 transition-all"><Trash2 size={14}/> Eliminar</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'EGRESOS' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center"><h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Gastos del Consultorio</h2><button onClick={() => setShowPaymentModal(true)} className="bg-red-500 text-white px-8 py-4 rounded-3xl font-black flex items-center gap-2 uppercase text-xs shadow-xl"><ArrowDownCircle size={18} /> REGISTRAR GASTO</button></div>
            <div className="bg-white rounded-[3rem] shadow-sm border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400"><tr><th className="px-8 py-6">Descripción</th><th className="px-8 py-6">Monto</th><th className="px-8 py-6">Fecha</th><th className="px-8 py-6 text-right">Acción</th></tr></thead>
                <tbody className="divide-y">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 group transition-colors"><td className="px-8 py-5 font-black text-slate-800 uppercase">{p.description}</td><td className="px-8 py-5 font-black text-red-500">-${p.amount}</td><td className="px-8 py-5 font-bold text-slate-400">{p.date}</td><td className="px-8 py-5 text-right"><button onClick={async () => { if(confirm("¿Eliminar?")) { await supabase.from('payments').delete().eq('id', p.id); fetchData(); } }} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button></td></tr>
                  ))}
                </tbody>
              </table>
              {payments.length === 0 && <div className="p-20 text-center text-slate-300 font-black uppercase italic tracking-widest">Sin egresos registrados</div>}
            </div>
          </div>
        )}

        {activeTab === 'ESTADISTICAS' && (
           <div className="space-y-12 animate-in fade-in max-w-5xl mx-auto">
             <div className="bg-sky-100 border-2 border-sky-200 p-8 rounded-[3rem] shadow-sm">
               <div className="flex items-center gap-3 mb-6"><div className="p-3 bg-sky-600 text-white rounded-2xl shadow-lg"><Activity size={24}/></div><h3 className="text-xl font-black text-sky-800 uppercase tracking-tighter italic">Resumen del Consultorio</h3></div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ingresos por Consultas</p>
                    <p className="text-4xl font-black text-slate-900 tracking-tighter">${consultations.reduce((a, b) => a + Number(b.amount || 0), 0).toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase">Total de pacientes atendidos: {consultations.length}</p>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Inversión / Gastos en Insumos</p>
                    <p className="text-4xl font-black text-red-500 tracking-tighter">-${payments.reduce((a, b) => a + Number(b.amount || 0), 0).toLocaleString()}</p>
                  </div>
               </div>
             </div>
           </div>
        )}

      </main>

      {/* Modal Pagos (Egresos) */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black uppercase">Registrar Egreso Consultorio</h2><button onClick={() => setShowPaymentModal(false)}><X /></button></div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              await supabase.from('payments').insert({
                description: formData.get('description'),
                amount: Number(formData.get('amount')),
                date: formData.get('date'),
                system_type: 'CONSULTORIO'
              });
              setShowPaymentModal(false); fetchData();
            }} className="space-y-4">
              <input name="description" placeholder="Descripción (Ej: Compra de Gasas)" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
              <input name="amount" type="number" placeholder="Monto ($)" required className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-2xl" />
              <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
              <button type="submit" className="w-full bg-red-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest">GUARDAR GASTO</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Proveedor */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black uppercase tracking-tight">Nuevo Proveedor de Insumos</h2><button onClick={() => setShowSupplierModal(false)}><X /></button></div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              await supabase.from('suppliers').insert({ name: formData.get('name'), whatsapp: formData.get('whatsapp'), category: 'CONSULTORIO' });
              setShowSupplierModal(false); fetchData();
            }} className="space-y-4">
              <input name="name" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold uppercase" placeholder="Nombre Proveedor" />
              <input name="whatsapp" placeholder="54911..." className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase shadow-xl mt-4">GUARDAR PROVEEDOR</button>
            </form>
          </div>
        </div>
      )}

      {loading && (<div className="fixed bottom-10 right-10 bg-white p-5 rounded-3xl shadow-2xl flex items-center gap-4 border z-[1000] animate-pulse"><Loader2 className="animate-spin text-sky-500" size={20} /><span className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Actualizando...</span></div>)}
    </div>
  );
};

export default ClinicSystem;
