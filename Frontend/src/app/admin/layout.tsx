"use client";

import { useState } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Navbar from "@/components/admin/Navbar";
import { AuthProvider } from "@/auth/AuthProvider";

export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <AuthProvider>
            <div className="min-h-screen bg-gray-50 lg:flex">
        <Sidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
        />

        <div className="min-w-0 flex-1">
            <Navbar onMenuClick={() => setSidebarOpen(true)} />

            <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
    </div>
        </AuthProvider>

    );
}
