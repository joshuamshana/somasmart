let pdfjsModulePromise: Promise<typeof import("pdfjs-dist")> | null = null;
let workerModulePromise: Promise<typeof import("pdfjs-dist/build/pdf.worker.min?url")> | null = null;
let workerConfigured = false;

export async function getPdfjsModule() {
  if (!pdfjsModulePromise) {
    pdfjsModulePromise = import("pdfjs-dist");
  }
  const pdfjs = await pdfjsModulePromise;

  if (!workerConfigured) {
    if (!workerModulePromise) {
      workerModulePromise = import("pdfjs-dist/build/pdf.worker.min?url");
    }
    const worker = await workerModulePromise;
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default as string;
    workerConfigured = true;
  }

  return pdfjs;
}
