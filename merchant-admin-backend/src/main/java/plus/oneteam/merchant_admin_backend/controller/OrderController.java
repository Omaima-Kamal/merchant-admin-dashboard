package plus.oneteam.merchant_admin_backend.controller;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plus.oneteam.merchant_admin_backend.dto.OrderDto;
import plus.oneteam.merchant_admin_backend.exception.OrderException;
import plus.oneteam.merchant_admin_backend.model.Order;
import plus.oneteam.merchant_admin_backend.payload.response.ApiResponse;
import plus.oneteam.merchant_admin_backend.service.OrderService;

import java.util.List;

@RestController
@RequestMapping("/api/admin/orders")
public class OrderController {

    private static final Logger log = LoggerFactory.getLogger(OrderController.class);

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping("/")
    public ResponseEntity<List<OrderDto>> getAllOrdersHandler() {
        log.info("REST request to fetch all admin orders");

        List<OrderDto> orders = orderService.getAllOrders();

        return ResponseEntity.ok(orders);
    }

    @PutMapping("/{orderId}/confirmed")
    public ResponseEntity<Order> confirmedOrderHandler(
            @PathVariable Long orderId,
            @RequestHeader("Authorization") String jwt) throws OrderException {
        log.info("REST request to confirm order ID: {}", orderId);

        Order order = orderService.confirmedOrder(orderId);
        log.info("Successfully confirmed order ID: {}", orderId);

        return new ResponseEntity<>(order, HttpStatus.OK);
    }

    @PutMapping("/{orderId}/ship")
    public ResponseEntity<Order> shippedOrderHandler(
            @PathVariable Long orderId,
            @RequestHeader("Authorization") String jwt) throws OrderException {
        log.info("REST request to mark order ID: {} as SHIPPED", orderId);

        Order order = orderService.shippedOrder(orderId);
        log.info("Successfully updated status to SHIPPED for order ID: {}", orderId);

        return new ResponseEntity<>(order, HttpStatus.OK);
    }

    @PutMapping("/{orderId}/deliver")
    public ResponseEntity<Order> deliveredOrderHandler(
            @PathVariable Long orderId,
            @RequestHeader("Authorization") String jwt) throws OrderException {
        log.info("REST request to mark order ID: {} as DELIVERED", orderId);

        Order order = orderService.deliveredOrder(orderId);
        log.info("Successfully updated status to DELIVERED for order ID: {}", orderId);

        return new ResponseEntity<>(order, HttpStatus.OK);
    }

    @PutMapping("/{orderId}/cancel")
    public ResponseEntity<Order> cancelledOrderHandler(
            @PathVariable Long orderId,
            @RequestHeader("Authorization") String jwt) throws OrderException {
        log.info("REST request to CANCEL order ID: {}", orderId);

        Order order = orderService.cancelledOrder(orderId);
        log.info("Successfully CANCELLED order ID: {}", orderId);

        return new ResponseEntity<>(order, HttpStatus.OK);
    }

    @PutMapping("/{orderId}/delete")
    public ResponseEntity<ApiResponse> deletedOrderHandler(
            @PathVariable Long orderId,
            @RequestHeader("Authorization") String jwt) throws OrderException {
        log.info("REST request to DELETE order ID: {}", orderId);

        orderService.deleteOrder(orderId);
        log.info("Successfully DELETED order ID: {}", orderId);

        ApiResponse res = new ApiResponse();
        res.setMessage("order deleted successfully");
        res.setStatus(true);

        return new ResponseEntity<>(res, HttpStatus.OK);
    }
}