import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TelemetryChart({ data }) {
  if (!data || data.length === 0) return <div className="text-gray-500 italic">No telemetry data to display. Click "Analyze" to sync.</div>;

  return (
    <div className="h-64 w-full bg-gray-800 p-4 rounded-xl border border-gray-700 mt-4">
      <h4 className="text-red-500 font-bold mb-2 uppercase text-xs tracking-widest">Live Speed Telemetry (Driver 1)</h4>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" hide />
          <YAxis stroke="#9CA3AF" fontSize={12} unit=" km/h" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }}
            itemStyle={{ color: '#EF4444' }}
          />
          <Line 
            type="monotone" 
            dataKey="speed" 
            stroke="#EF4444" 
            strokeWidth={2} 
            dot={false} 
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}