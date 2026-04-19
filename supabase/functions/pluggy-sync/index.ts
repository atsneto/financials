import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLUGGY_API = "https://api.pluggy.ai";

console.info("pluggy-sync function started");

// ── Category mapping ───────────────────────────────────────────────────────────

function mapCategory(raw: string | null | undefined): string {
  if (!raw) return "Outros";
  const s = raw.trim().toLowerCase();

  // Keyword regex (highest priority)
  if (/delivery|ifood|uber\s*eat|rappi|james\s*deliv|loggi/.test(s)) return "Delivery";
  if (/mercado|supermercado|supermarket|grocery|hortifruti|atacad/.test(s)) return "Mercado";
  if (/food|alimenta|restauran|lanchon|padaria|bakery|cafe|coffee|bar |snack|meal|lunch|dinner|breakfast/.test(s)) return "Alimentação";
  if (/transport|uber|99|cabify|taxi|ônibus|onibus|metro|metrô|trem|combustiv|gasolina|gas station|estacion|pedagio|pedágio|parking|bus/.test(s)) return "Transporte";
  if (/lazer|entret|cinema|netflix|spotify|disney|gaming|jogo|game|show|teatro|concert|streaming/.test(s)) return "Lazer";
  if (/saude|saúde|health|farmácia|farmacia|pharmacy|medic|hospital|clinic|dentist|doctor/.test(s)) return "Saúde";
  if (/educaç|educac|escola|school|universid|college|curso|course|livro|book|stationery/.test(s)) return "Educação";
  if (/aluguel|rent|condom|iptu|água|agua|luz|energia|electric|internet|telefon|phone|moradia|housing/.test(s)) return "Moradia";
  if (/roupa|vestuário|vestuario|cloth|fashion|shoe|sapato|calçado|calcado|moda/.test(s)) return "Vestuário";

  // Exact EN dictionary
  const enMap: Record<string, string> = {
    "food and beverage": "Alimentação",
    "food & beverage": "Alimentação",
    "restaurants": "Alimentação",
    "groceries": "Mercado",
    "supermarkets": "Mercado",
    "transportation": "Transporte",
    "transport": "Transporte",
    "travel": "Transporte",
    "entertainment": "Lazer",
    "leisure": "Lazer",
    "health": "Saúde",
    "health and beauty": "Saúde",
    "education": "Educação",
    "home": "Moradia",
    "housing": "Moradia",
    "utilities": "Moradia",
    "clothing": "Vestuário",
    "shopping": "Outros",
    "services": "Outros",
    "finance": "Outros",
    "transfers": "Outros",
    "other": "Outros",
  };
  if (enMap[s]) return enMap[s];

  // Exact PT dictionary
  const ptMap: Record<string, string> = {
    "alimentação": "Alimentação",
    "restaurantes": "Alimentação",
    "delivery": "Delivery",
    "mercado": "Mercado",
    "supermercado": "Mercado",
    "transporte": "Transporte",
    "lazer": "Lazer",
    "entretenimento": "Lazer",
    "saúde": "Saúde",
    "educação": "Educação",
    "moradia": "Moradia",
    "vestuário": "Vestuário",
    "outros": "Outros",
  };
  if (ptMap[s]) return ptMap[s];

  return "Outros";
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getPluggyApiKey(): Promise<string> {
  const clientId = Deno.env.get("PLUGGY_CLIENT_ID");
  const clientSecret = Deno.env.get("PLUGGY_CLIENT_SECRET");

  const res = await fetch(`${PLUGGY_API}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });

  if (!res.ok) throw new Error("Pluggy auth failed");
  const { apiKey } = await res.json() as any;
  return apiKey;
}

function getAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

// ── Main handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verificar usuário
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { action, itemId, creditCardId, bankId } = await req.json() as any;
    const apiKey = await getPluggyApiKey();
    const pluggyHeaders = { "X-API-KEY": apiKey };
    const admin = getAdminClient();

    // ── DELETE ──────────────────────────────────────────────
    if (action === "delete") {
      await fetch(`${PLUGGY_API}/items/${itemId}`, {
        method: "DELETE",
        headers: pluggyHeaders,
      });

      await admin
        .from("pluggy_connections")
        .delete()
        .eq("item_id", itemId)
        .eq("user_id", user.id);

      await admin
        .from("transactions")
        .delete()
        .eq("user_id", user.id)
        .eq("source", `pluggy:${itemId}`);

      await admin
        .from("credit_card_transactions")
        .delete()
        .eq("user_id", user.id)
        .eq("source", `pluggy:${itemId}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── SYNC ───────────────────────────────────────────────
    // 1. Buscar dados do item
    const itemRes = await fetch(`${PLUGGY_API}/items/${itemId}`, {
      headers: pluggyHeaders,
    });
    if (!itemRes.ok) throw new Error("Failed to fetch item from Pluggy");
    const item: any = await itemRes.json();

    // 2. Salvar/atualizar conexão
    const connectionPayload: Record<string, any> = {
      user_id: user.id,
      item_id: itemId,
      connector_name: item.connector?.name || "Banco",
      connector_logo: item.connector?.imageUrl || null,
      status: item.status || "UPDATED",
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (creditCardId) connectionPayload.credit_card_id = creditCardId;
    if (bankId) connectionPayload.bank_id = bankId;

    await admin.from("pluggy_connections").upsert(connectionPayload, { onConflict: "item_id" });

    // Resolver credit_card_id: usa o passado na requisição ou busca da conexão existente
    let resolvedCreditCardId: string | null = creditCardId || null;
    let resolvedBankId: string | null = bankId || null;
    if (!resolvedCreditCardId || !resolvedBankId) {
      const { data: connRow } = await admin
        .from("pluggy_connections")
        .select("credit_card_id, bank_id")
        .eq("item_id", itemId)
        .single();
      if (!resolvedCreditCardId) resolvedCreditCardId = connRow?.credit_card_id || null;
      if (!resolvedBankId) resolvedBankId = connRow?.bank_id || null;
    }

    // Se temos bank_id mas não credit_card_id, buscar automaticamente o cartão do banco
    if (!resolvedCreditCardId && resolvedBankId) {
      const { data: matchingCards } = await admin
        .from("credit_cards")
        .select("id")
        .eq("user_id", user.id)
        .eq("bank_id", resolvedBankId);
      if (matchingCards && matchingCards.length === 1) {
        resolvedCreditCardId = matchingCards[0].id;
        // Salvar na conexão para futuras sincronizações
        await admin
          .from("pluggy_connections")
          .update({ credit_card_id: resolvedCreditCardId })
          .eq("item_id", itemId);
      }
    }

    // 3. Buscar contas
    const accountsRes = await fetch(
      `${PLUGGY_API}/accounts?itemId=${itemId}`,
      { headers: pluggyHeaders }
    );
    const accountsData: any = await accountsRes.json();
    const accounts = accountsData.results || [];

    // 4. Buscar transações de cada conta
    let totalImported = 0;
    let totalCreditCardImported = 0;

    for (const account of accounts) {
      const isCreditCard = account.type === "CREDIT";

      const txRes = await fetch(
        `${PLUGGY_API}/transactions?accountId=${account.id}&pageSize=500`,
        { headers: pluggyHeaders }
      );
      const txData: any = await txRes.json();
      const txs = txData.results || [];

      if (isCreditCard) {
        // ── Cartão de Crédito ──────────────────────────────
        const [{ data: existingTx }, { data: existingCc }] = await Promise.all([
          admin
            .from("transactions")
            .select("external_id, credit_card_id")
            .eq("user_id", user.id)
            .eq("source", `pluggy:${itemId}`),
          resolvedCreditCardId
            ? admin
                .from("credit_card_transactions")
                .select("external_id, credit_card_id")
                .eq("user_id", user.id)
                .eq("source", `pluggy:${itemId}`)
            : Promise.resolve({ data: [] }),
        ]);

        const existingTxMap = new Map((existingTx || []).map((e: any) => [e.external_id, e.credit_card_id]));
        const existingCcIds = new Set((existingCc || []).map((e: any) => e.external_id));

        const mappedTxs = txs.map((tx: any) => ({
          user_id: user.id,
          title: tx.description || "Compra Cartão Open Finance",
          amount: Math.abs(tx.amount),
          type: "expense",
          category: mapCategory(tx.category),
          payment_method: "credit_card",
          credit_card_id: resolvedCreditCardId || null,
          merchant: tx.merchantName || null,
          created_at: tx.date,
          source: `pluggy:${itemId}`,
          external_id: tx.id,
        }));

        const newForTransactions = mappedTxs.filter((tx: any) => !existingTxMap.has(tx.external_id));
        const newForCc = resolvedCreditCardId
          ? mappedTxs.filter((tx: any) => !existingCcIds.has(tx.external_id))
          : [];

        if (newForTransactions.length > 0) {
          const { error: txErr } = await admin.from("transactions").insert(newForTransactions);
          if (txErr) console.error("Error inserting credit card transactions:", txErr);
          else totalCreditCardImported += newForTransactions.length;
        }

        // Atualizar credit_card_id nas transações existentes que estão sem cartão vinculado
        if (resolvedCreditCardId) {
          const toUpdate = mappedTxs.filter(
            (tx: any) => existingTxMap.has(tx.external_id) && !existingTxMap.get(tx.external_id)
          );
          if (toUpdate.length > 0) {
            const externalIds = toUpdate.map((tx: any) => tx.external_id);
            await admin
              .from("transactions")
              .update({ credit_card_id: resolvedCreditCardId })
              .eq("user_id", user.id)
              .eq("source", `pluggy:${itemId}`)
              .in("external_id", externalIds);
          }
        }

        if (newForCc.length > 0) {
          const ccRows = newForCc.map((tx: any) => ({
            user_id: tx.user_id,
            credit_card_id: resolvedCreditCardId,
            title: tx.title,
            amount: tx.amount,
            merchant: tx.merchant,
            category: tx.category,
            created_at: tx.created_at,
            source: tx.source,
            external_id: tx.external_id,
          }));
          const { error: ccErr } = await admin.from("credit_card_transactions").insert(ccRows);
          if (ccErr) console.error("Error inserting into credit_card_transactions:", ccErr);
        }

        // Atualizar credit_card_id nas credit_card_transactions existentes sem cartão
        if (resolvedCreditCardId && existingCc) {
          const ccToUpdate = (existingCc as any[]).filter((e: any) => !e.credit_card_id).map((e: any) => e.external_id);
          if (ccToUpdate.length > 0) {
            await admin
              .from("credit_card_transactions")
              .update({ credit_card_id: resolvedCreditCardId })
              .eq("user_id", user.id)
              .eq("source", `pluggy:${itemId}`)
              .in("external_id", ccToUpdate);
          }
        }
      } else {
        // ── Conta Corrente / Poupança ──────────────────────
        const { data: existing } = await admin
          .from("transactions")
          .select("external_id")
          .eq("user_id", user.id)
          .eq("source", `pluggy:${itemId}`);

        const existingIds = new Set(
          (existing || []).map((e: any) => e.external_id)
        );

        const newTxs = txs
          .filter((tx: any) => !existingIds.has(tx.id))
          .map((tx: any) => ({
            user_id: user.id,
            title: tx.description || "Transação Open Finance",
            amount: Math.abs(tx.amount),
            type: tx.type === "CREDIT" ? "income" : "expense",
            category: mapCategory(tx.category),
            payment_method: "debit_pix",
            merchant: tx.merchantName || null,
            created_at: tx.date,
            source: `pluggy:${itemId}`,
            external_id: tx.id,
          }));

        if (newTxs.length > 0) {
          const { error: txErr } = await admin.from("transactions").insert(newTxs);
          if (txErr) console.error("Error inserting transactions:", txErr);
          else totalImported += newTxs.length;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        accounts: accounts.length,
        transactionsImported: totalImported,
        creditCardTransactionsImported: totalCreditCardImported,
        connector: {
          name: item.connector?.name,
          logo: item.connector?.imageUrl,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("pluggy-sync error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
