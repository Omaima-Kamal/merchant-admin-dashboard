package plus.oneteam.merchant_admin_backend.service;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plus.oneteam.merchant_admin_backend.dto.OrderDto;
import plus.oneteam.merchant_admin_backend.enums.OrderStatus;
import plus.oneteam.merchant_admin_backend.enums.PaymentStatus;
import plus.oneteam.merchant_admin_backend.exception.OrderException;
import plus.oneteam.merchant_admin_backend.model.*;
import plus.oneteam.merchant_admin_backend.repository.OrderRepository;

import java.util.List;
import java.util.Optional;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);


    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }


    public Order placedOrder(Long orderId) throws OrderException {
        Order order = findOrderById(orderId);

        order.setOrderStatus(OrderStatus.PLACED.getValue());
        order.getPaymentDetails().setStatus(PaymentStatus.COMPLETED.getValue());

        Order saved = orderRepository.save(order);

        log.info("Order id={} marked PLACED, payment COMPLETED", orderId);
        return saved;
    }

    public Order confirmedOrder(Long orderId) throws OrderException {
        Order order = findOrderById(orderId);
        order.setOrderStatus(OrderStatus.CONFIRMED.getValue());
        Order saved = orderRepository.save(order);
        log.info("Order id={} marked CONFIRMED", orderId);
        return saved;
    }

    public Order shippedOrder(Long orderId) throws OrderException {
        Order order = findOrderById(orderId);
        order.setOrderStatus(OrderStatus.SHIPPED.getValue());
        Order saved = orderRepository.save(order);
        log.info("Order id={} marked SHIPPED", orderId);
        return saved;
    }

    public Order deliveredOrder(Long orderId) throws OrderException {
        Order order = findOrderById(orderId);
        order.setOrderStatus(OrderStatus.DELIVERED.getValue());
        Order saved = orderRepository.save(order);
        log.info("Order id={} marked DELIVERED", orderId);
        return saved;
    }

    public Order cancelledOrder(Long orderId) throws OrderException {
        Order order = findOrderById(orderId);
        order.setOrderStatus(OrderStatus.CANCELLED.getValue());
        Order saved = orderRepository.save(order);
        log.info("Order id={} marked CANCELLED", orderId);
        return saved;
    }

    public Order findOrderById(Long orderId) throws OrderException {
        Optional<Order> opt = orderRepository.findById(orderId);

        if (opt.isPresent()) {
            return opt.get();
        }
        log.warn("Order not found id={}", orderId);
        throw new OrderException("order not exist with id : " + orderId);
    }

    public List<Order> userOrderHistory(Long userId) {
        List<Order> orders = orderRepository.getUsersOrders(userId);
        log.info("Fetched {} orders for userId={}", orders.size(), userId);
        return orders;
    }

    public void deleteOrder(Long orderId) throws OrderException {
        findOrderById(orderId);
        orderRepository.deleteById(orderId);
        log.info("Deleted order id={}", orderId);
    }
    @Transactional(readOnly = true)
    public List<OrderDto> getAllOrders() {
        return orderRepository.findAllWithUserAndAddress().stream()
                .map(OrderDto::from)
                .toList();
    }
}