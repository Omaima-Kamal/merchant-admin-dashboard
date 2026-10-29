package plus.oneteam.merchant_admin_backend.dto;

import java.math.BigDecimal;
import java.util.Map;

public record TransactionReportResponse(
        String id,
        String customer,
        String initials,
        String email,
        String date,
        long timestamp,
        String method,
        BigDecimal amount,
        String currency,
        String status,
        String transactionId,
        String orderId,
        Map<String, Object> paymentDetails
) {}