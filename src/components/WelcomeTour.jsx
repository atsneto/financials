import { useState } from "react";
import iconHello from "../svg/hello.svg";
import iconHome from "../svg/home.svg";
import iconDollar from "../svg/dollar.svg";
import iconTrophy from "../svg/trophy.svg";
import iconJames from "../assets/james.svg";
import iconOptions from "../svg/options.svg";
import iconBolt from "../svg/bolt.svg";

const STEPS = [
  {
    icon: iconHello,
    title: "Bem-vindo ao Financials!",
    description: "Vamos te mostrar rapidinho o que cada tela faz. Vai levar menos de 1 minuto!",
  },
  {
    icon: iconHome,
    title: "Dashboard",
    description: "Visão geral das suas finanças: receitas, despesas, saldo e gráficos do mês. Tudo num só lugar.",
  },
  {
    icon: iconDollar,
    title: "Transações",
    description: "Adicione, edite e acompanhe todas as suas receitas e despesas. Filtre por mês, tipo e categoria.",
  },
  {
    icon: iconTrophy,
    title: "Metas",
    description: "Defina objetivos de economia ou redução de gastos e acompanhe seu progresso ao longo do tempo.",
  },
  {
    icon: iconJames,
    title: "James — seu assistente",
    description: "Converse com o James para tirar dúvidas sobre suas finanças e receber dicas personalizadas.",
  },
  {
    icon: iconOptions,
    title: "Configurações",
    description: "Gerencie seus cartões de crédito, perfil financeiro, vale alimentação e preferências do app.",
  },
  {
    icon: iconBolt,
    title: "Tudo pronto!",
    description: "Agora é com você. Comece adicionando suas primeiras transações. Boas finanças!",
  },
];

export default function WelcomeTour({ onFinish }) {
  const [current, setCurrent] = useState(0);
  const step = STEPS[current];
  const isLast = current === STEPS.length - 1;
  const isFirst = current === 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${((current + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="px-8 py-10 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 flex items-center justify-center">
            <img src={step.icon} alt="" className="w-7 h-7 opacity-80" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
            {step.title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 pb-4">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === current
                  ? "bg-primary-500 w-6"
                  : "bg-slate-200 dark:bg-slate-700 w-1.5"
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 pb-6">
          {!isFirst ? (
            <button
              onClick={() => setCurrent((c) => c - 1)}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
            >
              Voltar
            </button>
          ) : (
            <button
              onClick={onFinish}
              className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition"
            >
              Pular
            </button>
          )}
          <button
            onClick={() => {
              if (isLast) onFinish();
              else setCurrent((c) => c + 1);
            }}
            className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition"
          >
            {isLast ? "Começar!" : "Próximo"}
          </button>
        </div>
      </div>
    </div>
  );
}
