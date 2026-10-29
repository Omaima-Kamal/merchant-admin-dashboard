"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Ellipsis,
  Receipt,
  Search,
} from "lucide-react";

import { useAuth } from "@/auth/AuthProvider";

import { API_ENDPOINTS } from "@/lib/api";
type PaymentStatus =
  | "Authorized"
  | "Captured"
  | "Succeeded"
  | "Pending"
  | "Failed"
  | "Refunded"
  | "Declined";

type Transaction = {
  id: string;
  customer: string;
  initials: string;
  email: string;
  date: string;
  timestamp: number;
  method: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  transactionId?: string;
  orderId?: string;
  paymentDetails?: Record<string, unknown> | null;
  refundedAmount?: number;
};


const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Deterministic so server and client render identically.
const BASE = Date.UTC(2026, 9, 11, 10, 42); // Oct 11, 2026 10:42 UTC

function formatDate(ts: number) {
  const d = new Date(ts);
  const h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} · ${String(h12).padStart(2, "0")}:${m} ${h >= 12 ? "PM" : "AM"}`;
}

// ---------- Helpers ----------
const money = (value: number, currency = "EGP") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);

function formatTransactionDate(timestamp: number) {
  if (!timestamp) return "—";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

const PAGE_SIZES = [10, 20, 50];
const STATUS_TABS: ("All" | PaymentStatus)[] = [
  "All",
  "Authorized",
  "Captured",
  "Succeeded",
  "Pending",
  "Failed",
  "Refunded",
];

function StatusBadge({ status }: { status: PaymentStatus }) {
  const styles: Record<PaymentStatus, string> = {
    Authorized: "bg-blue-50 text-blue-700 ring-blue-600/20",
    Captured: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    Succeeded: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    Pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
    Failed: "bg-red-50 text-red-700 ring-red-600/20",
    Declined: "bg-red-50 text-red-700 ring-red-600/20",
    Refunded: "bg-gray-100 text-gray-600 ring-gray-500/20",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) pages.push("…");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

function exportCsv(rows: Transaction[]) {
  const header = ["ID", "Customer", "Email", "Date", "Method", "Amount", "Status"];
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = rows.map((t) =>
    [t.id, t.customer, t.email, t.date, t.method, t.amount.toFixed(2), t.status]
      .map(escape)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "transactions.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Page ----------
export default function TransactionsClient() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | PaymentStatus>("All");
  const [method, setMethod] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();
  type TransactionAction = "capture" | "release" | "refund";

  const [action, setAction] = useState<TransactionAction | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTransactions() {
      try {
        setLoading(true);
        setError(null);

        const token = await getToken();

        if (!token) {
          throw new Error("No Keycloak access token available.");
        }

        const response = await fetch(API_ENDPOINTS.transactions, {
          method: "GET",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Could not load transactions (${response.status})`);
        }

        const data = await response.json();
        setTransactions(data);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadTransactions();

    return () => controller.abort();
  }, []);

  const methods = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.method))).sort(),
    [],
  );

  const baseRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      const matchesQuery =
        !q ||
        [t.id, t.customer, t.email, t.method].join(" ").toLowerCase().includes(q);
      const matchesMethod = method === "all" || t.method === method;
      return matchesQuery && matchesMethod;
    });
  }, [transactions, query, method]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { All: baseRows.length };
    for (const t of baseRows) counts[t.status] = (counts[t.status] ?? 0) + 1;
    return counts;
  }, [baseRows]);

  const filtered = useMemo(
    () =>
      baseRows
        .filter((t) => status === "All" || t.status === status)
        .sort((a, b) => b.timestamp - a.timestamp),
    [baseRows, status],
  );

  const summary = useMemo(() => {
    const succeeded = filtered.filter((t) => t.status === "Succeeded");
    const refunded = filtered.filter((t) => t.status === "Refunded");
    return {
      volume: succeeded.reduce((s, t) => s + t.amount, 0),
      refunded: refunded.reduce((s, t) => s + t.amount, 0),
      successRate: filtered.length ? (succeeded.length / filtered.length) * 100 : 0,
    };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);
  const from = filtered.length === 0 ? 0 : start + 1;
  const to = Math.min(start + pageSize, filtered.length);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const reset = () => setPage(1);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      {/* Heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Transactions</h2>
          <p className="mt-1 text-sm text-gray-500">
            All payment attempts across your store.
          </p>
        </div>
        <button
          type="button"
          onClick={() => exportCsv(filtered)}
          disabled={filtered.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Summary (reflects current filters) */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Matching transactions", value: filtered.length.toLocaleString("en-US") },
          { label: "Successful volume", value: money(summary.volume) },
          { label: "Success rate", value: `${summary.successRate.toFixed(1)}%` },
          { label: "Refunded amount", value: money(summary.refunded) },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-gray-500">{card.label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
              {card.value}
            </p>
          </div>
        ))}
      </section>

      <div className="min-w-0 rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Status tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-gray-100 px-3 pt-3">
          {STATUS_TABS.map((tab) => {
            const active = status === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setStatus(tab);
                  reset();
                }}
                aria-pressed={active}
                className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition ${active
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
              >
                {tab}
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs ${active ? "bg-violet-50 text-violet-700" : "bg-gray-100 text-gray-500"
                    }`}
                >
                  {tabCounts[tab] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                reset();
              }}
              placeholder="Search by ID, customer, email, or method"
              aria-label="Search transactions"
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
          </div>
          <select
            value={method}
            onChange={(e) => {
              setMethod(e.target.value);
              reset();
            }}
            aria-label="Filter by payment method"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          >
            <option value="all">All payment methods</option>
            {methods.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <p className="p-6 text-sm text-gray-500">
            Loading transactions...
          </p>
        )}

        {error && (
          <div className="m-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="ml-3 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Payment method</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageItems.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-xs font-semibold text-violet-700">
                        {t.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{t.customer}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{t.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-gray-600">{formatTransactionDate(t.timestamp)}</td>
                  <td className="px-5 py-4 text-gray-600">{t.method}</td>
                  <td className="px-5 py-4 text-right font-semibold tabular-nums text-gray-900">
                    {money(t.amount, t.currency)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      aria-label={`View transaction ${t.id}`}
                      onClick={() => setSelected(t)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-800"
                    >
                      <Ellipsis size={19} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pageItems.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
              <Receipt className="h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm font-medium text-gray-900">No transactions found</p>
              <p className="text-sm text-gray-500">
                Try a different search or clear your filters.
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-gray-100 p-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <p>
              Showing{" "}
              <span className="font-medium text-gray-900">
                {from}–{to}
              </span>{" "}
              of <span className="font-medium text-gray-900">{filtered.length}</span>
            </p>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                reset();
              }}
              aria-label="Rows per page"
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n} per page
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
              className="rounded-md border border-gray-200 p-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {getPageNumbers(currentPage, totalPages).map((n, i) =>
              n === "…" ? (
                <span key={`gap-${i}`} className="px-2 text-gray-400">
                  …
                </span>
              ) : (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  aria-current={n === currentPage ? "page" : undefined}
                  className={`min-w-9 rounded-md px-3 py-1.5 text-sm ${n === currentPage
                    ? "bg-violet-600 font-medium text-white"
                    : "border border-gray-200 hover:bg-gray-50"
                    }`}
                >
                  {n}
                </button>
              ),
            )}

            <button
              type="button"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
              className="rounded-md border border-gray-200 p-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail dialog */}
      {/* {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="trx-dialog-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Transaction details
                </p>
                <h3 id="trx-dialog-title" className="mt-1 text-lg font-bold text-gray-900">
                  {selected.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg px-3 py-1 text-sm text-gray-500 hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-xl bg-gray-50 p-4">
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{money(selected.amount, selected.currency)}</p>
              </div>
              <StatusBadge status={selected.status} />
            </div>

            <dl className="mt-5 divide-y divide-gray-100">
              {[
                ["Customer", selected.customer],
                ["Email", selected.email],
                ["Payment method", selected.method],
                ["Date", selected.date],
                ["Transaction ID", selected.transactionId ?? selected.id],
                ["Order ID", selected.orderId ?? "—"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between"
                >
                  <dt className="text-sm text-gray-500">{label}</dt>
                  <dd className="break-all text-sm font-medium text-gray-900 sm:text-right">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 border-t border-gray-100 pt-4">
              <h4 className="mb-3 text-sm font-semibold text-gray-900">
                Payment details
              </h4>

              {selected.paymentDetails &&
                Object.keys(selected.paymentDetails).length > 0 ? (
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {Object.entries(selected.paymentDetails).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="min-w-0 rounded-lg border border-gray-200 p-3"
                      >
                        <dt className="text-xs text-gray-500">
                          {key.replace(/([A-Z])/g, " $1")}
                        </dt>
                        <dd className="mt-1 break-words text-sm font-medium text-gray-900">
                          {value == null
                            ? "—"
                            : typeof value === "object"
                              ? JSON.stringify(value)
                              : String(value)}
                        </dd>
                      </div>
                    ),
                  )}
                </dl>
              ) : (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  No payment details were returned by the backend for this
                  transaction.
                </p>
              )}
            </div>
          </div>
        </div>
      )} */}
      {/* Detail dialog */}
      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="trx-dialog-title"
            className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
                  Transaction Detail Summary
                </p>
                <h3 id="trx-dialog-title" className="text-lg font-bold text-gray-900">
                  {selected.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {/* Amount & Status Banner */}
              <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <div>
                  <p className="text-xs font-medium text-emerald-800">Transaction Amount</p>
                  <p className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900">
                    {money(selected.amount, selected.currency)}
                  </p>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              {/* Core Identifiers */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-500">Order ID</p>
                  <p className="mt-1 break-all text-sm font-semibold text-gray-900">
                    {selected.orderId || "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-500">Transaction ID</p>
                  <p className="mt-1 break-all text-sm font-semibold text-gray-900">
                    {selected.transactionId || selected.id}
                  </p>
                </div>
              </div>

              {/* Customer Info Section */}
              <div className="rounded-xl border border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Customer Info</h4>
                <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-gray-500">Customer Name</dt>
                    <dd className="font-medium text-gray-900">{selected.customer || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Email</dt>
                    <dd className="font-medium text-gray-900">{selected.email || "—"}</dd>
                  </div>
                  <div className="sm:col-span-2 pt-2">
                    <dt className="text-xs text-gray-500">Payment Method</dt>
                    <dd className="font-medium text-gray-900">{selected.method || "—"}</dd>
                  </div>
                </dl>
              </div>

              {/* Dynamic / Nested Payment Details (Billing, Shipping, Technical) */}
              {selected.paymentDetails && Object.keys(selected.paymentDetails).length > 0 ? (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-900">Additional Details</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {Object.entries(selected.paymentDetails).map(([key, value]) => {
                      // Handle nested objects cleanly (like billingInfo or shippingInfo)
                      const isObject = value !== null && typeof value === "object";

                      return (
                        <div key={key} className="rounded-xl border border-gray-200 p-4">
                          <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                            {key.replace(/([A-Z])/g, " $1")}
                          </dt>
                          <dd className="text-sm text-gray-900">
                            {isObject ? (
                              <ul className="space-y-1.5 divide-y divide-gray-100">
                                {Object.entries(value as Record<string, unknown>).map(([subKey, subVal]) => (
                                  <li key={subKey} className="flex justify-between pt-1.5 first:pt-0">
                                    <span className="text-xs text-gray-500 capitalize">{subKey}:</span>
                                    <span className="font-medium text-gray-800 text-xs">
                                      {subVal !== null && subVal !== "" ? String(subVal) : "Not provided"}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="font-medium">{value !== null && value !== "" ? String(value) : "—"}</span>
                            )}
                          </dd>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end border-t border-gray-100 bg-gray-50 px-6 py-4 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}