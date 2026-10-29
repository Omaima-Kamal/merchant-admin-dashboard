
const LOW_STOCK = 20;

export function stockStatus(qty: number) {
  if (qty <= 0) {
    return {
      label: "Out of stock",
      className: "bg-red-50 text-red-700",
    };
  }

  if (qty <= LOW_STOCK) {
    return {
      label: "Low stock",
      className: "bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "In stock",
    className: "bg-green-50 text-green-700",
  };
}

export const money = (n: number) =>
  `$${Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const capitalize = (s?: string | null) =>
  s ? s[0].toUpperCase() + s.slice(1) : "";

export function getPageNumbers(
  current: number,
  total: number,
): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "…")[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);

  if (left > 2) pages.push("…");

  for (let i = left; i <= right; i++) {
    pages.push(i);
  }

  if (right < total - 1) pages.push("…");

  pages.push(total);
  return pages;
}
