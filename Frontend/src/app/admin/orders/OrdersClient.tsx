"use client";

import type {
  ApiOrder,
  Order,
  OrderStatus,
  PaymentStatus,
} from "@/types/admin-order"; import { mapApiOrder } from "@/lib/map-api-order";
import { requestAdminOrders } from "@/lib/admin-orders-api";
import { useAuth } from "@/auth/AuthProvider";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Ellipsis,
  Search,
  ShoppingCart,
} from "lucide-react";


// ---------- Helpers ----------
const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const subtotal = (o: Order) =>
  o.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
const total = (o: Order) => subtotal(o) + o.shipping;
const itemCount = (o: Order) => o.items.reduce((sum, item) => sum + item.quantity, 0);

const PAGE_SIZES = [10, 20, 50];
const ALL_STATUSES: OrderStatus[] = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
const STATUS_TABS: ("All" | OrderStatus)[] = ["All", ...ALL_STATUSES];

const ORDER_BADGE: Record<OrderStatus, string> = {
  Pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Processing: "bg-blue-50 text-blue-700 ring-blue-600/20",
  Shipped: "bg-violet-50 text-violet-700 ring-violet-600/20",
  Delivered: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Cancelled: "bg-gray-100 text-gray-600 ring-gray-500/20",
};

const PAYMENT_BADGE: Record<PaymentStatus, string> = {
  Paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Failed: "bg-red-50 text-red-700 ring-red-600/20",
  Refunded: "bg-gray-100 text-gray-600 ring-gray-500/20",
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function getPageNumbers(current: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(totalPages - 1, current + 1);
  if (left > 2) pages.push("…");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < totalPages - 1) pages.push("…");
  pages.push(totalPages);
  return pages;
}

function exportCsv(rows: Order[]) {
  const header = ["Order", "Customer", "Email", "Date", "Items", "Total", "Payment", "Status"];
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = rows.map((o) =>
    [o.displayId, o.customer, o.email, o.date,
    itemCount(o), total(o).toFixed(2), o.payment, o.status]
      .map(escape)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "orders.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Page ----------
export default function OrdersClient() {

  const { getToken } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setLoading(true);
      setError(null);

      try {
        const token = await getToken();

        if (!token) {
          throw new Error("You are not authenticated. Please sign in again.");
        }

        const data = await requestAdminOrders<ApiOrder[]>(
          "/orders/",
          token
        );

        if (!cancelled) {
          setOrders(data.map(mapApiOrder));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load orders."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, [getToken, refreshKey]);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | OrderStatus>("All");
  const [payment, setPayment] = useState<"all" | PaymentStatus>("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = orders.find((o) => o.id === selectedId) ?? null;

  const baseRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesQuery =
        !q ||
        [o.id, o.customer, o.email, ...o.items.map((i) => i.title)]
          .join(" ")
          .toLowerCase()
          .includes(q);
      const matchesPayment = payment === "all" || o.payment === payment;
      return matchesQuery && matchesPayment;
    });
  }, [orders, query, payment]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { All: baseRows.length };
    for (const o of baseRows) counts[o.status] = (counts[o.status] ?? 0) + 1;
    return counts;
  }, [baseRows]);

  const filtered = useMemo(
    () =>
      baseRows
        .filter((o) => status === "All" || o.status === status)
        .sort((a, b) => b.timestamp - a.timestamp),
    [baseRows, status],
  );

  const summary = useMemo(() => {
    const active = filtered.filter((o) => o.status !== "Cancelled" && o.payment === "Paid");
    return {
      needsAction: filtered.filter((o) => o.status === "Pending" || o.status === "Processing")
        .length,
      revenue: active.reduce((s, o) => s + total(o), 0),
      delivered: filtered.filter((o) => o.status === "Delivered").length,
    };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);
  const from = filtered.length === 0 ? 0 : start + 1;
  const to = Math.min(start + pageSize, filtered.length);

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelectedId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  function updateStatus(id: string, next: OrderStatus) {
    // TODO: call your PATCH endpoint here before updating local state
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: next } : o)));
  }

  const reset = () => setPage(1);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      {/* Heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Orders</h2>
          <p className="mt-1 text-sm text-gray-500">
            Track and fulfil your customers&apos; orders.
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
          { label: "Matching orders", value: filtered.length.toLocaleString("en-US") },
          { label: "Needs action", value: summary.needsAction.toLocaleString("en-US") },
          { label: "Delivered", value: summary.delivered.toLocaleString("en-US") },
          { label: "Paid order value", value: money(summary.revenue) },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-gray-500">{card.label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{card.value}</p>
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
              placeholder="Search by order ID, customer, email, or product"
              aria-label="Search orders"
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
          </div>
          <select
            value={payment}
            onChange={(e) => {
              setPayment(e.target.value as "all" | PaymentStatus);
              reset();
            }}
            aria-label="Filter by payment status"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          >
            <option value="all">All payment statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Payment pending</option>
            <option value="Failed">Payment failed</option>
            <option value="Refunded">Refunded</option>
          </select>
        </div>


        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading orders...
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="mb-4 text-red-600">{error}</p>

            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              className="rounded-md border px-4 py-2"
            >
              Retry
            </button>
          </div>
        ) : (
          // Keep your existing orders table JSX here.
          <div>
            {/* Your existing table */}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Order</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Payment</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageItems.map((o) => (
                <tr key={o.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-900">{o.displayId}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {itemCount(o)} {itemCount(o) === 1 ? "item" : "items"}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-xs font-semibold text-violet-700">
                        {o.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{o.customer}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-500">{o.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-gray-600">{o.date}</td>
                  <td className="px-5 py-4 text-right font-semibold tabular-nums text-gray-900">
                    {money(total(o))}
                  </td>
                  <td className="px-5 py-4">
                    <Badge label={o.payment} className={PAYMENT_BADGE[o.payment]} />
                  </td>
                  <td className="px-5 py-4">
                    <Badge label={o.status} className={ORDER_BADGE[o.status]} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      aria-label={`View order ${o.displayId}`}
                      onClick={() => setSelectedId(o.id)}
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
              <ShoppingCart className="h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm font-medium text-gray-900">No orders found</p>
              <p className="text-sm text-gray-500">Try a different search or clear your filters.</p>
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

      {/* Order detail dialog */}
      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedId(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-dialog-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Order details
                </p>
                <h3 id="order-dialog-title" className="mt-1 text-lg font-bold text-gray-900">
                  {selected.displayId}
                </h3>
                <p className="mt-1 text-xs text-gray-500">{selected.date}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-lg px-3 py-1 text-sm text-gray-500 hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            {/* Status control */}
            <div className="mt-5 flex flex-col gap-3 rounded-xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-gray-500">Payment</p>
                <div className="mt-1">
                  <Badge label={selected.payment} className={PAYMENT_BADGE[selected.payment]} />
                </div>
              </div>
              <div>
                <label htmlFor="order-status" className="text-xs text-gray-500">
                  Order status
                </label>
                <select
                  id="order-status"
                  value={selected.status}
                  onChange={(e) => updateStatus(selected.id, e.target.value as OrderStatus)}
                  className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Items */}
            <h4 className="mt-6 text-sm font-semibold text-gray-900">Items</h4>
            <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-100">
              {selected.items.map((item, i) => (
                <li key={i} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {item.color} · Size {item.size} · Qty {item.quantity}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                    {money(item.price * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Subtotal</dt>
                <dd className="tabular-nums text-gray-900">{money(subtotal(selected))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Shipping</dt>
                <dd className="tabular-nums text-gray-900">{money(selected.shipping)}</dd>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold">
                <dt className="text-gray-900">Total</dt>
                <dd className="tabular-nums text-gray-900">{money(total(selected))}</dd>
              </div>
            </dl>

            {/* Customer */}
            <h4 className="mt-6 text-sm font-semibold text-gray-900">Customer</h4>
            <dl className="mt-2 divide-y divide-gray-100">
              {[
                ["Name", selected.customer],
                ["Email", selected.email],
                ["Shipping address", selected.address],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:justify-between">
                  <dt className="text-sm text-gray-500">{label}</dt>
                  <dd className="break-words text-sm font-medium text-gray-900 sm:text-right">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              This is sample data. Status changes are only kept in this browser session until
              you connect your backend.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}