import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLUGGY_API = "https://api.pluggy.ai";

console.info("pluggy-sync function started");

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

    const { action, itemId } = await req.json() as any;
    const apiKey = await getPluggyApiKey();
    const pluggyHeaders = { "X-API-KEY": apiKey };
    const admin = getAdminClient();

    // ── DELETE ──────────────────────────────────────────────
    if (action === "delete") {
      // Remove do Pluggy
      await fetch(`${PLUGGY_API}/items/${itemId}`, {
        method: "DELETE",
        headers: pluggyHeaders,
      });

      // Remove do banco
      await admin
        .from("pluggy_connections")
        .delete()
        .eq("item_id", itemId)
        .eq("user_id", user.id);

      // Remove transações importadas desse item
      await admin
        .from("transactions")
        .delete()
        .eq("user_id", user.id)
        .eq("source", `pluggy:${itemId}`);

      // Remove transações de cartão de crédito importadas desse item
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
    await admin.from("pluggy_connections").upsert(
      {
        user_id: user.id,
        item_id: itemId,
        connector_name: item.connector?.name || "Banco",
        connector_logo: item.connector?.imageUrl || null,
        status: item.status || "UPDATED",
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "item_id" }
    );

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
        // ── Transações de Cartão de Crédito ──
        const mapped = txs.map((tx: any) => ({
          user_id: user.id,
          title: tx.description || "Transação Cartão Open Finance",
          amount: Math.abs(tx.amount),
          category: tx.category || "Open Finance",
          merchant: tx.merchantName || null,
          created_at: tx.date,
          source: `pluggy:${itemId}`,
          external_id: tx.id,
        }));

        // Evitar duplicatas
        const { data: existing } = await admin
          .from("credit_card_transactions")
          .select("external_id")
          .eq("user_id", user.id)
          .eq("source", `pluggy:${itemId}`);

        const existingIds = new Set(
          (existing || []).map((e: any) => e.external_id)
        );
        const newTxs = mapped.filter(
          (t: any) => !existingIds.has(t.external_id)
        );

        if (newTxs.length > 0) {
          await admin.from("credit_card_transactions").insert(newTxs);
          totalCreditCardImported += newTxs.length;
        }
      } else {
        // ── Transações Regulares (Conta Corrente/Poupança) ──
        const mapped = txs.map((tx: any) => ({
          user_id: user.id,
          title: tx.description || "Transação Open Finance",
          amount: Math.abs(tx.amount),
          type: tx.type === "CREDIT" ? "income" : "expense",
          category: tx.category || "Open Finance",
          merchant: tx.merchantName || null,
          created_at: tx.date,
          source: `pluggy:${itemId}`,
          external_id: tx.id,
        }));

        // Evitar duplicatas
        const { data: existing } = await admin
          .from("transactions")
          .select("external_id")
          .eq("user_id", user.id)
          .eq("source", `pluggy:${itemId}`);

        const existingIds = new Set(
          (existing || []).map((e: any) => e.external_id)
        );
        const newTxs = mapped.filter(
          (t: any) => !existingIds.has(t.external_id)
        );

        if (newTxs.length > 0) {
          await admin.from("transactions").insert(newTxs);
          totalImported += newTxs.length;
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
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
