# BLANKSYS POS — Functional Reference

A deep walkthrough of what this system does, why it is built the way it is, and
where every behaviour lives in the code.

This document covers **functionality and domain logic**. For setup, scripts and
stack, see the [root README](../README.md); for the visual language, see
[frontend/docs/theme.md](../frontend/docs/theme.md).

> **Status: prototype.** There is no backend. Everything runs against an
> in-memory mock (`frontend/services/mock/`) that resets on a full page load.
> Sign-in is a client-side flag, not a security boundary. See
> [§14 Prototype boundaries](#14-prototype-boundaries).

---

## Table of contents

1. [What the system actually is](#1-what-the-system-actually-is)
2. [Roles and access](#2-roles-and-access)
3. [Route map and shells](#3-route-map-and-shells)
4. [Domain model](#4-domain-model)
5. [The money model — the core of the app](#5-the-money-model--the-core-of-the-app)
6. [Order lifecycle: the 4-step POS wizard](#6-order-lifecycle-the-4-step-pos-wizard)
7. [Collecting money: the three capture paths](#7-collecting-money-the-three-capture-paths)
8. [The receipt](#8-the-receipt)
9. [Screen-by-screen functionality](#9-screen-by-screen-functionality)
10. [Data layer architecture](#10-data-layer-architecture)
11. [Client state](#11-client-state)
12. [UI system and interaction rules](#12-ui-system-and-interaction-rules)
13. [Testing](#13-testing)
14. [Prototype boundaries](#14-prototype-boundaries)
15. [Path to a real backend](#15-path-to-a-real-backend)
16. [Known rough edges](#16-known-rough-edges)

---

## 1. What the system actually is

On the surface this is a point-of-sale terminal: a catalogue, a cart, a receipt.
Underneath, it models something more specific — a **credit delivery round**
(the milk-round pattern):

- A **bill is raised before the van leaves**, not when money changes hands.
- The van goes out with goods and a docket per door.
- At the door the customer pays **all of it, part of it, only last week's, or
  nothing at all**.
- Whatever is unpaid **rolls forward** and appears on the next delivery's docket
  as the *previous balance*.

Nearly every non-obvious design decision in the codebase follows from that one
fact: **billing and payment are two separate events, on two separate days, in
two separate amounts.** A `paid: boolean` on an order cannot express any of it,
so the system keeps a **payment ledger** instead and derives payment state on
read.

The app has two audiences:

| Audience | Where they work | What they do |
|---|---|---|
| **Admin / cashier** | Desktop terminal at the counter | Raise bills, manage customers, items, couriers, see the money |
| **Courier / driver** | Phone, at the door | See their own round, call the customer, collect cash, reprint a receipt |

---

## 2. Roles and access

Roles are an enum, never a display string —
[`enums/index.ts`](../frontend/enums/index.ts):

```ts
enum UserRole { Admin = "admin", Courier = "courier" }
```

`AuthUser.title` ("Head Administrator", "Courier") is a *label*; `role` is the
*authority*. They are deliberately separate so authorisation never depends on a
string someone might reword —
[`types/auth.types.ts`](../frontend/types/auth.types.ts).

### Sign-in

[`services/mock/auth.mock.ts`](../frontend/services/mock/auth.mock.ts) accepts
two kinds of account:

| Account | Credentials | Result |
|---|---|---|
| The single hard-coded admin | `jhony.soda@blanksys.pos` / `blanksys123` | `role: admin`, full terminal |
| Any courier on the roster | their roster email / `driver123` | `role: courier`, `courierId` attached |

Both failure paths return the identical message (`"Incorrect email or
password."`) on purpose — distinguishing "no such user" from "wrong password"
tells an attacker which emails are real.

Courier passwords live in a **separate store**,
[`services/mock/credentials.ts`](../frontend/services/mock/credentials.ts),
keyed by courier id — never as a field on the `Courier` row. That is what makes
it structurally impossible for a password to ride along on a read:
`couriersMock.list()` returns `Courier[]`, and `Courier` has no password field.
Deleting a courier also deletes the credential, so no orphaned login survives.

### Guards

Three client-side guards in [`guards/`](../frontend/guards/):

| Guard | Purpose | Redirects to |
|---|---|---|
| `AuthGuard` | Keeps signed-out visitors out of the portal | `/login` |
| `GuestGuard` | Keeps signed-in users off the login screen | `homeFor(role)` |
| `RoleGuard` | Restricts a route group to one role | `homeFor(role)` or `/login` |

`homeFor()` sends a courier to `/my-deliveries` and everyone else to
`/dashboard`, so a wrong-role landing is never a dead end.

Every guard waits on `useIsHydrated()` before deciding. The stored session lives
in `sessionStorage`, which does not exist during SSR — reading it on the first
render would make server HTML (logged out) and client HTML (logged in) disagree
and throw a hydration mismatch. While waiting, they render `RouteSplash` (navy
brand + spinner), so a signed-in refresh never flashes the login screen.

**None of this is a security boundary.** Every page is statically rendered and
every check runs in the browser. The guards decide what UI to show, not what
data exists.

### Session persistence

[`features/auth/utils/session.ts`](../frontend/features/auth/utils/session.ts)
stores the user under `blanksys.session` in **`sessionStorage`, not
`localStorage`** — a shared till should forget the operator when the tab closes.
Every access is wrapped in `try/catch` because private mode and locked-down
browsers throw on the accessor itself, not just on read.

`SessionLoader` rehydrates it into Redux once, after mount.

---

## 3. Route map and shells

Routing is App Router, with three route groups that each carry their own guard
and chrome.

```
app/
├── page.tsx                     →  redirects to /login
├── (auth)/         GuestGuard   →  no chrome
│   └── login/
├── (portal)/       RoleGuard(Admin) + PortalShell
│   ├── dashboard/
│   ├── orders/
│   ├── customers/
│   ├── products/
│   ├── couriers/
│   ├── settings/
│   └── profile/
└── (driver)/       RoleGuard(Courier) + DriverShell
    └── my-deliveries/
```

`/` has no page of its own — it cannot decide where to send anyone, because the
role lives in `sessionStorage` which only exists in the browser. It redirects to
`/login`, whose `GuestGuard` forwards a signed-in user onward.

Every `page.tsx` is a **thin shell** over a feature view — typically five lines:
a `metadata` export and a single component render. All behaviour lives in
`features/`.

### The two shells

**`PortalShell`** ([layouts/portal/](../frontend/layouts/portal/)) — navy top bar
(`Chrome`), sidebar, mobile tab bar (`BottomNav`), and a global `LoaderBar`.
It owns the category dialog, because two separate pieces of chrome open it
(the sidebar link and the products toolbar) and hoisting it here keeps one
instance rather than one per opener.

**`DriverShell`** ([layouts/driver/](../frontend/layouts/driver/)) — a bar, the
page, and a sign-out button. Deliberately *not* `PortalShell` with the
navigation conditionally emptied: a shell whose nav is hidden by a condition is
a shell that leaks the day someone forgets the condition. One route, one visible
action.

### Navigation

All route strings live once in [`constants/path.ts`](../frontend/constants/path.ts);
nothing hardcodes a URL. The sidebar is built from `navGroups` in
[`constants/nav.ts`](../frontend/constants/nav.ts) (Dashboard / Cashier & POS /
Inventory / Settings & Admin), and the chrome bar's page title is a flat lookup
against the same list.

The mobile `BottomNav` repeats a **thumb-reachable subset** — Home, Orders, a
centre `+` FAB, Items, Menu. The FAB dispatches `requestNewOrder()` and
navigates to `/orders`, where `OrdersView` derives the wizard's openness from
that flag (see [§11](#11-client-state) for why a flag rather than a query param).

---

## 4. Domain model

Domain types live in [`types/`](../frontend/types/) and describe **backend
resources** — they are deliberately free of anything mock-specific, which is why
swapping in a real API leaves them untouched.

### Entities

| Entity | Id prefix | Seed rows | File |
|---|---|---|---|
| Customer | `CUST-` | 20 | [customer.types.ts](../frontend/types/customer.types.ts) |
| Product | `PROD-` | 20 | [product.types.ts](../frontend/types/product.types.ts) |
| Courier | `COUR-` | 20 | [courier.types.ts](../frontend/types/courier.types.ts) |
| Order (bill) | `TRX-` | 20 | [order.types.ts](../frontend/types/order.types.ts) |
| Payment | `PAY-` | 15 | [payment.types.ts](../frontend/types/payment.types.ts) |
| Category | *(the name is the key)* | 5 | [seed.categories.ts](../frontend/services/mock/seed.categories.ts) |

**Customer** — `name`, `phone`, `email`, `round`, `deliveryDays[]`, `area`,
`address`, `postcode`.

- `area` is stored *beside* the address rather than parsed out of it. A round is
  planned and a driver assigned by area, and "second turning past the mosque" is
  a perfectly good address that no parser will ever yield an area from.
- `round` is an id from `constants/rounds.ts`; empty means a walk-in.
- `deliveryDays` is filled in from the round when one is chosen but **stored
  separately**, so a one-off variation does not require inventing a new round.

**Product** — `retailPrice` (list, shown struck through) and `salePrice` (charged,
and the wizard's starting price). `LOW_STOCK_THRESHOLD = 10`; anything below
renders in the danger colour.

**Courier** — `name`, `phone`, `idcard`, `email`, `area` (the patch they cover),
`address` (where they live). Two different questions, so two fields.
`CourierDraft` adds a **write-only** `password?`.

**Order** — see [§5](#5-the-money-model--the-core-of-the-app).

**Payment** — money received. `customerId` (whose money), optional `orderId`
(*where the cash came in*), optional `appliesTo` (*which bill it is for, when
someone said so*), `amount`, `date`, `receivedBy`.

### Delivery rounds

[`constants/rounds.ts`](../frontend/constants/rounds.ts) defines five named
rounds: `Mon(PM)&Thurs(PM)`, `Wed/Sat`, `Mon/Thurs`, `Tuesday/Friday`,
`Tuesday/Saturday PM`.

A round is **not** the same thing as a set of days: `Mon/Thurs` and
`Mon(PM)&Thurs(PM)` cover identical weekdays but different times of day, so the
round is stored in its own right rather than inferred from `deliveryDays`.

### Copied, not referenced

When an order is raised, the customer is **copied onto it** as `OrderCustomer`
(name, phone, address, area, postcode, round) — while `customerId` is *also*
kept.

- Copying means editing or deleting a customer leaves already-issued receipts
  intact, and moving someone to a different round does not silently rewrite
  which round last week's orders belonged to.
- Keeping the id means earlier bills can still be found; matching on a name
  would break the moment a customer is renamed.

The same reasoning applies to `courier` (the name printed on the receipt) and
`courierId` (what a driver's order list is scoped by) — two couriers can share a
name, and scoping by name would show one driver another's deliveries.

And to `OrderLine.price`: the price **actually charged**, which the cashier may
have overridden. A later price edit cannot rewrite a receipt that has printed.

### Id generation

[`services/mock/utils.ts`](../frontend/services/mock/utils.ts) mints ids as
*one above the highest number in use for that prefix* — `TRX-8920` → `TRX-8921`.

This replaced a clock-based generator (`` `TRX-${Date.now() % 10000}` ``) that
drew from 0000–9999 while the seed already occupied 8901–8920: roughly **one sale
in 500 minted an id that already existed**, which surfaced far from its cause as
React's "two children with the same key". `assertUniqueId()` is a dev-only
tripwire that fails at the point of creation instead — disabled in production,
because a POS must not refuse a sale over a key clash.

---

## 5. The money model — the core of the app

This is the part worth reading twice. Everything else is CRUD around it.

### Two records, not one

- An **order** says *what was delivered*.
- A **payment** says *what was handed over*.

They are never merged. [`payment.types.ts`](../frontend/types/payment.types.ts)
states the reason directly: on a round the bill is raised before the van leaves
and the cash arrives at the door — sometimes all of it, sometimes part,
sometimes only what was owed from last week, sometimes nothing. A boolean on the
order cannot express any of that.

### Stored vs computed

`StoredOrder` ([services/mock/types.ts](../frontend/services/mock/types.ts)) is
the `Order` type **minus every payment field**:

| Stored on the order | Computed on every read |
|---|---|
| `id`, `date`, `customerId`, `customer` | `settledAmount` |
| `courier`, `courierId`, `items` | `status` |
| `total`, `previousBalance`, `grandTotal` | `receivedAtDelivery` |
| | `customerBalance` |

The same bill is Unpaid on Monday and Paid on Saturday **without anything about
the bill itself changing**. A stored copy would be a second truth waiting to
drift, and would need a migration every time a payment landed.

`decorate()` in
[`services/mock/orders.mock.ts`](../frontend/services/mock/orders.mock.ts)
attaches the four derived fields, caching the allocation per customer across a
batch so a 20-row list does not recompute 20 times.

### The three totals

| Field | Meaning |
|---|---|
| `total` | The goods on **this** delivery. **The only figure that adds to a debt.** |
| `previousBalance` | What the customer already owed when this bill was raised — a snapshot for the docket. **Not a debt of its own.** |
| `grandTotal` | `total + previousBalance` — what the driver asks for at this door. |

The distinction is the single most important invariant in the system. A balance
sums `total` and **never** `grandTotal`:

```ts
// balanceOf() — orders.mock.ts
const billed = billsFor(customerId).reduce((sum, o) => sum + o.total, 0);
return round2(billed - paymentsMock.paidTotal(customerId));
```

Summing `grandTotal` would charge the same money again every time it appeared on
a later receipt — the debt would compound each week it rolled forward. The test
suite pins this:

> bill 10, then bill 25 → `previousBalance` is 10 and `grandTotal` is 35, **but
> the balance is 35, not 45.**

The same rule is applied in the UI: `OrdersView`'s stat cards sum `total` and
`settledAmount`, never `grandTotal`, with a comment saying why.

### Allocation — how payments find their bills

`allocate(customerId)` spreads everything a customer has paid across their bills
(oldest first) and returns how much of each is covered. Two rules, in order:

1. **A payment that names a bill (`appliesTo`) goes to that bill.** That is the
   operator saying "this week is paid, last week is not". Applying it
   oldest-first anyway would settle last week's debt and leave this week's open —
   the exact opposite of what was entered.
2. **Everything else clears the oldest debt first.** A customer at Saturday's
   door hands over cash without naming a bill, and nobody should have to ask.
   This is what makes *"he paid last week's but not this week's"* come out as
   exactly that.

Overflow from a named payment (more money than that bill was worth) falls back
into rule 2 rather than disappearing.

### Status

`PaymentStatus` is **derived, never chosen**:

```
settled >= total  → Paid
settled > 0       → Part Paid
otherwise         → Unpaid
```

On a round the money arrives after the bill is raised, so a state picked at
issue time could only ever be a guess.

### `settledAmount` vs `receivedAtDelivery`

Two different questions that look alike:

| Field | Question it answers |
|---|---|
| `settledAmount` | How much of **this bill's own total** the ledger covers |
| `receivedAtDelivery` | How much cash was **handed over at this door** (payments tagged with this `orderId`) |

Cash taken at Saturday's door can settle Monday's bill. The tests assert exactly
that: pay 10 at week 2's door against a week-1 debt, and week 1 becomes Paid
while week 2's `receivedAtDelivery` is 10 and week 1's is 0. **The cash is
recorded where it was taken, not where it was applied.**

### Cent arithmetic

Every total goes through `round2()`. Floating point makes `24.5 + 9.99` come out
as `34.489999999999995` — invisible in a formatted figure, but it decides
whether a bill reads Paid or Part Paid when compared against `34.49`. Rounding
at each step keeps the arithmetic and the printed number the same thing. There
is a dedicated test for it.

### Reversal

`paymentsMock.remove(id)` undoes a mis-keyed collection. Because nothing is
stored, **the balance and every status follow automatically** — no repair step.

### Metrics

`ordersMock.metrics()` feeds the dashboard:

| Metric | Definition |
|---|---|
| `grossProfit` | Total billed — counted when the bill is raised, not when cash lands |
| `collected` | Sum of every payment |
| `outstanding` | `billed − collected` — what is still out with customers |
| `totalOrders` / `totalCustomers` / `totalCouriers` | Row counts |

---

## 6. Order lifecycle: the 4-step POS wizard

Entry points: the **Create Order** button on `/orders`, or the mobile FAB.

The wizard is mounted only while open
([`OrderWizard.tsx`](../frontend/features/orders/components/OrderWizard.tsx)), so
every sale starts from a fresh controller — that is what guarantees a cancelled
cart can never reappear in the next sale, with no reset step to forget.

State machine:
[`useOrderWizard.ts`](../frontend/features/orders/hooks/useOrderWizard.ts). It
lives in a hook rather than Redux because it is scoped to one open dialog —
closing should discard it, which a store slice would have to remember to do.

### Step 1 — Customer

Search across name, phone, email, address, postcode and round label; pick one.

Changing customer **clears the cart**: a different round is a different order.

### Step 2 — Items and prices

The heart of the POS. Search + category filter over the catalogue, then per line:

- **Select** — deselecting zeroes the quantity rather than dropping the line, so
  a price the cashier typed survives an accidental untick.
- **Quantity** — clamped to `product.quantity`. The wizard is where overselling
  gets caught, because by the time the order is issued the receipt has printed.
- **Price override** — the reason this screen exists. A cashier haggles, and the
  receipt has to reflect what was actually charged. Typing a price is an
  *implicit selection* (qty 0 → 1), otherwise the line would show a custom price
  and a zero total.

**Split by delivery day.** If the customer is on a round, the cart is keyed by
**day *and* product**, so the same item can sit on two days at different
quantities — two pints on Monday, one on Thursday. Day tabs switch the active
slot. A customer with no round gets a single `"once"` slot, which keeps the rest
of the code from special-casing `undefined` everywhere.

The active day is **derived, not stored**: going back and picking a customer on
a different round would otherwise leave the tab pointing at a day that no longer
exists.

### Step 3 — Dispatch

Pick a courier. The `<option>` value is the **id**, not the name.

There is deliberately **no payment method here** — the bill is raised before the
van leaves, and what the customer hands over is only known at the door. Below
the picker, a per-day breakdown shows what will print (empty days omitted — a
day with nothing on it is not a delivery).

### Step 4 — Bill & payment

[`WizardBalanceStep.tsx`](../frontend/features/orders/components/WizardBalanceStep.tsx)
queries the customer's live outstanding balance and asks **two separate
questions**:

1. *Is the previous bill being cleared now?* (only shown when there is one)
2. *Is this bill paid?*

Two questions because on a round they genuinely are two. A customer can settle
this week and leave last week's, settle last week's and leave this week's, do
both, or do neither — **all four happen**, and one Paid/Unpaid switch covering
both figures could only ever record two of them.

Defaults are asymmetric on purpose: `billPaid` starts **true** (most deliveries
are paid at the door), `clearPrevious` starts **false** (writing off an old debt
is a deliberate act and must not happen because someone tapped through).

A live summary shows *This bill / Previous bill / Total due / Paying now /
**Carries forward*** — the last being the number that decides next week's bill.

Nothing here folds the old balance into the new bill. It stays on the bill it
came from and is simply shown alongside.

### Issue

`createOrder` → `ordersMock.create()`:

1. Resolve the customer (throws if missing) and **copy** them onto the order.
2. Drop zero-quantity lines; refuse an order with no lines.
3. Resolve the courier **from the id**, so the receipt and the driver's scope can
   never disagree. Unresolved → `"Unassigned"`.
4. Read `previousBalance` **from the ledger** — never supplied by the caller, or
   the till would decide what a customer owes.
5. Compute `total`, `grandTotal`; mint the id; `unshift` (newest first).
6. **Draw down stock in the same step** — a receipt that printed without moving
   inventory is the one bug a POS cannot have. Clamped at zero.
7. **No payment is taken here.**

Then `settle()` in the wizard turns step 4's two answers into at most one ledger
entry:

| `billPaid` | `clearPrevious` | Recorded |
|---|---|---|
| ✓ | ✓ | `total + previousBalance`, unnamed (clears oldest first) |
| ✓ | ✗ (with an older debt) | `total`, **`appliesTo` = this bill** |
| ✗ | ✓ | `previousBalance`, unnamed |
| ✗ | ✗ | **nothing** — an unpaid bill is the absence of a payment, not a payment of zero |

Row 2 is the case that *needs* `appliesTo`: oldest-first would put this week's
cash against last week's debt and report the exact opposite of what was entered.

Finally the wizard closes and the caller opens the receipt **by id**, so it
re-reads and shows the payment that was just recorded rather than the bill as it
stood a moment before.

During issue a `LoaderOverlay` covers the cart: the lines have already been
priced, and a quantity changed now would print a receipt that does not match
what was charged.

---

## 7. Collecting money: the three capture paths

| Path | Who | Where | `receivedBy` |
|---|---|---|---|
| Wizard step 4 | Cashier | At bill generation | The assigned courier, or `"Admin"` if unassigned |
| `RecordPaymentModal` from `/orders` | Cashier | Any order row | The signed-in user |
| `RecordPaymentModal` from `/my-deliveries` | Courier | At the door, on a phone | The courier's own name — the round's cash has to be traceable |

[`RecordPaymentModal`](../frontend/features/payments/components/RecordPaymentModal.tsx)
is deliberately **not** a Paid/Unpaid switch. The three real answers are "all of
it", "just last week's" and "nothing today" — and often a figure that is none of
those. So it offers:

- **Quick buttons**: *Full* (the whole balance), and *Previous only* — the latter
  shown only when an older debt exists that is distinct from today's goods,
  otherwise it would be a second button for the same number.
- **A free amount field**, because a customer who hands over 20 against 34.49 has
  to be recordable or the balance stops matching the cash box.
- **A live five-line summary** — this delivery / earlier bills / total due /
  received now / carried forward — updating as it is typed, so the driver can
  read the carry-forward back to the customer before anything is committed.
- **"Nothing collected"** as the honest way out: no payment is recorded and the
  whole balance stays on the round.

Two guards:

- **Overpayment is refused.** A milk round collects debts, it does not take
  deposits, and a negative balance would leave every figure downstream having to
  explain itself.
- **Zero is refused** at the mock layer — "he paid nothing" is the absence of a
  payment, and storing it would put empty rows on a statement.

The balance is read **live** rather than taken from the order, because
`previousBalance` on a bill is a snapshot from the day it was raised and money
may have come in since.

Both `OrdersView` and `MyDeliveriesView` track the open dialog **by order id,
not by row object** — a payment recorded from either dialog changes the figures
the other one shows, and a captured object would keep printing the old ones.

---

## 8. The receipt

Two renderings of the same order.

### On screen — `InvoiceModal`

A thermal-style receipt in a modal. Lines are **grouped under the delivery day**
they go out on, in round order; a line with no day falls into a single
unlabelled group, so a walk-in's receipt looks exactly as it did before days
existed.

**Printing** works through `data-print-root` and the `@media print` block in
`globals.css`: everything on the page is set to `visibility: hidden`, the
receipt subtree back to `visible`. `visibility` rather than `display`, so the
printable node keeps its layout box.

### As a PDF — a hand-rolled writer

[`utils/libs/pdf.ts`](../frontend/utils/libs/pdf.ts) is a ~200-line PDF writer;
[`features/orders/utils/receiptPdf.ts`](../frontend/features/orders/utils/receiptPdf.ts)
lays the receipt out on it. No PDF library — a library would add hundreds of
kilobytes to *every page* of the app for one dialog.

Notable mechanics:

- **Only the four standard Type1 fonts** (Helvetica, Helvetica-Bold, Courier,
  Courier-Bold), so nothing has to be embedded.
- **Figures are set in Courier** — 600/1000 em per glyph is the only width maths
  needed, which is what makes right-aligned columns possible without a metrics
  table.
- **The page is measured before it is drawn**, so it is exactly as tall as the
  receipt needs. A fixed page would clip a long order or leave half a sheet of
  white under a short one — and a totals block split across a page boundary is
  the one thing on a receipt nobody should have to hunt for.
- **Latin-1 throughout.** The download loop writes byte-for-byte; encoding as
  UTF-8 would turn accented characters into two bytes and desynchronise the xref
  offsets, which makes readers reject the file. Text outside Latin-1 is
  *transliterated* (em dash → hyphen), because a character silently vanishing
  from an address is worse than a substitute appearing.
- **Long item names wrap**, with the figures pinned to the first line.

The layout: brand band → transaction meta (customer, phone, address, round,
courier, status) → items grouped by day with per-day subtotals → *This delivery*
/ *Previous balance* / **TOTAL DUE** (its own coloured band) / *Received* /
**Balance now**. The customer keeps this slip, so the carry-forward has to be on
it in writing.

Saving defers the build by a tick so the spinner paints first — building the PDF
is synchronous and would otherwise hold the main thread from click to download,
and the button would never show that anything happened. The button then confirms
with a *Saved* state for two seconds, because a browser download that goes
straight to the downloads folder gives no feedback of its own.

Filename: `receipt-TRX-8921.pdf` — the id is what anyone searching will have.

---

## 9. Screen-by-screen functionality

### `/login`

Split layout: navy brand panel (hidden below `lg`) beside the form. Password
show/hide. **Demo credentials are printed on screen** with *Fill these in*
buttons for both the admin and a courier. Sign-in dispatches to Redux — the
guard watches Redux, so **dispatching is what performs the redirect**.

### `/dashboard`

Four stat cards — *Gross Profit*, *Collected*, *Customers*, *Outstanding* — plus
three panels: **Latest Transactions** (the 4 newest orders), **Popular Items**,
**Inventory Flow** (units in stock vs units dispatched).

Both dashboard queries feed one screen, so **one failure fails the screen** —
showing half a dashboard with the other half silently zeroed would be worse.
`InventoryFlowCard` handles its own failure *inset*, because reporting "0 items"
would read as a real count of zero.

*Popular Items* is **static placeholder data** — nothing aggregates historical
sales volume — and says so in the code. The filter row (General/Inventory/Cashier
tabs, year picker) is **presentational only**, also marked as such.

### `/orders` — the order registry

Four registry-wide stat cards (*Total Orders*, *Billed*, *Collected*,
*Outstanding*), computed across **all** orders rather than the current filter —
they answer "what is outstanding across the till", which a search for one
customer should not change.

Search spans txn id, customer name, phone, **address**, postcode, courier and
round label ("which orders go to Gulberg?" is a dispatch question a cashier
actually asks). Filters: payment status, and delivery round — where `"none"` is
a real choice that finds walk-in orders belonging to no round.

Grid/list toggle, pagination, per-row actions: **Receipt** and **Collect**.
Delivery days shown as `DayChips`, derived from the order's own lines rather
than the customer's current round.

### `/customers`

Full CRUD. The modal collects name, phone, email, round, day toggles, area,
address, postcode. **Choosing a round fills the day toggles from it**, so the
two cannot silently disagree — but the toggles stay editable afterwards, because
a one-off variation should not require inventing a new round.

Stat cards include a distinct-city count derived via `cityOf()` (last
comma-separated segment of the address). A detail modal shows the customer plus
their order history.

Note the import comment: this view imports `@features/orders/api/ordersApi`
directly rather than the feature barrel, because the barrel re-exports
`OrdersView`, which imports back into customers — **the barrel would close a
cycle**. Endpoint modules import only `baseApi` and the mock, so they are safe.

### `/products` — master items

Full CRUD over the catalogue, plus a category dialog (idempotent — adding an
existing category is a no-op, not an error). Stat cards: item count, total stock
value, **low-stock count** (below `LOW_STOCK_THRESHOLD = 10`, rendered in
danger), category count. Retail price is shown struck through beside the sale
price.

### `/couriers` — dispatch roster

Full CRUD. The create form takes a password; **the edit form leaves it blank,
and blank means "keep the current one"**. Stat cards derive on-duty vs idle from
whether the courier has orders assigned, plus a distinct-city count.

### `/my-deliveries` — the driver portal

Read-only except for one write. Three stat cards:

- **Deliveries** + total units to carry.
- **To Collect** — summed **one figure per customer, not per delivery**. Two
  bills on the same account share one balance, and adding both rows would ask
  the driver to collect the same money twice.
- **Settled**.

Each delivery card shows the txn id, status badge, customer name, a **tappable
`tel:` link** (the driver is on a phone, at a door), and the address with the
**area first** — at the kerb, the patch name is what tells the driver they are
in the right place. The address wraps and is never truncated.

Then the instruction. This is carefully conditional:

| Bill status | Card says |
|---|---|
| Not Paid | **"Ask for {customerBalance}"** — the running account balance, not this bill, because a customer three weeks behind owes more than what is in today's crate |
| Paid, but other bills open | *"Settled · {balance} open on other bills"* |
| Paid, account clear | *"Account clear — nothing to collect"* |

Only the *open* bill gives the instruction — the same balance shows on every
card for that customer, and the same "ask for" figure printed twice reads as
double the money to collect.

Actions: **Receipt** and **Collect**. Search and status filter above.

### `/settings` and `/profile`

Terminal configuration (store name, receipt note) and operator details.
Settings is **local-only** — there is no settings endpoint, so Save reports
success without persisting, and the code says so.

---

## 10. Data layer architecture

### One RTK Query root

[`services/api/baseApi.ts`](../frontend/services/api/baseApi.ts) is the single
`createApi`. Features add endpoints with `baseApi.injectEndpoints({...})` —
**never a second `createApi`, never a raw `fetch`.**

It uses `fakeBaseQuery()` because there is no backend: every endpoint supplies a
`queryFn` that reads `mockDb`.

### Cache tags and invalidation

Tags are registered once in
[`services/api/tags.ts`](../frontend/services/api/tags.ts). **RTK Query silently
ignores a tag not in `tagTypes`**, so a new tag must be added there first.

| Mutation | Invalidates | Why |
|---|---|---|
| `createOrder` | `Order`, `Product`, `DashboardMetrics` | Issuing an order draws down stock |
| `recordPayment` / `deletePayment` | `Payment`, `Order`, `DashboardMetrics` | A payment changes every bill's status and the customer's balance — none of which is stored on an order, so the order cache is stale the moment it lands |
| `create` / `update` / `deleteCustomer` | `Customer` (+ `DashboardMetrics` on create and delete) | |
| `create` / `update` / `deleteCourier` | `Courier` (+ `DashboardMetrics` on create and delete) | |
| `create` / `update` / `deleteProduct` | `Product` | |
| `createCategory` | `Category` | |
| `signIn` | `Session` | |

`getOrders` and `getOutstanding` both **provide** `Order` *and* `Payment`:
recording a collection changes what they return without touching a single
order, so a cache keyed only on orders would keep showing a balance that has
just been paid.

### The mock backend

[`services/mock/`](../frontend/services/mock/) is a flat object of domain
modules (`auth`, `customers`, `products`, `categories`, `couriers`, `orders`,
`payments`). Endpoints talk to this and nothing else.

**One mutable store** (`db` in [seed.ts](../frontend/services/mock/seed.ts)):

- **`orders` and `payments` are newest-first.** `create()` unshifts, so the seed
  — written chronologically — is reversed on build to establish that invariant
  from the start. Without it the array would be half ascending and half
  descending, and "the 4 most recent" would silently mean "the 4 oldest".
- **Pinned to a global in development** via `Symbol.for("blanksys.mockDb")`.
  Without this, Fast Refresh re-evaluating the module mints a second `db` while
  other modules still close over the first, so reads and writes land in
  different objects and rows appear to duplicate or vanish. In production the
  module is evaluated once, so the plain object is used.
- `resetDatabase()` restores the seed — used by tests, available in dev.

### Deliberate latency

| Constant | Value | Why |
|---|---|---|
| `READ_LATENCY_MS` | 280 ms | Without it `isLoading` is true for ~0 ms and **every skeleton in the app is dead code nobody ever sees** — including on a slow connection, where it matters most |
| `WRITE_LATENCY_MS` | 320 ms | A save returning in the same tick is not a faster app, it is an app with no loading state: the spinner never paints, the button never disables |

Both go when a real API supplies its own round trip.

### Fault injection

Read endpoints cannot fail on their own, which would make every error state
untestable and prone to rot.
[`services/mock/faults.ts`](../frontend/services/mock/faults.ts) exposes a
console switch:

```js
__blanksysMock.failReads(true)   // every read now fails
__blanksysMock.failReads(false)  // back to normal
```

Each screen then shows its error state with a working **Try again**.

---

## 11. Client state

Two Redux slices ([`store/`](../frontend/store/)) alongside the RTK Query cache.

**`authSlice`** — `{ user: AuthUser | null }`. Starts empty on both server and
client so the two agree at hydration; `SessionLoader` restores from
`sessionStorage` after mount. `signIn` also writes to storage — a deliberate
side effect kept inside the reducer so signing in and persisting can never
diverge. `restoreSession` does *not* re-write.

**`uiSlice`** —

- `mobileSidebarOpen`
- `viewModes` per registry (customers / products / couriers / orders), kept in
  the store rather than each view so the choice **survives navigating away and
  back**.
- `newOrderRequested` — set by the mobile FAB, which has to navigate to `/orders`
  *and* open the wizard there. A flag rather than a `?new=1` query param,
  because the param would survive a back-navigation and reopen the wizard, and
  clearing it would need an effect.

**Store creation**: `StoreProvider` builds one store per browser session via a
lazy `useState` initialiser — not at module scope (a server render would share
a store between two requests) and not a ref (which cannot be read during render).

### Cross-cutting hooks

| Hook | Purpose |
|---|---|
| `useIsHydrated` | `false` during SSR and first client render, `true` after. Two-pass behaviour via `useSyncExternalStore`, no state-setting effect |
| `useIsCompact` | True below `sm` (640px). Lets a layout **change shape**, not just reflow — registries drop their table for cards, because a seven-column table on a 360px screen is a horizontal scrollbar pretending to be a layout |
| `useIsWriting` | True while a mutation, or a refetch triggered by one, is in flight. Reads **RTK Query's own bookkeeping**, so a feature added later cannot forget to register. First loads are excluded — those already have skeletons |
| `usePagination` | Client-side slicing, `PAGE_SIZE = 10`. Clamps the page when a filter or delete shrinks the list, in render rather than an effect, so the very first render after the shrink is already right |

`useIsCompact` overrides the stored view mode without changing it — the
preference is what the operator chose for their desktop, and returning there
should not require setting it again.

---

## 12. UI system and interaction rules

[`components/ui/`](../frontend/components/ui/) holds presentational primitives
grouped by category: `buttons/`, `cards/`, `data-display/`, `fields/`, `modals/`,
`states/`.

### Every async screen has four states

Loading (skeleton) → error (with **Try again**) → empty → content. The skeleton
family is shape-specific (`SkeletonStatCards`, `SkeletonTable`,
`RegistrySkeleton`, `SkeletonPanel`, `SkeletonCardGrid`) so the loading shape
matches what arrives. There is also a route-level `loading.tsx` for the portal,
deliberately generic because it fires before the page component exists.

Empty states distinguish **"nothing here yet"** from **"nothing matches this
search"** — different messages, different icons.

### Design tokens

Colours live once as CSS custom properties in
[`app/globals.css`](../frontend/app/globals.css) and are mirrored as raw hex in
[`theme/colors.ts`](../frontend/theme/colors.ts) for canvas/chart use.

**Never hardcode a colour** — `bg-slate-50` does not respond to theming,
`bg-surface` does. Semantic ramps (`accent`, `success`, `danger`, `warning`,
`info`) each have the same shape (base / `-hover` / `-soft` / `-muted` / `-ring` /
`-text`), so a badge, a button and an alert are built the same way whatever they
mean.

The dark navy chrome has **its own token group**, because one dark bar in a light
app should not force every foreground token to have a dark twin.

Dark-mode tokens exist and the `dark` class is wired through the palette, but
**no toggle is installed** — `next-themes` is not a dependency.

### Conventions

- React files `PascalCase.tsx`, other modules `camelCase.ts`, types
  `<domain>.types.ts`, mocks `<domain>.mock.ts`.
- A barrel (`index.ts`) **re-exports; it never defines**.
- `react-icons/lu` is the only icon source. Components take `icon?: IconType`
  rather than a `ReactNode`, so every icon renders through the same wrapper.
- Tailwind utilities only; `style={{}}` is reserved for runtime-computed values.
- 17 path aliases in `tsconfig.json`. Note **`@app-types/*`, not `@types/*`** —
  TypeScript reserves that prefix for DefinitelyTyped and rejects it (`TS6137`).
- A feature is reached from outside only through `@features/<name>` — except
  where that would close an import cycle, in which case the endpoint module is
  imported directly (documented at the call site).

### Errors

`utils/libs/reportError.ts` is the single seam for unhandled errors — wiring
Sentry or Datadog is a change to that one file. `app/error.tsx` and
`app/global-error.tsx` are the route-level boundaries.

---

## 13. Testing

Vitest, config in [`vitest.config.mts`](../frontend/vitest.config.mts). Aliases
resolve straight from `tsconfig.json` via Vite's native `resolve.tsconfigPaths`,
so the 17 paths are never duplicated into a second mapping.

**Suites live in `test/`, not co-located.** A `*.test.tsx` inside `features/`
would be picked up by `tsconfig.json`'s `**/*.tsx` include and by the Next.js
build graph, so test-only imports would be typechecked as production code.

[`test/mockIds.test.ts`](../frontend/test/mockIds.test.ts) — **32 tests, all
passing** (`npm test`), in three parts:

1. **Id generation** — continues the seed's numbering, ignores other prefixes and
   malformed ids, takes the maximum in use rather than the array's last element,
   survives a reset, and never collides across 200 creations.
2. **`assertUniqueId`** — throws naming the offending id.
3. **The billing cycle** — the business, written as sentences:
   - a new bill is unpaid until money arrives
   - the old balance shows on the next bill **without being re-charged**
     (`balance` is 35, not 45)
   - paid in full clears the account; part paid leaves the rest
   - **paying only the previous bill** settles that one and carries today's, and
     the cash is recorded where it was *taken*, not where it was *applied*
   - oldest-debt-first over three weeks
   - cent-exact arithmetic across odd amounts
   - reversing a mis-keyed payment puts the balance back
   - **all four step-4 outcomes**, including the `appliesTo` case
   - a four-week loop that loses nothing
   - balances scoped per customer
   - `collected + outstanding === grossProfit`

---

## 14. Prototype boundaries

Things that are deliberately not real, so nobody mistakes them for finished:

| Area | Reality |
|---|---|
| **Auth** | Not a security boundary. Guards run in the browser; pages are statically rendered. They hide UI, they do not protect data. Passwords are compared in plain text |
| **Data** | In-memory; resets on a full page load |
| **Pagination** | Client-side slicing; the mock returns every row. No `page`/`pageSize` param yet |
| **Settings** | Edits local state; there is no settings endpoint |
| **Popular Items** | Static placeholder figures — nothing aggregates sales volume |
| **Dashboard filter row** | Presentational only; filters nothing |
| **Stat card deltas** | `+8.5%` / `+4.2%` are literals, not computed |
| **Driver scoping** | `getMyDeliveries` takes a courier id **as an argument**. A real API must scope it from the authenticated session — a client-supplied id is a request to read someone else's work, and the server has to refuse it |
| **Security headers** | `next.config.ts` only disables `X-Powered-By`. A real deployment needs `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, HSTS, and a CSP with a per-request nonce threaded through middleware |
| **Dark mode** | Tokens exist, no toggle installed |

---

## 15. Path to a real backend

The layering is built for this swap, and it is small:

1. In `baseApi.ts`, replace `fakeBaseQuery()` with
   `fetchBaseQuery({ baseUrl })`.
2. In each feature's `api/` module, convert every `queryFn` to a `query`.
3. Delete `services/mock/` — including `READ_LATENCY_MS`, `WRITE_LATENCY_MS` and
   the fault switch, since a real API supplies its own latency and failures.
4. Move `usePagination` to server-side paging — its return shape is designed to
   keep call sites unchanged.
5. Enforce on the server what the guards only suggest: role checks, and scoping
   `getMyDeliveries` from the session rather than an argument.

**Nothing in `types/`, `components/`, `features/*/components/` or the hooks
changes.** Keeping domain models out of `services/mock/` is precisely what buys
that.

The pieces of business logic that would move server-side are all in
[`orders.mock.ts`](../frontend/services/mock/orders.mock.ts) and
[`payments.mock.ts`](../frontend/services/mock/payments.mock.ts): `allocate()`,
`balanceOf()`, `statusOf()`, `decorate()`, and the create/validate rules. They
are pure functions over the store, so they port more or less as written.

---

## 16. Known rough edges

Observations from reading the code — none are blocking, all are worth knowing:

- **The root README is out of date.** It documents a three-step wizard and does
  not mention the driver portal, the payment ledger, delivery rounds, the
  categories endpoint, `RoleGuard`, or step 4. It also describes test coverage as
  "the mock backend's id generation" when the suite now covers the whole billing
  cycle.
- **Currency vs locale.** The repository is named `…-pos-uk` and code comments
  reason in pounds, but `formatCurrency()` renders `$` with an `en-US` locale,
  and the seed data uses Pakistani phone numbers with Lahore/Islamabad
  addresses. One formatter, one line to change —
  [`utils/helper/format.ts`](../frontend/utils/helper/format.ts).
- **The chrome role chip shows the raw enum.** `Chrome.tsx` renders
  `user?.role ?? CURRENT_USER.role`, so a signed-in admin sees `admin` rather
  than the `title` ("Head Administrator") that the auth type exists to provide.
- **`/profile` renders `CURRENT_USER`, not the signed-in user** — the constants
  block rather than the session. (In practice `RoleGuard` keeps couriers out of
  the portal, so it is stale rather than leaky.)
- **`cityOf()` is a heuristic** — the last comma-separated segment of a free-text
  address. Correct for the seed data, and flagged in its own doc comment as
  cheap to replace once addresses are structured.
- **Categories are keyed by name**, not by id, so renaming one would orphan every
  product referencing it. There is no rename or delete, which is why it has not
  bitten.

---

*Written from a full read of the codebase at commit `021f9ce`.*
