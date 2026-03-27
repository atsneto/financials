import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("debit_pix");
  const [csvFile, setCsvFile] = useState(null);
  const [loadingCsv, setLoadingCsv] = useState(false);
  const [csvMessage, setCsvMessage] = useState("");
  const [toast, setToast] = useState(null);

  // Filtro de data (mês/ano)
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth());
  const [filterYear, setFilterYear] = useState(now.getFullYear());

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    function handleEsc(e) {
      if (e.key === "Escape") {
        setIsModalOpen(false);
        setIsDeleteModalOpen(false);
      }
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  async function loadData() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) return navigate("/login");
    const user = sessionData.session.user;

    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setTransactions(data || []);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  function openAddModal() {
    setEditingTx(null);
    setTitle("");
    setAmount("");
    setCategory("");
    setType("expense");
    setPaymentMethod("debit_pix");
    setIsModalOpen(true);
    setIsDeleteModalOpen(false);
  }

  function openEditModal(tx) {
    setEditingTx(tx);
    setTitle(tx.title);
    setAmount(tx.amount);
    setCategory(tx.category);
    setType(tx.type);
    setPaymentMethod(tx.payment_method || "debit_pix");
    setIsModalOpen(true);
    setIsDeleteModalOpen(false);
  }

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  function suggestCategory(t) {
    const v = t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (v.match(/ifood|rappi|delivery|pizza|hamburger|lanche|restaurante|almoco|jantar|cafe|padaria|acai|sushi|churrasco|refeicao/)) return "Alimentação";
    if (v.match(/mercado|supermercado|hortifruti|feira|atacado/)) return "Mercado";
    if (v.match(/uber|99|taxi|onibus|metro|combustivel|gasolina|posto|estacionamento|pedagio|transporte/)) return "Transporte";
    if (v.match(/farmacia|remedio|medico|consulta|plano de saude|hospital|clinica|dentista|exame|saude/)) return "Saúde";
    if (v.match(/netflix|spotify|amazon|prime|disney|youtube|hbo|streaming|assinatura/)) return "Assinaturas";
    if (v.match(/academia|cinema|show|teatro|parque|viagem|hotel|passeio|lazer|jogo|game/)) return "Lazer";
    if (v.match(/escola|faculdade|curso|livro|material|mensalidade|educacao/)) return "Educação";
    if (v.match(/luz|energia|agua|internet|telefone|celular|aluguel|condominio|iptu|gas|moradia/)) return "Moradia";
    if (v.match(/roupa|calcado|tenis|camisa|calca|vestido|loja|shopping|moda/)) return "Vestuário";
    if (v.match(/salario|pagamento|freela|freelance|bonus/)) return "Salário";
    if (v.match(/pix|ted|doc|transferencia|deposito/)) return "Transferência";
    if (v.match(/investimento|aplicacao|cdb|lci|lca|tesouro|fundo/)) return "Investimento";
    if (v.match(/cartao|fatura|credito/)) return "Cartão";
    return "";
  }

  async function handleSave(e) {
    e.preventDefault();
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session.user;

    if (editingTx) {
      await supabase.from("transactions").update({ title, amount, type, category, payment_method: paymentMethod }).eq("id", editingTx.id);
      showToast("Tudo certo! Transação atualizada.");
    } else {
      await supabase.from("transactions").insert([{ title, amount, type, category, payment_method: paymentMethod, user_id: user.id }]);
      showToast(`Pronto! ${type === "income" ? "Receita" : "Despesa"} registrada com sucesso.`);
    }

    setIsModalOpen(false);
    loadData();
  }

  function handleDelete(id) {
    setTxToDelete(id);
    setIsDeleteModalOpen(true);
    setIsModalOpen(false);
  }

  async function confirmDelete() {
    if (!txToDelete) return;
    await supabase.from("transactions").delete().eq("id", txToDelete);
    setIsDeleteModalOpen(false);
    setTxToDelete(null);
    loadData();
    showToast("Feito! A transação foi removida.", "danger");
  }

  const filteredTransactions = transactions.filter((t) => {
    // Filtro de data
    const d = new Date(t.created_at);
    if (d.getMonth() !== filterMonth || d.getFullYear() !== filterYear) return false;
    // Filtro de tipo
    if (filter !== "all" && t.type !== filter) return false;
    return true;
  });

  // Dados apenas do mês filtrado para o summary
  const monthTransactions = transactions.filter((t) => {
    const d = new Date(t.created_at);
    return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  });

  // Meses disponíveis para filtro
  const availableMonths = Array.from(
    new Set(transactions.map((t) => {
      const d = new Date(t.created_at);
      return `${d.getFullYear()}-${d.getMonth()}`;
    }))
  ).map((key) => {
    const [y, m] = key.split("-").map(Number);
    const label = new Date(y, m).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
    return { year: y, month: m, label, key };
  }).sort((a, b) => b.year - a.year || b.month - a.month);

  // Verificar se o mês atual está nas opções
  const currentKey = `${now.getFullYear()}-${now.getMonth()}`;
  if (!availableMonths.find((m) => m.key === currentKey)) {
    const label = new Date(now.getFullYear(), now.getMonth()).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
    availableMonths.unshift({ year: now.getFullYear(), month: now.getMonth(), label, key: currentKey });
  }

  // PDF
  function generatePDF() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Extrato de Transações", 14, 20);

    const tableData = filteredTransactions.map((tx) => [
      tx.title || "-",
      tx.type === "income" ? "Receita" : "Despesa",
      `R$ ${Number(tx.amount || 0).toFixed(2)}`,
      tx.category || "-",
      tx.created_at ? new Date(tx.created_at).toLocaleDateString() : "-",
    ]);

    autoTable(doc, {
      startY: 30,
      head: [["Título", "Tipo", "Valor", "Categoria", "Data"]],
      body: tableData,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [255, 206, 0], textColor: 0 },
      didParseCell: function (data) {
        if (data.section === "body" && data.column.index === 2) {
          const tx = filteredTransactions[data.row.index];
          data.cell.styles.textColor =
            tx.type === "income" ? [0, 128, 0] : [255, 0, 0];
        }
      },
    });

    const totalIncome = filteredTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const balance = totalIncome - totalExpense;

    const finalY = doc.lastAutoTable.finalY + 10 || 50;
    doc.setFontSize(12);
    doc.text(`Total Receitas: R$ ${totalIncome.toFixed(2)}`, 14, finalY);
    doc.text(`Total Despesas: R$ ${totalExpense.toFixed(2)}`, 14, finalY + 7);
    doc.text(`Saldo: R$ ${balance.toFixed(2)}`, 14, finalY + 14);

    doc.save("extrato.pdf");
  }

  /* ===================== PARSER CSV ===================== */
  const clean = (value) =>
    (value ?? "").replace(/\uFEFF/g, "").replace(/"/g, "").replace("\r", "").trim();

  const parseTitle = (value) => {
    const v = clean(value);
    if (!v) return "Transação Nubank";
    return v.split(/\s*[-–]\s*/)[0].trim();
  };

  const parseMerchant = (value) => {
    const v = clean(value);
    if (!v || !v.includes("-")) return null;
    const merchantRaw = v.split(/\s*[-–]\s*/)[1] || "";
    const merchant = merchantRaw
      .replace(/[0-9]/g, "")
      .replace(/[.,]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    return merchant || null;
  };

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

  const parseAmount = (value) => {
    const v = clean(value);
    if (!v) return 0;
    if (v.includes(",")) return Number(v.replace(/\./g, "").replace(",", "."));
    return Number(v);
  };

  const parseDate = (value) => {
    const v = clean(value);
    if (!v) return new Date().toISOString();

    // Try common dd/mm/yyyy format
    try {
      if (v.includes("/")) {
        const parts = v.split("/").map((p) => p.trim());
        if (parts.length === 3) {
          let [day, month, year] = parts;
          if (year.length === 2) year = `20${year}`;
          const iso = `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00`;
          const d = new Date(iso);
          if (!isNaN(d)) return d.toISOString();
        }
      }

      // Try native Date parsing (ISO or other formats)
      const d2 = new Date(v);
      if (!isNaN(d2)) return d2.toISOString();

      // Try numeric timestamp
      const n = Number(v);
      if (!Number.isNaN(n)) {
        const d3 = new Date(n);
        if (!isNaN(d3)) return d3.toISOString();
      }
    } catch (err) {
      // fallthrough to fallback
    }

    // Fallback to now to avoid crashing on invalid dates
    return new Date().toISOString();
  };

  const parseCSV = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target.result;
        // Try decode with UTF-8 and ISO-8859-1 (latin1), pick the one with more proper accented letters
        const tryDecode = (buf) => {
          const decUtf8 = new TextDecoder("utf-8").decode(buf);
          const decLatin1 = new TextDecoder("iso-8859-1").decode(buf);

          // Try to repair common mojibake: if latin1-decoded string contains UTF-8 bytes mis-decoded,
          // reinterpret its char codes as bytes and decode as utf-8.
          const fixFromLatin1 = (s) => {
            try {
              const bytes = new Uint8Array(Array.from(s).map((ch) => ch.charCodeAt(0)));
              return new TextDecoder("utf-8").decode(bytes);
            } catch (e) {
              return s;
            }
          };

          const fixedLatin1 = fixFromLatin1(decLatin1);

          const accentRegex = /[áàâãäéêíóôõöúüçÁÀÂÃÄÉÊÍÓÔÕÖÚÜÇ]/g;
          const countAcc = (s) => (s.match(accentRegex) || []).length;
          const repCount = (s) => (s.match(/\uFFFD/g) || []).length;

          const candidates = [decUtf8, decLatin1, fixedLatin1];
          // Score by accent count minus replacement markers (�)
          const scored = candidates.map((c) => ({
            s: c.replace(/\r/g, ""),
            score: countAcc(c) - repCount(c),
          }));
          scored.sort((a, b) => b.score - a.score);
          let best = scored[0].s;

          // If best looks like mojibake (contains sequences like 'Ã' or 'Â'), try a repair
          if (best.includes("Ã") || best.includes("Â")) {
            try {
              const repaired = fixFromLatin1(best);
              if (countAcc(repaired) > countAcc(best)) {
                best = repaired.replace(/\r/g, "");
              }
            } catch (e) {
              // ignore and keep best
            }
          }

          return best;
        };

        const text = tryDecode(buffer);
        const allLines = text.split("\n").filter((l) => l.trim() !== "");
        if (allLines.length === 0) return resolve([]);

        // Detect separator from header line
        const headerLine = allLines[0];
        let sep = ";";
        if ((headerLine.match(/\;/g) || []).length >= 3) sep = ";";
        else if ((headerLine.match(/\,/g) || []).length >= 3) sep = ",";
        else if ((headerLine.match(/\t/g) || []).length >= 3) sep = "\t";

        // CSV line parser that respects quoted fields
        const parseLine = (line) => {
          const result = [];
          let cur = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
              if (inQuotes && line[i + 1] === '"') {
                cur += '"';
                i++; // consume escaped quote
              } else {
                inQuotes = !inQuotes;
              }
            } else if (!inQuotes && ch === sep) {
              result.push(clean(cur));
              cur = "";
            } else {
              cur += ch;
            }
          }
          result.push(clean(cur));
          return result;
        };

        // Parse header to find column indexes
        const headers = parseLine(headerLine).map((h) => h.toLowerCase());
        const idx = {
          data: headers.findIndex((h) => h.includes("data") || h.includes("date")),
          valor: headers.findIndex((h) => h.includes("valor") || h.includes("value") || h.includes("amount")),
          identificacao: headers.findIndex((h) => h.includes("identifica") || h.includes("id")),
          descricao: headers.findIndex((h) => h.includes("descri") || h.includes("description") || h.includes("descricao")),
        };

        const rows = allLines.slice(1).map((line) => {
          const values = parseLine(line);
          const getVal = (i) => (i >= 0 && i < values.length ? values[i] : "");
          return {
            data: getVal(idx.data >= 0 ? idx.data : 0),
            valor: getVal(idx.valor >= 0 ? idx.valor : 1),
            identificacao: getVal(idx.identificacao >= 0 ? idx.identificacao : 2),
            descricao: getVal(idx.descricao >= 0 ? idx.descricao : 3),
          };
        });

        resolve(rows);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleCsvUpload = async (file) => {
    setLoadingCsv(true);
    setCsvMessage("");

    try {
      const transactionsCsv = await parseCSV(file);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) throw new Error("Usuário não logado");
      const user = sessionData.session.user;

      const formatted = transactionsCsv.map((t) => {
        const amount = parseAmount(t.valor);
        // prefer descricao, fallback to identificacao when building title/merchant
        const textForParsing = (t.descricao || t.identificacao || "").toString();
        const title = parseTitle(textForParsing);
        return {
          title,
          merchant: parseMerchant(textForParsing),
          category: parseCategory(title),
          amount: Math.abs(amount),
          type: amount >= 0 ? "income" : "expense",
          created_at: parseDate(t.data),
          user_id: user.id,
        };
      });

      const { error } = await supabase.from("transactions").insert(formatted);
      if (error) throw error;

      setCsvMessage("CSV importado com sucesso!");
      setCsvFile(null);
      loadData();
    } catch (err) {
      console.error(err);
      setCsvMessage("Erro ao importar CSV.");
    }

    setLoadingCsv(false);
  };

  const totalIncome = monthTransactions
  .filter((t) => t.type === "income")
  .reduce((sum, t) => sum + Number(t.amount || 0), 0);

const totalExpense = monthTransactions
  .filter((t) => t.type === "expense")
  .reduce((sum, t) => sum + Number(t.amount || 0), 0);

const balance = totalIncome - totalExpense;

return (
  <div className="space-y-6 animate-fade-in">
    {/* HEADER */}
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Transações</h1>
        <p className="text-sm text-slate-500 mt-1">Gerencie suas receitas e despesas</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={openAddModal} className="inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Nova transação
        </button>
        <label className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg cursor-pointer transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          {csvFile ? csvFile.name : 'Importar CSV'}
          <input type="file" accept=".csv" className="hidden" onChange={(e) => { const file = e.target.files[0]; if (!file) return; setCsvFile(file); handleCsvUpload(file); }} />
        </label>
        <button onClick={generatePDF} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          PDF
        </button>
      </div>
    </div>

    {/* SUMMARY */}
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Receitas</p>
        <p className="text-xl font-semibold text-emerald-600 mt-1">R$ {totalIncome.toFixed(2)}</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Despesas</p>
        <p className="text-xl font-semibold text-red-500 mt-1">R$ {totalExpense.toFixed(2)}</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Saldo</p>
        <p className={`text-xl font-semibold mt-1 ${balance >= 0 ? "text-emerald-600" : "text-red-500"}`}>R$ {balance.toFixed(2)}</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total</p>
        <p className="text-xl font-semibold text-slate-800 mt-1">{monthTransactions.length}</p>
      </div>
    </section>

    {/* DATE + TYPE FILTERS */}
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={`${filterYear}-${filterMonth}`}
        onChange={(e) => {
          const [y, m] = e.target.value.split("-").map(Number);
          setFilterYear(y);
          setFilterMonth(m);
        }}
        className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        {availableMonths.map((m) => (
          <option key={m.key} value={m.key}>{m.label}</option>
        ))}
      </select>
      <div className="flex items-center gap-2">
      {['all','income','expense'].map((t) => (
        <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === t ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'}`}>
          {t === 'all' ? 'Todas' : t === 'income' ? 'Receitas' : 'Despesas'}
        </button>
      ))}
      </div>
    </div>

    {/* CONTENT */}
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* LIST */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {filteredTransactions.length === 0 ? (
            <div className="p-10 text-center">
              <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
              <p className="text-sm font-medium text-slate-500">Nenhuma transação</p>
              <p className="text-xs text-slate-400 mt-1">Crie uma nova ou importe um CSV</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredTransactions.map((tx) => (
                <li key={tx.id} className="flex justify-between items-center px-5 py-4 hover:bg-slate-50 transition-colors group">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {tx.title}
                      {tx.merchant && <span className="text-slate-400 font-normal ml-1.5">· {tx.merchant}</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{tx.category}</span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {tx.type === 'income' ? '+' : '-'} R$ {Number(tx.amount).toFixed(2)}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(tx)} className="p-1.5 rounded-md text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(tx.id)} className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* SIDEBAR */}
      <aside className="space-y-5">
        {/* GRÁFICO RECEITA x DESPESA (linhas) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Receitas x Despesas</h3>
          {(() => {
            // Agrupar por mês do ano
            const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
            const year = new Date().getFullYear();
            const data = months.map((m, i) => ({ month: m, income: 0, expense: 0 }));
            transactions.forEach((tx) => {
              const d = new Date(tx.created_at);
              if (d.getFullYear() === year) {
                const idx = d.getMonth();
                if (tx.type === "income") data[idx].income += Number(tx.amount || 0);
                else data[idx].expense += Number(tx.amount || 0);
              }
            });
            return (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`} width={45} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2 text-xs">
                            <p className="font-medium text-slate-700 mb-1">{payload[0]?.payload?.month}</p>
                            {payload.map((e, i) => (
                              <p key={i} style={{ color: e.color }}>
                                {e.name}: R$ {Number(e.value).toFixed(2)}
                              </p>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="income" name="Receitas" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="expense" name="Despesas" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </div>

        {/* TOP CATEGORIA E TÍTULO */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Onde mais gastou</h3>
          {(() => {
            const expenses = monthTransactions.filter((t) => t.type === "expense");
            // Top categoria
            const catMap = {};
            expenses.forEach((t) => {
              const cat = t.category || "Sem categoria";
              catMap[cat] = (catMap[cat] || 0) + Number(t.amount || 0);
            });
            const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

            // Top título
            const titleMap = {};
            expenses.forEach((t) => {
              const title = t.title || "Sem título";
              titleMap[title] = (titleMap[title] || 0) + Number(t.amount || 0);
            });
            const topTitles = Object.entries(titleMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

            if (expenses.length === 0) {
              return <p className="text-xs text-slate-400">Nenhuma despesa neste mês.</p>;
            }

            return (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Por categoria</p>
                  <ul className="space-y-1.5">
                    {topCats.map(([cat, val]) => (
                      <li key={cat} className="flex justify-between items-center text-sm">
                        <span className="text-slate-700 truncate">{cat}</span>
                        <span className="text-red-500 font-medium ml-2 whitespace-nowrap">R$ {val.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Por título</p>
                  <ul className="space-y-1.5">
                    {topTitles.map(([t, val]) => (
                      <li key={t} className="flex justify-between items-center text-sm">
                        <span className="text-slate-700 truncate">{t}</span>
                        <span className="text-red-500 font-medium ml-2 whitespace-nowrap">R$ {val.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-primary-700 mb-2">Dica</h4>
          <p className="text-xs text-primary-600 leading-relaxed">Passe o mouse sobre uma transação para editar ou excluir.</p>
        </div>
      </aside>
    </section>

    {/* ADD/EDIT MODAL */}
    {isModalOpen && (
      <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 animate-fade-in" onClick={() => setIsModalOpen(false)}>
        <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-soft-lg animate-scale-in border border-slate-200" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-semibold text-slate-800 mb-5">{editingTx ? "Editar transação" : "Nova transação"}</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Título</label>
              <input
                type="text"
                value={title}
                onChange={e => {
                  const val = e.target.value;
                  setTitle(val);
                  if (!editingTx || !category) {
                    const suggested = suggestCategory(val);
                    if (suggested) setCategory(suggested);
                  }
                }}
                className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Valor</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Categoria
                {category && !editingTx && <span className="ml-2 text-primary-500 font-normal">sugerida automaticamente</span>}
              </label>
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border border-slate-200 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition">
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Meio de pagamento</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "credit_card", label: "Cartão de crédito" },
                  { value: "debit_pix", label: "Débito / PIX" },
                  { value: "meal_voucher", label: "Vale alimentação" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPaymentMethod(opt.value)}
                    className={`px-2 py-2 rounded-lg border text-xs text-center transition ${
                      paymentMethod === opt.value
                        ? "border-primary-500 bg-primary-50 text-primary-700 font-medium"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
              <button type="submit" className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors">Salvar</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* DELETE CONFIRM */}
    {isDeleteModalOpen && (
      <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 animate-fade-in" onClick={() => setIsDeleteModalOpen(false)}>
        <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center shadow-soft-lg animate-scale-in border border-slate-200" onClick={(e) => e.stopPropagation()}>
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Excluir transação?</h2>
          <p className="text-sm text-slate-500 mb-5">Essa ação não pode ser desfeita.</p>
          <div className="flex justify-center gap-2">
            <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
            <button onClick={confirmDelete} className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">Excluir</button>
          </div>
        </div>
      </div>
    )}

    {/* TOAST */}
    {(toast || csvMessage) && (
      <div className={`fixed bottom-5 right-5 px-5 py-3 rounded-xl shadow-lg animate-slide-up flex items-center gap-2.5 border ${
        toast?.type === "danger"
          ? "bg-white border-red-200 text-red-700"
          : "bg-white border-emerald-200 text-slate-700"
      }`}>
        {toast?.type === "danger" ? (
          <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L.553 16.447A1 1 0 001.447 18h13.106a1 1 0 00.894-1.553L11.894 2.553A1 1 0 0010.106 2H9zm.002 12a1 1 0 100 2 1 1 0 000-2zm-.002-8a1 1 0 012 0v4a1 1 0 01-2 0V6z" clipRule="evenodd" /></svg>
        ) : (
          <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
        )}
        <span className="text-sm">{toast?.message || csvMessage}</span>
      </div>
    )}
  </div>
);
}
