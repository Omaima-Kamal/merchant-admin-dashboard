package plus.oneteam.merchant_admin_backend.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
public class Rating {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name="user_id",nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name="product_id",nullable = false)
    private Product product;

    @Column(name="rating")
    private double rating;

    private LocalDateTime cratedAt;


    public Rating() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public double getRating() {
        return rating;
    }

    public void setRating(double rating) {
        this.rating = rating;
    }

    public LocalDateTime getCratedAt() {
        return cratedAt;
    }

    public void setCratedAt(LocalDateTime cratedAt) {
        this.cratedAt = cratedAt;
    }
}
