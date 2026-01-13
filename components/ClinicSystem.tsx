
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Calendar as CalendarIcon, Clock, User, Dog, Plus, ChevronLeft, ChevronRight, Filter, Loader2, X, Trash2
} from 'lucide-react';
import { Appointment } from '../types';
import { supabase } from '../lib/supabase';

interface ClinicSystemProps {
  onBack: () => void;
}

const ClinicSystem: React.FC<ClinicSystemProps> = ({ onBack }) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'DÍA' | 'SEMANA'>('DÍA');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('appointments').select('*').order('date', { ascending: true }).order('time', { ascending: true });
      if (error) throw error;
      if (data) setAppointments(data);
    } catch (err: any) {
      console.error("Error al buscar turnos:", err.message);
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
      fetchAppointments();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const deleteAppointment = async (id: string) => {
    if (confirm("¿Eliminar este turno?")) {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) alert(error.message);
      else fetchAppointments();
    }
  };

  const typeColors: any = {
    'CONSULTA': 'bg-sky-100 text-sky-700 border-sky-200',
    'VACUNA': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'CIRUGIA': 'bg-red-100 text-red-700 border-red-200',
    'CONTROL': 'bg-amber-100 text-amber-700 border-amber-200'
  };

  // Mejorada la lógica de filtrado usando strings ISO para evitar problemas de Timezone
  const getFilteredAppointments = () => {
    if (viewMode === 'DÍA') {
      return appointments.filter(a => a.date === selectedDate);
    } else {
      const start = new Date(selectedDate);
      const end = new Date(selectedDate);
      end.setDate(start.getDate() + 7);
      
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      
      return appointments.filter(a => a.date >= startStr && a.date <= endStr);
    }
  };

  const filtered = getFilteredAppointments();

  const grouped = filtered.reduce((acc: any, appt) => {
    if (!acc[appt.date]) acc[appt.date] = [];
    acc[appt.date].push(appt);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Nuevo Turno</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X /></button>
            </div>
            <form onSubmit={handleCreateAppointment} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dueño / Cliente</label>
                <input name="client_name" placeholder="Ej: Juan Perez" required className="w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Paciente</label>
                <input name="pet_name" placeholder="Ej: Firulais" required className="w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</label>
                  <input name="date" type="date" defaultValue={selectedDate} required className="w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hora</label>
                  <input name="time" type="time" required className="w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivo</label>
                <select name="type" className="w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none appearance-none">
                  <option value="CONSULTA">Consulta Clínica</option>
                  <option value="VACUNA">Plan de Vacunación</option>
                  <option value="CIRUGIA">Intervención Quirúrgica</option>
                  <option value="CONTROL">Control de Seguimiento</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-sky-500 text-white py-4 rounded-[1.5rem] font-black shadow-xl hover:bg-sky-600 transition-all active:scale-95 mt-4">AGENDAR TURNO</button>
            </form>
          </div>
        </div>
      )}

      <nav className="bg-sky-500 text-white px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition-colors"><ArrowLeft size={24} /></button>
          <h1 className="text-2xl font-bold flex items-center gap-3"><CalendarIcon /> Amazonia Consultorio</h1>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-white text-sky-600 px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md transition-transform active:scale-95">
          <Plus size={20} /> Nuevo Turno
        </button>
      </nav>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-slate-800 tracking-tight">Calendario</h2>
              <div className="flex gap-1">
                <button 
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() - 1);
                    setSelectedDate(d.toISOString().split('T')[0]);
                  }}
                  className="p-1 hover:bg-slate-100 rounded-lg"><ChevronLeft size={16}/></button>
                <button 
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() + 1);
                    setSelectedDate(d.toISOString().split('T')[0]);
                  }}
                  className="p-1 hover:bg-slate-100 rounded-lg"><ChevronRight size={16}/></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-4">
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(d => <span key={d} className="text-[10px] font-black text-slate-300">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 30 }).map((_, i) => {
                const day = i + 1;
                const dStr = `2024-11-${day.toString().padStart(2, '0')}`;
                const active = selectedDate === dStr;
                const hasAppt = appointments.some(a => a.date === dStr);
                return (
                  <button 
                    key={i} 
                    onClick={() => setSelectedDate(dStr)} 
                    className={`aspect-square flex flex-col items-center justify-center rounded-2xl text-sm font-bold transition-all relative ${active ? 'bg-sky-500 text-white shadow-lg ring-4 ring-sky-100' : 'hover:bg-slate-50 text-slate-600'}`}
                  >
                    {day}
                    {hasAppt && <span className={`absolute bottom-2 w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : 'bg-sky-500'}`}></span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {viewMode === 'DÍA' ? 'Agenda del Día' : 'Agenda de los próximos 7 días'}
              </h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                {new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button 
                onClick={() => setViewMode('DÍA')}
                className={`px-6 py-2 rounded-xl font-black text-xs transition-all ${viewMode === 'DÍA' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                DÍA
              </button>
              <button 
                onClick={() => setViewMode('SEMANA')}
                className={`px-6 py-2 rounded-xl font-black text-xs transition-all ${viewMode === 'SEMANA' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                SEMANA
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-dashed">
                <Loader2 className="animate-spin text-sky-500 mb-4" size={40} />
                <span className="text-slate-400 font-bold">Cargando agenda...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white p-20 rounded-[2.5rem] border border-dashed border-slate-200 text-center text-slate-400">
                <CalendarIcon className="mx-auto mb-4 opacity-10" size={60} />
                <p className="text-lg font-bold">No hay turnos registrados</p>
              </div>
            ) : viewMode === 'DÍA' ? (
              filtered.map(appt => <AppointmentCard key={appt.id} appt={appt} onDelete={deleteAppointment} typeColors={typeColors} />)
            ) : (
              sortedDates.map(date => (
                <div key={date} className="space-y-3">
                  <div className="flex items-center gap-4 px-4">
                    <span className="h-px bg-slate-200 flex-1"></span>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                      {new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </h3>
                    <span className="h-px bg-slate-200 flex-1"></span>
                  </div>
                  {grouped[date].map((appt: any) => <AppointmentCard key={appt.id} appt={appt} onDelete={deleteAppointment} typeColors={typeColors} />)}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const AppointmentCard = ({ appt, onDelete, typeColors }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center gap-6 group hover:shadow-xl transition-all duration-300">
    <div className="flex flex-col items-center min-w-[80px] border-r border-slate-100 pr-6">
      <Clock size={16} className="text-sky-400 mb-1" />
      <span className="font-black text-xl text-slate-800">{appt.time.slice(0,5)}</span>
    </div>
    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
      <div>
        <p className="text-[10px] font-black text-slate-300 uppercase">Propietario</p>
        <p className="font-bold text-slate-800">{appt.client_name}</p>
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-300 uppercase">Paciente</p>
        <p className="font-bold text-slate-800 flex items-center gap-2"><Dog size={14} className="text-sky-500" /> {appt.pet_name}</p>
      </div>
    </div>
    <div className={`px-4 py-2 rounded-xl text-[9px] font-black border uppercase tracking-widest ${typeColors[appt.type] || 'bg-slate-100'}`}>
      {appt.type}
    </div>
    <button onClick={() => onDelete(appt.id)} className="opacity-0 group-hover:opacity-100 p-3 text-red-300 hover:text-red-500 transition-all">
      <Trash2 size={18} />
    </button>
  </div>
);

export default ClinicSystem;
