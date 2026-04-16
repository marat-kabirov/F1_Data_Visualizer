import { useEffect, useState } from 'react'
import TelemetryChart from './TelemetryChart'
import { Activity } from 'lucide-react'

function App() {
  const [races, setRaces] = useState([])
  const [selectedRace, setSelectedRace] = useState(null)
  const [telemetry, setTelemetry] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('http://127.0.0.1:8000/races')
      .then(res => res.json())
      .then(data => setRaces(data))
  }, [])

  const handleAnalyze = async (sessionKey) => {
  setLoading(true);
  setSelectedRace(sessionKey);
  setTelemetry([]); // Очищаем старый график
  
  try {
    // 1. Синхронизируем (загружаем из внешнего API в наш Postgres)
    await fetch(`http://127.0.0.1:8000/sync-telemetry/${sessionKey}`, { method: 'POST' });
    
    // 2. Сразу же запрашиваем эти данные из НАШЕГО бэкенда
    const response = await fetch(`http://127.0.0.1:8000/telemetry/${sessionKey}`);
    const data = await response.json();
    
    setTelemetry(data); // Кладём данные в стейт, и график сам вырастет
  } catch (err) {
    console.error("Ошибка загрузки данных:", err);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <header className="mb-10 border-b border-red-600 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-red-600">🏎 F1 Telemetry <span className="text-white">Pro</span></h1>
          <p className="text-gray-400 mt-1 flex items-center gap-2"><Activity size={16}/> Pipeline Status: Connected to Postgres</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {races.map((race) => (
          <div key={race.id} className="bg-gray-800 border border-gray-700 p-6 rounded-2xl hover:border-red-500 transition-all shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <span className="bg-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase italic">Session {race.session_key}</span>
              <span className="text-gray-500 text-sm font-mono">{race.year}</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">{race.location}</h3>
            <p className="text-gray-400 text-sm mb-6">{race.circuit}</p>
            
            <button 
              onClick={() => handleAnalyze(race.session_key)}
              disabled={loading && selectedRace === race.session_key}
              className="w-full bg-white hover:bg-red-600 text-black hover:text-white py-3 rounded-xl font-bold transition-all disabled:bg-gray-600"
            >
              {loading && selectedRace === race.session_key ? "Syncing..." : "Analyze Telemetry"}
            </button>
            {/* Внутри races.map, под кнопкой */}
              {selectedRace === race.session_key && (
                <TelemetryChart data={telemetry} />
              )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App