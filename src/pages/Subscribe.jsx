import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import Logo from "../components/Logo";

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

export default function Subscribe() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckout() {
    setLoading(true);
    setError("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke(
        "create-checkout-session",
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (fnError || !data?.url) {
        throw new Error("Não foi possível iniciar o pagamento.");
      }

      const allowedOrigins = ["https://checkout.stripe.com"];
      const redirectUrl = new URL(data.url);
      if (!allowedOrigins.some(o => data.url.startsWith(o))) {
        throw new Error("URL de redirecionamento inválida.");
      }

      window.location.href = redirectUrl.href;
    } catch (err) {
      setError(err.message || "Erro inesperado. Tente novamente.");
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 py-16">
      {/* Logo */}
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
        {/* Header */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-3 py-1 text-xs font-semibold mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Período de teste encerrado
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Seu teste gratuito expirou
          </h1>
          <p className="text-slate-500 text-sm">
            Assine por apenas <span className="font-semibold text-slate-800">R$ 5 por mês</span> e continue com acesso completo às suas finanças.
          </p>
        </div>

        {/* Pricing card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-5">
          {/* Top accent */}
          <div className="h-1 bg-gradient-to-r from-primary-500 to-blue-400" />

          <div className="p-7">
            {/* Price */}
            <div className="flex items-end gap-1 mb-1">
              <span className="text-5xl font-bold text-slate-900 leading-none">R$ 5</span>
              <span className="text-slate-400 text-sm mb-1.5">/mês</span>
            </div>
            <p className="text-xs text-slate-400 mb-6">Cancele a qualquer momento</p>

            {/* Features */}
            <ul className="space-y-3 mb-7">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                  <svg
                    className="w-4 h-4 text-primary-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            {/* Error */}
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3.5 rounded-xl text-sm transition shadow-md shadow-primary-100 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Redirecionando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Assinar por R$ 5/mês
                </>
              )}
            </button>
          </div>

          {/* Footer note */}
          <div className="px-7 pb-5 flex items-center justify-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Pagamento seguro via Stripe
            </span>
            <span>·</span>
            <span>Cancele quando quiser</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition py-2"
        >
          Sair da conta
        </button>
      </motion.div>
    </div>
  );
}
