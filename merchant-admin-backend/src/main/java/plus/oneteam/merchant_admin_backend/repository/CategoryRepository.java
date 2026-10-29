package plus.oneteam.merchant_admin_backend.repository;

import plus.oneteam.merchant_admin_backend.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    public Category findByName(String name);

    Category findByNameIgnoreCase(String name);

    Category findByNameIgnoreCaseAndParentCategoryId(String name, Long parentCategoryId);


}
