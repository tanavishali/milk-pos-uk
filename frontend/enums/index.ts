/** How a completed order was settled. */
export enum PaymentType {
  Paid = "Paid",
  OnCredit = "On Credit",
}

/** Grid/list switch shared by every registry view. */
export enum ViewMode {
  Grid = "grid",
  List = "list",
}

/** The three steps of the point-of-sale order wizard. */
export enum WizardStep {
  Customer = 1,
  Items = 2,
  Dispatch = 3,
}
