package plus.oneteam.merchant_admin_backend.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import plus.oneteam.merchant_admin_backend.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("""
        SELECT o
        FROM Order o
        WHERE o.user.id = :userId
          AND (
              o.orderStatus = 'PLACED'
              OR o.orderStatus = 'CONFIRMED'
              OR o.orderStatus = 'SHIPPED'
              OR o.orderStatus = 'DELIVERED'
          )
        """)
    public List<Order> getUsersOrders(@Param("userId")Long userId);

    Order findById(String paymentOrderId);

    Order findByOrderId(String orderId);

    @EntityGraph(attributePaths = {"user", "shippingAddress"})
    @Query("select o from Order o order by o.createdAt desc")
    List<Order> findAllWithUserAndAddress();
}
