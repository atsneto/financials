import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function IncomeExpenseChart({ transactions }) {
  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];

  const year = new Date().getFullYear();

  const data = months.map((month) => ({
    month,
    income: 0,
    expense: 0,
  }));

  transactions.forEach((tx) => {
    const date = new Date(tx.created_at);
    if (date.getFullYear() === year) {
      const index = date.getMonth();
      if (tx.type === "income") {
        data[index].income += Number(tx.amount);
      } else {
        data[index].expense += Number(tx.amount);
      }
    }
  });

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3">
          <p className="text-sm font-medium text-slate-700 mb-1">{payload[0].payload.month}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-500">{entry.name}:</span>
              <span className="font-medium text-slate-800">
                R$ {Number(entry.value).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data} 
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
          <XAxis 
            dataKey="month" 
            interval={0} 
            tick={{ fontSize: 11, fill: '#64748b' }} 
            angle={-20} 
            textAnchor='end'
            height={60}
          />
          <YAxis 
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickFormatter={(value) => `R$ ${value}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.03)' }} />
          <Legend 
            wrapperStyle={{ paddingTop: '10px' }}
            iconType="circle"
          />
          <Bar 
            dataKey="income" 
            name="Receitas" 
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            animationDuration={800}
          />
          <Bar 
            dataKey="expense" 
            name="Despesas" 
            fill="#f87171"
            radius={[4, 4, 0, 0]}
            animationDuration={800}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
