/** What a signed-in account is allowed to reach. */
export enum UserRole {
  /** Full terminal: registries, wizard, settings. */
  Admin = "admin",
  /** Their own deliveries and nothing else. */
  Courier = "courier",
}

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
