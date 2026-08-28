"use client";

import { useActionState, useState } from "react";
import { deleteAddressAction, saveAddressAction } from "@/app/account/actions";
import { emptyFormState } from "@/lib/auth/accountSchema";
import {
  Field,
  FormError,
  FormNotice,
  SubmitButton,
  TextInput,
} from "@/components/account/AccountFormParts";

export interface SavedAddress {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

/**
 * The address book.
 *
 * Addresses are stored now, before there is a checkout to use them, because
 * they are the part of an order a courier actually needs — name, phone, two
 * lines, city, state, pincode — and because a returning customer typing their
 * address again is the most avoidable friction in Indian ecommerce.
 *
 * One form, reused for add and edit. The distinction is a hidden id, which the
 * action scopes to the signed-in customer before it writes anything.
 */
export function AddressBook({ addresses }: { addresses: SavedAddress[] }) {
  /** null = closed, "" = adding, an id = editing that address. */
  const [editing, setEditing] = useState<string | null>(null);
  const [state, formAction] = useActionState(saveAddressAction, emptyFormState);

  const current = addresses.find((address) => address.id === editing);

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="headline text-2xl">Addresses</h2>
        {editing === null && (
          <button
            type="button"
            onClick={() => setEditing("")}
            className="text-label font-bold uppercase text-bone underline underline-offset-4 transition-opacity hover:opacity-70"
          >
            Add address
          </button>
        )}
      </div>

      {addresses.length === 0 && editing === null && (
        <p className="mt-4 text-sm text-bone/50">
          No addresses saved yet. Add one now and checkout will be a single tap.
        </p>
      )}

      <ul className="mt-5 space-y-3">
        {addresses.map((address) => (
          <li
            key={address.id}
            className="rounded-xl border border-ink-line bg-ink-soft p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="text-sm leading-relaxed text-bone/80">
                <p className="font-bold text-bone">
                  {address.fullName}
                  {address.isDefault && (
                    <span className="ml-2 rounded-full border border-bone/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-bone/60">
                      Default
                    </span>
                  )}
                </p>
                <p>{address.line1}</p>
                {address.line2 && <p>{address.line2}</p>}
                <p>
                  {address.city}, {address.state} {address.pincode}
                </p>
                <p className="mt-1 text-bone/50">+91 {address.phone}</p>
              </div>

              <div className="flex shrink-0 gap-4 text-label font-bold uppercase">
                <button
                  type="button"
                  onClick={() => setEditing(address.id)}
                  className="text-bone underline underline-offset-4 transition-opacity hover:opacity-70"
                >
                  Edit
                </button>
                {/* A plain form, so deleting works before hydration and needs
                    no client state of its own. */}
                <form action={deleteAddressAction}>
                  <input type="hidden" name="id" value={address.id} />
                  <button
                    type="submit"
                    className="text-bone/50 underline underline-offset-4 transition-colors hover:text-flare-orange"
                  >
                    Remove
                  </button>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {editing !== null && (
        <form
          action={formAction}
          // Remounts the form when the target changes, so the browser resets
          // every field. Without it, switching from one address to another
          // leaves the previous values sitting in the inputs.
          key={editing || "new"}
          className="mt-6 space-y-5 rounded-xl border border-ink-line bg-ink-soft p-4 sm:p-6"
        >
          {current && <input type="hidden" name="id" value={current.id} />}

          <Field label="Full name" htmlFor="fullName" error={state.errors.fullName}>
            <TextInput
              id="fullName"
              name="fullName"
              autoComplete="name"
              defaultValue={current?.fullName}
              required
              invalid={Boolean(state.errors.fullName)}
            />
          </Field>

          <Field
            label="Mobile"
            htmlFor="phone"
            error={state.errors.phone}
            hint="10 digits. The courier calls this number."
          >
            <TextInput
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              defaultValue={current?.phone}
              required
              invalid={Boolean(state.errors.phone)}
            />
          </Field>

          <Field label="Flat, building, street" htmlFor="line1" error={state.errors.line1}>
            <TextInput
              id="line1"
              name="line1"
              autoComplete="address-line1"
              defaultValue={current?.line1}
              required
              invalid={Boolean(state.errors.line1)}
            />
          </Field>

          <Field label="Area, landmark (optional)" htmlFor="line2" error={state.errors.line2}>
            <TextInput
              id="line2"
              name="line2"
              autoComplete="address-line2"
              defaultValue={current?.line2 ?? ""}
              invalid={Boolean(state.errors.line2)}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="City" htmlFor="city" error={state.errors.city}>
              <TextInput
                id="city"
                name="city"
                autoComplete="address-level2"
                defaultValue={current?.city}
                required
                invalid={Boolean(state.errors.city)}
              />
            </Field>

            <Field label="State" htmlFor="state" error={state.errors.state}>
              <TextInput
                id="state"
                name="state"
                autoComplete="address-level1"
                defaultValue={current?.state}
                required
                invalid={Boolean(state.errors.state)}
              />
            </Field>
          </div>

          <Field label="Pincode" htmlFor="pincode" error={state.errors.pincode}>
            <TextInput
              id="pincode"
              name="pincode"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              defaultValue={current?.pincode}
              required
              invalid={Boolean(state.errors.pincode)}
              className="sm:max-w-[10rem]"
            />
          </Field>

          <label className="flex items-center gap-3 text-sm text-bone/70">
            <input
              type="checkbox"
              name="isDefault"
              defaultChecked={current?.isDefault ?? addresses.length === 0}
              className="h-4 w-4 accent-bone"
            />
            Deliver here by default
          </label>

          <FormError message={state.errors.form} />
          <FormNotice message={state.message} />

          <div className="flex flex-col gap-3 sm:flex-row">
            <SubmitButton pendingLabel="Saving…" className="sm:w-auto">
              {current ? "Save changes" : "Save address"}
            </SubmitButton>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-full border border-bone/25 px-8 py-4 text-label-lg font-bold uppercase text-bone transition-colors hover:border-bone"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
