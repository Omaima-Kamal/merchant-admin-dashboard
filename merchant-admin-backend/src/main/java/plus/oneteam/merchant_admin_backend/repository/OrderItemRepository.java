package plus.oneteam.merchant_admin_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import plus.oneteam.merchant_admin_backend.model.OrderItem;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
}
