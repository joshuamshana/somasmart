import React, { useEffect, useState } from "react";
import type { LessonAsset, LessonBlock } from "@/shared/types";
import { db } from "@/shared/db/db";
import { PdfViewer } from "@/features/content/PdfViewer";
import { PptxViewer } from "@/features/content/PptxViewer";
import { useAssetObjectUrl } from "@/shared/content/assetUrl";

function useAsset(assetId: string | null) {
  const [asset, setAsset] = useState<LessonAsset | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!assetId) {
        setAsset(null);
        return;
      }
      const a = await db.lessonAssets.get(assetId);
      if (cancelled) return;
      setAsset(a ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [assetId]);
  return asset;
}

function AssetBlock({ block }: { block: Extract<LessonBlock, { assetId: string }> }) {
  const asset = useAsset(block.assetId);
  const url = useAssetObjectUrl(asset?.id ?? null);

  if (!asset) return <div className="text-sm text-slate-400">Loading asset…</div>;

  if (block.type === "image") {
    return url ? <img src={url} alt={asset.name} className="max-w-full rounded border border-slate-800" /> : null;
  }
  if (block.type === "audio") {
    return url ? (
      <audio controls src={url} className="w-full" />
    ) : (
      <div className="text-sm text-slate-400">Audio unavailable.</div>
    );
  }
  if (block.type === "video") {
    return url ? (
      <video controls src={url} className="w-full max-h-[60vh] rounded border border-slate-800 bg-black" />
    ) : (
      <div className="text-sm text-slate-400">Video unavailable.</div>
    );
  }
  if (block.type === "pdf") {
    return <PdfViewer blob={asset.blob} />;
  }
  if (block.type === "pptx") {
    return <PptxViewer blob={asset.blob} name={asset.name} />;
  }
  return null;
}

export function LessonPlayer({ blocks }: { blocks: LessonBlock[] }) {
  return (
    <div className="space-y-6">
      {blocks.map((b) => {
        if (b.type === "text") {
          return (
            <div key={b.id} className="whitespace-pre-wrap rounded border border-slate-800 bg-slate-950 p-4 text-sm leading-6 text-slate-100">
              {b.text}
            </div>
          );
        }
        return (
          <div key={b.id} className="space-y-2">
            <div className="text-xs text-slate-400">{b.name}</div>
            <AssetBlock block={b} />
          </div>
        );
      })}
    </div>
  );
}
