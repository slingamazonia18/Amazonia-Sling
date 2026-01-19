
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Tags, Plus, Save, Trash2, X, Loader2, Edit3, Dog
} from 'lucide-react';
import { Tariff } from '../types';
import { supabase } from '../lib/supabase';

interface TariffSystemProps {
  onBack: () => void;
}

const TariffSystem: React.FC<TariffSystemProps> = ({ onBack }) => {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTariff, setEditingTariff] = useState<Tariff | null>(null);

  useEffect(() => {
    fetchTariffs();

    // SUSCRIPCIÓN REALTIME PARA TARIFAS
    const channel = supabase
      .channel('tariff-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tariffs' }, fetchTariffs)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTariffs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('tariffs').select('*').order('category', { ascending: true });
      if (error) throw error;
      if (data) setTariffs(data);
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTariff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const tariffData = {
      category: formData.get('category') as string,
      service_name: formData.get('service_name') as string,
      total_price: Number(formData.get('total_price')),
      groomer_price: Number(formData.get('groomer_price'))
    };

    try {
      if (editingTariff) await supabase.from('tariffs').update(tariffData).eq('id', editingTariff.id);
      else await supabase.from('tariffs').insert(tariffData);
      setShowModal(false);
      setEditingTariff(null);
    } catch (err: any) { alert(err.message); }
  };

  const groupedTariffs = useMemo(() => {
    return tariffs.reduce<Record<string, Tariff[]>>((acc, t) => {
      if (!acc[t.category]) acc[t.category] = [];
      acc[t.category].push(t);
      return acc;
    }, {});
  }, [tariffs]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      <nav className="bg-indigo-600 text-white px-6 py-6 flex items-center justify-between shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full"><ArrowLeft size={24} /></button>
          <h1 className="text-3xl font-black tracking-tighter uppercase">Tarifas</h1>
        </div>
        <button onClick={() => { setEditingTariff(null); setShowModal(true); }} className="bg-white text-indigo-600 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-2"><Plus size={18} /> Agregar</button>
      </nav>

      <main className="flex-1 p-8 max-w-5xl mx-auto w-full">
        <div className="space-y-12">
          {/* Fix: Explicitly cast Object.entries to ensure 'items' is treated as Tariff[] to avoid 'unknown' type error */}
          {(Object.entries(groupedTariffs) as [string, Tariff[]][]).map(([category, items]) => (
            <section key={category} className="space-y-6">
              <div className="bg-indigo-700 p-4 rounded-2xl shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Dog size={80} /></div>
                <h3 className="text-2xl font-black text-white italic text-center tracking-tight">{category}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {items.map((item) => (
                  <div key={item.id} className="bg-gradient-to-r from-blue-600 to-indigo-500 p-6 rounded-[2rem] text-white shadow-xl relative group hover:scale-[1.02] transition-transform">
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingTariff(item); setShowModal(true); }} className="p-2 bg-white/20 rounded-xl"><Edit3 size={16} /></button>
                      <button onClick={() => supabase.from('tariffs').delete().eq('id', item.id)} className="p-2 bg-white/20 rounded-xl hover:bg-red-500"><Trash2 size={16} /></button>
                    </div>
                    <ul className="space-y-4">
                      <li className="flex items-center gap-3">
                        <span className="w-2 h-2 bg-white rounded-full"></span>
                        <p className="text-xl font-black">{item.service_name} <span className="text-blue-200 ml-1">${item.total_price}</span></p>
                      </li>
                      <li className="flex items-center gap-3 ml-4 opacity-90">
                        <span className="w-1.5 h-1.5 bg-blue-200 rounded-full"></span>
                        <p className="text-lg font-bold">peluquero <span className="text-emerald-300 ml-1 font-black">${item.groomer_price}</span></p>
                      </li>
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-black mb-6">{editingTariff ? 'Editar' : 'Nueva'} Tarifa</h2>
            <form onSubmit={handleSaveTariff} className="space-y-4">
              <input name="category" defaultValue={editingTariff?.category} required placeholder="Categoría (Peso/Raza)" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold" />
              <input name="service_name" defaultValue={editingTariff?.service_name} required placeholder="Nombre del Servicio" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold" />
              <div className="grid grid-cols-2 gap-4">
                <input name="total_price" type="number" defaultValue={editingTariff?.total_price} required placeholder="Precio $" className="w-full p-4 bg-slate-50 border rounded-2xl font-black" />
                <input name="groomer_price" type="number" defaultValue={editingTariff?.groomer_price} required placeholder="Peluquero $" className="w-full p-4 bg-slate-50 border rounded-2xl font-black" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl">Guardar</button>
            </form>
          </div>
        </div>
      )}
      {loading && (<div className="fixed bottom-10 right-10 bg-white p-5 rounded-3xl shadow-2xl flex items-center gap-4 border z-[1000] animate-pulse"><Loader2 className="animate-spin text-indigo-600" size={20} /><span className="font-black text-[10px] uppercase text-slate-500">Sincronizando Precios...</span></div>)}
    </div>
  );
};

export default TariffSystem;
