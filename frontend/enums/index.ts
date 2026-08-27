/** Days of the week a customer is on the delivery round. */
export enum Weekday {
  Mon = "mon",
  Tue = "tue",
  Wed = "wed",
  Thu = "thu",
  Fri = "fri",
  Sat = "sat",
  Sun = "sun",
}

/** Monday-first, the order a round is planned in. */
export const WEEKDAYS: Weekday[] = [
  Weekday.Mon,
  Weekday.Tue,
  Weekday.Wed,
  Weekday.Thu,
  Weekday.Fri,
  Weekday.Sat,
  Weekday.Sun,
];

/** Three-letter label for a chip or a summary line. */
export const WEEKDAY_SHORT: Record<Weekday, string> = {
  [Weekday.Mon]: "Mon",
  [Weekday.Tue]: "Tue",
  [Weekday.Wed]: "Wed",
  [Weekday.Thu]: "Thu",
  [Weekday.Fri]: "Fri",
  [Weekday.Sat]: "Sat",
  [Weekday.Sun]: "Sun",
};

/** Single letter, for the compact seven-slot indicator in a table row. */
export const WEEKDAY_INITIAL: Record<Weekday, string> = {
  [Weekday.Mon]: "M",
  [Weekday.Tue]: "T",
  [Weekday.Wed]: "W",
  [Weekday.Thu]: "T",
  [Weekday.Fri]: "F",
  [Weekday.Sat]: "S",
  [Weekday.Sun]: "S",
};

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
  /** Review the balance carried in from unpaid earlier bills. */
  Balance = 4,
}
