# ADR-0004 Table Payment Model

## Status

Accepted, 21 September 2026.

## Context

Stage 3 of the restaurant interaction platform ([#1072]) gave a guest at a table a
scan, a menu, a cart, an order and a way to ask for the bill. It stops one step
short of the end of a meal: the party has ordered, the kitchen has cooked, and
nothing in BiteTribe says what happens when somebody wants to pay.

Stage 4 ([#1073]) was written on the assumption that BiteTribe would answer that
by taking the money, and its first child issue was an evaluation of payment
providers and market compliance obligations. That framing carried the only
regulatory and financial risk in the whole platform, and it gated five other
issues behind a decision nobody had taken.

The question underneath it is narrow and does not need a provider evaluation to
answer: **is BiteTribe ever in the money flow at a restaurant table?** Everything
else - which provider, which market first, what a receipt must contain, what a
payout schedule looks like, what a refund does to a visit - is downstream of it,
and all of it disappears if the answer is no.

What makes no a real option rather than an evasion is that the restaurant is
already standing there. A guest at a table is not a guest at a checkout: the bill
is settled by somebody walking over with a card terminal or by the party going to
the till, and that has worked for as long as restaurants have existed. BiteTribe
adds nothing to it by inserting itself, and it would acquire a payment
institution's obligations to do so.

## Decision

**BiteTribe does not settle restaurant table bills.** The restaurant takes the
money, by whatever means it already uses.

BiteTribe holds no funds, routes no funds, integrates no payment provider,
touches no card data, issues no payout and processes no refund. There is no
payment callback, and closing a visit is a staff action rather than something a
provider triggers.

**What BiteTribe delivers instead is a visit summary.** It says what the party
ordered and what it cost, it is shown in the app and optionally sent by email,
and it is deliberately not called a receipt or an invoice. It makes no fiscal
claim. The restaurant's own till issues whatever document the law where it trades
requires, exactly as it did before BiteTribe existed.

### What this decision does not say

**It is about restaurant table settlement and about nothing else.**

BiteTribe does take money elsewhere. The monetization epic ([#1121]) sells a Pro
subscription and paid BiteTrails through the app stores, where the store is the
merchant of record. That is a different flow, a different counterparty and a
different set of obligations, and this ADR neither settles nor constrains it.

A reader who takes "BiteTribe is never a payment institution" from this page has
read it wrong. The sentence is: BiteTribe is not the one being paid for a meal.

## Consequences

- **No provider integration exists to build, choose or maintain.** Issue [#1109]
  is the recording of this decision rather than an evaluation, and issues [#1110]
  and [#1111] build screens rather than a checkout.
- **`TableVisit.paymentStatus` collapses to two values**, `unsettled` and
  `settled`. `pending`, `failed` and `refunded` described a provider's state
  machine and describe nothing that can now happen. Settlement is recorded by
  staff, with the method they used, as a record of what happened at the table
  rather than as a transaction.
- **A failed payment is not a state BiteTribe can be in.** The failure mode that
  replaces it is a party that leaves without settling, which is what the
  `abandoned` visit outcome already records and what the staff confirmation on an
  unsettled close already asks about.
- **The document is a summary, and its wording is part of the contract.** A
  surface that calls it a receipt, prints a tax line, or numbers it sequentially
  makes a fiscal claim this decision says BiteTribe does not make. See
  [Table Visit](../domain/table-visit.md).
- **Email delivery is the one place a guest's personal data enters this flow.**
  The address is asked for once, optionally, at the end of the visit, used for
  that one send, and not stored on an account or a document. A guest who skips it
  loses nothing but the copy in their inbox.
- **No PCI scope, and no card data in any log.** Not because it is filtered, but
  because none is ever collected.
- **The market question is answered by not being asked.** There is no first
  payment market to choose, and adding a country costs nothing in this flow.

## Trade-Offs

- **BiteTribe gives up the transaction.** It sees what was ordered and not what
  was paid, so a party that orders four dishes and is charged for three is a
  discrepancy BiteTribe cannot see. The summary is a record of the order, which
  is what BiteTribe actually knows.
- **It also gives up the revenue and the data that would have come with it.** A
  payment BiteTribe processed would carry a fee and a confirmed amount. Neither
  was in the product's plan for stage 4, and acquiring both would have cost the
  obligations above.
- **The guest still has to do something analogue at the end of the meal.** The
  app tells them what they owe and calls a waiter; a card terminal still arrives.
  That is the same experience they had before, which is the point: the parts
  BiteTribe improves are the ordering and what happens afterwards.
- **Reversing this is real work rather than a switch.** It would need a provider,
  a payment status machine with failure and refund states, a settlement path, a
  receipt with whatever the first market's law requires, and a re-examination of
  what BiteTribe is for regulatory purposes. Naming that here is what makes it a
  decision rather than a default.

## Links

- [Table Visit](../domain/table-visit.md) - the visit, its orders and its summary
- [UC - Order At The Table Through A QR Code](../use-cases/uc-order-at-the-table-through-a-qr-code.md)
- [Recorded Decisions](recorded-decisions.md) - `RD-TS-45`, `RD-TS-46`, `RD-TS-47`
- [Monetization](../product/monetization.md) - where BiteTribe does take money
- [Current State - Open Questions](../current-state/open-questions.md)

[#1072]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1072
[#1073]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1073
[#1109]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1109
[#1110]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1110
[#1111]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1111
[#1121]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1121
