import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";

function fmt(n: number): string {
  return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pct(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const loadStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const loadEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59).toISOString();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const [
      { data: allTxData },
      { data: cardData },
      { data: goalData },
      { data: profileData },
      { data: invData },
    ] = await Promise.all([
      admin.from("transactions").select("*").eq("user_id", user.id).gte("created_at", loadStart).lte("created_at", loadEnd),
      admin.from("credit_cards").select("*").eq("user_id", user.id),
      admin.from("goals").select("*").eq("user_id", user.id),
      admin.from("profiles").select("name").eq("id", user.id).maybeSingle(),
      admin.from("investments").select("*").eq("user_id", user.id),
    ]);

    const name = profileData?.name || user.email?.split("@")[0] || "você";

    // ── Billing cycle helper ──────────────────────────────────────────────────
    function effectiveDate(tx: any): Date {
      if (tx.payment_method !== "credit_card" || !tx.credit_card_id) return new Date(tx.created_at);
      const card = (cardData || []).find((c: any) => c.id === tx.credit_card_id);
      const closingDay = card?.closing_day ? parseInt(card.closing_day, 10) : null;
      if (!closingDay) return new Date(tx.created_at);
      const d = new Date(tx.created_at);
      if (d.getDate() > closingDay) return new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return d;
    }

    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth();
    const lastMonthNorm = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    const allTxs = allTxData || [];

    // ── This month (by billing cycle) ─────────────────────────────────────────
    const thisTxs = allTxs.filter((t: any) => {
      const d = effectiveDate(t);
      return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
    });
    const thisExpenses = thisTxs.filter((t: any) => t.type === "expense");
    const thisIncomes = thisTxs.filter((t: any) => t.type === "income");
    const totalExpense = thisExpenses.reduce((s: number, t: any) => s + Number(t.amount), 0);
    const totalIncome = thisIncomes.reduce((s: number, t: any) => s + Number(t.amount), 0);
    const balance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    // ── Last month (by billing cycle) ─────────────────────────────────────────
    const lastExpenses = allTxs.filter((t: any) => {
      const d = effectiveDate(t);
      return d.getFullYear() === lastYear && d.getMonth() === lastMonthNorm && t.type === "expense";
    });
    const lastMonthSpent = lastExpenses.reduce((s: number, t: any) => s + Number(t.amount), 0);
    const vsLastMonth = lastMonthSpent > 0 ? ((totalExpense - lastMonthSpent) / lastMonthSpent) * 100 : 0;

    // ── Today ─────────────────────────────────────────────────────────────────
    const todayExpenses = thisExpenses.filter((t: any) => t.created_at >= todayStart);
    const todaySpent = todayExpenses.reduce((s: number, t: any) => s + Number(t.amount), 0);
    const todayCount = todayExpenses.length;

    // ── Payment methods ───────────────────────────────────────────────────────
    const creditCardSpent = thisExpenses.filter((t: any) => t.payment_method === "credit_card").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const debitPixSpent = thisExpenses.filter((t: any) => t.payment_method === "debit_pix").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const mealVoucherSpent = thisExpenses.filter((t: any) => t.payment_method === "meal_voucher").reduce((s: number, t: any) => s + Number(t.amount), 0);

    const lastCreditCardSpent = lastExpenses.filter((t: any) => t.payment_method === "credit_card").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const lastMealVoucherSpent = lastExpenses.filter((t: any) => t.payment_method === "meal_voucher").reduce((s: number, t: any) => s + Number(t.amount), 0);

    // ── Categories ────────────────────────────────────────────────────────────
    const catMap: Record<string, number> = {};
    thisExpenses.forEach((t: any) => {
      const cat = t.category || "Outros";
      catMap[cat] = (catMap[cat] || 0) + Number(t.amount);
    });
    const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topCategory = topCats[0]?.[0] || null;
    const topCategoryAmount = topCats[0]?.[1] || 0;

    const lastCatMap: Record<string, number> = {};
    lastExpenses.forEach((t: any) => {
      const cat = t.category || "Outros";
      lastCatMap[cat] = (lastCatMap[cat] || 0) + Number(t.amount);
    });

    // ── Date helpers ──────────────────────────────────────────────────────────
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const daysLeft = daysInMonth - dayOfMonth;
    const dailyAvgSpend = dayOfMonth > 0 ? totalExpense / dayOfMonth : 0;
    const projectedMonthEnd = dailyAvgSpend * daysInMonth;
    const mealVoucherDailyAvg = dayOfMonth > 0 && mealVoucherSpent > 0 ? mealVoucherSpent / dayOfMonth : 0;
    const mealVoucherProjected = mealVoucherDailyAvg * daysInMonth;

    // ── Cards ─────────────────────────────────────────────────────────────────
    const cards = (cardData || []).map((c: any) => {
      const spent = thisExpenses
        .filter((t: any) => t.payment_method === "credit_card" && t.credit_card_id === c.id)
        .reduce((s: number, t: any) => s + Number(t.amount), 0);
      const limit = c.credit_limit ? Number(c.credit_limit) : null;
      return {
        name: c.name,
        last4: c.last_four || null,
        limit,
        closingDay: c.closing_day || null,
        dueDay: c.due_day || null,
        spentThisMonth: spent,
        usagePercent: limit ? Math.round((spent / limit) * 100) : null,
      };
    });

    // ── Goals ─────────────────────────────────────────────────────────────────
    const goals = (goalData || []).map((g: any) => ({
      title: g.title,
      target: Number(g.target_amount),
      current: Number(g.current_amount || 0),
      deadline: g.deadline,
      progress: g.target_amount > 0 ? Math.round((Number(g.current_amount || 0) / Number(g.target_amount)) * 100) : 0,
    }));

    // ── Investments ───────────────────────────────────────────────────────────
    const totalInvested = (invData || []).reduce((s: number, i: any) => s + Number(i.amount || 0), 0);

    // ── Stats to return ───────────────────────────────────────────────────────
    const stats = {
      todaySpent,
      todayCount,
      totalExpense,
      totalIncome,
      balance,
      savingsRate: Math.round(savingsRate * 10) / 10,
      lastMonthSpent,
      vsLastMonth: Math.round(vsLastMonth * 10) / 10,
      topCategory,
      topCategoryAmount,
      creditCardSpent,
      debitPixSpent,
      mealVoucherSpent,
      daysLeft,
      daysInMonth,
      dayOfMonth,
      projectedMonthEnd,
      mealVoucherProjected,
      totalInvested,
    };

    // ── Build AI prompt ───────────────────────────────────────────────────────
    const monthName = now.toLocaleDateString("pt-BR", { month: "long" });
    const todayStr = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

    let prompt = `Você é James, consultor financeiro de ${name}. Hoje é ${todayStr} (dia ${dayOfMonth}/${daysInMonth}, restam ${daysLeft} dias no mês).

MÊS ATUAL (${monthName}):
- Gasto: ${fmt(totalExpense)} | Receita: ${fmt(totalIncome)} | Saldo: ${fmt(balance)}
- Taxa de poupança: ${savingsRate.toFixed(1)}%
- Projeção fim do mês: ${fmt(projectedMonthEnd)}
- Variação vs mês anterior: ${pct(vsLastMonth)} (anterior: ${fmt(lastMonthSpent)})

HOJE:
- Gasto hoje: ${fmt(todaySpent)} (${todayCount} transação${todayCount !== 1 ? "ões" : ""})

MEIOS DE PAGAMENTO:
- Cartão de crédito: ${fmt(creditCardSpent)}${lastCreditCardSpent > 0 ? ` (${pct(((creditCardSpent - lastCreditCardSpent) / lastCreditCardSpent) * 100)} vs mês anterior)` : ""}
- Débito/PIX: ${fmt(debitPixSpent)}
- Vale alimentação: ${fmt(mealVoucherSpent)}${mealVoucherProjected > 0 ? ` (projeção: ${fmt(mealVoucherProjected)}/mês)` : ""}

TOP CATEGORIAS:
${topCats.map(([cat, val]) => {
  const lastVal = lastCatMap[cat] || 0;
  const diff = lastVal > 0 ? ` (${pct(((val - lastVal) / lastVal) * 100)} vs anterior)` : "";
  return `- ${cat}: ${fmt(val)}${diff}`;
}).join("\n") || "- Sem dados"}`;

    if (cards.length > 0) {
      prompt += `\n\nCARTÕES:
${cards.map(c => `- ${c.name}${c.last4 ? ` (**${c.last4})` : ""}: ${fmt(c.spentThisMonth)}${c.limit ? ` / limite ${fmt(c.limit)} (${c.usagePercent}%)` : ""}${c.closingDay ? `, fecha dia ${c.closingDay}` : ""}${c.dueDay ? `, vence dia ${c.dueDay}` : ""}`).join("\n")}`;
    }

    if (goals.length > 0) {
      prompt += `\n\nMETAS:
${goals.map(g => `- ${g.title}: ${fmt(g.current)} / ${fmt(g.target)} (${g.progress}%)${g.deadline ? `, prazo: ${g.deadline}` : ""}`).join("\n")}`;
    }

    if (totalInvested > 0) {
      prompt += `\n\nINVESTIMENTOS: ${fmt(totalInvested)} investidos`;
    }

    prompt += `

Responda SOMENTE com JSON válido (sem markdown):
{
  "insight": "1 frase direta sobre o padrão do mês com números reais",
  "dailySummary": "1 frase sobre o dia de hoje, específica",
  "alerts": [
    { "severity": "high|medium|low", "message": "alerta com número real" }
  ],
  "actions": [
    {
      "type": "reduce|save|invest|control|pay_debt|positive",
      "title": "ação concreta",
      "reason": "justificativa com dado real",
      "value": "valor ou % relevante, ou null",
      "link": "/goals|/transactions|/credit-card|/investiments|null",
      "linkLabel": "texto do botão de ação, ou null"
    }
  ],
  "paymentTips": {
    "credit_card": "insight sobre cartão ou null",
    "debit_pix": "insight sobre débito/pix ou null",
    "meal_voucher": "previsão de duração e uso, ou null se sem uso"
  }
}

Regras: máx 3 alertas, máx 4 ações. Use números reais. Seja direto. meal_voucher null se mealVoucherSpent=0.`;

    // ── Groq call ─────────────────────────────────────────────────────────────
    const groqRes = await fetch(GROQ_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 900,
      }),
    });

    if (!groqRes.ok) throw new Error(`Groq error: ${await groqRes.text()}`);

    const groqData = await groqRes.json();
    const raw = groqData.choices?.[0]?.message?.content?.trim() || "{}";

    let ai: any = {};
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      ai = match ? JSON.parse(match[0]) : {};
    } catch { ai = {}; }

    return new Response(
      JSON.stringify({
        stats,
        insight: ai.insight || null,
        dailySummary: ai.dailySummary || null,
        alerts: Array.isArray(ai.alerts) ? ai.alerts : [],
        actions: Array.isArray(ai.actions) ? ai.actions : [],
        paymentTips: ai.paymentTips || {},
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("financial-ai-insights error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
