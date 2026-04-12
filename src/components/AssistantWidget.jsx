import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import jamesChatting from "../svg/james.svg";
import iconClose from "../svg/close.svg";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Olá! Sou o James, seu consultor financeiro pessoal. Posso analisar seus gastos, metas e investimentos em tempo real. O que você gostaria de saber?" },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [financialContext, setFinancialContext] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => { loadFinancialContext(); }, []);
  useEffect(() => {
    const handler = () => loadFinancialContext();
    window.addEventListener("transactions-updated", handler);
    return () => window.removeEventListener("transactions-updated", handler);
  }, []);
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, open]);

  async function loadFinancialContext() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) return;
    const user = sessionData.session.user;

    const { data: profileData } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
    const name = profileData?.name || user.email?.split("@")[0] || "você";

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const [{ data: txData }, { data: invData }, { data: goalData }] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", user.id).gte("created_at", monthStart).lte("created_at", monthEnd),
      supabase.from("investments").select("*").eq("user_id", user.id),
      supabase.from("goals").select("*").eq("user_id", user.id),
    ]);

    const transactions = txData || [];
    const expenses = transactions.filter(t => t.type === "expense");
    const incomes = transactions.filter(t => t.type === "income");
    const totalIncome = incomes.reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = expenses.reduce((s, t) => s + Number(t.amount), 0);
    const balance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    const categoryMap = {};
    expenses.forEach(t => {
      const cat = t.category || "Outros";
      categoryMap[cat] = (categoryMap[cat] || 0) + Number(t.amount);
    });
    const topCategories = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, total]) => ({ category, total }));

    const totalInvested = (invData || []).reduce((s, i) => s + Number(i.amount || 0), 0);
    const creditCardBill = expenses
      .filter(t => t.payment_method === "credit_card")
      .reduce((s, t) => s + Number(t.amount), 0);

    const monthName = now.toLocaleDateString("pt-BR", { month: "long" });

    setFinancialContext({
      name,
      totalIncome,
      totalExpense,
      balance,
      savingsRate,
      topCategories,
      totalInvested,
      investmentCount: (invData || []).length,
      goalCount: (goalData || []).length,
      creditCardBill,
      monthName,
    });
  }

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const newMessages = [...messages, { role: "user", text: trimmed }];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsTyping(false);
        setMessages(prev => [...prev, { role: "assistant", text: "Você precisa estar logado para usar o assistente." }]);
        return;
      }

      // Convert messages to Groq format (exclude initial welcome message)
      const groqMessages = newMessages
        .slice(1) // skip welcome message
        .map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));

      const res = await fetch(`${SUPABASE_URL}/functions/v1/financial-ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: groqMessages,
          financialContext: financialContext || {},
        }),
      });

      const data = await res.json();
      setIsTyping(false);

      if (!res.ok || data.error) {
        setMessages(prev => [...prev, { role: "assistant", text: "Não consegui processar sua pergunta. Tente novamente em instantes." }]);
        return;
      }

      setMessages(prev => [...prev, { role: "assistant", text: data.reply }]);
    } catch {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: "assistant", text: "Erro de conexão. Verifique sua internet e tente novamente." }]);
    }
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
      {open && (
        <div
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden"
          style={{ width: "min(384px, calc(100vw - 2rem))", height: "min(480px, calc(100dvh - 6rem))" }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                <img src={jamesChatting} alt="James" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">James</p>
                <p className="text-xs text-violet-500 font-medium">Consultor financeiro pessoal</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <img src={iconClose} alt="" className="w-4 h-4 opacity-60" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mr-1.5 mt-1">
                    <img src={jamesChatting} alt="James" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary-600 text-white rounded-br-sm"
                    : "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-bl-sm"
                }`}>
                  {renderText(msg.text)}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start items-center gap-1.5">
                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                  <img src={jamesChatting} alt="James" className="w-full h-full object-cover" />
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1 items-center h-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-1 flex gap-2 items-end flex-shrink-0">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua pergunta..."
              rows={1}
              disabled={isTyping}
              className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-60 bg-white dark:bg-slate-800 dark:text-slate-100"
              style={{ maxHeight: "80px" }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              className="w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors flex-shrink-0"
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
        className="w-14 h-14 rounded-full overflow-hidden shadow-lg hover:shadow-xl transition-all"
        title="James — Consultor financeiro"
      >
        {open ? (
          <div className="w-full h-full bg-violet-600 hover:bg-violet-700 flex items-center justify-center transition-colors">
            <img src={iconClose} alt="" className="w-5 h-5" style={{ filter: "brightness(0) invert(1)" }} />
          </div>
        ) : (
          <img src={jamesChatting} alt="James" className="w-full h-full object-cover" />
        )}
      </button>
    </div>
  );
}
