
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Dog, Plus, Trash2, Search, Printer, Edit3, ClipboardList, Loader2, Calendar, Clock, User
} from 'lucide-react';
import { Appointment, ClinicalConsultation } from '../types';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';

interface ClinicSystemProps {
  onBack: () => void;
}

type TabType = 'TURNOS' | 'NUEVA CONSULTA' | 'HISTORIAL';

const ClinicSystem: React.FC<ClinicSystemProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('TURNOS');
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [consultations, setConsultations] = useState<ClinicalConsultation[]>([]);
  const [showApptModal, setShowApptModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
    const ch = supabase.channel('clinic').on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchData).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: appts } = await supabase.from('appointments').select('*').order('date', { ascending: true });
    const { data: cons } = await supabase.from('clinical_consultations').select('*').order('created_at', { ascending: false });
    if (appts) setAppointments(appts);
    if (cons) setConsultations(cons);
    setLoading(false);
  };

  const handleSaveConsultation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = {
      client_name: f.get('client_name'),
      pet_name: f.get('pet_name'),
      weight: f.get('weight'),
      temperature: f.get('temperature'),
      reason: f.get('reason'),
      diagnosis: f.get('diagnosis'),
      treatment: f.get('treatment'),
      amount: Number(f.get('amount')),
      date: new Date().toISOString()
    };
    await supabase.from('clinical_consultations').insert(data);
    alert("Consulta registrada con éxito");
    setActiveTab('HISTORIAL');
    fetchData();
  };

  const printPrescription = (c: ClinicalConsultation) => {
    const doc = new jsPDF();
    doc.setFillColor(14, 165, 233); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.text("AMAZONIA VETERINARIA", 105, 25, { align: 'center' });
    doc.setTextColor(50, 50, 50); doc.setFontSize(12); doc.text(`PACIENTE: ${c.pet_name.toUpperCase()}`, 20, 60);
    doc.text(`PROP: ${c.client_name.toUpperCase()}`, 20, 67);
    doc.text(`FECHA: ${new Date(c.date).toLocaleDateString()}`, 140, 60);
    doc.line(20, 75, 190, 75);
    doc.setFontSize(14); doc.text("INDICACIONES:", 20, 90);
    doc.setFontSize(11); doc.text(doc.splitTextToSize(c.treatment, 170), 20, 100);
    doc.save(`Receta_${c.pet_name}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-sky-600 text-white px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full"><ArrowLeft size={24} /></button>
          <h1 className="text-2xl font-black uppercase tracking-tighter italic">Clínica Amazonia</h1>
        </div>
        <div className="flex bg-white/20 rounded-2xl p-1 gap-1">
          {['TURNOS', 'NUEVA CONSULTA', 'HISTORIAL'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as TabType)} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${activeTab === tab ? 'bg-white text-slate-900' : ''}`}>{tab}</button>
          ))}
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        {activeTab === 'TURNOS' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Agenda de Hoy</h2>
              <button onClick={() => setShowApptModal(true)} className="bg-sky-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-lg">+ Nuevo Turno</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appointments.map(a => (
                <div key={a.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 flex items-center justify-between group hover:border-sky-500 transition-all shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-sky-50 rounded-2xl text-sky-600"><Clock size={24}/></div>
                    <div>
                      <p className="font-black text-slate-800 uppercase text-lg">{a.pet_name}</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{a.client_name} - {a.time}hs</p>
                    </div>
                  </div>
                  <button onClick={async () => { await supabase.from('appointments').delete().eq('id', a.id); fetchData(); }} className="p-2 opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all"><Trash2 size={20}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'NUEVA CONSULTA' && (
          <form onSubmit={handleSaveConsultation} className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 animate-in zoom-in-95">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <input name="client_name" required placeholder="Nombre del Propietario" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
                <input name="pet_name" required placeholder="Nombre del Paciente" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
                <input name="weight" placeholder="Peso (kg)" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
                <input name="temperature" placeholder="Temp (°C)" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
             </div>
             <textarea name="reason" rows={2} required placeholder="Motivo de consulta" className="w-full p-5 bg-slate-50 border rounded-2xl font-bold mb-4" />
             <textarea name="diagnosis" rows={3} required placeholder="Diagnóstico médico" className="w-full p-5 bg-slate-50 border rounded-2xl font-bold mb-4" />
             <textarea name="treatment" rows={4} required placeholder="Tratamiento y medicación" className="w-full p-5 bg-slate-50 border rounded-2xl font-bold mb-6" />
             <div className="flex gap-4">
                <input name="amount" type="number" required placeholder="Valor Consulta $" className="flex-1 p-5 bg-slate-900 text-white rounded-3xl font-black text-2xl outline-none" />
                <button type="submit" className="bg-sky-600 text-white px-10 rounded-3xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">Guardar Consulta</button>
             </div>
          </form>
        )}

        {activeTab === 'HISTORIAL' && (
          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input type="text" placeholder="Buscar por paciente..." onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 p-4 rounded-2xl border shadow-sm outline-none" />
            </div>
            <div className="space-y-4">
              {consultations.filter(c => c.pet_name.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                <div key={c.id} className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex justify-between items-center group hover:bg-slate-50 transition-colors">
                  <div>
                    <h4 className="font-black text-slate-800 uppercase text-lg">{c.pet_name}</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">{new Date(c.date).toLocaleDateString()} - Prop: {c.client_name}</p>
                    <p className="text-xs italic text-slate-500 line-clamp-1">{c.diagnosis}</p>
                  </div>
                  <button onClick={() => printPrescription(c)} className="p-4 bg-slate-100 rounded-2xl text-slate-600 hover:bg-sky-600 hover:text-white transition-all"><Printer size={20}/></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showApptModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl">
            <h2 className="text-2xl font-black mb-8 uppercase text-slate-800">Agendar Turno</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              await supabase.from('appointments').insert({
                client_name: f.get('client'), pet_name: f.get('pet'),
                date: f.get('date'), time: f.get('time'), type: 'CONSULTA'
              });
              setShowApptModal(false); fetchData();
            }} className="space-y-4">
              <input name="client" required placeholder="Propietario" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
              <input name="pet" required placeholder="Paciente" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
              <div className="grid grid-cols-2 gap-4">
                <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
                <input name="time" type="time" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
              </div>
              <button type="submit" className="w-full bg-sky-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl mt-4">Confirmar Turno</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicSystem;
