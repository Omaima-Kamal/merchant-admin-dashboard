export type OrderStatus =
  | "Pending"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

export type PaymentStatus =
  | "Paid"
  | "Pending"
  | "Failed"
  | "Refunded";

export type OrderItem = {
  title: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
};

export type Order = {
  id: string;
  displayId: string;
  customer: string;
  initials: string;
  email: string;
  address: string;
  date: string;
  timestamp: number;
  items: OrderItem[];
  shipping: number;
  payment: PaymentStatus;
  status: OrderStatus;
};

export type ApiOrder = {
  id: number;
  orderId: string | null;
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  orderItems: {
    product: {
      title: string | null;
      color: string | null;
    } | null;
    size: string | null;
    quantity: number;
    price: number | null;
    discountedPrice: number | null;
  }[];
  orderDate: string | null;
  createdAt: string | null;
  shippingAddress: {
    firstName: string | null;
    lastName: string | null;
    streetAddress: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    mobile: string | null;
  } | null;
  paymentDetails: {
    status: string | null;
    paymentMethod: string | null;
    paymentLinkStatus: string | null;
  } | null;
  totalPrice: number;
  totalDiscountedPrice: number | null;
  discount: number | null;
  orderStatus: string | null;
  totalItems: number;
};