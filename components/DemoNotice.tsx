/**
 * The demonstration-site notice.
 *
 * VANTA is a fictional brand and this storefront is a portfolio piece. Every
 * page of it — the checkout, the policy pages, the phone number in the footer —
 * is written to read like a real shop, which is the point of the build and also
 * the risk: somebody could type a real address into the checkout, or read the
 * returns page as terms they are entitled to rely on.
 *
 * ## Why a component rather than a field on `PolicyPage`
 *
 * `data/types.ts` has no field for this and it was tempting to add one. Three
 * reasons not to:
 *
 * - **The notice is a fact about the site, not about any one policy.** Four
 *   identical copies in a data file is four things to keep in step, which is
 *   the drift this ledger keeps recording — §30 for a count, §31 for a link.
 * - A per-page field reads as *editable per page*, which invites somebody to
 *   reword it on one page or drop it from another. It is not that kind of text.
 * - It is needed on `/checkout`, which is not a `PolicyPage` at all, so a field
 *   on that type could never have served both callers.
 *
 * Both variants live in this one file so the wording cannot drift between them.
 *
 * ## Why the markup is plain
 *
 * No `<aside>`, no `role="note"`, no landmark. The previous placeholder notice
 * was an `<aside role="note">`, and a complementary landmark is precisely the
 * thing some screen-reader reading modes skip past. This is ordinary flow
 * content with real paragraphs, so it is read in order along with everything
 * else. It sits *above* the `<h1>` rather than after it, which is also why the
 * emphasised first line is a `<p><strong>` and not a heading: an `<h2>` before
 * the page's `<h1>` would create the heading-order violation already tracked
 * against `/products`.
 *
 * ## Colour
 *
 * Measured, not chosen by eye. `bone` on solid `flare-red` is 5.41:1 and on the
 * 10% tint 16.95:1; `flare-red-hot` **text** on that tint is only 3.78:1 and
 * fails AA, so the red carries the surface and bone carries every word. The
 * 2px solid `flare-red` border is 3.28:1 against the page, over the 3:1 that
 * WCAG 1.4.11 asks of a boundary.
 */

/** The shared opening. Identical wherever the notice appears. */
function Preamble() {
  return (
    <>
      <p className="text-base font-bold leading-relaxed text-bone">
        <strong>This is a demonstration site.</strong>
      </p>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-bone">
        VANTA is a fictional brand. This site was built to demonstrate the design
        and engineering of a storefront — it is not a real shop, and nothing here
        is for sale.
      </p>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-bone">
        No order placed on this site will be fulfilled. No payment will be taken,
        and no goods will be dispatched. Please do not enter real payment
        details, and do not send real personal information. Phone numbers,
        addresses and email addresses shown anywhere on this site are
        placeholders and are not monitored.
      </p>
    </>
  );
}

/**
 * The full notice, for the policy pages.
 *
 * Rendered above the page title. These pages read as authoritative by their
 * nature — a heading, a date, numbered clauses — which is exactly why the
 * disclaimer cannot be a footnote underneath them.
 */
export function DemoNotice({ className }: { className?: string }) {
  return (
    <div className={`border-2 border-flare-red bg-flare-red/10 ${className ?? ""}`}>
      <p className="bg-flare-red px-4 py-1.5 text-label font-bold uppercase tracking-[0.12em] text-bone">
        Demonstration site — not a real shop
      </p>
      <div className="px-4 py-4">
        <Preamble />
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-bone">
          The policy pages below describe how a store like this would operate.
          They are illustrative, they have not been reviewed by a lawyer, and
          they are not a contract or a binding commitment of any kind.
        </p>
      </div>
    </div>
  );
}

/**
 * The short version, for `/checkout`.
 *
 * Checkout is the one place somebody could actually type a real address and
 * phone number, so the warning has to arrive before the form rather than
 * alongside it. Two lines in the page's own voice — not a modal, which people
 * dismiss reflexively and which would be the wrong tone for a demo anyway.
 */
export function CheckoutDemoNotice({ className }: { className?: string }) {
  return (
    <div className={`border-2 border-flare-red bg-flare-red/10 px-4 py-3 ${className ?? ""}`}>
      <p className="text-base leading-relaxed text-bone">
        <strong className="font-bold">This is a demonstration site — no order is real.</strong>{" "}
        Nothing will be dispatched and no payment will be taken, so please use
        made-up details. Don&rsquo;t enter a real address, phone number or card.
      </p>
    </div>
  );
}
