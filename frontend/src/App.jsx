import { useEffect, useState } from 'react'

function App() {
  const [races, setRaces] = useState([])

  useEffect(() => {
    fetch('http://127.0.0.1:8000/races')
      .then(res => res.json())
      .then(data => setRaces(data))
      .catch(err => console.error("Ошибка:", err))
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="mb-10 border-b border-red-600 pb-4">
        <h1 className="text-4xl font-black uppercase tracking-widest text-red-600">
          🏎 F1 Telemetry <span className="text-white">Pro</span>
        </h1>
        <p className="text-gray-400 mt-2">Data Analysis & Race Insights</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {races.map((race) => (
          <div 
            key={race.id} 
            className="bg-gray-800 border border-gray-700 p-4 rounded-lg hover:border-red-500 transition-all cursor-pointer shadow-lg group"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold group-hover:text-red-500">{race.location}</h3>
                <p className="text-gray-400 text-sm">{race.circuit}</p>
              </div>
              <span className="bg-red-600 text-xs font-bold px-2 py-1 rounded">
                {race.year}
              </span>
            </div>
            <button className="mt-4 w-full bg-gray-700 hover:bg-red-600 text-white py-2 rounded font-semibold transition-colors">
              Analyze Telemetry
            </button>
          </div>
        ))}
      </div>

      {races.length === 0 && (
        <div className="text-center py-20">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full mb-4"></div>
          <p>Connecting to Postgres Database...</p>
        </div>
      )}
    </div>
  )
}

export default App