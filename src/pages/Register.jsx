import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";

export default function Register() {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    register: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  useEffect(() => setMounted(true), []);

  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    let tempErrors = { name: "", email: "", password: "", register: "" };
    if (!name.trim()) tempErrors.name = "Preencha seu nome";
    if (!email.trim()) tempErrors.email = "Preencha o e-mail";
    if (!password) tempErrors.password = "Preencha a senha";
    else if (password.length < 8) tempErrors.password = "A senha deve ter no mínimo 8 caracteres";

    setErrors(tempErrors);
    if (tempErrors.name || tempErrors.email || tempErrors.password) return;

    try {
      setLoading(true);
      const { data: signData, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setErrors({
          ...tempErrors,
          register: "Não foi possível criar a conta. Verifique seus dados e tente novamente.",
        });
      } else {
        const userId = signData?.user?.id;
        if (userId) {
          const trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
          await Promise.all([
            supabase.from("profiles").upsert({
              id: userId,
              name,
              birth_date: birthDate || null,
            }),
            supabase.from("subscriptions").insert({
              user_id: userId,
              status: "trialing",
              trial_ends_at: trialEndsAt,
            }),
          ]);
        }
        const hasSession = !!signData?.session;
        navigate(hasSession ? "/onboarding" : "/login");
      }
    } catch {
      setErrors({
        ...tempErrors,
        register: "Ocorreu um erro inesperado",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-14">
      <a
        href="/"
        className="absolute top-5 left-5 flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Voltar
      </a>
      <div
        className={`w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-500 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}
      >
        <div className="px-8 sm:px-10 py-8 sm:py-10">
          <div className="flex flex-col items-center gap-1 mb-6">
            <Logo size={44} />
          </div>
          <h2 className="text-xl font-semibold text-center mb-1 text-slate-800">Crie sua conta</h2>
          <p className="text-center text-slate-500 mb-6 text-sm">Comece a gerenciar seu dinheiro agora</p>

          {errors.register && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.register}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Nome</label>
              <input
                type="text"
                placeholder="Seu nome completo"
                className={`w-full px-3 py-2.5 rounded-lg bg-white text-slate-800 placeholder-slate-400 border ${
                  errors.name ? "border-red-400" : "border-slate-200"
                } focus:outline-none focus:ring-2 ${errors.name ? "focus:ring-red-500" : "focus:ring-primary-500"} focus:border-transparent text-sm`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoComplete="name"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Data de nascimento</label>
              <input
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                className="w-full px-3 py-2.5 rounded-lg bg-white text-slate-800 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">E-mail</label>
              <input
                type="email"
                placeholder="seuemail@exemplo.com"
                className={`w-full px-3 py-2.5 rounded-lg bg-white text-slate-800 placeholder-slate-400 border ${
                  errors.email ? "border-red-400" : "border-slate-200"
                } focus:outline-none focus:ring-2 ${errors.email ? "focus:ring-red-500" : "focus:ring-primary-500"} focus:border-transparent text-sm`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-slate-600 mb-1">Senha</label>
              <input
                type={showPwd ? "text" : "password"}
                placeholder="Sua senha"
                className={`w-full px-3 pr-10 py-2.5 rounded-lg bg-white text-slate-800 placeholder-slate-400 border ${
                  errors.password ? "border-red-400" : "border-slate-200"
                } focus:outline-none focus:ring-2 ${errors.password ? "focus:ring-red-500" : "focus:ring-primary-500"} focus:border-transparent text-sm`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 transition"
                aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPwd ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M4 4l16 16" strokeLinecap="round" />
                  </svg>
                )}
              </button>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full font-medium py-2.5 rounded-lg transition bg-primary-600 hover:bg-primary-700 text-white text-sm ${loading ? "opacity-80 cursor-not-allowed" : ""}`}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  Registrando...
                </span>
              ) : (
                "Registrar"
              )}
            </button>

            <div className="text-center text-sm mt-3 text-slate-500">
              Já tem conta? <a href="/login" className="text-primary-600 font-medium hover:underline">Faça login</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
