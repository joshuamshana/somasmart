import React, { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker as string;

export function PdfViewer({ blob }: { blob: Blob }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    (async () => {
      const ab = await blob.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: ab }).promise;
      if (cancelled) return;
      setNumPages(doc.numPages);
      const pg = await doc.getPage(page);
      if (cancelled) return;
      const viewport = pg.getViewport({ scale: 1.25 });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      await pg.render({ canvasContext: ctx, viewport }).promise;
    })().catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to render PDF"));
    return () => {
      cancelled = true;
    };
  }, [blob, page]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-slate-400">
          PDF {numPages ? `${page} / ${numPages}` : ""}
        </div>
        <div className="flex gap-2">
          <button
            className="rounded bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <button
            className="rounded bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700 disabled:opacity-50"
            disabled={numPages ? page >= numPages : true}
            onClick={() => setPage((p) => (numPages ? Math.min(numPages, p + 1) : p))}
          >
            Next
          </button>
        </div>
      </div>
      {error ? <div className="text-sm text-rose-400">{error}</div> : null}
      <canvas ref={canvasRef} className="max-w-full rounded border border-slate-800" />
    </div>
  );
}
