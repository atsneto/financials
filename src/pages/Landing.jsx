import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { supabase } from "../supabaseClient";
import Logo from "../components/Logo";
import dashboardPreview from "../assets/preview.png";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"}
      variants={fadeUp} custom={delay} className={className}>
      {children}
    </motion.div>
  );
}

const BENEFITS = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Dashboard completo",
    desc: "Saldo, receitas, despesas e saúde financeira em um painel unificado e em tempo real.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    title: "Múltiplos meios",
    desc: "Conta corrente, cartão de crédito e vale alimentação — tudo separado e organizado.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    title: "Metas e investimentos",
    desc: "Defina objetivos financeiros e acompanhe sua carteira de investimentos.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "100% seguro",
    desc: "Seus dados protegidos com autenticação de ponta. Nunca compartilhados.",
  },
];

const BANKS = ["Nubank", "Itaú", "Bradesco", "XP Investimentos", "Inter", "Santander", "Sicoob"];

const TESTIMONIALS = [
  { name: "Lucas Mendes", role: "Desenvolvedor", text: "Finalmente um app financeiro que não é confuso. Em uma semana já entendi para onde ia meu dinheiro.", avatar: "LM" },
  { name: "Ana Paula", role: "Designer", text: "O dashboard é lindo e funcional. Uso todo dia para acompanhar meus gastos e metas.", avatar: "AP" },
  { name: "Rafael Costa", role: "Empreendedor", text: "Me ajudou a economizar R$ 800 por mês só identificando gastos que eu nem sabia que tinha.", avatar: "RC" },
];

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/dashboard");
    });
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [navigate]);

  return (
    <div className="bg-white text-slate-900 overflow-x-hidden">

      {/* ── HEADER ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/90 backdrop-blur-xl shadow-sm border-b border-slate-100" : "bg-white"}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size={36} />

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#beneficios" className="hover:text-slate-900 transition">Funcionalidades</a>
            <a href="#demo" className="hover:text-slate-900 transition">Como funciona</a>
            <a href="#depoimentos" className="hover:text-slate-900 transition">Depoimentos</a>
            <a href="#precos" className="hover:text-slate-900 transition">Planos</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate("/login")}
              className="px-5 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition">
              Login
            </button>
            <button onClick={() => navigate("/register")}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm">
              Comece já!
            </button>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileOpen(v => !v)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {mobileOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-white border-b border-slate-100 px-6 pb-4 flex flex-col gap-2">
            <button onClick={() => navigate("/login")} className="w-full py-2.5 text-sm font-medium border border-slate-200 rounded-lg">Login</button>
            <button onClick={() => navigate("/register")} className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg">Comece já!</button>
          </motion.div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="pt-16 overflow-hidden" style={{ background: "linear-gradient(160deg, #eff6ff 0%, #f8faff 60%, #ffffff 100%)" }}>
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-0 grid lg:grid-cols-[1fr_1.4fr] gap-8 items-end">

          {/* Left */}
          <div className="pb-20">
            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              3 dias grátis · Sem cartão de crédito
            </motion.div>

            <motion.h1 custom={1} variants={fadeUp} initial="hidden" animate="visible"
              className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-6">
              Seu dinheiro sob controle,{" "}
              <span className="text-blue-600">sem esforço</span>
            </motion.h1>

            <motion.p custom={2} variants={fadeUp} initial="hidden" animate="visible"
              className="text-lg text-slate-500 mb-10 leading-relaxed max-w-md">
              Tudo que você precisa para organizar suas finanças pessoais sem perder tempo.
            </motion.p>

            <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible">
              <button
                onClick={() => navigate("/register")}
                className="group inline-flex items-center gap-3 px-8 py-4 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 active:translate-y-0"
              >
                Começar agora
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </motion.div>

            {/* Trust badges */}
            <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible"
              className="flex flex-wrap gap-6 mt-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Segurança dos seus dados</p>
                  <p className="text-xs text-slate-400">em primeiro lugar</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Acesse quando quiser</p>
                  <p className="text-xs text-slate-400">no celular ou computador</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right — dashboard floating */}
          <motion.div
            custom={2} variants={fadeUp} initial="hidden" animate="visible"
            className="relative hidden lg:block"
            style={{ marginRight: "calc(-1 * (100vw - 100%) / 2)" }}
          >
            <div className="relative">
              <div className="absolute -inset-6 bg-blue-300/20 rounded-3xl blur-3xl" />
              <img
                src={dashboardPreview}
                alt="Dashboard Financials"
                className="relative w-full rounded-tl-2xl shadow-2xl shadow-slate-300/70 border border-slate-200/80 border-b-0 border-r-0"
                style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopRightRadius: 0 }}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── BANKS ── */}
      <section className="border-y border-slate-100 bg-white py-10">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-8">
            Compatível com os principais bancos do Brasil
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-4">
            {BANKS.map((bank) => (
              <span key={bank} className="text-base font-bold text-slate-300 hover:text-slate-500 transition-colors cursor-default tracking-tight">
                {bank}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section id="beneficios" className="bg-white py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3">Funcionalidades</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Tudo que você precisa, nada que você não precisa</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">Desenvolvido para quem quer clareza financeira sem complicação.</p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {BENEFITS.map((b, i) => (
              <Reveal key={b.title} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="group p-7 rounded-2xl border border-slate-100 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50 transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    {b.icon}
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{b.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{b.desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEMO ── */}
      <section id="demo" className="py-28 px-6" style={{ background: "linear-gradient(160deg, #eff6ff 0%, #f8faff 100%)" }}>
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3">Como funciona</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Uma visão clara de toda sua vida financeira</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">Dashboard em tempo real com saldo, gastos, metas e muito mais.</p>
          </Reveal>

          <Reveal>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-slate-200/80 border border-slate-200">
              <img src={dashboardPreview} alt="Dashboard Financials" className="w-full" />
            </div>
          </Reveal>

          <div className="flex flex-wrap justify-center gap-3 mt-10">
            {["Dashboard completo", "Importação CSV Nubank", "Metas financeiras", "Gastos recorrentes", "Saúde financeira", "Open Finance"].map((f) => (
              <span key={f} className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 shadow-sm">
                {f}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="depoimentos" className="bg-white py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3">Depoimentos</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Quem usa, não para</h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.1}>
                <div className="p-7 rounded-2xl border border-slate-100 bg-slate-50 hover:shadow-md transition-shadow h-full">
                  <div className="flex gap-1 mb-5">
                    {[...Array(5)].map((_, j) => (
                      <svg key={j} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{t.name}</p>
                      <p className="text-xs text-slate-400">{t.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING / CTA ── */}
      <section id="precos" className="py-28 px-6" style={{ background: "linear-gradient(160deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest mb-4">Planos</p>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
              Simples e transparente
            </h2>
            <p className="text-blue-100 text-lg mb-4 max-w-md mx-auto">
              Um plano, tudo incluso.
            </p>

            {/* Price card */}
            <div className="bg-white rounded-2xl p-8 max-w-sm mx-auto mb-8 shadow-2xl shadow-blue-900/40">
              <p className="text-sm font-semibold text-slate-400 mb-2">Financials</p>
              <div className="flex items-baseline justify-center gap-1 mb-1">
                <span className="text-5xl font-extrabold text-slate-900">R$ 5</span>
                <span className="text-slate-400 text-sm">/mês</span>
              </div>
              <p className="text-xs text-slate-400 mb-6">Após 3 dias grátis · Cancele quando quiser</p>
              <ul className="text-sm text-slate-600 space-y-2.5 mb-7 text-left">
                {["Dashboard completo", "Transações ilimitadas", "Metas financeiras", "Importação CSV Nubank", "Gastos recorrentes", "Open Finance"].map(f => (
                  <li key={f} className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate("/register")}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-md shadow-blue-200 text-sm"
              >
                Criar conta gratuita
              </button>
              <p className="text-xs text-slate-400 mt-3">Sem cartão de crédito necessário</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate("/register")}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition shadow-md text-sm"
              >
                Começar agora — grátis
              </button>
              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center justify-center px-8 py-4 border border-blue-400/30 text-white font-medium rounded-xl hover:bg-white/10 transition text-sm"
              >
                Já tenho conta
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-950 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-start gap-10 mb-10">
            <div>
              <Logo size={36} className="mb-3" />
              <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                Controle financeiro pessoal simples, bonito e eficiente.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-10 text-sm">
              <div>
                <p className="font-semibold text-slate-300 mb-4">Produto</p>
                <ul className="space-y-2.5 text-slate-500">
                  <li><a href="#beneficios" className="hover:text-white transition">Funcionalidades</a></li>
                  <li><a href="#demo" className="hover:text-white transition">Como funciona</a></li>
                  <li><a href="#precos" className="hover:text-white transition">Planos</a></li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-300 mb-4">Conta</p>
                <ul className="space-y-2.5 text-slate-500">
                  <li><button onClick={() => navigate("/login")} className="hover:text-white transition">Login</button></li>
                  <li><button onClick={() => navigate("/register")} className="hover:text-white transition">Registrar</button></li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-300 mb-4">Legal</p>
                <ul className="space-y-2.5 text-slate-500">
                  <li><span className="cursor-default">Privacidade</span></li>
                  <li><span className="cursor-default">Termos de uso</span></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-slate-600">© {new Date().getFullYear()} Financials. Todos os direitos reservados.</p>
            <p className="text-xs text-slate-600">Feito com dedicação para o seu bolso.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
