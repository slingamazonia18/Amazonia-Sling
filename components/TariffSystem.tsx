
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
  }, []);

  const fetchTariffs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('tariffs').select('*').order('category', { ascending: true });
      if (error) throw error;
      setTariffs(data || []);
    } catch (err: any) {
      console.warn("Error al cargar tarifas (puede ser por tabla faltante):", err.message);
      // Solo cargamos defaults si no hay nada en el estado
      setTariffs(prev => prev.length === 0 ? [
        { id: '1', category: 'Razas chicas hasta 10 kilos', service_name: 'Corte y baño', total_price: 18000, groomer_price: 10800 },
        { id: '2', category: 'Razas chicas hasta 10 kilos', service_name: 'Baño y deslanado', total_price: 15000, groomer_price: 9000 },
        { id: '3', category: 'Razas medianas 11 a 22kg', service_name: 'Corte y baño', total_price: 23000, groomer_price: 13800 },
        { id: '4', category: 'Razas medianas 11 a 22kg', service_name: 'Baño y deslanado', total_price: 19000, groomer_price: 11400 },
        { id: '5', category: 'Razas grandes 23 a 40kg', service_name: 'Baño y corte', total_price: 37000, groomer_price: 22000 },
        { id: '6', category: 'Razas grandes 23 a 40kg', service_name: 'Baño y deslanado', total_price: 30000, groomer_price: 18000 },
      ] as Tariff[] : prev);
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
      if (editingTariff) {
        const { error } = await supabase.from('tariffs').update(tariffData).eq('id', editingTariff.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tariffs').insert(tariffData);
        if (error) throw error;
      }
      setShowModal(false);
      setEditingTariff(null);
      fetchTariffs();
    } catch (err: any) {
      console.error("Error al guardar tarifa:", err.message);
      // Fallback local para que el usuario pueda seguir trabajando
      if (editingTariff) {
        setTariffs(prev => prev.map(t => t.id === editingTariff.id ? { ...t, ...tariffData } : t));
      } else {
        setTariffs(prev => [...prev, { id: Math.random().toString(), ...tariffData } as Tariff]);
      }
      setShowModal(false);
      setEditingTariff(null);
    }
  };

  const deleteTariff = async (id: string) => {
    if (confirm("¿Eliminar esta tarifa?")) {
      try {
        const { error } = await supabase.from('tariffs').delete().eq('id', id);
        if (error) throw error;
        fetchTariffs();
      } catch (err) {
        setTariffs(prev => prev.filter(t => t.id !== id));
      }
    }
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
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {editingTariff ? 'Editar Tarifa' : 'Nueva Tarifa'}
              </h2>
              <button onClick={() => { setShowModal(false); setEditingTariff(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                <X />
              </button>
            </div>
            <form onSubmit={handleSaveTariff} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Categoría de Peso / Raza</label>
                <input name="category" defaultValue={editingTariff?.category} required placeholder="Ej: Razas chicas hasta 10 kilos" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nombre del Servicio</label>
                <input name="service_name" defaultValue={editingTariff?.service_name} required placeholder="Ej: Corte y baño" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Precio Total ($)</label>
                  <input name="total_price" type="number" defaultValue={editingTariff?.total_price} required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-lg" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Peluquero ($)</label>
                  <input name="groomer_price" type="number" defaultValue={editingTariff?.groomer_price} required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-lg" />
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black shadow-xl active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-2 mt-4">
                <Save size={20}/> GUARDAR TARIFA
              </button>
            </form>
          </div>
        </div>
      )}

      <nav className="bg-indigo-600 text-white px-6 py-6 flex items-center justify-between shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-black flex items-center gap-3 tracking-tighter uppercase">
            TARIFAS PELUQUERIA
          </h1>
        </div>
        <button 
          onClick={() => { setEditingTariff(null); setShowModal(true); }}
          className="bg-white text-indigo-600 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
        >
          <Plus size={18} /> AGREGAR TARIFA
        </button>
      </nav>

      <main className="flex-1 p-8 max-w-5xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
            <p className="font-black text-slate-400 uppercase tracking-widest">Cargando Precios...</p>
          </div>
        ) : (
          <div className="space-y-12 animate-in fade-in duration-700">
            {(Object.entries(groupedTariffs) as [string, Tariff[]][]).map(([category, items]) => (
              <section key={category} className="space-y-6">
                <div className="bg-indigo-700 p-4 rounded-2xl shadow-lg relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Dog size={80} />
                  </div>
                  <h3 className="text-2xl font-black text-white italic text-center tracking-tight">
                    {category}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {items.map((item) => (
                    <div key={item.id} className="bg-gradient-to-r from-blue-600 to-indigo-500 p-6 rounded-[2rem] text-white shadow-xl relative group hover:scale-[1.02] transition-transform">
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setEditingTariff(item); setShowModal(true); }}
                          className="p-2 bg-white/20 rounded-xl hover:bg-white/40 transition-colors"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => deleteTariff(item.id)}
                          className="p-2 bg-white/20 rounded-xl hover:bg-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <ul className="space-y-4">
                        <li className="flex items-center gap-3">
                          <span className="w-2 h-2 bg-white rounded-full"></span>
                          <p className="text-xl font-black leading-tight">
                            {item.service_name} <span className="text-blue-200 ml-1 font-bold">${item.total_price}</span>
                          </p>
                        </li>
                        <li className="flex items-center gap-3 ml-4 opacity-90">
                          <span className="w-1.5 h-1.5 bg-blue-200 rounded-full"></span>
                          <p className="text-lg font-bold">
                            peluquero <span className="text-emerald-300 ml-1 font-black">${item.groomer_price}</span>
                          </p>
                        </li>
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <footer className="p-8 text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic">
          Amazonia Peluquería Canina • Precios Sujetos a Cambios
        </p>
      </footer>
    </div>
  );
};

export default TariffSystem;
