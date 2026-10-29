package plus.oneteam.merchant_admin_backend.payload.response;

import java.time.LocalDateTime;
import java.util.List;

public record AdminOrderResponse(
        Long id,
        String orderId,
        CustomerDto user,
        List<OrderItemDto> orderItems,
        LocalDateTime orderDate,
        LocalDateTime createdAt,
        ShippingAddressDto shippingAddress,
        PaymentDetailsDto paymentDetails,
        double totalPrice,
        Double totalDiscountedPrice,
        Double discount,
        String orderStatus,
        int totalItems
) {
    public record CustomerDto(
            String firstName,
            String lastName,
            String email
    ) {}

    public record OrderItemDto(
            ProductDto product,
            String size,
            int quantity,
            Double price,
            Double discountedPrice
    ) {}

    public record ProductDto(
            String title,
            String color
    ) {}

    public record ShippingAddressDto(
            String firstName,
            String lastName,
            String streetAddress,
            String city,
            String state,
            String zipCode,
            String mobile
    ) {}

    public record PaymentDetailsDto(
            String status,
            String paymentMethod,
            String paymentLinkStatus
    ) {}
}