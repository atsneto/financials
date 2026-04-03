import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useJames } from "../context/AIContext";
import jamesAvatar from "../svg/bot.svg";
import iconTrendingDown from "../svg/trending-down.svg";
import iconDanger from "../svg/danger.svg";
import iconDollar from "../svg/dollar.svg";
import iconTrending from "../svg/trending.svg";
import iconCreditCard from "../svg/credit-card.svg";
import iconCheckO from "../svg/check-o.svg";
import iconInfo from "../svg/info.svg";
import iconTag from "../svg/tag.svg";
import iconSync from "../svg/sync.svg";
import iconSun from "../svg/sun.svg";
import iconChevronRight from "../svg/chevron-right.svg";
import iconInsights from "../svg/insights.svg";

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
    bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-100 dark:border-red-800/50",
    iconBg: "bg-red-100 dark:bg-red-900/40", iconColor: "text-red-500 dark:text-red-400", labelColor: "text-red-500 dark:text-red-400",
    valueBg: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",
    icon: <img src={iconTrendingDown} alt="" className="w-5 h-5 icon-adaptive" />,
  },
  control: {
    label: "Controlar",
    bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-100 dark:border-amber-800/50",
    iconBg: "bg-amber-100 dark:bg-amber-900/40", iconColor: "text-amber-500 dark:text-amber-400", labelColor: "text-amber-500 dark:text-amber-400",
    valueBg: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
    icon: <img src={iconDanger} alt="" className="w-5 h-5 icon-adaptive" />,
  },
  save: {
    label: "Economizar",
    bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-100 dark:border-blue-800/50",
    iconBg: "bg-blue-100 dark:bg-blue-900/40", iconColor: "text-blue-500 dark:text-blue-400", labelColor: "text-blue-500 dark:text-blue-400",
    valueBg: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
    icon: <img src={iconDollar} alt="" className="w-5 h-5 icon-adaptive" />,
  },
  invest: {
    label: "Investir",
    bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-100 dark:border-violet-800/50",
    iconBg: "bg-violet-100 dark:bg-violet-900/40", iconColor: "text-violet-500 dark:text-violet-400", labelColor: "text-violet-500 dark:text-violet-400",
    valueBg: "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400",
    icon: <img src={iconTrending} alt="" className="w-5 h-5 icon-adaptive" />,
  },
  pay_debt: {
    label: "Quitar",
    bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-100 dark:border-orange-800/50",
    iconBg: "bg-orange-100 dark:bg-orange-900/40", iconColor: "text-orange-500 dark:text-orange-400", labelColor: "text-orange-500 dark:text-orange-400",
    valueBg: "bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400",
    icon: <img src={iconCreditCard} alt="" className="w-5 h-5 icon-adaptive" />,
  },
  positive: {
    label: "Parabéns",
    bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-100 dark:border-emerald-800/50",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40", iconColor: "text-emerald-500 dark:text-emerald-400", labelColor: "text-emerald-500 dark:text-emerald-400",
    valueBg: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400",
    icon: <img src={iconCheckO} alt="" className="w-5 h-5 icon-adaptive" />,
  },
};

const ALERT_STYLES = {
  high: { bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300", icon: <img src={iconDanger} alt="" className="w-4 h-4 flex-shrink-0 mt-0.5 icon-adaptive" /> },
  medium: { bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300", icon: <img src={iconInfo} alt="" className="w-4 h-4 flex-shrink-0 mt-0.5 icon-adaptive" /> },
  low: { bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300", icon: <img src={iconInfo} alt="" className="w-4 h-4 flex-shrink-0 mt-0.5 icon-adaptive" /> },
};

const PAYMENT_CONFIG = {
  credit_card: {
    label: "Cartão de crédito",
    icon: <img src={iconCreditCard} alt="" className="w-5 h-5 icon-adaptive" />,
    color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-100 dark:border-violet-800/50",
  },
  debit_pix: {
    label: "Débito / PIX",
    icon: <img src={iconDollar} alt="" className="w-5 h-5 icon-adaptive" />,
    color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-100 dark:border-emerald-800/50",
  },
  meal_voucher: {
    label: "Vale alimentação",
    icon: <img src={iconTag} alt="" className="w-5 h-5 icon-adaptive" />,
    color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-100 dark:border-amber-800/50",
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
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-200">James</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{today}</p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={status === "loading"}
          className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-40"
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
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Não foi possível carregar a análise.</p>
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
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">O que fazer agora</p>
              {data.actions.map((action, i) => (
                <ActionCard key={i} action={action} onNavigate={navigate} />
              ))}
            </div>
          )}
        </>
      )}

      {status === "done" && !data && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma análise disponível no momento.</p>
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
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 flex items-center gap-4 cursor-pointer hover:border-slate-200 dark:hover:border-slate-700 transition"
      onClick={() => onNavigate("/transactions")}
    >
      <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center flex-shrink-0">
        <img src={iconSun} alt="" className="w-5 h-5 icon-adaptive opacity-50" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Gasto hoje</p>
        <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{fmtCurrency(todaySpent)}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">{todayCount} transaç{todayCount !== 1 ? "ões" : "ão"}</p>
      </div>
      {summary && (
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[48%] text-right leading-relaxed hidden sm:block">{summary}</p>
      )}
      <img src={iconChevronRight} alt="" className="w-4 h-4 icon-adaptive opacity-30 flex-shrink-0" />
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
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Total gasto em {monthName}</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{fmtCurrency(totalExpense)}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{fmtCurrency(totalIncome)} de receita · saldo {fmtCurrency(balance)}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap flex-shrink-0 ${isPositive ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"}`}>
          {fmtPct(vsLastMonth)} vs anterior
        </span>
      </div>

      {/* Savings rate bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mb-1.5">
          <span>Taxa de poupança</span>
          <span className={`font-medium ${savingsRate >= 20 ? "text-emerald-600" : savingsRate >= 10 ? "text-amber-600" : "text-red-500"}`}>
            {savingsRate.toFixed(1)}%
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${savingsRate >= 20 ? "bg-emerald-500" : savingsRate >= 10 ? "bg-amber-400" : "bg-red-400"}`}
            style={{ width: `${Math.min(savingsRate, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        {topCategory && (
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2.5">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Maior gasto</p>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{topCategory}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{fmtCurrency(topCategoryAmount)}</p>
          </div>
        )}
        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2.5">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Projeção do mês</p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{fmtCurrency(projectedMonthEnd)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{daysLeft} dias restantes</p>
        </div>
      </div>

      {/* AI insight */}
      {insight && (
        <div className="border-t border-slate-100 dark:border-slate-700 pt-3 flex items-start gap-2">
          <img src={iconInsights} alt="" className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 icon-adaptive opacity-60" />
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{insight}</p>
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
      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">Meios de pagamento</p>
      <div className={`grid gap-3 ${methods.length === 3 ? "grid-cols-3" : methods.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
        {methods.map(({ key, amount }) => {
          const cfg = PAYMENT_CONFIG[key];
          const tip = tips?.[key];
          return (
            <div key={key} className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-4`}>
              <div className={`w-8 h-8 rounded-xl bg-white/60 dark:bg-slate-700/60 flex items-center justify-center mb-2 ${cfg.color}`}>
                {cfg.icon}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{cfg.label}</p>
              <p className={`text-base font-bold ${cfg.color}`}>{fmtCurrency(amount)}</p>
              {tip && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{tip}</p>}
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
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">{action.title}</p>
          {action.value && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${cfg.valueBg}`}>
              {action.value}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{action.reason}</p>
        {action.link && action.linkLabel && (
          <button
            onClick={() => onNavigate(action.link)}
            className="mt-3 text-xs font-medium px-3 py-1.5 rounded-lg bg-white/70 dark:bg-slate-800/80 border border-white dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition"
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded w-16" />
          <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded w-28" />
          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded w-20" />
        </div>
      </div>
      {/* Monthly card skeleton */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
        <div className="flex justify-between">
          <div className="space-y-2">
            <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded w-28" />
            <div className="h-7 bg-slate-100 dark:bg-slate-700 rounded w-36" />
            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded w-40" />
          </div>
          <div className="h-6 bg-slate-100 dark:bg-slate-700 rounded-full w-24" />
        </div>
        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 bg-slate-100 dark:bg-slate-700 rounded-xl" />
          <div className="h-16 bg-slate-100 dark:bg-slate-700 rounded-xl" />
        </div>
      </div>
      {/* Payment skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-slate-100 dark:bg-slate-700 rounded-2xl h-28" />
        ))}
      </div>
      {/* Action cards skeleton */}
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-2/5" />
            <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded w-3/4" />
            <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
