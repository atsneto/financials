import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import Logo from "../components/Logo";
import iconCheck from "../svg/check.svg";
import iconArrowRight from "../svg/arrow-right.svg";

export default function SubscribeSuccess() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [attempts, setAttempts] = useState(0);

  // Poll subscription status — webhook may take a few seconds
  useEffect(() => {
    let timer;

    async function checkSubscription() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      const { data } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (data?.status === "active") {
        setChecking(false);
      } else {
        setAttempts((prev) => prev + 1);
        // After 10 attempts (~10s), stop polling and let them through anyway
        if (attempts >= 9) {
          setChecking(false);
        } else {
          timer = setTimeout(checkSubscription, 1000);
        }
      }
    }

    checkSubscription();
    return () => clearTimeout(timer);
  }, [attempts, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <Logo size={32} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm text-center"
      >
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
          className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto mb-6"
        >
          <img src={iconCheck} alt="" className="w-10 h-10" style={{ filter: "brightness(0) saturate(100%) invert(62%) sepia(52%) saturate(596%) hue-rotate(108deg) brightness(96%) contrast(92%)" }} />
        </motion.div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Assinatura ativada!
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
          Bem-vindo ao Financials. Seu acesso completo está pronto.
        </p>

        {checking ? (
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
              <svg className="animate-spin h-4 w-4 text-primary-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Ativando seu acesso...
            </div>
          </div>
        ) : (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => navigate("/dashboard")}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3.5 rounded-xl text-sm transition shadow-md shadow-primary-100 flex items-center justify-center gap-2"
          >
            Ir para o Dashboard
            <img src={iconArrowRight} alt="" className="w-4 h-4" style={{ filter: "brightness(0) invert(1)" }} />
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
