import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Logo from "../components/Logo";
import { useNavigate } from "react-router-dom";
import BANKS from "../utils/banks";

const CATEGORY_KEYWORDS = {
  "Moradia": ["aluguel", "condomínio", "condominio", "iptu", "financiamento", "seguro residencial", "prestação", "prestacao"],
  "Alimentação": ["alimentação", "alimentacao", "restaurante", "ifood", "padaria", "lanche", "refeição", "refeicao"],
  "Mercado": ["mercado", "supermercado", "feira", "hortifruti", "açougue", "acougue"],
  "Transporte": ["transporte", "uber", "99", "combustível", "combustivel", "gasolina", "estacionamento", "pedágio", "pedagio", "seguro auto", "ipva", "carro", "moto", "ônibus", "onibus", "metrô", "metro"],
  "Saúde": ["saúde", "saude", "plano de saúde", "plano de saude", "academia", "farmácia", "farmacia", "dentista", "médico", "medico", "remédio", "remedio", "gym", "crossfit"],
  "Educação": ["educação", "educacao", "escola", "faculdade", "curso", "mensalidade", "inglês", "ingles", "idioma", "livro"],
  "Lazer": ["lazer", "netflix", "spotify", "disney", "hbo", "prime video", "streaming", "cinema", "show", "teatro", "viagem", "passeio", "youtube", "apple tv", "deezer", "amazon prime", "globoplay", "crunchyroll"],
  "Delivery": ["delivery", "rappi", "zé delivery", "ze delivery"],
  "Vestuário": ["vestuário", "vestuario", "roupa", "calçado", "calcado", "sapato", "tênis", "tenis", "shein", "renner", "riachuelo"],
  "Outros": ["seguro", "celular", "telefone", "internet", "luz", "energia", "água", "agua", "gás", "gas", "conta de luz", "conta de água", "conta de agua", "assinatura", "pet", "veterinário", "veterinario"],
};

function suggestCategory(name) {
  const lower = name.toLowerCase().trim();
  if (!lower) return "";
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return category;
    }
  }
  return "";
}

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [userId, setUserId] = useState(null);

  // Goals
  const [goalType, setGoalType] = useState("save");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [goalDescription, setGoalDescription] = useState("");

  // Profile
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [hasMealVoucher, setHasMealVoucher] = useState(false);
  const [mealVoucherAmount, setMealVoucherAmount] = useState("");
  const [mealVoucherCarryover, setMealVoucherCarryover] = useState(false);
  const [usesCreditCard, setUsesCreditCard] = useState(false);
  const [creditCards, setCreditCards] = useState([]);
  const [ccDraft, setCcDraft] = useState({ bank_id: "", name: "", credit_limit: "", closing_day: "", due_day: "" });

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
    if (goalType === "save" && (!targetAmount || Number(targetAmount) <= 0)) errs.targetAmount = "Informe o valor da meta";
    if (!monthlyIncome || Number(monthlyIncome) <= 0) errs.monthlyIncome = "Informe sua renda mensal";

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
        meal_voucher_carryover: hasMealVoucher ? mealVoucherCarryover : false,
      }, { onConflict: 'user_id' });
      if (profileError) throw new Error(profileError.message);

      if (usesCreditCard && creditCards.length > 0) {
        // Salva configuração padrão baseada no primeiro cartão
        const first = creditCards[0];
        const { error: ccError } = await supabase.from("credit_card_settings").upsert({
          user_id: userId,
          closing_day: first.closing_day ? Number(first.closing_day) : 25,
          due_day: first.due_day ? Number(first.due_day) : 5,
        });
        if (ccError) throw new Error(ccError.message);

        // Cria todos os cartões na tabela credit_cards
        const cardRows = creditCards.map(c => {
          const bank = BANKS.find(b => b.id === c.bank_id);
          return {
            user_id: userId,
            name: c.name || (bank ? bank.label : "Meu Cartão"),
            bank_id: c.bank_id || null,
            credit_limit: c.credit_limit ? Number(c.credit_limit) : null,
            closing_day: c.closing_day ? Number(c.closing_day) : null,
            due_day: c.due_day ? Number(c.due_day) : null,
          };
        });
        const { error: cardError } = await supabase.from("credit_cards").insert(cardRows);
        if (cardError) throw new Error(cardError.message);
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

      navigate("/dashboard?tour=1");
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
                    <input type="number" min="0" placeholder="Ex: 10000" className={`w-full px-3 py-2 rounded-lg border ${errors.targetAmount?"border-red-500":"border-slate-200 dark:border-slate-700"} bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent`} value={targetAmount} onChange={(e)=>setTargetAmount(e.target.value)} />
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
                <input type="number" min="0" placeholder="Ex: 5000" className={`w-full px-3 py-2 rounded-lg border ${errors.monthlyIncome?"border-red-500":"border-slate-200 dark:border-slate-700"} bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent`} value={monthlyIncome} onChange={(e)=>setMonthlyIncome(e.target.value)} />
                {errors.monthlyIncome && <p className="text-red-500 text-xs mt-1">{errors.monthlyIncome}</p>}
              </div>

              <div className="space-y-3 pt-1">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Você recebe vale alimentação?</p>
                <div className="flex gap-3">
                  <button type="button" onClick={()=>setHasMealVoucher(true)} className={`px-4 py-2 rounded-lg border text-sm transition ${hasMealVoucher?"border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300":"border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>Sim</button>
                  <button type="button" onClick={()=>setHasMealVoucher(false)} className={`px-4 py-2 rounded-lg border text-sm transition ${!hasMealVoucher?"border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300":"border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>Não</button>
                </div>
                {hasMealVoucher && (
                  <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Valor mensal do vale</label>
                    <input type="number" min="0" step="0.01" placeholder="0,00" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" value={mealVoucherAmount} onChange={(e)=>setMealVoucherAmount(e.target.value)} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">O saldo que sobrar no mês acumula para o próximo?</p>
                    <div className="flex gap-3">
                      <button type="button" onClick={()=>setMealVoucherCarryover(true)} className={`px-4 py-2 rounded-lg border text-sm transition ${mealVoucherCarryover?"border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300":"border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>Sim</button>
                      <button type="button" onClick={()=>setMealVoucherCarryover(false)} className={`px-4 py-2 rounded-lg border text-sm transition ${!mealVoucherCarryover?"border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300":"border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>Não</button>
                    </div>
                  </div>
                  </>
                )}
              </div>

              <div className="space-y-3 pt-1">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Você usa cartão de crédito?</p>
                <div className="flex gap-3">
                  <button type="button" onClick={()=>setUsesCreditCard(true)} className={`px-4 py-2 rounded-lg border text-sm transition ${usesCreditCard?"border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300":"border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>Sim</button>
                  <button type="button" onClick={()=>setUsesCreditCard(false)} className={`px-4 py-2 rounded-lg border text-sm transition ${!usesCreditCard?"border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300":"border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>Não</button>
                </div>
                {usesCreditCard && (
                  <div className="space-y-3">
                    {/* Lista de cartões já adicionados */}
                    {creditCards.length > 0 && (
                      <div className="space-y-2">
                        {creditCards.map((c, i) => {
                          const bank = BANKS.find(b => b.id === c.bank_id);
                          return (
                            <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
                              {bank && <img src={bank.logo} alt="" className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-600 bg-white p-0.5" />}
                              <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 truncate">{c.name || (bank ? bank.label : `Cartão ${i+1}`)}</span>
                              {c.credit_limit && <span className="text-xs text-slate-500 dark:text-slate-400">R$ {Number(c.credit_limit).toLocaleString("pt-BR")}</span>}
                              <button type="button" onClick={() => setCreditCards(list => list.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-xs font-medium">Remover</button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Formulário para adicionar cartão */}
                    <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 p-3 space-y-3">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{creditCards.length === 0 ? "Adicione seu cartão" : "Adicionar outro cartão"}</p>
                      {/* Bank selector grid */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">Banco</label>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-44 overflow-y-auto pr-1">
                          {BANKS.map(bank => (
                            <button key={bank.id} type="button" onClick={() => { const autoName = !ccDraft.name || BANKS.some(b => b.label === ccDraft.name); setCcDraft(d => ({ ...d, bank_id: bank.id, name: autoName ? bank.label : d.name })); }} className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-[10px] font-medium transition ${ccDraft.bank_id === bank.id ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30 ring-1 ring-primary-400" : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                              <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center p-1.5">
                                <img src={bank.logo} alt={bank.label} className="w-full h-full object-contain" />
                              </div>
                              <span className="text-slate-600 dark:text-slate-300 truncate w-full text-center">{bank.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-3">
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Limite do cartão</label>
                          <input type="number" min="0" step="0.01" placeholder="0,00" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" value={ccDraft.credit_limit} onChange={(e) => setCcDraft(d => ({ ...d, credit_limit: e.target.value }))} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Dia de fechamento</label>
                          <input type="number" min="1" max="31" placeholder="Ex: 25" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" value={ccDraft.closing_day} onChange={(e) => setCcDraft(d => ({ ...d, closing_day: e.target.value }))} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Dia de vencimento</label>
                          <input type="number" min="1" max="31" placeholder="Ex: 5" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" value={ccDraft.due_day} onChange={(e) => setCcDraft(d => ({ ...d, due_day: e.target.value }))} />
                        </div>
                      </div>
                      <button type="button" onClick={() => { if (!ccDraft.bank_id && !ccDraft.name) return; setCreditCards(list => [...list, { ...ccDraft }]); setCcDraft({ bank_id: "", name: "", credit_limit: "", closing_day: "", due_day: "" }); }} className="w-full py-2 rounded-lg border border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400 text-xs font-medium hover:bg-primary-50 dark:hover:bg-primary-950/30 transition">+ Adicionar cartão</button>
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
                <input value={recName} onChange={(e)=>{ setRecName(e.target.value); const cat = suggestCategory(e.target.value); if (cat) setRecCategory(cat); }} placeholder="Ex: Aluguel, Netflix..." className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                <input value={recAmount} onChange={(e)=>setRecAmount(e.target.value)} placeholder="Valor" type="number" min="0" className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                <select value={recCategory} onChange={(e)=>setRecCategory(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                  <option value="">Categoria</option>
                  {["Alimentação","Transporte","Lazer","Saúde","Educação","Moradia","Vestuário","Delivery","Mercado","Outros"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
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
