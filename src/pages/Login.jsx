import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import iconChevronLeft from "../svg/chevron-left.svg";
import iconEye from "../svg/eye.svg";
import iconEyeAlt from "../svg/eye-alt.svg";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "", login: "" });
  const [showPwd, setShowPwd] = useState(false);
  const navigate = useNavigate();

  useEffect(() => setMounted(true), []);

  async function handleSubmit(e) {
    e.preventDefault();

    let tempErrors = { email: "", password: "", login: "" };
    if (!email) tempErrors.email = "Preencha o e-mail";
    if (!password) tempErrors.password = "Preencha a senha";

    setErrors(tempErrors);
    if (tempErrors.email || tempErrors.password) return;

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrors({ ...tempErrors, login: "E-mail ou senha incorretos" });
      } else {
        navigate("/dashboard");
      }
    } catch {
      setErrors({ ...tempErrors, login: "Ocorreu um erro inesperado" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-6 py-14">
      <a
        href="/"
        className="absolute top-5 left-5 flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-sm transition"
      >
        <img src={iconChevronLeft} alt="" className="h-4 w-4" style={{ filter: "brightness(0) saturate(100%) opacity(0.5)" }} />
        Voltar
      </a>
      <div
        className={`w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm transition-all duration-500 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}
      >
        <div className="px-8 sm:px-10 py-8 sm:py-10">
          <div className="flex flex-col items-center gap-1 mb-6">
            <Logo size={44} />
          </div>
          <h2 className="text-xl font-semibold text-center mb-1 text-slate-800 dark:text-slate-100">Bem-vindo de volta</h2>
          <p className="text-center text-slate-500 dark:text-slate-400 mb-6 text-sm">Acesse sua conta e cuide do seu dinheiro</p>

          {errors.login && (
            <div className="mb-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {errors.login}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">E-mail</label>
              <input
                type="email"
                placeholder="seuemail@exemplo.com"
                className={`w-full px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border ${
                  errors.email ? "border-red-400" : "border-slate-200 dark:border-slate-700"
                } focus:outline-none focus:ring-2 ${errors.email ? "focus:ring-red-500" : "focus:ring-primary-500"} focus:border-transparent text-sm`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Senha</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder="Sua senha"
                  className={`w-full px-3 pr-10 py-2.5 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border ${
                    errors.password ? "border-red-400" : "border-slate-200 dark:border-slate-700"
                  } focus:outline-none focus:ring-2 ${errors.password ? "focus:ring-red-500" : "focus:ring-primary-500"} focus:border-transparent text-sm`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition"
                  aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPwd ? (
                    <img src={iconEye} alt="" className="h-4 w-4" style={{ filter: "brightness(0) saturate(100%) opacity(0.5)" }} />
                  ) : (
                    <img src={iconEyeAlt} alt="" className="h-4 w-4" style={{ filter: "brightness(0) saturate(100%) opacity(0.5)" }} />
                  )}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <input type="checkbox" className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-primary-600 focus:ring-primary-500" />
                Lembrar de mim
              </label>
              <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">Esqueci minha senha</a>
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
                  Entrando...
                </span>
              ) : (
                "Entrar"
              )}
            </button>

            <div className="text-center text-sm mt-3 text-slate-500 dark:text-slate-400">
              Não tem conta? <a href="/register" className="text-primary-600 font-medium hover:underline">Registre-se</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
