import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function ImportCSVNubank() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  /* =====================
     HELPERS
  ===================== */

  // Limpeza básica
  const clean = (value) =>
    (value ?? "")
      .replace(/\uFEFF/g, "")
      .replace(/"/g, "")
      .replace("\r", "")
      .trim();

  // Título = antes do hífen
  const parseTitle = (value) => {
    const v = clean(value);
    if (!v) return "Transação Nubank";
    return v.split(/\s*[-–]\s*/)[0].trim();
  };

  // Merchant = depois do hífen
  const parseMerchant = (value) => {
  const v = clean(value);
  if (!v || !v.includes("-")) return null;

  const merchantRaw = v.split(/\s*[-–]\s*/)[1] || "";

  const merchant = merchantRaw
    .replace(/[0-9]/g, "")   // remove números
    .replace(/[.,]/g, "")    // remove . e ,
    .replace(/\s{2,}/g, " ") // normaliza espaços
    .trim();

  return merchant || null;
};

  // Categoria automática
  const parseCategory = (title) => {
    const t = title.toLowerCase();

    if (t.includes("pix")) return "Pix";
    if (t.includes("débito")) return "Débito";
    if (t.includes("crédito")) return "Crédito";
    if (t.includes("aplicação")) return "Investimento";
    if (t.includes("transferência")) return "Transferência";
    if (t.includes("fatura")) return "Fatura";
    if (t.includes("boleto")) return "Boleto";

    return "Outros";
  };

  // Valor BR / EN
  const parseAmount = (value) => {
    const v = clean(value);
    if (!v) return 0;

    if (v.includes(",")) {
      return Number(v.replace(/\./g, "").replace(",", "."));
    }

    return Number(v);
  };

  // Data DD/MM/YYYY
  const parseDate = (value) => {
    const v = clean(value);
    if (!v) return new Date().toISOString();

    const [day, month, year] = v.split("/");
    return new Date(`${year}-${month}-${day}T00:00:00`).toISOString();
  };

  /* =====================
     CSV NUBANK (LATIN-1)
  ===================== */
  const parseCSV = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const buffer = e.target.result;
        const text = new TextDecoder("latin1").decode(buffer);

        const lines = text.split("\n").filter(Boolean);

        const data = lines.slice(1).map((line) => {
          const values = line.split(";").map(clean);

          return {
            data: values[0],
            valor: values[1],
            identificacao: values[2],
            descricao: values[values.length - 1],
          };
        });

        resolve(data);
      };

      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  /* =====================
     IMPORTAÇÃO
  ===================== */
  const handleImport = async () => {
    if (!file) {
      setMessage("Selecione um arquivo CSV primeiro.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const transactions = await parseCSV(file);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) throw new Error("Usuário não logado");

      const user = sessionData.session.user;

      const formattedTransactions = transactions.map((t) => {
        const amount = parseAmount(t.valor);
        const title = parseTitle(t.descricao);

        return {
          title,
          merchant: parseMerchant(t.descricao), // 👈 NOVO
          category: parseCategory(title),       // 👈 NOVO
          amount: Math.abs(amount),
          type: amount >= 0 ? "income" : "expense",
          created_at: parseDate(t.data),
          user_id: user.id,
        };
      });

      console.log("Preview:", formattedTransactions.slice(0, 5));

      const { error } = await supabase
        .from("transactions")
        .insert(formattedTransactions);

      if (error) throw error;

      setMessage("CSV importado com sucesso!");
      setFile(null);
      setTimeout(() => navigate("/transactions"), 1200);
    } catch (err) {
      console.error(err);
      setMessage("Erro ao importar CSV.");
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <main className="flex justify-center items-center px-6 py-16">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-8">
          <h2 className="text-xl font-semibold mb-2 text-center text-slate-800 dark:text-slate-200">
            Importar CSV do Nubank
          </h2>

          <p className="text-slate-500 dark:text-slate-400 text-center mb-6 text-sm">
            O merchant será salvo separado automaticamente
          </p>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-6 cursor-pointer hover:border-primary-400 transition">
            <span className="text-4xl mb-2">📄</span>
            <span className="text-slate-500 dark:text-slate-400 text-sm">
              {file ? file.name : "Clique para selecionar o arquivo CSV"}
            </span>

            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files[0])}
              className="hidden"
            />
          </label>

          <button
            onClick={handleImport}
            disabled={loading}
            className="w-full mt-6 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg text-sm transition disabled:opacity-60"
          >
            {loading ? "Importando..." : "Importar CSV"}
          </button>

          {message && (
            <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
              {message}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
