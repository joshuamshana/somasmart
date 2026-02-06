import React, { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker as string;

export function PdfViewer({
  blob,
  page: controlledPage,
  onNumPages,
  scale = 1.25
}: {
  blob: Blob;
  page?: number;
  onNumPages?: (n: number) => void;
  scale?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [internalPage, setInternalPage] = useState(1);
  const page = controlledPage ?? internalPage;
  const [numPages, setNumPages] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const docRef = useRef<pdfjs.PDFDocumentProxy | null>(null);
  const blobRef = useRef<Blob | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    (async () => {
      if (blobRef.current !== blob) {
        blobRef.current = blob;
        docRef.current = null;
        setNumPages(null);
      }

      if (!docRef.current) {
        const ab = await blob.arrayBuffer();
        docRef.current = await pdfjs.getDocument({ data: ab }).promise;
      }
      const doc = docRef.current;
      if (cancelled) return;
      setNumPages(doc.numPages);
      onNumPages?.(doc.numPages);
      const pg = await doc.getPage(page);
      if (cancelled) return;
      const viewport = pg.getViewport({ scale });
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
  }, [blob, page, onNumPages, scale]);

  return (
    <div className="space-y-2">
      {controlledPage == null ? (
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted">PDF {numPages ? `${page} / ${numPages}` : ""}</div>
          <div className="flex gap-2">
            <button
              className="rounded bg-surface2 px-2 py-1 text-xs hover:bg-surface2/80 disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setInternalPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <button
              className="rounded bg-surface2 px-2 py-1 text-xs hover:bg-surface2/80 disabled:opacity-50"
              disabled={numPages ? page >= numPages : true}
              onClick={() => setInternalPage((p) => (numPages ? Math.min(numPages, p + 1) : p))}
            >
              Next
            </button>
          </div>
        </div>
      ) : (
        <div className="text-xs text-muted">PDF {numPages ? `${page} / ${numPages}` : ""}</div>
      )}
      {error ? <div className="text-sm text-danger-text">{error}</div> : null}
      <canvas ref={canvasRef} className="max-w-full rounded border border-border" />
    </div>
  );
}
