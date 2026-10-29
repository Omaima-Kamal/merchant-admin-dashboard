"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { Size } from "@/features/products/types";
import { API_ENDPOINTS } from "@/lib/api";

const API_URL = API_ENDPOINTS.products;

type ProductCreateFormProps = {
  getToken: () => Promise<string | undefined>;
  onClose: () => void;
  onCreated: () => void;
};

function ProductCreateForm({
  getToken,
  onClose,
  onCreated,
}: ProductCreateFormProps) {
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit: React.ComponentProps<"form">["onSubmit"] = async (
    event,
  ) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    setSaving(true);
    setFormError("");

    try {
      const form = new FormData(event.currentTarget);

      const price = Number(form.get("price"));
      const discountedPrice = Number(form.get("discountedPrice"));
      const quantity = Number(form.get("quantity"));

      const sizesText = String(form.get("sizes") ?? "");
      const sizes: Size[] = sizesText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
          const separator = item.lastIndexOf(":");

          if (separator < 1) {
            throw new Error(
              'Invalid sizes format. Use "S:10, M:20, L:30".',
            );
          }

          const name = item.slice(0, separator).trim();
          const sizeQuantity = Number(item.slice(separator + 1).trim());

          if (!name || !Number.isInteger(sizeQuantity) || sizeQuantity < 0) {
            throw new Error(
              'Invalid sizes format. Use "S:10, M:20, L:30".',
            );
          }

          return { name, quantity: sizeQuantity };
        });

      if (sizes.length === 0) {
        throw new Error("Enter at least one size and its quantity.");
      }

      if (
        !Number.isFinite(price) ||
        !Number.isFinite(discountedPrice) ||
        price < 0 ||
        discountedPrice < 0 ||
        discountedPrice > price
      ) {
        throw new Error(
          "Enter valid prices. The discounted price cannot exceed the original price.",
        );
      }

      if (!Number.isInteger(quantity) || quantity < 0) {
        throw new Error("Quantity must be a non-negative whole number.");
      }

      const token = await getToken();

      if (!token) {
        throw new Error("No Keycloak access token is available.");
      }

      const payload = {
        title: String(form.get("title") ?? "").trim(),
        brand: String(form.get("brand") ?? "").trim(),
        color: String(form.get("color") ?? "").trim(),
        description: String(form.get("description") ?? "").trim(),
        imageUrl: String(form.get("imageUrl") ?? "").trim(),
        price,
        discountedPrice,
        discountPercent:
          price > 0
            ? Math.round(((price - discountedPrice) / price) * 100)
            : 0,
        quantity,
        sizes,
        topLevelCategory: String(
          form.get("topLevelCategory") ?? "",
        ).trim(),
        secondLevelCategory: String(
          form.get("secondLevelCategory") ?? "",
        ).trim(),
        thirdLevelCategory: String(
          form.get("thirdLevelCategory") ?? "",
        ).trim(),
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          message || `Failed to create product (${response.status}).`,
        );
      }

      onCreated();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
      );
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200";

  const labelClass = "mb-1 block text-sm font-medium text-gray-700";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-product-title"
        className="mx-auto my-8 max-w-3xl rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2
              id="create-product-title"
              className="text-xl font-bold text-gray-900"
            >
              Add product
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter product details and inventory.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="product-title">
                Product title *
              </label>
              <input
                id="product-title"
                name="title"
                required
                maxLength={200}
                className={fieldClass}
                placeholder="Classic sweater"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="product-brand">
                Brand *
              </label>
              <input
                id="product-brand"
                name="brand"
                required
                className={fieldClass}
                placeholder="Brand name"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="product-color">
                Color *
              </label>
              <input
                id="product-color"
                name="color"
                required
                className={fieldClass}
                placeholder="Black"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="product-image">
                Image URL
              </label>
              <input
                id="product-image"
                name="imageUrl"
                type="url"
                className={fieldClass}
                placeholder="http://example.com/product.jpg"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="product-price">
                Original price *
              </label>
              <input
                id="product-price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                required
                className={fieldClass}
                placeholder="800"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="product-discounted-price">
                Discounted price *
              </label>
              <input
                id="product-discounted-price"
                name="discountedPrice"
                type="number"
                min="0"
                step="0.01"
                required
                className={fieldClass}
                placeholder="600"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="product-quantity">
                Total quantity *
              </label>
              <input
                id="product-quantity"
                name="quantity"
                type="number"
                min="0"
                step="1"
                required
                className={fieldClass}
                placeholder="120"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="product-sizes">
                Sizes and quantities *
              </label>
              <input
                id="product-sizes"
                name="sizes"
                required
                className={fieldClass}
                placeholder="S:30, M:60, L:30"
              />
              <p className="mt-1 text-xs text-gray-500">
                Separate sizes with commas; use a colon before each quantity.
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-semibold text-gray-900">Categories</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass} htmlFor="product-category-1">
                  Top-level category *
                </label>
                <input
                  id="product-category-1"
                  name="topLevelCategory"
                  required
                  className={fieldClass}
                  placeholder="men"
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="product-category-2">
                  Second-level category *
                </label>
                <input
                  id="product-category-2"
                  name="secondLevelCategory"
                  required
                  className={fieldClass}
                  placeholder="clothing"
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="product-category-3">
                  Third-level category *
                </label>
                <input
                  id="product-category-3"
                  name="thirdLevelCategory"
                  required
                  className={fieldClass}
                  placeholder="sweaters"
                />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="product-description">
              Description *
            </label>
            <textarea
              id="product-description"
              name="description"
              required
              rows={3}
              className={fieldClass}
              placeholder="Describe the product..."
            />
          </div>

          {formError && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {saving ? "Saving..." : "Create product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProductCreateForm;