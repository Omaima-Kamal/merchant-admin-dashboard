package plus.oneteam.merchant_admin_backend.service;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import plus.oneteam.merchant_admin_backend.model.Category;
import plus.oneteam.merchant_admin_backend.repository.CategoryRepository;

@Service
public class CategoryService{

    private static final Logger log = LoggerFactory.getLogger(plus.oneteam.merchant_admin_backend.service.CategoryService.class);

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public Category findOrCreateTopLevel(String name) {
        Category existing = categoryRepository.findByNameIgnoreCase(name);
        if (existing != null) {
            return existing;
        }

        Category category = new Category();
        category.setName(name);
        category.setLevel(1);

        Category saved = categoryRepository.save(category);
        log.info("Created top-level category: {}", saved.getName());
        return saved;
    }

    public Category findOrCreateSecondLevel(String name, Category parent) {
        Category existing = categoryRepository.findByNameIgnoreCaseAndParentCategoryId(name, parent.getId());
        if (existing != null) {
            return existing;
        }

        Category category = new Category();
        category.setName(name);
        category.setParentCategory(parent);
        category.setLevel(2);

        Category saved = categoryRepository.save(category);
        log.info("Created second-level category: {} (parentId={})", saved.getName(), parent.getId());
        return saved;
    }

    public Category findOrCreateThirdLevel(String name, Category parent) {
        Category existing = categoryRepository.findByNameIgnoreCaseAndParentCategoryId(name, parent.getId());
        if (existing != null) {
            return existing;
        }

        Category category = new Category();
        category.setName(name);
        category.setParentCategory(parent);
        category.setLevel(3);

        Category saved = categoryRepository.save(category);
        log.info("Created third-level category: {} (parentId={})", saved.getName(), parent.getId());
        return saved;
    }

    public Category findByName(String name) {
        return categoryRepository.findByNameIgnoreCase(name);
    }
}