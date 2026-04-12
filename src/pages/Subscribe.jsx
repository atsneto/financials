import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import Logo from "../components/Logo";
import iconCheck from "../svg/check.svg";
import iconCreditCard from "../svg/credit-card.svg";
import iconLock from "../svg/lock.svg";

const FEATURES = [
  "Dashboard completo",
  "Transações ilimitadas",
  "Separação por meio de pagamento",
  "Metas financeiras ilimitadas",
  "Importação CSV Nubank",
  "Gastos recorrentes",
  "Open Finance",
  "Suporte por e-mail",
];

function CheckIcon({ className = "" }) {
  return (
    <img src={iconCheck} alt="" className={`w-4 h-4 flex-shrink-0 ${className}`} style={{ filter: "brightness(0) saturate(100%)" }} />
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export default function Subscribe() {
  const navigate = useNavigate();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [freeLoading, setFreeLoading] = useState(false);
  const [error, setError] = useState("");
  // "loading" | "new_user" | "expired"
  const [mode, setMode] = useState("loading");

  useEffect(() => {
    async function detectMode() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      const { data } = await supabase
        .from("subscriptions")
        .select("status, trial_ends_at")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!data) {
        setMode("new_user");
        return;
      }

      const isPaid = data.status === "active";
      const isFree = data.status === "free";
      const isTrialing =
        data.status === "trialing" &&
        data.trial_ends_at &&
        new Date(data.trial_ends_at) > new Date();

      if (isPaid || isFree || isTrialing) {
        navigate("/dashboard");
        return;
      }

      setMode("expired");
    }

    detectMode();
  }, [navigate]);

  async function handleStartFree() {
    setFreeLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      // Tenta criar na tabela subscriptions; se falhar (tabela não existe, RLS etc), segue mesmo assim
      await supabase.from("subscriptions").upsert({
        user_id: session.user.id,
        status: "free",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" }).then(() => {});

      navigate("/onboarding");
    } catch (err) {
      // Mesmo com erro, segue para o onboarding
      navigate("/onboarding");
    }
  }

  async function handleCheckout() {
    // Stripe não está configurado ainda
    setError("Pagamento via Stripe em breve. Por enquanto, use a conta gratuita.");
  }
  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  if (mode === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary-500 border-slate-200 dark:border-slate-700" />
      </div>
    );
  }

  /* ── NEW USER: choose plan ───────────────────────────────────────── */
  if (mode === "new_user") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <Logo size={36} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-2xl"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Como você quer começar?
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Use grátis ou assine por R$ 5/mês para apoiar o projeto.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300 text-center">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Free card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
              <div className="h-1 bg-slate-200 dark:bg-slate-700" />
              <div className="p-6 flex flex-col flex-1">
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/60 rounded-full px-3 py-1 text-xs font-semibold mb-4 self-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Sem cartão de crédito
                </span>

                <div className="mb-1">
                  <span className="text-4xl font-bold text-slate-900 dark:text-slate-100 leading-none">Grátis</span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">para sempre</p>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <CheckIcon className="text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={handleStartFree}
                  disabled={freeLoading || checkoutLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-semibold py-3 rounded-xl text-sm transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {freeLoading ? (
                    <><Spinner /> Criando conta...</>
                  ) : (
                    "Continuar grátis"
                  )}
                </button>
              </div>
            </div>

            {/* Subscribe card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-primary-500 shadow-md overflow-hidden flex flex-col relative">
              <div className="h-1 bg-gradient-to-r from-primary-500 to-blue-400" />
              <div className="absolute top-5 right-5">
                <span className="bg-primary-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                  Recomendado
                </span>
              </div>

              <div className="p-6 flex flex-col flex-1">
                <span className="inline-flex items-center gap-1.5 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-100 dark:border-primary-900/60 rounded-full px-3 py-1 text-xs font-semibold mb-4 self-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                  Apoie o projeto
                </span>

                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold text-slate-900 dark:text-slate-100 leading-none">R$ 5</span>
                  <span className="text-slate-400 dark:text-slate-500 text-sm mb-1">/mês</span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">Cancele a qualquer momento</p>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <CheckIcon className="text-primary-500" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading || freeLoading}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl text-sm transition shadow-md shadow-primary-100 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {checkoutLoading ? (
                    <><Spinner /> Redirecionando...</>
                  ) : (
                    <>
                      <img src={iconCreditCard} alt="" className="w-4 h-4" style={{ filter: "brightness(0) invert(1)" }} />
                      Assinar por R$ 5/mês
                    </>
                  )}
                </button>
              </div>

              <div className="px-6 pb-5 flex items-center justify-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1">
                  <img src={iconLock} alt="" className="w-3.5 h-3.5" style={{ filter: "brightness(0) saturate(100%) opacity(0.5)" }} />
                  Pagamento seguro via Stripe
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full text-center text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition py-4 mt-2"
          >
            Sair da conta
          </button>
        </motion.div>
      </div>
    );
  }

  /* ── TRIAL EXPIRED ───────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        <Logo size={36} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/60 rounded-full px-3 py-1 text-xs font-semibold mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Período de teste encerrado
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Seu teste gratuito expirou
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Continue grátis ou assine por <span className="font-semibold text-slate-800 dark:text-slate-200">R$ 5/mês</span> para apoiar o projeto.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300 text-center">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-5">
          {/* Assinar card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-primary-500 shadow-md overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary-500 to-blue-400" />
            <div className="p-6">
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold text-slate-900 dark:text-slate-100 leading-none">R$ 5</span>
                <span className="text-slate-400 dark:text-slate-500 text-sm mb-1">/mês</span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">Cancele a qualquer momento</p>

              <button
                onClick={handleCheckout}
                disabled={checkoutLoading || freeLoading}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl text-sm transition shadow-md shadow-primary-100 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {checkoutLoading ? (
                  <><Spinner /> Redirecionando...</>
                ) : (
                  <>
                    <img src={iconCreditCard} alt="" className="w-4 h-4" style={{ filter: "brightness(0) invert(1)" }} />
                    Assinar por R$ 5/mês
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-3 text-xs text-slate-400 dark:text-slate-500 mt-3">
                <span className="flex items-center gap-1">
                  <img src={iconLock} alt="" className="w-3.5 h-3.5" style={{ filter: "brightness(0) saturate(100%) opacity(0.5)" }} />
                  Pagamento seguro via Stripe
                </span>
              </div>
            </div>
          </div>

          {/* Free option */}
          <button
            onClick={handleStartFree}
            disabled={freeLoading || checkoutLoading}
            className="w-full py-3 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {freeLoading ? (
              <><Spinner /> Criando conta...</>
            ) : (
              "Continuar grátis"
            )}
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="w-full text-center text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition py-2"
        >
          Sair da conta
        </button>
      </motion.div>
    </div>
  );
}
