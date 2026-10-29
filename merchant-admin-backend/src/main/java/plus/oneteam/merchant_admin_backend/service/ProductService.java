package plus.oneteam.merchant_admin_backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plus.oneteam.merchant_admin_backend.exception.ProductException;
import plus.oneteam.merchant_admin_backend.model.Category;
import plus.oneteam.merchant_admin_backend.model.Product;
import plus.oneteam.merchant_admin_backend.payload.request.CreateProductRequest;
import plus.oneteam.merchant_admin_backend.payload.request.UpdateProductRequest;
import plus.oneteam.merchant_admin_backend.repository.CategoryRepository;
import plus.oneteam.merchant_admin_backend.repository.ProductRepository;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ProductService {

    private static final Logger log = LoggerFactory.getLogger(ProductService.class);

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final FileStorageService fileStorageService;
    private final CategoryService categoryService;

    public ProductService(ProductRepository productRepository, CategoryRepository categoryRepository, FileStorageService fileStorageService, CategoryService categoryService) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.fileStorageService = fileStorageService;
        this.categoryService = categoryService;
    }

    public Product createProduct(CreateProductRequest request) {
        Category topLevel = categoryService.findOrCreateTopLevel(request.getTopLevelCategory());
        Category secondLevel = categoryService.findOrCreateSecondLevel(request.getSecondLevelCategory(), topLevel);
        Category thirdLevel = categoryService.findOrCreateThirdLevel(request.getThirdLevelCategory(), secondLevel);

        Product product = new Product();
        product.setTitle(request.getTitle());
        product.setColor(request.getColor());
        product.setDescription(request.getDescription());
        product.setDiscountedPrice(request.getDiscountedPrice());
        product.setDiscountPercent(request.getDiscountPercent());

        String localImageUrl = fileStorageService.downloadAndStore(request.getImageUrl());
        product.setImageUrl(localImageUrl);

        product.setBrand(request.getBrand());
        product.setPrice(request.getPrice());
        product.setSizes(request.getSizes());
        product.setQuantity(request.getQuantity());
        product.setCategory(thirdLevel);
        product.setCreateAt(LocalDateTime.now());

        Product savedProduct = productRepository.save(product);
        log.info("Created product id={} title='{}' category={} imageUrl={}",
                savedProduct.getId(), savedProduct.getTitle(), thirdLevel.getName(), localImageUrl);

        return savedProduct;
    }

    public String deleteProduct(Long productId) throws ProductException {
        Product product = findProductById(productId);
        productRepository.delete(product);
        log.info("Deleted product id={}", productId);
        return "Product deleted Successfully";
    }

    public Product updateProduct(
            Long productId,
            UpdateProductRequest request
    ) throws ProductException {

        Product product = findProductById(productId);

        if (request.title() != null) {
            product.setTitle(request.title());
        }

        if (request.description() != null) {
            product.setDescription(request.description());
        }

        if (request.price() != null) {
            product.setPrice(request.price());
        }

        if (request.discountedPrice() != null) {
            product.setDiscountedPrice(request.discountedPrice());
        }

        if (request.discountPercent() != null) {
            product.setDiscountPercent(request.discountPercent());
        }

        if (request.quantity() != null) {
            product.setQuantity(request.quantity());
        }

        if (request.brand() != null) {
            product.setBrand(request.brand());
        }

        if (request.color() != null) {
            product.setColor(request.color());
        }

        if (request.sizes() != null) {
            product.setSizes(request.sizes());
        }

        if (request.imageUrl() != null
                && !request.imageUrl().isBlank()
                && !request.imageUrl().equals(product.getImageUrl())) {

            String localImageUrl =
                    fileStorageService.downloadAndStore(request.imageUrl());

            product.setImageUrl(localImageUrl);
        }

        if (request.topLevelCategory() != null
                && request.secondLevelCategory() != null
                && request.thirdLevelCategory() != null) {

            Category topLevel = categoryService.findOrCreateTopLevel(
                    request.topLevelCategory()
            );

            Category secondLevel = categoryService.findOrCreateSecondLevel(
                    request.secondLevelCategory(),
                    topLevel
            );

            Category thirdLevel = categoryService.findOrCreateThirdLevel(
                    request.thirdLevelCategory(),
                    secondLevel
            );

            product.setCategory(thirdLevel);
        }

        Product updatedProduct = productRepository.save(product);

        log.info("Updated product id={} title='{}'",
                updatedProduct.getId(),
                updatedProduct.getTitle());

        return updatedProduct;
    }


    public Product findProductById(Long id) throws ProductException {
        Optional<Product> opt = productRepository.findById(id);

        if (opt.isPresent()) {
            return opt.get();
        }
        log.warn("Product not found id={}", id);
        throw new ProductException("Product not found with id - " + id);
    }

    public List<Product> findProductByCategory(String category) {
        return List.of();
    }

    @Transactional(readOnly = true)
    public Page<Product> getAllProducts(String topLevelCategory, String secondLevelCategory, String category,
                                        List<String> colors, List<String> sizes, Integer minPrice, Integer maxPrice,
                                        Integer minDiscount, String sort, String stock, Integer pageNumber, Integer pageSize) {

        // 1. Configure sorting
        Sort sorting = Sort.by(Sort.Direction.DESC, "id");
        if ("price_low".equals(sort)) {
            sorting = Sort.by(Sort.Direction.ASC, "discountedPrice");
        } else if ("price_high".equals(sort)) {
            sorting = Sort.by(Sort.Direction.DESC, "discountedPrice");
        }

        Pageable pageable = PageRequest.of(pageNumber, pageSize, sorting);

        // 2. Resolve category ID
        boolean categoryWasRequested = category != null && !category.isEmpty();
        Long categoryId = categoryWasRequested ? resolveCategoryId(topLevelCategory, secondLevelCategory, category) : null;

        if (categoryWasRequested && categoryId == null) {
            return new PageImpl<>(Collections.emptyList(), pageable, 0);
        }

        List<String> queryColors = (colors != null && !colors.isEmpty()) ? colors : null;

        // 3. Directly query the database with paging, sorting, and filters applied
        Page<Product> productPage = productRepository.filterProductsDirect(
                categoryId, queryColors, minPrice, maxPrice, minDiscount, stock, pageable
        );


        productPage.getContent().forEach(product -> product.getSizes().size());

        return productPage;
    }

    private Long resolveCategoryId(String topLevelCategory, String secondLevelCategory, String category) {
        if (category == null || category.isEmpty()) {
            return null;
        }

        if (topLevelCategory == null || secondLevelCategory == null) {
            Category leaf = categoryRepository.findByNameIgnoreCase(category);
            return leaf != null ? leaf.getId() : null;
        }

        Category top = categoryRepository.findByNameIgnoreCase(topLevelCategory);
        if (top == null) {
            log.warn("No top-level category found matching '{}'", topLevelCategory);
            return null;
        }

        Category second = categoryRepository.findByNameIgnoreCaseAndParentCategoryId(secondLevelCategory, top.getId());
        if (second == null) {
            log.warn("No second-level category '{}' found under top-level '{}'", secondLevelCategory, top.getName());
            return null;
        }

        Category leaf = categoryRepository.findByNameIgnoreCaseAndParentCategoryId(category, second.getId());
        if (leaf == null) {
            log.warn("No category '{}' found under '{}' > '{}'", category, top.getName(), second.getName());
        }
        return leaf != null ? leaf.getId() : null;
    }

    public List<Product> findAllProducts() {
        return productRepository.findAll();
    }
}
