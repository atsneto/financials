import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export default function Investiments() {
  const [investments, setInvestments] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInv, setEditingInv] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [invToDelete, setInvToDelete] = useState(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("stocks");
  const [date, setDate] = useState("");
  const [expectedReturn, setExpectedReturn] = useState("");
  const [simAmount, setSimAmount] = useState("1000");
  const [simRate, setSimRate] = useState("10");
  const [simYears, setSimYears] = useState("1");
  const [simMonthly, setSimMonthly] = useState("0");
  const [cdiFee, setCdiFee] = useState("13.25");

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    function handleEsc(e) {
      if (e.key === "Escape") {
        setIsModalOpen(false);
        setIsDeleteModalOpen(false);
      }
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  async function loadData() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) return navigate("/login");
    const user = sessionData.session.user;

    const { data } = await supabase
      .from("investments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setInvestments(data || []);
  }

  function openAddModal() {
    setEditingInv(null);
    setName("");
    setAmount("");
    setType("stocks");
    setDate(new Date().toISOString().slice(0, 10));
    setExpectedReturn("");
    setIsModalOpen(true);
    setIsDeleteModalOpen(false);
  }

  function openEditModal(inv) {
    setEditingInv(inv);
    setName(inv.name);
    setAmount(inv.amount);
    setType(inv.type);
    setDate(inv.created_at ? inv.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setExpectedReturn(inv.expected_return || "");
    setIsModalOpen(true);
    setIsDeleteModalOpen(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session.user;

    if (editingInv) {
      await supabase
        .from("investments")
        .update({ name, amount, type, created_at: date + "T00:00:00", expected_return: expectedReturn })
        .eq("id", editingInv.id)
        .eq("user_id", user.id);
    } else {
      await supabase.from("investments").insert([
        { name, amount, type, created_at: date + "T00:00:00", expected_return: expectedReturn, user_id: user.id },
      ]);
    }

    setIsModalOpen(false);
    loadData();
  }

  function handleDelete(id) {
    setInvToDelete(id);
    setIsDeleteModalOpen(true);
    setIsModalOpen(false);
  }

  async function confirmDelete() {
    if (!invToDelete) return;
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) return;
    await supabase
      .from("investments")
      .delete()
      .eq("id", invToDelete)
      .eq("user_id", sessionData.session.user.id);
    setIsDeleteModalOpen(false);
    setInvToDelete(null);
    loadData();
  }

  const parseNum = (val) => {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  };

  const cdiRate = parseNum(cdiFee);

  const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  const averageReturn = investments.length > 0
    ? investments.reduce((sum, inv) => sum + Number(inv.expected_return || 0), 0) / investments.length
    : 0;
  const moneyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const formatMoney = (val) => moneyFormatter.format(Number(val || 0));
  const typeLabel = (t) => {
    switch (t) {
      case "stocks": return "Ações";
      case "bonds": return "Títulos";
      case "crypto": return "Cripto";
      case "reits": return "FIIs";
      case "etfs": return "ETFs";
      case "commodities": return "Commodities";
      case "cash": return "Caixa/Reserva";
      default: return "Outros";
    }
  };

  // =====================
  // Simulador geral
  // =====================
  const safeAmount = parseNum(simAmount);
  const safeRate = parseNum(simRate);
  const safeYears = Math.max(parseNum(simYears), 0);
  const safeMonthly = parseNum(simMonthly);
  const monthlyRate = Math.pow(1 + safeRate / 100, 1 / 12) - 1;
  const totalMonths = Math.round(safeYears * 12);
  const futureBase = safeAmount * Math.pow(1 + monthlyRate, totalMonths);
  const futureContrib = monthlyRate === 0
    ? safeMonthly * totalMonths
    : safeMonthly * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
  const simulationValue = futureBase + futureContrib;
  const monthlyContrib = safeMonthly * totalMonths;
  const totalYield = simulationValue - (safeAmount + monthlyContrib);

  // =====================
  // ANÁLISE DETALHADA POR INVESTIMENTO
  // =====================
  const projectionYears = [1, 2, 3, 5, 10];
  const investmentAnalysis = investments.map((inv) => {
    const amt = parseNum(inv.amount);
    const rate = parseNum(inv.expected_return);
    const mRate = Math.pow(1 + rate / 100, 1 / 12) - 1;
    const projections = projectionYears.map((y) => {
      const months = y * 12;
      const fv = amt * Math.pow(1 + mRate, months);
      return { year: y, value: fv, yield: fv - amt };
    });
    const daysHeld = Math.max(1, Math.floor((Date.now() - new Date(inv.created_at).getTime()) / (1000 * 60 * 60 * 24)));
    const monthsHeld = daysHeld / 30.44;
    const estimatedCurrent = amt * Math.pow(1 + mRate, monthsHeld);
    return { ...inv, amt, rate, projections, daysHeld, monthsHeld, estimatedCurrent, estimatedYield: estimatedCurrent - amt };
  });

  // Gráfico de projeção da carteira total
  const portfolioChartData = [];
  for (let m = 0; m <= 120; m++) {
    const label = m % 12 === 0 ? `${m / 12}A` : '';
    let totalValue = 0;
    let totalInvestedBase = 0;
    investments.forEach((inv) => {
      const amt = parseNum(inv.amount);
      const rate = parseNum(inv.expected_return);
      const mRate = Math.pow(1 + rate / 100, 1 / 12) - 1;
      totalValue += amt * Math.pow(1 + mRate, m);
      totalInvestedBase += amt;
    });
    if (m % 3 === 0 || m <= 12) {
      portfolioChartData.push({
        month: m,
        label: m === 0 ? 'Hoje' : m < 12 ? `${m}m` : `${(m / 12).toFixed(m % 12 === 0 ? 0 : 1)}A`,
        projetado: Number(totalValue.toFixed(2)),
        investido: Number(totalInvestedBase.toFixed(2)),
      });
    }
  }

  const SummaryCard = ({ title, value, isText = false }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-lg font-semibold text-slate-800 mt-1">
        {typeof value === "number" && !isText ? formatMoney(value) : value}
      </p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Investimentos</h1>
        <p className="text-sm text-slate-500">Controle, análise e projeção dos seus investimentos</p>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Total Investido" value={totalInvested} />
        <SummaryCard title="Retorno Médio" value={`${averageReturn.toFixed(2)}%`} isText />
        <SummaryCard title="Investimentos" value={investments.length} isText />
        <SummaryCard title="Diversificação" value={`${new Set(investments.map((inv) => inv.type)).size} tipos`} isText />
      </section>

      {/* CDI BENCHMARK */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Comparação com CDI</h3>
            <p className="text-xs text-slate-400">Veja quais investimentos estão acima ou abaixo do CDI</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 flex-shrink-0">CDI (% a.a.):</label>
            <input
              type="number"
              value={cdiFee}
              onChange={e => setCdiFee(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              step="0.01"
            />
          </div>
        </div>
        {investments.length > 0 ? (
          <div className="space-y-2">
            {investments.map(inv => {
              const rate = parseNum(inv.expected_return);
              const diff = rate - cdiRate;
              const pct = cdiRate > 0 ? (rate / cdiRate) * 100 : 0;
              const isAbove = diff >= 0;
              return (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{inv.name}</p>
                    <p className="text-xs text-slate-400">{typeLabel(inv.type)} · {rate}% a.a.</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className={`text-sm font-semibold ${isAbove ? "text-emerald-600" : "text-red-500"}`}>
                      {isAbove ? "+" : ""}{diff.toFixed(2)}% vs CDI
                    </p>
                    <p className="text-xs text-slate-400">{pct.toFixed(0)}% do CDI</p>
                  </div>
                  <div className={`ml-3 flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    pct >= 120 ? "bg-emerald-100 text-emerald-700"
                    : pct >= 100 ? "bg-blue-100 text-blue-700"
                    : pct >= 80 ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-600"
                  }`}>
                    {pct >= 120 ? "Ótimo" : pct >= 100 ? "Bom" : pct >= 80 ? "Regular" : "Abaixo"}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Cadastre investimentos para comparar com o CDI.</p>
        )}
        {investments.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            {(() => {
              const aboveCdi = investments.filter(inv => parseNum(inv.expected_return) >= cdiRate).length;
              const belowCdi = investments.length - aboveCdi;
              const suggestion =
                belowCdi === investments.length ? "Todos os seus investimentos estão abaixo do CDI. Considere renda fixa pós-fixada."
                : belowCdi > 0 ? `${belowCdi} investimento(s) abaixo do CDI. Avalie realocar para ativos mais rentáveis.`
                : "Todos os seus investimentos superam o CDI. Ótima carteira!";
              return <p className="text-xs text-slate-500">{suggestion}</p>;
            })()}
          </div>
        )}
      </section>

      <div>
        <button onClick={openAddModal} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          + Novo Investimento
        </button>
      </div>

      {/* GRÁFICO DE PROJEÇÃO DA CARTEIRA */}
      {investments.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Projeção da carteira (10 anos)</h3>
          <p className="text-xs text-slate-400 mb-4">Simulação baseada nos retornos esperados de cada investimento</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorInv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`} width={50} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2 text-xs">
                      <p className="font-medium text-slate-700 mb-1">{payload[0]?.payload?.label}</p>
                      {payload.map((e, i) => (
                        <p key={i} style={{ color: e.color }}>{e.name}: {formatMoney(e.value)}</p>
                      ))}
                    </div>
                  );
                }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="investido" name="Investido" stroke="#6366f1" strokeWidth={2} fill="url(#colorInv)" dot={false} />
                <Area type="monotone" dataKey="projetado" name="Projetado" stroke="#10b981" strokeWidth={2} fill="url(#colorProj)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ANÁLISE DETALHADA DE CADA INVESTIMENTO */}
      {investmentAnalysis.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Análise detalhada</h3>
          <div className="space-y-4">
            {investmentAnalysis.map((inv) => (
              <div key={inv.id} className="border border-slate-100 rounded-xl p-4 hover:border-primary-200 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{inv.name}</p>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">{typeLabel(inv.type)}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Investido há {inv.daysHeld} dias · Taxa: {inv.rate}% a.a.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Investido</p>
                      <p className="text-sm font-semibold text-slate-800">{formatMoney(inv.amt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Valor estimado hoje</p>
                      <p className="text-sm font-semibold text-emerald-600">{formatMoney(inv.estimatedCurrent)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Rendimento</p>
                      <p className="text-sm font-semibold text-emerald-600">+{formatMoney(inv.estimatedYield)}</p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button onClick={() => openEditModal(inv)} className="p-1.5 rounded-md text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(inv.id)} className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
                {/* Tabela de projeção */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-1.5 text-slate-400 font-medium">Prazo</th>
                        <th className="text-right py-1.5 text-slate-400 font-medium">Valor projetado</th>
                        <th className="text-right py-1.5 text-slate-400 font-medium">Rendimento</th>
                        <th className="text-right py-1.5 text-slate-400 font-medium">% ganho</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inv.projections.map((p) => (
                        <tr key={p.year} className="border-b border-slate-50">
                          <td className="py-1.5 text-slate-600">{p.year} {p.year === 1 ? 'ano' : 'anos'}</td>
                          <td className="py-1.5 text-right text-slate-800 font-medium">{formatMoney(p.value)}</td>
                          <td className="py-1.5 text-right text-emerald-600 font-medium">+{formatMoney(p.yield)}</td>
                          <td className="py-1.5 text-right text-emerald-600">{inv.amt > 0 ? `+${((p.yield / inv.amt) * 100).toFixed(1)}%` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SIMULADOR */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Simular investimento</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <label className="text-slate-500 mb-1 text-xs">Valor inicial (R$)</label>
            <input type="number" value={simAmount} onChange={(e) => setSimAmount(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
          <div className="flex flex-col">
            <label className="text-slate-500 mb-1 text-xs">Aporte mensal (R$)</label>
            <input type="number" value={simMonthly} onChange={(e) => setSimMonthly(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
          <div className="flex flex-col">
            <label className="text-slate-500 mb-1 text-xs">Retorno anual (%)</label>
            <input type="number" value={simRate} onChange={(e) => setSimRate(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
          <div className="flex flex-col">
            <label className="text-slate-500 mb-1 text-xs">Prazo (anos)</label>
            <input type="number" value={simYears} onChange={(e) => setSimYears(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-400">Valor projetado</p>
            <p className="text-lg font-semibold text-slate-800">{formatMoney(simulationValue)}</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-400">Total investido + aportes</p>
            <p className="text-lg font-semibold text-slate-800">{formatMoney(safeAmount + monthlyContrib)}</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <p className="text-xs text-emerald-500">Rendimento dos juros</p>
            <p className="text-lg font-semibold text-emerald-700">{formatMoney(totalYield)}</p>
          </div>
        </div>
      </section>

      {/* METAS FINANCEIRAS */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Metas de investimento</h3>
            <p className="text-xs text-slate-400">Defina objetivos financeiros para seus investimentos</p>
          </div>
        </div>
        {investments.length > 0 ? (
          <div className="space-y-3">
            {(() => {
              const totalNow = investmentAnalysis.reduce((s, inv) => s + inv.estimatedCurrent, 0);
              const total1y = investmentAnalysis.reduce((s, inv) => s + inv.projections[0].value, 0);
              const total5y = investmentAnalysis.reduce((s, inv) => s + inv.projections[3].value, 0);
              const total10y = investmentAnalysis.reduce((s, inv) => s + inv.projections[4].value, 0);
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Valor estimado hoje</p>
                    <p className="text-base font-semibold text-slate-800">{formatMoney(totalNow)}</p>
                    <p className="text-[11px] text-emerald-600 mt-0.5">+{formatMoney(totalNow - totalInvested)} de rendimento</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Em 1 ano</p>
                    <p className="text-base font-semibold text-slate-800">{formatMoney(total1y)}</p>
                    <p className="text-[11px] text-emerald-600 mt-0.5">+{formatMoney(total1y - totalInvested)}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Em 5 anos</p>
                    <p className="text-base font-semibold text-slate-800">{formatMoney(total5y)}</p>
                    <p className="text-[11px] text-emerald-600 mt-0.5">+{formatMoney(total5y - totalInvested)}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <p className="text-xs text-emerald-500">Em 10 anos</p>
                    <p className="text-base font-semibold text-emerald-700">{formatMoney(total10y)}</p>
                    <p className="text-[11px] text-emerald-600 mt-0.5">+{formatMoney(total10y - totalInvested)} ({totalInvested > 0 ? `${(((total10y - totalInvested) / totalInvested) * 100).toFixed(0)}%` : '-'})</p>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Cadastre investimentos para ver projeções de metas.</p>
        )}
      </section>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md border border-slate-200 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              {editingInv ? "Editar Investimento" : "Novo Investimento"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <input type="text" placeholder="Nome do Investimento" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" required />
              <input type="number" placeholder="Valor" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" required />
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                <option value="stocks">Ações</option>
                <option value="etfs">ETFs</option>
                <option value="bonds">Títulos</option>
                <option value="reits">FIIs</option>
                <option value="crypto">Criptomoedas</option>
                <option value="commodities">Commodities</option>
                <option value="cash">Caixa / Reserva</option>
                <option value="other">Outros</option>
              </select>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" required />
              <input type="number" placeholder="Retorno Esperado (% a.a.)" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" step="0.01" />
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm text-center border border-slate-200 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Confirmar Exclusão</h2>
            <p className="text-sm text-slate-500 mb-6">Deseja realmente excluir este investimento?</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition">Cancelar</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
