import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import DatePicker, { registerLocale } from "react-datepicker";
import ptBR from "date-fns/locale/pt-BR";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("pt-BR", ptBR);

function formatDateToYYYYMMDDLocal(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

function parseYYYYMMDDToDateLocal(str) {
  if (!str) return null;
  const [year, month, day] = str.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: "", birth_date: "" });
  const [initialForm, setInitialForm] = useState({ name: "", birth_date: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: null, message: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Dados financeiros
  const [monthBalance, setMonthBalance] = useState(null);
  const [totalInvested, setTotalInvested] = useState(null);
  const [financialProfile, setFinancialProfile] = useState(null);
  const [cards, setCards] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    async function loadAll() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) { navigate("/login"); return; }
      const user = sessionData.session.user;

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const [
        { data: profileData },
        { data: txData },
        { data: invData },
        { data: finProfileData },
        { data: cardsData },
      ] = await Promise.all([
        supabase.from("profiles").select("id, name, birth_date").eq("id", user.id).single(),
        supabase.from("transactions").select("type, amount").eq("user_id", user.id).gte("created_at", monthStart).lte("created_at", monthEnd),
        supabase.from("investments").select("amount").eq("user_id", user.id),
        supabase.from("financial_profile").select("monthly_income, spending_limit").eq("user_id", user.id).maybeSingle(),
        supabase.from("credit_cards").select("id, name, last_four").eq("user_id", user.id).order("created_at"),
      ]);

      if (profileData) {
        setProfile(profileData);
        setForm({ name: profileData.name || "", birth_date: profileData.birth_date || "" });
        setInitialForm({ name: profileData.name || "", birth_date: profileData.birth_date || "" });
      }

      if (txData) {
        const income = txData.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
        const expense = txData.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
        setMonthBalance(income - expense);
      }

      setTotalInvested((invData || []).reduce((s, i) => s + Number(i.amount || 0), 0));
      setFinancialProfile(finProfileData || null);
      setCards(cardsData || []);
      setLoading(false);
    }
    loadAll();
  }, [navigate]);

  async function handleSave() {
    setSaving(true);
    setFeedback({ type: null, message: "" });
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) { setFeedback({ type: "error", message: "Sessão expirada. Faça login novamente." }); setSaving(false); return; }
    const { error } = await supabase.from("profiles").upsert({ id: userId, name: form.name, birth_date: form.birth_date });
    if (!error) {
      setProfile(prev => ({ ...(prev || {}), id: userId, ...form }));
      setInitialForm(form);
      setFeedback({ type: "success", message: "Perfeito! Seu perfil foi atualizado." });
    } else {
      setFeedback({ type: "error", message: "Não foi possível salvar. Tente novamente." });
    }
    setSaving(false);
  }

  const handleCancel = () => { setForm(initialForm); setFeedback({ type: null, message: "" }); };

  async function handleDeleteAccount() {
    setDeleting(true);
    const { error } = await supabase.rpc("delete_user_account");
    if (error) {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
      setFeedback({ type: "error", message: "Não foi possível excluir a conta. Tente novamente." });
      return;
    }
    await supabase.auth.signOut();
    navigate("/login");
  }

  const fmt = v => `R$ ${Number(v || 0).toFixed(2)}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500 text-sm">Carregando perfil...</p>
      </div>
    );
  }

  const initial = form.name ? form.name.charAt(0).toUpperCase() : "?";
  const hasChanges = form.name !== initialForm.name || form.birth_date !== initialForm.birth_date;

  const savingsRate = financialProfile && Number(financialProfile.monthly_income) > 0 && monthBalance !== null
    ? (monthBalance / Number(financialProfile.monthly_income)) * 100
    : null;

  const healthLabel = savingsRate === null ? null
    : savingsRate >= 20 ? { text: "Excelente", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" }
    : savingsRate >= 10 ? { text: "Bom", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" }
    : savingsRate >= 0 ? { text: "Regular", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" }
    : { text: "Atenção", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* CABEÇALHO DO PERFIL */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="bg-white rounded-xl border border-slate-200 p-6"
      >
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-white">{initial}</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">{form.name || "Sem nome"}</h1>
            <p className="text-sm text-slate-400">
              {form.birth_date
                ? `Nascimento: ${new Date(...form.birth_date.split("-").map((v, i) => i === 1 ? Number(v) - 1 : Number(v))).toLocaleDateString("pt-BR")}`
                : "Data de nascimento não informada"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <FieldInput label="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <DateInput
            label="Data de nascimento"
            value={form.birth_date}
            onChange={date => setForm({ ...form, birth_date: date })}
          />
        </div>

        {feedback.message && (
          <div className={`mt-4 text-sm rounded-lg px-4 py-3 ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {feedback.message}
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
          {hasChanges && (
            <button onClick={handleCancel} className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition">
              Cancelar
            </button>
          )}
        </div>
      </motion.div>

      {/* RESUMO FINANCEIRO */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
      >
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Resumo financeiro do mês</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">Saldo este mês</p>
            <p className={`text-xl font-bold ${monthBalance !== null && monthBalance < 0 ? "text-red-500" : "text-emerald-600"}`}>
              {monthBalance !== null ? fmt(monthBalance) : "—"}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">Total investido</p>
            <p className="text-xl font-bold text-slate-800">{totalInvested !== null ? fmt(totalInvested) : "—"}</p>
          </div>
          {healthLabel && (
            <div className={`rounded-xl border p-4 ${healthLabel.bg} ${healthLabel.border}`}>
              <p className="text-xs text-slate-500 mb-1">Saúde financeira</p>
              <p className={`text-xl font-bold ${healthLabel.color}`}>{healthLabel.text}</p>
              <p className={`text-xs mt-0.5 ${healthLabel.color}`}>
                {savingsRate >= 0 ? `Poupando ${savingsRate.toFixed(0)}% da renda` : `Saldo negativo este mês`}
              </p>
            </div>
          )}
        </div>
      </motion.div>



      {/* MEUS CARTÕES */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.17 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Meus cartões</h2>
          <button
            onClick={() => navigate("/settings")}
            className="text-xs text-primary-600 hover:text-primary-700 transition"
          >
            Gerenciar
          </button>
        </div>
        {cards.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 p-5 text-center">
            <p className="text-sm text-slate-400 mb-2">Nenhum cartão cadastrado</p>
            <button
              onClick={() => navigate("/settings")}
              className="text-xs text-primary-600 font-medium hover:text-primary-700 transition"
            >
              + Adicionar cartão
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cards.map(card => (
              <div key={card.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{card.name}</p>
                  {card.last_four && (
                    <p className="text-xs text-slate-400">•••• {card.last_four}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ZONA DE PERIGO */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.26 }}
        className="bg-white rounded-xl border border-red-200 p-6"
      >
        <h2 className="text-sm font-semibold text-red-600 mb-1">Zona de perigo</h2>
        <p className="text-xs text-slate-500 mb-4">Ao excluir sua conta, todos os seus dados serão removidos permanentemente. Essa ação não pode ser desfeita.</p>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm hover:bg-red-50 transition"
        >
          Excluir minha conta
        </button>
      </motion.div>

      {/* MODAL DE CONFIRMAÇÃO */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }} />
          <div className="relative bg-white rounded-xl w-full max-w-md p-6 shadow-lg border border-slate-200 mx-4">
            <h3 className="text-base font-semibold text-slate-800 mb-2">Excluir conta</h3>
            <p className="text-sm text-slate-500 mb-4">
              Esta ação é <span className="font-semibold text-red-600">irreversível</span>. Todos os seus dados serão deletados permanentemente.
            </p>
            <p className="text-sm text-slate-600 mb-2">
              Digite <span className="font-mono font-semibold text-slate-800">EXCLUIR</span> para confirmar:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="EXCLUIR"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent mb-5"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "EXCLUIR" || deleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? "Excluindo..." : "Excluir conta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldInput({ label, value, onChange }) {
  return (
    <div className="flex flex-col">
      <label className="text-sm text-slate-500 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        className="border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />
    </div>
  );
}

function DateInput({ label, value, onChange }) {
  const parsedDate = parseYYYYMMDDToDateLocal(value);
  return (
    <div className="flex flex-col">
      <label className="text-sm text-slate-500 mb-1">{label}</label>
      <DatePicker
        locale="pt-BR"
        selected={parsedDate}
        onChange={date => onChange(date ? formatDateToYYYYMMDDLocal(date) : "")}
        dateFormat="dd/MM/yyyy"
        placeholderText="Selecione a data"
        maxDate={new Date()}
        className="border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full"
      />
    </div>
  );
}
