import type { PolicyPage } from "./types";

/**
 * PLACEHOLDER POLICY COPY — NOT REVIEWED, NOT BINDING.
 *
 * Written to make the footer's links lead somewhere real and to show the shape
 * these pages take. It is plausible for an Indian D2C brand and consistent with
 * what the storefront already claims — seven-day returns, cash on delivery,
 * free shipping over ₹1,999 — but it has not been near a lawyer, and several
 * details are invented outright: the registered address, the GST number, the
 * grievance officer, the retention periods.
 *
 * The page says all of this to the reader too. Legal text that looks reviewed
 * but is not is worse than text that admits it, because nobody thinks to check
 * it before launch.
 *
 * Replace wholesale before taking payments.
 */
const UPDATED = "Last updated 28 August 2026";

export const policies: PolicyPage[] = [
  {
    slug: "returns",
    title: "Returns & Exchanges",
    updated: UPDATED,
    intro:
      "If a piece isn’t right, send it back. You have seven days from delivery, and we don’t ask why.",
    sections: [
      {
        heading: "The window",
        body: [
          "You can return any piece within seven days of it reaching you. We start counting from the delivery date on the courier’s record, not the dispatch date.",
          "Pieces bought during a sale are returnable on the same terms as anything else.",
        ],
      },
      {
        heading: "Condition",
        body: [
          "Send it back unworn, unwashed, and with the tags still attached. Try things on the way you would in a shop — over what you’re wearing, indoors.",
          "We can’t accept a piece that has been worn out, altered, or washed, because we can’t sell it to anyone else.",
        ],
      },
      {
        heading: "How to start one",
        body: [
          "Message us on WhatsApp with your order number and which pieces are going back. We’ll arrange a pickup from the address the order went to.",
          "Reverse pickup is free on your first return per order. After that we deduct ₹150 from the refund to cover it.",
        ],
      },
      {
        heading: "Refunds",
        body: [
          "Once the piece reaches our warehouse and passes a quick check, we refund within five to seven working days.",
          "Prepaid orders go back to the original payment method. Cash-on-delivery orders are refunded by bank transfer, so we’ll ask for account details at pickup.",
        ],
      },
      {
        heading: "Exchanges",
        body: [
          "For a different size in the same piece, say so when you start the return and we’ll send the replacement once the original is collected — you don’t pay twice.",
          "For a different piece entirely, return the first and place a new order. It’s faster than us holding stock against an exchange.",
        ],
      },
    ],
  },
  {
    slug: "shipping",
    title: "Shipping",
    updated: UPDATED,
    intro: "We ship across India, and everything over ₹1,999 ships free.",
    sections: [
      {
        heading: "Where we ship",
        body: [
          "Anywhere in India that our courier partners reach, which is most PIN codes. If yours isn’t serviceable, checkout will say so rather than taking the order and cancelling it later.",
          "We don’t ship internationally yet.",
        ],
      },
      {
        heading: "What it costs",
        body: [
          "Free on orders over ₹1,999. Below that, a flat ₹99 anywhere in the country.",
          "Cash on delivery is available on most orders and carries no extra fee.",
        ],
      },
      {
        heading: "How long it takes",
        body: [
          "Orders placed before 2pm on a working day are dispatched the same day. After that, the next one.",
          "Mumbai and Pune: one to two days. Other metros: two to four. Everywhere else: four to seven. Monsoon and festival weeks run longer, and we’d rather say so than promise a date we’ll miss.",
        ],
      },
      {
        heading: "Tracking",
        body: [
          "You’ll get a tracking link by SMS and email when the parcel leaves us. If it hasn’t moved for three days, message us and we’ll chase the courier.",
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms of Service",
    updated: UPDATED,
    intro:
      "The rules for buying from VANTA. Using this site means you accept them.",
    sections: [
      {
        heading: "Who we are",
        body: [
          "VANTA is a clothing label operating from Mumbai, Maharashtra. Our registered address and GST details appear on every invoice.",
        ],
      },
      {
        heading: "Orders",
        body: [
          "An order is an offer to buy, not a completed sale. It’s accepted when we dispatch it, and we may decline one — if a piece is out of stock, if a price was listed wrongly, or if an address looks fraudulent. If we decline after you’ve paid, you’re refunded in full.",
          "We try to keep stock counts accurate but they can lag during a drop. If something sells out between your order and our packing it, we’ll tell you and refund that line.",
        ],
      },
      {
        heading: "Prices",
        body: [
          "All prices are in Indian rupees and include GST. Shipping is shown separately at checkout before you pay.",
          "We can change prices at any time, but never on an order already placed.",
        ],
      },
      {
        heading: "Product images",
        body: [
          "We photograph pieces as accurately as we can. Colour still varies between screens, and a black shell reads differently on a phone at night than on a laptop by a window. A colour difference alone is covered by the returns policy like anything else.",
        ],
      },
      {
        heading: "Our content",
        body: [
          "The photography, copy, designs and the VANTA name belong to us. Don’t reuse them commercially without asking.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "We’re responsible for the pieces we sell and for getting them to you. We aren’t responsible for how a garment is used beyond what it’s made for, and nothing here limits rights you have under Indian consumer law.",
        ],
      },
      {
        heading: "Disputes",
        body: [
          "Indian law applies, and the courts of Mumbai have jurisdiction. Before that, message us — most things are settled that way.",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy",
    updated: UPDATED,
    intro:
      "What we collect, why, and what we don’t do with it. We don’t sell your data.",
    sections: [
      {
        heading: "What we collect",
        body: [
          "To take an order: your name, delivery address, phone number and email. To deliver it, we pass the address and phone number to the courier.",
          "We never see your full card details. Payments go through a payment gateway that handles them; we get back only whether the payment succeeded.",
        ],
      },
      {
        heading: "What stays on your device",
        body: [
          "Your bag and wishlist are stored in your own browser, not on our servers. Clearing your site data clears them, and they don’t follow you to another device.",
        ],
      },
      {
        heading: "Why we keep it",
        body: [
          "To deliver orders, handle returns, answer questions, and meet the record-keeping that tax rules require. We keep order records for eight years for that reason and delete what we don’t need.",
        ],
      },
      {
        heading: "Marketing",
        body: [
          "We only email or message you about drops if you’ve asked us to, and every message has a way out. Opting out of marketing doesn’t stop the messages about an order you’ve placed.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "You can ask what we hold about you, ask us to correct it, or ask us to delete it — except records we’re legally required to keep. Message us and we’ll respond within thirty days.",
        ],
      },
      {
        heading: "Contact",
        body: [
          "Our grievance officer can be reached on the WhatsApp number in the footer, or by post at our registered address.",
        ],
      },
    ],
  },
];

export const policyBySlug: Record<string, PolicyPage> = Object.fromEntries(
  policies.map((p) => [p.slug, p]),
);
