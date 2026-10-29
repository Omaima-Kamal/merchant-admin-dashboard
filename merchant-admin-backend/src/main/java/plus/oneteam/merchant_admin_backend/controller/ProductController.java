package plus.oneteam.merchant_admin_backend.controller;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;
import plus.oneteam.merchant_admin_backend.exception.ProductException;
import plus.oneteam.merchant_admin_backend.model.Product;
import plus.oneteam.merchant_admin_backend.payload.request.CreateProductRequest;
import plus.oneteam.merchant_admin_backend.payload.request.UpdateProductRequest;
import plus.oneteam.merchant_admin_backend.payload.response.ApiResponse;
import plus.oneteam.merchant_admin_backend.service.ProductService;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/products")
public class ProductController {

    private static final Logger log = LoggerFactory.getLogger(ProductController.class);

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @PostMapping
    public ResponseEntity<Product> createProduct(
            @RequestBody CreateProductRequest request) {

        Product product = productService.createProduct(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(product);
    }

    @GetMapping
    public ResponseEntity<Page<Product>> getAllProducts(
            @RequestParam(required = false) String topLevelCategory,
            @RequestParam(required = false) String secondLevelCategory,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) List<String> colors,
            @RequestParam(required = false) List<String> sizes,
            @RequestParam(required = false) Integer minPrice,
            @RequestParam(required = false) Integer maxPrice,
            @RequestParam(required = false) Integer minDiscount,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String stock,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Page<Product> products = productService.getAllProducts(
                topLevelCategory, secondLevelCategory, category,
                colors, sizes, minPrice, maxPrice, minDiscount,
                sort, stock, page, size
        );
        return ResponseEntity.ok(products);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getProduct(@PathVariable Long id)
            throws ProductException {

        return ResponseEntity.ok(productService.findProductById(id));
    }

    @PutMapping("/{productId}")
    public ResponseEntity<Product> updateProduct(
            @PathVariable Long productId,
            @RequestBody UpdateProductRequest request
    ) throws ProductException {

        Product updatedProduct =
                productService.updateProduct(productId, request);

        return ResponseEntity.ok(updatedProduct);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id)
            throws ProductException {

        productService.deleteProduct(id);

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/creates")
    @Transactional
    public ResponseEntity<ApiResponse> createMultipleProducts(
            @RequestBody CreateProductRequest[] requests) {

        if (requests == null || requests.length == 0) {
            return ResponseEntity.badRequest().body(
                    createResponse("Product list must not be empty", false)
            );
        }

        for (CreateProductRequest request : requests) {
            log.debug("Creating product: {}", request.getTitle());
            productService.createProduct(request);
        }

        log.info("Successfully created {} products", requests.length);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(createResponse("Products created successfully", true));
    }

    private ApiResponse createResponse(String message, boolean status) {
        ApiResponse response = new ApiResponse();
        response.setMessage(message);
        response.setStatus(status);
        return response;
    }
}
