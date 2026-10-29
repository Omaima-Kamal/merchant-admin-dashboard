package plus.oneteam.merchant_admin_backend.repository;

import plus.oneteam.merchant_admin_backend.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {

    @Query(value = """
        SELECT DISTINCT p FROM Product p
        LEFT JOIN FETCH p.category c
        WHERE (:categoryId IS NULL OR c.id = :categoryId)
          AND (:minPrice IS NULL OR :maxPrice IS NULL OR p.discountedPrice BETWEEN :minPrice AND :maxPrice)
          AND (:minDiscount IS NULL OR p.discountPercent >= :minDiscount)
          AND (COALESCE(:colors) IS NULL OR p.color IN :colors)
          AND (
               :stock IS NULL
               OR (:stock = 'in_stock' AND p.quantity > 0)
               OR (:stock = 'out_of_stock' AND p.quantity <= 0)
              )
        """,
            countQuery = """
        SELECT COUNT(DISTINCT p) FROM Product p
        LEFT JOIN p.category c
        WHERE (:categoryId IS NULL OR c.id = :categoryId)
          AND (:minPrice IS NULL OR :maxPrice IS NULL OR p.discountedPrice BETWEEN :minPrice AND :maxPrice)
          AND (:minDiscount IS NULL OR p.discountPercent >= :minDiscount)
          AND (COALESCE(:colors) IS NULL OR p.color IN :colors)
          AND (
               :stock IS NULL
               OR (:stock = 'in_stock' AND p.quantity > 0)
               OR (:stock = 'out_of_stock' AND p.quantity <= 0)
              )
        """)
    Page<Product> filterProductsDirect(
            @Param("categoryId") Long categoryId,
            @Param("colors") List<String> colors,
            @Param("minPrice") Integer minPrice,
            @Param("maxPrice") Integer maxPrice,
            @Param("minDiscount") Integer minDiscount,
            @Param("stock") String stock,
            Pageable pageable
    );
}