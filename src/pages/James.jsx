import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useJames } from "../context/AIContext";
import jamesAvatar from "../icons/james.svg";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(n) {
  return "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n) {
  return (n >= 0 ? "+" : "") + Number(n).toFixed(1) + "%";
}

// ─── Action type config ───────────────────────────────────────────────────────

const TYPE_CONFIG = {
  reduce: {
    label: "Reduzir",
    bg: "bg-red-50", border: "border-red-100",
    iconBg: "bg-red-100", iconColor: "text-red-500", labelColor: "text-red-500",
    valueBg: "bg-red-100 text-red-600",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  control: {
    label: "Controlar",
    bg: "bg-amber-50", border: "border-amber-100",
    iconBg: "bg-amber-100", iconColor: "text-amber-500", labelColor: "text-amber-500",
    valueBg: "bg-amber-100 text-amber-600",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>,
  },
  save: {
    label: "Economizar",
    bg: "bg-blue-50", border: "border-blue-100",
    iconBg: "bg-blue-100", iconColor: "text-blue-500", labelColor: "text-blue-500",
    valueBg: "bg-blue-100 text-blue-600",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  },
  invest: {
    label: "Investir",
    bg: "bg-violet-50", border: "border-violet-100",
    iconBg: "bg-violet-100", iconColor: "text-violet-500", labelColor: "text-violet-500",
    valueBg: "bg-violet-100 text-violet-600",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
  },
  pay_debt: {
    label: "Quitar",
    bg: "bg-orange-50", border: "border-orange-100",
    iconBg: "bg-orange-100", iconColor: "text-orange-500", labelColor: "text-orange-500",
    valueBg: "bg-orange-100 text-orange-600",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
  },
  positive: {
    label: "Parabéns",
    bg: "bg-emerald-50", border: "border-emerald-100",
    iconBg: "bg-emerald-100", iconColor: "text-emerald-500", labelColor: "text-emerald-500",
    valueBg: "bg-emerald-100 text-emerald-600",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
};

const ALERT_STYLES = {
  high: { bg: "bg-red-50 border-red-200 text-red-700", icon: <svg className="w-4 h-4 flex-shrink-0 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg> },
  medium: { bg: "bg-amber-50 border-amber-200 text-amber-700", icon: <svg className="w-4 h-4 flex-shrink-0 text-amber-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  low: { bg: "bg-blue-50 border-blue-200 text-blue-700", icon: <svg className="w-4 h-4 flex-shrink-0 text-blue-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
};

const PAYMENT_CONFIG = {
  credit_card: {
    label: "Cartão de crédito",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
    color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100",
  },
  debit_pix: {
    label: "Débito / PIX",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100",
  },
  meal_voucher: {
    label: "Vale alimentação",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100",
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function James() {
  const { data, status, refresh } = useJames();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "idle") refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl overflow-hidden flex-shrink-0 shadow">
            <img src={jamesAvatar} alt="James" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">James</h1>
            <p className="text-xs text-slate-500 capitalize">{today}</p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={status === "loading"}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition disabled:opacity-40"
          title="Atualizar"
        >
          <svg className={`w-4 h-4 ${status === "loading" ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Loading */}
      {status === "loading" && <LoadingSkeleton />}

      {/* Error */}
      {status === "error" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
          <p className="text-sm text-slate-500 mb-3">Não foi possível carregar a análise.</p>
          <button onClick={refresh} className="text-sm text-violet-600 hover:text-violet-800 font-medium transition">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Content */}
      {status === "done" && data && (
        <>
          {/* Daily Summary */}
          <DailySummaryCard stats={data.stats} summary={data.dailySummary} onNavigate={navigate} />

          {/* Monthly Overview */}
          <MonthlyCard stats={data.stats} insight={data.insight} />

          {/* Alerts */}
          {data.alerts?.length > 0 && (
            <div className="space-y-2">
              {data.alerts.map((alert, i) => {
                const style = ALERT_STYLES[alert.severity] || ALERT_STYLES.low;
                return (
                  <div key={i} className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-sm ${style.bg}`}>
                    {style.icon}
                    <span>{alert.message}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Payment method breakdown */}
          <PaymentSection stats={data.stats} tips={data.paymentTips} />

          {/* Actions */}
          {data.actions?.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">O que fazer agora</p>
              {data.actions.map((action, i) => (
                <ActionCard key={i} action={action} onNavigate={navigate} />
              ))}
            </div>
          )}
        </>
      )}

      {status === "done" && !data && (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
          <p className="text-sm text-slate-500">Nenhuma análise disponível no momento.</p>
        </div>
      )}
    </div>
  );
}

// ─── Daily Summary Card ───────────────────────────────────────────────────────

function DailySummaryCard({ stats, summary, onNavigate }) {
  if (!stats) return null;
  const { todaySpent, todayCount } = stats;

  return (
    <div
      className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 cursor-pointer hover:border-slate-200 transition"
      onClick={() => onNavigate("/transactions")}
    >
      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m8.66-10h-1M4.34 12h-1m15.07-6.36l-.71.71M6.34 17.66l-.71.71m12.73 0l-.71-.71M6.34 6.34l-.71-.71" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 mb-0.5">Gasto hoje</p>
        <p className="text-lg font-bold text-slate-800">{fmtCurrency(todaySpent)}</p>
        <p className="text-xs text-slate-400">{todayCount} transaç{todayCount !== 1 ? "ões" : "ão"}</p>
      </div>
      {summary && (
        <p className="text-xs text-slate-500 max-w-[48%] text-right leading-relaxed hidden sm:block">{summary}</p>
      )}
      <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}

// ─── Monthly Card ─────────────────────────────────────────────────────────────

function MonthlyCard({ stats, insight }) {
  if (!stats) return null;
  const {
    totalExpense, totalIncome, balance, savingsRate,
    vsLastMonth, topCategory, topCategoryAmount,
    daysLeft, projectedMonthEnd,
  } = stats;

  const isPositive = vsLastMonth <= 0;
  const monthName = new Date().toLocaleDateString("pt-BR", { month: "long" });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400 mb-1">Total gasto em {monthName}</p>
          <p className="text-2xl font-bold text-slate-800">{fmtCurrency(totalExpense)}</p>
          <p className="text-xs text-slate-400 mt-1">{fmtCurrency(totalIncome)} de receita · saldo {fmtCurrency(balance)}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap flex-shrink-0 ${isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
          {fmtPct(vsLastMonth)} vs anterior
        </span>
      </div>

      {/* Savings rate bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>Taxa de poupança</span>
          <span className={`font-medium ${savingsRate >= 20 ? "text-emerald-600" : savingsRate >= 10 ? "text-amber-600" : "text-red-500"}`}>
            {savingsRate.toFixed(1)}%
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${savingsRate >= 20 ? "bg-emerald-500" : savingsRate >= 10 ? "bg-amber-400" : "bg-red-400"}`}
            style={{ width: `${Math.min(savingsRate, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        {topCategory && (
          <div className="bg-slate-50 rounded-xl px-3 py-2.5">
            <p className="text-xs text-slate-400 mb-0.5">Maior gasto</p>
            <p className="text-sm font-semibold text-slate-700">{topCategory}</p>
            <p className="text-xs text-slate-500">{fmtCurrency(topCategoryAmount)}</p>
          </div>
        )}
        <div className="bg-slate-50 rounded-xl px-3 py-2.5">
          <p className="text-xs text-slate-400 mb-0.5">Projeção do mês</p>
          <p className="text-sm font-semibold text-slate-700">{fmtCurrency(projectedMonthEnd)}</p>
          <p className="text-xs text-slate-500">{daysLeft} dias restantes</p>
        </div>
      </div>

      {/* AI insight */}
      {insight && (
        <div className="border-t border-slate-100 pt-3 flex items-start gap-2">
          <svg className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
          </svg>
          <p className="text-xs text-slate-500 leading-relaxed">{insight}</p>
        </div>
      )}
    </div>
  );
}

// ─── Payment Section ──────────────────────────────────────────────────────────

function PaymentSection({ stats, tips }) {
  if (!stats) return null;
  const { creditCardSpent, debitPixSpent, mealVoucherSpent } = stats;

  const methods = [
    { key: "credit_card", amount: creditCardSpent },
    { key: "debit_pix", amount: debitPixSpent },
    { key: "meal_voucher", amount: mealVoucherSpent },
  ].filter(m => m.amount > 0);

  if (methods.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">Meios de pagamento</p>
      <div className={`grid gap-3 ${methods.length === 3 ? "grid-cols-3" : methods.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
        {methods.map(({ key, amount }) => {
          const cfg = PAYMENT_CONFIG[key];
          const tip = tips?.[key];
          return (
            <div key={key} className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-4`}>
              <div className={`w-8 h-8 rounded-xl bg-white/60 flex items-center justify-center mb-2 ${cfg.color}`}>
                {cfg.icon}
              </div>
              <p className="text-xs text-slate-500 mb-0.5">{cfg.label}</p>
              <p className={`text-base font-bold ${cfg.color}`}>{fmtCurrency(amount)}</p>
              {tip && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{tip}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Action Card ──────────────────────────────────────────────────────────────

function ActionCard({ action, onNavigate }) {
  const cfg = TYPE_CONFIG[action.type] || TYPE_CONFIG.save;

  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-5 flex gap-4`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.iconBg} ${cfg.iconColor}`}>
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-semibold text-slate-800 leading-snug">{action.title}</p>
          {action.value && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${cfg.valueBg}`}>
              {action.value}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{action.reason}</p>
        {action.link && action.linkLabel && (
          <button
            onClick={() => onNavigate(action.link)}
            className="mt-3 text-xs font-medium px-3 py-1.5 rounded-lg bg-white/70 border border-white text-slate-600 hover:bg-white transition"
          >
            {action.linkLabel} →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Daily summary skeleton */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-2.5 bg-slate-100 rounded w-16" />
          <div className="h-5 bg-slate-100 rounded w-28" />
          <div className="h-2 bg-slate-100 rounded w-20" />
        </div>
      </div>
      {/* Monthly card skeleton */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
        <div className="flex justify-between">
          <div className="space-y-2">
            <div className="h-2.5 bg-slate-100 rounded w-28" />
            <div className="h-7 bg-slate-100 rounded w-36" />
            <div className="h-2 bg-slate-100 rounded w-40" />
          </div>
          <div className="h-6 bg-slate-100 rounded-full w-24" />
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 bg-slate-100 rounded-xl" />
          <div className="h-16 bg-slate-100 rounded-xl" />
        </div>
      </div>
      {/* Payment skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-slate-100 rounded-2xl h-28" />
        ))}
      </div>
      {/* Action cards skeleton */}
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 bg-slate-100 rounded w-2/5" />
            <div className="h-2.5 bg-slate-100 rounded w-3/4" />
            <div className="h-2.5 bg-slate-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
