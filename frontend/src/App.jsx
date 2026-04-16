import { useEffect, useState } from 'react'
import TelemetryChart from './TelemetryChart'
import { Activity, Zap, BarChart3, ShieldAlert } from 'lucide-react'

function App() {
  const [races, setRaces] = useState([])
  const [selectedRace, setSelectedRace] = useState(null)
  const [selectedYear, setSelectedYear] = useState("2026")
  const [driver1, setDriver1] = useState("")
  const [driver2, setDriver2] = useState("")
  const [availableDrivers, setAvailableDrivers] = useState([])
  const [telemetry, setTelemetry] = useState([])
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    fetch('http://127.0.0.1:8000/races')
      .then(res => res.json())
      .then(data => setRaces(data))
  }, [])

  // Фильтрация: отображаем только те гонки, которые уже состоялись
  const filteredRaces = races.filter(race => {
    if (String(race.year) !== selectedYear) return false;
    if (!race.date_start) return selectedYear !== "2026";
    return new Date(race.date_start) < new Date();
  });

  const loadDrivers = async (sessionKey) => {
    // Если выбрали новую гонку — полностью сбрасываем состояние предыдущей
    if (selectedRace !== sessionKey) {
      setAvailableDrivers([]);
      setDriver1("");
      setDriver2("");
      setTelemetry([]);
      setAnalysis("");
    }
    
    setSelectedRace(sessionKey);
    try {
      const res = await fetch(`http://127.0.0.1:8000/drivers/${sessionKey}`);
      const data = await res.json();
      setAvailableDrivers(data);
    } catch (e) {
      console.error("Driver load error:", e);
    }
  };

  const handleCompare = async (sessionKey) => {
    if (!driver1 || !driver2) return alert("Select 2 pilots");
    setLoading(true);
    setAnalysis("");
    try {
      // Параллельно синхронизируем данные обоих пилотов
      await Promise.all([
        fetch(`http://127.0.0.1:8000/sync-telemetry/${sessionKey}/${driver1}`, { method: 'POST' }),
        fetch(`http://127.0.0.1:8000/sync-telemetry/${sessionKey}/${driver2}`, { method: 'POST' })
      ]);

      // Получаем накопленную телеметрию
      const [r1, r2] = await Promise.all([
        fetch(`http://127.0.0.1:8000/telemetry/${sessionKey}/${driver1}`),
        fetch(`http://127.0.0.1:8000/telemetry/${sessionKey}/${driver2}`)
      ]);
      
      const d1 = await r1.json();
      const d2 = await r2.json();

      setTelemetry(d1.map((p, i) => ({
        name: i,
        speed1: p.speed,
        speed2: d2[i]?.speed || null
      })));
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  const runAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/analyze-telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telemetry)
      });
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (e) { 
      setAnalysis("AI Service Unavailable"); 
    } finally { 
      setIsAnalyzing(false); 
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 font-sans">
      <header className="mb-10 flex justify-between items-center border-b border-red-600/20 pb-8">
        <div>
          <h1 className="text-4xl font-black italic text-red-600 tracking-tighter">F1 ANALYTICS <span className="text-white">PRO</span></h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em]">Ph.D Grade Telemetry Research Tool</p>
        </div>
        
        <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-800">
          {["2024", "2025", "2026"].map(y => (
            <button key={y} onClick={() => {
              setSelectedYear(y);
              setSelectedRace(null); // Сброс карточки при смене года
            }}
              className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${selectedYear === y ? 'bg-red-600 shadow-lg shadow-red-900/20' : 'text-gray-500 hover:text-white'}`}>
              {y}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRaces.length > 0 ? filteredRaces.map(race => (
          <div key={race.id} className={`transition-all duration-500 bg-gray-900 p-6 rounded-[2rem] border ${selectedRace === race.session_key ? 'border-red-600/50 shadow-2xl shadow-red-900/10' : 'border-gray-800'}`}>
            <div className="flex justify-between items-start mb-6">
               <h3 className="text-2xl font-black uppercase italic leading-none">{race.location}</h3>
               <span className="text-[10px] bg-red-600 px-2 py-1 rounded-md font-bold">S-{race.session_key}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-blue-400 uppercase ml-1">Pilot A</label>
                <select 
                  className="w-full bg-black border border-gray-800 p-3 rounded-xl text-xs font-bold focus:border-blue-500 outline-none transition-colors"
                  value={selectedRace === race.session_key ? driver1 : ""}
                  onFocus={() => loadDrivers(race.session_key)}
                  onChange={e => setDriver1(e.target.value)}
                >
                  <option value="">-- Choose --</option>
                  {selectedRace === race.session_key && availableDrivers.map(d => (
                    <option key={`a-${d.number}`} value={d.number}>
                      #{d.number} {d.name} {/* ИСПРАВЛЕНО: Теперь выводится полное имя */}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-red-400 uppercase ml-1">Pilot B</label>
                <select 
                  className="w-full bg-black border border-gray-800 p-3 rounded-xl text-xs font-bold focus:border-red-500 outline-none transition-colors"
                  value={selectedRace === race.session_key ? driver2 : ""}
                  onFocus={() => loadDrivers(race.session_key)}
                  onChange={e => setDriver2(e.target.value)}
                >
                  <option value="">-- Choose --</option>
                  {selectedRace === race.session_key && availableDrivers.map(d => (
                    <option key={`b-${d.number}`} value={d.number}>
                      #{d.number} {d.name} {/* ИСПРАВЛЕНО: Теперь выводится полное имя */}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button 
              onClick={() => handleCompare(race.session_key)} 
              className="w-full bg-white hover:bg-gray-200 text-black py-4 rounded-2xl font-black uppercase text-[11px] transition-all mb-4 tracking-widest disabled:opacity-50"
              disabled={loading && selectedRace === race.session_key}
            >
              {loading && selectedRace === race.session_key ? "Extracting Data..." : "Compare Telemetry"}
            </button>
            
            {selectedRace === race.session_key && telemetry.length > 0 && (
              <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-black/40 p-4 rounded-3xl border border-gray-800">
                  <TelemetryChart data={telemetry} />
                </div>
                
                <button 
                  onClick={runAIAnalysis} 
                  disabled={isAnalyzing}
                  className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Zap size={16} className={isAnalyzing ? "animate-spin text-yellow-400" : ""} /> 
                  {isAnalyzing ? "AI IS ANALYZING..." : "RUN AI RESEARCH"}
                </button>
                
                {analysis && (
                  <div className="p-4 bg-blue-950/30 rounded-2xl border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2 text-blue-400">
                      <BarChart3 size={14} />
                      <span className="text-[10px] font-black uppercase">AI Engineering Verdict</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-blue-100 italic">"{analysis}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )) : (
          <div className="col-span-full py-32 text-center border-2 border-dashed border-gray-900 rounded-[3rem] bg-gray-900/20">
            <ShieldAlert size={64} className="mx-auto mb-6 text-gray-800" />
            <p className="text-gray-500 font-black uppercase tracking-[0.2em] text-sm">No live sessions available for {selectedYear}</p>
            <p className="text-gray-700 text-xs mt-2">Please check previous seasons for historical telemetry</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App