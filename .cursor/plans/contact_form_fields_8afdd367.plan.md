---
name: Contact form fields
overview: Add number, date, URL, dropdown, radio, and checkbox fields to the page builder Contact form, including an options list for choice fields and a placeholder for text-like fields.
todos:
  - id: model
    content: Widen ContactFormField and the Puck Fields array with the six types, placeholder, and options
    status: completed
  - id: render
    content: Render select, radio, checkbox, number, date, and url in ContactFormClient, with site.css for choice controls
    status: completed
  - id: verify
    content: Verify each field in the builder canvas and that a public submit still posts FormData
    status: completed
isProject: false
---

# More Contact form fields

The Contact form block in the page builder only offers text, email, phone, and long text. Editors set those in the Fields array in [`src/builder/config.tsx`](src/builder/config.tsx), and [`src/builder/blocks/contact-form-client.tsx`](src/builder/blocks/contact-form-client.tsx) renders every non-textarea as a plain `<input>`.

## New field types

Keep the existing four. Add:

- **Number** (`number`), **Date** (`date`), **URL** (`url`) — native inputs, same submit path as today (`FormData` POST to the endpoint URL).
- **Dropdown** (`select`) and **Radio** (`radio`) — choices from an options list.
- **Checkbox** (`checkbox`) — one boolean, for consent or a single yes/no. Required means the box must be checked.

Also add an optional **Placeholder** on each field. It applies to text, email, phone, URL, number, date, long text, and the dropdown’s empty option. Checkbox and radio ignore it.

Options are one choice per line in a textarea (`Label`, or `value|Label`). The renderer drops blank lines and caps the list at 20. The options field stays visible on every array item; only dropdown and radio use it. Existing pages keep working because their fields have no `options` or `placeholder`.

## Where it changes

- [`src/builder/blocks/content.tsx`](src/builder/blocks/content.tsx) — widen `ContactFormField`:

```ts
type: 'text' | 'email' | 'tel' | 'textarea' | 'number' | 'date' | 'url' | 'select' | 'radio' | 'checkbox';
placeholder?: string;
options?: string;
```

- [`src/builder/config.tsx`](src/builder/config.tsx) — add the six types to the Type select, plus `placeholder: text('Placeholder')` and `options: textarea('Options, one per line (dropdown and radio)')`.
- [`src/builder/blocks/contact-form-client.tsx`](src/builder/blocks/contact-form-client.tsx) — branch the markup:
  - textarea, select, radio group (`fieldset` + legend), checkbox (label beside the box), or input with an allowlisted `type`.
  - Unknown types fall back to `text`.
  - Radio and checkbox use the field `name` so they still land in `FormData`.
- [`src/builder/site.css`](src/builder/site.css) — select uses `.s-input`; add a compact row style for checkbox and radio so they are not stretched full width like text inputs.

AI generation in [`src/builder/schema.ts`](src/builder/schema.ts) only emits title, subtitle, and submit text, then the block’s `defaultProps` supply the fields. Leave that schema as it is.

File upload stays out of scope. Submissions still go to an external URL, and there is no stored inbox or file handling.

## Verification

In the builder, open a page with a Contact form, add one of each new type (dropdown and radio with a few options), and confirm the canvas shows the right control. On the public page, fill and submit the form and confirm `FormData` includes the new names (number, date, selected option, checked box). Existing text/email/message fields still render.
