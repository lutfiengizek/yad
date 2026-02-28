---
paths:
  - "src/**/*.tsx"
  - "src/**/*.css"
  - "src/components/**/*"
---

# YAD UI Rules

## shadcn/ui Mandatory Workflow

When adding any UI component, ALWAYS follow this exact sequence using the shadcn MCP tools:

1. **`search_items_in_registries`** — Search if the component exists in shadcn
2. **`view_items_in_registries`** — View its API, props, and variants
3. **`get_item_examples_from_registries`** — Study usage examples and demos
4. **`get_add_command_for_items`** — Get the CLI command and install the component
5. **`get_audit_checklist`** — Run the audit checklist after adding the component

**NEVER write a component from scratch if it exists in shadcn.** This includes: Button, Dialog, Sheet, Dropdown, Select, Input, Textarea, Tabs, Accordion, Card, Badge, Tooltip, Popover, Command, Separator, ScrollArea, Sidebar, ResizablePanel, and all others in the registry.

## Color System

- **All colors come from CSS variables defined in `globals.css`** using oklch format.
- **Hardcoded color values are FORBIDDEN.** No `#hex`, no `rgb()`, no `hsl()`, no raw `oklch()` values in components or utility classes.
- If a new color is needed, add it to `globals.css` with both `:root` (light) and `.dark` (dark) variants in oklch format.

### Available Color Tokens

Use these via Tailwind classes (e.g., `bg-primary`, `text-muted-foreground`, `border-border`):

| Token | Usage |
|-------|-------|
| `background` / `foreground` | Page background & default text |
| `card` / `card-foreground` | Card surfaces |
| `popover` / `popover-foreground` | Popover/dropdown surfaces |
| `primary` / `primary-foreground` | Primary actions & CTA |
| `secondary` / `secondary-foreground` | Secondary actions |
| `muted` / `muted-foreground` | Muted/subtle elements |
| `accent` / `accent-foreground` | Accent highlights |
| `destructive` / `destructive-foreground` | Destructive/danger actions |
| `border` | Default borders |
| `input` | Input field borders |
| `ring` | Focus rings |
| `chart-1` through `chart-5` | Chart/data visualization colors |
| `sidebar` / `sidebar-foreground` | Sidebar background & text |
| `sidebar-primary` / `sidebar-primary-foreground` | Sidebar primary elements |
| `sidebar-accent` / `sidebar-accent-foreground` | Sidebar accent/hover |
| `sidebar-border` | Sidebar borders |
| `sidebar-ring` | Sidebar focus rings |

## Tailwind v4

- Color tokens are defined with `@theme inline` in `globals.css`.
- Use standard Tailwind utility classes: `bg-primary`, `text-muted-foreground`, `border-input`, etc.
- Do NOT use the legacy `theme()` function or `@apply` with custom properties.

## Fonts

- **Sans:** Roboto — used for all body text and UI
- **Mono:** JetBrains Mono — used for code blocks and technical content
- **Do NOT add any other fonts.** No Inter, no Geist, no system-ui overrides.

## Layout

- 3-panel layout: Left sidebar, center content area, right inspector panel.
- **Left sidebar:** Use shadcn `Sidebar` component.
- **Center + Right panels:** Use shadcn `ResizablePanelGroup` with `ResizablePanel` and `ResizableHandle`.
- All panels must be resizable by the user.

## Dark Mode

- Dark mode is managed via `@custom-variant dark (&:is(.dark *))` in Tailwind v4.
- **Every UI change MUST be visually tested in both light and dark themes.**
- Always define both light and dark values for any new CSS variable.
- Use the token-based classes (e.g., `bg-background`, `text-foreground`) which automatically adapt to the theme.

## Prohibitions

- **`!important`** — NEVER use. Fix specificity issues properly.
- **Inline styles** — NEVER use `style={{}}` in React components. Use Tailwind classes exclusively.
- **Third-party UI libraries** — NEVER add UI libraries other than shadcn/ui. The only exception is **ProseMirror** (and its ecosystem: tiptap, prosemirror-*) for rich text editing.
- **CSS-in-JS** — No styled-components, emotion, or similar. Tailwind + CSS only.
- **Arbitrary Tailwind values for colors** — No `bg-[#ff0000]` or `text-[oklch(...)]`. Always use tokens.
