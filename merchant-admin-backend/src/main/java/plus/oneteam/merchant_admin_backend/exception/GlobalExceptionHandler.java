package plus.oneteam.merchant_admin_backend.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<String> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        if (ex.getMessage().contains("violates foreign key constraint")) {
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body("Cannot delete this product because it is tied to existing customer orders. Consider marking it as out of stock or inactive instead.");
        }
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body("Database integrity violation error occurred.");
    }
}