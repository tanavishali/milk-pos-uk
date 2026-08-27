import { Weekday } from "@enums/index";

/**
 * The named delivery rounds a customer can be put on.
 *
 * A round is not the same thing as a set of days: "Mon/Thurs" and
 * "Mon(PM)&Thurs(PM)" cover identical weekdays but different times of day, so
 * the round has to be stored in its own right rather than inferred from
 * `deliveryDays`. The `days` here are what the round covers, used to fill the
 * day toggles in when a round is chosen.
 */
export interface DeliveryRound {
  id: string;
  label: string;
  days: Weekday[];
}

export const DELIVERY_ROUNDS: DeliveryRound[] = [
  {
    id: "mon-pm-thu-pm",
    label: "Mon(PM)&Thurs(PM)",
    days: [Weekday.Mon, Weekday.Thu],
  },
  { id: "wed-sat", label: "Wed/Sat", days: [Weekday.Wed, Weekday.Sat] },
  { id: "mon-thu", label: "Mon/Thurs", days: [Weekday.Mon, Weekday.Thu] },
  {
    id: "tue-fri",
    label: "Tuesday/Friday",
    days: [Weekday.Tue, Weekday.Fri],
  },
  {
    id: "tue-sat-pm",
    label: "Tuesday/Saturday PM",
    days: [Weekday.Tue, Weekday.Sat],
  },
];

export function roundById(id: string): DeliveryRound | undefined {
  return DELIVERY_ROUNDS.find((r) => r.id === id);
}

/** Label for display; falls back to a plain statement rather than an empty cell. */
export function roundLabel(id: string): string {
  return roundById(id)?.label ?? "No round";
}
