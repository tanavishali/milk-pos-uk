import type { Payment } from "@app-types/index";

/**
 * Seed payments — the cash side of the seeded round.
 *
 * One payment per bill that was settled at the door, for the exact amount of
 * that bill and dated the same day. The bills with no payment here are the ones
 * a customer said they would clear next delivery, which is what leaves the
 * demo with a realistic outstanding balance rather than a clean slate.
 */
export const seedPayments: Payment[] = [
  {
    id: "PAY-101",
    customerId: "CUST-101",
    orderId: "TRX-8901",
    amount: 32.1,
    date: "2026-08-21 14:10",
    receivedBy: "Bilal Khan",
  },
  {
    id: "PAY-102",
    customerId: "CUST-103",
    orderId: "TRX-8903",
    amount: 10.7,
    date: "2026-08-21 14:40",
    receivedBy: "Tariq Mehmood",
  },
  {
    id: "PAY-103",
    customerId: "CUST-104",
    orderId: "TRX-8904",
    amount: 16.8,
    date: "2026-08-21 15:00",
    receivedBy: "Rashid Minhas",
  },
  {
    id: "PAY-104",
    customerId: "CUST-106",
    orderId: "TRX-8906",
    amount: 31.0,
    date: "2026-08-21 15:35",
    receivedBy: "Kashif Ali",
  },
  {
    id: "PAY-105",
    customerId: "CUST-107",
    orderId: "TRX-8907",
    amount: 26.0,
    date: "2026-08-21 16:00",
    receivedBy: "Shahid Afridi",
  },
  {
    id: "PAY-106",
    customerId: "CUST-108",
    orderId: "TRX-8908",
    amount: 11.97,
    date: "2026-08-21 16:15",
    receivedBy: "Mohsin Abbas",
  },
  {
    id: "PAY-107",
    customerId: "CUST-110",
    orderId: "TRX-8910",
    amount: 13.6,
    date: "2026-08-21 16:50",
    receivedBy: "Sajid Wasti",
  },
  {
    id: "PAY-108",
    customerId: "CUST-111",
    orderId: "TRX-8911",
    amount: 30.5,
    date: "2026-08-21 17:10",
    receivedBy: "Junaid Jamshed",
  },
  {
    id: "PAY-109",
    customerId: "CUST-112",
    orderId: "TRX-8912",
    amount: 14.0,
    date: "2026-08-21 17:25",
    receivedBy: "Babar Azam",
  },
  {
    id: "PAY-110",
    customerId: "CUST-114",
    orderId: "TRX-8914",
    amount: 7.0,
    date: "2026-08-21 18:00",
    receivedBy: "Zeeshan Butt",
  },
  {
    id: "PAY-111",
    customerId: "CUST-115",
    orderId: "TRX-8915",
    amount: 20.3,
    date: "2026-08-21 18:20",
    receivedBy: "Bilal Khan",
  },
  {
    id: "PAY-112",
    customerId: "CUST-116",
    orderId: "TRX-8916",
    amount: 18.0,
    date: "2026-08-21 18:40",
    receivedBy: "Haris Rauf",
  },
  {
    id: "PAY-113",
    customerId: "CUST-117",
    orderId: "TRX-8917",
    amount: 9.6,
    date: "2026-08-21 19:00",
    receivedBy: "Noman Dar",
  },
  {
    id: "PAY-114",
    customerId: "CUST-119",
    orderId: "TRX-8919",
    amount: 29.97,
    date: "2026-08-21 19:30",
    receivedBy: "Mohsin Abbas",
  },
  {
    id: "PAY-115",
    customerId: "CUST-120",
    orderId: "TRX-8920",
    amount: 16.38,
    date: "2026-08-21 19:45",
    receivedBy: "Rashid Minhas",
  },
];
