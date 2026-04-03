import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Logo from "../components/Logo";
import { useNavigate } from "react-router-dom";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [userId, setUserId] = useState(null);

  // Goals
  const [goalType, setGoalType] = useState("save");
  const [targetAmount, setTargetAmount] = useState(0);
  const [targetDate, setTargetDate] = useState("");
  const [goalDescription, setGoalDescription] = useState("");

  // Profile
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [hasMealVoucher, setHasMealVoucher] = useState(false);
  const [mealVoucherAmount, setMealVoucherAmount] = useState("");
  const [usesCreditCard, setUsesCreditCard] = useState(false);
  const [creditLimit, setCreditLimit] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");

  // Recurring
  const [recurrings, setRecurrings] = useState([]);
  const [recName, setRecName] = useState("");
  const [recAmount, setRecAmount] = useState("");
  const [recCategory, setRecCategory] = useState("");
  const [recDay, setRecDay] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate("/login");
        return;
      }
      const uid = data.session.user.id;
      // If profile already exists, skip onboarding and go to goals
      const { data: existingProfile } = await supabase
        .from("financial_profile")
        .select("id")
        .eq("user_id", uid)
        .maybeSingle();

      if (existingProfile) {
        navigate("/goals");
        return;
      }

      setUserId(uid);
    }
    load();
  }, [navigate]);

  function addRecurring() {
    if (!recName || !recAmount) return;
    setRecurrings((list) => [
      ...list,
      { name: recName, amount: Number(recAmount), category: recCategory || "Outros", day_of_month: recDay ? Number(recDay) : null }
    ]);
    setRecName("");
    setRecAmount("");
    setRecCategory("");
    setRecDay("");
  }

  async function handleFinish() {
    const errs = {};
    if (goalType === "save" && (!targetAmount || targetAmount <= 0)) errs.targetAmount = "Informe o valor da meta";
    if (!monthlyIncome || monthlyIncome <= 0) errs.monthlyIncome = "Informe sua renda mensal";

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Volta para o passo que tem erro para o usuário ver a mensagem
      if (errs.targetAmount) { setStep(1); return; }
      if (errs.monthlyIncome) { setStep(2); return; }
      return;
    }

    try {
      setLoading(true);

      const { error: profileError } = await supabase.from("financial_profile").upsert({
        user_id: userId,
        monthly_income: Number(monthlyIncome),
        has_meal_voucher: hasMealVoucher,
        meal_voucher_monthly_amount: hasMealVoucher && mealVoucherAmount ? Number(mealVoucherAmount) : null,
      });
      if (profileError) throw new Error(profileError.message);

      if (usesCreditCard) {
        const { error: ccError } = await supabase.from("credit_card_settings").upsert({
          user_id: userId,
          credit_limit: creditLimit ? Number(creditLimit) : null,
          closing_day: closingDay ? Number(closingDay) : 25,
          due_day: dueDay ? Number(dueDay) : 5,
        });
        if (ccError) throw new Error(ccError.message);
      }

      const { error: goalError } = await supabase.from("financial_goals").insert({
        user_id: userId,
        type: goalType,
        target_amount: goalType === "save" ? Number(targetAmount) : null,
        target_date: targetDate || null,
        description: goalDescription || null,
      });
      if (goalError) throw new Error(goalError.message);

      if (recurrings.length > 0) {
        const rows = recurrings.map((r) => ({ ...r, user_id: userId }));
        const { error: recError } = await supabase.from("recurring_expenses").insert(rows);
        if (recError) throw new Error(recError.message);
      }

      navigate("/dashboard");
    } catch (e) {
      setErrors({ submit: e.message || "Falha ao salvar. Tente novamente." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-6 py-14">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="px-8 sm:px-10 py-8 sm:py-10">
          <div className="flex flex-col items-center gap-1 mb-6">
            <Logo size={44} />
          </div>
          <h2 className="text-xl font-semibold text-center mb-1 text-slate-800 dark:text-slate-100">Vamos ajustar suas metas</h2>
          <p className="text-center text-slate-500 dark:text-slate-400 mb-6 text-sm">Defina objetivos, renda mensal e gastos recorrentes</p>

          {errors.submit && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errors.submit}</div>
          )}

          {/* Steps indicator */}
          <div className="flex justify-center gap-2 mb-6">
            {[1,2,3].map((s) => (
              <span key={s} className={`h-2 rounded-full transition-all ${step===s?"bg-primary-600 w-8":"bg-slate-200 dark:bg-slate-700 w-3"}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">Escolha sua meta principal:</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setGoalType("save")} className={`px-4 py-2 rounded-lg border text-sm transition ${goalType==='save'?"border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300":"border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>Juntar dinheiro</button>
                <button type="button" onClick={() => setGoalType("reduce")} className={`px-4 py-2 rounded-lg border text-sm transition ${goalType==='reduce'?"border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300":"border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>Reduzir gastos</button>
              </div>

              {goalType === "save" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Valor alvo</label>
                    <input type="number" min="0" className={`w-full px-3 py-2 rounded-lg border ${errors.targetAmount?"border-red-500":"border-slate-200 dark:border-slate-700"} bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent`} value={targetAmount} onChange={(e)=>setTargetAmount(Number(e.target.value))} />
                    {errors.targetAmount && <p className="text-red-500 text-xs mt-1">{errors.targetAmount}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Data alvo</label>
                    <input type="date" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" value={targetDate} onChange={(e)=>setTargetDate(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Descrição (opcional)</label>
                    <input type="text" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" value={goalDescription} onChange={(e)=>setGoalDescription(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={()=>setStep(2)} className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition">Continuar</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Renda mensal</label>
                <input type="number" min="0" className={`w-full px-3 py-2 rounded-lg border ${errors.monthlyIncome?"border-red-500":"border-slate-200 dark:border-slate-700"} bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent`} value={monthlyIncome} onChange={(e)=>setMonthlyIncome(Number(e.target.value))} />
                {errors.monthlyIncome && <p className="text-red-500 text-xs mt-1">{errors.monthlyIncome}</p>}
              </div>

              <div className="space-y-3 pt-1">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Você recebe vale alimentação?</p>
                <div className="flex gap-3">
                  <button type="button" onClick={()=>setHasMealVoucher(true)} className={`px-4 py-2 rounded-lg border text-sm transition ${hasMealVoucher?"border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300":"border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>Sim</button>
                  <button type="button" onClick={()=>setHasMealVoucher(false)} className={`px-4 py-2 rounded-lg border text-sm transition ${!hasMealVoucher?"border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300":"border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>Não</button>
                </div>
                {hasMealVoucher && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Valor mensal do vale</label>
                    <input type="number" min="0" step="0.01" placeholder="0,00" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" value={mealVoucherAmount} onChange={(e)=>setMealVoucherAmount(e.target.value)} />
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-1">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Você usa cartão de crédito?</p>
                <div className="flex gap-3">
                  <button type="button" onClick={()=>setUsesCreditCard(true)} className={`px-4 py-2 rounded-lg border text-sm transition ${usesCreditCard?"border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300":"border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>Sim</button>
                  <button type="button" onClick={()=>setUsesCreditCard(false)} className={`px-4 py-2 rounded-lg border text-sm transition ${!usesCreditCard?"border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300":"border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>Não</button>
                </div>
                {usesCreditCard && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Limite do cartão</label>
                      <input type="number" min="0" step="0.01" placeholder="0,00" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" value={creditLimit} onChange={(e)=>setCreditLimit(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Dia de fechamento</label>
                      <input type="number" min="1" max="31" placeholder="Ex: 25" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" value={closingDay} onChange={(e)=>setClosingDay(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Dia de vencimento</label>
                      <input type="number" min="1" max="31" placeholder="Ex: 5" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" value={dueDay} onChange={(e)=>setDueDay(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-1">
                <button type="button" onClick={()=>setStep(1)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Voltar</button>
                <button type="button" onClick={()=>setStep(3)} className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition">Continuar</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">Adicione seus gastos fixos mensais</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input value={recName} onChange={(e)=>setRecName(e.target.value)} placeholder="Nome" className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                <input value={recAmount} onChange={(e)=>setRecAmount(e.target.value)} placeholder="Valor" type="number" min="0" className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                <input value={recCategory} onChange={(e)=>setRecCategory(e.target.value)} placeholder="Categoria" className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                <input value={recDay} onChange={(e)=>setRecDay(e.target.value)} placeholder="Dia (1-31)" type="number" min="1" max="31" className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <button type="button" onClick={addRecurring} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Adicionar gasto fixo</button>

              {recurrings.length > 0 && (
                <div className="mt-2">
                  <ul className="divide-y divide-slate-100 dark:divide-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    {recurrings.map((r, idx) => (
                      <li key={idx} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="text-slate-700 dark:text-slate-200">{r.name} — R$ {r.amount.toFixed(2)} ({r.category}) {r.day_of_month?`• dia ${r.day_of_month}`:""}</span>
                        <button type="button" className="text-red-500 hover:text-red-600 text-sm transition" onClick={()=>setRecurrings(recurrings.filter((_,i)=>i!==idx))}>Remover</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-between">
                <button type="button" onClick={()=>setStep(2)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Voltar</button>
                <button type="button" onClick={handleFinish} disabled={loading} className={`px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition ${loading?"opacity-70 cursor-not-allowed":""}`}>{loading?"Salvando...":"Concluir"}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
