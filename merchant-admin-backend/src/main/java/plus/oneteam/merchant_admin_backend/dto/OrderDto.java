package plus.oneteam.merchant_admin_backend.dto;

import java.time.LocalDateTime;
import java.util.List;

import plus.oneteam.merchant_admin_backend.model.Address;
import plus.oneteam.merchant_admin_backend.model.Order;
import plus.oneteam.merchant_admin_backend.model.OrderItem;
import plus.oneteam.merchant_admin_backend.model.PaymentDetails;
import plus.oneteam.merchant_admin_backend.model.Product;
import plus.oneteam.merchant_admin_backend.model.User;


public record OrderDto(
        Long id,
        String orderId,
        LocalDateTime orderDate,
        LocalDateTime deliveryDate,
        LocalDateTime createdAt,
        String orderStatus,
        double totalPrice,
        Integer totalDiscountedPrice,
        Integer discount,
        int totalItems,
        UserDto user,
        AddressDto shippingAddress,
        List<OrderItemDto> orderItems,
        PaymentDto paymentDetails) {

    public record UserDto(Long id, String firstName, String lastName, String email, String mobile) {}

    public record AddressDto(Long id, String firstName, String lastName, String streetAddress,
                             String city, String state, String zipCode, String mobile) {}

    public record ProductDto(Long id, String title, String brand, String color, String imageUrl) {}

    public record OrderItemDto(Long id, ProductDto product, String size, int quantity,
                               Integer price, Integer discountedPrice) {}

    public record PaymentDto(String paymentMethod, String status, String paymentId) {}

    /** Call this inside a @Transactional method so lazy relations can still load. */
    public static OrderDto from(Order o) {
        return new OrderDto(
                o.getId(),
                o.getOrderId(),
                o.getOrderDate(),
                o.getDeliveryDate(),
                o.getCreatedAt(),
                o.getOrderStatus(),
                o.getTotalPrice(),
                o.getTotalDiscountedPrice(),
                o.getDiscount(),
                o.getTotalItems(),
                toUser(o.getUser()),
                toAddress(o.getShippingAddress()),
                o.getOrderItems() == null ? List.of()
                        : o.getOrderItems().stream().map(OrderDto::toItem).toList(),
                toPayment(o.getPaymentDetails()));
    }

    private static UserDto toUser(User u) {
        if (u == null) return null;
        return new UserDto(u.getId(), u.getFirstName(), u.getLastName(), u.getEmail(), u.getMobile());
    }

    private static AddressDto toAddress(Address a) {
        if (a == null) return null;
        return new AddressDto(a.getId(), a.getFirstName(), a.getLastName(), a.getStreetAddress(),
                a.getCity(), a.getState(), a.getZipCode(), a.getMobile());
    }

    private static OrderItemDto toItem(OrderItem i) {
        Product p = i.getProduct();
        ProductDto product = p == null ? null
                : new ProductDto(p.getId(), p.getTitle(), p.getBrand(), p.getColor(), p.getImageUrl());
        return new OrderItemDto(i.getId(), product, i.getSize(), i.getQuantity(),
                i.getPrice(), i.getDiscountedPrice());
    }

    private static PaymentDto toPayment(PaymentDetails d) {
        if (d == null) return null;
        return new PaymentDto(d.getPaymentMethod(), d.getStatus(), d.getPaymentId());
    }
}