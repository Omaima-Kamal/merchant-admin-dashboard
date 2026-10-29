package plus.oneteam.merchant_admin_backend.service;


import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plus.oneteam.merchant_admin_backend.dto.TransactionReportResponse;
import plus.oneteam.merchant_admin_backend.model.Address;
import plus.oneteam.merchant_admin_backend.model.Order;
import plus.oneteam.merchant_admin_backend.model.PaymentDetails;
import plus.oneteam.merchant_admin_backend.repository.OrderRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

@Service
public class TransactionReportService {

    private final OrderRepository orderRepository;

    public TransactionReportService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Transactional(readOnly = true)
    public List<TransactionReportResponse> getTransactions() {
        return orderRepository.findAll()
                .stream()
                .filter(order -> order.getPaymentDetails() != null)
                .map(this::toResponse)
                .toList();
    }

    private TransactionReportResponse toResponse(Order order) {
        PaymentDetails payment = order.getPaymentDetails();
        Map<String, Object> details = payment.getPaymentTrxDetails();

        if (details == null) {
            details = Map.of();
        }

        Address address = order.getShippingAddress();

        String firstName = address != null
                && address.getFirstName() != null
                ? address.getFirstName() : "";

        String lastName = address != null
                && address.getLastName() != null
                ? address.getLastName() : "";

        String customer = (firstName + " " + lastName).trim();

        if (customer.isBlank()) {
            customer = "Customer";
        }

        String email = order.getUser() != null
                && order.getUser().getEmail() != null
                ? order.getUser().getEmail() : "";

        String transactionId = firstNonBlank(
                payment.getPaymentId(),
                value(details, "transactionId"),
                value(details, "trxId"),
                order.getOrderId()
        );

        String method = firstNonBlank(
                payment.getPaymentMethod(),
                value(details, "paymentMethodId"),
                "Unknown"
        );

        BigDecimal amount = decimal(details.get("amount"));
        if (amount == null) {
            amount = BigDecimal.valueOf(order.getTotalDiscountedPrice());
        }

        String currency = firstNonBlank(
                value(details, "currency"),
                "EGP"
        );

        String dateText = firstNonBlank(
                value(details, "transactionTime"),
                value(details, "transactionDate"),
                order.getOrderDate() == null
                        ? null : order.getOrderDate().toString()
        );

        long timestamp = parseTimestamp(
                dateText,
                order.getOrderDate() == null
                        ? 0L
                        : order.getOrderDate()
                        .toInstant(ZoneOffset.UTC).toEpochMilli()
        );

        String initials = ((firstName.isBlank() ? "" :
                firstName.substring(0, 1))
                + (lastName.isBlank() ? "" :
                lastName.substring(0, 1))).toUpperCase();

        Map<String, Object> paymentDetails =
                order.getPaymentDetails().getPaymentTrxDetails();

        return new TransactionReportResponse(
                transactionId,
                customer,
                initials,
                email,
                dateText == null ? "" : dateText,
                timestamp,
                method,
                amount,
                currency,
                mapStatus(payment.getStatus()),
                transactionId,
                order.getOrderId(),
                paymentDetails
        );
    }

    private String mapStatus(String rawStatus) {
        if (rawStatus == null) {
            return "Pending";
        }

        return switch (rawStatus.toUpperCase()) {
            case "COMPLETED", "CAPTURED", "SUCCEEDED",
                 "SUCCESS", "SUCCESSFUL" -> "Succeeded";
            case "FAILED", "DECLINED", "ERROR" -> "Failed";
            case "REFUNDED", "PARTIALLY_REFUNDED" -> "Refunded";
            default -> "Pending";
        };
    }

    private String value(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value == null ? null : value.toString();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private BigDecimal decimal(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return new BigDecimal(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private long parseTimestamp(String value, long fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }

        try {
            return Instant.parse(value).toEpochMilli();
        } catch (Exception ignored) {
            try {
                return OffsetDateTime.parse(value)
                        .toInstant().toEpochMilli();
            } catch (Exception ignoredAgain) {
                try {
                    return java.time.LocalDate.parse(value)
                            .atStartOfDay(ZoneOffset.UTC)
                            .toInstant().toEpochMilli();
                } catch (Exception ignoredDate) {
                    return fallback;
                }
            }
        }
    }
}
