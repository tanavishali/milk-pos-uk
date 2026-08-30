import { Weekday } from '../../common/enums';

export interface DeliveryRound {
  id: string;
  label: string;
  days: Weekday[];
}

/**
 * The named delivery rounds a customer can be put on. Mirrors
 * `frontend/constants/rounds.ts`.
 *
 * A round is **not** the same thing as a set of days: `Mon/Thurs` and
 * `Mon(PM)&Thurs(PM)` cover identical weekdays but different times of day, so
 * the round is stored on the customer in its own right rather than inferred
 * from `deliveryDays`.
 *
 * Held in code rather than a collection because these five are a fixed part of
 * how the business runs, not data an operator edits. Moving them into MongoDB
 * later changes this file and nothing that reads the endpoint.
 */
export const DELIVERY_ROUNDS: DeliveryRound[] = [
  {
    id: 'mon-pm-thu-pm',
    label: 'Mon(PM)&Thurs(PM)',
    days: [Weekday.Mon, Weekday.Thu],
  },
  { id: 'wed-sat', label: 'Wed/Sat', days: [Weekday.Wed, Weekday.Sat] },
  { id: 'mon-thu', label: 'Mon/Thurs', days: [Weekday.Mon, Weekday.Thu] },
  { id: 'tue-fri', label: 'Tuesday/Friday', days: [Weekday.Tue, Weekday.Fri] },
  {
    id: 'tue-sat-pm',
    label: 'Tuesday/Saturday PM',
    days: [Weekday.Tue, Weekday.Sat],
  },
];

export const ROUND_IDS: string[] = DELIVERY_ROUNDS.map((round) => round.id);
