import { supabase } from "../supabaseClient";

/**
 * Solicita um connect token ao Pluggy via Edge Function.
 * O token é usado para abrir o widget de conexão bancária.
 */
export async function getConnectToken(itemId = null) {
  const body = itemId ? { itemId } : {};

  const { data, error } = await supabase.functions.invoke(
    "pluggy-connect-token",
    { body }
  );

  if (error) throw new Error(error.message || "Erro ao gerar connect token");
  return data.connectToken;
}

/**
 * Sincroniza transações de um item Pluggy com o Supabase.
 */
export async function syncItem(itemId) {
  const { data, error } = await supabase.functions.invoke("pluggy-sync", {
    body: { action: "sync", itemId },
  });

  if (error) throw new Error(error.message || "Erro ao sincronizar");
  return data;
}

/**
 * Remove uma conexão Open Finance (Pluggy + Supabase).
 */
export async function deleteConnection(itemId) {
  const { data, error } = await supabase.functions.invoke("pluggy-sync", {
    body: { action: "delete", itemId },
  });

  if (error) throw new Error(error.message || "Erro ao desconectar");
  return data;
}

/**
 * Lista todas as conexões do usuário logado.
 */
export async function listConnections() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  const { data, error } = await supabase
    .from("pluggy_connections")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}
