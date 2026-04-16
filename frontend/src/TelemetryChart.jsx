import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function TelemetryChart({ data }) {
  if (!data || data.length === 0) return <div className="text-gray-500 italic text-center p-4">Waiting for telemetry data comparison...</div>;

  return (
    <div className="h-72 w-full bg-gray-900/50 p-4 rounded-xl border border-gray-700/50 mt-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-white font-black uppercase text-[10px] tracking-widest border-l-2 border-red-600 pl-2">
          Comparative Speed Analysis
        </h4>
        <span className="text-[9px] text-gray-500 font-bold uppercase">Unit: km/h</span>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
          <XAxis dataKey="name" hide />
          <YAxis 
            stroke="#9CA3AF" 
            fontSize={10} 
            tickFormatter={(value) => `${value}`}
            domain={['auto', 'auto']}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px', fontSize: '12px' }}
            itemStyle={{ fontWeight: 'bold' }}
            cursor={{ stroke: '#4B5563', strokeWidth: 1 }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
          
          {/* Линия ПЕРВОГО пилота (Синяя) */}
          <Line 
            name="Driver A"
            type="monotone" 
            dataKey="speed1" 
            stroke="#3B82F6" 
            strokeWidth={3} 
            dot={false} 
            activeDot={{ r: 4, fill: '#3B82F6' }}
            animationDuration={1500}
          />

          {/* Линия ВТОРОГО пилота (Красная) */}
          <Line 
            name="Driver B"
            type="monotone" 
            dataKey="speed2" 
            stroke="#EF4444" 
            strokeWidth={3} 
            dot={false} 
            activeDot={{ r: 4, fill: '#EF4444' }}
            animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}