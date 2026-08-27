import type { Order } from "@app-types/index";
import { APP_NAME, DEFAULT_POS_SETTINGS, roundLabel } from "@constants/index";
import {
  PaymentType,
  WEEKDAYS,
  WEEKDAY_SHORT,
  type Weekday,
} from "@enums/index";
import { formatCurrency } from "@utils/helper/format";
import { PdfPage, buildPdf, monoWidth, rgb } from "@utils/libs/pdf";

const PAGE_WIDTH = 420; // A5 width in points — fits an A4 sheet two-up
const MARGIN = 32;
const RIGHT = PAGE_WIDTH - MARGIN;

const INK = rgb("#14171a");
const MUTED = rgb("#6b7280");
const FAINT = rgb("#d6dbe0");
const ACCENT = rgb("#0f8a6b");
const WARN = rgb("#b45309");
const WHITE = rgb("#ffffff");

/** Columns for the items table, as right-hand edges. */
const COL_QTY = RIGHT - 150;
const COL_PRICE = RIGHT - 78;
const COL_TOTAL = RIGHT;

interface Group {
  day: Weekday | undefined;
  lines: Order["items"];
}

function groupsFor(order: Order): Group[] {
  const dated: Group[] = WEEKDAYS.map((day) => ({
    day: day as Weekday | undefined,
    lines: order.items.filter((l) => l.day === day),
  })).filter((g) => g.lines.length > 0);

  const undated = order.items.filter((l) => !l.day);
  return undated.length > 0
    ? [...dated, { day: undefined, lines: undated }]
    : dated;
}

/** Greedy wrap against the mono metrics, so nothing overruns its column. */
function wrapMono(text: string, maxWidth: number, size: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && monoWidth(candidate, size) > maxWidth) {
      out.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) out.push(line);
  return out.length > 0 ? out : [""];
}

/**
 * Measures the document before drawing it, so the page can be exactly as tall as
 * the receipt needs. A fixed page would either clip a long order or leave half a
 * sheet of white space under a short one.
 */
function measure(order: Order): number {
  const groups = groupsFor(order);
  const grouped = groups.length > 1 || groups[0]?.day !== undefined;

  let h = 88 + 16; // brand band + gap
  h += 6 * 15 + 18; // six meta rows + gap
  h += 22; // table head
  for (const group of groups) {
    if (grouped) h += 18;
    for (const line of group.lines) {
      h += 14 * wrapMono(line.name, COL_QTY - MARGIN - 8, 8).length;
    }
    if (grouped) h += 16;
  }
  h += 14 + 3 * 17 + 10; // totals block
  h += 34; // footer
  return Math.max(h, 340);
}

/**
 * The receipt as a laid-out PDF: a brand band, the transaction details, the
 * items grouped by delivery day, then the money.
 *
 * Amounts and item names are set in Courier so every column can be aligned
 * exactly — Courier is the one built-in font whose widths need no metrics table.
 */
export function buildReceiptPdf(order: Order): string {
  const page = new PdfPage(PAGE_WIDTH, measure(order));
  const groups = groupsFor(order);
  const grouped = groups.length > 1 || groups[0]?.day !== undefined;

  // ── Brand band ──────────────────────────────────────────────────────
  page.rect(0, 0, PAGE_WIDTH, 88, ACCENT);
  page.text(APP_NAME, MARGIN, 38, { size: 21, font: "bold", color: WHITE });
  page.text("POINT OF SALE", MARGIN, 52, {
    size: 7,
    font: "regular",
    color: WHITE,
  });
  page.textRight("RECEIPT", RIGHT, 34, {
    size: 9,
    font: "monoBold",
    color: WHITE,
  });
  page.textRight(order.id, RIGHT, 48, {
    size: 13,
    font: "monoBold",
    color: WHITE,
  });
  page.textRight(order.date, RIGHT, 64, {
    size: 8,
    font: "mono",
    color: WHITE,
  });

  // ── Transaction details ─────────────────────────────────────────────
  let y = 122;
  const meta: [string, string][] = [
    ["Customer", order.customer.name],
    ["Phone", order.customer.phone],
    [
      "Address",
      [order.customer.address, order.customer.postcode]
        .filter(Boolean)
        .join(", "),
    ],
    ["Round", roundLabel(order.customer.round)],
    ["Courier", order.courier],
    ["Status", order.paymentType],
  ];
  for (const [label, value] of meta) {
    page.text(label.toUpperCase(), MARGIN, y, { size: 6.5, color: MUTED });
    page.text(value, MARGIN + 62, y, {
      size: 8.5,
      font: label === "Status" ? "monoBold" : "mono",
      color:
        label === "Status" && order.paymentType === PaymentType.OnCredit
          ? WARN
          : INK,
    });
    y += 15;
  }

  // ── Items ───────────────────────────────────────────────────────────
  y += 4;
  page.line(MARGIN, y, RIGHT, FAINT);
  y += 12;
  page.text("ITEM", MARGIN, y, { size: 6.5, color: MUTED });
  page.textRight("QTY", COL_QTY, y, { size: 6.5, color: MUTED });
  page.textRight("PRICE", COL_PRICE, y, { size: 6.5, color: MUTED });
  page.textRight("TOTAL", COL_TOTAL, y, { size: 6.5, color: MUTED });
  y += 6;
  page.line(MARGIN, y, RIGHT, FAINT);
  y += 14;

  for (const group of groups) {
    if (grouped) {
      page.text(
        group.day ? WEEKDAY_SHORT[group.day].toUpperCase() : "ONE-OFF",
        MARGIN,
        y,
        { size: 7.5, font: "bold", color: ACCENT },
      );
      y += 14;
    }

    for (const line of group.lines) {
      const wrapped = wrapMono(line.name, COL_QTY - MARGIN - 8, 8);
      wrapped.forEach((text, i) => {
        page.text(text, MARGIN, y, { size: 8, font: "mono", color: INK });
        // Figures sit on the first line of a wrapped name, not the last.
        if (i === 0) {
          page.textRight(String(line.qty), COL_QTY, y, { size: 8 });
          page.textRight(formatCurrency(line.price), COL_PRICE, y, { size: 8 });
          page.textRight(formatCurrency(line.qty * line.price), COL_TOTAL, y, {
            size: 8,
            font: "monoBold",
          });
        }
        y += 14;
      });
    }

    if (grouped) {
      const subtotal = group.lines.reduce((n, l) => n + l.qty * l.price, 0);
      page.text(
        `${group.day ? WEEKDAY_SHORT[group.day] : "One-off"} subtotal`,
        MARGIN + 8,
        y,
        { size: 7.5, color: MUTED },
      );
      page.textRight(formatCurrency(subtotal), COL_TOTAL, y, {
        size: 8,
        font: "monoBold",
        color: MUTED,
      });
      y += 16;
    }
  }

  // ── Money ───────────────────────────────────────────────────────────
  page.line(MARGIN, y, RIGHT, FAINT);
  y += 16;
  page.text("This bill", MARGIN, y, { size: 8.5, color: MUTED });
  page.textRight(formatCurrency(order.total), COL_TOTAL, y, { size: 9 });
  y += 15;
  page.text("Previous balance", MARGIN, y, { size: 8.5, color: MUTED });
  page.textRight(
    order.previousBalance > 0 ? formatCurrency(order.previousBalance) : "NIL",
    COL_TOTAL,
    y,
    { size: 9, color: order.previousBalance > 0 ? WARN : MUTED },
  );
  y += 8;

  // The one figure that must not be missed gets its own band.
  page.rect(MARGIN, y, RIGHT - MARGIN, 26, ACCENT);
  page.text("TOTAL DUE", MARGIN + 10, y + 17, {
    size: 9,
    font: "bold",
    color: WHITE,
  });
  page.textRight(formatCurrency(order.grandTotal), RIGHT - 10, y + 17.5, {
    size: 12,
    font: "monoBold",
    color: WHITE,
  });
  y += 26 + 24;

  page.text(DEFAULT_POS_SETTINGS.receiptNote, MARGIN, y, {
    size: 7.5,
    color: MUTED,
  });

  return buildPdf(page);
}

/** `receipt-TRX-8921.pdf` — the id is what anyone searching will have. */
export function receiptFilename(order: Order): string {
  return `receipt-${order.id}.pdf`;
}
