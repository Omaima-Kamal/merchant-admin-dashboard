import type { ApiOrder, Order, OrderStatus, PaymentStatus } from "@/types/admin-order";

function mapOrderStatus(value: string | null): OrderStatus {
  switch (value?.toUpperCase()) {
    case "PLACED":
    case "CONFIRMED":
    case "PROCESSING":
      return "Processing";
    case "SHIPPED":
      return "Shipped";
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
    case "CANCELED":
      return "Cancelled";
    default:
      return "Pending";
  }
}

function mapPaymentStatus(value: string | null): PaymentStatus {
  const status = value?.toUpperCase() ?? "";

  if (["COMPLETED", "SUCCESS", "SUCCEEDED", "PAID"].includes(status)) {
    return "Paid";
  }

  if (["FAILED", "FAILURE", "DECLINED"].includes(status)) {
    return "Failed";
  }

  if (status.includes("REFUND")) {
    return "Refunded";
  }

  return "Pending";
}

export function mapApiOrder(api: ApiOrder): Order {
  const user = api.user;
  const address = api.shippingAddress;

  const customerName = [
    user?.firstName ?? address?.firstName,
    user?.lastName ?? address?.lastName,
  ]
    .filter(Boolean)
    .join(" ") || "Unknown customer";

  const dateValue = api.orderDate ?? api.createdAt;
  const timestamp = dateValue ? new Date(dateValue).getTime() : 0;

  const items = (api.orderItems ?? []).map((item) => ({
    title: item.product?.title ?? "Product",
    color: item.product?.color ?? "N/A",
    size: item.size ?? "N/A",
    quantity: item.quantity,
    price: item.discountedPrice ?? item.price ?? 0,
  }));

  const addressText = [
    address?.streetAddress,
    address?.city,
    address?.state,
    address?.zipCode,
  ]
    .filter(Boolean)
    .join(", ");

  const paymentValue =
    api.paymentDetails?.paymentLinkStatus ||
    api.paymentDetails?.status ||
    null;

  return {
    id: String(api.id),
    displayId: api.orderId || `#ORD-${api.id}`,
    customer: customerName,
    initials: customerName
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .toUpperCase(),
    email: user?.email ?? "",
    address: addressText || "No shipping address",
    date: dateValue
      ? new Date(timestamp).toLocaleString()
      : "Date unavailable",
    timestamp,
    items,
    shipping: 0,
    payment: mapPaymentStatus(paymentValue),
    status: mapOrderStatus(api.orderStatus),
  };
}