import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userId, setUserId] = useState(null);

  // Monthly income
  const [monthlyIncome, setMonthlyIncome] = useState("");

  // Meal voucher
  const [hasMealVoucher, setHasMealVoucher] = useState(false);
  const [mealVoucherMonthlyAmount, setMealVoucherMonthlyAmount] = useState("");

  // Credit card
  const [usesCreditCard, setUsesCreditCard] = useState(false);
  const [creditLimit, setCreditLimit] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = session.user.id;
      setUserId(uid);

      const [{ data: fp }, { data: cc }] = await Promise.all([
        supabase
          .from("financial_profile")
          .select("monthly_income, has_meal_voucher, meal_voucher_monthly_amount")
          .eq("user_id", uid)
          .maybeSingle(),
        supabase
          .from("credit_card_settings")
          .select("credit_limit, closing_day, due_day")
          .eq("user_id", uid)
          .maybeSingle(),
      ]);

      if (fp) {
        setMonthlyIncome(fp.monthly_income ?? "");
        setHasMealVoucher(fp.has_meal_voucher ?? false);
        setMealVoucherMonthlyAmount(fp.meal_voucher_monthly_amount ?? "");
      }

      if (cc) {
        setUsesCreditCard(true);
        setCreditLimit(cc.credit_limit ?? "");
        setClosingDay(cc.closing_day ?? "");
        setDueDay(cc.due_day ?? "");
      }

      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSuccess(false);

    await supabase.from("financial_profile").upsert({
      user_id: userId,
      monthly_income: monthlyIncome ? Number(monthlyIncome) : null,
      has_meal_voucher: hasMealVoucher,
      meal_voucher_monthly_amount: hasMealVoucher && mealVoucherMonthlyAmount ? Number(mealVoucherMonthlyAmount) : null,
    });

    if (usesCreditCard) {
      await supabase.from("credit_card_settings").upsert({
        user_id: userId,
        credit_limit: creditLimit ? Number(creditLimit) : null,
        closing_day: closingDay ? Number(closingDay) : 25,
        due_day: dueDay ? Number(dueDay) : 5,
      });
    } else {
      await supabase.from("credit_card_settings").delete().eq("user_id", userId);
    }

    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Configurações</h1>
        <p className="text-sm text-slate-500 mt-1">Gerencie sua renda, cartão de crédito e vale alimentação</p>
      </div>

      {/* Renda Mensal */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="font-medium text-slate-800">Renda Mensal</h2>
            <p className="text-xs text-slate-500">Sua renda bruta mensal para cálculo de saúde financeira</p>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Valor mensal (R$)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            value={monthlyIncome}
            onChange={(e) => setMonthlyIncome(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Vale Alimentação */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h2 className="font-medium text-slate-800">Vale Alimentação</h2>
            <p className="text-xs text-slate-500">Configure se você recebe vale alimentação</p>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setHasMealVoucher((v) => !v)}
            className={`relative w-10 h-6 rounded-full transition-colors ${hasMealVoucher ? "bg-primary-600" : "bg-slate-200"}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${hasMealVoucher ? "translate-x-5" : "translate-x-1"}`} />
          </div>
          <span className="text-sm text-slate-700">Recebo vale alimentação</span>
        </label>

        {hasMealVoucher && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Valor mensal do vale</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={mealVoucherMonthlyAmount}
              onChange={(e) => setMealVoucherMonthlyAmount(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        )}
      </div>

      {/* Cartão de Crédito */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <h2 className="font-medium text-slate-800">Cartão de Crédito</h2>
            <p className="text-xs text-slate-500">Configure seu limite e datas de fatura</p>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setUsesCreditCard((v) => !v)}
            className={`relative w-10 h-6 rounded-full transition-colors ${usesCreditCard ? "bg-primary-600" : "bg-slate-200"}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${usesCreditCard ? "translate-x-5" : "translate-x-1"}`} />
          </div>
          <span className="text-sm text-slate-700">Uso cartão de crédito</span>
        </label>

        {usesCreditCard && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">Limite do cartão</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Dia de fechamento</label>
              <input
                type="number"
                min="1"
                max="31"
                placeholder="Ex: 25"
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Dia de vencimento</label>
              <input
                type="number"
                min="1"
                max="31"
                placeholder="Ex: 5"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
          Configurações salvas com sucesso!
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition ${saving ? "opacity-70 cursor-not-allowed" : ""}`}
        >
          {saving ? "Salvando..." : "Salvar configurações"}
        </button>
      </div>
    </div>
  );
}
