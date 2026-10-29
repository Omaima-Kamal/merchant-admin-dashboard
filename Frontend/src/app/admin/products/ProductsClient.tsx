"use client";
import ProductImage from "@/features/products/components/ProductImage";
import type {
  ApiProduct,
  Product,
  StockFilter,
} from "@/features/products/types";
import { useEffect, useMemo, useState } from "react";
import ProductEditForm from "@/features/products/components/ProductEditForm";
import ProductImportDialog from "@/features/products/components/ProductImportDialog";
import ProductCreateForm from "@/features/products/components/ProductCreateForm";
import { API_ENDPOINTS } from "@/lib/api";
import {
  ChevronLeft,
  ChevronRight,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";

const API_URL = API_ENDPOINTS.products;

const SAMPLE: ApiProduct[] = [
  {
    imageUrl: "",
    brand: "Demo Brand",
    color: "Black",
    title: "Men Sweaters",
    discountedPrice: 600,
    price: 800,
    discountPercent: 25,
    sizes: [
      { name: "S", quantity: 30 },
      { name: "M", quantity: 60 },
      { name: "L", quantity: 30 },
    ],
    quantity: 120,
    topLevelCategory: "men",
    secondLevelCategory: "clothing",
    thirdLevelCategory: "sweaters",
    description: "A comfortable sweater for men.",
  },
];

const LOW_STOCK = 20;
const PAGE_SIZES = [5, 10, 20];

function stockStatus(qty: number) {
  if (qty <= 0) return { label: "Out of stock", className: "bg-red-50 text-red-700" };
  if (qty <= LOW_STOCK)
    return { label: "Low stock", className: "bg-amber-50 text-amber-700" };
  return { label: "In stock", className: "bg-green-50 text-green-700" };
}

const money = (n: number) =>
  `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(Boolean(API_URL));
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [stock, setStock] = useState<StockFilter>("all");
  const { getToken } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      const withKeys = (list: ApiProduct[]): Product[] =>
        list.map((p, i) => {
          const leaf = p.category;
          const second = leaf?.parentCategory;
          const top = second?.parentCategory;

          return {
            ...p,
            sizes: p.sizes ?? [],
            topLevelCategory: p.topLevelCategory ?? top?.name ?? "",
            secondLevelCategory: p.secondLevelCategory ?? second?.name ?? "",
            thirdLevelCategory: p.thirdLevelCategory ?? leaf?.name ?? "",
            key: String(p.id ?? p._id ?? i),
          };
        });

      if (!API_URL) {
        const mappedSample = withKeys(SAMPLE);
        setProducts(mappedSample);
        setTotalElements(SAMPLE.length);
        setTotalPages(Math.ceil(SAMPLE.length / pageSize));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const token = await getToken();
        if (!token) throw new Error("No Keycloak access token available.");

        const params = new URLSearchParams({
          page: String(page),
          size: String(pageSize),
        });

        const response = await fetch(`${API_URL}?${params}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`);
        }

        const data = await response.json();
        const list: ApiProduct[] = Array.isArray(data)
          ? data
          : data.content ?? data.products ?? [];

        if (cancelled) return;

        setProducts(withKeys(list));

        if (data.page) {
          setTotalElements(data.page.totalElements);
          setTotalPages(data.page.totalPages);
        } else if (data.totalPages !== undefined) {
          setTotalPages(data.totalPages);
          setTotalElements(data.totalElements ?? list.length);
        } else {
          setTotalElements(list.length);
          setTotalPages(Math.ceil(list.length / pageSize));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load products.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [getToken, refreshKey, page, pageSize]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((p) => p.topLevelCategory?.trim())
            .filter((cat): cat is string => Boolean(cat)),
        ),
      ).sort(),
    [products],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesQuery =
        !q ||
        [p.title, p.brand, p.color, p.thirdLevelCategory, p.secondLevelCategory]
          .join(" ")
          .toLowerCase()
          .includes(q);
      const matchesCategory = category === "all" || p.topLevelCategory === category;
      const matchesStock =
        stock === "all" ||
        (stock === "out" && p.quantity <= 0) ||
        (stock === "low" && p.quantity > 0 && p.quantity <= LOW_STOCK) ||
        (stock === "in" && p.quantity > LOW_STOCK);
      return matchesQuery && matchesCategory && matchesStock;
    });
  }, [products, query, category, stock]);

  const currentPage = page + 1;
  const pageItems = filtered;

  const from = totalElements === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalElements);

  const handleDelete = async (product: Product) => {
    const productId = product.id ?? product._id;
    if (productId === undefined || productId === null || productId === "") {
      alert("Cannot delete this product: its ID is missing.");
      return;
    }

    if (!API_URL) {
      alert("The product API URL is not configured.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${product.title}"?`)) {
      return;
    }

    try {
      const token = await getToken();
      if (!token) throw new Error("You are not authenticated.");

      const response = await fetch(
        `${API_URL.replace(/\/$/, "")}/${encodeURIComponent(String(productId))}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Failed to delete product (${response.status}).`);
      }

      setProducts((current) => current.filter((item) => item.key !== product.key));
    } catch (error) {
      console.error("Delete product failed:", error);

      alert(error instanceof Error ? error.message : "Failed to delete product.");
    }
  };

  const handleSearch = (v: string) => {
    setQuery(v);
    setPage(0);
  };

  const handleCategory = (v: string) => {
    setCategory(v);
    setPage(0);
  };

  const handleStock = (v: StockFilter) => {
    setStock(v);
    setPage(0);
  };

  const handlePageSize = (v: number) => {
    setPageSize(v);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Products</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your catalog, pricing, and stock.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowImportDialog(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" />
            Import JSON
          </button>

          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Add product
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by title, brand, color, or category"
              aria-label="Search products"
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>

          <select
            value={category}
            onChange={(e) => handleCategory(e.target.value)}
            aria-label="Filter by category"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {capitalize(c)}
              </option>
            ))}
          </select>

          <select
            value={stock}
            onChange={(e) => handleStock(e.target.value as StockFilter)}
            aria-label="Filter by stock"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            <option value="all">All stock levels</option>
            <option value="in">In stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3">Sizes</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageItems.map((p) => {
                const s = stockStatus(p.quantity);
                const discount =
                  p.price > 0 && p.discountedPrice < p.price
                    ? Math.round(((p.price - p.discountedPrice) / p.price) * 100)
                    : 0;
                return (
                  <tr key={p.key} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProductImage src={p.imageUrl} alt={p.title} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">{p.title}</p>
                          <p className="truncate text-xs text-gray-500">
                            {p.brand} · {p.color}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <p className="text-gray-900">{capitalize(p.thirdLevelCategory)}</p>
                      <p className="text-xs text-gray-500">
                        {capitalize(p.topLevelCategory)} / {capitalize(p.secondLevelCategory)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <p className="font-medium text-gray-900">{money(p.discountedPrice)}</p>
                      {discount > 0 && (
                        <p className="text-xs text-gray-400">
                          <span className="line-through">{money(p.price)}</span>{" "}
                          <span className="text-green-600">-{discount}%</span>
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.sizes.map((sz) => (
                          <span
                            key={sz.name}
                            title={`${sz.name}: ${sz.quantity} in stock`}
                            className={`rounded border px-1.5 py-0.5 text-xs ${
                              sz.quantity > 0
                                ? "border-gray-200 text-gray-700"
                                : "border-gray-100 text-gray-300 line-through"
                            }`}
                          >
                            {sz.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                      {p.quantity}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingProduct(p)}
                          aria-label={`Edit ${p.title}`}
                          className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p)}
                          aria-label={`Delete ${p.title}`}
                          className="rounded-md p-2 text-red-500 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {loading && (
            <p className="py-16 text-center text-sm text-gray-500">Loading products…</p>
          )}
          {error && (
            <p className="py-16 text-center text-sm text-red-600">
              Couldn&apos;t load products: {error}
            </p>
          )}
          {!loading && !error && pageItems.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
              <Package className="h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm font-medium text-gray-900">No products found</p>
              <p className="text-sm text-gray-500">
                Try a different search or clear your filters.
              </p>
            </div>
          )}
        </div>

        {showCreateForm && (
          <ProductCreateForm
            getToken={getToken}
            onClose={() => setShowCreateForm(false)}
            onCreated={() => {
              setShowCreateForm(false);
              setRefreshKey((current) => current + 1);
            }}
          />
        )}

        {editingProduct && (
          <ProductEditForm
            product={editingProduct}
            getToken={getToken}
            onClose={() => setEditingProduct(null)}
            onUpdated={() => {
              setEditingProduct(null);
              setRefreshKey((previous) => previous + 1);
            }}
          />
        )}

        {showImportDialog && (
          <ProductImportDialog
            getToken={getToken}
            onClose={() => setShowImportDialog(false)}
            onImported={() => {
              setRefreshKey((previous) => previous + 1);
            }}
          />
        )}

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-gray-200 p-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <p>
              Showing{" "}
              <span className="font-medium text-gray-900">{from}–{to}</span> of{" "}
              <span className="font-medium text-gray-900">{totalElements}</span>
            </p>
            <select
              value={pageSize}
              onChange={(e) => handlePageSize(Number(e.target.value))}
              aria-label="Rows per page"
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>{n} per page</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={page === 0}
              aria-label="Previous page"
              className="rounded-md border border-gray-200 p-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {getPageNumbers(currentPage, totalPages).map((n, i) =>
              n === "…" ? (
                <span key={`gap-${i}`} className="px-2 text-gray-400">…</span>
              ) : (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(Number(n) - 1)}
                  aria-current={n === currentPage ? "page" : undefined}
                  className={`min-w-9 rounded-md px-3 py-1.5 text-sm ${
                    n === currentPage
                      ? "bg-gray-900 font-medium text-white"
                      : "border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {n}
                </button>
              ),
            )}

            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(totalPages - 1, current + 1))
              }
              disabled={page >= totalPages - 1 || totalPages === 0}
              aria-label="Next page"
              className="rounded-md border border-gray-200 p-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}