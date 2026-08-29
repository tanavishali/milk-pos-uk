"use client";

import type { Order } from "@app-types/index";
import { Button } from "@components/ui/buttons";
import { Modal } from "@components/ui/modals";
import { ErrorState, LoaderOverlay } from "@components/ui/states";
import { WizardStep } from "@enums/index";
import { useGetCouriersQuery } from "@features/couriers/api/couriersApi";
import { useGetCustomersQuery } from "@features/customers/api/customersApi";
import {
  useGetCategoriesQuery,
  useGetProductsQuery,
} from "@features/products/api/productsApi";
import { useRecordPaymentMutation } from "@features/payments/index";
import { reportError } from "@utils/libs/reportError";
import { useCreateOrderMutation } from "../api/ordersApi";
import { useOrderWizard } from "../hooks/useOrderWizard";
import { WizardCustomerStep } from "./WizardCustomerStep";
import { WizardBalanceStep } from "./WizardBalanceStep";
import { WizardDispatchStep } from "./WizardDispatchStep";
import { WizardItemsStep } from "./WizardItemsStep";
import { WizardStepper } from "./WizardStepper";

interface OrderWizardProps {
  onClose: () => void;
  /** Called with the issued order's id so the caller can open its receipt. */
  onIssued: (orderId: string) => void;
}

/**
 * Mounted only while open, so every sale starts from a fresh controller. That is
 * what guarantees a cancelled cart can never reappear in the next sale — no
 * reset step to forget.
 */
export function OrderWizard({ onClose, onIssued }: OrderWizardProps) {
  const wizard = useOrderWizard();
  const customersQuery = useGetCustomersQuery();
  const productsQuery = useGetProductsQuery();
  const categoriesQuery = useGetCategoriesQuery();
  const couriersQuery = useGetCouriersQuery();

  const customers = customersQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const couriers = couriersQuery.data ?? [];

  // A wizard backed by empty lists looks like an empty catalogue, so a failed
  // read has to say so — otherwise a cashier concludes there is no stock.
  const loadFailed =
    customersQuery.isError ||
    productsQuery.isError ||
    categoriesQuery.isError ||
    couriersQuery.isError;

  const retryAll = () => {
    void customersQuery.refetch();
    void productsQuery.refetch();
    void categoriesQuery.refetch();
    void couriersQuery.refetch();
  };
  const [createOrder, { isLoading: issuing }] = useCreateOrderMutation();
  const [recordPayment, { isLoading: paying }] = useRecordPaymentMutation();

  /**
   * Turn step 4's two answers into ledger entries.
   *
   * The figures come from the issued order, not from the step-4 query: the
   * server computed `previousBalance` when it raised the bill, and that is the
   * number the operator was looking at.
   *
   * Marked Paid while an older balance stays open names this bill, so the money
   * lands where it was said to. Anything else is left unnamed and clears the
   * oldest debt first — which is what "he settled last week's" means. Nothing is
   * recorded when nothing was taken: an unpaid bill is the absence of a payment,
   * not a payment of zero.
   */
  const settle = async (order: Order) => {
    const clearing = order.previousBalance > 0 && wizard.clearPrevious;
    const amount =
      (wizard.billPaid ? order.total : 0) +
      (clearing ? order.previousBalance : 0);
    if (amount <= 0) return;

    await recordPayment({
      customerId: order.customerId,
      orderId: order.id,
      ...(wizard.billPaid && !clearing && order.previousBalance > 0
        ? { appliesTo: order.id }
        : {}),
      amount,
      receivedBy: order.courier === "Unassigned" ? "Admin" : order.courier,
    }).unwrap();
  };

  const issue = async () => {
    if (!wizard.customer) return;
    try {
      const order = await createOrder({
        customerId: wizard.customer.id,
        courierId: wizard.courierId,
        items: wizard.orderLines,
      }).unwrap();

      await settle(order);

      onClose();
      // Re-read so the receipt shows the payment that was just recorded rather
      // than the bill as it was a moment before it.
      onIssued(order.id);
    } catch (error) {
      reportError(error, "createOrder");
      wizard.setError("Could not issue this order. Please try again.");
    }
  };

  const onNext = () => {
    // `next()` returns true only on the final step, where it has nothing left
    // to validate and the order is ready to issue.
    if (wizard.next()) void issue();
  };

  return (
    <Modal
      onClose={onClose}
      size="lg"
      tall
      title="Issue Point of Sale Order"
      headerActions={<WizardStepper current={wizard.step} />}
      footer={
        <div className="flex flex-1 justify-between gap-2">
          {wizard.step > WizardStep.Customer ? (
            <Button
              variant="secondary"
              block
              onClick={wizard.back}
              disabled={issuing || paying}
            >
              Previous
            </Button>
          ) : null}
          <Button
            variant="ghost"
            block
            onClick={onClose}
            disabled={issuing || paying}
          >
            Cancel
          </Button>
          <Button
            block
            loading={issuing || paying}
            loadingLabel="Generating..."
            onClick={onNext}
          >
            {wizard.step === WizardStep.Balance ? "Generate Bill" : "Continue"}
          </Button>
        </div>
      }
    >
      <div className="relative space-y-2.5">
        {/* Covers the cart while the order is being issued: the lines have
            already been priced, so a quantity changed now would print a receipt
            that does not match what was charged. */}
        {issuing || paying ? (
          <LoaderOverlay label="Generating bill..." />
        ) : null}

        {loadFailed ? (
          <ErrorState
            inset
            title="Couldn't load the catalogue"
            detail="Customers, items or couriers failed to load."
            onRetry={retryAll}
          />
        ) : null}

        {wizard.error ? (
          <p
            role="alert"
            className="bg-danger-soft text-danger-text border-danger-ring rounded-control border px-3 py-2 text-xs font-semibold"
          >
            {wizard.error}
          </p>
        ) : null}

        {wizard.step === WizardStep.Customer ? (
          <WizardCustomerStep
            customers={customers}
            selected={wizard.customer}
            onSelect={wizard.setCustomer}
          />
        ) : null}

        {wizard.step === WizardStep.Items ? (
          <WizardItemsStep
            products={products}
            categories={categories}
            wizard={wizard}
          />
        ) : null}

        {wizard.step === WizardStep.Dispatch ? (
          <WizardDispatchStep couriers={couriers} wizard={wizard} />
        ) : null}

        {wizard.step === WizardStep.Balance ? (
          <WizardBalanceStep wizard={wizard} />
        ) : null}
      </div>
    </Modal>
  );
}
