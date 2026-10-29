package plus.oneteam.merchant_admin_backend.enums;

public enum OrderStatus {

    PENDING(-1, "PENDING", "pending processing"),
    SHIPPED(0, "SHIPPED", "order is shipped"),
    CONFIRMED(1, "CONFIRMED", "order confirmed"),
    PLACED(2, "PLACED", "order placed"),
    DELIVERED(3, "DELIVERED", "order delivered"),
    CANCELLED(4, "CANCELLED", "order cancelled");

    private final int code;
    private final String value;
    private final String message;

    OrderStatus(int code, String value, String message) {
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

    public static OrderStatus fromValue(String value) {
        for (OrderStatus orderStatus : values()) {
            if (orderStatus.value.equalsIgnoreCase(value)) {
                return orderStatus;
            }
        }
        throw new IllegalArgumentException("Unknown orderStatus: " + value);
    }
}

