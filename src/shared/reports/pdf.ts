import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function buildSimplePdfBytes({
  title,
  subtitle,
  lines
}: {
  title: string;
  subtitle?: string;
  lines: string[];
}) {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([612, 792]); // US Letter points
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 48;
  let y = 792 - margin;

  page.drawText(title, { x: margin, y, size: 18, font: bold, color: rgb(0, 0, 0) });
  y -= 24;
  if (subtitle) {
    page.drawText(subtitle, { x: margin, y, size: 11, font, color: rgb(0.35, 0.35, 0.35) });
    y -= 18;
  }
  y -= 6;

  const fontSize = 11;
  const lineHeight = 14;
  for (const line of lines) {
    if (y < margin + 40) {
      y = 792 - margin;
      page = pdf.addPage([612, 792]);
    }
    page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
    y -= lineHeight;
  }

  return pdf.save();
}

export async function downloadPdf({
  filename,
  title,
  subtitle,
  lines
}: {
  filename: string;
  title: string;
  subtitle?: string;
  lines: string[];
}) {
  const bytes = await buildSimplePdfBytes({ title, subtitle, lines });
  const safeBytes = new Uint8Array(bytes);
  const blob = new Blob([safeBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
