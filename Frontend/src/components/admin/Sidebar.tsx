"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Package,
  ShoppingCart,
  Settings,
  Store,
  X,
} from "lucide-react";

const menuItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Transactions", href: "/admin/transactions", icon: ArrowLeftRight },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open && (<button
        aria-label="Close navigation"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 lg:hidden"
      />
      )}


      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex h-16 items-center justify-between border-b px-5">
          <Link
            href="/admin"
            onClick={onClose}
            className="flex items-center gap-2 text-lg font-bold text-violet-700"
          >
            <Store size={23} />
            Merchant Admin
          </Link>

          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded p-1 text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <p className="px-3 pb-2 pt-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Workspace
          </p>

          {menuItems.map(({ label, href, icon: Icon }) => {
            const active =
              href === "/admin"
                ? pathname === href
                : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${active
                    ? "bg-violet-50 font-semibold text-violet-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
              >
                <Icon size={19} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4 text-xs text-gray-400">
          Merchant Portal
        </div>
      </aside>
    </>


  );
}