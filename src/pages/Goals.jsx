import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useTheme } from "../context/ThemeContext";
import iconWallet    from "../svg/dollar.svg";
import iconChart     from "../svg/chart.svg";
import iconBanknotes from "../svg/trending-down.svg";
import iconCard      from "../svg/credit-card.svg";
import iconBag       from "../svg/shopping-bag.svg";

// ─── Constants ────────────────────────────────────────────────────────────────

const GOAL_TYPES = [
  { id: "save",    label: "Economizar dinheiro",  example: "Ex: juntar R$ 5.000",              icon: iconWallet,    color: "bg-blue-100",    iconColor: "text-blue-600"   },
  { id: "reduce",  label: "Reduzir gastos",        example: "Ex: gastar menos com delivery",    icon: iconBanknotes, color: "bg-amber-100",   iconColor: "text-amber-600"  },
  { id: "control", label: "Controlar categoria",   example: "Ex: limite mensal em alimentação", icon: iconChart,     color: "bg-violet-100",  iconColor: "text-violet-600" },
  { id: "debt",    label: "Quitar dívidas",         example: "Ex: pagar cartão de crédito",      icon: iconCard,      color: "bg-red-100",     iconColor: "text-red-600"    },
];

const PAYMENT_METHODS = [
  { value: "",             label: "Todos os meios"    },
  { value: "credit_card",  label: "Cartão de crédito" },
  { value: "debit_pix",    label: "Débito / Pix"      },
  { value: "meal_voucher", label: "Vale alimentação"   },
];

const CATEGORIES = [
  "Alimentação", "Transporte", "Lazer", "Saúde", "Educação",
  "Moradia", "Vestuário", "Delivery", "Mercado", "Outros",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDateRange(period, startDate, endDate, refDate = new Date()) {
  if (period === "monthly") {
    return {
      start: new Date(refDate.getFullYear(), refDate.getMonth(), 1).toISOString().slice(0, 10),
      end:   new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0).toISOString().slice(0, 10),
    };
  }
  if (period === "weekly") {
    const day  = refDate.getDay();
    const diff = refDate.getDate() - day + (day === 0 ? -6 : 1);
    const mon  = new Date(refDate.getFullYear(), refDate.getMonth(), diff);
    return {
      start: mon.toISOString().slice(0, 10),
      end:   new Date(mon.getTime() + 6 * 86400000).toISOString().slice(0, 10),
    };
  }
  return { start: startDate, end: endDate };
}

function calcProgress(goal, transactions, refDate) {
  const { start, end } = getDateRange(goal.period, goal.start_date, goal.end_date, refDate);
  const filtered = transactions.filter((tx) => {
    const d = (tx.created_at || "").slice(0, 10);
    if (d < start || d > end) return false;
    if (goal.payment_method && tx.payment_method !== goal.payment_method) return false;
    if (goal.category && tx.category?.toLowerCase() !== goal.category?.toLowerCase()) return false;
    return true;
  });
  if (goal.type === "save") {
    const income   = filtered.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expenses = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    // Also add manual current_amount contributions
    return Math.max(0, income - expenses) + Number(goal.current_amount || 0);
  }
  return filtered.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
}

function fmtCurrency(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function fmtDate(d) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr + "T00:00:00") - new Date();
  return Math.ceil(diff / 86400000);
}

function endOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function endOfWeek() {
  const now  = new Date();
  const day  = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const mon  = new Date(now.getFullYear(), now.getMonth(), diff);
  return new Date(mon.getTime() + 6 * 86400000).toISOString().slice(0, 10);
}

// ─── GoalTypeIcon ─────────────────────────────────────────────────────────────

function GoalTypeIcon({ icon, className = "w-5 h-5", dark = false }) {
  return (
    <img
      src={icon}
      alt=""
      className={className}
      style={{ filter: dark ? "brightness(0) saturate(100%)" : "brightness(0) invert(1)" }}
    />
  );
}

// ─── DepositModal ─────────────────────────────────────────────────────────────

function DepositModal({ goal, onClose, onSaved }) {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  async function handleDeposit() {
    const val = parseFloat(amount);
    if (!val || val <= 0) return setError("Informe um valor válido");
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    const newAmount = Number(goal.current_amount || 0) + val;
    const { error: err } = await supabase
      .from("goals")
      .update({ current_amount: newAmount })
      .eq("id", goal.id)
      .eq("user_id", session.user.id);

    setSaving(false);
    if (err) return setError("Erro ao registrar. Tente novamente.");
    onSaved();
    onClose();
  }

  const gt         = GOAL_TYPES.find((t) => t.id === goal.type);
  const remaining  = Math.max(0, Number(goal.target_amount) - Number(goal.current_amount || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-xl w-full max-w-sm shadow-lg border border-slate-200 dark:border-slate-700 mx-4">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            {gt && (
              <span className={`w-8 h-8 rounded-lg ${gt.color} flex items-center justify-center`}>
                <GoalTypeIcon icon={gt.icon} className="w-4 h-4" dark />
              </span>
            )}
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Adicionar aporte</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[180px]">{goal.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition p-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-5 space-y-4">
          {remaining > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2.5">
              <span>Faltam para a meta</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{fmtCurrency(remaining)}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Valor do aporte (R$)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(""); }}
              autoFocus
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition">
              Cancelar
            </button>
            <button type="button" onClick={handleDeposit} disabled={saving} className="flex-1 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition disabled:opacity-60">
              {saving ? "Salvando..." : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── GoalModal ────────────────────────────────────────────────────────────────

function GoalModal({ goal, onClose, onSaved }) {
  const isEditing = !!goal?.id;
  const [step, setStep]                   = useState(isEditing ? 2 : 1);
  const [type, setType]                   = useState(goal?.type || "");
  const [title, setTitle]                 = useState(goal?.title || "");
  const [targetAmount, setTargetAmount]   = useState(goal?.target_amount?.toString() || "");
  const [paymentMethod, setPaymentMethod] = useState(goal?.payment_method || "");
  const [category, setCategory]           = useState(goal?.category || "");
  const [period, setPeriod]               = useState(goal?.period || "monthly");
  const [startDate, setStartDate]         = useState(goal?.start_date || new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate]             = useState(goal?.end_date || endOfMonth());
  const [isRecurring, setIsRecurring]     = useState(goal?.is_recurring || false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");

  useEffect(() => {
    if (period === "monthly") setEndDate(endOfMonth());
    if (period === "weekly")  setEndDate(endOfWeek());
  }, [period]);

  // Estimativa mensal necessária
  const monthlyNeeded = (() => {
    const target  = parseFloat(targetAmount);
    if (!target || !endDate) return null;
    const months = Math.ceil(daysUntil(endDate) / 30);
    if (months <= 0) return null;
    return target / months;
  })();

  async function handleSave() {
    setError("");
    const amount = parseFloat(targetAmount);
    if (!title.trim())          return setError("Preencha o título da meta");
    if (!amount || amount <= 0) return setError("Valor da meta inválido (mínimo R$ 1)");
    if (!endDate)               return setError("Informe a data de término");

    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const payload = {
      user_id:        session.user.id,
      type,
      title:          title.trim().slice(0, 255),
      target_amount:  amount,
      payment_method: paymentMethod || null,
      category:       category || null,
      period,
      start_date:     startDate,
      end_date:       endDate,
      is_recurring:   isRecurring,
    };

    let err;
    if (isEditing) {
      ({ error: err } = await supabase.from("goals").update(payload).eq("id", goal.id).eq("user_id", session.user.id));
    } else {
      ({ error: err } = await supabase.from("goals").insert(payload));
    }

    setLoading(false);
    if (err) return setError("Erro ao salvar meta. Tente novamente.");
    onSaved();
    onClose();
  }

  const selectedType = GOAL_TYPES.find((t) => t.id === type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-xl w-full max-w-lg shadow-lg border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {!isEditing && (
              <div className="flex gap-1">
                {[1, 2].map((s) => (
                  <span key={s} className={`h-1.5 rounded-full transition-all ${s === step ? "w-5 bg-primary-600" : "w-1.5 bg-slate-200 dark:bg-slate-700"}`} />
                ))}
              </div>
            )}
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                {isEditing ? "Editar meta" : step === 1 ? "Qual é o seu objetivo?" : "Configurar meta"}
              </h2>
              {!isEditing && <p className="text-xs text-slate-400 dark:text-slate-500">Passo {step} de 2</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Step 1 — tipo */}
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GOAL_TYPES.map((gt) => (
                <button
                  key={gt.id}
                  onClick={() => { setType(gt.id); setStep(2); }}
                  className="text-left p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-primary-400 hover:bg-primary-50/50 transition group"
                >
                  <div className={`w-9 h-9 rounded-lg ${gt.color} flex items-center justify-center mb-3`}>
                    <GoalTypeIcon icon={gt.icon} className="w-4.5 h-4.5" dark />
                  </div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{gt.label}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{gt.example}</div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2 — detalhes */}
          {step === 2 && (
            <div className="space-y-4">
              {selectedType && !isEditing && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setStep(1)} className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 transition">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Voltar
                  </button>
                  <span className={`flex items-center gap-1.5 text-xs rounded-full px-2.5 py-0.5 font-medium border ${selectedType.color} ${selectedType.iconColor} border-transparent`}>
                    <GoalTypeIcon icon={selectedType.icon} className="w-3 h-3" dark />
                    {selectedType.label}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Nome da meta</label>
                <input
                  type="text"
                  placeholder={selectedType?.example || "Ex: Economizar R$ 1.000"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {type === "save" ? "Meta de economia (R$)" : "Limite (R$)"}
                </label>
                <input
                  type="number" min="1" step="0.01" placeholder="0,00"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
                />
                {monthlyNeeded && monthlyNeeded > 0 && (
                  <p className="text-xs text-primary-600 mt-1.5 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Poupe {fmtCurrency(monthlyNeeded)}/mês para atingir no prazo
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Forma de pagamento</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {(type === "control" || type === "reduce") && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Categoria (opcional)</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">Todas as categorias</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Período</label>
                <div className="flex gap-2">
                  {[
                    { value: "weekly",  label: "Semanal"       },
                    { value: "monthly", label: "Mensal"        },
                    { value: "custom",  label: "Personalizado" },
                  ].map((p) => (
                    <button
                      key={p.value} type="button"
                      onClick={() => setPeriod(p.value)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition ${
                        period === p.value
                          ? "bg-primary-600 text-white border-primary-600"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {period === "custom" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Início</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Término</label>
                    <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100" />
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <button
                  type="button"
                  onClick={() => setIsRecurring(v => !v)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${isRecurring ? "bg-primary-600 border-primary-600" : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"}`}
                >
                  {isRecurring && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                </button>
                <span className="text-sm text-slate-600 dark:text-slate-400">Renovar automaticamente</span>
              </label>

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                onClick={handleSave} disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg text-sm transition disabled:opacity-60"
              >
                {loading ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar meta"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── GoalCard ─────────────────────────────────────────────────────────────────

function GoalCard({ goal, transactions, refDate, onEdit, onDelete, onDeposit }) {
  const current  = calcProgress(goal, transactions, refDate);
  const pct      = Math.min(100, Math.round((current / goal.target_amount) * 100));
  const isSave   = goal.type === "save";
  const isOver   = !isSave && pct >= 100;
  const isWarn   = !isSave && pct >= 80 && pct < 100;
  const isDone   = isSave && pct >= 100;
  const days     = daysUntil(goal.end_date);

  const gt = GOAL_TYPES.find((t) => t.id === goal.type);

  const barColor =
    isOver  ? "bg-red-500" :
    isWarn  ? "bg-amber-400" :
    isDone  ? "bg-emerald-500" :
    isSave  ? "bg-primary-500" :
    "bg-violet-500";

  const statusBadge = isDone
    ? { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: "check", label: "Meta atingida!" }
    : isOver
    ? { bg: "bg-red-50",     border: "border-red-200",     text: "text-red-600",    icon: "warn",  label: "Limite ultrapassado!" }
    : isWarn
    ? { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",  icon: "warn",  label: `${pct}% do limite usado` }
    : null;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border overflow-hidden transition-all ${
      isOver ? "border-red-200" : isWarn ? "border-amber-200" : isDone ? "border-emerald-200" : "border-slate-200 dark:border-slate-700"
    }`}>
      {/* Progress accent bar on top */}
      <div className="h-1 bg-slate-100 dark:bg-slate-700">
        <div
          className={`h-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="p-5">
        {/* Status badge */}
        {statusBadge && (
          <div className={`flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 mb-3 border ${statusBadge.bg} ${statusBadge.border} ${statusBadge.text}`}>
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {statusBadge.icon === "check"
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              }
            </svg>
            {statusBadge.label}
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className={`w-9 h-9 rounded-xl ${gt?.color || "bg-slate-100 dark:bg-amber-950/40"} flex items-center justify-center flex-shrink-0`}>
              {gt && <GoalTypeIcon icon={gt.icon} className="w-4.5 h-4.5" dark />}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">{goal.title}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {PAYMENT_METHODS.find((m) => m.value === (goal.payment_method || ""))?.label || "Todos os meios"}
                {goal.category && ` · ${goal.category}`}
              </p>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={() => onEdit(goal)} className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button onClick={() => onDelete(goal.id)} className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Amounts */}
        <div className="flex items-end justify-between gap-2 mb-2">
          <div className="min-w-0">
            <span className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-200">{fmtCurrency(current)}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-1.5">de {fmtCurrency(goal.target_amount)}</span>
          </div>
          <span className={`text-sm font-semibold flex-shrink-0 ${
            isOver ? "text-red-500" : isWarn ? "text-amber-500" : isDone ? "text-emerald-600" : "text-slate-600 dark:text-slate-400"
          }`}>{pct}%</span>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {days !== null
              ? days > 0 ? `${days} dia${days !== 1 ? "s" : ""} restantes` : days === 0 ? "Vence hoje" : "Encerrada"
              : fmtDate(goal.end_date)
            }
          </div>
          {isSave && !isDone && (
            <button
              onClick={() => onDeposit(goal)}
              className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-2.5 py-1.5 rounded-lg transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Depositar
            </button>
          )}
          {isDone && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Concluída
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Goals page ───────────────────────────────────────────────────────────────

export default function Goals() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const iconAmberFaint = isDark
    ? "brightness(0) saturate(100%) invert(80%) sepia(85%) saturate(900%) hue-rotate(5deg) brightness(105%) opacity(0.4)"
    : "brightness(0) saturate(100%) opacity(0.4)";
  const [goals, setGoals]               = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [modal, setModal]               = useState(null);
  const [deleteId, setDeleteId]         = useState(null);
  const [depositGoal, setDepositGoal]   = useState(null);
  const [refDate, setRefDate]           = useState(() => new Date());

  const isCurrentMonth = refDate.getMonth() === new Date().getMonth() && refDate.getFullYear() === new Date().getFullYear();

  function prevMonth() {
    setRefDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextMonth() {
    setRefDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const [{ data: goalsData }, { data: txData }] = await Promise.all([
      supabase.from("goals").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").eq("user_id", session.user.id),
    ]);
    setGoals(goalsData || []);
    setTransactions(txData || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete() {
    if (!deleteId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("goals").delete().eq("id", deleteId).eq("user_id", session.user.id);
    setDeleteId(null);
    load();
  }

  // ── Summary stats ──────────────────────────────────────────────────────────
  const saveGoals  = goals.filter((g) => g.type === "save");
  const totalSaved = saveGoals.reduce((sum, g) => sum + calcProgress(g, transactions, refDate), 0);
  const totalTarget = saveGoals.reduce((sum, g) => sum + Number(g.target_amount), 0);
  const doneCount  = saveGoals.filter((g) => {
    const p = calcProgress(g, transactions, refDate);
    return p >= Number(g.target_amount);
  }).length;

  // ── Alerts ─────────────────────────────────────────────────────────────────
  const alerts = goals.filter((g) => {
    if (g.type === "save") return false;
    const pct = Math.round((calcProgress(g, transactions, refDate) / g.target_amount) * 100);
    return pct >= 80;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Metas financeiras</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Acompanhe seus objetivos e mantenha o controle</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Navegação de mês */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-1 py-1">
            <button onClick={prevMonth} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[110px] text-center">
              {refDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </span>
            <button onClick={nextMonth} disabled={isCurrentMonth} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <button
            onClick={() => setModal({})}
            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nova meta
          </button>
        </div>
      </div>

      {/* Summary — só aparece se há metas */}
      {goals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 flex items-center justify-between sm:block">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-0 sm:mb-0.5">Metas ativas</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{goals.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 flex items-center justify-between sm:block">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-0 sm:mb-0.5">Total poupado</p>
            <div>
              <p className="text-xl font-bold text-primary-600">{fmtCurrency(totalSaved)}</p>
              {totalTarget > 0 && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 hidden sm:block">de {fmtCurrency(totalTarget)}</p>}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 flex items-center justify-between sm:block">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-0 sm:mb-0.5">Concluídas</p>
            <p className="text-xl font-bold text-emerald-600">{doneCount}</p>
          </div>
        </div>
      )}

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((g) => {
            const current = calcProgress(g, transactions);
            const pct     = Math.min(100, Math.round((current / g.target_amount) * 100));
            const isOver  = pct >= 100;
            return (
              <div key={g.id} className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm border ${
                isOver ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"
              }`}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span>
                  <strong>"{g.title}"</strong>
                  {isOver
                    ? ` — limite ultrapassado (${fmtCurrency(current)} de ${fmtCurrency(g.target_amount)})`
                    : ` — ${pct}% do limite usado (${fmtCurrency(current)} de ${fmtCurrency(g.target_amount)})`
                  }
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Metas */}
      {goals.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-amber-950/40 flex items-center justify-center mx-auto mb-4">
            <img src={iconBag} alt="" className="w-8 h-8" style={{ filter: iconAmberFaint }} />
          </div>
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">Nenhuma meta criada</h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs mx-auto mb-5">
            Defina objetivos financeiros e acompanhe seu progresso mês a mês.
          </p>
          <button
            onClick={() => setModal({})}
            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition"
          >
            Criar primeira meta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              transactions={transactions}
              refDate={refDate}
              onEdit={(g) => setModal({ goal: g })}
              onDelete={(id) => setDeleteId(id)}
              onDeposit={(g) => setDepositGoal(g)}
            />
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal !== null && (
        <GoalModal
          goal={modal.goal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}

      {/* Modal depositar */}
      {depositGoal && (
        <DepositModal
          goal={depositGoal}
          onClose={() => setDepositGoal(null)}
          onSaved={load}
        />
      )}

      {/* Modal deletar */}
      {deleteId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-sm mx-4 text-center border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="w-11 h-11 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">Excluir meta</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition">
                Cancelar
              </button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
