package plus.oneteam.merchant_admin_backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.HashMap;
import java.util.Map;

@Embeddable
public class PaymentDetails {

    @Column(name = "payment_status")
    private String status;

    @Column(name = "payment_id")
    private String paymentId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payment_trx_details", columnDefinition = "json")
    private Map<String, Object> paymentTrxDetails = new HashMap<>();

    @Column(name = "payment_method")
    private String paymentMethod;

    public PaymentDetails() {

    }

    public PaymentDetails(String status, String paymentId, Map<String, Object> paymentTrxDetails, String paymentMethod) {
        this.status = status;
        this.paymentId = paymentId;
        this.paymentTrxDetails = paymentTrxDetails;
        this.paymentMethod = paymentMethod;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(String paymentId) {
        this.paymentId = paymentId;
    }

    public Map<String, Object> getPaymentTrxDetails() {
        return paymentTrxDetails;
    }

    public void setPaymentTrxDetails(Map<String, Object> paymentTrxDetails) {
        this.paymentTrxDetails = paymentTrxDetails;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }
}