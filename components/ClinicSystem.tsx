
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Calendar as CalendarIcon, Clock, User, Dog, Plus, ChevronLeft, ChevronRight, 
  Filter, Loader2, X, Trash2, ShoppingCart, Activity, Briefcase, Pill, Syringe, Box
} from 'lucide-react';
import { Appointment, ClinicPurchase } from '../types';
import { supabase } from '../lib/supabase';

interface ClinicSystemProps {
  onBack: () => void;
}

type ClinicTab = 'TURNOS' | 'COMPRAS';

const ClinicSystem: React.FC<ClinicSystemProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<ClinicTab>('TURNOS');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [purchases, setPurchases] = useState<ClinicPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'DÍA' | 'SEMANA'>('DÍA');
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: appts } = await supabase.from('appointments').select('*').order('date', { ascending: true });
      const { data: purcs } = await supabase.from('clinic_purchases').select('*').order('date', { ascending: false });
      
      if (appts) setAppointments(appts);
      if (purcs) setPurchases(purcs);
    } catch (err) {
      console.error("Error fetching clinic data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newAppt = {
      client_name: formData.get('client_name'),
      pet_name: formData.get('pet_name'),
      date: formData.get('date'),
      time: formData.get('time'),
      type: formData.get('type')
    };
    try {
      const { error } = await supabase.from('appointments').insert(newAppt);
      if (error) throw error;
      setShowModal(false);
      fetchData();
    } catch (err: any) { alert(err.message); }
  };

  const handleCreatePurchase = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPurc = {
      description: formData.get('description'),
      amount: Number(formData.get('amount')),
      category: formData.get('category'),
      supplier: formData.get('supplier'),
      date: formData.get('date')
    };
    try {
      const { error } = await supabase.from('clinic_purchases').insert(newPurc);
      if (error) throw error;
      setShowPurchaseModal(false);
      fetchData();
    } catch (err: any) { alert(err.message); }
  };

  const deleteAppointment = async (id: string) => {
    if (confirm("¿Eliminar este turno?")) {
      await supabase.from('appointments').delete().eq('id', id);
      fetchData();
    }
  };

  const deletePurchase = async (id: string) => {
    if (confirm("¿Eliminar registro de compra?")) {
      await supabase.from('clinic_purchases').delete().eq('id', id);
      fetchData();
    }
  };

  // Lógica de filtrado de turnos
  const filteredAppointments = useMemo(() => {
    if (viewMode === 'DÍA') {
      return appointments.filter(a => a.date === selectedDate);
    } else {
      const start = new Date(selectedDate + 'T12:00:00');
      const end = new Date(selectedDate + 'T12:00:00');
      end.setDate(start.getDate() + 7);
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      return appointments.filter(a => a.date >= startStr && a.date <= endStr);
    }
  }, [appointments, selectedDate, viewMode]);

  const purchaseStats = useMemo(() => {
    const total = purchases.reduce((acc, p) => acc + Number(p.amount), 0);
    return { total };
  }, [purchases]);

  const typeColors: any = {
    'CONSULTA': 'bg-sky-100 text-sky-700 border-sky-200',
    'VACUNA': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'CIRUGIA': 'bg-red-100 text-red-700 border-red-200',
    'CONTROL': 'bg-amber-100 text-amber-700 border-amber-200'
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      {/* Modales */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-800">Nuevo Turno</h2>
              <button onClick={() => setShowModal(false)}><X /></button>
            </div>
            <form onSubmit={handleCreateAppointment} className="space-y-4">
              <input name="client_name" placeholder="Dueño" required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold" />
              <input name="pet_name" placeholder="Paciente (Nombre)" required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold" />
              <div className="grid grid-cols-2 gap-4">
                <input name="date" type="date" defaultValue={selectedDate} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
                <input name="time" type="time" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
              </div>
              <select name="type" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none">
                <option value="CONSULTA">CONSULTA CLÍNICA</option>
                <option value="VACUNA">PLAN VACUNACIÓN</option>
                <option value="CIRUGIA">CIRUGÍA</option>
                <option value="CONTROL">CONTROL</option>
              </select>
              <button type="submit" className="w-full bg-sky-500 text-white py-5 rounded-3xl font-black shadow-xl uppercase tracking-widest mt-4">AGENDAR</button>
            </form>
          </div>
        </div>
      )}

      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-800">Registrar Compra</h2>
              <button onClick={() => setShowPurchaseModal(false)}><X /></button>
            </div>
            <form onSubmit={handleCreatePurchase} className="space-y-4">
              <input name="description" placeholder="Descripción (Ej: Jeringas 5ml)" required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold" />
              <div className="grid grid-cols-2 gap-4">
                <input name="amount" type="number" step="0.01" placeholder="Monto ($)" required className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-xl" />
                <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
              </div>
              <input name="supplier" placeholder="Proveedor" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
              <select name="category" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none">
                <option value="MEDICAMENTOS">MEDICAMENTOS</option>
                <option value="DESCARTABLES">DESCARTABLES / INSUMOS</option>
                <option value="EQUIPAMIENTO">EQUIPAMIENTO</option>
                <option value="OTROS">OTROS</option>
              </select>
              <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black shadow-xl uppercase tracking-widest mt-4">GUARDAR COMPRA</button>
            </form>
          </div>
        </div>
      )}

      <nav className="bg-sky-500 text-white px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition-colors"><ArrowLeft size={24} /></button>
          <h1 className="text-2xl font-black flex items-center gap-3 italic uppercase tracking-tighter">Amazonia Consultorio</h1>
        </div>
        <div className="flex bg-white/20 rounded-2xl p-1 overflow-hidden">
          <button onClick={() => setActiveTab('TURNOS')} className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${activeTab === 'TURNOS' ? 'bg-white text-sky-600' : 'hover:bg-white/10'}`}>TURNOS</button>
          <button onClick={() => setActiveTab('COMPRAS')} className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${activeTab === 'COMPRAS' ? 'bg-white text-sky-600' : 'hover:bg-white/10'}`}>INSUMOS / COMPRAS</button>
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'TURNOS' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-widest">Calendario</h3>
                  <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} className="text-[9px] font-black text-sky-500 bg-sky-50 px-2 py-1 rounded-lg">Hoy</button>
                </div>
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-slate-800 outline-none mb-4" 
                />
                <button onClick={() => setShowModal(true)} className="w-full bg-sky-500 text-white py-4 rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 text-xs uppercase"><Plus size={16}/> AGENDAR TURNO</button>
              </div>
            </div>

            <div className="lg:col-span-3 space-y-4">
              <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border shadow-sm">
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Turnos del {selectedDate}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Atención Veterinaria</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setViewMode('DÍA')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black ${viewMode === 'DÍA' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>DÍA</button>
                  <button onClick={() => setViewMode('SEMANA')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black ${viewMode === 'SEMANA' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>SEMANA</button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {filteredAppointments.length === 0 ? (
                  <div className="bg-white p-20 rounded-[2.5rem] border border-dashed text-center opacity-30 italic font-black uppercase tracking-widest">No hay turnos agendados</div>
                ) : (
                  filteredAppointments.map(appt => (
                    <div key={appt.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:shadow-lg transition-all">
                      <div className="flex items-center gap-6">
                        <div className="text-center min-w-[60px] border-r pr-6">
                          <p className="text-[9px] font-black text-slate-300 uppercase">Hora</p>
                          <p className="text-xl font-black text-slate-800">{appt.time.slice(0,5)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-sky-500 uppercase tracking-widest">Paciente: {appt.pet_name}</p>
                          <h4 className="font-black text-slate-800 uppercase text-xs">{appt.client_name}</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-4 py-1 rounded-full text-[9px] font-black border uppercase ${typeColors[appt.type]}`}>{appt.type}</span>
                        <button onClick={() => deleteAppointment(appt.id)} className="p-2 text-red-200 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'COMPRAS' && (
          <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-indigo-600 text-white rounded-[2rem] shadow-xl">
                  <ShoppingCart size={32} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Compras de Consultorio</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Control de Gastos e Insumos Médicos</p>
                </div>
              </div>
              <button onClick={() => setShowPurchaseModal(true)} className="bg-indigo-600 text-white px-10 py-4 rounded-[2rem] font-black shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 uppercase text-xs tracking-widest">
                <Plus size={18} /> REGISTRAR COMPRA
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm col-span-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Gasto Total Acumulado</p>
                <p className="text-4xl font-black text-slate-900 tracking-tighter">${purchaseStats.total.toLocaleString()}</p>
                <div className="mt-6 pt-6 border-t border-dashed">
                  <div className="flex justify-between text-xs font-bold mb-2"><span>Medicación</span><span>${purchases.filter(p => p.category === 'MEDICAMENTOS').reduce((a, b) => a + Number(b.amount), 0).toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs font-bold mb-2"><span>Insumos</span><span>${purchases.filter(p => p.category === 'DESCARTABLES').reduce((a, b) => a + Number(b.amount), 0).toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs font-bold"><span>Equipos</span><span>${purchases.filter(p => p.category === 'EQUIPAMIENTO').reduce((a, b) => a + Number(b.amount), 0).toLocaleString()}</span></div>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] border shadow-sm col-span-2 overflow-hidden">
                <div className="bg-slate-50 px-8 py-4 border-b flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historial de Compras</span>
                  <span className="text-[10px] font-black text-slate-300">{purchases.length} Registros</span>
                </div>
                <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 sticky top-0 text-[9px] font-black uppercase text-slate-400 border-b">
                      <tr>
                        <th className="px-8 py-4">Insumo / Descripción</th>
                        <th className="px-8 py-4">Categoría</th>
                        <th className="px-8 py-4">Monto</th>
                        <th className="px-8 py-4 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {purchases.map(p => (
                        <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-4">
                            <p className="font-black text-slate-800 uppercase text-xs">{p.description}</p>
                            <p className="text-[9px] text-slate-300 font-bold uppercase">{p.date} • {p.supplier || 'SIN PROVEEDOR'}</p>
                          </td>
                          <td className="px-8 py-4">
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border border-slate-200 uppercase tracking-tighter`}>{p.category}</span>
                          </td>
                          <td className="px-8 py-4 font-black text-slate-900">${Number(p.amount).toLocaleString()}</td>
                          <td className="px-8 py-4 text-right">
                            <button onClick={() => deletePurchase(p.id)} className="p-2 text-red-100 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {purchases.length === 0 && <div className="p-20 text-center opacity-20 italic font-black uppercase tracking-[0.3em]">No hay compras registradas</div>}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {loading && (<div className="fixed bottom-10 right-10 bg-white p-5 rounded-3xl shadow-2xl flex items-center gap-4 border z-[1000] animate-pulse"><Loader2 className="animate-spin text-sky-500" size={20} /><span className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Sincronizando...</span></div>)}
    </div>
  );
};

export default ClinicSystem;
