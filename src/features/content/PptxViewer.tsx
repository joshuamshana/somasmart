import React, { useEffect, useRef, useState } from "react";

async function tryRenderPptx(container: HTMLElement, blob: Blob) {
  const ab = await blob.arrayBuffer();
  const mod: unknown = await import("pptx-preview");
  const candidate: unknown = hasDefault(mod) ? mod.default : mod;

  if (hasRender(candidate)) {
    return candidate.render(ab, container, { slideMode: true });
  }
  if (hasRender(mod)) {
    return mod.render(ab, container, { slideMode: true });
  }
  if (typeof candidate === "function") {
    // Some libs export a constructor
    const inst: unknown = new (candidate as unknown as new (...args: unknown[]) => unknown)(container, {
      slideMode: true
    });
    if (hasRender(inst)) {
      return inst.render(ab);
    }
  }
  throw new Error("PPTX renderer not available. Please upload a PDF alternative.");
}

function hasRender(x: unknown): x is { render: (...args: unknown[]) => unknown } {
  return (
    typeof x === "object" &&
    x !== null &&
    "render" in x &&
    typeof (x as { render?: unknown }).render === "function"
  );
}

function hasDefault(x: unknown): x is { default: unknown } {
  return typeof x === "object" && x !== null && "default" in x;
}

export function PptxViewer({ blob, name }: { blob: Blob; name: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    void tryRenderPptx(el, blob).catch((e: unknown) => {
      if (cancelled) return;
      setError(e instanceof Error ? e.message : "Failed to render PPTX");
    });
    return () => {
      cancelled = true;
    };
  }, [blob]);

  return (
    <div className="space-y-2">
      {error ? (
        <div className="rounded border border-amber-700 bg-amber-950 p-3 text-sm text-amber-200">
          <div className="font-semibold">PPTX preview unavailable</div>
          <div className="mt-1">{error}</div>
          <div className="mt-2 text-xs text-amber-300">
            Suggested fallback: export this PPTX to PDF and upload the PDF version.
          </div>
        </div>
      ) : null}
      <div ref={ref} className="overflow-auto rounded border border-slate-800 bg-slate-950 p-2" />
      <details className="text-xs text-slate-400">
        <summary>File info</summary>
        <div className="mt-1">{name}</div>
      </details>
    </div>
  );
}
