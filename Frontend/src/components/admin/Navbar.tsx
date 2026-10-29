"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, LogOut, Menu, Settings } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";

type NavbarProps = {
  onMenuClick: () => void;
};

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { username, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = username ?? "Administrator";
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
        >
          <Menu size={22} />
        </button>

        <div>
          <h1 className="text-sm font-semibold text-gray-900 sm:text-base">
            Merchant Portal
          </h1>
          <p className="hidden text-xs text-gray-500 sm:block">
            Manage your store and payments
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          aria-label="Notifications"
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
        >
          <Bell size={20} />
        </button>

        {/* Profile menu */}
        <div ref={menuRef} className="relative border-l pl-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
            className="flex items-center gap-2 rounded-lg p-1 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 font-semibold text-violet-700">
              {initial}
            </div>
            <div className="hidden text-left sm:block">
              <p className="max-w-[140px] truncate text-sm font-medium text-gray-800">
                {displayName}
              </p>
              <p className="text-xs text-gray-500">Merchant account</p>
            </div>
            <ChevronDown
              size={16}
              className={`hidden text-gray-400 transition-transform sm:block ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
            >
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="truncate text-sm font-medium text-gray-900">
                  {displayName}
                </p>
                <p className="text-xs text-gray-500">Merchant account</p>
              </div>

              <Link
                href="/admin/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Settings size={16} />
                Settings
              </Link>

              <button
                type="button"
                role="menuitem"
                onClick={logout}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}