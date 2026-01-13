
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Calendar as CalendarIcon, Clock, User, Dog, Plus, ChevronLeft, ChevronRight, Filter, Loader2, X
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

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('appointments').select('*').order('time', { ascending: true });
    if (data) setAppointments(data);
    setLoading(false);
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

    const { error } = await supabase.from('appointments').insert(newAppt);
    if (!error) {
      setShowModal(false);
      fetchAppointments();
    } else {
      alert("Error al agendar");
    }
  };

  const typeColors: any = {
    'CONSULTA': 'bg-sky-100 text-sky-700 border-sky-200',
    'VACUNA': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'CIRUGIA': 'bg-red-100 text-red-700 border-red-200',
    'CONTROL': 'bg-amber-100 text-amber-700 border-amber-200'
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Agendar Turno</h2>
              <button onClick={() => setShowModal(false)}><X /></button>
            </div>
            <form onSubmit={handleCreateAppointment} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Propietario</label>
                <input name="client_name" required className="w-full p-3 bg-slate-50 border rounded-xl" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nombre Mascota</label>
                <input name="pet_name" required className="w-full p-3 bg-slate-50 border rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Fecha</label>
                  <input name="date" type="date" defaultValue={selectedDate} required className="w-full p-3 bg-slate-50 border rounded-xl" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Hora</label>
                  <input name="time" type="time" required className="w-full p-3 bg-slate-50 border rounded-xl" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo</label>
                <select name="type" className="w-full p-3 bg-slate-50 border rounded-xl">
                  <option value="CONSULTA">Consulta General</option>
                  <option value="VACUNA">Vacunación</option>
                  <option value="CIRUGIA">Cirugía</option>
                  <option value="CONTROL">Control</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-sky-500 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-sky-600">Confirmar Turno</button>
            </form>
          </div>
        </div>
      )}

      <nav className="bg-sky-500 text-white px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition-colors"><ArrowLeft size={24} /></button>
          <h1 className="text-2xl font-bold flex items-center gap-3"><CalendarIcon /> Amazonia Consultorio</h1>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-white text-sky-600 px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md">
          <Plus size={20} /> Nuevo Turno
        </button>
      </nav>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-black text-slate-800">Agenda Mensual</h2>
              <div className="flex gap-1"><ChevronLeft size={16}/><ChevronRight size={16}/></div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {Array.from({ length: 30 }).map((_, i) => {
                const day = i + 1;
                const dStr = `2024-11-${day.toString().padStart(2, '0')}`;
                const active = selectedDate === dStr;
                const hasAppt = appointments.some(a => a.date === dStr);
                return (
                  <button key={i} onClick={() => setSelectedDate(dStr)} className={`aspect-square flex flex-col items-center justify-center rounded-full text-xs transition-all relative ${active ? 'bg-sky-500 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-600'}`}>
                    {day}
                    {hasAppt && <span className={`absolute bottom-1 w-1 h-1 rounded-full ${active ? 'bg-white' : 'bg-sky-500'}`}></span>}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border text-center text-slate-400">
            <Dog className="mx-auto mb-2 opacity-10" size={48} />
            <p className="text-[10px] font-bold uppercase tracking-wider">Historial Clínico</p>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-6 rounded-3xl border flex justify-between items-center">
            <h2 className="text-xl font-black">Turnos para el {selectedDate}</h2>
            <button className="text-sky-500 font-bold flex items-center gap-1 text-sm"><Filter size={14}/> Filtrar</button>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-sky-500" size={40} /></div>
          ) : appointments.filter(a => a.date === selectedDate).length === 0 ? (
            <div className="bg-white p-20 rounded-3xl border border-dashed text-center text-slate-400">No hay turnos agendados</div>
          ) : (
            appointments.filter(a => a.date === selectedDate).map(appt => (
              <div key={appt.id} className="bg-white p-6 rounded-2xl border flex items-center gap-6 group hover:shadow-md transition-shadow">
                <div className="flex flex-col items-center min-w-[80px] border-r">
                  <Clock size={16} className="text-sky-400 mb-1" />
                  <span className="font-black text-lg">{appt.time.slice(0,5)}</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400 uppercase">Mascota: <span className="text-slate-800">{appt.pet_name}</span></p>
                  <p className="font-bold text-slate-600">Dueño: {appt.client_name}</p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-[10px] font-black border uppercase tracking-widest ${typeColors[appt.type]}`}>
                  {appt.type}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default ClinicSystem;
