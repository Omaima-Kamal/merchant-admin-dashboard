
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not configured");
}

export const API_URL = `${API_BASE_URL.replace(/\/+$/, "")}/api`;

export const API_ENDPOINTS = {
  products: `${API_URL}/admin/products`,
  transactions: `${API_URL}/admin/transactions`,
} as const;
