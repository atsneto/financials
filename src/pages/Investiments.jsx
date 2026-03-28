import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import iconWallet   from "../icons/wallet-svgrepo-com.svg";
import iconChart    from "../icons/chart-pie-svgrepo-com.svg";
import iconChartBar from "../icons/chart-bar-vertical-svgrepo-com.svg";
import iconCard     from "../icons/card-credit-money-currency-finance-payment-2-svgrepo-com.svg";
import iconBag      from "../icons/bag-dollar-money-currency-finance-payment-svgrepo-com.svg";

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPES = [
  { id: "stocks",     label: "Ações",       color: "bg-blue-500",    light: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",   icon: iconChartBar },
  { id: "etfs",       label: "ETFs",        color: "bg-violet-500",  light: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200", icon: iconChart    },
  { id: "bonds",      label: "Renda Fixa",  color: "bg-emerald-500", light: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200",icon: iconCard     },
  { id: "reits",      label: "FIIs",        color: "bg-amber-500",   light: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",  icon: iconBag      },
  { id: "crypto",     label: "Cripto",      color: "bg-orange-500",  light: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200", icon: iconChartBar },
  { id: "commodities",label: "Commodities", color: "bg-yellow-500",  light: "bg-yellow-50",  text: "text-yellow-700",  border: "border-yellow-200", icon: iconBag      },
  { id: "cash",       label: "Reserva",     color: "bg-slate-400",   light: "bg-slate-50",   text: "text-slate-600",   border: "border-slate-200",  icon: iconWallet   },
  { id: "other",      label: "Outros",      color: "bg-slate-400",   light: "bg-slate-50",   text: "text-slate-600",   border: "border-slate-200",  icon: iconWallet   },
];

const getType = (id) => TYPES.find((t) => t.id === id) || TYPES[TYPES.length - 1];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v || 0));
const parseNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

function calcEstimated(amt, rate, daysHeld) {
  const mRate   = Math.pow(1 + rate / 100, 1 / 12) - 1;
  const months  = daysHeld / 30.44;
  return amt * Math.pow(1 + mRate, months);
}

// ─── TypeIcon ─────────────────────────────────────────────────────────────────

function TypeIcon({ icon, className = "w-4 h-4" }) {
  return <img src={icon} alt="" className={className} style={{ filter: "brightness(0) saturate(100%)" }} />;
}

// ─── InvestModal ──────────────────────────────────────────────────────────────

function InvestModal({ inv, onClose, onSaved }) {
  const isEditing = !!inv?.id;
  const [name, setName]             = useState(inv?.name || "");
  const [amount, setAmount]         = useState(inv?.amount?.toString() || "");
  const [type, setType]             = useState(inv?.type || "stocks");
  const [date, setDate]             = useState(inv?.created_at ? inv.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [expectedReturn, setExpectedReturn] = useState(inv?.expected_return?.toString() || "");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    if (!name.trim())             return setError("Informe o nome do investimento");
    if (!parseNum(amount) > 0)    return setError("Valor inválido");

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    const payload = {
      name:            name.trim(),
      amount:          parseNum(amount),
      type,
      created_at:      date + "T00:00:00",
      expected_return: parseNum(expectedReturn),
      user_id:         session.user.id,
    };

    let err;
    if (isEditing) {
      ({ error: err } = await supabase.from("investments").update(payload).eq("id", inv.id).eq("user_id", session.user.id));
    } else {
      ({ error: err } = await supabase.from("investments").insert([payload]));
    }

    setSaving(false);
    if (err) return setError("Erro ao salvar. Tente novamente.");
    onSaved();
    onClose();
  }

  const selectedType = getType(type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-md shadow-lg border border-slate-200 mx-4">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">
            {isEditing ? "Editar investimento" : "Novo investimento"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Classe do ativo</label>
            <div className="grid grid-cols-4 gap-1.5">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-[11px] font-medium transition ${
                    type === t.id
                      ? `${t.border} ${t.light} ${t.text}`
                      : "border-slate-100 text-slate-400 hover:border-slate-200"
                  }`}
                >
                  <TypeIcon icon={t.icon} className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Nome do investimento</label>
            <input
              type="text" placeholder="Ex: PETR4, Tesouro IPCA+, BTC"
              value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Valor investido (R$)</label>
              <input
                type="number" min="0.01" step="0.01" placeholder="0,00"
                value={amount} onChange={(e) => setAmount(e.target.value)} required
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Retorno esperado (% a.a.)</label>
              <input
                type="number" step="0.01" placeholder="Ex: 12"
                value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Data de entrada</label>
            <input
              type="date" value={date} onChange={(e) => setDate(e.target.value)} required
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
              </svg>
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
              Cancelar
            </button>
            <button
              type="submit" disabled={saving}
              className={`flex-1 py-2.5 text-sm text-white font-medium rounded-lg transition disabled:opacity-60 ${selectedType.color.replace("bg-", "bg-").split(" ")[0]} hover:opacity-90`}
              style={{ backgroundColor: "" }}
            >
              {saving ? "Salvando..." : isEditing ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Investiments() {
  const [investments, setInvestments] = useState([]);
  const [modal, setModal]             = useState(null); // null | {} | { inv }
  const [deleteId, setDeleteId]       = useState(null);
  const [cdiFee, setCdiFee]           = useState("13.25");
  const [simAmount, setSimAmount]     = useState("1000");
  const [simRate, setSimRate]         = useState("10");
  const [simYears, setSimYears]       = useState("5");
  const [simMonthly, setSimMonthly]   = useState("200");
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") { setModal(null); setDeleteId(null); } };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return navigate("/login");
    const { data } = await supabase.from("investments").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
    setInvestments(data || []);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("investments").delete().eq("id", deleteId).eq("user_id", session.user.id);
    setDeleteId(null);
    loadData();
  }

  // ── Calculations ────────────────────────────────────────────────────────────
  const cdiRate      = parseNum(cdiFee);
  const totalInvested = investments.reduce((s, i) => s + parseNum(i.amount), 0);
  const avgReturn    = investments.length > 0
    ? investments.reduce((s, i) => s + parseNum(i.expected_return), 0) / investments.length
    : 0;

  const analyzed = investments.map((inv) => {
    const amt    = parseNum(inv.amount);
    const rate   = parseNum(inv.expected_return);
    const days   = Math.max(1, Math.floor((Date.now() - new Date(inv.created_at).getTime()) / 86400000));
    const curr   = calcEstimated(amt, rate, days);
    const yield_ = curr - amt;
    const pct    = amt > 0 ? ((curr - amt) / amt) * 100 : 0;
    const cdiDiff = rate - cdiRate;
    const cdiPct  = cdiRate > 0 ? (rate / cdiRate) * 100 : 0;
    const projections = [1, 2, 3, 5, 10].map((y) => {
      const mRate = Math.pow(1 + rate / 100, 1 / 12) - 1;
      const fv = amt * Math.pow(1 + mRate, y * 12);
      return { year: y, value: fv, yield: fv - amt };
    });
    return { ...inv, amt, rate, days, curr, yield_, pct, cdiDiff, cdiPct, projections };
  });

  const totalCurr    = analyzed.reduce((s, i) => s + i.curr, 0);
  const totalYieldNow = totalCurr - totalInvested;
  const totalPct     = totalInvested > 0 ? (totalYieldNow / totalInvested) * 100 : 0;

  // Distribution by type
  const distrib = TYPES.map((t) => {
    const total = analyzed.filter((i) => i.type === t.id).reduce((s, i) => s + i.curr, 0);
    const pct   = totalCurr > 0 ? (total / totalCurr) * 100 : 0;
    return { ...t, total, pct };
  }).filter((t) => t.total > 0);

  // Projection chart data
  const portfolioChartData = [];
  for (let m = 0; m <= 120; m++) {
    if (m % 3 !== 0 && m > 12) continue;
    let totalValue = 0;
    investments.forEach((inv) => {
      const amt   = parseNum(inv.amount);
      const rate  = parseNum(inv.expected_return);
      const mRate = Math.pow(1 + rate / 100, 1 / 12) - 1;
      totalValue += amt * Math.pow(1 + mRate, m);
    });
    portfolioChartData.push({
      label:    m === 0 ? "Hoje" : m < 12 ? `${m}m` : `${(m / 12).toFixed(m % 12 === 0 ? 0 : 1)}A`,
      projetado: Number(totalValue.toFixed(2)),
      investido: Number(totalInvested.toFixed(2)),
    });
  }

  // Simulator
  const sAmt     = parseNum(simAmount);
  const sRate    = parseNum(simRate);
  const sYears   = Math.max(parseNum(simYears), 0);
  const sMonthly = parseNum(simMonthly);
  const mRate    = Math.pow(1 + sRate / 100, 1 / 12) - 1;
  const months   = Math.round(sYears * 12);
  const futureBase   = sAmt * Math.pow(1 + mRate, months);
  const futureContrib = mRate === 0 ? sMonthly * months : sMonthly * ((Math.pow(1 + mRate, months) - 1) / mRate);
  const simTotal     = futureBase + futureContrib;
  const simInvested  = sAmt + sMonthly * months;
  const simYield_    = simTotal - simInvested;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Investimentos</h1>
          <p className="text-sm text-slate-500">Controle e projeção da sua carteira</p>
        </div>
        <button
          onClick={() => setModal({})}
          className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2 self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Novo investimento
        </button>
      </div>

      {/* ── Summary cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 mb-1">Total investido</p>
          <p className="text-lg font-bold text-slate-800 truncate">{fmt(totalInvested)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 mb-1">Valor estimado</p>
          <p className="text-lg font-bold text-slate-800 truncate">{fmt(totalCurr)}</p>
          {totalYieldNow !== 0 && (
            <p className={`text-xs mt-0.5 font-medium ${totalYieldNow >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {totalYieldNow >= 0 ? "+" : ""}{fmt(totalYieldNow)}
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 mb-1">Rentabilidade</p>
          <p className={`text-lg font-bold ${totalPct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {totalPct >= 0 ? "+" : ""}{totalPct.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-400 mt-0.5">desde início</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 mb-1">Retorno médio</p>
          <p className="text-lg font-bold text-slate-800">{avgReturn.toFixed(1)}% <span className="text-xs font-normal text-slate-400">a.a.</span></p>
          <p className="text-xs text-slate-400 mt-0.5">{investments.length} ativo{investments.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* ── Portfolio distribution + chart ──────────────────────────────────── */}
      {investments.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Distribution */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Distribuição</h3>
            {/* Segmented bar */}
            <div className="flex h-3 rounded-full overflow-hidden gap-px mb-4">
              {distrib.map((t) => (
                <div key={t.id} className={`${t.color} transition-all`} style={{ width: `${t.pct}%` }} title={`${t.label}: ${t.pct.toFixed(1)}%`} />
              ))}
            </div>
            <div className="space-y-2.5">
              {distrib.map((t) => (
                <div key={t.id} className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${t.color}`} />
                  <span className="text-xs text-slate-600 flex-1 truncate">{t.label}</span>
                  <span className="text-xs font-semibold text-slate-700">{fmt(t.total)}</span>
                  <span className="text-xs text-slate-400 w-8 text-right">{t.pct.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Projection chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 lg:col-span-2">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Projeção da carteira</h3>
              <p className="text-xs text-slate-400">Simulação baseada nos retornos esperados de cada ativo</p>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={portfolioChartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gProj" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gInv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`} width={44} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-white border border-slate-200 rounded-lg shadow px-3 py-2 text-xs">
                          <p className="font-medium text-slate-600 mb-1">{payload[0]?.payload?.label}</p>
                          {payload.map((e, i) => <p key={i} style={{ color: e.color }}>{e.name}: {fmt(e.value)}</p>)}
                        </div>
                      );
                    }}
                  />
                  <Area type="monotone" dataKey="investido" name="Investido" stroke="#6366f1" strokeWidth={1.5} fill="url(#gInv)" dot={false} />
                  <Area type="monotone" dataKey="projetado" name="Projetado" stroke="#10b981" strokeWidth={2} fill="url(#gProj)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Investment list ──────────────────────────────────────────────────── */}
      {investments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <img src={iconChartBar} alt="" className="w-7 h-7 opacity-30" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">Nenhum investimento cadastrado</h3>
          <p className="text-sm text-slate-400 max-w-xs mx-auto mb-5">
            Adicione seus ativos para visualizar a carteira, projeções e comparações.
          </p>
          <button onClick={() => setModal({})} className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition">
            Adicionar primeiro ativo
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Carteira</h3>
            <span className="text-xs text-slate-400">{investments.length} ativo{investments.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {analyzed.map((inv) => {
              const t = getType(inv.type);
              const aboveCdi = inv.cdiDiff >= 0;
              return (
                <div key={inv.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors group">
                  {/* Type icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${t.light}`}>
                    <TypeIcon icon={t.icon} className="w-4 h-4" />
                  </div>

                  {/* Name + type */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800 truncate">{inv.name}</p>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium ${t.light} ${t.text}`}>{t.label}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {inv.days} dias · {inv.rate > 0 ? `${inv.rate}% a.a.` : "sem taxa"}
                    </p>
                  </div>

                  {/* Values */}
                  <div className="hidden sm:flex items-center gap-6 text-right">
                    <div>
                      <p className="text-xs text-slate-400">Investido</p>
                      <p className="text-sm font-semibold text-slate-700">{fmt(inv.amt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Atual est.</p>
                      <p className="text-sm font-semibold text-slate-800">{fmt(inv.curr)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Rendimento</p>
                      <p className={`text-sm font-semibold ${inv.yield_ >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {inv.yield_ >= 0 ? "+" : ""}{fmt(inv.yield_)}
                      </p>
                    </div>
                  </div>

                  {/* CDI badge */}
                  <div className="hidden md:block flex-shrink-0">
                    <span className={`text-[11px] px-2 py-1 rounded-full font-medium ${
                      inv.cdiPct >= 120 ? "bg-emerald-100 text-emerald-700" :
                      inv.cdiPct >= 100 ? "bg-blue-100 text-blue-700" :
                      inv.cdiPct >= 80  ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-600"
                    }`}>
                      {inv.cdiPct >= 120 ? "Ótimo" : inv.cdiPct >= 100 ? "✓ CDI" : inv.cdiPct >= 80 ? "Regular" : "Abaixo CDI"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => setModal({ inv })}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                      title="Editar"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteId(inv.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                      title="Excluir"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CDI Benchmark ───────────────────────────────────────────────────── */}
      {investments.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Comparação com CDI</h3>
              <p className="text-xs text-slate-400">Veja como cada ativo se compara ao benchmark</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 flex-shrink-0">CDI (% a.a.):</label>
              <input
                type="number" value={cdiFee} onChange={(e) => setCdiFee(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-primary-500"
                step="0.01"
              />
            </div>
          </div>

          <div className="space-y-3">
            {analyzed.map((inv) => {
              const barWidth = Math.min(100, inv.cdiPct);
              const t = getType(inv.type);
              return (
                <div key={inv.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.color}`} />
                      <span className="text-sm text-slate-700 font-medium">{inv.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold ${inv.cdiDiff >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {inv.cdiDiff >= 0 ? "+" : ""}{inv.cdiDiff.toFixed(2)}% vs CDI
                      </span>
                      <span className="text-xs text-slate-400">{inv.cdiPct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        inv.cdiPct >= 120 ? "bg-emerald-500" :
                        inv.cdiPct >= 100 ? "bg-blue-500" :
                        inv.cdiPct >= 80  ? "bg-amber-400" : "bg-red-400"
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {(() => {
            const below = analyzed.filter((i) => i.cdiDiff < 0).length;
            if (below === 0) return <p className="text-xs text-emerald-600 mt-4 pt-3 border-t border-slate-100">Todos os ativos superam o CDI.</p>;
            if (below === analyzed.length) return <p className="text-xs text-amber-600 mt-4 pt-3 border-t border-slate-100">Todos os ativos estão abaixo do CDI. Considere renda fixa pós-fixada.</p>;
            return <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">{below} ativo{below !== 1 ? "s" : ""} abaixo do CDI. Avalie realocar para ativos mais rentáveis.</p>;
          })()}
        </div>
      )}

      {/* ── Projeções da carteira ────────────────────────────────────────────── */}
      {analyzed.length > 0 && (() => {
        const totalNow = analyzed.reduce((s, i) => s + i.curr, 0);
        const get = (yi) => analyzed.reduce((s, i) => s + (i.projections[yi]?.value || 0), 0);
        const items = [
          { label: "Hoje",     value: totalNow,  sub: totalNow - totalInvested,    green: false },
          { label: "1 ano",    value: get(0),    sub: get(0) - totalInvested,      green: false },
          { label: "5 anos",   value: get(3),    sub: get(3) - totalInvested,      green: false },
          { label: "10 anos",  value: get(4),    sub: get(4) - totalInvested,      green: true  },
        ];
        return (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Projeções de longo prazo</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {items.map((item) => (
                <div key={item.label} className={`rounded-xl border p-3.5 ${item.green ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                  <p className={`text-xs mb-1 ${item.green ? "text-emerald-600" : "text-slate-400"}`}>{item.label}</p>
                  <p className={`text-base font-bold truncate ${item.green ? "text-emerald-700" : "text-slate-800"}`}>{fmt(item.value)}</p>
                  {item.sub !== 0 && (
                    <p className="text-xs text-emerald-600 mt-0.5">+{fmt(item.sub)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Simulator ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-700">Simular investimento</h3>
          <p className="text-xs text-slate-400">Projete o crescimento de qualquer valor com juros compostos</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Valor inicial (R$)",    value: simAmount,  set: setSimAmount,  step: "100"  },
            { label: "Aporte mensal (R$)",    value: simMonthly, set: setSimMonthly, step: "50"   },
            { label: "Retorno anual (%)",     value: simRate,    set: setSimRate,    step: "0.5"  },
            { label: "Prazo (anos)",          value: simYears,   set: setSimYears,   step: "1"    },
          ].map((f) => (
            <div key={f.label}>
              <label className="block text-xs text-slate-400 mb-1.5">{f.label}</label>
              <input
                type="number" value={f.value} onChange={(e) => f.set(e.target.value)} step={f.step}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <p className="text-xs text-slate-400 mb-1">Total investido</p>
            <p className="text-base font-bold text-slate-700">{fmt(simInvested)}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <p className="text-xs text-slate-400 mb-1">Valor final</p>
            <p className="text-base font-bold text-slate-800">{fmt(simTotal)}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
            <p className="text-xs text-emerald-600 mb-1">Juros compostos</p>
            <p className="text-base font-bold text-emerald-700">{fmt(simYield_)}</p>
          </div>
        </div>
      </div>

      {/* ── Modal criar/editar ───────────────────────────────────────────────── */}
      {modal !== null && (
        <InvestModal
          inv={modal.inv}
          onClose={() => setModal(null)}
          onSaved={loadData}
        />
      )}

      {/* ── Modal deletar ────────────────────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm mx-4 text-center border border-slate-200 shadow-lg">
            <div className="w-11 h-11 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-slate-800 mb-1">Excluir investimento</h2>
            <p className="text-sm text-slate-500 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition">Cancelar</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
