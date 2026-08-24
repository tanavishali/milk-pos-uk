"use client";

import { useCallback, useMemo, useState } from "react";
import type { Customer, OrderLine, Product } from "@app-types/index";
import { PaymentType, WizardStep } from "@enums/index";

/** A cart line while it is still being edited. */
export interface CartLine {
  productId: string;
  name: string;
  qty: number;
  /** The price the cashier will charge — starts at the product's sale price. */
  price: number;
  /** Kept so the UI can show what the standard price was. */
  defaultPrice: number;
}

export type Cart = Record<string, CartLine>;

const INITIAL_STATE = {
  step: WizardStep.Customer as WizardStep,
  customer: undefined as Customer | undefined,
  cart: {} as Cart,
  courier: "",
  paymentType: PaymentType.Paid,
};

/**
 * The wizard's state machine. Lives in a hook rather than the Redux store
 * because it is scoped to one open dialog — closing the wizard should discard
 * it, which a store slice would have to remember to do.
 */
export function useOrderWizard() {
  const [step, setStep] = useState<WizardStep>(INITIAL_STATE.step);
  const [customer, setCustomer] = useState(INITIAL_STATE.customer);
  const [cart, setCart] = useState<Cart>(INITIAL_STATE.cart);
  const [courier, setCourier] = useState(INITIAL_STATE.courier);
  const [paymentType, setPaymentType] = useState(INITIAL_STATE.paymentType);
  const [error, setError] = useState<string | undefined>();

  /**
   * Not used by `OrderWizard`, which gets a fresh controller from being mounted
   * per open. Kept for a caller that needs to clear a still-mounted wizard —
   * "new sale" without closing the dialog.
   */
  const reset = useCallback(() => {
    setStep(INITIAL_STATE.step);
    setCustomer(INITIAL_STATE.customer);
    setCart({});
    setCourier("");
    setPaymentType(PaymentType.Paid);
    setError(undefined);
  }, []);

  /** Lines with a real quantity — the only ones that become order lines. */
  const activeLines = useMemo(
    () => Object.values(cart).filter((line) => line.qty > 0),
    [cart],
  );

  const total = useMemo(
    () => activeLines.reduce((sum, line) => sum + line.qty * line.price, 0),
    [activeLines],
  );

  const itemCount = useMemo(
    () => activeLines.reduce((sum, line) => sum + line.qty, 0),
    [activeLines],
  );

  /** Seed a line from its product the first time it is touched. */
  const lineFor = useCallback(
    (product: Product, existing?: CartLine): CartLine =>
      existing ?? {
        productId: product.id,
        name: product.name,
        qty: 0,
        price: product.salePrice,
        defaultPrice: product.salePrice,
      },
    [],
  );

  const toggleProduct = useCallback(
    (product: Product, selected: boolean) => {
      setCart((prev) => {
        const line = lineFor(product, prev[product.id]);
        return {
          ...prev,
          // Deselecting zeroes the quantity rather than dropping the line, so a
          // price the cashier typed survives an accidental untick.
          [product.id]: { ...line, qty: selected ? Math.max(1, line.qty) : 0 },
        };
      });
    },
    [lineFor],
  );

  const setQty = useCallback(
    (product: Product, qty: number) => {
      setCart((prev) => {
        const line = lineFor(product, prev[product.id]);
        // Clamped to stock on hand: the wizard is where overselling gets caught,
        // because by the time the order is issued the receipt has printed.
        const next = Math.max(0, Math.min(product.quantity, qty));
        return { ...prev, [product.id]: { ...line, qty: next } };
      });
    },
    [lineFor],
  );

  const adjustQty = useCallback(
    (product: Product, delta: number) => {
      setCart((prev) => {
        const line = lineFor(product, prev[product.id]);
        const next = Math.max(
          0,
          Math.min(product.quantity, line.qty + delta),
        );
        return { ...prev, [product.id]: { ...line, qty: next } };
      });
    },
    [lineFor],
  );

  const setPrice = useCallback(
    (product: Product, price: number) => {
      setCart((prev) => {
        const line = lineFor(product, prev[product.id]);
        return {
          ...prev,
          [product.id]: {
            ...line,
            price: Number.isFinite(price) && price >= 0 ? price : 0,
            // Typing a price is an implicit selection — otherwise the line shows
            // a custom price and a zero total.
            qty: line.qty === 0 ? 1 : line.qty,
          },
        };
      });
    },
    [lineFor],
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
        setError("Select at least one item with a quantity above zero.");
        return false;
      }
      setError(undefined);
      setStep(WizardStep.Dispatch);
      return false;
    }

    // Step 3 — the caller issues the order.
    return true;
  }, [step, customer, activeLines.length]);

  const back = useCallback(() => {
    setError(undefined);
    setStep((prev) => (prev > WizardStep.Customer ? prev - 1 : prev));
  }, []);

  const orderLines = useMemo<OrderLine[]>(
    () =>
      activeLines.map(({ productId, name, qty, price }) => ({
        productId,
        name,
        qty,
        price,
      })),
    [activeLines],
  );

  return {
    step,
    customer,
    setCustomer,
    cart,
    courier,
    setCourier,
    paymentType,
    setPaymentType,
    error,
    setError,
    activeLines,
    orderLines,
    total,
    itemCount,
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
