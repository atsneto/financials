import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { getEffectiveBillingDate } from "../utils/billing";
import { useTheme } from "../context/ThemeContext";
import iconMultiple from "../svg/list.svg";
import iconCreditCard from "../svg/credit-card.svg";
import { getBank } from "../utils/banks";
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
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const iconAmber = isDark
    ? "brightness(0) saturate(100%) invert(80%) sepia(85%) saturate(900%) hue-rotate(5deg) brightness(105%)"
    : "brightness(0) saturate(100%)";
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
  const [creditCardId, setCreditCardId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardError, setCardError] = useState("");

  // Edição em massa por nome
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkSourceTitle, setBulkSourceTitle] = useState("");
  const [bulkNewTitle, setBulkNewTitle] = useState("");
  const [bulkNewCategory, setBulkNewCategory] = useState("");
  const [bulkNewType, setBulkNewType] = useState("");
  const [bulkNewPayment, setBulkNewPayment] = useState("");
  const [bulkNewCreditCardId, setBulkNewCreditCardId] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  // Seleção múltipla
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSelectionEditOpen, setIsSelectionEditOpen] = useState(false);
  const [selCategory, setSelCategory] = useState("");
  const [selType, setSelType] = useState("");
  const [selPayment, setSelPayment] = useState("");
  const [applyCategory, setApplyCategory] = useState(false);
  const [applyType, setApplyType] = useState(false);
  const [applyPayment, setApplyPayment] = useState(false);
  const [selCreditCardId, setSelCreditCardId] = useState("");
  const [selSaving, setSelSaving] = useState(false);

  const [csvFile, setCsvFile] = useState(null);
  const [loadingCsv, setLoadingCsv] = useState(false);
  const [csvMessage, setCsvMessage] = useState("");
  const [toast, setToast] = useState(null);

  // Pagamento de fatura
  const [invoicePayments, setInvoicePayments] = useState([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentCardId, setPaymentCardId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentAccount, setPaymentAccount] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  const [mealVoucherCarryover, setMealVoucherCarryover] = useState(false);
  const [mealVoucherMonthlyAmount, setMealVoucherMonthlyAmount] = useState(0);
  const [defaultClosingDay, setDefaultClosingDay] = useState(null);

  // Filtro de data (mês/ano)
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth());
  const [filterYear, setFilterYear] = useState(now.getFullYear());

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    loadCards();
    loadProfile();
    loadClosingDay();
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

    // Pagamentos de fatura
    const { data: paymentsData } = await supabase
      .from("invoice_payments")
      .select("*")
      .eq("user_id", user.id)
      .order("payment_date", { ascending: false });
    setInvoicePayments(paymentsData || []);
  }

  async function loadProfile() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) return;
    const { data: fp } = await supabase
      .from("financial_profile")
      .select("meal_voucher_carryover, meal_voucher_monthly_amount")
      .eq("user_id", sessionData.session.user.id)
      .maybeSingle();
    if (fp) {
      setMealVoucherCarryover(fp.meal_voucher_carryover ?? false);
      setMealVoucherMonthlyAmount(Number(fp.meal_voucher_monthly_amount) || 0);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  async function loadCards() {
    setLoadingCards(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoadingCards(false); return; }
    const { data } = await supabase
      .from("credit_cards")
      .select("id, name, last_four, closing_day, bank_id")
      .eq("user_id", session.user.id)
      .order("created_at");
    setCards(data || []);
    setLoadingCards(false);
  }

  async function loadClosingDay() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase
      .from("credit_card_settings")
      .select("closing_day")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (data?.closing_day) setDefaultClosingDay(data.closing_day);
  }

  // --- Pagamento de fatura ---
  function openPaymentModal() {
    setPaymentCardId(cards.length === 1 ? cards[0].id : "");
    setPaymentAmount("");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentAccount("");
    setIsPaymentModalOpen(true);
    loadCards();
  }

  // Totais da fatura por cartão no mês filtrado
  function getInvoiceTotalForCard(cardId) {
    return monthTransactions
      .filter((t) => t.payment_method === "credit_card" && t.type === "expense" && t.credit_card_id === cardId)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }

  function getInvoicePaidForCard(cardId) {
    return invoicePayments
      .filter((p) => p.invoice_month === filterMonth && p.invoice_year === filterYear && p.credit_card_id === cardId)
      .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
  }

  async function handlePayInvoice(e) {
    e.preventDefault();
    setSavingPayment(true);
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) { setSavingPayment(false); return; }
    const user = sessionData.session.user;
    const paidAmount = Number(paymentAmount);
    if (!paidAmount || paidAmount <= 0) { setSavingPayment(false); return; }
    const txDate = paymentDate ? new Date(paymentDate + "T12:00:00").toISOString() : new Date().toISOString();
    const resolvedCardId = paymentCardId || null;

    await supabase.from("invoice_payments").insert({
      user_id: user.id,
      credit_card_id: resolvedCardId,
      invoice_month: filterMonth,
      invoice_year: filterYear,
      amount_paid: paidAmount,
      payment_date: txDate,
      account_label: paymentAccount.trim() || null,
    });

    const cardName = resolvedCardId
      ? (cards.find(c => c.id === resolvedCardId)?.name || "Cartão")
      : "Cartão de crédito";
    const monthNames = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    await supabase.from("transactions").insert({
      user_id: user.id,
      title: `Pagamento fatura ${cardName} - ${monthNames[filterMonth]}/${filterYear}`,
      amount: paidAmount,
      type: "expense",
      category: "Pagamento de fatura",
      payment_method: "debit_pix",
      credit_card_id: null,
      created_at: txDate,
    });

    setSavingPayment(false);
    setIsPaymentModalOpen(false);
    window.dispatchEvent(new Event("transactions-updated"));
    loadData();
    showToast(`Pagamento de R$ ${paidAmount.toFixed(2)} registrado com sucesso.`);
  }

  function openAddModal() {
    setEditingTx(null);
    setTitle("");
    setAmount("");
    setCategory("");
    setType("expense");
    setPaymentMethod("debit_pix");
    setCreditCardId("");
    setCardError("");
    setDate(new Date().toISOString().slice(0, 10));
    setIsModalOpen(true);
    setIsDeleteModalOpen(false);
    loadCards();
  }

  function openEditModal(tx) {
    setEditingTx(tx);
    setTitle(tx.title);
    setAmount(tx.amount);
    setCategory(tx.category);
    setType(tx.type);
    setPaymentMethod(tx.payment_method || "debit_pix");
    setCreditCardId(tx.credit_card_id || "");
    setCardError("");
    setDate(tx.created_at ? tx.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setIsModalOpen(true);
    setIsDeleteModalOpen(false);
    loadCards();
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

    if (paymentMethod === "credit_card" && !creditCardId) {
      setCardError("Selecione o cartão de crédito utilizado.");
      return;
    }
    setCardError("");

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session.user;
    const resolvedCardId = paymentMethod === "credit_card" && creditCardId ? creditCardId : null;
    const txDate = date ? new Date(date + "T12:00:00").toISOString() : new Date().toISOString();

    if (editingTx) {
      await supabase.from("transactions").update({ title, amount, type, category, payment_method: paymentMethod, credit_card_id: resolvedCardId, created_at: txDate }).eq("id", editingTx.id);
      showToast("Tudo certo! Transação atualizada.");
    } else {
      const { error } = await supabase.from("transactions").insert([{ title, amount, type, category, payment_method: paymentMethod, credit_card_id: resolvedCardId, user_id: user.id, created_at: txDate }]);
      if (!error && paymentMethod === "credit_card" && type === "expense") {
        await supabase.from("credit_card_transactions").insert([{
          title,
          amount,
          category,
          merchant: "",
          created_at: txDate,
          user_id: user.id,
          credit_card_id: resolvedCardId,
        }]);
      }
      showToast(`Pronto! ${type === "income" ? "Receita" : "Despesa"} registrada com sucesso.`);
    }

    setIsModalOpen(false);
    window.dispatchEvent(new Event("transactions-updated"));
    loadData();
  }

  function handleDelete(id) {
    setTxToDelete(id);
    setIsDeleteModalOpen(true);
    setIsModalOpen(false);
  }

  function openBulkEdit(tx) {
    setBulkSourceTitle(tx.title);
    setBulkNewTitle(tx.title);
    setBulkNewCategory(tx.category || "");
    setBulkNewType("");
    setBulkNewPayment("");
    setBulkNewCreditCardId("");
    setIsBulkModalOpen(true);
  }

  async function handleBulkSave() {
    if (!bulkNewTitle.trim()) return;
    setBulkSaving(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session.user;

    const bulkUpdates = { title: bulkNewTitle.trim(), category: bulkNewCategory.trim() };
    if (bulkNewType) bulkUpdates.type = bulkNewType;
    if (bulkNewPayment) {
      bulkUpdates.payment_method = bulkNewPayment;
      bulkUpdates.credit_card_id = bulkNewPayment === "credit_card" && bulkNewCreditCardId ? bulkNewCreditCardId : null;
    }

    await supabase
      .from("transactions")
      .update(bulkUpdates)
      .eq("user_id", user.id)
      .eq("title", bulkSourceTitle);

    setBulkSaving(false);
    setIsBulkModalOpen(false);
    window.dispatchEvent(new Event("transactions-updated"));
    loadData();
    showToast(`Pronto! Todas as transações "${bulkSourceTitle}" foram atualizadas.`);
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
    }
  }

  function openSelectionEdit() {
    setSelCategory("");
    setSelType("");
    setSelPayment("");
    setSelCreditCardId("");
    setApplyCategory(false);
    setApplyType(false);
    setApplyPayment(false);
    setIsSelectionEditOpen(true);
  }

  async function handleSelectionEdit() {
    const updates = {};
    if (applyCategory) updates.category = selCategory.trim();
    if (applyType && selType) updates.type = selType;
    if (applyPayment && selPayment) {
      updates.payment_method = selPayment;
      updates.credit_card_id = selPayment === "credit_card" && selCreditCardId ? selCreditCardId : null;
    }
    if (Object.keys(updates).length === 0) return;
    setSelSaving(true);
    const ids = [...selectedIds];
    await supabase.from("transactions").update(updates).in("id", ids);
    setSelSaving(false);
    setIsSelectionEditOpen(false);
    setSelectedIds(new Set());
    window.dispatchEvent(new Event("transactions-updated"));
    loadData();
    showToast(`${ids.length} transaç${ids.length !== 1 ? "ões" : "ão"} atualizada${ids.length !== 1 ? "s" : ""}.`);
  }

  async function handleSelectionDelete() {
    const ids = [...selectedIds];
    await supabase.from("transactions").delete().in("id", ids);
    setSelectedIds(new Set());
    window.dispatchEvent(new Event("transactions-updated"));
    loadData();
    showToast(`${ids.length} transaç${ids.length !== 1 ? "ões" : "ão"} removida${ids.length !== 1 ? "s" : ""}.`, "danger");
  }

  async function confirmDelete() {
    if (!txToDelete) return;
    await supabase.from("transactions").delete().eq("id", txToDelete);
    setIsDeleteModalOpen(false);
    setTxToDelete(null);
    window.dispatchEvent(new Event("transactions-updated"));
    loadData();
    showToast("Feito! A transação foi removida.", "danger");
  }

  const filteredTransactions = transactions.filter((t) => {
    const d = getEffectiveBillingDate(t, cards, defaultClosingDay);
    if (d.getMonth() !== filterMonth || d.getFullYear() !== filterYear) return false;
    if (filter !== "all" && t.type !== filter) return false;
    return true;
  });

  // Dados apenas do mês filtrado para o summary
  const monthTransactions = transactions.filter((t) => {
    const d = getEffectiveBillingDate(t, cards, defaultClosingDay);
    return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  });

  // Meses disponíveis para filtro (usando data efetiva)
  const availableMonths = Array.from(
    new Set(transactions.map((t) => {
      const d = getEffectiveBillingDate(t, cards, defaultClosingDay);
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
    const pageW = doc.internal.pageSize.getWidth();

    // Header bar
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, pageW, 32, "F");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("Extrato de Transações", 14, 15);
    const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    doc.setFontSize(10);
    doc.text(`${monthNames[filterMonth - 1]} ${filterYear}`, 14, 24);
    doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, pageW - 14, 24, { align: "right" });

    // Summary cards
    const totalIn = filteredTransactions.filter((t) => t.type === "income" && t.payment_method !== "meal_voucher").reduce((s, t) => s + Number(t.amount), 0);
    const totalOut = filteredTransactions.filter((t) => t.type === "expense" && t.payment_method !== "meal_voucher").reduce((s, t) => s + Number(t.amount), 0);
    const bal = totalIn - totalOut;
    const totalVA = filteredTransactions.filter((t) => t.payment_method === "meal_voucher").reduce((s, t) => s + Number(t.amount) * (t.type === "income" ? 1 : -1), 0);

    const summaryY = 40;
    const boxW = (pageW - 28 - 12) / 4;
    const boxes = [
      { label: "Receitas", value: `R$ ${totalIn.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: [16, 185, 129] },
      { label: "Despesas", value: `R$ ${totalOut.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: [239, 68, 68] },
      { label: "Saldo", value: `R$ ${bal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: bal >= 0 ? [16, 185, 129] : [239, 68, 68] },
      { label: "Vale Alimentação", value: `R$ ${totalVA.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: [245, 158, 11] },
    ];
    boxes.forEach((b, i) => {
      const x = 14 + i * (boxW + 4);
      doc.setFillColor(248, 250, 252); // slate-50
      doc.roundedRect(x, summaryY, boxW, 18, 2, 2, "F");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(b.label.toUpperCase(), x + 4, summaryY + 6);
      doc.setFontSize(11);
      doc.setTextColor(...b.color);
      doc.text(b.value, x + 4, summaryY + 14);
    });

    // Helper: payment method label
    function pmLabel(pm) {
      if (pm === "credit_card") return "Cartão";
      if (pm === "meal_voucher") return "VA";
      return "Débito/Pix";
    }

    // Table
    const tableData = filteredTransactions.map((tx) => [
      tx.created_at ? new Date(tx.created_at).toLocaleDateString("pt-BR") : "-",
      tx.title || "-",
      tx.category || "-",
      pmLabel(tx.payment_method),
      tx.type === "income" ? "Receita" : "Despesa",
      `R$ ${Number(tx.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    ]);

    autoTable(doc, {
      startY: summaryY + 24,
      head: [["Data", "Título", "Categoria", "Pagamento", "Tipo", "Valor"]],
      body: tableData,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 22 },
        5: { halign: "right", fontStyle: "bold" },
      },
      didParseCell: function (data) {
        if (data.section === "body" && data.column.index === 5) {
          const tx = filteredTransactions[data.row.index];
          data.cell.styles.textColor = tx.type === "income" ? [16, 185, 129] : [239, 68, 68];
        }
        if (data.section === "body" && data.column.index === 4) {
          const tx = filteredTransactions[data.row.index];
          data.cell.styles.textColor = tx.type === "income" ? [16, 185, 129] : [239, 68, 68];
        }
      },
    });

    // Footer
    const finalY = doc.lastAutoTable.finalY + 8 || 50;
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(14, finalY, pageW - 14, finalY);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`${filteredTransactions.length} transações • Financials App`, 14, finalY + 6);
    doc.text(`Página 1`, pageW - 14, finalY + 6, { align: "right" });

    doc.save(`extrato-${filterYear}-${String(filterMonth).padStart(2, "0")}.pdf`);
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
          // Score by accent count minus replacement markers (&#65533;)
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

  const mealVoucherTxs = monthTransactions.filter((t) => t.payment_method === "meal_voucher");
  const mealVoucherIncomeThisMonth = mealVoucherTxs.filter((t) => t.type === "income").reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const mealVoucherExpenseThisMonth = mealVoucherTxs.filter((t) => t.type === "expense").reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // Carryover: soma os saldos de meses anteriores
  let mealVoucherPreviousBalance = 0;
  if (mealVoucherCarryover) {
    const filterDate = new Date(filterYear, filterMonth, 1);
    transactions.forEach((t) => {
      if (t.payment_method !== "meal_voucher") return;
      const d = getEffectiveBillingDate(t, cards, defaultClosingDay);
      const txMonthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      if (txMonthStart >= filterDate) return; // só meses anteriores
      const amt = Number(t.amount || 0);
      mealVoucherPreviousBalance += t.type === "income" ? amt : -amt;
    });
  }

  const totalMealVoucher = mealVoucherPreviousBalance + mealVoucherIncomeThisMonth - mealVoucherExpenseThisMonth;

  const totalIncome = monthTransactions
  .filter((t) => t.type === "income" && t.payment_method !== "meal_voucher")
  .reduce((sum, t) => sum + Number(t.amount || 0), 0);

const totalExpense = monthTransactions
  .filter((t) => t.type === "expense" && t.payment_method !== "meal_voucher")
  .reduce((sum, t) => sum + Number(t.amount || 0), 0);

const balance = totalIncome - totalExpense;

return (
  <div className="space-y-6 animate-fade-in">
    {/* HEADER */}
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-200">Transações</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gerencie suas receitas e despesas</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={openAddModal} className="inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Nova transação
        </button>
        {cards.length > 0 && (
          <button onClick={openPaymentModal} className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Pagar fatura
          </button>
        )}
        <button onClick={generatePDF} className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          PDF
        </button>
      </div>
    </div>

    {/* SUMMARY */}
    <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Receitas</p>
        <p className="text-xl font-semibold text-emerald-600 mt-1">R$ {totalIncome.toFixed(2)}</p>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Despesas</p>
        <p className="text-xl font-semibold text-red-500 mt-1">R$ {totalExpense.toFixed(2)}</p>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vale Alimentação</p>
        <p className="text-xl font-semibold text-amber-500 mt-1">R$ {totalMealVoucher.toFixed(2)}</p>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Saldo</p>
        <p className={`text-xl font-semibold mt-1 ${balance >= 0 ? "text-emerald-600" : "text-red-500"}`}>R$ {balance.toFixed(2)}</p>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</p>
        <p className="text-xl font-semibold text-slate-800 dark:text-slate-200 mt-1">{monthTransactions.length}</p>
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
        className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        {availableMonths.map((m) => (
          <option key={m.key} value={m.key}>{m.label}</option>
        ))}
      </select>
      <div className="flex items-center gap-2">
      {['all','income','expense'].map((t) => (
        <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === t ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:bg-slate-700'}`}>
          {t === 'all' ? 'Todas' : t === 'income' ? 'Receitas' : 'Despesas'}
        </button>
      ))}
      </div>
    </div>

    {/* CONTENT */}
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* LIST */}
      <div className="lg:col-span-2">
        {/* Selection action bar */}
        {selectedIds.size > 0 && (
          <div className="mb-3 flex items-center justify-between bg-white dark:bg-slate-800 border border-primary-200 dark:border-primary-800 rounded-xl px-4 py-3 gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {selectedIds.size} <span className="font-normal text-slate-500 dark:text-slate-400">selecionada{selectedIds.size !== 1 ? "s" : ""}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openSelectionEdit}
                className="px-3 py-1.5 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors shadow-sm"
              >
                Editar
              </button>
              <button
                onClick={handleSelectionDelete}
                className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
              >
                Excluir
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Cancelar seleção"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {filteredTransactions.length === 0 ? (
            <div className="p-10 text-center">
              <svg className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nenhuma transação</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Crie uma nova ou importe um CSV</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {/* Header row with select-all */}
              <li className="flex items-center px-3 py-2.5 sm:px-5 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className={`relative flex-shrink-0 w-5 h-5 rounded-md border-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 cursor-pointer flex items-center justify-center
                    ${selectedIds.size > 0
                      ? "bg-primary-600 border-primary-600"
                      : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-primary-400"
                    }`}
                  aria-label="Selecionar todas"
                >
                  {selectedIds.size > 0 && selectedIds.size < filteredTransactions.length ? (
                    /* Indeterminate dash */
                    <span className="block w-2.5 h-0.5 bg-white rounded-full" />
                  ) : selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0 ? (
                    /* Checkmark */
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                    </svg>
                  ) : null}
                </button>
                <span className="ml-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {selectedIds.size > 0
                    ? <span className="text-primary-600">{selectedIds.size} de {filteredTransactions.length} selecionadas</span>
                    : `${filteredTransactions.length} transaç${filteredTransactions.length !== 1 ? "ões" : "ão"}`}
                </span>
              </li>
              {filteredTransactions.map((tx) => (
                <li
                  key={tx.id}
                  className={`flex justify-between items-start px-3 py-3 sm:px-5 sm:py-4 transition-colors group ${selectedIds.has(tx.id) ? "bg-primary-50/50" : "hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                >
                  {/* Checkbox */}
                  <div className="flex-shrink-0 pt-0.5 mr-2 sm:mr-3">
                    <button
                      type="button"
                      onClick={() => toggleSelect(tx.id)}
                      className={`w-5 h-5 rounded-md border-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 flex items-center justify-center flex-shrink-0
                        ${selectedIds.has(tx.id)
                          ? "bg-primary-600 border-primary-600"
                          : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-primary-400 group-hover:border-slate-400"
                        }`}
                      aria-label="Selecionar transação"
                    >
                      {selectedIds.has(tx.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {/* Left */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate pr-2">{tx.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {tx.category && <span className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[100px] sm:max-w-none">{tx.category}</span>}
                      <span className="text-xs text-slate-300 dark:text-slate-600 flex-shrink-0">·</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">{new Date(tx.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                    {tx.payment_method === "credit_card" && (
                      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 mt-1 rounded-full bg-violet-50 text-violet-600 border border-violet-100 font-medium">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                        <span className="truncate max-w-[120px] sm:max-w-none">
                          {tx.credit_card_id && cards.find(c => c.id === tx.credit_card_id)
                            ? cards.find(c => c.id === tx.credit_card_id).name
                            : "Cartão de crédito"}
                        </span>
                      </span>
                    )}
                    {tx.payment_method === "debit_pix" && (
                      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 mt-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 font-medium">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Débito / PIX
                      </span>
                    )}
                    {tx.payment_method === "meal_voucher" && (
                      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 mt-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100 font-medium">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        Vale alimentação
                      </span>
                    )}
                  </div>
                  {/* Right */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-3">
                    <span className={`text-sm font-semibold whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {tx.type === 'income' ? '+' : '-'} R$ {Number(tx.amount).toFixed(2)}
                    </span>
                    <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openBulkEdit(tx)} title="Editar todas com este nome" className="p-1.5 rounded-md text-slate-400 dark:text-amber-600/60 hover:text-violet-600 hover:bg-violet-50 transition-colors">
                        <img src={iconMultiple} alt="" className="w-4 h-4" style={{ filter: isDark ? "brightness(0) saturate(100%) invert(80%) sepia(85%) saturate(900%) hue-rotate(5deg) brightness(105%) opacity(0.6)" : "brightness(0) opacity(0.4)" }} />
                      </button>
                      <button onClick={() => openEditModal(tx)} className="p-1.5 rounded-md text-slate-400 dark:text-amber-600/70 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(tx.id)} className="p-1.5 rounded-md text-slate-400 dark:text-amber-600/70 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                    {/* Mobile actions */}
                    <div className="flex sm:hidden items-center gap-1">
                      <button onClick={() => openEditModal(tx)} className="p-1.5 rounded-md text-slate-300 dark:text-amber-600/60 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(tx.id)} className="p-1.5 rounded-md text-slate-300 dark:text-amber-600/60 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Receitas x Despesas</h3>
          {(() => {
            // Agrupar por mês do ano
            const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
            const year = new Date().getFullYear();
            const data = months.map((m, i) => ({ month: m, income: 0, expense: 0 }));
            transactions.forEach((tx) => {
              const d = getEffectiveBillingDate(tx, cards, defaultClosingDay);
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
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1F2A3D" : "#e2e8f0"} opacity={0.5} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`} width={45} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm px-3 py-2 text-xs">
                            <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">{payload[0]?.payload?.month}</p>
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
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Onde mais gastou</h3>
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
              return <p className="text-xs text-slate-400 dark:text-slate-500">Nenhuma despesa neste mês.</p>;
            }

            return (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Por categoria</p>
                  <ul className="space-y-1.5">
                    {topCats.map(([cat, val]) => (
                      <li key={cat} className="flex justify-between items-center text-sm">
                        <span className="text-slate-700 dark:text-slate-300 truncate">{cat}</span>
                        <span className="text-red-500 font-medium ml-2 whitespace-nowrap">R$ {val.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Por título</p>
                  <ul className="space-y-1.5">
                    {topTitles.map(([t, val]) => (
                      <li key={t} className="flex justify-between items-center text-sm">
                        <span className="text-slate-700 dark:text-slate-300 truncate">{t}</span>
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
        <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-md p-6 shadow-soft-lg animate-scale-in border border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-5">{editingTx ? "Editar transação" : "Nova transação"}</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Título</label>
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
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Valor</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Categoria
                {category && !editingTx && <span className="ml-2 text-primary-500 font-normal">sugerida automaticamente</span>}
              </label>
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Data</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tipo</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition">
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Meio de pagamento</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "credit_card", label: "Cartão de crédito" },
                  { value: "debit_pix", label: "Débito / PIX" },
                  { value: "meal_voucher", label: "Vale alimentação" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setPaymentMethod(opt.value); setCreditCardId(""); setCardError(""); }}
                    className={`px-2 py-2 rounded-lg border text-xs text-center transition ${
                      paymentMethod === opt.value
                        ? "border-primary-500 bg-primary-50 text-primary-700 font-medium"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Seletor de cartão */}
            {paymentMethod === "credit_card" && (
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Cartão <span className="text-red-500">*</span>
                </label>
                {loadingCards ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 py-2">
                    <div className="h-3.5 w-3.5 border-2 border-slate-300 dark:border-slate-600 border-t-transparent rounded-full animate-spin" />
                    Carregando cartões...
                  </div>
                ) : cards.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 px-3 py-3 text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Nenhum cartão cadastrado</p>
                    <a href="/settings" className="text-xs text-primary-600 font-medium hover:text-primary-700 transition">
                      Adicionar em Configurações
                    </a>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {cards.map((card) => { const bank = getBank(card.bank_id); return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => { setCreditCardId(card.id); setCardError(""); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm transition ${
                          creditCardId === card.id
                            ? "border-primary-500 bg-primary-50 text-primary-700"
                            : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                        }`}
                      >
                        {bank ? (
                          <div className="w-5 h-5 flex-shrink-0 rounded bg-white border border-slate-200 dark:border-slate-600 flex items-center justify-center p-0.5">
                            <img src={bank.logo} alt={bank.label} className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <img src={iconCreditCard} alt="" className="w-4 h-4 flex-shrink-0" style={{ filter: iconAmber }} />
                        )}
                        <span className="flex-1 text-left font-medium">{card.name}</span>
                        {card.last_four && <span className="text-xs text-slate-400 dark:text-slate-500">•••• {card.last_four}</span>}
                        {creditCardId === card.id && (
                          <svg className="w-4 h-4 text-primary-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ); })}
                  </div>
                )}
                {cardError && <p className="text-xs text-red-500 mt-1">{cardError}</p>}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancelar</button>
              <button type="submit" className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors">Salvar</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* BULK EDIT MODAL */}
    {isBulkModalOpen && (() => {
      const affected = transactions.filter(t => t.title === bulkSourceTitle);
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 animate-fade-in" onClick={() => setIsBulkModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-md p-6 shadow-soft-lg animate-scale-in border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">Editar em massa</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Encontradas <span className="font-semibold text-slate-700 dark:text-slate-300">{affected.length}</span> transação{affected.length !== 1 ? "ões" : ""} com o nome <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">"{bulkSourceTitle}"</span>. As alterações serão aplicadas a todas.
            </p>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 max-h-36 overflow-y-auto mb-4">
              {affected.map(tx => (
                <div key={tx.id} className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(tx.created_at).toLocaleDateString("pt-BR")}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{tx.category}</span>
                  <span className={`text-xs font-semibold ${tx.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                    {tx.type === "income" ? "+" : "-"} R$ {Number(tx.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Novo nome</label>
                <input
                  type="text"
                  value={bulkNewTitle}
                  onChange={e => setBulkNewTitle(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nova categoria</label>
                <input
                  type="text"
                  value={bulkNewCategory}
                  onChange={e => setBulkNewCategory(e.target.value)}
                  placeholder="Ex: Alimentação"
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tipo</label>
                <select
                  value={bulkNewType}
                  onChange={e => setBulkNewType(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                >
                  <option value="">Sem alteração</option>
                  <option value="income">Receita</option>
                  <option value="expense">Despesa</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Meio de pagamento</label>
                <select
                  value={bulkNewPayment}
                  onChange={e => { setBulkNewPayment(e.target.value); setBulkNewCreditCardId(""); }}
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                >
                  <option value="">Sem alteração</option>
                  <option value="credit_card">Cartão de crédito</option>
                  <option value="debit_pix">Débito / PIX</option>
                  <option value="meal_voucher">Vale alimentação</option>
                </select>
                {bulkNewPayment === "credit_card" && (
                  <div className="mt-2 space-y-1">
                    {cards.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500 px-1">Nenhum cartão cadastrado.</p>
                    ) : (
                      cards.map(card => { const bank = getBank(card.bank_id); return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => setBulkNewCreditCardId(card.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm transition ${
                            bulkNewCreditCardId === card.id
                              ? "border-primary-500 bg-primary-50 text-primary-700"
                              : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                          }`}
                        >
                          {bank ? (
                            <div className="w-5 h-5 flex-shrink-0 rounded bg-white border border-slate-200 dark:border-slate-600 flex items-center justify-center p-0.5">
                              <img src={bank.logo} alt={bank.label} className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <img src={iconCreditCard} alt="" className="w-4 h-4 flex-shrink-0" style={{ filter: iconAmber }} />
                          )}
                          <span className="flex-1 text-left font-medium">{card.name}</span>
                          {card.last_four && <span className="text-xs text-slate-400 dark:text-slate-500">•••• {card.last_four}</span>}
                          {bulkNewCreditCardId === card.id && (
                            <svg className="w-4 h-4 text-primary-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          )}
                        </button>
                      ); })
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => setIsBulkModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancelar</button>
              <button
                type="button"
                onClick={handleBulkSave}
                disabled={bulkSaving || !bulkNewTitle.trim()}
                className="px-4 py-2 text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {bulkSaving ? "Salvando..." : `Atualizar ${affected.length} transaç${affected.length !== 1 ? "ões" : "ão"}`}
              </button>
            </div>
          </div>
        </div>
      );
    })()}

    {/* DELETE CONFIRM */}
    {isDeleteModalOpen && (
      <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 animate-fade-in" onClick={() => setIsDeleteModalOpen(false)}>
        <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-sm p-6 text-center shadow-soft-lg animate-scale-in border border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">Excluir transação?</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Essa ação não pode ser desfeita.</p>
          <div className="flex justify-center gap-2">
            <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancelar</button>
            <button onClick={confirmDelete} className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">Excluir</button>
          </div>
        </div>
      </div>
    )}

    {/* SELECTION EDIT MODAL */}
    {isSelectionEditOpen && (
      <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50" onClick={() => setIsSelectionEditOpen(false)}>
        <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-sm p-6 shadow-lg border border-slate-200 dark:border-slate-700 mx-4" onClick={e => e.stopPropagation()}>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">Editar selecionadas</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">
            {selectedIds.size} transaç{selectedIds.size !== 1 ? "ões" : "ão"} selecionada{selectedIds.size !== 1 ? "s" : ""}. Marque os campos que deseja alterar.
          </p>
          <div className="space-y-4">
            {/* Categoria */}
            <div className={`rounded-xl border-2 p-3.5 transition-colors ${applyCategory ? "border-primary-200 bg-primary-50/40" : "border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"}`}>
              <label className="flex items-center gap-2.5 mb-2.5 cursor-pointer" onClick={() => setApplyCategory(v => !v)}>
                <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${applyCategory ? "bg-primary-600 border-primary-600" : "bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"}`}>
                  {applyCategory && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                </span>
                <span className={`text-sm font-semibold ${applyCategory ? "text-primary-700" : "text-slate-600 dark:text-slate-400"}`}>Categoria</span>
              </label>
              <input
                type="text"
                value={selCategory}
                onChange={e => { setSelCategory(e.target.value); setApplyCategory(true); }}
                placeholder="Ex: Alimentação"
                disabled={!applyCategory}
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-40 disabled:bg-slate-100 dark:disabled:bg-slate-700"
              />
            </div>
            {/* Tipo */}
            <div className={`rounded-xl border-2 p-3.5 transition-colors ${applyType ? "border-primary-200 bg-primary-50/40" : "border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"}`}>
              <label className="flex items-center gap-2.5 mb-2.5 cursor-pointer" onClick={() => setApplyType(v => !v)}>
                <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${applyType ? "bg-primary-600 border-primary-600" : "bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"}`}>
                  {applyType && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                </span>
                <span className={`text-sm font-semibold ${applyType ? "text-primary-700" : "text-slate-600 dark:text-slate-400"}`}>Tipo</span>
              </label>
              <select
                value={selType}
                onChange={e => { setSelType(e.target.value); setApplyType(true); }}
                disabled={!applyType}
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-40 disabled:bg-slate-100 dark:disabled:bg-slate-700"
              >
                <option value="">Selecionar...</option>
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </select>
            </div>
            {/* Meio de pagamento */}
            <div className={`rounded-xl border-2 p-3.5 transition-colors ${applyPayment ? "border-primary-200 bg-primary-50/40" : "border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"}`}>
              <label className="flex items-center gap-2.5 mb-2.5 cursor-pointer" onClick={() => setApplyPayment(v => !v)}>
                <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${applyPayment ? "bg-primary-600 border-primary-600" : "bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"}`}>
                  {applyPayment && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                </span>
                <span className={`text-sm font-semibold ${applyPayment ? "text-primary-700" : "text-slate-600 dark:text-slate-400"}`}>Meio de pagamento</span>
              </label>
              <select
                value={selPayment}
                onChange={e => { setSelPayment(e.target.value); setApplyPayment(true); setSelCreditCardId(""); }}
                disabled={!applyPayment}
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-40 disabled:bg-slate-100 dark:disabled:bg-slate-700"
              >
                <option value="">Selecionar...</option>
                <option value="credit_card">Cartão de crédito</option>
                <option value="debit_pix">Débito / PIX</option>
                <option value="meal_voucher">Vale alimentação</option>
              </select>

              {applyPayment && selPayment === "credit_card" && (
                <div className="mt-2 space-y-1">
                  {cards.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 px-1">Nenhum cartão cadastrado.</p>
                  ) : (
                    cards.map(card => { const bank = getBank(card.bank_id); return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => setSelCreditCardId(card.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm transition ${
                          selCreditCardId === card.id
                            ? "border-primary-500 bg-primary-50 text-primary-700"
                            : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                        }`}
                      >
                        {bank ? (
                          <div className="w-5 h-5 flex-shrink-0 rounded bg-white border border-slate-200 dark:border-slate-600 flex items-center justify-center p-0.5">
                            <img src={bank.logo} alt={bank.label} className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <img src={iconCreditCard} alt="" className="w-4 h-4 flex-shrink-0" style={{ filter: iconAmber }} />
                        )}
                        <span className="flex-1 text-left font-medium">{card.name}</span>
                        {card.last_four && <span className="text-xs text-slate-400 dark:text-slate-500">•••• {card.last_four}</span>}
                        {selCreditCardId === card.id && (
                          <svg className="w-4 h-4 text-primary-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        )}
                      </button>
                    ); })
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-5 border-t border-slate-100 dark:border-slate-700 mt-5">
            <button onClick={() => setIsSelectionEditOpen(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition">
              Cancelar
            </button>
            <button
              onClick={handleSelectionEdit}
              disabled={selSaving || (!applyCategory && !applyType && !applyPayment)}
              className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              {selSaving ? "Salvando..." : "Aplicar"}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* PAYMENT MODAL */}
    {isPaymentModalOpen && (
      <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 animate-fade-in" onClick={() => setIsPaymentModalOpen(false)}>
        <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-md p-6 shadow-soft-lg animate-scale-in border border-slate-200 dark:border-slate-700 mx-4" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">Pagar fatura</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">
            Uma transação de despesa será registrada automaticamente.
          </p>

          <form onSubmit={handlePayInvoice} className="space-y-4">
            {/* Cartão */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Cartão de crédito</label>
              {cards.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">Nenhum cartão cadastrado.</p>
              ) : (
                <div className="space-y-1.5">
                  {cards.map(card => {
                    const bank = getBank(card.bank_id);
                    const invTotal = getInvoiceTotalForCard(card.id);
                    const invPaid = getInvoicePaidForCard(card.id);
                    const invRemaining = Math.max(0, invTotal - invPaid);
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => { setPaymentCardId(card.id); setPaymentAmount(invRemaining > 0 ? invRemaining.toFixed(2) : invTotal.toFixed(2)); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm transition ${
                          paymentCardId === card.id
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                            : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                        }`}
                      >
                        {bank ? (
                          <div className="w-5 h-5 flex-shrink-0 rounded bg-white border border-slate-200 dark:border-slate-600 flex items-center justify-center p-0.5">
                            <img src={bank.logo} alt={bank.label} className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <img src={iconCreditCard} alt="" className="w-4 h-4 flex-shrink-0" style={{ filter: iconAmber }} />
                        )}
                        <div className="flex-1 text-left">
                          <span className="font-medium">{card.name}</span>
                          {card.last_four && <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">•••• {card.last_four}</span>}
                          <div className="flex gap-3 mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                            <span>Fatura: R$ {invTotal.toFixed(2)}</span>
                            {invPaid > 0 && <span className="text-emerald-500">Pago: R$ {invPaid.toFixed(2)}</span>}
                            {invRemaining > 0 && invPaid > 0 && <span className="text-red-400">Resta: R$ {invRemaining.toFixed(2)}</span>}
                          </div>
                        </div>
                        {paymentCardId === card.id && (
                          <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Valor */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Valor do pagamento (R$)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                style={{ fontSize: "16px" }}
                required
              />
              {paymentCardId && (() => {
                const invTotal = getInvoiceTotalForCard(paymentCardId);
                const invPaid = getInvoicePaidForCard(paymentCardId);
                const invRemaining = Math.max(0, invTotal - invPaid);
                return invTotal > 0 ? (
                  <div className="flex gap-2 mt-2">
                    {invRemaining > 0 && invPaid > 0 && (
                      <button type="button" onClick={() => setPaymentAmount(invRemaining.toFixed(2))} className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                        Restante (R$ {invRemaining.toFixed(2)})
                      </button>
                    )}
                    <button type="button" onClick={() => setPaymentAmount(invTotal.toFixed(2))} className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                      Total (R$ {invTotal.toFixed(2)})
                    </button>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Conta */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Conta utilizada</label>
              <input
                type="text"
                value={paymentAccount}
                onChange={(e) => setPaymentAccount(e.target.value)}
                placeholder="Ex: Conta corrente Nubank"
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              />
            </div>

            {/* Data */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Data do pagamento</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancelar</button>
              <button
                type="submit"
                disabled={savingPayment || !paymentCardId}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition disabled:opacity-50"
              >
                {savingPayment ? "Registrando..." : "Confirmar pagamento"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* TOAST */}
    {(toast || csvMessage) && (
      <div className={`fixed bottom-5 right-5 px-5 py-3 rounded-xl shadow-lg animate-slide-up flex items-center gap-2.5 border ${
        toast?.type === "danger"
          ? "bg-white dark:bg-slate-800 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
          : "bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-800 text-slate-700 dark:text-slate-300"
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
