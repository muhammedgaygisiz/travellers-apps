# Mail Authentication

## Purpose

How `bitetribe.app` proves that a mail claiming to come from the domain really
did, and what has to happen before any new service sends on its behalf.

It exists because the rules are published in DNS rather than in the repository,
so nothing in the codebase reveals them, and because the enforcing policy makes
an unauthorised sender fail silently rather than visibly.

Part of [issue 1516][#1516].

## The Three Records

All three live in Cloudflare DNS for `bitetribe.app`.

| Record                                         | Value                                                                                                                              | What it does                                                          |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| SPF, `TXT` on the apex                         | `v=spf1 include:_spf.google.com include:_spf.firebasemail.com ~all`                                                                | Names the infrastructure allowed to send for the domain.              |
| DKIM, `TXT`/`CNAME` on `<selector>._domainkey` | selector `google` (Workspace), `firebase1` and `firebase2` (CNAMEs into `firebasemail.com`)                                        | Publishes the keys that sign outgoing mail.                           |
| DMARC, `TXT` on `_dmarc`                       | `v=DMARC1; p=reject; sp=reject; rua=mailto:dmarc@bitetribe.app,mailto:re+edc8bqxon6j@dmarc.postmarkapp.com; fo=1; adkim=s; aspf=s` | Tells receivers to refuse mail that fails, and where to send reports. |

`adkim=s` and `aspf=s` are strict: a signature for a subdomain does not satisfy
a `From` on the apex. Both senders sign as `d=bitetribe.app`, so strict costs
nothing and closes the subdomain-alignment gap.

## The Two Senders

Everything the product sends leaves through one of these:

- **Google Workspace**, via the Gmail API, from
  `apps/bite-tribe-firebase/functions/src/functions/users/google-workspace-email.ts`.
  Every function that mails a user imports `sendEmail` from there, and the
  `From` is built from one secret, `GOOGLE_WORKSPACE_SENDER_ADDRESS`. Signed
  with selector `google`.
- **Firebase Auth**, for the registration mail Firebase sends itself. Signed
  with `firebase1`/`firebase2`.

Ordinary mail from a Workspace mailbox is covered by the same Workspace key, so
adding a colleague needs no DNS change.

## Before Adding A Sender

**A service that sends as `@bitetribe.app` must be authorised in DNS before it
sends its first mail, not after.** Under `p=reject` an unauthorised sender is
refused outright: the recipient never sees it, nothing lands in spam, and the
only signal is a bounce to the sending service. A newsletter tool, a CRM, a
scheduling or e-signature service and a "send mail as" from another mailbox all
count.

The change is to add the provider's `include:` to SPF and publish the DKIM
selector it gives, then send one test mail and confirm the next day's aggregate
report shows it passing.

## Reading The Reports

Receivers mail a daily XML summary to the `dmarc@bitetribe.app` Google Group.
The group's "Who can post" includes **External**, without which every report
bounces and the silence looks like an absence of forgery.

The attachment is a zipped or gzipped XML. Each `<record>` carries a source IP,
a message count, the SPF and DKIM results, and the disposition the receiver
applied. What matters is a source that is not Google, or a record whose
evaluated result is not `pass`.

`rua` lists two addresses. The group keeps the raw XML; the second is
Postmark's free DMARC Digests, which turns the reports into one plain-language
summary a week. A report address outside the domain only works if the receiving
domain authorises it, and Postmark publishes a wildcard
`*._report._dmarc.dmarc.postmarkapp.com` record that covers every domain
pointed at it.

The free tier shows the top ten sources with five IPs each and seven days of
history, which suits a domain sending a few dozen mails a day: the question it
answers is "has something new started sending", not forensics.

Google Postmaster Tools has no domain registered for `bitetribe.app`.
Registering it would add a delivery and reputation dashboard.

## History

- **7 September 2026** — DMARC published at `p=none`. SPF and DKIM already
  existed; nothing instructed receivers what to do on failure.
- **9–11 September 2026** — first reports: 8 messages, both senders, all
  passing.
- **5–11 November 2026** — 7 reports, 32 messages, no failures, no source
  outside Google. Outlook.com had started reporting by then.
- **11 November 2026** — policy raised straight to `p=reject; sp=reject`,
  skipping the planned `p=quarantine` step after two months at `p=none`. A
  verification mail sent after the change passed with `d=bitetribe.app`,
  selector `firebase2`. Postmark DMARC Digests was added as a second `rua`
  address, and a Gmail filter now files the raw reports under a
  `DMARC Reports` label instead of the inbox.

## Related Pages

- [Implementation - Firebase Functions](../implementation/firebase-functions.md)
- [Architecture - Auth](../architecture/auth.md)
- [issue 1516][#1516]

[#1516]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1516
