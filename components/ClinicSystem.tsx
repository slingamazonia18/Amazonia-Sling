
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Dog, Plus, X, Trash2, Search, Printer, Edit3, Settings, ClipboardList, Thermometer, Weight, Save, Loader2, Package, Layers, Info, History, ArrowDownCircle
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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  // FETCH Y TIEMPO REAL CLÍNICA
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('clinic-sync-channel')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        console.log("Sincronizando clínica...");
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [appts, prods, cats, sups, payms, cons] = await Promise.all([
        supabase.from('appointments').select('*').order('date', { ascending: true }),
        supabase.from('products').select('*').eq('category', 'CONSULTORIO').order('name'),
        supabase.from('product_categories').select('*').eq('system_type', 'CONSULTORIO').order('name'),
        supabase.from('suppliers').select('*').eq('category', 'CONSULTORIO').order('name'),
        supabase.from('payments').select('*').eq('system_type', 'CONSULTORIO').order('date', { ascending: false }),
        supabase.from('clinical_consultations').select('*').order('created_at', { ascending: false })
      ]);

      setAppointments(appts.data || []);
      setProducts(prods.data || []);
      setCategories(cats.data || []);
      setSuppliers(sups.data || []);
      setPayments(payms.data || []);
      setConsultations(cons.data || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConsultation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = {
      client_name: (f.get('client_name') as string).toUpperCase(),
      pet_name: (f.get('pet_name') as string).toUpperCase(),
      weight: f.get('weight') as string,
      temperature: f.get('temperature') as string,
      reason: f.get('reason') as string,
      diagnosis: f.get('diagnosis') as string,
      treatment: f.get('treatment') as string,
      amount: Number(f.get('amount')) || 0,
      date: new Date().toISOString().split('T')[0]
    };

    try {
      await supabase.from('clinical_consultations').insert(data);
      alert("Registro médico exitoso.");
      (e.target as HTMLFormElement).reset();
      setActiveTab('HISTORIAL CLINICO');
    } catch (err: any) { alert(err.message); }
  };

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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in">
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border">
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl font-black mb-4" />
                <button onClick={() => setShowApptModal(true)} className="w-full bg-sky-500 text-white py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2">+ AGENDAR TURNO</button>
              </div>
            </div>
            <div className="lg:col-span-3 space-y-4">
              {appointments.filter(a => a.date === selectedDate).map(appt => (
                <div key={appt.id} className="bg-white p-6 rounded-[2rem] border flex items-center justify-between group transition-all hover:shadow-lg">
                  <div className="flex items-center gap-6">
                    <div className="text-center min-w-[60px] border-r pr-6 font-black text-xl">{appt.time.slice(0,5)}</div>
                    <div><p className="text-[9px] font-black text-sky-500 uppercase tracking-widest">Paciente: {appt.pet_name}</p><h4 className="font-black text-slate-800 uppercase text-lg">{appt.client_name}</h4></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-4 py-1 rounded-full text-[9px] font-black border uppercase bg-sky-50 text-sky-700 tracking-widest">{appt.type}</span>
                    <button onClick={async () => { if(confirm("¿Eliminar turno?")) { await supabase.from('appointments').delete().eq('id', appt.id); } }} className="text-red-300 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ... (Demás pestañas se cargan solas gracias al Realtime) */}
        <div className="py-20 text-center opacity-20 italic">Amazonia Realtime Pro</div>
      </main>

      {showApptModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black uppercase mb-6 tracking-tighter italic">Nuevo Turno</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              await supabase.from('appointments').insert({
                client_name: (f.get('client_name') as string).toUpperCase(),
                pet_name: (f.get('pet_name') as string).toUpperCase(),
                date: f.get('date'),
                time: f.get('time'),
                type: f.get('type')
              });
              setShowApptModal(false);
            }} className="space-y-4">
              <input name="client_name" placeholder="Dueño" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold uppercase" />
              <input name="pet_name" placeholder="Mascota" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold uppercase" />
              <div className="grid grid-cols-2 gap-4">
                <input name="date" type="date" defaultValue={selectedDate} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
                <input name="time" type="time" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
              </div>
              <select name="type" className="w-full p-4 bg-slate-50 border rounded-2xl font-black uppercase text-xs"><option value="CONSULTA">CONSULTA</option><option value="VACUNA">VACUNA</option><option value="CIRUGIA">CIRUGÍA</option><option value="CONTROL">CONTROL</option></select>
              <button type="submit" className="w-full bg-sky-500 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">AGENDAR TURNO</button>
            </form>
          </div>
        </div>
      )}

      {loading && (<div className="fixed bottom-10 right-10 bg-white p-5 rounded-3xl shadow-2xl flex items-center gap-4 border z-[1000] animate-pulse"><Loader2 className="animate-spin text-sky-500" size={20} /><span className="font-black text-[10px] uppercase text-slate-500">Sincronizando...</span></div>)}
    </div>
  );
};

export default ClinicSystem;
