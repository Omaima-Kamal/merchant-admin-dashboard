
"use client";

import { useState } from "react";
import { Package } from "lucide-react";

type ProductImageProps = {
  src?: string;
  alt: string;
};

export default function ProductImage({
  src,
  alt,
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
        <Package className="h-5 w-5" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-12 w-12 shrink-0 rounded-lg bg-gray-100 object-cover"
    />
  );
}
