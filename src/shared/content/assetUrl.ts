import { useEffect, useState } from "react";
import { db } from "@/shared/db/db";

export function useAssetObjectUrl(assetId: string | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let lastUrl: string | null = null;
    (async () => {
      if (!assetId) {
        setUrl(null);
        return;
      }
      const asset = await db.lessonAssets.get(assetId);
      if (cancelled) return;
      if (!asset?.blob) {
        setUrl(null);
        return;
      }
      lastUrl = URL.createObjectURL(asset.blob);
      setUrl(lastUrl);
    })();
    return () => {
      cancelled = true;
      if (lastUrl) URL.revokeObjectURL(lastUrl);
    };
  }, [assetId]);

  return url;
}

