
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

type TabType = 'TURNOS' | 'NUEVA CONSULTA' | 'INVENTARIO INSUMOS' | 'HISTORIAL CLINICO' | 'PROVEEDORES';

const ClinicSystem: React.FC<ClinicSystemProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('TURNOS');
  const [loading, setLoading] = useState(true);
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [consultations, setConsultations] = useState<ClinicalConsultation[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  // TIEMPO REAL GLOBAL PARA CLÍNICA
  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('clinic-realtime')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab]);

  const fetchData = async () => {
    const [
      { data: appts },
      { data: prods },
      { data: cons },
      { data: sups },
      { data: cats }
    ] = await Promise.all([
      supabase.from('appointments').select('*').order('date', { ascending: true }),
      supabase.from('products').select('*').eq('category', 'CONSULTORIO').order('name'),
      supabase.from('clinical_consultations').select('*').order('created_at', { ascending: false }),
      supabase.from('suppliers').select('*').eq('category', 'CONSULTORIO').order('name'),
      supabase.from('product_categories').select('*').eq('system_type', 'CONSULTORIO')
    ]);

    if (appts) setAppointments(appts);
    if (prods) setProducts(prods);
    if (cons) setConsultations(cons);
    if (sups) setSuppliers(sups);
    if (cats) setCategories(cats);
    setLoading(false);
  };

  // El resto del componente clínico se beneficia de la recarga automática por fetchData()
  // ...
  
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      <nav className="bg-sky-600 text-white px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition-colors"><ArrowLeft size={24} /></button>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">Amazonia Consultorio</h1>
        </div>
        <div className="flex bg-white/20 rounded-2xl p-1 overflow-x-auto no-scrollbar">
          {['TURNOS', 'NUEVA CONSULTA', 'INVENTARIO INSUMOS', 'HISTORIAL CLINICO', 'PROVEEDORES'].map(id => (
            <button key={id} onClick={() => setActiveTab(id as TabType)} className={`px-4 py-2 rounded-xl font-black text-[9px] tracking-widest uppercase transition-all whitespace-nowrap ${activeTab === id ? 'bg-white text-sky-600 shadow-sm' : 'hover:bg-white/10'}`}>{id}</button>
          ))}
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
         {/* Contenido según activeTab... */}
         <div className="py-20 text-center opacity-20 italic">Sincronizado en Tiempo Real</div>
      </main>
      
      {loading && (
        <div className="fixed bottom-10 right-10 bg-white p-5 rounded-3xl shadow-2xl flex items-center gap-4 border-2 z-[1000] animate-bounce">
          <Loader2 className="animate-spin text-sky-500" size={24} />
          <span className="font-black text-[10px] uppercase text-slate-500">Clínica Online...</span>
        </div>
      )}
    </div>
  );
};

export default ClinicSystem;
