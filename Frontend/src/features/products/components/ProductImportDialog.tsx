
"use client";

import { useState } from "react";
import { FileJson, Upload, X } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";


const API_URL = API_ENDPOINTS.products;

type ProductImportDialogProps = {
  getToken: () => Promise<string | undefined>;
  onClose: () => void;
  onImported: () => void;
};

type ImportResponse = {
  message?: string;
  status?: boolean;
};

export default function ProductImportDialog({
  getToken,
  onClose,
  onImported,
}: ProductImportDialogProps) {
  const [products, setProducts] = useState<Record<string, unknown>[] | null>(
    null,
  );
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    setProducts(null);
    setFileName("");
    setError("");
    setSuccess("");

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".json")) {
      setError("Please select a .json file.");
      event.target.value = "";
      return;
    }

    try {
      const parsed: unknown = JSON.parse(await file.text());

      if (
        !Array.isArray(parsed) ||
        parsed.length === 0 ||
        !parsed.every(
          (item) =>
            item !== null &&
            typeof item === "object" &&
            !Array.isArray(item),
        )
      ) {
        throw new Error(
          "The JSON file must contain a non-empty array of product objects.",
        );
      }

      setProducts(parsed as Record<string, unknown>[]);
      setFileName(file.name);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to read this JSON file.",
      );
    }
  };

  const handleImport = async () => {
    if (!products || products.length === 0) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const baseUrl = API_URL.replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/creates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(products),
      });

      const result = (await response.json().catch(() => null)) as
        | ImportResponse
        | null;

      if (!response.ok || result?.status === false) {
        throw new Error(
          result?.message || `Import failed (HTTP ${response.status}).`,
        );
      }

      setSuccess(
        result?.message || `Successfully imported ${products.length} products.`,
      );

      onImported();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-import-title"
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2
              id="product-import-title"
              className="text-xl font-semibold text-gray-900"
            >
              Import products
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Upload a JSON array of products.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close import dialog"
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <label
          htmlFor="products-json-file"
          className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-gray-300 px-4 py-8 text-center hover:border-gray-500"
        >
          <FileJson size={36} className="mb-3 text-gray-500" />
          <span className="font-medium text-gray-800">
            Choose a JSON file
          </span>
          <span className="mt-1 text-sm text-gray-500">
            Select your products.json file
          </span>

          <input
            id="products-json-file"
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            disabled={loading}
            className="sr-only"
          />
        </label>

        {fileName && (
          <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            <p className="font-medium">{fileName}</p>
            <p className="mt-1">
              {products?.length ?? 0} product(s) ready to import
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {success && (
          <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {success}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {success ? "Close" : "Cancel"}
          </button>

          <button
            type="button"
            onClick={handleImport}
            disabled={!products || loading || Boolean(success)}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload size={16} />
            {loading ? "Importing..." : "Import products"}
          </button>
        </div>
      </div>
    </div>
  );
}
