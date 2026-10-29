package plus.oneteam.merchant_admin_backend.payload.request;

import plus.oneteam.merchant_admin_backend.model.Size;

import java.util.Set;

public record UpdateProductRequest(
        String title,
        String description,
        Integer price,
        Integer discountedPrice,
        Integer discountPercent,
        Integer quantity,
        String brand,
        String color,
        Set<Size> sizes,
        String imageUrl,
        String topLevelCategory,
        String secondLevelCategory,
        String thirdLevelCategory
) {}
