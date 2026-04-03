import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { getEffectiveBillingDate } from "../utils/billing";
import { useTheme } from "../context/ThemeContext";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

import iconInfo from "../svg/info.svg";
import iconClose from "../svg/close.svg";
import iconDanger from "../svg/danger.svg";
import iconCreditCard from "../svg/credit-card.svg";
import iconShoppingCart from "../svg/shopping-cart.svg";

export default function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [prevMonthTransactions, setPrevMonthTransactions] = useState([]);
  const [cards, setCards] = useState([]);
  const [userName, setUserName] = useState("");
  const [tipIndex, setTipIndex] = useState(0);
  const [showTip, setShowTip] = useState(true);
  const [tipPaused, setTipPaused] = useState(false);

  const profileRef = useRef(null);
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Icon filters — amber accent in dark mode, black in light
  const iconAmber = isDark
    ? "brightness(0) saturate(100%) invert(80%) sepia(85%) saturate(900%) hue-rotate(5deg) brightness(105%)"
    : "brightness(0) saturate(100%)";
  const iconDangerFilter = isDark
    ? "brightness(0) saturate(100%) invert(56%) sepia(87%) saturate(500%) hue-rotate(314deg) brightness(103%)"
    : "brightness(0) saturate(100%)";

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const today = now.getDate();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthName = now.toLocaleDateString("pt-BR", { month: "long" });
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  useEffect(() => {
    async function loadData() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) { navigate("/login"); return; }

      const user = sessionData.session.user;
      const { data: profileData } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
      const name = profileData?.name || user.email?.split("@")[0] || "Usuário";
      setUserName(name);

      // Load 2 months back → 1 month forward to capture billing cycle shifts
      const loadStart = new Date(currentYear, currentMonth - 1, 1).toISOString();
      const loadEnd = new Date(currentYear, currentMonth + 2, 0, 23, 59, 59).toISOString();

      const [{ data: allTxData }, { data: cardsData }] = await Promise.all([
        supabase.from("transactions").select("*").eq("user_id", user.id).gte("created_at", loadStart).lte("created_at", loadEnd).order("created_at", { ascending: false }),
        supabase.from("credit_cards").select("id, name, last_four, closing_day").eq("user_id", user.id),
      ]);

      const loadedCards = cardsData || [];
      const allTxs = allTxData || [];

      // Filter by effective billing date
      const thisTxs = allTxs.filter(t => {
        const d = getEffectiveBillingDate(t, loadedCards);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      const prevTxs = allTxs.filter(t => {
        const d = getEffectiveBillingDate(t, loadedCards);
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
      });

      setCards(loadedCards);
      setTransactions(thisTxs);
      setPrevMonthTransactions(prevTxs);
    }
    loadData();
  }, [navigate]);

  // =====================
  // CÁLCULOS MÊS ATUAL
  // =====================
  const income = transactions.filter(t => t.type === "income").reduce((acc, t) => acc + Number(t.amount), 0);
  const expense = transactions.filter(t => t.type === "expense").reduce((acc, t) => acc + Number(t.amount), 0);
  const balance = income - expense;

  // Conta corrente (debit_pix ou sem método definido)
  const ccIncome = transactions.filter(t => t.type === "income" && (t.payment_method === "debit_pix" || !t.payment_method)).reduce((a, t) => a + Number(t.amount), 0);
  const ccExpense = transactions.filter(t => t.type === "expense" && (t.payment_method === "debit_pix" || !t.payment_method)).reduce((a, t) => a + Number(t.amount), 0);
  const ccBalance = ccIncome - ccExpense;

  // Cartão de crédito
  const creditCardBill = transactions.filter(t => t.type === "expense" && t.payment_method === "credit_card").reduce((a, t) => a + Number(t.amount), 0);

  // Vale alimentação
  const vaIncome = transactions.filter(t => t.type === "income" && t.payment_method === "meal_voucher").reduce((a, t) => a + Number(t.amount), 0);
  const vaExpense = transactions.filter(t => t.type === "expense" && t.payment_method === "meal_voucher").reduce((a, t) => a + Number(t.amount), 0);
  const vaBalance = vaIncome - vaExpense;

  // Mês anterior
  const prevExpense = prevMonthTransactions.filter(t => t.type === "expense").reduce((acc, t) => acc + Number(t.amount), 0);
  const prevIncome = prevMonthTransactions.filter(t => t.type === "income").reduce((acc, t) => acc + Number(t.amount), 0);

  // =====================
  // TOP CATEGORIAS
  // =====================
  const categoryMap = {};
  transactions.filter(t => t.type === "expense").forEach(t => {
    const cat = t.category || "Outros";
    categoryMap[cat] = (categoryMap[cat] || 0) + Number(t.amount);
  });
  const topCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCatValue = topCategories[0]?.[1] || 1;

  // =====================
  // SAÚDE FINANCEIRA
  // =====================
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
  const healthScore =
    savingsRate >= 30 ? { score: 92, label: "Excelente", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800/50", text: "text-emerald-700 dark:text-emerald-400", bar: "bg-emerald-500" }
    : savingsRate >= 20 ? { score: 78, label: "Muito bom", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800/50", text: "text-emerald-700 dark:text-emerald-400", bar: "bg-emerald-400" }
    : savingsRate >= 10 ? { score: 60, label: "Bom", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800/50", text: "text-blue-700 dark:text-blue-400", bar: "bg-blue-500" }
    : savingsRate >= 0 ? { score: 40, label: "Regular", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800/50", text: "text-amber-700 dark:text-amber-400", bar: "bg-amber-400" }
    : { score: 18, label: "Atenção", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800/50", text: "text-red-700 dark:text-red-400", bar: "bg-red-500" };

  // =====================
  // PROJEÇÃO DE SALDO
  // =====================
  const dailyAvg = today > 0 ? expense / today : 0;
  const projectedExpense = dailyAvg * daysInMonth;
  const projectedBalance = income - projectedExpense;

  // =====================
  // ALERTAS INTELIGENTES
  // =====================
  const alerts = [];
  if (prevExpense > 0 && expense > prevExpense * 1.15)
    alerts.push({ type: "warning", msg: `Gastos ${(((expense / prevExpense) - 1) * 100).toFixed(0)}% acima do mês anterior (mês passado: R$ ${prevExpense.toFixed(2)})` });
  if (projectedBalance < 0 && balance >= 0)
    alerts.push({ type: "warning", msg: `Projeção: se continuar no ritmo atual, o saldo fecha negativo em R$ ${Math.abs(projectedBalance).toFixed(2)}` });
  if (income > 0 && creditCardBill > income * 0.5)
    alerts.push({ type: "warning", msg: `Fatura do cartão representa mais de 50% da sua renda este mês` });

  // =====================
  // GRÁFICO EVOLUÇÃO DOS GASTOS
  // =====================
  const dailyExpenses = {};
  transactions.filter(t => t.type === "expense").forEach(t => {
    const day = new Date(t.created_at).getDate();
    dailyExpenses[day] = (dailyExpenses[day] || 0) + Number(t.amount);
  });
  const chartData = [];
  let accumulated = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    accumulated += dailyExpenses[d] || 0;
    chartData.push({ day: d, label: `${d}`, total: Number(accumulated.toFixed(2)) });
  }

  // =====================
  // COMPARAÇÃO MENSAL
  // =====================
  const prevMonthName = new Date(prevMonth === 11 ? currentYear - 1 : currentYear, currentMonth === 0 ? 11 : currentMonth - 1, 1)
    .toLocaleDateString("pt-BR", { month: "short" });
  const comparisonData = [
    { name: prevMonthName.charAt(0).toUpperCase() + prevMonthName.slice(1, -1), receitas: prevIncome, gastos: prevExpense },
    { name: monthName.charAt(0).toUpperCase() + monthName.slice(1, 3), receitas: income, gastos: expense },
  ];

  // =====================
  // DICAS
  // =====================
  const tips = [
    { id: "ok", title: "Tudo sob controle", message: "Seu saldo está equilibrado — continue acompanhando.", condition: () => balance >= 0 },
    { id: "saving-great", title: "Ótima taxa de poupança!", message: `Você está poupando ${savingsRate.toFixed(0)}% da renda — continue assim!`, condition: () => savingsRate >= 20 },
    { id: "increase-saving", title: "Aumente sua poupança", message: "Tente poupar pelo menos 20% da renda mensalmente para construir reservas.", condition: () => savingsRate >= 0 && savingsRate < 20 },
    ...(topCategories[0] ? [{ id: "top-cat", title: `Maior gasto: ${topCategories[0][0]}`, message: `Você gastou R$ ${topCategories[0][1].toFixed(2)} com ${topCategories[0][0]} este mês.` }] : []),
  ];
  const activeTips = tips.filter(t => !t.condition || t.condition());

  useEffect(() => {
    if (!showTip || tipPaused) return;
    const id = setInterval(() => {
      setTipIndex(i => (i + 1) % Math.max(1, activeTips.length));
    }, 8000);
    return () => clearInterval(id);
  }, [activeTips.length, showTip, tipPaused]);

  const ChartTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-soft-md px-3 py-2 text-xs">
        <p className="font-medium text-slate-700 dark:text-slate-300">Dia {payload[0].payload.day}</p>
        <p className="text-slate-500 dark:text-slate-400 mt-0.5">Acumulado: R$ {Number(payload[0].value).toFixed(2)}</p>
      </div>
    );
  };

  const CompTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm px-3 py-2 text-xs">
        <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</p>
        {payload.map((e, i) => (
          <p key={i} style={{ color: e.color }}>{e.name}: R$ {Number(e.value).toFixed(2)}</p>
        ))}
      </div>
    );
  };

  // =====================
  // RENDER
  // =====================
  const hour = now.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = userName ? userName.split(" ")[0] : "...";
  const subtitle = balance < 0
    ? "Vamos trabalhar juntos para equilibrar seu saldo."
    : savingsRate >= 20
    ? "Suas finanças estão indo muito bem! Continue assim."
    : income === 0
    ? "Registre suas receitas para acompanhar seu saldo."
    : "Vamos cuidar do seu dinheiro hoje?";

  return (
    <div className="space-y-3 animate-fade-in">

      {/* HEADER + TIP inline (desktop) */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3">
        <div className="text-center sm:text-left">
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-200">{greeting}, {firstName}!</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{subtitle}</p>
        </div>
        {showTip && activeTips.length > 0 && (
          <div
            className="hidden sm:flex items-center gap-2 bg-primary-50 dark:bg-amber-950/30 border border-primary-200 dark:border-amber-800/50 rounded-xl px-3 py-2 max-w-sm flex-shrink-0"
            onMouseEnter={() => setTipPaused(true)}
            onMouseLeave={() => setTipPaused(false)}
          >
            <img src={iconInfo} alt="" className="w-3.5 h-3.5 flex-shrink-0" style={{ filter: iconAmber }} />
            <p className="text-xs text-primary-700 dark:text-amber-300 min-w-0 line-clamp-2">
              <span className="font-medium">{activeTips[tipIndex % activeTips.length]?.title}:</span>{" "}
              <span className="text-primary-600 dark:text-amber-400">{activeTips[tipIndex % activeTips.length]?.message}</span>
            </p>
            <button onClick={() => setShowTip(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0 ml-1">
              <img src={iconClose} alt="" className="w-3 h-3 opacity-60" />
            </button>
          </div>
        )}
      </div>

      {/* ALERTAS */}
      {alerts.length > 0 && (
        <section className="space-y-1.5">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-start gap-2.5 px-3 py-2 rounded-xl border text-xs ${
              alert.type === "danger" ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300" : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300"
            }`}>
              <img src={iconDanger} alt="" className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ filter: alert.type === "danger" ? iconDangerFilter : iconAmber }} />
              <span>{alert.msg}</span>
            </div>
          ))}
        </section>
      )}

      {/* TIP (mobile only) */}
      {showTip && activeTips.length > 0 && (
        <section
          className="sm:hidden bg-primary-50 dark:bg-amber-950/30 border border-primary-200 dark:border-amber-800/50 rounded-xl px-3 py-2.5 flex items-start justify-between gap-3"
          onMouseEnter={() => setTipPaused(true)}
          onMouseLeave={() => setTipPaused(false)}
        >
          <div className="flex items-start gap-2 min-w-0">
            <img src={iconInfo} alt="" className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ filter: iconAmber }} />
            <p className="text-xs text-primary-700 dark:text-amber-300 min-w-0">
              <span className="font-medium">{activeTips[tipIndex % activeTips.length]?.title}:</span>{" "}
              <span className="text-primary-600 dark:text-amber-400">{activeTips[tipIndex % activeTips.length]?.message}</span>
            </p>
          </div>
          <button onClick={() => setShowTip(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0">
            <img src={iconClose} alt="" className="w-3.5 h-3.5 opacity-60" />
          </button>
        </section>
      )}

      {/* CARDS DE SALDO POR ORIGEM */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Conta Corrente */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-amber-900/30 p-4">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-amber-950/40 flex items-center justify-center">
              <img src={iconCreditCard} alt="" className="w-4 h-4" style={{ filter: iconAmber }} />
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Conta Corrente</p>
          </div>
          <p className={`text-2xl font-semibold mb-3 text-center sm:text-left ${ccBalance >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            R$ {ccBalance.toFixed(2)}
          </p>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 dark:text-slate-500">Entradas (Déb/PIX)</span>
              <span className="text-emerald-600 font-medium">+R$ {ccIncome.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 dark:text-slate-500">Saídas</span>
              <span className="text-red-500 font-medium">-R$ {ccExpense.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Cartão de Crédito */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-amber-900/30 p-4">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-amber-950/40 flex items-center justify-center">
              <img src={iconCreditCard} alt="" className="w-4 h-4" style={{ filter: iconAmber }} />
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cartão de Crédito</p>
          </div>
          <p className={`text-2xl font-semibold mb-3 text-center sm:text-left ${creditCardBill > 0 ? "text-red-500" : "text-slate-400 dark:text-slate-500"}`}>
            R$ {creditCardBill.toFixed(2)}
          </p>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 dark:text-slate-500">Fatura do mês</span>
              <span className="text-red-500 font-medium">-R$ {creditCardBill.toFixed(2)}</span>
            </div>
            {income > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 dark:text-slate-500">% da renda</span>
                <span className={`font-medium ${creditCardBill / income > 0.5 ? "text-red-500" : "text-slate-600 dark:text-slate-300"}`}>
                  {income > 0 ? `${((creditCardBill / income) * 100).toFixed(0)}%` : "—"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Vale Alimentação */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-amber-900/30 p-4">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-green-50 dark:bg-amber-950/40 flex items-center justify-center">
              <img src={iconShoppingCart} alt="" className="w-4 h-4" style={{ filter: iconAmber }} />
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vale Alimentação</p>
          </div>
          {vaIncome === 0 && vaExpense === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 text-center sm:text-left">Nenhuma movimentação com VA este mês.</p>
          ) : (
            <>
              <p className={`text-2xl font-semibold mb-3 text-center sm:text-left ${vaBalance >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                R$ {vaBalance.toFixed(2)}
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 dark:text-slate-500">Entradas</span>
                  <span className="text-emerald-600 font-medium">+R$ {vaIncome.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 dark:text-slate-500">Saídas</span>
                  <span className="text-red-500 font-medium">-R$ {vaExpense.toFixed(2)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* CARDS: saúde + projeção + totais */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Receitas" value={income} type="success" />
        <SummaryCard label="Despesas" value={expense} type="danger" />

        <div className={`rounded-xl border p-3 ${healthScore.bg} ${healthScore.border}`}>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 text-center sm:text-left">Saúde Financeira</p>
          <div className="flex items-baseline justify-center sm:justify-start gap-2 mb-2">
            <p className={`text-2xl font-bold ${healthScore.text}`}>{healthScore.score}</p>
            <p className={`text-xs font-semibold ${healthScore.text}`}>{healthScore.label}</p>
          </div>
          <div className="w-full bg-white/60 dark:bg-slate-700/60 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full transition-all duration-700 ${healthScore.bar}`} style={{ width: `${healthScore.score}%` }} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 text-center sm:text-left">
            Poupança: <span className={`font-semibold ${healthScore.text}`}>{income > 0 ? `${savingsRate.toFixed(1)}%` : "—"}</span>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-amber-900/30 p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 text-center sm:text-left">Projeção fim do mês</p>
          <p className={`text-2xl font-bold mb-1 text-center sm:text-left ${projectedBalance >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            R$ {projectedBalance.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center sm:text-left">R$ {dailyAvg.toFixed(2)}/dia</p>
          {income === 0 && <p className="text-xs text-amber-500 mt-1 text-center sm:text-left">Registre receitas</p>}
        </div>
      </section>

      {/* GRÁFICOS */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-3">

        {/* Evolução dos gastos - col-span-3 */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-amber-900/30 p-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-0.5 text-center sm:text-left">Evolução dos gastos</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-3 text-center sm:text-left">Acumulado diário de despesas em {monthName}</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1F2A3D" : "#e2e8f0"} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: isDark ? "#64748b" : "#94a3b8" }} interval={Math.floor(daysInMonth / 10)} />
                <YAxis tick={{ fontSize: 10, fill: isDark ? "#64748b" : "#94a3b8" }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`} width={50} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="total" stroke="#f87171" strokeWidth={2} fill="url(#colorGastos)" dot={false} activeDot={{ r: 4, fill: "#f87171", stroke: isDark ? "#131825" : "#fff", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Coluna direita: comparação + categorias */}
        <div className="lg:col-span-2 flex flex-col gap-3">

          {/* Comparação mensal */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-amber-900/30 p-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-0.5 text-center sm:text-left">Comparação mensal</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3 text-center sm:text-left">Mês anterior vs atual</p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1F2A3D" : "#e2e8f0"} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: isDark ? "#64748b" : "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: isDark ? "#64748b" : "#94a3b8" }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`} width={50} />
                  <Tooltip content={<CompTooltip />} />
                  <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[4,4,0,0]} maxBarSize={40} />
                  <Bar dataKey="gastos" name="Gastos" fill="#f87171" radius={[4,4,0,0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {prevExpense > 0 && expense > 0 && (
              <p className={`text-xs mt-2 font-medium text-center sm:text-left ${expense > prevExpense ? "text-red-500" : "text-emerald-600"}`}>
                {expense > prevExpense
                  ? `↑ Gastos ${(((expense / prevExpense) - 1) * 100).toFixed(0)}% maiores que o mês passado`
                  : `↓ Gastos ${(((prevExpense / expense) - 1) * 100).toFixed(0)}% menores que o mês passado`}
              </p>
            )}
          </div>

          {/* Top categorias */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-amber-900/30 p-4 flex-1">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-0.5 text-center sm:text-left">Categorias com maior gasto</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3 text-center sm:text-left">Top categorias do mês atual</p>
            {topCategories.length > 0 ? (
              <div className="space-y-2.5">
                {topCategories.map(([cat, val], i) => (
                  <div key={cat}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">{cat}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 flex-shrink-0">R$ {val.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-primary-500" style={{ width: `${(val / maxCatValue) * 100}%`, opacity: 1 - i * 0.15 }} />
                    </div>
                  </div>
                ))}
                {expense > 0 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 pt-0.5">
                    Maior categoria:{" "}
                    <span className="font-medium text-slate-600 dark:text-slate-300">{((topCategories[0][1] / expense) * 100).toFixed(0)}%</span> dos gastos
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center sm:text-left">Sem despesas categorizadas este mês.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// =====================
// SUMMARY CARD
// =====================
function SummaryCard({ label, value, type = "default" }) {
  const styles = {
    success: { text: "text-emerald-600", dot: "bg-emerald-500" },
    danger: { text: "text-red-500", dot: "bg-red-500" },
    info: { text: "text-blue-600", dot: "bg-blue-500" },
    default: { text: "text-slate-800 dark:text-slate-200", dot: "bg-slate-400 dark:bg-slate-500" },
  };
  const s = styles[type] || styles.default;
  const numeric = Number(value || 0);
  const isNeg = numeric < 0;
  const displayStyle = isNeg ? styles.danger : s;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-amber-900/30 p-5 hover:border-slate-300 dark:hover:border-amber-700/50 transition-colors">
      <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${displayStyle.dot}`} />
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-2xl font-semibold text-center sm:text-left ${displayStyle.text}`}>
        R$ {value.toFixed(2)}
      </p>
    </div>
  );
}
