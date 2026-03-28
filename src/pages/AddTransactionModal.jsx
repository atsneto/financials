import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function AddTransactionModal({ isOpen, onClose, onSuccess }) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("income");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("debit_pix");
  const [creditCardId, setCreditCardId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cardError, setCardError] = useState("");

  // cartões do usuário
  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);

  // inline add card
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardName, setNewCardName] = useState("");
  const [newCardLast4, setNewCardLast4] = useState("");
  const [savingCard, setSavingCard] = useState(false);

  useEffect(() => {
    if (isOpen) loadCards();
  }, [isOpen]);

  async function loadCards() {
    setLoadingCards(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoadingCards(false); return; }
    const { data } = await supabase
      .from("credit_cards")
      .select("id, name, last_four")
      .eq("user_id", session.user.id)
      .order("created_at");
    setCards(data || []);
    setLoadingCards(false);
  }

  async function handleAddCard() {
    if (!newCardName.trim()) return;
    setSavingCard(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSavingCard(false); return; }
    const { data, error } = await supabase
      .from("credit_cards")
      .insert({
        user_id: session.user.id,
        name: newCardName.trim().slice(0, 100),
        last_four: newCardLast4.trim() || null,
      })
      .select("id, name, last_four")
      .single();
    setSavingCard(false);
    if (!error && data) {
      const updated = [...cards, data];
      setCards(updated);
      setCreditCardId(data.id);
      setNewCardName("");
      setNewCardLast4("");
      setShowAddCard(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const trimmedTitle = title.trim().slice(0, 255);
    const parsedAmount = parseFloat(amount);
    const VALID_TYPES = ["income", "expense"];
    const VALID_METHODS = ["debit_pix", "credit_card", "meal_voucher"];

    if (!trimmedTitle) return;
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 1_000_000) return;
    if (!VALID_TYPES.includes(type)) return;
    if (!VALID_METHODS.includes(paymentMethod)) return;
    if (paymentMethod === "credit_card" && !creditCardId) {
      setCardError("Selecione o cartão de crédito utilizado.");
      return;
    }
    setCardError("");

    const txDate = date ? new Date(date + "T00:00:00").toISOString() : new Date().toISOString();
    const resolvedCardId = paymentMethod === "credit_card" && creditCardId ? creditCardId : null;

    const { error } = await supabase.from("transactions").insert([
      {
        title: trimmedTitle,
        amount: parsedAmount,
        type,
        category: category.trim().slice(0, 100),
        user_id: session.user.id,
        created_at: txDate,
        payment_method: paymentMethod,
        credit_card_id: resolvedCardId,
      },
    ]);

    // Se for cartão de crédito, registra também na fatura do cartão
    if (!error && paymentMethod === "credit_card" && type === "expense") {
      await supabase.from("credit_card_transactions").insert([
        {
          title: trimmedTitle,
          amount: parsedAmount,
          category: category.trim().slice(0, 100),
          merchant: "",
          created_at: txDate,
          user_id: session.user.id,
          credit_card_id: resolvedCardId,
        },
      ]);
    }

    if (!error) {
      window.dispatchEvent(new Event("transactions-updated"));
      onSuccess();
      onClose();
      setTitle("");
      setAmount("");
      setCategory("");
      setType("income");
      setPaymentMethod("debit_pix");
      setCreditCardId("");
      setDate(new Date().toISOString().slice(0, 10));
      setShowAddCard(false);
      setCardError("");
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative bg-white rounded-xl w-full max-w-md p-6 shadow-lg border border-slate-200 max-h-[90vh] overflow-y-auto mx-4">
        <h2 className="text-lg font-semibold text-slate-800 mb-5">Nova transação</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Título</label>
            <input
              type="text"
              placeholder="Ex: Salário"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Valor</label>
            <input
              type="number"
              placeholder="0,00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Categoria</label>
            <input
              type="text"
              placeholder="Ex: Alimentação"
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Data</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Tipo</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Meio de pagamento</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "credit_card",  label: "Cartão de crédito" },
                { value: "debit_pix",    label: "Débito / PIX"      },
                { value: "meal_voucher", label: "Vale alimentação"   },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setPaymentMethod(opt.value); setShowAddCard(false); setCardError(""); setCreditCardId(""); }}
                  className={`px-2 py-2 rounded-lg border text-xs text-center transition ${
                    paymentMethod === opt.value
                      ? "border-primary-500 bg-primary-50 text-primary-700 font-medium"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Seletor de cartão */}
          {paymentMethod === "credit_card" && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Cartão <span className="text-red-500">*</span>
              </label>

              {loadingCards ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                  <div className="h-3.5 w-3.5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                  Carregando cartões...
                </div>
              ) : cards.length === 0 && !showAddCard ? (
                <div className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-center">
                  <p className="text-xs text-slate-400 mb-2">Nenhum cartão cadastrado</p>
                  <button
                    type="button"
                    onClick={() => setShowAddCard(true)}
                    className="text-xs text-primary-600 font-medium hover:text-primary-700 transition"
                  >
                    + Adicionar cartão
                  </button>
                </div>
              ) : !showAddCard ? (
                <div className="space-y-1.5">
                  {cards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => { setCreditCardId(card.id); setCardError(""); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm transition ${
                        creditCardId === card.id
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span className="flex-1 text-left font-medium">{card.name}</span>
                      {card.last_four && (
                        <span className="text-xs text-slate-400">•••• {card.last_four}</span>
                      )}
                      {creditCardId === card.id && (
                        <svg className="w-4 h-4 text-primary-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowAddCard(true)}
                    className="w-full text-left text-xs text-slate-400 hover:text-primary-600 px-3 py-1.5 transition"
                  >
                    + Adicionar novo cartão
                  </button>
                </div>
              ) : null}

              {cardError && (
                <p className="text-xs text-red-500 mt-1">{cardError}</p>
              )}

              {/* Inline add card form */}
              {showAddCard && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <p className="text-xs font-medium text-slate-600">Novo cartão</p>
                  <input
                    type="text"
                    placeholder="Nome do cartão (ex: Nubank, Itaú Visa)"
                    value={newCardName}
                    onChange={e => setNewCardName(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Últimos 4 dígitos (opcional)"
                    maxLength={4}
                    value={newCardLast4}
                    onChange={e => setNewCardLast4(e.target.value.replace(/\D/g, ""))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddCard(false)}
                      className="flex-1 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-white transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCard}
                      disabled={savingCard || !newCardName.trim()}
                      className="flex-1 py-1.5 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition disabled:opacity-60"
                    >
                      {savingCard ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
