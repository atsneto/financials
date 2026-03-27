import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

export default function Simulator() {
  const [renda, setRenda] = useState("5000");
  const [gastos, setGastos] = useState("3500");
  const [aporte, setAporte] = useState("500");
  const [taxa, setTaxa] = useState("10");
  const [anos, setAnos] = useState("20");
  const [meta, setMeta] = useState("");

  const parseNum = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  const fmt = v => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v || 0));

  const safeRenda = parseNum(renda);
  const safeGastos = parseNum(gastos);
  const safeAporte = parseNum(aporte);
  const safeTaxa = parseNum(taxa);
  const safeAnos = Math.max(1, Math.min(50, parseNum(anos)));
  const safeMeta = parseNum(meta);

  const monthlyRate = Math.pow(1 + safeTaxa / 100, 1 / 12) - 1;
  const livreParaInvestir = safeRenda - safeGastos;

  // Gerar projeção
  const chartData = [];
  let patrimonio = 0;
  let independenceYear = null;
  let metaYear = null;

  for (let m = 0; m <= safeAnos * 12; m++) {
    patrimonio = patrimonio * (1 + monthlyRate) + safeAporte;
    const rendimentoMensal = patrimonio * monthlyRate;

    if (independenceYear === null && safeGastos > 0 && rendimentoMensal >= safeGastos) {
      independenceYear = m / 12;
    }
    if (metaYear === null && safeMeta > 0 && patrimonio >= safeMeta) {
      metaYear = m / 12;
    }

    if (m % 12 === 0) {
      chartData.push({
        year: m / 12,
        label: m === 0 ? "Hoje" : `${m / 12}A`,
        patrimonio: Number(patrimonio.toFixed(2)),
        aportado: Number((safeAporte * m).toFixed(2)),
        rendimentoMensal: Number(rendimentoMensal.toFixed(2)),
      });
    }
  }

  const finalPatrimonio = chartData[chartData.length - 1]?.patrimonio || 0;
  const totalAportado = safeAporte * safeAnos * 12;
  const totalRendimento = finalPatrimonio - totalAportado;

  const ChartTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2 text-xs">
        <p className="font-medium text-slate-700 mb-1">Ano {payload[0]?.payload?.year}</p>
        <p className="text-emerald-600">Patrimônio: {fmt(payload[0]?.value)}</p>
        {payload[1] && <p className="text-indigo-500">Aportado: {fmt(payload[1]?.value)}</p>}
        <p className="text-slate-400 mt-0.5">Rend. mensal: {fmt(payload[0]?.payload?.rendimentoMensal)}</p>
      </div>
    );
  };

  const milestoneYears = [1, 2, 5, 10, 15, 20, 25, 30].filter(y => y <= safeAnos);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Simulador de Futuro Financeiro</h1>
        <p className="text-sm text-slate-500">Projete seu patrimônio e descubra quando atingir a independência financeira</p>
      </div>

      {/* Parâmetros */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Parâmetros da simulação</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: "Renda mensal (R$)", value: renda, set: setRenda },
            { label: "Gastos mensais (R$)", value: gastos, set: setGastos },
            { label: "Aporte mensal (R$)", value: aporte, set: setAporte },
            { label: "Retorno anual (%)", value: taxa, set: setTaxa },
            { label: "Período (anos)", value: anos, set: setAnos },
            { label: "Meta de patrimônio (R$)", value: meta, set: setMeta, placeholder: "Opcional" },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label} className="flex flex-col">
              <label className="text-xs text-slate-500 mb-1">{label}</label>
              <input
                type="number"
                value={value}
                onChange={e => set(e.target.value)}
                placeholder={placeholder}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          ))}
        </div>
        {safeAporte > 0 && livreParaInvestir < safeAporte && (
          <p className="text-xs text-amber-600 mt-3 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
            Aporte ({fmt(safeAporte)}) maior que o disponível após gastos ({fmt(livreParaInvestir)})
          </p>
        )}
      </section>

      {/* Cards de resultado */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Patrimônio em {safeAnos} anos</p>
          <p className="text-lg font-bold text-emerald-600 mt-1">{fmt(finalPatrimonio)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Total aportado</p>
          <p className="text-lg font-bold text-slate-800 mt-1">{fmt(totalAportado)}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
          <p className="text-xs text-emerald-600">Rendimento dos juros</p>
          <p className="text-lg font-bold text-emerald-700 mt-1">{fmt(totalRendimento)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Rend. mensal no fim</p>
          <p className="text-lg font-bold text-slate-800 mt-1">{fmt(chartData[chartData.length - 1]?.rendimentoMensal || 0)}</p>
        </div>
      </section>

      {/* Independência financeira + meta */}
      {(independenceYear !== null || safeMeta > 0) && (
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {independenceYear !== null ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
              <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider mb-1">Independência Financeira</p>
              <p className="text-3xl font-bold text-emerald-700">em {independenceYear.toFixed(1)} anos</p>
              <p className="text-xs text-emerald-600 mt-1">Seus rendimentos mensais cobrirão seus gastos de {fmt(safeGastos)}</p>
            </div>
          ) : safeGastos > 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Independência Financeira</p>
              <p className="text-sm font-semibold text-slate-600 mt-1">Não atingida em {safeAnos} anos</p>
              <p className="text-xs text-slate-400 mt-1">Aumente o aporte ou o prazo da simulação</p>
            </div>
          ) : null}

          {safeMeta > 0 && (
            metaYear !== null ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wider mb-1">Meta: {fmt(safeMeta)}</p>
                <p className="text-3xl font-bold text-blue-700">em {metaYear.toFixed(1)} anos</p>
                <p className="text-xs text-blue-600 mt-1">Você atingirá sua meta de patrimônio</p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <p className="text-xs font-medium text-amber-700 uppercase tracking-wider mb-1">Meta: {fmt(safeMeta)}</p>
                <p className="text-sm font-semibold text-amber-700 mt-1">Não atingida em {safeAnos} anos</p>
                <p className="text-xs text-amber-600 mt-1">Aumente o aporte ou o prazo para atingir a meta</p>
              </div>
            )
          )}
        </section>
      )}

      {/* Gráfico */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Evolução do patrimônio</h3>
        <p className="text-xs text-slate-400 mb-4">Projeção ao longo de {safeAnos} anos com juros compostos a {safeTaxa}% a.a.</p>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorPatrimonio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAportado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={Math.max(1, Math.floor(safeAnos / 8))} />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`}
                width={55}
              />
              <Tooltip content={<ChartTooltip />} />
              {safeMeta > 0 && (
                <ReferenceLine
                  y={safeMeta}
                  stroke="#3b82f6"
                  strokeDasharray="4 4"
                  label={{ value: "Meta", position: "insideTopRight", fontSize: 10, fill: "#3b82f6" }}
                />
              )}
              <Area type="monotone" dataKey="aportado" name="Aportado" stroke="#6366f1" strokeWidth={2} fill="url(#colorAportado)" dot={false} />
              <Area type="monotone" dataKey="patrimonio" name="Patrimônio" stroke="#10b981" strokeWidth={2} fill="url(#colorPatrimonio)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Tabela de marcos */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Marcos ao longo do tempo</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 text-xs font-medium text-slate-400">Ano</th>
                <th className="text-right py-2 text-xs font-medium text-slate-400">Patrimônio</th>
                <th className="text-right py-2 text-xs font-medium text-slate-400">Total aportado</th>
                <th className="text-right py-2 text-xs font-medium text-slate-400">Rend. juros</th>
                <th className="text-right py-2 text-xs font-medium text-slate-400">Rend. mensal</th>
              </tr>
            </thead>
            <tbody>
              {chartData
                .filter(d => milestoneYears.includes(d.year))
                .map(d => (
                  <tr key={d.year} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-2 text-slate-600">{d.year} {d.year === 1 ? "ano" : "anos"}</td>
                    <td className="py-2 text-right font-semibold text-slate-800">{fmt(d.patrimonio)}</td>
                    <td className="py-2 text-right text-slate-500">{fmt(d.aportado)}</td>
                    <td className="py-2 text-right text-emerald-600">+{fmt(d.patrimonio - d.aportado)}</td>
                    <td className="py-2 text-right text-emerald-600">{fmt(d.rendimentoMensal)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
