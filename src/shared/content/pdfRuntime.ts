type PdfJsModule = typeof import("pdfjs-dist");

let pdfJsPromise: Promise<PdfJsModule> | null = null;

export async function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfJsPromise) {
    pdfJsPromise = (async () => {
      const [pdfjs, worker] = await Promise.all([
        import("pdfjs-dist"),
        import("pdfjs-dist/build/pdf.worker.min?url")
      ]);
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default as string;
      return pdfjs;
    })();
  }
  return pdfJsPromise;
}
