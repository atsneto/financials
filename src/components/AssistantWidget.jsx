import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Olá! Sou seu assistente financeiro. Posso te ajudar a entender seus gastos, metas e investimentos. O que você gostaria de saber?" },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [userData, setUserData] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => { loadUserData(); }, []);
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, open]);

  async function loadUserData() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) return;
    const user = sessionData.session.user;
    const { data: profileData } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
    const name = profileData?.name || user.email?.split("@")[0] || "você";

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const [{ data: txData }, { data: invData }, { data: goalData }, { data: financialProfile }, { data: recurringData }] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", user.id).gte("created_at", monthStart).lte("created_at", monthEnd),
      supabase.from("investments").select("*").eq("user_id", user.id),
      supabase.from("financial_goals").select("*").eq("user_id", user.id),
      supabase.from("financial_profile").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("recurring_expenses").select("*").eq("user_id", user.id).eq("active", true),
    ]);

    setUserData({ name, transactions: txData || [], investments: invData || [], goals: goalData || [], profile: financialProfile || null, recurring: recurringData || [] });
  }

  const quickPrompts = [
    "Como estão meus gastos?",
    "Qual minha maior despesa?",
    "Resumo dos investimentos",
    "Minhas metas financeiras",
    "Dicas para economizar",
    "Estou dentro do orçamento?",
  ];

  function generateResponse(message) {
    if (!userData) return "Ainda estou carregando seus dados, aguarde um momento...";

    const msg = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const { transactions, investments, goals, profile, recurring, name } = userData;

    const expenses = transactions.filter(t => t.type === "expense");
    const incomes = transactions.filter(t => t.type === "income");
    const totalExpense = expenses.reduce((s, t) => s + Number(t.amount), 0);
    const totalIncome = incomes.reduce((s, t) => s + Number(t.amount), 0);
    const balance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    const categoryMap = {};
    expenses.forEach(t => {
      const cat = t.category || "Outros";
      categoryMap[cat] = (categoryMap[cat] || 0) + Number(t.amount);
    });
    const topCats = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);

    const totalInvested = investments.reduce((s, inv) => s + Number(inv.amount || 0), 0);
    const avgReturn = investments.length > 0
      ? investments.reduce((s, inv) => s + Number(inv.expected_return || 0), 0) / investments.length
      : 0;

    const monthName = new Date().toLocaleDateString("pt-BR", { month: "long" });
    const fmt = v => `R$ ${Number(v).toFixed(2)}`;

    if (msg.match(/gast|despesa|despesas|quanto gastei/)) {
      const parts = [`Em ${monthName}, você gastou **${fmt(totalExpense)}** no total.`];
      if (topCats.length > 0) parts.push(`Sua maior despesa foi **${topCats[0][0]}** com ${fmt(topCats[0][1])}.`);
      parts.push(balance >= 0 ? `Saldo positivo: **${fmt(balance)}**. Continue assim!` : `Atenção: saldo negativo em **${fmt(Math.abs(balance))}**. Revise seus gastos.`);
      return parts.join(" ");
    }

    if (msg.match(/maior despesa|maior gasto|categoria/)) {
      if (topCats.length === 0) return "Você ainda não tem despesas registradas este mês.";
      const top3 = topCats.slice(0, 3).map(([cat, val], i) => `${i + 1}. **${cat}**: ${fmt(val)}`).join("\n");
      const pct = totalExpense > 0 ? ((topCats.slice(0, 3).reduce((s, [, v]) => s + v, 0) / totalExpense) * 100).toFixed(0) : 0;
      return `Suas maiores categorias de gasto este mês:\n${top3}\n\nJuntas representam **${pct}%** dos seus gastos.`;
    }

    if (msg.match(/investiment|carteira|rendimento|rentabilidade/)) {
      if (investments.length === 0) return "Você ainda não tem investimentos cadastrados. Acesse a página de Investimentos para começar!";
      const best = investments.reduce((a, b) => Number(a.expected_return) > Number(b.expected_return) ? a : b);
      return `Você tem **${investments.length} investimento(s)** totalizando **${fmt(totalInvested)}**. Retorno médio esperado: **${avgReturn.toFixed(2)}% a.a.** Melhor retorno: **${best.name}** com ${best.expected_return}% a.a.`;
    }

    if (msg.match(/meta|objetivo|poupar|poupanca/)) {
      if (goals.length === 0) return "Você ainda não tem metas financeiras cadastradas. Acesse a página de Metas para criar uma!";
      const goalLines = goals.map(g =>
        g.type === "save"
          ? `• Economizar **${fmt(g.target_amount)}** — ${g.description}`
          : `• Reduzir gastos — ${g.description}`
      );
      return `Suas metas financeiras:\n${goalLines.join("\n")}`;
    }

    if (msg.match(/dica|economizar|economias|sugestao|conselho/)) {
      const tips = [];
      if (savingsRate < 10) tips.push("Tente poupar pelo menos 10–20% da sua renda mensal.");
      if (topCats.length > 0 && totalExpense > 0 && topCats[0][1] / totalExpense > 0.4) tips.push(`Sua maior categoria (${topCats[0][0]}) representa mais de 40% dos gastos — considere reduzir.`);
      if (investments.length === 0) tips.push("Comece a investir mesmo que seja pouco. Juros compostos fazem a diferença a longo prazo.");
      if (recurring.length > 0) {
        const totalRecurring = recurring.reduce((s, r) => s + Number(r.amount || 0), 0);
        if (totalIncome > 0 && totalRecurring > totalIncome * 0.5) tips.push(`Suas despesas fixas (${fmt(totalRecurring)}) são mais de 50% da renda. Revise assinaturas e contratos.`);
      }
      if (tips.length === 0) tips.push("Você está no caminho certo! Continue monitorando seus gastos e mantendo a disciplina financeira.");
      return tips.map((t, i) => `${i + 1}. ${t}`).join("\n");
    }

    if (msg.match(/orcamento|limite|margem|dentro do/)) {
      if (!profile || !Number(profile.monthly_income)) return "Configure sua renda no perfil financeiro para eu analisar seu orçamento.";
      const monthlyIncome = Number(profile.monthly_income);
      const spendingLimit = Number(profile.spending_limit || 0);
      const parts = [`Sua renda cadastrada é **${fmt(monthlyIncome)}**.`, `Você gastou **${fmt(totalExpense)}** este mês (${((totalExpense / monthlyIncome) * 100).toFixed(0)}% da renda).`];
      if (spendingLimit > 0) parts.push(totalExpense <= spendingLimit ? `Dentro do limite de ${fmt(spendingLimit)}.` : `Você ultrapassou seu limite de ${fmt(spendingLimit)} em ${fmt(totalExpense - spendingLimit)}.`);
      return parts.join(" ");
    }

    if (msg.match(/saldo|quanto tenho|sobrou/)) {
      const parts = [`Seu saldo este mês é **${fmt(balance)}**.`, `Receitas: ${fmt(totalIncome)} | Despesas: ${fmt(totalExpense)}`];
      if (savingsRate > 0) parts.push(`Taxa de poupança: **${savingsRate.toFixed(1)}%**.`);
      return parts.join(" ");
    }

    if (msg.match(/receita|renda|ganhei|salario/)) {
      if (totalIncome === 0) return "Não há receitas registradas este mês ainda.";
      return `Você registrou **${fmt(totalIncome)}** em receitas este mês com **${incomes.length} lançamento(s)**.`;
    }

    if (msg.match(/ola|oi|tudo|como vai|bom dia|boa tarde|boa noite/)) {
      return `Olá, ${name.split(" ")[0]}! Estou aqui para ajudar com suas finanças. Pode me perguntar sobre seus gastos, investimentos, metas ou pedir dicas para economizar!`;
    }

    return `Não entendi muito bem, mas posso te ajudar com:\n• Seus **gastos e receitas** do mês\n• **Investimentos** e rentabilidade\n• **Metas financeiras**\n• **Dicas** para economizar\n• Análise do seu **orçamento**\n\nUse os atalhos abaixo ou reformule a pergunta!`;
  }

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages(prev => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setIsTyping(true);
    await new Promise(r => setTimeout(r, 700));
    const response = generateResponse(trimmed);
    setIsTyping(false);
    setMessages(prev => [...prev, { role: "assistant", text: response }]);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  function renderText(text) {
    return text.split("\n").map((line, i, arr) => (
      <span key={i}>
        {line.split(/\*\*([^*]+)\*\*/g).map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
        {i < arr.length - 1 && <br />}
      </span>
    ));
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat popup */}
      {open && (
        <div
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          style={{ width: "min(384px, calc(100vw - 2rem))", height: "min(480px, calc(100dvh - 6rem))" }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
                  <circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="10" r="1.2"/><circle cx="16" cy="10" r="1.2"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Assistente Financeiro</p>
                <p className="text-xs text-slate-400">Online</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mr-1.5 mt-1">
                    <svg className="w-3.5 h-3.5 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
                      <circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="10" r="1.2"/><circle cx="16" cy="10" r="1.2"/>
                    </svg>
                  </div>
                )}
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary-600 text-white rounded-br-sm"
                    : "bg-slate-50 border border-slate-200 text-slate-700 rounded-bl-sm"
                }`}>
                  {renderText(msg.text)}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
                    <circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="10" r="1.2"/><circle cx="16" cy="10" r="1.2"/>
                  </svg>
                </div>
                <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1 items-center h-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          <div className="px-3 pt-2 pb-1 flex flex-wrap gap-1.5 flex-shrink-0">
            {quickPrompts.map(p => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                className="flex-shrink-0 text-xs border border-slate-200 text-slate-500 px-2.5 py-1 rounded-full hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition-colors whitespace-nowrap"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-1 flex gap-2 items-end flex-shrink-0">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua pergunta..."
              rows={1}
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              style={{ maxHeight: "80px" }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
              className="w-8 h-8 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
        title="Assistente Financeiro"
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
            <circle cx="8" cy="10" r="1.2"/>
            <circle cx="12" cy="10" r="1.2"/>
            <circle cx="16" cy="10" r="1.2"/>
          </svg>
        )}
      </button>
    </div>
  );
}
