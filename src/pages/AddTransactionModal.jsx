import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function AddTransactionModal({ isOpen, onClose, onSuccess }) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("income");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("debit_pix");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState("monthly");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });

  async function handleSubmit(e) {
    e.preventDefault();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const trimmedTitle = title.trim().slice(0, 255);
    const parsedAmount = parseFloat(amount);
    const VALID_TYPES = ["income", "expense"];
    const VALID_METHODS = ["debit_pix", "credit_card", "meal_voucher"];
    const VALID_INTERVALS = ["monthly", "weekly", "yearly"];

    if (!trimmedTitle) return;
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 1_000_000) return;
    if (!VALID_TYPES.includes(type)) return;
    if (!VALID_METHODS.includes(paymentMethod)) return;

    const { error } = await supabase.from("transactions").insert([
      {
        title: trimmedTitle,
        amount: parsedAmount,
        type,
        category: category.trim().slice(0, 100),
        user_id: session.user.id,
        recurring: isRecurring,
        recurrence_interval: isRecurring && VALID_INTERVALS.includes(recurrenceInterval) ? recurrenceInterval : null,
        created_at: date ? new Date(date + "T00:00:00").toISOString() : new Date().toISOString(),
        payment_method: paymentMethod,
      },
    ]);

    if (!error) {
      onSuccess(); // recarrega lista
      onClose();   // fecha modal
      setTitle("");
      setAmount("");
      setCategory("");
      setType("income");
      setPaymentMethod("debit_pix");
      setDate(new Date().toISOString().slice(0, 10));
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative bg-white rounded-xl w-full max-w-md p-6 shadow-lg border border-slate-200">
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
                { value: "credit_card", label: "Cartão de crédito" },
                { value: "debit_pix", label: "Débito / PIX" },
                { value: "meal_voucher", label: "Vale alimentação" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPaymentMethod(opt.value)}
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

          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-slate-600">Transação recorrente</span>
          </label>

          {isRecurring && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Frequência</label>
              <select
                value={recurrenceInterval}
                onChange={(e) => setRecurrenceInterval(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="monthly">Mensal</option>
                <option value="quarterly">Trimestral</option>
                <option value="yearly">Anual</option>
              </select>
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
