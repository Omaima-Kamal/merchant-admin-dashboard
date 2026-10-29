const API_BASE =
  process.env.NEXT_PUBLIC_ADMIN_API_URL ??
  "https://api.promo-engine.superpay.com:5455/api/admin";

export async function requestAdminOrders<T>(
  path: string,
  token: string,
  method = "GET"
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Orders API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}