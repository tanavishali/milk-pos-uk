import type { RoundBookStatus } from "@enums/index";

/** A book's figures. Frozen when it closes; computed live while it is open. */
export interface RoundBookSummary {
  orderCount: number;
  customerCount: number;
  /** This book's bills, goods only — never an earlier balance. */
  billed: number;
  /** How much of this book's bills the ledger has covered. */
  settled: number;
  /** This week's bills still open: `billed - settled`. */
  outstanding: number;
  /**
   * What the customers on this book owe across *all* their bills — the money
   * that rolls into next week. Can be more than `outstanding` when someone
   * still owes from an older book.
   */
  carriedForward: number;
}

/** One customer's line on a book — the statement they are sent. */
export interface RoundBookStatement {
  customerId: string;
  name: string;
  orderCount: number;
  billed: number;
  settled: number;
  /** Their whole account when the book closed. Negative is a credit. */
  balance: number;
}

/**
 * One round's week of deliveries.
 *
 * Each round has exactly one open book. A bill raised for a customer on the
 * round is stamped with it; closing it freezes the statements and opens the
 * next week's book, so the following bill lands there on its own.
 */
export interface RoundBook {
  /** `RB-101`. */
  id: string;
  roundId: string;
  roundLabel: string;
  /** Monday, `YYYY-MM-DD`. */
  weekStart: string;
  /** Sunday, `YYYY-MM-DD`. */
  weekEnd: string;
  status: RoundBookStatus;
  /** ISO timestamp. */
  closedAt?: string;
  /** The email of whoever closed it. */
  closedBy?: string;
  summary: RoundBookSummary;
  /** Only on a single-book read, never in a list. */
  statements?: RoundBookStatement[];
  /** What to check before closing. Only on an open book; none blocks the close. */
  warnings?: string[];
}

/** One bill raised for next week by the close. */
export interface RolledForwardBill {
  /** The new bill, `TRX-8930`. */
  id: string;
  /** The bill in the closed book it was copied from. */
  from: string;
  customerId: string;
  customerName: string;
  /** This bill's own goods. */
  total: number;
  /** What the customer already owed, printed on it. */
  previousBalance: number;
  /** Due at the door: `total + previousBalance`. */
  grandTotal: number;
}

/** A customer the close did not bill for next week, and why. */
export interface RolledForwardSkip {
  customerId: string;
  name: string;
  reason: string;
}

export interface CloseRoundBookResult {
  closed: RoundBook;
  next: RoundBook;
  /** Next week's bills raised by the close, and who was left out. */
  rolledForward: {
    created: RolledForwardBill[];
    skipped: RolledForwardSkip[];
  };
}
