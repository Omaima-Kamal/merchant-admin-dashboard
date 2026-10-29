"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { ApiProduct, Size } from "@/features/products/types";
import { API_ENDPOINTS } from "@/lib/api";

const API_URL = API_ENDPOINTS.products;


type ProductEditFormProps = {
    product: ApiProduct;
    getToken: () => Promise<string | undefined>;
    onClose: () => void;
    onUpdated: () => void;
};

function formatSizes(sizes: Size[] = []) {
    return sizes.map((size) => `${size.name}:${size.quantity}`).join(", ");
}

function parseSizes(value: string): Size[] {
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
            const separator = item.lastIndexOf(":");

            if (separator < 1) {
                throw new Error(
                    `Invalid size "${item}". Use the format S:30, M:60.`,
                );
            }

            const name = item.slice(0, separator).trim();
            const quantityText = item.slice(separator + 1).trim();
            const quantity = Number(quantityText);

            if (
                !name ||
                !Number.isInteger(quantity) ||
                quantity < 0
            ) {
                throw new Error(
                    `Invalid size "${item}". Quantities must be non-negative integers.`,
                );
            }

            return { name, quantity };
        });
}

export default function ProductEditForm({
    product,
    getToken,
    onClose,
    onUpdated,
}: ProductEditFormProps) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const leafCategory = product.category;
    const secondCategory = leafCategory?.parentCategory;
    const topCategory = secondCategory?.parentCategory;

    const initialFormData = {
        title: product.title ?? "",
        description: product.description ?? "",
        price: product.price ?? 0,
        discountedPrice: product.discountedPrice ?? 0,
        discountPercent: product.discountPercent ?? 0,
        quantity: product.quantity ?? 0,
        brand: product.brand ?? "",
        color: product.color ?? "",
        imageUrl: product.imageUrl ?? "",
        sizes: product.sizes ?? [],

        topLevelCategory: topCategory?.name ?? "",
        secondLevelCategory: secondCategory?.name ?? "",
        thirdLevelCategory: leafCategory?.name ?? "",
    };
    const handleSubmit: NonNullable<
        React.ComponentProps<"form">["onSubmit"]
    > = async (event) => {
        event.preventDefault();
        setError("");

        const productId = product.id ?? product._id;

        if (productId === undefined || productId === null || productId === "") {
            setError("Cannot update this product because its ID is missing.");
            return;
        }

        if (!API_URL) {
            setError("The product API URL is not configured.");
            return;
        }

        const form = new FormData(event.currentTarget);

        const price = Number(form.get("price"));
        const discountedPrice = Number(form.get("discountedPrice"));
        const quantity = Number(form.get("quantity"));

        if (
            !Number.isFinite(price) ||
            !Number.isFinite(discountedPrice) ||
            price < 0 ||
            discountedPrice < 0 ||
            discountedPrice > price
        ) {
            setError(
                "Enter valid prices. The discounted price cannot exceed the original price.",
            );
            return;
        }

        if (!Number.isInteger(quantity) || quantity < 0) {
            setError("Stock quantity must be a non-negative integer.");
            return;
        }

        let sizes: Size[];

        try {
            sizes = parseSizes(String(form.get("sizes") ?? ""));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Invalid sizes.");
            return;
        }

        const discountPercent =
            price > 0
                ? Math.round(((price - discountedPrice) / price) * 100)
                : 0;

        const updatedProduct = {
            imageUrl: String(form.get("imageUrl") ?? "").trim(),
            brand: String(form.get("brand") ?? "").trim(),
            color: String(form.get("color") ?? "").trim(),
            title: String(form.get("title") ?? "").trim(),
            price,
            discountedPrice,
            discountPercent,
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
            description: String(form.get("description") ?? "").trim(),
        };

        if (
            !updatedProduct.title ||
            !updatedProduct.brand ||
            !updatedProduct.topLevelCategory ||
            !updatedProduct.secondLevelCategory ||
            !updatedProduct.thirdLevelCategory
        ) {
            setError("Please fill in all required fields.");
            return;
        }

        try {
            setSaving(true);

            const token = await getToken();

            if (!token) {
                throw new Error("You are not authenticated. Please log in again.");
            }

            const productId = product.id ?? product._id;

            const response = await fetch(`${API_ENDPOINTS.products}/${productId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updatedProduct),
            });

            if (!response.ok) {
                const message = await response.text();
                throw new Error(
                    message || `Failed to update product (${response.status}).`,
                );
            }

            onUpdated();
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "Failed to update product.",
            );
        } finally {
            setSaving(false);
        }
    };


    const fields = [
        { name: "title", label: "Product title", value: product.title, required: true },
        { name: "brand", label: "Brand", value: product.brand, required: true },
        { name: "color", label: "Color", value: product.color },
        { name: "imageUrl", label: "Image URL", value: product.imageUrl },
        {
            name: "topLevelCategory",
            label: "Main category",
            value: product.topLevelCategory,
            required: true,
        },
        {
            name: "secondLevelCategory",
            label: "Subcategory",
            value: product.secondLevelCategory,
            required: true,
        },
        {
            name: "thirdLevelCategory",
            label: "Product category",
            value: product.thirdLevelCategory,
            required: true,
        },
        { name: "price", label: "Original price", value: String(product.price), type: "number", required: true },
        { name: "discountedPrice", label: "Discounted price", value: String(product.discountedPrice), type: "number", required: true },
        { name: "quantity", label: "Stock quantity", value: String(product.quantity), type: "number", required: true },
    ];


    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !saving) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-product-title"
                className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            >
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 id="edit-product-title" className="text-xl font-bold text-gray-900">
                            Edit product
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Update product details, pricing, and inventory.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        aria-label="Close edit form"
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {fields.map((field) => (
                            <label key={field.name} className="block">
                                <span className="mb-1 block text-sm font-medium text-gray-700">
                                    {field.label}
                                </span>
                                <input
                                    name={field.name}
                                    type={field.type ?? "text"}
                                    defaultValue={field.value ?? ""}
                                    required={field.required}
                                    min={field.type === "number" ? 0 : undefined}
                                    step={
                                        field.name === "price" ||
                                            field.name === "discountedPrice"
                                            ? "0.01"
                                            : field.name === "quantity"
                                                ? "1"
                                                : undefined
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                                />
                            </label>
                        ))}
                    </div>

                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-gray-700">
                            Sizes and quantities
                        </span>
                        <input
                            name="sizes"
                            defaultValue={formatSizes(product.sizes)}
                            placeholder="S:30, M:60, L:30"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                        />
                        <span className="mt-1 block text-xs text-gray-500">
                            Separate sizes with commas; use a colon before each quantity.
                        </span>
                    </label>

                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-gray-700">
                            Description
                        </span>
                        <textarea
                            name="description"
                            defaultValue={product.description ?? ""}
                            rows={4}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                        />
                    </label>

                    {error && (
                        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                            {error}
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
                            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving ? "Saving..." : "Save changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}