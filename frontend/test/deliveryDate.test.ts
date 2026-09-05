import { describe, expect, it } from "vitest";
import type { Order } from "@app-types/index";
import { PaymentStatus } from "@enums/index";
import {
  formatDateInput,
  formatDeliveryDate,
  isDeliveryDate,
} from "@utils/helper/format";
import { buildReceiptPdf } from "@features/orders/utils/receiptPdf";

/**
 * The scheduled delivery date on the front end: the value the wizard puts in
 * the box, the rule that lets it leave step 3, and the words the receipt
 * prints.
 *
 * Dates are tested against timezone, not just format. Every bug this field can
 * have is an off-by-one-day, and off-by-one-day is invisible in a formatter
 * that only ever sees UTC.
 */

describe("formatDateInput", () => {
  it("reads the local calendar day, not the UTC one", () => {
    // 23:30 local on the 8th. `toISOString()` would call this the 9th anywhere
    // east of Greenwich, and the van would be scheduled a day late.
    const lateEvening = new Date(2026, 8, 8, 23, 30);
    expect(formatDateInput(lateEvening)).toBe("2026-09-08");
  });

  it("pads single-digit months and days", () => {
    expect(formatDateInput(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("round-trips through the validator the wizard gates on", () => {
    expect(isDeliveryDate(formatDateInput(new Date()))).toBe(true);
  });
});

describe("isDeliveryDate", () => {
  it("accepts what the date input produces", () => {
    expect(isDeliveryDate("2026-09-08")).toBe(true);
  });

  it.each([
    ["a cleared box", ""],
    ["a UK-style date", "08/09/2026"],
    ["a timestamp", "2026-09-08 10:30"],
    ["an unpadded month", "2026-9-08"],
    ["a weekday name", "monday"],
  ])("rejects %s, holding the wizard on step 3", (_label, value) => {
    expect(isDeliveryDate(value)).toBe(false);
  });
});

describe("formatDeliveryDate", () => {
  // Matched loosely on the month: en-IE abbreviates September as "Sept", and
  // which abbreviation a locale uses is ICU++s. The
  // weekday, day and year are what the assertions are actually about.
  it("names the weekday, because a round is planned in weekdays", () => {
    expect(formatDeliveryDate("2026-09-08")).toMatch(/^Tue 8 Sept? 2026$/);
  });

  it("does not slip a day at the start of the month", () => {
    // A bare `YYYY-MM-DD` through `new Date(string)` is UTC midnight, which
    // reads as the 31st of the month before in any negative offset.
    expect(formatDeliveryDate("2026-09-01")).toMatch(/^Tue 1 Sept? 2026$/);
  });

  it("returns anything that is not a date untouched, never 'Invalid Date'", () => {
    expect(formatDeliveryDate("")).toBe("");
    expect(formatDeliveryDate("not a date")).toBe("not a date");
  });
});

/** An issued order, as the API returns it. */
function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "TRX-8938",
    customerId: "CUST-101",
    date: "2026-09-05 10:45",
    deliveryDate: "2026-09-08",
    customer: {
      name: "Frank McEneaney",
      phone: "1234321",
      address: "house no 3 Clontibret",
      area: "Clontibret",
      postcode: "234322",
      round: "mon-am",
    },
    courier: "Tanawish Ali",
    courierId: "COUR-101",
    items: [{ productId: "PROD-101", name: "Milk", qty: 2, price: 1.35 }],
    deliveryCharge: 4.5,
    total: 7.2,
    previousBalance: 0,
    grandTotal: 7.2,
    settledAmount: 0,
    status: PaymentStatus.Unpaid,
    receivedAtDelivery: 0,
    customerBalance: 7.2,
    ...overrides,
  };
}

/**
 * The PDF is plain text inside its stream, so the printed words can be read
 * straight back out of it — no renderer needed to prove the date reached paper.
 */
describe("receipt PDF", () => {
  // Asserted against the formatter rather than a literal, so the two cannot
  // drift apart: this is about the date reaching paper, not about spelling.
  const printed = formatDeliveryDate("2026-09-08");

  it("prints the delivery date on the office copy", () => {
    const pdf = buildReceiptPdf(order());
    expect(pdf).toContain("Delivery");
    expect(pdf).toContain(printed);
  });

  it("prints it on the driver's brief slip too", () => {
    const pdf = buildReceiptPdf(order(), { brief: true });
    expect(pdf).toContain(printed);
  });

  it("puts the chosen day in the brand band, not the raised timestamp", () => {
    const pdf = buildReceiptPdf(order());
    // The band prints one date and it is the delivery day. The raised
    // timestamp still appears, but as the Issued row further down.
    expect(pdf).toContain(printed);
    // Uppercased by the draw pass, like every other meta label on the page.
    expect(pdf).toContain("ISSUED");
  });

  it("falls back to the raised timestamp when nothing was scheduled", () => {
    const legacy = order();
    delete legacy.deliveryDate;
    const pdf = buildReceiptPdf(legacy);
    expect(pdf).toContain("2026-09-05 10:45");
    expect(pdf).not.toContain("ISSUED");
  });

  it("omits the row for an order raised before the field existed", () => {
    const legacy = order();
    delete legacy.deliveryDate;
    const pdf = buildReceiptPdf(legacy);
    expect(pdf).not.toContain(printed);
    // The rest of the receipt still prints — an absent date is not a broken one.
    expect(pdf).toContain("Frank McEneaney");
  });
});
