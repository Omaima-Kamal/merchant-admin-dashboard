package plus.oneteam.merchant_admin_backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import plus.oneteam.merchant_admin_backend.dto.TransactionReportResponse;
import plus.oneteam.merchant_admin_backend.service.TransactionReportService;

import java.util.List;

@RestController
@RequestMapping("/api/admin/transactions")
public class TransactionReportController {

    private final TransactionReportService transactionReportService;

    public TransactionReportController(
            TransactionReportService transactionReportService) {
        this.transactionReportService = transactionReportService;
    }

    @GetMapping
    public List<TransactionReportResponse> getTransactions() {
        return transactionReportService.getTransactions();
    }
}
