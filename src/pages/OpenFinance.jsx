import { useEffect, useState, useCallback } from "react";
import {
  getConnectToken,
  syncItem,
  deleteConnection,
  listConnections,
} from "../services/pluggyService";
import { usePluggyConnect } from "../hooks/usePluggyConnect";
import lawBuilding from "../svg/globe.svg";

export default function OpenFinance() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(null);
  const [connectToken, setConnectToken] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);

  // ── Carregar conexões ──────────────────────────────────
  const loadConnections = useCallback(async () => {
    try {
      const data = await listConnections();
      setConnections(data);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  // ── Pluggy Connect Widget ──────────────────────────────
  const handleSuccess = useCallback(
    async (data) => {
      // Pluggy SDK v2 pode retornar { item: { id } } ou o item diretamente { id }
      const itemId = data?.item?.id || data?.id;
      if (!itemId) {
        if (import.meta.env.DEV) console.warn("Pluggy onSuccess data:", JSON.stringify(data));
        setFeedback({ type: "error", message: "Conexão não retornou item." });
        setConnecting(false);
        return;
      }

      setFeedback({ type: "info", message: "Sincronizando transações..." });
      try {
        const result = await syncItem(itemId);
        const parts = [];
        if (result.transactionsImported > 0)
          parts.push(`${result.transactionsImported} transações`);
        if (result.creditCardTransactionsImported > 0)
          parts.push(`${result.creditCardTransactionsImported} transações de cartão`);
        const detail = parts.length > 0 ? parts.join(" e ") + " importadas" : "Nenhuma transação nova";
        setFeedback({
          type: "success",
          message: `Conectado com sucesso! ${detail}.`,
        });
        await loadConnections();
      } catch (err) {
        setFeedback({ type: "error", message: err.message });
      }
      setConnecting(false);
    },
    [loadConnections]
  );

  const handleError = useCallback((err) => {
    setFeedback({
      type: "error",
      message: err?.message || "Erro ao conectar banco.",
    });
    setConnecting(false);
  }, []);

  const handleClose = useCallback(() => {
    setConnecting(false);
    // Recarrega conexões ao fechar o widget (caso onSuccess tenha processado)
    loadConnections();
  }, [loadConnections]);

  const { open: openWidget } = usePluggyConnect({
    connectToken,
    onSuccess: handleSuccess,
    onError: handleError,
    onClose: handleClose,
  });

  // ── Iniciar conexão ────────────────────────────────────
  async function handleConnect() {
    setConnecting(true);
    setFeedback(null);
    try {
      const token = await getConnectToken();
      setConnectToken(token);
      await openWidget(token);
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
      setConnecting(false);
    }
  }

  // ── Re-sincronizar ─────────────────────────────────────
  async function handleSync(itemId) {
    setSyncing(itemId);
    setFeedback(null);
    try {
      const result = await syncItem(itemId);
      const parts = [];
      if (result.transactionsImported > 0)
        parts.push(`${result.transactionsImported} transações`);
      if (result.creditCardTransactionsImported > 0)
        parts.push(`${result.creditCardTransactionsImported} transações de cartão`);
      const detail = parts.length > 0 ? parts.join(" e ") + " importadas" : "Nenhuma transação nova";
      setFeedback({
        type: "success",
        message: detail + ".",
      });
      await loadConnections();
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    }
    setSyncing(null);
  }

  // ── Desconectar ────────────────────────────────────────
  async function handleDelete() {
    if (!deleteModal) return;
    const itemId = deleteModal;
    setDeleteModal(null);
    setFeedback(null);
    try {
      await deleteConnection(itemId);
      setFeedback({
        type: "success",
        message: "Conexão removida com sucesso.",
      });
      await loadConnections();
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    }
  }

  // ── Render ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
            Open Finance
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Conecte suas contas bancárias e importe transações automaticamente
          </p>
        </div>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-60 flex items-center gap-2"
        >
          {connecting ? (
            <>
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Conectando...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Conectar Banco
            </>
          )}
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`text-sm rounded-lg px-4 py-3 border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : feedback.type === "error"
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-primary-50 text-primary-700 border-primary-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Conexões */}
      {connections.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
            <img src={lawBuilding} alt="" className="w-8 h-8 opacity-40" />
          </div>
          <h3 className="text-base font-medium text-slate-700 dark:text-slate-300 mb-1">
            Nenhuma conta conectada
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Conecte seu banco via Open Finance para importar transações, saldos
            e extratos automaticamente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col gap-4"
            >
              <div className="flex items-center gap-3">
                {conn.connector_logo ? (
                  <img
                    src={conn.connector_logo}
                    alt={conn.connector_name}
                    className="w-10 h-10 rounded-lg object-contain bg-slate-50 dark:bg-slate-900 p-1 border border-slate-100 dark:border-slate-800"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                    <span className="text-primary-600 font-semibold text-sm">
                      {(conn.connector_name || "B")[0]}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-200 text-sm truncate">
                    {conn.connector_name || "Banco"}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {conn.last_sync_at
                      ? `Sincronizado ${new Date(conn.last_sync_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`
                      : "Nunca sincronizado"}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    conn.status === "UPDATED"
                      ? "bg-emerald-50 text-emerald-600"
                      : conn.status === "UPDATING"
                      ? "bg-amber-50 text-amber-600"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {conn.status === "UPDATED"
                    ? "Ativo"
                    : conn.status === "UPDATING"
                    ? "Atualizando"
                    : conn.status}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleSync(conn.item_id)}
                  disabled={syncing === conn.item_id}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
                >
                  {syncing === conn.item_id ? (
                    <span className="h-3.5 w-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
                      />
                    </svg>
                  )}
                  Sincronizar
                </button>
                <button
                  onClick={() => setDeleteModal(conn.item_id)}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-red-500 hover:bg-red-50 hover:border-red-200 transition"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          Como funciona
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
              <span className="text-primary-600 font-semibold text-sm">1</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Conecte</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Selecione seu banco e autorize a conexão via Pluggy
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
              <span className="text-primary-600 font-semibold text-sm">2</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Sincronize</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                As transações são importadas automaticamente para o Financials
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
              <span className="text-primary-600 font-semibold text-sm">3</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Acompanhe</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Veja tudo consolidado no Dashboard e em Transações
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-sm text-center border border-slate-200 dark:border-slate-700 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
              Desconectar Banco
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              As transações importadas deste banco também serão removidas.
              Deseja continuar?
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
              >
                Desconectar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
