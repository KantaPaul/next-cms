---
name: Contact form UI
overview: Fix the contact-form editor so its fields use the same site input styles as the page builder, show the contact-forms list as a table with a dropdown of actions, and move the Contact form block out of Content into its own left-panel category.
todos:
  - id: site-root
    content: Restore the site-root canvas wrapper on the contact-form editor so inputs use site.css
    status: completed
  - id: table
    content: Render the contact-forms list as a table with Edit, Rename, and Delete in an action dropdown
    status: completed
  - id: category
    content: Move ContactForm out of Content into its own left-panel category and tint
    status: completed
isProject: false
---

# Contact form list, inputs, and palette

## Input styles on the contact-form editor

[`globalBuilderConfig`](src/app/(admin)/dashboard/(fullscreen)/pages/[id]/builder/_components/builder-editor.tsx) replaces the Puck root with `{ fields: {} }`, which drops the root `render`. That render is what wraps the canvas in `.site-root` and the theme variables in [`builderConfig`](src/builder/config.tsx). Every input rule in [`site.css`](src/builder/site.css) is scoped to `.site-root .s-input` (and `.site-root .PhoneInput`), so on `/dashboard/contact-forms/[id]` the fields render as plain browser controls.

Keep the empty fields, and put the existing root render back:

```ts
root: { fields: {}, render: builderConfig.root?.render },
```

Page root fields stay hidden, and saved contact-form content is still only `content` and `zones`. The same helper is used for global blocks, so their canvas preview gets the site wrapper too. After that, text, email, number, date, URL, textarea, select, and the phone field all sit on the same `.s-input` / `.PhoneInput` rules. If the phone library stylesheet still draws a second border, raise the specificity of the existing `.site-root .PhoneInput*` rules so the country selector and number stay inside one box that matches `.s-input`.

## Contact forms list as a table

Replace the stacked rows in [`contact-forms-list.tsx`](src/app/(admin)/dashboard/(shell)/contact-forms/_components/contact-forms-list.tsx) with the dashboard table atoms (`TableRoot`, `TableHead`, `TableHeaderCell`, `TableBody`, `TableRow`, `TableCell`) inside the same bordered card the other lists use. Columns: **Name** (link to the editor), **Used on**, **Updated**, **Author**, **Actions**.

Actions use [`ActionDropdown`](src/components/atoms/action-dropdown.tsx) (`variant="vertical"`), same pattern as [`pages-table.tsx`](src/app/(admin)/dashboard/(shell)/pages/_components/pages-table.tsx):

- Edit — link to the builder
- Rename — dialog (name only, existing `renameGlobalBlock`)
- Delete — current confirm, only when `can.delete`

Keep **New contact form** above the table and the dashed empty state. The list is already fully loaded, so this stays a static table (no URL pagination). Create and rename dialogs use `FormInput` from [`src/components/ui/input.tsx`](src/components/ui/input.tsx) instead of the one-off `inputClass`.

## Left panel: Contact form category

In [`builderConfig.categories`](src/builder/config.tsx), remove `ContactForm` from `content` and add a category after Content:

```ts
content: { title: 'Content', components: ['RichText', 'Image', 'Gallery'] },
contact: { title: 'Contact form', components: ['ContactForm'] },
```

The block, its fields, and saved pages stay as they are. This only changes where it is listed. Add a `contact` tint in `getCategoryTint` in [`builder-shell.tsx`](src/app/(admin)/dashboard/(fullscreen)/pages/[id]/builder/_components/builder-shell.tsx). The Mail icon is already mapped. Post and contact-form builders pick this up because they spread the same categories.
