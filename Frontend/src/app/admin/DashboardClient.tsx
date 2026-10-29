"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CreditCard,
  DollarSign,
  Ellipsis,
  RefreshCw,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";
import { useAuth } from "@/auth/AuthProvider";

type Period = "7d" | "30d" | "12m";
type PaymentStatus = "Succeeded" | "Pending" | "Failed" | "Refunded";


type Transaction = {
  id: string;
  transactionId?: string;
  orderId?: string;
  customer: string;
  initials: string;
  email: string;
  date: string;
  timestamp: number;
  method: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentDetails?: Record<string, unknown> | null;
};

type ApiTransaction = {
  id?: string;
  transactionId?: string;
  orderId?: string;
  customer?: string;
  initials?: string;
  email?: string;
  date?: string;
  timestamp?: number;
  method?: string;
  amount?: number;
  currency?: string;
  status?: string;
  paymentDetails?: Record<string, unknown> | null;
};

function StatusBadge({ status }: { status: PaymentStatus }) {
  const styles: Record<PaymentStatus, string> = {
    Succeeded: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    Pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
    Failed: "bg-red-50 text-red-700 ring-red-600/20",
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

function SalesChart({
  period,
  data,
}: {
  period: Period;
  data: SalesPoint[];
}) {
  const labels = data.map((point) => point.label);
  const values = data.map((point) => point.value);
  const width = 640;
  const height = 230;
  const left = 42;
  const right = 12;
  const top = 16;
  const bottom = 30;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  const safeValues = values.map((value) => Math.max(0, value));
  const maxValue = Math.max(1, Math.ceil(Math.max(...safeValues, 0) / 5000) * 5000);

  const points = safeValues.map((value, index) => ({
    x: left + (index / Math.max(safeValues.length - 1, 1)) * chartWidth,
    y: top + chartHeight - (value / maxValue) * chartHeight,
    value,
  }));

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${top + chartHeight} L ${points[0].x} ${top + chartHeight} Z`
      : "";

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center justify-between text-xs text-gray-400">
        <span>Revenue (EGP)</span>
        <span>Live transaction data</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Sales revenue chart for the selected ${period} period`}
        className="w-full overflow-visible"
      >
        <defs>
          <linearGradient id="sales-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3, 4].map((tick) => {
          const y = top + (chartHeight * tick) / 4;
          const value = maxValue * (1 - tick / 4);

          return (
            <g key={tick}>
              <line
                x1={left}
                x2={width - right}
                y1={y}
                y2={y}
                stroke="#e5e7eb"
                strokeDasharray="4 5"
              />
              <text x={left - 8} y={y + 4} fontSize="10" fill="#9ca3af" textAnchor="end">
                {value >= 1000 ? `${value / 1000}k` : value}
              </text>
            </g>
          );
        })}

        {points.length > 0 && (
          <>
            <path d={areaPath} fill="url(#sales-fill)" />
            <path
              d={linePath}
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {points.map((point, index) => (
          <g key={labels[index]}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="white"
              stroke="#8b5cf6"
              strokeWidth="2"
            >
              <title>{`${labels[index]}: ${money(point.value)}`}</title>
            </circle>
            <text
              x={point.x}
              y={height - 7}
              fontSize="10"
              fill="#9ca3af"
              textAnchor="middle"
            >
              {labels[index]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}


function normalizeStatus(status?: string): PaymentStatus {
  switch (status?.toUpperCase()) {
    case "COMPLETED":
    case "CAPTURED":
    case "SUCCEEDED":
    case "SUCCESS":
      return "Succeeded";

    case "FAILED":
    case "DECLINED":
    case "ERROR":
      return "Failed";

    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return "Refunded";

    default:
      return "Pending";
  }
}

function toTimestamp(date?: string, timestamp?: number): number {
  if (typeof timestamp === "number" && Number.isFinite(timestamp)) {
    // Support either milliseconds or Unix seconds.
    return timestamp < 100_000_000_000
      ? timestamp * 1000
      : timestamp;
  }

  if (date) {
    const parsed = Date.parse(date);
    if (Number.isFinite(parsed)) return parsed;
  }

  return 0;
}

function mapTransaction(item: ApiTransaction): Transaction {
  const timestamp = toTimestamp(item.date, item.timestamp);
  const paymentDetails = item.paymentDetails ?? {};

  const customer = item.customer || "Unknown customer";
  const initials = item.initials ||
    customer
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");

  const transactionId =
    item.transactionId ||
    (typeof paymentDetails.transactionId === "string"
      ? paymentDetails.transactionId
      : undefined);

  return {
    id: transactionId || item.id || item.orderId || "Unknown transaction",
    transactionId,
    orderId: item.orderId,
    customer,
    initials,
    email: item.email || "—",
    date: timestamp
      ? new Date(timestamp).toLocaleString()
      : item.date || "—",
    timestamp,
    method: item.method || "Unknown",
    amount: Number(item.amount ?? 0),
    currency: item.currency || "EGP",
    status: normalizeStatus(item.status),
    paymentDetails,
  };
}

type SalesPoint = {
  label: string;
  value: number;
};

function money(value: number, currency = "EGP") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function DashboardClient() {
  const [period, setPeriod] = useState<Period>("30d");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { getToken } = useAuth();


  const now = Date.now();

  const periodStart = {
    "7d": now - 7 * 24 * 60 * 60 * 1000,
    "30d": now - 30 * 24 * 60 * 60 * 1000,
    "12m": new Date(
      new Date(now).getFullYear(),
      new Date(now).getMonth() - 11,
      1,
    ).getTime(),
  }[period];

  const periodTransactions = transactions.filter(
    (transaction) =>
      transaction.timestamp >= periodStart &&
      transaction.timestamp <= now,
  );

  const successfulTransactions = periodTransactions.filter(
    (transaction) => transaction.status === "Succeeded",
  );

  const pendingTransactions = periodTransactions.filter(
    (transaction) => transaction.status === "Pending",
  );

  const failedTransactions = periodTransactions.filter(
    (transaction) => transaction.status === "Failed",
  );

  const refundedTransactions = periodTransactions.filter(
    (transaction) => transaction.status === "Refunded",
  );

  const revenue = successfulTransactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );

  const refunded = refundedTransactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );

  const stats = {
    revenue,
    transactions: periodTransactions.length,
    successful: successfulTransactions.length,
    pending: pendingTransactions.length,
    failed: failedTransactions.length,
    refundedCount: refundedTransactions.length,
    refunded,
  };

  const statusCounts = [
    {
      label: "Succeeded",
      count: stats.successful,
      color: "bg-emerald-500",
      text: "text-emerald-700",
    },
    {
      label: "Pending",
      count: stats.pending,
      color: "bg-amber-500",
      text: "text-amber-700",
    },
    {
      label: "Failed",
      count: stats.failed,
      color: "bg-red-500",
      text: "text-red-700",
    },
    {
      label: "Refunded",
      count: stats.refundedCount,
      color: "bg-gray-400",
      text: "text-gray-600",
    },
  ];

  const totalAttempts = statusCounts.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  const recentTransactions = [...periodTransactions]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  const methodTotals = new Map<string, number>();

  for (const transaction of successfulTransactions) {
    const method = transaction.method || "Unknown";

    methodTotals.set(
      method,
      (methodTotals.get(method) ?? 0) + transaction.amount,
    );
  }

  const paymentMethods = [...methodTotals.entries()]
    .map(([name, amount]) => ({
      name,
      amount,
      share: revenue > 0 ? (amount / revenue) * 100 : 0,
      color: "bg-violet-500",
    }))
    .sort((a, b) => b.amount - a.amount);

  const chartData = buildSalesData(
    successfulTransactions,
    period,
    now,
  );

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
          throw new Error(
            `Could not load dashboard transactions (${response.status})`,
          );
        }

        const data: ApiTransaction[] = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Unexpected transaction API response.");
        }

        setTransactions(data.map(mapTransaction));
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load transactions.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadTransactions();

    return () => controller.abort();
  }, [getToken]);


  useEffect(() => {
    if (!selectedTransaction) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedTransaction(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedTransaction]);

  const cards = [
    {
      label: "Total revenue",
      value: money(stats.revenue),
      detail: "Successful payments, before refunds",
      icon: DollarSign,
      iconClass: "bg-violet-50 text-violet-700",
    },
    {
      label: "Transactions",
      value: stats.transactions.toLocaleString("en-US"),
      detail: "All payment attempts",
      icon: CreditCard,
      iconClass: "bg-blue-50 text-blue-700",
    },
    {
      label: "Successful payments",
      value: stats.successful.toLocaleString("en-US"),
      detail: `${
        stats.transactions > 0
          ? ((stats.successful / stats.transactions) * 100).toFixed(1)
          : "0.0"
      }% success rate`,
      icon: ShoppingBag,
      iconClass: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Refunded amount",
      value: money(stats.refunded),
      detail: "Total refunds in this period",
      icon: RefreshCw,
      iconClass: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500">
            Here&apos;s what&apos;s happening with your store today.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-gray-400 sm:inline">
            {loading ? "Loading..." : error ? "Data unavailable" : "Live data"}
          </span>
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as Period)}
            aria-label="Dashboard reporting period"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="12m">Last 12 months</option>
          </select>
        </div>
      </div>

      {/* KPI cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">{card.label}</p>
                  <p className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
                    {card.value}
                  </p>
                </div>
                <div className={`rounded-xl p-2.5 ${card.iconClass}`}>
                  <Icon size={21} />
                </div>
              </div>

              <div className="mt-4">
                <span className="text-xs font-medium text-violet-700">
                  Selected period
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500">{card.detail}</p>
            </div>
          );
        })}
      </section>

      {/* Main chart and payment status */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-900">Sales overview</h3>
              <p className="mt-1 text-sm text-gray-500">
                Revenue generated from successful payments
              </p>
            </div>
            <span className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700">
              {period === "7d" ? "Daily" : period === "30d" ? "Last 30 days" : "Monthly"}
            </span>
          </div>

          <SalesChart period={period} data={chartData} />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <div>
              <p className="text-xs text-gray-500">Revenue in selected period</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{money(stats.revenue)}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
              Sales revenue
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h3 className="font-semibold text-gray-900">Payment status</h3>
            <p className="mt-1 text-sm text-gray-500">Transaction outcome breakdown</p>
          </div>

          <div className="mt-6 space-y-5">
            {statusCounts.map((status) => {
              const percentage =
                totalAttempts > 0 ? (status.count / totalAttempts) * 100 : 0;

              return (
                <div key={status.label}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${status.color}`} />
                      <span className="text-sm text-gray-600">{status.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {status.count.toLocaleString("en-US")}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${status.color}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className={`mt-1 text-right text-xs ${status.text}`}>
                    {percentage.toFixed(1)}%
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-lg bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Total attempts</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {totalAttempts.toLocaleString("en-US")}
            </p>
          </div>
        </div>
      </section>

      {/* Recent transactions and payment methods */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-5">
            <div>
              <h3 className="font-semibold text-gray-900">Recent transactions</h3>
              <p className="mt-1 text-sm text-gray-500">Latest payment activity</p>
            </div>
            <Link
              href="/admin/transactions"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-violet-700 hover:text-violet-900"
            >
              View all <ArrowRight size={15} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Payment method</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-gray-500">
                      Loading transactions...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-red-600">
                      {error}
                    </td>
                  </tr>
                ) : recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-gray-500">
                      No transactions found for this period.
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-xs font-semibold text-violet-700">
                          {transaction.initials}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{transaction.customer}</p>
                          <p className="mt-0.5 text-xs text-gray-500">{transaction.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{transaction.method}</td>
                    <td className="px-5 py-4 text-right font-semibold tabular-nums text-gray-900">
                      {money(transaction.amount, transaction.currency)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={transaction.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        aria-label={`View transaction ${transaction.id}`}
                        onClick={() => setSelectedTransaction(transaction)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-800"
                      >
                        <Ellipsis size={19} />
                      </button>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400">
            {loading
              ? "Loading transactions..."
              : error
                ? "Transactions could not be loaded"
                : `Showing ${recentTransactions.length} recent transactions`}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div>
            <h3 className="font-semibold text-gray-900">Payment methods</h3>
            <p className="mt-1 text-sm text-gray-500">Revenue by payment provider</p>
          </div>

          <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-gray-100">
            {paymentMethods.map((method) => (
              <div
                key={method.name}
                className={method.color}
                style={{ width: `${method.share}%` }}
                title={`${method.name}: ${method.share}%`}
              />
            ))}
          </div>

          <div className="mt-6 space-y-5">
            {paymentMethods.map((method) => (
              <div key={method.name} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-sm ${method.color}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{method.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{method.share}% of revenue</p>
                  </div>
                </div>
                <span className="text-sm font-semibold tabular-nums text-gray-900">
                  {money(method.amount)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-dashed border-gray-200 p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Wallet size={16} />
              <span>Based on successful payments in the selected period</span>
            </div>
          </div>
        </div>
      </section>

      {/* Transaction detail dialog */}
      {selectedTransaction && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedTransaction(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-dialog-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Transaction details
                </p>
                <h3
                  id="transaction-dialog-title"
                  className="mt-1 text-lg font-bold text-gray-900"
                >
                  {selectedTransaction.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="rounded-lg px-3 py-1 text-sm text-gray-500 hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-xl bg-gray-50 p-4">
              <div>
                <p className="text-sm text-gray-500">Transaction amount</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {money(selectedTransaction.amount, selectedTransaction.currency)}
                </p>
              </div>
              <StatusBadge status={selectedTransaction.status} />
            </div>

            <dl className="mt-5 divide-y divide-gray-100">
              {[
                ["Customer", selectedTransaction.customer],
                ["Email", selectedTransaction.email],
                ["Payment method", selectedTransaction.method],
                ["Date", selectedTransaction.date],
                ["Transaction ID", selectedTransaction.transactionId ?? selectedTransaction.id],
                ["Order ID", selectedTransaction.orderId ?? "—"],
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

              {selectedTransaction.paymentDetails &&
                Object.keys(selectedTransaction.paymentDetails).length > 0 ? (
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {Object.entries(selectedTransaction.paymentDetails).map(
                    ([key, value]) => (
                      <div key={key} className="min-w-0 rounded-lg border p-3">
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
                <p className="text-sm text-gray-500">
                  No payment details were returned for this transaction.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildSalesData(
  transactions: Transaction[],
  period: Period,
  now: number,
): SalesPoint[] {
  const bucketCount = period === "7d" ? 7 : period === "30d" ? 30 : 12;
  const buckets = new Map<string, SalesPoint>();

  for (let i = bucketCount - 1; i >= 0; i--) {
    const date = new Date(now);

    if (period === "12m") {
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      date.setMonth(date.getMonth() - i);

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1,
      ).padStart(2, "0")}`;

      buckets.set(key, {
        label: date.toLocaleDateString("en-US", { month: "short" }),
        value: 0,
      });
    } else {
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");

      buckets.set(key, {
        label:
          period === "7d"
            ? date.toLocaleDateString("en-US", { weekday: "short" })
            : date.toLocaleDateString("en-US", {
              month: "numeric",
              day: "numeric",
            }),
        value: 0,
      });
    }
  }

  for (const transaction of transactions) {
    if (
      transaction.status !== "Succeeded" ||
      transaction.timestamp <= 0
    ) {
      continue;
    }

    const date = new Date(transaction.timestamp);

    const key =
      period === "12m"
        ? `${date.getFullYear()}-${String(
          date.getMonth() + 1,
        ).padStart(2, "0")}`
        : [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0"),
        ].join("-");

    const bucket = buckets.get(key);

    if (bucket) {
      bucket.value += transaction.amount;
    }
  }

  return [...buckets.values()];
}