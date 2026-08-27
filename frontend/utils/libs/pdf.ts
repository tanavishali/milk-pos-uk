/**
 * A very small PDF writer — enough for a one-page receipt, nothing more.
 *
 * Hand-rolled rather than pulling in a PDF library: this needs text, rules and
 * filled rectangles in three built-in fonts, which is a couple of hundred lines
 * of a well-documented format. A library would add hundreds of kilobytes to
 * every page of the app for one dialog.
 *
 * Only the three standard Type1 fonts are used, so nothing has to be embedded —
 * every reader already has them.
 */

export type PdfFont = "regular" | "bold" | "mono" | "monoBold";

const FONT_RESOURCE: Record<PdfFont, string> = {
  regular: "/F1",
  bold: "/F2",
  mono: "/F3",
  monoBold: "/F4",
};

/** Courier is 600/1000 em per glyph — the only width maths needed. */
const MONO_RATIO = 0.6;

export function monoWidth(text: string, size: number): number {
  return text.length * size * MONO_RATIO;
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** `#0f8a6b` → PDF's 0–1 components. */
export function rgb(hex: string): Rgb {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  };
}

/**
 * PDF strings are Latin-1. Anything outside it is transliterated rather than
 * dropped — an em dash silently vanishing from an address is worse than a
 * hyphen appearing in its place.
 */
function escapeText(text: string): string {
  return text
    .replace(/[—–]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/·/g, "-")
    .replace(/[^\x20-\x7e\xa0-\xff]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

/**
 * Builds one variable-height page.
 *
 * Height rather than pagination: a receipt is a strip, and letting the page grow
 * avoids splitting a totals block across a page boundary — which is the one
 * thing on a receipt nobody should have to hunt for.
 */
export class PdfPage {
  private ops: string[] = [];

  constructor(
    readonly width: number,
    readonly height: number,
  ) {}

  /** Baseline coordinates, measured from the top for sanity. */
  text(
    value: string,
    x: number,
    yFromTop: number,
    opts: { size?: number; font?: PdfFont; color?: Rgb } = {},
  ): void {
    const { size = 9, font = "regular", color } = opts;
    const y = this.height - yFromTop;
    this.ops.push(
      "BT",
      color ? `${color.r} ${color.g} ${color.b} rg` : "0 0 0 rg",
      `${FONT_RESOURCE[font]} ${size} Tf`,
      `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`,
      `(${escapeText(value)}) Tj`,
      "ET",
    );
  }

  /** Right-aligned at `xRight`. Mono only, because that is what can be measured. */
  textRight(
    value: string,
    xRight: number,
    yFromTop: number,
    opts: { size?: number; font?: "mono" | "monoBold"; color?: Rgb } = {},
  ): void {
    const { size = 9, font = "mono" } = opts;
    this.text(value, xRight - monoWidth(value, size), yFromTop, {
      ...opts,
      size,
      font,
    });
  }

  rect(x: number, yFromTop: number, w: number, h: number, color: Rgb): void {
    const y = this.height - yFromTop - h;
    this.ops.push(
      `${color.r} ${color.g} ${color.b} rg`,
      `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`,
    );
  }

  line(
    x1: number,
    yFromTop: number,
    x2: number,
    color: Rgb,
    thickness = 0.6,
  ): void {
    const y = (this.height - yFromTop).toFixed(2);
    this.ops.push(
      `${color.r} ${color.g} ${color.b} RG`,
      `${thickness} w`,
      `${x1.toFixed(2)} ${y} m ${x2.toFixed(2)} ${y} l S`,
    );
  }

  stream(): string {
    return this.ops.join("\n");
  }
}

/**
 * Assembles the file. Byte offsets for the xref table are tracked as the objects
 * are appended — the whole document is Latin-1, so string length is byte length.
 */
export function buildPdf(page: PdfPage): string {
  const content = page.stream();
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] ` +
      "/Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R /F4 7 0 R >> >> " +
      "/Contents 8 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    out += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  out +=
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
    `startxref\n${xrefStart}\n%%EOF\n`;

  return out;
}

/**
 * Hands the PDF to the user.
 *
 * The string is written byte-for-byte as Latin-1: encoding it as UTF-8 would
 * turn every accented character into two bytes and desynchronise the xref
 * offsets, which makes readers reject the file.
 */
export function downloadPdf(filename: string, pdf: string): void {
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i += 1) bytes[i] = pdf.charCodeAt(i) & 0xff;

  const url = URL.createObjectURL(
    new Blob([bytes], { type: "application/pdf" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
