import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLUGGY_API = "https://api.pluggy.ai";

console.info("pluggy-connect-token function started");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verificar autenticação do usuário
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

    // Autenticar com Pluggy
    const clientId = Deno.env.get("PLUGGY_CLIENT_ID");
    const clientSecret = Deno.env.get("PLUGGY_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("Pluggy credentials not configured");
    }

    const authResponse = await fetch(`${PLUGGY_API}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientSecret }),
    });

    if (!authResponse.ok) {
      throw new Error("Failed to authenticate with Pluggy");
    }

    const { apiKey } = await authResponse.json() as any;

    // Criar connect token
    const body: any = await req.json().catch(() => ({}));
    const connectTokenBody: Record<string, string> = {};
    if (body.itemId) {
      connectTokenBody.itemId = body.itemId;
    }

    const tokenResponse = await fetch(`${PLUGGY_API}/connect_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify(connectTokenBody),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to create connect token");
    }

    const { accessToken } = await tokenResponse.json() as any;

    return new Response(
      JSON.stringify({ connectToken: accessToken }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
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
