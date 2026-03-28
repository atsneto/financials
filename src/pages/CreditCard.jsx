import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import {
  ResponsiveContainer,
  Tooltip as ReTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  LineChart,
  Line,
  Legend,
} from "recharts";

export default function CreditCard() {
  const [purchases, setPurchases] = useState([]);
  const [merchantMonthFilter, setMerchantMonthFilter] = useState("invoice");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState("");
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [closingDay, setClosingDay] = useState(25);
  const [dueDay, setDueDay] = useState(5);

  // múltiplos cartões
  const [userCards, setUserCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(null); // null = todos

  // Filtro de mês/ano para a lista de compras
  const nowDate = new Date();
  const [filterMonth, setFilterMonth] = useState(nowDate.getMonth());
  const [filterYear, setFilterYear] = useState(nowDate.getFullYear());


  const navigate = useNavigate();
  const modalRef = useRef();

  useEffect(() => {
    loadData();

    function handleEsc(e) {
      if (e.key === "Escape") setIsModalOpen(false);
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  async function loadData() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) return navigate("/login");

    const user = sessionData.session.user;

    const [{ data }, { data: settings }, { data: cardsData }] = await Promise.all([
      supabase.from("credit_card_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("credit_card_settings").select("closing_day, due_day").eq("user_id", user.id).maybeSingle(),
      supabase.from("credit_cards").select("id, name, last_four, closing_day, due_day").eq("user_id", user.id).order("created_at"),
    ]);

    setPurchases(data || []);
    setUserCards(cardsData || []);

    if (settings?.closing_day) setClosingDay(settings.closing_day);
    if (settings?.due_day) setDueDay(settings.due_day);
  }

  // Derived stats for UI (positive = charge, negative = reimbursement/payment)
  // compute current invoice period (based on closingDay)
  function getInvoicePeriod(closingDay) {
    const today = new Date();
    const day = today.getDate();
    let periodEnd = new Date(today.getFullYear(), today.getMonth(), closingDay, 23, 59, 59, 999);
    let periodStart;
    // Treat purchases on the closing day as part of the next invoice (Nubank behavior)
    if (day < closingDay) {
      // period end is this month's closingDay, start is previous month closingDay+1
      periodEnd = new Date(today.getFullYear(), today.getMonth(), closingDay, 23, 59, 59, 999);
      const prev = new Date(today.getFullYear(), today.getMonth() - 1, closingDay);
      periodStart = new Date(prev.getFullYear(), prev.getMonth(), closingDay + 1, 0, 0, 0, 0);
    } else {
      // period end is next month's closingDay
      periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, closingDay, 23, 59, 59, 999);
      periodStart = new Date(today.getFullYear(), today.getMonth(), closingDay + 1, 0, 0, 0, 0);
    }
    return { start: periodStart, end: periodEnd };
  }

  const { start: invoiceStart, end: invoiceEnd } = getInvoicePeriod(closingDay);

  // Determine current filter period
  const today = new Date();

  // cartão ativo (para usar closing_day/due_day do próprio cartão)
  const activeCard = userCards.find((c) => c.id === selectedCardId) || null;
  const effectiveClosingDay = activeCard?.closing_day ?? closingDay;
  const effectiveDueDay = activeCard?.due_day ?? dueDay;

  // transactions filtered by selected card + month/year
  const filteredPurchases = purchases.filter((p) => {
    if (!p?.created_at) return false;
    if (selectedCardId && p.credit_card_id !== selectedCardId) return false;
    const d = new Date(p.created_at);
    const { month: endMonth, year: endYear } = getPeriodEndForDate(d, effectiveClosingDay);
    return endMonth === filterMonth && endYear === filterYear;
  });

  const chargesSum = filteredPurchases.reduce((sum, p) => sum + (Number(p.amount || 0) > 0 ? Number(p.amount || 0) : 0), 0);
  const reimbursementsSum = filteredPurchases.reduce((sum, p) => sum + (Number(p.amount || 0) < 0 ? Math.abs(Number(p.amount || 0)) : 0), 0);
  // invoice = charges - reimbursements (never negative)
  const invoice = Math.max(0, chargesSum - reimbursementsSum);
  const total = invoice;
  const count = filteredPurchases.length;
  const average = count ? total / count : 0;

  // (Removed category pie chart) aggregation handled elsewhere if needed.

  // Monthly totals per invoice period (group by the period's closing month)
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const monthly = months.map((m, i) => ({ month: m, total: 0 }));

  // For each purchase, determine the invoice period end month for that purchase
  purchases.forEach((p) => {
    if (!p?.created_at) return;
    const d = new Date(p.created_at);
    // determine period end month index: if day < closingDay -> same month, else next month
    const day = d.getDate();
    let endMonth = (d.getMonth() + (day < closingDay ? 0 : 1)) % 12;
    let endYear = d.getFullYear() + (d.getMonth() === 11 && day >= closingDay ? 1 : 0);
    if (endYear === selectedYear) {
      if (Number(p.amount || 0) > 0) monthly[endMonth].total += Number(p.amount || 0);
      else monthly[endMonth].total -= Math.abs(Number(p.amount || 0));
      if (monthly[endMonth].total < 0) monthly[endMonth].total = 0;
    }
  });

  // build list of available years (based on period-end years in purchases)
  const yearSet = new Set();
  purchases.forEach((p) => {
    if (!p?.created_at) return;
    const d = new Date(p.created_at);
    const { year: y } = getPeriodEndForDate(d, closingDay);
    yearSet.add(y);
  });
  if (!yearSet.has(selectedYear)) yearSet.add(selectedYear);
  const yearOptions = Array.from(yearSet).sort((a, b) => b - a);

  // Meses disponíveis no filtro de compras
  const ccMonthsAvailable = Array.from(
    purchases
      .map((p) => {
        if (!p?.created_at) return null;
        const d = new Date(p.created_at);
        const { month: endMonth, year: endYear } = getPeriodEndForDate(d, closingDay);
        const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
        return { key: `${endYear}-${endMonth}`, label: `${months[endMonth]} ${endYear}`, year: endYear, month: endMonth };
      })
      .filter(Boolean)
      .reduce((acc, cur) => { acc.set(cur.key, cur); return acc; }, new Map())
      .values()
  ).sort((a, b) => b.year - a.year || b.month - a.month);

  // Garantir mês atual nas opções
  const ccCurrentKey = `${filterYear}-${filterMonth}`;
  if (!ccMonthsAvailable.find((m) => m.key === ccCurrentKey)) {
    const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    ccMonthsAvailable.unshift({ key: ccCurrentKey, label: `${months[filterMonth]} ${filterYear}`, year: filterYear, month: filterMonth });
  }

  // Helper: determine invoice period end month/year for a date
  function getPeriodEndForDate(d, closingDay) {
    const day = d.getDate();
    let month = d.getMonth();
    let year = d.getFullYear();
    // if purchase day is on or after the closing day, its period end moves to next month
    if (day >= closingDay) {
      month = (month + 1) % 12;
      if (month === 0) year += 1;
    }
    return { month, year };
  }

  // Rolling 5-month window (previous 2, current, next 2) based on today
  const now = new Date();
  const offsets = [-2, -1, 0, 1, 2];

  // build totals map keyed by `${year}-${month}` using same invoice-period logic
  const periodTotals = {};
  purchases.forEach((p) => {
    if (!p?.created_at) return;
    const d = new Date(p.created_at);
    const { month, year } = getPeriodEndForDate(d, closingDay);
    const key = `${year}-${month}`;
    periodTotals[key] = periodTotals[key] || 0;
    const val = Number(p.amount || 0);
    if (val > 0) periodTotals[key] += val;
    else periodTotals[key] -= Math.abs(val);
  });
  // clamp negatives to 0
  Object.keys(periodTotals).forEach((k) => {
    if (periodTotals[k] < 0) periodTotals[k] = 0;
  });

  const rolling5 = offsets.map((off) => {
    const dt = new Date(now.getFullYear(), now.getMonth() + off, 1);
    const key = `${dt.getFullYear()}-${dt.getMonth()}`;
    return { month: months[dt.getMonth()], total: periodTotals[key] || 0 };
  });

  // Top merchants (use `title` when merchant is not provided) and top purchases
  const merchantMap = filteredPurchases.reduce((acc, p) => {
    const m = p.title || p.merchant || "Outros";
    // count only charges toward merchant totals
    acc[m] = (acc[m] || 0) + (Number(p.amount || 0) > 0 ? Number(p.amount || 0) : 0);
    return acc;
  }, {});
  // month options for filter (unique year-month from purchases)
  const monthOptions = Array.from(
    purchases
      .map((p) => {
        if (!p?.created_at) return null;
        const d = new Date(p.created_at);
        const { month: endMonth, year: endYear } = getPeriodEndForDate(d, closingDay);
        return { key: `${endYear}-${endMonth}`, label: `${months[endMonth]} ${endYear}`, year: endYear, month: endMonth };
      })
      .filter(Boolean)
      .reduce((acc, cur) => {
        acc.set(cur.key, cur);
        return acc;
      }, new Map())
  ).reverse();

  // filtered purchases for merchant recurrence chart based on selected filter
  let merchantFilteredPurchases = [];
  if (merchantMonthFilter === "invoice") {
    merchantFilteredPurchases = filteredPurchases;
  } else if (merchantMonthFilter === "all") {
    merchantFilteredPurchases = purchases;
  } else {
    // merchantMonthFilter format: YYYY-M
    const [y, m] = merchantMonthFilter.split("-").map(Number);
    merchantFilteredPurchases = purchases.filter((p) => {
      if (!p?.created_at) return false;
      const d = new Date(p.created_at);
      const { month: endMonth, year: endYear } = getPeriodEndForDate(d, closingDay);
      return endYear === y && endMonth === m;
    });
  }

  // merchant counts (number of purchases per merchant/title) for recurrence chart
  const merchantCountMap = merchantFilteredPurchases.reduce((acc, p) => {
    const m = p.title || p.merchant || "Outros";
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});

  const merchantCounts = Object.keys(merchantCountMap)
    .map((k) => ({ name: k, count: merchantCountMap[k] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // monthly average over last 3 invoice periods
  const last3Offsets = [0, -1, -2];
  const last3Keys = last3Offsets.map((off) => {
    const dt = new Date(now.getFullYear(), now.getMonth() + off, 1);
    return `${dt.getFullYear()}-${dt.getMonth()}`;
  });
  const last3Totals = last3Keys.map((k) => periodTotals[k] || 0);
  const monthlyAverage = last3Totals.reduce((s, v) => s + v, 0) / (last3Totals.length || 1);

  function openAddModal() {
    setEditingPurchase(null);
    setTitle("");
    setAmount("");
    setCategory("");
    setMerchant("");
    setDate("");
    setIsModalOpen(true);
  }

  function openEditModal(purchase) {
    setEditingPurchase(purchase);
    setTitle(purchase.title);
    setAmount(purchase.amount);
    setCategory(purchase.category || "");
    setMerchant(purchase.merchant || "");
    setDate(purchase.created_at ? new Date(purchase.created_at).toISOString().split("T")[0] : "");
    setIsModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session.user;
    const numericAmount = Number(amount);

    if (editingPurchase) {
      await supabase
        .from("credit_card_transactions")
        .update({ title, amount: numericAmount, category, merchant, created_at: date })
        .eq("id", editingPurchase.id)
        .eq("user_id", user.id);
    } else {
      await supabase.from("credit_card_transactions").insert([
        { title, amount: numericAmount, category, merchant, created_at: date, user_id: user.id },
      ]);
    }

    setIsModalOpen(false);
    loadData();
  }

  async function handleDelete(id) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) return;
    await supabase
      .from("credit_card_transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", sessionData.session.user.id);
    loadData();
  }

  // Save closing day to Supabase (upsert by user_id)
  async function saveClosingDay() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) return navigate("/login");
    const user = sessionData.session.user;

    await supabase
      .from("credit_card_settings")
      .upsert({ user_id: user.id, closing_day: Number(closingDay), due_day: Number(dueDay) }, { onConflict: "user_id" });

    setIsClosingModalOpen(false);
  }

  function handleCSVUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function (results) {
        const { data } = results;
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session.user;

        const parseAmount = (v) => {
          if (v === undefined || v === null) return 0;
          let s = String(v).trim();
          // remove currency symbols and spaces, keep digits, dot, comma and minus
          s = s.replace(/[^0-9.,\-]/g, "");
          const hasDot = s.indexOf(".") !== -1;
          const hasComma = s.indexOf(",") !== -1;
          if (hasComma && !hasDot) {
            // format like '123,45' -> '123.45'
            s = s.replace(/,/g, ".");
          } else if (hasDot && hasComma) {
            // format like '1.234,56' -> remove thousand separators and convert decimal comma
            s = s.replace(/\./g, "").replace(/,/g, ".");
          }
          const n = parseFloat(s);
          return Number.isFinite(n) ? n : 0;
        };

        const mapped = data.map((row) => ({
          title: row.title || "-",
          amount: parseAmount(row.amount),
          created_at: row.date || new Date().toISOString(),
          user_id: user.id,
        }));

        // keep only positive amounts (values that go to the invoice)
        const transactions = mapped.filter((t) => Number(t.amount) > 0);

        if (transactions.length === 0) {
          console.warn("Nenhuma transação positiva encontrada no CSV. Nenhum registro será importado.");
        } else {
          await supabase.from("credit_card_transactions").insert(transactions);
        }

        loadData();
      },
      error: function (err) {
        console.error("Erro ao ler CSV:", err);
      },
    });
  }

  function generatePDF() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Extrato de Compras do Cartão", 14, 20);

    const tableData = purchases.map((p) => [
      p.title || "-",
      p.merchant || "-",
      p.category || "-",
      `R$ ${Number(p.amount).toFixed(2)}`,
      p.created_at ? new Date(p.created_at).toLocaleDateString() : "-",
    ]);

    autoTable(doc, {
      startY: 30,
      head: [["Título", "Estabelecimento", "Categoria", "Valor", "Data"]],
      body: tableData,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [255, 206, 0], textColor: 0 },
    });

    const total = purchases.reduce((sum, p) => sum + Number(p.amount), 0);
    const finalY = doc.lastAutoTable.finalY + 10 || 50;
    doc.setFontSize(12);
    doc.text(`Total Compras: R$ ${total.toFixed(2)}`, 14, finalY);

    doc.save("extrato_cartao.pdf");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-slate-800">Cartão de Crédito</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
              <span>Fatura: R$ {total.toFixed(2)}</span>
              <span className="text-slate-300">•</span>
              <span>Fechamento dia {effectiveClosingDay}</span>
              <span className="text-slate-300">•</span>
              <span>Vencimento dia {effectiveDueDay}</span>
            </div>

            {/* Seletor de cartões */}
            {userCards.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => setSelectedCardId(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    selectedCardId === null
                      ? "bg-primary-600 text-white border-primary-600"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Todos
                </button>
                {userCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => setSelectedCardId(card.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      selectedCardId === card.id
                        ? "bg-primary-600 text-white border-primary-600"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {card.name}{card.last_four ? ` •••• ${card.last_four}` : ""}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={`${filterYear}-${filterMonth}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-").map(Number);
                setFilterYear(y);
                setFilterMonth(m);
              }}
              className="border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {ccMonthsAvailable.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
            <button onClick={openAddModal} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
              + Nova Compra
            </button>
            <button onClick={generatePDF} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition">
              PDF
            </button>
            <button onClick={() => setIsClosingModalOpen(true)} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition">
              Configurar Fechamento
            </button>
            <label className="bg-slate-800 text-white hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition">
              CSV
              <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Compras registradas</h3>
                <p className="text-xs text-slate-500">Organizadas da mais recente para a mais antiga.</p>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{purchases.length} itens</span>
            </div>

            <ul className="divide-y divide-slate-100">
              {purchases.length === 0 && (
                <li className="p-8 text-center text-slate-400">
                  <p className="font-medium">Nenhuma compra registrada</p>
                  <p className="text-sm mt-1">Adicione uma nova ou importe um CSV</p>
                </li>
              )}
              {purchases.map((p) => (
                <li key={p.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 hover:bg-slate-50 transition group">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary-50 text-primary-600 font-semibold flex items-center justify-center text-sm border border-primary-100">
                      {p.title ? p.title.charAt(0).toUpperCase() : "-"}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{p.title}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1 text-xs text-slate-500">
                        <span className="px-2 py-0.5 rounded bg-slate-100">{p.merchant || "-"}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-100">{p.category || "-"}</span>
                        <span>{p.created_at ? new Date(p.created_at).toLocaleDateString() : "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {(() => {
                      const isCharge = Number(p.amount || 0) > 0;
                      const amt = Math.abs(Number(p.amount || 0)).toFixed(2);
                      return (
                        <span className={`font-medium text-sm px-3 py-1 rounded-lg ${isCharge ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                          {isCharge ? "+" : "-"} R$ {amt}
                        </span>
                      );
                    })()}
                    <button onClick={() => openEditModal(p)} className="text-slate-400 hover:text-primary-600 transition opacity-0 group-hover:opacity-100" aria-label="Editar compra">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="text-slate-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100" aria-label="Apagar compra">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0H7m4-3h2a1 1 0 011 1v1H10V5a1 1 0 011-1z" /></svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="lg:col-span-1 space-y-4">
          {/* Invoice summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">Total desta fatura</p>
            <p className="text-2xl font-semibold text-slate-800 mt-1">R$ {total.toFixed(2)}</p>
            <div className="mt-3 space-y-1 text-xs text-slate-500">
              <p>{count} compras • Média R$ {average.toFixed(2)}</p>
              <p>Média mês R$ {monthlyAverage.toFixed(2)}</p>
            </div>
            <div className="mt-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 text-center font-medium">
              Fechamento {effectiveClosingDay} • Vencimento {effectiveDueDay}
            </div>
          </div>

          {/* Merchant recurrence */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-slate-700">Estabelecimentos recorrentes</h4>
              <select
                aria-label="Filtrar estabelecimentos por mês"
                value={merchantMonthFilter}
                onChange={(e) => setMerchantMonthFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option key="invoice" value="invoice">Fatura atual</option>
                <option key="all" value="all">Todos</option>
                {monthOptions.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={merchantCounts} margin={{ top: 10, right: 10, left: 0, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-45} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <ReTooltip
                    formatter={(value) => [`${value} compras`, "Total:"]}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: 'none' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="count" position="top" fontSize={10} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Yearly chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-slate-700">Gastos no ano</h4>
              <select
                aria-label="Selecionar ano"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 5, right: 8, left: 6, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="month" interval={0} padding={{ left: 10, right: 10 }} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickFormatter={(v) => {
                      const n = Number(v);
                      if (Math.abs(n) >= 1000) return `R$ ${(n / 1000).toFixed(0)}K`;
                      return `R$ ${n}`;
                    }}
                  />
                  <ReTooltip
                    formatter={(v) => `R$ ${Number(v).toFixed(2)}`}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: 'none' }}
                  />
                  <Bar dataKey="total" fill="#f87171" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="total" position="top" fontSize={10} formatter={(v) => (Number(v) >= 1000 ? `${(v / 1000).toFixed(1)}K` : `R$ ${Number(v).toFixed(0)}`)} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </aside>
      </section>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] px-4">
          <div className="w-full max-w-md bg-white rounded-xl p-6 shadow-lg border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-1">
              {editingPurchase ? "Editar compra" : "Nova compra"}
            </h2>
            <p className="text-sm text-slate-500 mb-5">Preencha os dados da compra do cartão.</p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Título</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Valor</label>
                <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Estabelecimento</label>
                <input type="text" value={merchant} onChange={(e) => setMerchant(e.target.value)} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Categoria</label>
                <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Data da compra</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" required />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Closing day modal */}
      {isClosingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] px-4">
          <div className="w-full max-w-sm bg-white rounded-xl p-6 shadow-lg border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Configurar dia de fechamento</h3>
            <p className="text-sm text-slate-500 mb-4">Escolha o dia do mês em que sua fatura fecha (1-31).</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Dia do fechamento</label>
                <input type="number" min={1} max={31} value={closingDay} onChange={(e) => setClosingDay(Number(e.target.value))} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Dia do vencimento</label>
                <input type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(Number(e.target.value))} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
              <button onClick={() => setIsClosingModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition">Cancelar</button>
              <button onClick={saveClosingDay} className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}