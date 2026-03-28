import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

// ── Icons ─────────────────────────────────────────────────────────────────────
function IconFinanceiro() {
  return (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconPagamentos() {
  return (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}
function IconSeguranca() {
  return (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
function IconSistema() {
  return (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function IconNotificacoes() {
  return (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

// ── Toggle component ──────────────────────────────────────────────────────────
function Toggle({ value, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative flex-shrink-0 w-10 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${value ? "bg-primary-600" : "bg-slate-200"}`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ title, description, children, action }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
        {action}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

const NAV = [
  { id: "financeiro",    label: "Financeiro",    Icon: IconFinanceiro,    color: "text-blue-600",   bg: "bg-blue-50" },
  { id: "pagamentos",    label: "Pagamentos",    Icon: IconPagamentos,    color: "text-violet-600", bg: "bg-violet-50" },
  { id: "seguranca",     label: "Segurança",     Icon: IconSeguranca,     color: "text-green-600",  bg: "bg-green-50" },
  { id: "sistema",       label: "Sistema",       Icon: IconSistema,       color: "text-slate-600",  bg: "bg-slate-100" },
  { id: "notificacoes",  label: "Notificações",  Icon: IconNotificacoes,  color: "text-amber-600",  bg: "bg-amber-50" },
];

export default function Settings() {
  const [activeSection, setActiveSection] = useState("financeiro");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState("");

  // Financeiro
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [hasMealVoucher, setHasMealVoucher] = useState(false);
  const [mealVoucherMonthlyAmount, setMealVoucherMonthlyAmount] = useState("");

  // Pagamentos — cartões
  const [cards, setCards] = useState([]);
  const [cardDraft, setCardDraft] = useState(null);
  const [savingCard, setSavingCard] = useState(false);
  const [cardError, setCardError] = useState("");

  // Segurança — troca de senha
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState(null); // { type: "success"|"error", text }
  const [savingPassword, setSavingPassword] = useState(false);

  // Notificações
  const [notifMeta, setNotifMeta] = useState({
    alertasGastos: true,
    resumoSemanal: false,
    vencimentoCartao: true,
    metasProgresso: true,
  });

  // Sistema
  const [currency, setCurrency] = useState("BRL");
  const [language, setLanguage] = useState("pt-BR");

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = session.user.id;
      setUserId(uid);
      setUserEmail(session.user.email || "");

      const { data: fp } = await supabase
        .from("financial_profile")
        .select("monthly_income, has_meal_voucher, meal_voucher_monthly_amount")
        .eq("user_id", uid)
        .maybeSingle();

      if (fp) {
        setMonthlyIncome(fp.monthly_income ?? "");
        setHasMealVoucher(fp.has_meal_voucher ?? false);
        setMealVoucherMonthlyAmount(fp.meal_voucher_monthly_amount ?? "");
      }

      const { data: cardsData } = await supabase
        .from("credit_cards")
        .select("id, name, last_four, closing_day, due_day, credit_limit")
        .eq("user_id", uid)
        .order("created_at");
      setCards(cardsData || []);
      setLoading(false);
    }
    load();
  }, []);

  const loadCards = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase
      .from("credit_cards")
      .select("id, name, last_four, closing_day, due_day, credit_limit")
      .eq("user_id", session.user.id)
      .order("created_at");
    setCards(data || []);
  }, []);

  async function handleSaveFinanceiro() {
    setSaving(true);
    setSuccess(false);
    await supabase.from("financial_profile").upsert({
      user_id: userId,
      monthly_income: monthlyIncome ? Number(monthlyIncome) : null,
      has_meal_voucher: hasMealVoucher,
      meal_voucher_monthly_amount: hasMealVoucher && mealVoucherMonthlyAmount ? Number(mealVoucherMonthlyAmount) : null,
    });
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  async function handleSaveCard() {
    setCardError("");
    if (!cardDraft?.name?.trim()) return setCardError("Informe o nome do cartão");
    setSavingCard(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSavingCard(false); return; }

    const payload = {
      user_id: session.user.id,
      name: cardDraft.name.trim().slice(0, 100),
      last_four: cardDraft.last_four?.trim() || null,
      closing_day: cardDraft.closing_day ? Number(cardDraft.closing_day) : null,
      due_day: cardDraft.due_day ? Number(cardDraft.due_day) : null,
      credit_limit: cardDraft.credit_limit ? Number(cardDraft.credit_limit) : null,
    };

    let err;
    if (cardDraft.id) {
      ({ error: err } = await supabase.from("credit_cards").update(payload).eq("id", cardDraft.id).eq("user_id", session.user.id));
    } else {
      ({ error: err } = await supabase.from("credit_cards").insert(payload));
    }

    setSavingCard(false);
    if (err) return setCardError("Erro ao salvar. Tente novamente.");
    setCardDraft(null);
    loadCards();
  }

  async function handleDeleteCard(id) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("credit_cards").delete().eq("id", id).eq("user_id", session.user.id);
    loadCards();
  }

  async function handleChangePassword() {
    setPasswordMsg(null);
    if (!newPassword || newPassword.length < 6) {
      return setPasswordMsg({ type: "error", text: "A senha deve ter ao menos 6 caracteres." });
    }
    if (newPassword !== confirmPassword) {
      return setPasswordMsg({ type: "error", text: "As senhas não coincidem." });
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      setPasswordMsg({ type: "error", text: "Erro ao alterar senha. Tente novamente." });
    } else {
      setPasswordMsg({ type: "success", text: "Senha alterada com sucesso!" });
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Content per section ───────────────────────────────────────────────────
  function renderContent() {
    switch (activeSection) {

      // ── FINANCEIRO ──────────────────────────────────────────────────────────
      case "financeiro":
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Financeiro</h2>
              <p className="text-sm text-slate-500 mt-0.5">Configure sua renda e benefícios recebidos</p>
            </div>

            <SectionCard
              title="Renda mensal"
              description="Usada para calcular sua taxa de poupança e saúde financeira"
            >
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Valor mensal bruto (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Vale alimentação"
              description="Configure se você recebe vale alimentação mensalmente"
            >
              <div className="space-y-4">
                <Toggle
                  value={hasMealVoucher}
                  onChange={setHasMealVoucher}
                  label="Recebo vale alimentação"
                  description="Ativa o controle de saldo de vale alimentação"
                />
                {hasMealVoucher && (
                  <div className="pt-1 border-t border-slate-100">
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Valor mensal do vale (R$)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      value={mealVoucherMonthlyAmount}
                      onChange={(e) => setMealVoucherMonthlyAmount(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Cartões de crédito"
              description="Cadastre seus cartões para controle de fatura e limite"
              action={
                <button
                  onClick={() => { setCardDraft({ name: "", last_four: "", closing_day: "", due_day: "", credit_limit: "" }); setCardError(""); }}
                  className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-semibold transition flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Novo cartão
                </button>
              }
            >
              <div className="space-y-3">
                {cards.length === 0 && !cardDraft ? (
                  <div className="text-center py-6">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-500 font-medium">Nenhum cartão cadastrado</p>
                    <p className="text-xs text-slate-400 mt-0.5">Clique em "Novo cartão" para adicionar</p>
                  </div>
                ) : (
                  <>
                    {cards.map((card) => (
                      <div key={card.id} className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50 group">
                        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{card.name}</p>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            {card.last_four && <span className="text-xs text-slate-400">•••• {card.last_four}</span>}
                            {card.closing_day && <span className="text-xs text-slate-400">· Fecha dia {card.closing_day}</span>}
                            {card.due_day && <span className="text-xs text-slate-400">· Vence dia {card.due_day}</span>}
                            {card.credit_limit && <span className="text-xs text-slate-400">· Limite R$ {Number(card.credit_limit).toLocaleString("pt-BR")}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setCardDraft({ ...card }); setCardError(""); }} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition" title="Editar">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button onClick={() => handleDeleteCard(card.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Excluir">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {cardDraft && (
                  <div className="rounded-xl border-2 border-primary-200 bg-primary-50/30 p-4 space-y-3">
                    <p className="text-sm font-semibold text-slate-700">{cardDraft.id ? "Editar cartão" : "Novo cartão"}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Nome do cartão *</label>
                        <input type="text" placeholder="Ex: Nubank, Itaú Visa" value={cardDraft.name} onChange={e => setCardDraft(d => ({ ...d, name: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Últimos 4 dígitos</label>
                        <input type="text" placeholder="Ex: 4521" maxLength={4} value={cardDraft.last_four || ""} onChange={e => setCardDraft(d => ({ ...d, last_four: e.target.value.replace(/\D/g, "") }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Limite (R$)</label>
                        <input type="number" min="0" step="0.01" placeholder="0,00" value={cardDraft.credit_limit || ""} onChange={e => setCardDraft(d => ({ ...d, credit_limit: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Dia de fechamento</label>
                        <input type="number" min="1" max="31" placeholder="Ex: 25" value={cardDraft.closing_day || ""} onChange={e => setCardDraft(d => ({ ...d, closing_day: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Dia de vencimento</label>
                        <input type="number" min="1" max="31" placeholder="Ex: 5" value={cardDraft.due_day || ""} onChange={e => setCardDraft(d => ({ ...d, due_day: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                      </div>
                    </div>
                    {cardError && <p className="text-xs text-red-600">{cardError}</p>}
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => { setCardDraft(null); setCardError(""); }} className="flex-1 py-2 text-xs text-slate-500 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition">Cancelar</button>
                      <button type="button" onClick={handleSaveCard} disabled={savingCard} className="flex-1 py-2 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition disabled:opacity-60">{savingCard ? "Salvando..." : "Salvar cartão"}</button>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>

            {success && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                Configurações salvas com sucesso!
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={handleSaveFinanceiro} disabled={saving} className="px-5 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition disabled:opacity-60">
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        );

      // ── PAGAMENTOS ──────────────────────────────────────────────────────────
      case "pagamentos":
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Pagamentos</h2>
              <p className="text-sm text-slate-500 mt-0.5">Integrações e automações de pagamento</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-12 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Em breve</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">Integrações com bancos, pagamentos automáticos e muito mais estão chegando.</p>
                </div>
                <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 bg-violet-50 border border-violet-100 px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  Em desenvolvimento
                </span>
              </div>
            </div>
          </div>
        );

      // ── SEGURANÇA ───────────────────────────────────────────────────────────
      case "seguranca":
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Segurança</h2>
              <p className="text-sm text-slate-500 mt-0.5">Gerencie sua senha e acesso à conta</p>
            </div>

            <SectionCard
              title="Conta"
              description="Informações de acesso vinculadas à sua conta"
            >
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">E-mail</label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                  <span className="text-sm text-slate-600">{userEmail}</span>
                  <span className="ml-auto text-xs text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">Verificado</span>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Alterar senha"
              description="Escolha uma senha forte com pelo menos 6 caracteres"
            >
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Nova senha</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Confirmar nova senha</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                {passwordMsg && (
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs ${passwordMsg.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-600"}`}>
                    {passwordMsg.type === "success"
                      ? <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      : <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    }
                    {passwordMsg.text}
                  </div>
                )}
                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleChangePassword}
                    disabled={savingPassword || !newPassword || !confirmPassword}
                    className="px-5 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition disabled:opacity-50"
                  >
                    {savingPassword ? "Alterando..." : "Alterar senha"}
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>
        );

      // ── SISTEMA ─────────────────────────────────────────────────────────────
      case "sistema":
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Sistema</h2>
              <p className="text-sm text-slate-500 mt-0.5">Preferências de idioma, moeda e aparência</p>
            </div>

            <SectionCard
              title="Idioma e região"
              description="Define como datas, números e textos são exibidos"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Idioma</label>
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Moeda</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="BRL">R$ — Real Brasileiro</option>
                    <option value="USD">$ — Dólar Americano</option>
                    <option value="EUR">€ — Euro</option>
                  </select>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Aparência"
              description="Tema e preferências visuais do app"
            >
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "light", label: "Claro", icon: "☀️" },
                  { id: "dark",  label: "Escuro", icon: "🌙" },
                ].map(theme => (
                  <button
                    key={theme.id}
                    type="button"
                    className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 text-sm font-medium transition ${
                      theme.id === "light"
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-xl">{theme.icon}</span>
                    {theme.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3 text-center">Modo escuro em breve</p>
            </SectionCard>
          </div>
        );

      // ── NOTIFICAÇÕES ────────────────────────────────────────────────────────
      case "notificacoes":
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Notificações</h2>
              <p className="text-sm text-slate-500 mt-0.5">Escolha quando e como deseja ser alertado</p>
            </div>

            <SectionCard
              title="Alertas financeiros"
              description="Notificações sobre seus gastos e limites"
            >
              <div className="space-y-5">
                <Toggle
                  value={notifMeta.alertasGastos}
                  onChange={v => setNotifMeta(n => ({ ...n, alertasGastos: v }))}
                  label="Alertas de gastos elevados"
                  description="Avisa quando você ultrapassa seu padrão mensal"
                />
                <div className="border-t border-slate-100" />
                <Toggle
                  value={notifMeta.vencimentoCartao}
                  onChange={v => setNotifMeta(n => ({ ...n, vencimentoCartao: v }))}
                  label="Vencimento de fatura"
                  description="Lembrete 3 dias antes do vencimento do cartão"
                />
                <div className="border-t border-slate-100" />
                <Toggle
                  value={notifMeta.metasProgresso}
                  onChange={v => setNotifMeta(n => ({ ...n, metasProgresso: v }))}
                  label="Progresso de metas"
                  description="Atualizações quando suas metas avançam"
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Resumos periódicos"
              description="Relatórios automáticos sobre sua saúde financeira"
            >
              <div className="space-y-5">
                <Toggle
                  value={notifMeta.resumoSemanal}
                  onChange={v => setNotifMeta(n => ({ ...n, resumoSemanal: v }))}
                  label="Resumo semanal"
                  description="Todo domingo, um resumo dos seus gastos da semana"
                />
              </div>
            </SectionCard>

            <div className="flex justify-end">
              <button className="px-5 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition">
                Salvar preferências
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Configurações</h1>
        <p className="text-sm text-slate-500 mt-0.5">Personalize o app de acordo com seu perfil financeiro</p>
      </div>

      <div className="flex gap-6 items-start">
        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <nav className="hidden sm:flex flex-col w-52 flex-shrink-0 gap-1">
          {NAV.map(({ id, label, Icon, color, bg }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                  active
                    ? "bg-white border border-slate-200 shadow-sm text-slate-800"
                    : "text-slate-400 border border-transparent"
                }`}
              >
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? bg : "bg-slate-100"} ${active ? color : "text-slate-400"}`}>
                  <Icon />
                </span>
                {label}
              </button>
            );
          })}
        </nav>

        {/* ── Mobile tabs ───────────────────────────────────────────────────── */}
        <div className="sm:hidden w-full mb-4">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {NAV.map(({ id, label, Icon, color, bg }) => {
              const active = activeSection === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveSection(id)}
                  className={`flex items-center gap-1.5 flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                    active
                      ? "bg-white border-slate-200 shadow-sm text-slate-800"
                      : "text-slate-400 border-transparent"
                  }`}
                >
                  <span className={`w-5 h-5 rounded flex items-center justify-center ${active ? bg : ""} ${active ? color : "text-slate-400"}`}>
                    <Icon />
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 sm:mt-0 mt-0">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
