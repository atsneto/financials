import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function Goals() {
  const [financialProfile, setFinancialProfile] = useState(null);
  const [financialGoals, setFinancialGoals] = useState([]);
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [saveRate, setSaveRate] = useState(30);
  const [showPopup, setShowPopup] = useState(false);
  const [popupContent, setPopupContent] = useState({ title: "", message: "" });
  const [showEditModal, setShowEditModal] = useState(false);
  const [incomeInput, setIncomeInput] = useState(0);
  const [goalTypeInput, setGoalTypeInput] = useState("save");
  const [targetAmountInput, setTargetAmountInput] = useState(0);
  const [targetDateInput, setTargetDateInput] = useState("");
  const [goalDescInput, setGoalDescInput] = useState("");
  const [formError, setFormError] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [creditTransactions, setCreditTransactions] = useState([]);
  const [closingDay, setClosingDay] = useState(25);
  const [dueDay, setDueDay] = useState(5);
  const [reduceRate, setReduceRate] = useState(15);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [recurringDraft, setRecurringDraft] = useState([]);
  const [recurringError, setRecurringError] = useState("");
  const [savingRecurring, setSavingRecurring] = useState(false);
  const [removedRecurringIds, setRemovedRecurringIds] = useState([]);
  const navigate = useNavigate();

  const fetchData = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      navigate("/login");
      return;
    }
    const user = sessionData.session.user;

    const [profileRes, goalsRes, recurringRes, txRes, ccRes, ccSettingsRes] = await Promise.all([
      supabase.from("financial_profile").select("monthly_income").eq("user_id", user.id).maybeSingle(),
      supabase.from("financial_goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("recurring_expenses").select("id, name, amount, active, category, day_of_month").eq("user_id", user.id),
      supabase.from("transactions").select("amount, type, category, title, created_at").eq("user_id", user.id),
      supabase.from("credit_card_transactions").select("amount, title, merchant, created_at").eq("user_id", user.id),
      supabase.from("credit_card_settings").select("closing_day, due_day").eq("user_id", user.id).maybeSingle(),
    ]);

    const profileData = profileRes.data;
    const goalsData = goalsRes.data;
    const recurringData = recurringRes.data;
    const txData = txRes.data;
    const ccData = ccRes.data;
    const ccSettings = ccSettingsRes.data;

    setFinancialProfile(profileData || null);
    setFinancialGoals(goalsData || []);
    setRecurringExpenses(recurringData || []);
    setTransactions(txData || []);
    setCreditTransactions(ccData || []);
    if (ccSettings?.closing_day) setClosingDay(ccSettings.closing_day);
    if (ccSettings?.due_day) setDueDay(ccSettings.due_day);

    // Pre-fill modal fields
    setIncomeInput(Number(profileData?.monthly_income || 0));
    const current = goalsData && goalsData.length ? goalsData[0] : null;
    if (current) {
      setGoalTypeInput(current.type || "save");
      setTargetAmountInput(Number(current.target_amount || 0));
      setTargetDateInput(current.target_date || "");
      setGoalDescInput(current.description || "");
    } else {
      setGoalTypeInput("save");
      setTargetAmountInput(0);
      setTargetDateInput("");
      setGoalDescInput("");
    }
  };

  useEffect(() => {
    fetchData();
  }, [navigate]);

  const monthlyIncome = Number(financialProfile?.monthly_income || 0);
  const fixedExpensesTotal = recurringExpenses
    .filter((r) => r.active !== false)
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  function getPeriodEndForDate(d, closing) {
    const day = d.getDate();
    let month = d.getMonth();
    let year = d.getFullYear();
    if (day >= closing) {
      month = (month + 1) % 12;
      if (month === 0) year += 1;
    }
    return { month, year };
  }

  const currentPeriodEnd = getPeriodEndForDate(new Date(), closingDay);
  const creditInvoiceAmount = creditTransactions
    .filter((t) => {
      if (!t?.created_at) return false;
      const d = new Date(t.created_at);
      const { month, year } = getPeriodEndForDate(d, closingDay);
      return month === currentPeriodEnd.month && year === currentPeriodEnd.year;
    })
    .reduce((sum, t) => {
      const val = Number(t.amount || 0);
      if (val > 0) return sum + val;
      return sum - Math.abs(val);
    }, 0);

  const transferSpent = transactions
    .filter((t) => {
      if (t.type !== "expense") return false;
      const cat = (t.category || "").toLowerCase();
      const title = (t.title || "").toLowerCase();
      return cat.includes("transfer") || cat.includes("transf") || cat.includes("pix") || title.includes("transfer");
    })
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const burnWithCardAndTransfers = fixedExpensesTotal + creditInvoiceAmount + transferSpent;
  const netAfterAll = monthlyIncome - burnWithCardAndTransfers;
  const reduceCut = Math.max(0, Math.round(((creditInvoiceAmount + transferSpent) * reduceRate) / 100));
  const netAfterReduction = netAfterAll + reduceCut;

  const budgetComparisonData = [
    { name: "Renda", value: monthlyIncome },
    { name: "Fixos", value: fixedExpensesTotal },
  ];

  const availableMonthly = Math.max(0, monthlyIncome - fixedExpensesTotal);
  const currentGoal = financialGoals && financialGoals.length > 0 ? financialGoals[0] : null;
  const targetAmount = currentGoal?.type === "save" ? Number(currentGoal?.target_amount || 0) : 0;
  const monthlySaving = Math.max(0, Math.round((availableMonthly * saveRate) / 100));
  const estimatedMonths = monthlySaving > 0 && targetAmount > 0 ? Math.ceil(targetAmount / monthlySaving) : null;

  let monthsUntilTarget = null;
  if (currentGoal?.target_date) {
    const target = new Date(currentGoal.target_date);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const approxMonths = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30)));
    monthsUntilTarget = approxMonths;
  }

  const tips = [];
  if (!monthlyIncome) {
    tips.push({ id: "income", title: "Renda não informada", message: "Defina sua renda mensal para estimarmos o tempo de alcance da meta." });
  }
  if (monthlyIncome > 0) {
    const fixedRatio = fixedExpensesTotal / monthlyIncome;
    if (fixedRatio >= 0.6) tips.push({ id: "high-fixed", title: "Gastos fixos altos", message: "Seus gastos fixos estão acima de 60% da renda. Considere renegociar ou cortar assinaturas." });
    else if (fixedRatio >= 0.4) tips.push({ id: "balanced-fixed", title: "Fixos moderados", message: "Seus gastos fixos estão moderados. Um ajuste pequeno pode acelerar sua meta." });

    const cardRatio = creditInvoiceAmount / monthlyIncome;
    if (creditInvoiceAmount > 0 && cardRatio >= 0.4) {
      tips.push({ id: "card-high", title: "Fatura do cartão pesada", message: "A fatura do período atual consome mais de 40% da renda. Reveja compras e priorize quitar valores maiores." });
    } else if (creditInvoiceAmount > 0 && cardRatio >= 0.25) {
      tips.push({ id: "card-medium", title: "Fatura relevante", message: "Sua fatura está acima de 25% da renda. Vale cortar supérfluos ou antecipar parcelas." });
    }

    if (transferSpent > monthlyIncome * 0.2) {
      tips.push({ id: "transfer", title: "Transferências elevadas", message: "Transferências/PIX estão altas neste mês. Confirme se não há repasses recorrentes desnecessários." });
    }

    if (netAfterAll < 0) {
      tips.push({ id: "negative-margin", title: "Margem negativa", message: "Somando fixos, fatura e transferências, você está no vermelho. Reduzir 10-20% desses itens já melhora o fluxo." });
    }
  }
  if (currentGoal?.type === "save" && targetAmount > 0) {
    if (monthlySaving === 0) tips.push({ id: "no-saving", title: "Sem margem para poupar", message: "No momento não há sobra mensal. Reduza despesas ou aumente a renda para viabilizar a meta." });
    else if (estimatedMonths) tips.push({ id: "eta", title: "Estimativa de tempo", message: `Guardando ${saveRate}% da sobra, você leva cerca de ${estimatedMonths} ${estimatedMonths === 1 ? "mês" : "meses"} para atingir R$ ${targetAmount.toFixed(2)}.` });
    if (estimatedMonths && monthsUntilTarget !== null) {
      if (estimatedMonths <= monthsUntilTarget) tips.push({ id: "congrats", title: "Parabéns!", message: "Você deve alcançar a meta antes da data planejada. Mantenha o ritmo! 🎉" });
      else tips.push({ id: "behind", title: "Ajuste necessário", message: "No ritmo atual, você passará da data alvo. Considere aumentar a taxa de poupança ou reduzir despesas." });
    }
  }

  useEffect(() => {
    const congratsTip = tips.find((t) => t.id === "congrats");
    const behindTip = tips.find((t) => t.id === "behind");
    if (congratsTip) {
      setPopupContent({ title: congratsTip.title, message: congratsTip.message });
      setShowPopup(true);
    } else if (behindTip) {
      setPopupContent({ title: behindTip.title, message: behindTip.message });
      setShowPopup(true);
    } else {
      setShowPopup(false);
    }
  }, [monthlyIncome, fixedExpensesTotal, saveRate, currentGoal?.target_date, targetAmount]);

  async function handleSaveGoal() {
    setFormError("");
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      navigate("/login");
      return;
    }
    const userId = sessionData.session.user.id;

    if (!incomeInput || incomeInput <= 0) {
      setFormError("Informe uma renda mensal válida.");
      return;
    }
    if (goalTypeInput === "save" && (!targetAmountInput || targetAmountInput <= 0)) {
      setFormError("Informe o valor da meta de poupança.");
      return;
    }

    try {
      setSavingGoal(true);
      await supabase.from("financial_profile").upsert({ user_id: userId, monthly_income: Number(incomeInput) });

      if (currentGoal?.id) {
        await supabase
          .from("financial_goals")
          .update({
            type: goalTypeInput,
            target_amount: goalTypeInput === "save" ? Number(targetAmountInput) : null,
            target_date: targetDateInput || null,
            description: goalDescInput || null,
          })
          .eq("id", currentGoal.id);
      } else {
        await supabase.from("financial_goals").insert({
          user_id: userId,
          type: goalTypeInput,
          target_amount: goalTypeInput === "save" ? Number(targetAmountInput) : null,
          target_date: targetDateInput || null,
          description: goalDescInput || null,
        });
      }

      await fetchData();
      setShowEditModal(false);
    } catch (e) {
      setFormError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSavingGoal(false);
    }
  }

  function openRecurringModal() {
    setRecurringError("");
    setRemovedRecurringIds([]);
    setRecurringDraft((recurringExpenses || []).map((r) => ({ ...r, category: r.category || "", day_of_month: r.day_of_month ?? "" })));
    setShowRecurringModal(true);
  }

  function updateRecurringField(targetId, field, value) {
    setRecurringDraft((list) => list.map((item) => (item.id === targetId ? { ...item, [field]: value } : item)));
  }

  function handleAddRecurringRow() {
    setRecurringDraft((list) => [
      ...list,
      { id: `temp-${Date.now()}`, isNew: true, name: "", amount: "", category: "", day_of_month: "", active: true },
    ]);
  }

  function handleRemoveRecurringRow(targetId) {
    setRecurringDraft((list) => {
      const target = list.find((r) => r.id === targetId);
      if (target && !target.isNew && target.id) {
        setRemovedRecurringIds((ids) => [...ids, target.id]);
      }
      return list.filter((r) => r.id !== targetId);
    });
  }

  async function handleSaveRecurring() {
    setRecurringError("");
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      navigate("/login");
      return;
    }
    const userId = sessionData.session.user.id;

    const normalized = recurringDraft.map((r) => {
      const amountValue = Number(r.amount || 0);
      return {
        id: r.isNew ? null : r.id,
        user_id: userId,
        name: (r.name || "").trim(),
        amount: amountValue,
        category: (r.category || "").trim() || null,
        day_of_month: r.day_of_month ? Number(r.day_of_month) : null,
        active: r.active !== false,
      };
    });

    for (const row of normalized) {
      if (!row.name) {
        setRecurringError("Preencha o nome de todos os gastos fixos.");
        return;
      }
      if (!row.amount || row.amount <= 0) {
        setRecurringError("Informe valores maiores que zero.");
        return;
      }
      if (row.day_of_month && (row.day_of_month < 1 || row.day_of_month > 31)) {
        setRecurringError("Use um dia do mês entre 1 e 31.");
        return;
      }
    }

    const updates = normalized.filter((r) => r.id);
    const inserts = normalized.filter((r) => !r.id);

    try {
      setSavingRecurring(true);
      if (updates.length) {
        await supabase.from("recurring_expenses").upsert(updates);
      }
      if (inserts.length) {
        const insertPayload = inserts.map(({ id, ...rest }) => rest);
        await supabase.from("recurring_expenses").insert(insertPayload);
      }
      if (removedRecurringIds.length) {
        await supabase.from("recurring_expenses").delete().in("id", removedRecurringIds);
      }
      await fetchData();
      setShowRecurringModal(false);
    } catch (e) {
      setRecurringError("Não foi possível salvar os gastos fixos.");
    } finally {
      setSavingRecurring(false);
    }
  }

  return (
    <div className="space-y-6">
      {showPopup && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-primary-800 mb-1 text-sm">{popupContent.title}</h3>
              <p className="text-sm text-primary-700">{popupContent.message}</p>
            </div>
            <button onClick={() => setShowPopup(false)} className="text-sm text-slate-500 px-2 py-1 rounded-lg hover:bg-white transition">✕</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold text-slate-800">Metas & Orçamento</h2>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income vs Fixed Expenses */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-700">Renda x Gastos fixos</h3>
            <button onClick={openRecurringModal} className="text-xs bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg font-medium transition">Alterar gastos fixos</button>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetComparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `R$ ${Number(v).toFixed(0)}`} />
                <Tooltip formatter={(v, n) => [`R$ ${Number(v).toFixed(2)}`, n]} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {budgetComparisonData.map((item, idx) => (
                    <Cell key={idx} fill={item.name === 'Renda' ? '#10b981' : '#f87171'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Renda:</span> R$ {monthlyIncome.toFixed(2)} • <span className="font-medium text-slate-700">Fixos:</span> R$ {fixedExpensesTotal.toFixed(2)}
          </div>
        </div>

        {/* Current Goal */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Meta atual</h3>
          <div className="text-sm text-slate-600">
            {financialGoals && financialGoals.length > 0 ? (
              <div>
                <p><span className="font-medium text-slate-800">Tipo:</span> {financialGoals[0].type === 'save' ? 'Juntar dinheiro' : 'Reduzir gastos'}</p>
                {financialGoals[0].type === 'save' && (
                  <p className="mt-1"><span className="font-medium text-slate-800">Alvo:</span> R$ {Number(financialGoals[0].target_amount||0).toFixed(2)} {financialGoals[0].target_date?`até ${new Date(financialGoals[0].target_date).toLocaleDateString()}`:''}</p>
                )}
                {financialGoals[0].description && (
                  <p className="mt-1 text-slate-500">{financialGoals[0].description}</p>
                )}
              </div>
            ) : (
              <p>Nenhuma meta definida ainda.</p>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setShowEditModal(true)} className="text-xs bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg font-medium transition">Ajustar metas</button>
            <button onClick={() => navigate('/transactions')} className="text-xs bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition">Ver transações</button>
          </div>

          {tips.length > 0 && (
            <div className="mt-4 space-y-2">
              {tips.slice(0,3).map((t) => (
                <div key={t.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
                  <p className="font-medium text-slate-700">{t.title}</p>
                  <p className="text-slate-500">{t.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Reduction Plan */}
      {(currentGoal?.type === 'reduce' || goalTypeInput === 'reduce') && (
        <section>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-medium text-slate-700 mb-1">Plano de redução</h3>
            <p className="text-xs text-slate-500 mb-4">Considerando renda fixa, gastos fixos, transferências e fatura do cartão.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-400">Renda fixa</p>
                <p className="font-medium text-slate-800">R$ {monthlyIncome.toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-400">Gastos fixos</p>
                <p className="font-medium text-slate-800">R$ {fixedExpensesTotal.toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-400">Fatura (período atual)</p>
                <p className="font-medium text-slate-800">R$ {Math.max(0, creditInvoiceAmount).toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-400">Transferências / PIX</p>
                <p className="font-medium text-slate-800">R$ {transferSpent.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-4 text-sm text-slate-600">
              <p>Margem atual: <span className={`font-medium ${netAfterAll < 0 ? 'text-red-600' : 'text-slate-800'}`}>R$ {netAfterAll.toFixed(2)}</span></p>
              <label className="block text-xs font-medium text-slate-500 mt-3 mb-1">Quanto cortar desses gastos (%)</label>
              <input type="range" min="0" max="40" value={reduceRate} onChange={(e)=>setReduceRate(Number(e.target.value))} className="w-full accent-primary-600" />
              <p className="mt-2">Corte estimado: <span className="font-medium">R$ {reduceCut.toFixed(2)}</span> • Nova margem: <span className={`font-medium ${netAfterReduction < 0 ? 'text-red-600' : 'text-emerald-600'}`}>R$ {netAfterReduction.toFixed(2)}</span></p>
            </div>
          </div>
        </section>
      )}

      {/* Recurring Expenses Modal */}
      {showRecurringModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg w-full max-w-4xl p-6 relative">
            <button onClick={() => setShowRecurringModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition">✕</button>
            <h3 className="text-lg font-semibold text-slate-800">Gastos fixos</h3>
            <p className="text-xs text-slate-500 mb-4">Edite valores, ative/desative e remova o que não fizer sentido.</p>

            {recurringError && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{recurringError}</div>}

            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {recurringDraft.length ? recurringDraft.map((r) => (
                <div key={r.id} className="grid grid-cols-12 gap-2 items-center border border-slate-200 rounded-lg px-3 py-2 bg-slate-50">
                  <input className="col-span-3 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Nome" value={r.name} onChange={(e)=>updateRecurringField(r.id, "name", e.target.value)} />
                  <input type="number" step="0.01" min="0" className="col-span-2 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Valor" value={r.amount ?? ""} onChange={(e)=>updateRecurringField(r.id, "amount", e.target.value)} />
                  <input className="col-span-3 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Categoria" value={r.category ?? ""} onChange={(e)=>updateRecurringField(r.id, "category", e.target.value)} />
                  <input type="number" min="1" max="31" className="col-span-2 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Dia" value={r.day_of_month ?? ""} onChange={(e)=>updateRecurringField(r.id, "day_of_month", e.target.value)} />
                  <div className="col-span-1 flex items-center justify-center">
                    <label className="flex items-center gap-1 text-xs text-slate-600">
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" checked={r.active !== false} onChange={(e)=>updateRecurringField(r.id, "active", e.target.checked)} />
                      Ativo
                    </label>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button type="button" className="text-xs text-red-500 hover:text-red-600" onClick={()=>handleRemoveRecurringRow(r.id)}>Remover</button>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-slate-500 border border-dashed border-slate-300 rounded-lg p-3">Nenhum gasto fixo cadastrado.</p>
              )}
            </div>

            <div className="mt-4 flex justify-between items-center">
              <button onClick={handleAddRecurringRow} className="text-xs border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition">Adicionar linha</button>
              <div className="flex gap-2">
                <button onClick={()=>setShowRecurringModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition">Cancelar</button>
                <button onClick={handleSaveRecurring} disabled={savingRecurring} className={`px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition ${savingRecurring?'opacity-80 cursor-not-allowed':''}`}>{savingRecurring ? 'Salvando...' : 'Salvar gastos'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Goal Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg w-full max-w-lg p-6 relative">
            <button onClick={() => setShowEditModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition">✕</button>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Ajustar renda e meta</h3>

            {formError && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Renda mensal</label>
                <input type="number" min="0" value={incomeInput} onChange={(e)=>setIncomeInput(Number(e.target.value))} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Tipo de meta</label>
                <div className="flex gap-2">
                  <button type="button" onClick={()=>setGoalTypeInput("save")} className={`px-3 py-2 rounded-lg border text-sm transition ${goalTypeInput==='save' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600'}`}>Juntar dinheiro</button>
                  <button type="button" onClick={()=>setGoalTypeInput("reduce")} className={`px-3 py-2 rounded-lg border text-sm transition ${goalTypeInput==='reduce' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600'}`}>Reduzir gastos</button>
                </div>
              </div>

              {goalTypeInput === "save" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Valor alvo</label>
                    <input type="number" min="0" value={targetAmountInput} onChange={(e)=>setTargetAmountInput(Number(e.target.value))} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Data alvo</label>
                    <input type="date" value={targetDateInput} onChange={(e)=>setTargetDateInput(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Descrição (opcional)</label>
                <input type="text" value={goalDescInput} onChange={(e)=>setGoalDescInput(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={()=>setShowEditModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition">Cancelar</button>
              <button onClick={handleSaveGoal} disabled={savingGoal} className={`px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition ${savingGoal?'opacity-80 cursor-not-allowed':''}`}>{savingGoal ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}