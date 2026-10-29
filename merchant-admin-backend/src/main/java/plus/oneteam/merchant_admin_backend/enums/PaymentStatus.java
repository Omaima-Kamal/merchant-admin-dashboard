package plus.oneteam.merchant_admin_backend.enums;

public enum PaymentStatus {

    PENDING(-1, "PENDING", "pending processing"),
    PROCESSING(0, "PROCESSING", "payment is being processed"),
    PROCESSED(1, "PROCESSED", "payment processed"),
    RETRYING(2, "RETRYING", "retrying failed payment"),
    COMPLETED(3, "COMPLETED", "payment completed"),
    FAILED(4, "FAILED", "payment failed"),
    REFUNDED(5, "REFUNDED", "payment refunded"),
    DECLINED(6, "DECLINED", "payment declined");

    private final int code;
    private final String value;
    private final String message;

    PaymentStatus(int code, String value, String message) {
        this.code = code;
        this.value = value;
        this.message = message;
    }

    public int getCode() {
        return code;
    }

    public String getValue() {
        return value;
    }

    public String getMessage() {
        return message;
    }

    public static PaymentStatus fromValue(String value) {
        for (PaymentStatus paymentStatus : values()) {
            if (paymentStatus.value.equalsIgnoreCase(value)) {
                return paymentStatus;
            }
        }
        throw new IllegalArgumentException("Unknown paymentStatus: " + value);
    }
}


