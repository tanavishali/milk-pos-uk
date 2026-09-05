"use client";

import { useCallback, useMemo, useState } from "react";
import type { Customer, OrderLine, Product } from "@app-types/index";
import { WEEKDAYS, Weekday, WizardStep } from "@enums/index";
import { formatDateInput, isDeliveryDate } from "@utils/helper/format";

/**
 * Which delivery slot a cart line belongs to.
 *
 * `"once"` is the slot used when the customer is on no round — a walk-in still
 * needs somewhere to put items, and naming that case keeps the rest of the code
 * from special-casing `undefined` everywhere.
 */
export type DayKey = Weekday | "once";

export const ONE_OFF = "once" as const;

/** A cart line while it is still being edited. */
export interface CartLine {
  productId: string;
  name: string;
  qty: number;
  /** The price the cashier will charge — starts at the product's sale price. */
  price: number;
  /** Kept so the UI can show what the standard price was. */
  defaultPrice: number;
  day: DayKey;
}

/**
 * Keyed by day *and* product, so the same item can sit on two days at different
 * quantities — two pints on Monday, one on Thursday.
 */
export type Cart = Record<string, CartLine>;

const keyOf = (day: DayKey, productId: string) => `${day}::${productId}`;

export interface DayBucket {
  day: DayKey;
  lines: CartLine[];
  itemCount: number;
  total: number;
}

/**
 * The wizard's state machine. Lives in a hook rather than the Redux store
 * because it is scoped to one open dialog — closing the wizard should discard
 * it, which a store slice would have to remember to do.
 */
export function useOrderWizard() {
  const [step, setStep] = useState<WizardStep>(WizardStep.Customer);
  const [customer, setCustomerState] = useState<Customer | undefined>();
  const [cart, setCart] = useState<Cart>({});
  const [courierId, setCourierId] = useState("");
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  // Today, because that is what most orders are. Read once per mount rather
  // than per render: a wizard left open across midnight should keep the date
  // the cashier saw when they started, not silently roll over under them.
  const [deliveryDate, setDeliveryDate] = useState(() =>
    formatDateInput(new Date()),
  );
  const [error, setError] = useState<string | undefined>();
  const [requestedDay, setRequestedDay] = useState<DayKey | undefined>();
  // Most deliveries are paid at the door, so that is the default. The previous
  // balance defaults the other way: writing off an old debt is a deliberate act
  // and must not happen because someone tapped through the step.
  const [billPaid, setBillPaid] = useState(true);
  const [clearPrevious, setClearPrevious] = useState(false);

  /**
   * The slots this order can be split across: the customer's round in
   * Monday-first order, or a single one-off slot when they have no round.
   */
  const days = useMemo<DayKey[]>(() => {
    const scheduled = WEEKDAYS.filter((d) =>
      customer?.deliveryDays.includes(d),
    );
    return scheduled.length > 0 ? scheduled : [ONE_OFF];
  }, [customer]);

  /**
   * Derived, not stored: going back and picking a customer on a different round
   * would otherwise leave the tab pointing at a day that no longer exists.
   */
  const activeDay: DayKey =
    requestedDay && days.includes(requestedDay) ? requestedDay : days[0]!;

  /** Changing customer clears the cart — a different round is a different order. */
  const setCustomer = useCallback((next: Customer) => {
    setCustomerState((prev) => {
      if (prev && prev.id !== next.id) {
        setCart({});
        setRequestedDay(undefined);
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setStep(WizardStep.Customer);
    setCustomerState(undefined);
    setCart({});
    setCourierId("");
    setDeliveryCharge(0);
    setDeliveryDate(formatDateInput(new Date()));
    setError(undefined);
    setRequestedDay(undefined);
    setBillPaid(true);
    setClearPrevious(false);
  }, []);

  /** Only lines on a day this order still covers, with a real quantity. */
  const activeLines = useMemo(
    () =>
      Object.values(cart).filter(
        (line) => line.qty > 0 && days.includes(line.day),
      ),
    [cart, days],
  );

  const total = useMemo(
    () =>
      activeLines.reduce((sum, l) => sum + l.qty * l.price, 0) + deliveryCharge,
    [activeLines, deliveryCharge],
  );

  const itemCount = useMemo(
    () => activeLines.reduce((sum, l) => sum + l.qty, 0),
    [activeLines],
  );

  /** One bucket per day, in round order — what step 3 and the receipt group by. */
  const buckets = useMemo<DayBucket[]>(
    () =>
      days.map((day) => {
        const lines = activeLines.filter((l) => l.day === day);
        return {
          day,
          lines,
          itemCount: lines.reduce((n, l) => n + l.qty, 0),
          total: lines.reduce((n, l) => n + l.qty * l.price, 0),
        };
      }),
    [days, activeLines],
  );

  /** The line for a product on the currently open day, if any. */
  const lineFor = useCallback(
    (productId: string): CartLine | undefined =>
      cart[keyOf(activeDay, productId)],
    [cart, activeDay],
  );

  const write = useCallback(
    (product: Product, mutate: (line: CartLine) => CartLine) => {
      setCart((prev) => {
        const key = keyOf(activeDay, product.id);
        const existing = prev[key] ?? {
          productId: product.id,
          name: product.name,
          qty: 0,
          price: product.salePrice,
          defaultPrice: product.salePrice,
          day: activeDay,
        };
        return { ...prev, [key]: mutate(existing) };
      });
    },
    [activeDay],
  );

  const toggleProduct = useCallback(
    (product: Product, selected: boolean) =>
      write(product, (line) => ({
        ...line,
        // Deselecting zeroes the quantity rather than dropping the line, so a
        // price the cashier typed survives an accidental untick.
        qty: selected ? Math.max(1, line.qty) : 0,
      })),
    [write],
  );

  const setQty = useCallback(
    (product: Product, qty: number) =>
      write(product, (line) => ({
        ...line,
        // Clamped to stock on hand: the wizard is where overselling gets caught,
        // because by the time the order is issued the receipt has printed.
        qty: Math.max(0, Math.min(product.quantity, qty)),
      })),
    [write],
  );

  const adjustQty = useCallback(
    (product: Product, delta: number) =>
      write(product, (line) => ({
        ...line,
        qty: Math.max(0, Math.min(product.quantity, line.qty + delta)),
      })),
    [write],
  );

  const setPrice = useCallback(
    (product: Product, price: number) =>
      write(product, (line) => ({
        ...line,
        price: Number.isFinite(price) && price >= 0 ? price : 0,
        // Typing a price is an implicit selection — otherwise the line shows a
        // custom price and a zero total.
        qty: line.qty === 0 ? 1 : line.qty,
      })),
    [write],
  );

  /** Advance, refusing to leave a step whose requirement is unmet. */
  const next = useCallback((): boolean => {
    if (step === WizardStep.Customer) {
      if (!customer) {
        setError("Choose a customer to continue.");
        return false;
      }
      setError(undefined);
      setStep(WizardStep.Items);
      return false;
    }

    if (step === WizardStep.Items) {
      if (activeLines.length === 0) {
        setError(
          days.length > 1
            ? "Add at least one item to one of the delivery days."
            : "Select at least one item with a quantity above zero.",
        );
        return false;
      }
      setError(undefined);
      setStep(WizardStep.Dispatch);
      return false;
    }

    if (step === WizardStep.Dispatch) {
      // A bill has to leave with a named driver: the courier is printed on the
      // receipt and is what scopes the driver's own delivery list, so an
      // unassigned order is one nobody is going to see.
      if (!courierId) {
        setError("Choose a courier to continue.");
        return false;
      }
      // A cleared date box is not a choice to leave it unscheduled — it is a
      // half-typed field. The driver's list and the docket both read this, so
      // it is checked here rather than discovered at the door.
      if (!isDeliveryDate(deliveryDate)) {
        setError("Set the delivery date to continue.");
        return false;
      }
      setError(undefined);
      setStep(WizardStep.Balance);
      return false;
    }

    // Step 4 — the caller issues the order.
    return true;
  }, [
    step,
    customer,
    activeLines.length,
    days.length,
    courierId,
    deliveryDate,
  ]);

  const back = useCallback(() => {
    setError(undefined);
    setStep((prev) => (prev > WizardStep.Customer ? prev - 1 : prev));
  }, []);

  const orderLines = useMemo<OrderLine[]>(
    () =>
      // Emitted in day order, so the receipt reads in the order it will be
      // delivered rather than the order the cashier happened to tap things.
      buckets.flatMap((bucket) =>
        bucket.lines.map(({ productId, name, qty, price, day }) => ({
          productId,
          name,
          qty,
          price,
          ...(day === ONE_OFF ? {} : { day }),
        })),
      ),
    [buckets],
  );

  return {
    step,
    customer,
    setCustomer,
    cart,
    days,
    activeDay,
    setActiveDay: setRequestedDay,
    /** True when the order is split across named days rather than a single sale. */
    isSplitByDay: days[0] !== ONE_OFF,
    buckets,
    courierId,
    setCourierId,
    deliveryCharge,
    setDeliveryCharge,
    deliveryDate,
    setDeliveryDate,
    billPaid,
    setBillPaid,
    clearPrevious,
    setClearPrevious,
    error,
    setError,
    activeLines,
    orderLines,
    total,
    itemCount,
    lineFor,
    toggleProduct,
    setQty,
    adjustQty,
    setPrice,
    next,
    back,
    reset,
  };
}

export type OrderWizardController = ReturnType<typeof useOrderWizard>;
