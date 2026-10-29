"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Bell, Check, Copy, CreditCard, ExternalLink, Store, User } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";

// ---------- Types & defaults (load these from your API) ----------
type Settings = {
  store: {
    name: string;
    email: string;
    phone: string;
    currency: string;
    timezone: string;
    address: string;
  };
  payments: {
    card: boolean;
    valu: boolean;
    sympl: boolean;
    tabby: boolean;
    testMode: boolean;
    descriptor: string;
  };
  notifications: {
    newOrder: boolean;
    failedPayment: boolean;
    refund: boolean;
    dailySummary: boolean;
    lowStock: boolean;
    lowStockThreshold: number;
  };
};

const DEFAULTS: Settings = {
  store: {
    name: "My Store",
    email: "support@example.com",
    phone: "+20 100 000 0000",
    currency: "USD",
    timezone: "Africa/Cairo",
    address: "12 Tahrir St, Cairo, Egypt",
  },
  payments: {
    card: true,
    valu: true,
    sympl: false,
    tabby: false,
    testMode: true,
    descriptor: "MYSTORE",
  },
  notifications: {
    newOrder: true,
    failedPayment: true,
    refund: true,
    dailySummary: false,
    lowStock: true,
    lowStockThreshold: 20,
  },
};

const CURRENCIES = ["USD", "EGP", "EUR", "GBP", "SAR", "AED"];
const TIMEZONES = [
  "Africa/Cairo",
  "Europe/London",
  "Europe/Paris",
  "Asia/Riyadh",
  "Asia/Dubai",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

// Placeholder: use the real endpoint your payment backend calls.
const WEBHOOK_URL = "https://api.example.com/webhooks/payments";

type TabId = "store" | "payments" | "notifications" | "account";
const TABS: { id: TabId; label: string; icon: typeof Store }[] = [
  { id: "store", label: "Store profile", icon: Store },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "account", label: "Account", icon: User },
];

// ---------- Small UI pieces ----------
const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100";

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 ${
          checked ? "bg-violet-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

// ---------- Page ----------
export default function SettingsClient() {
  const { username, roles, logout } = useAuth();

  const [tab, setTab] = useState<TabId>("store");
  const [saved, setSaved] = useState<Settings>(DEFAULTS);
  const [form, setForm] = useState<Settings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [copied, setCopied] = useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  // Validation
  const errors: Record<string, string> = {};
  if (!form.store.name.trim()) errors.name = "Store name is required.";
  if (!/^\S+@\S+\.\S+$/.test(form.store.email)) errors.email = "Enter a valid email address.";
  if (form.notifications.lowStockThreshold < 0 || !Number.isFinite(form.notifications.lowStockThreshold))
    errors.threshold = "Enter 0 or more.";
  if (form.payments.descriptor.length > 22)
    errors.descriptor = "Statement descriptors are limited to 22 characters.";
  const hasErrors = Object.keys(errors).length > 0;

  function update<K extends keyof Settings>(section: K, patch: Partial<Settings[K]>) {
    setForm((prev) => ({ ...prev, [section]: { ...prev[section], ...patch } }));
  }

  async function handleSave() {
    if (hasErrors) return;
    setSaving(true);
    try {
      // TODO: await fetch("/your/api/settings", { method: "PUT", headers: { Authorization: `Bearer ${await getToken()}` }, body: JSON.stringify(form) })
      await new Promise((r) => setTimeout(r, 500));
      setSaved(form);
      setToast("Settings saved");
    } catch {
      setToast("Couldn't save settings");
    } finally {
      setSaving(false);
    }
  }

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // Warn before closing the tab with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  async function copyWebhook() {
    try {
      await navigator.clipboard.writeText(WEBHOOK_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setToast("Couldn't copy to clipboard");
    }
  }

  const accountUrl =
    process.env.NEXT_PUBLIC_KEYCLOAK_URL && process.env.NEXT_PUBLIC_KEYCLOAK_REALM
      ? `${process.env.NEXT_PUBLIC_KEYCLOAK_URL}/realms/${process.env.NEXT_PUBLIC_KEYCLOAK_REALM}/account`
      : null;

  const showSaveBar = tab !== "account";

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Settings</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your store, payment methods, and notifications.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Tab navigation */}
        <nav
          aria-label="Settings sections"
          className="flex shrink-0 gap-1 overflow-x-auto lg:w-56 lg:flex-col"
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                  active
                    ? "bg-violet-50 text-violet-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Panels */}
        <div className="min-w-0 flex-1 space-y-6">
          {tab === "store" && (
            <Section
              title="Store profile"
              description="Shown on receipts, emails, and your customer-facing pages."
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field id="store-name" label="Store name" error={errors.name}>
                  <input
                    id="store-name"
                    value={form.store.name}
                    onChange={(e) => update("store", { name: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field id="store-email" label="Support email" error={errors.email}>
                  <input
                    id="store-email"
                    type="email"
                    value={form.store.email}
                    onChange={(e) => update("store", { email: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field id="store-phone" label="Phone">
                  <input
                    id="store-phone"
                    type="tel"
                    value={form.store.phone}
                    onChange={(e) => update("store", { phone: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field id="store-currency" label="Currency">
                  <select
                    id="store-currency"
                    value={form.store.currency}
                    onChange={(e) => update("store", { currency: e.target.value })}
                    className={inputClass}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field id="store-timezone" label="Time zone">
                  <select
                    id="store-timezone"
                    value={form.store.timezone}
                    onChange={(e) => update("store", { timezone: e.target.value })}
                    className={inputClass}
                  >
                    {TIMEZONES.map((z) => (
                      <option key={z}>{z}</option>
                    ))}
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Field id="store-address" label="Business address">
                    <textarea
                      id="store-address"
                      rows={3}
                      value={form.store.address}
                      onChange={(e) => update("store", { address: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            </Section>
          )}

          {tab === "payments" && (
            <>
              <Section
                title="Payment methods"
                description="Choose which methods customers can use at checkout."
              >
                <div className="divide-y divide-gray-100">
                  <Toggle
                    label="Card payments"
                    description="Visa and Mastercard"
                    checked={form.payments.card}
                    onChange={(v) => update("payments", { card: v })}
                  />
                  <Toggle
                    label="ValU"
                    description="Buy now, pay later installments"
                    checked={form.payments.valu}
                    onChange={(v) => update("payments", { valu: v })}
                  />
                  <Toggle
                    label="Sympl"
                    description="Buy now, pay later installments"
                    checked={form.payments.sympl}
                    onChange={(v) => update("payments", { sympl: v })}
                  />
                  <Toggle
                    label="Tabby"
                    description="Split into 4 interest-free payments"
                    checked={form.payments.tabby}
                    onChange={(v) => update("payments", { tabby: v })}
                  />
                </div>
              </Section>

              <Section
                title="Processing"
                description="Mode, statement text, and webhook for payment events."
              >
                <div className="space-y-5">
                  <div className="-my-4">
                    <Toggle
                      label="Test mode"
                      description="No real money moves while this is on. Turn it off to go live."
                      checked={form.payments.testMode}
                      onChange={(v) => update("payments", { testMode: v })}
                    />
                  </div>

                  {!form.payments.testMode && (
                    <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                      Live mode is on. Customers will be charged real money.
                    </p>
                  )}

                  <Field
                    id="descriptor"
                    label="Statement descriptor"
                    hint="What customers see on their card statement (max 22 characters)."
                    error={errors.descriptor}
                  >
                    <input
                      id="descriptor"
                      value={form.payments.descriptor}
                      onChange={(e) => update("payments", { descriptor: e.target.value })}
                      className={inputClass}
                    />
                  </Field>

                  <Field
                    id="webhook"
                    label="Webhook endpoint"
                    hint="Your payment provider sends payment events to this URL."
                  >
                    <div className="flex gap-2">
                      <input
                        id="webhook"
                        readOnly
                        value={WEBHOOK_URL}
                        className={`${inputClass} bg-gray-50 text-gray-600`}
                      />
                      <button
                        type="button"
                        onClick={copyWebhook}
                        aria-label="Copy webhook URL"
                        className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </Field>

                  <p className="rounded-lg border border-dashed border-gray-200 p-3 text-xs leading-5 text-gray-500">
                    API secret keys are intentionally not shown here. Keep them on your server in
                    environment variables, never in browser code.
                  </p>
                </div>
              </Section>
            </>
          )}

          {tab === "notifications" && (
            <Section
              title="Email notifications"
              description={`Sent to ${form.store.email || "your support email"}.`}
            >
              <div className="divide-y divide-gray-100">
                <Toggle
                  label="New order"
                  description="When a customer places an order."
                  checked={form.notifications.newOrder}
                  onChange={(v) => update("notifications", { newOrder: v })}
                />
                <Toggle
                  label="Failed payment"
                  description="When a payment attempt is declined or errors."
                  checked={form.notifications.failedPayment}
                  onChange={(v) => update("notifications", { failedPayment: v })}
                />
                <Toggle
                  label="Refund issued"
                  description="When a refund is processed."
                  checked={form.notifications.refund}
                  onChange={(v) => update("notifications", { refund: v })}
                />
                <Toggle
                  label="Daily sales summary"
                  description="A recap of yesterday's orders and revenue."
                  checked={form.notifications.dailySummary}
                  onChange={(v) => update("notifications", { dailySummary: v })}
                />
                <Toggle
                  label="Low stock alerts"
                  description="When a product's quantity drops to the threshold."
                  checked={form.notifications.lowStock}
                  onChange={(v) => update("notifications", { lowStock: v })}
                />
              </div>

              {form.notifications.lowStock && (
                <div className="mt-2 max-w-xs">
                  <Field
                    id="threshold"
                    label="Low stock threshold"
                    hint="Units remaining before you're alerted."
                    error={errors.threshold}
                  >
                    <input
                      id="threshold"
                      type="number"
                      min={0}
                      value={form.notifications.lowStockThreshold}
                      onChange={(e) =>
                        update("notifications", { lowStockThreshold: Number(e.target.value) })
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>
              )}
            </Section>
          )}

          {tab === "account" && (
            <Section
              title="Your account"
              description="Sign-in is managed by your organization's login server."
            >
              <dl className="divide-y divide-gray-100">
                <div className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between">
                  <dt className="text-sm text-gray-500">Signed in as</dt>
                  <dd className="text-sm font-medium text-gray-900">{username ?? "Unknown"}</dd>
                </div>
                <div className="flex flex-col gap-2 py-3 sm:flex-row sm:justify-between">
                  <dt className="text-sm text-gray-500">Roles</dt>
                  <dd className="flex flex-wrap gap-1.5 sm:justify-end">
                    {roles.length === 0 ? (
                      <span className="text-sm text-gray-400">None</span>
                    ) : (
                      roles.map((role) => (
                        <span
                          key={role}
                          className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700"
                        >
                          {role}
                        </span>
                      ))
                    )}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 flex flex-wrap gap-3">
                {accountUrl && (
                  <a
                    href={accountUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Manage password &amp; security
                    <ExternalLink size={15} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Sign out
                </button>
              </div>
            </Section>
          )}

          {/* Save bar */}
          {showSaveBar && (
            <div className="flex flex-col-reverse gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500" aria-live="polite">
                {hasErrors
                  ? "Fix the highlighted fields to save."
                  : dirty
                    ? "You have unsaved changes."
                    : "All changes saved."}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm(saved)}
                  disabled={!dirty || saving}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!dirty || saving || hasErrors}
                  className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-[100] rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}