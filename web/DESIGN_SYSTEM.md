# ForeShift design system — extracted from Bubble

Source: Bubble app `foreshift-ai`, Styles tab, 2026-09-18. Bubble is the
source of truth — this is a snapshot, not a live sync. Color/spacing tokens
referenced below (`Primary`, `Gray 40`, etc.) are defined as CSS variables in
[app/globals.css](app/globals.css) (kebab-case, e.g. `--color-primary`,
`--color-gray-40`).

All text uses **Inter** ("App Font"). All radii/spacing in px.

## Alerts

| Style | Text color | Background | Radius | Padding | Font |
|---|---|---|---|---|---|
| Info | Primary | Primary 20 | 4 | 20/20 | 600 14px |
| Success | Success | Success 20 | 4 | 20/20 | 600 14px |
| Warning | Destructive | Destructive 20 | 4 | 20/20 | 600 14px |

## Buttons (16 variants)

Default = **Electric Shift primary**. Gap between icon/text is 12px unless noted.

| Style | Text/icon color | Background | Border | Radius | Font | Padding |
|---|---|---|---|---|---|---|
| Electric Shift primary (default) | Primary contrast | Shift Electric Blue | — | 12 | 500 14px | 0/12 |
| Navy secondary | Primary contrast | Primary | — | 12 | 500 14px | 0/12 |
| Filled Dark Primary | Primary | Primary contrast | — | 4 | 600 16px | 0/20 |
| Filled Dark Destructive | Destructive | Destructive 10 | — | 4 | 600 16px | 0/20 |
| Filled Light Destructive | Primary contrast | Destructive | — | 4 | 600 16px | 0/20 |
| Grey outline button | Gray 70 | none | 0.5 solid Borders | 12 | 500 14px | 0/20 |
| Outline Dark Primary | Primary contrast | none | 2 solid Primary contrast | 4 | 600 16px | 0/20 |
| Outline Dark Destructive | Destructive 20 | none | 2 solid Destructive 20 | 4 | 600 16px | 0/20 |
| Outline Light Primary | Primary | none | 2 solid Primary | 4 | 600 16px | 0/20 |
| Outline Light Destructive | Destructive | none | 2 solid Destructive | 4 | 600 16px | 0/20 |
| Link Light Primary | Primary | none | — | 0 | 600 16px | 0/0, gap 4 |
| Link Light Destructive | Destructive | none | — | 0 | 600 16px | 0/0, gap 4 |
| Link Dark Primary | *(not captured — parallels Link Dark Destructive)* | | | | | |
| Link Dark Destructive | Destructive 20 | none | — | 0 | 600 16px | 0/0, gap 4 |
| Round blue status | Shift Cobalt | `--color-status-blue-bg` (#DAE2FD) | — | 12 | 400 14px | 0/8 |
| Status | `--color-status-green-text` (#009966) | `--color-status-green-bg` @ 13% opacity | — | 8 | 500 14px | 0/12 |
| Text Button | Shift Electric Blue | none | — | 12 (n/a, no bg) | 500 14px | 0/0, gap 4 |

Icon size is 24px on the 16px-text variants, 20px on the 14px-text variants.

**Naming pattern**: "Filled Dark X" and "Outline Dark X" are meant for use
*on* a colored/dark surface (e.g. white or light text/border); "Filled/Outline
Light X" are meant for use on a light surface (colored text/border). "Link"
variants are inline text-style buttons.

## Links (inline hyperlink style)

Same variant naming as Buttons (Filled/Outline/Link × Dark/Light ×
Primary/Destructive), default = **Link Light Primary**: `600 14px`, color
`Shift Cobalt` (#0166F7), no padding/border/background. The rest of the Link
variants weren't individually captured — assume they parallel the Button
table above by name, but confirm before relying on one.

## Typography

Body styles are weight 400; Semi bold variants are 600 at the same sizes.

| Style | Weight | Size | Color |
|---|---|---|---|
| Body 12 | 400 | 12px | (inherits) |
| Body 14 | 400 | 14px | (inherits) |
| Body 16 (default) | 400 | 16px | (inherits) |
| Body 18 | 400 | 18px | (inherits) |
| Semi bold 14 | 600 | 14px | Text |
| Semi bold 16 | 600 | 16px | Text |
| Grey text | 400 | 14px | `--color-grey-text` (#464554) |
| Small grey body | 400 | 12px | Gray 60 |
| input label | 600 | 12px | `--color-input-label` (#90A1B9) |
| Table heading | 600 | 14px | `--color-grey-text` (#464554) |
| Heading 1 | 700 | 56px | (inherits) |
| Heading 2 | 700 | 44px | (inherits) |
| Heading 3 | 700 | 36px | (inherits) |
| Heading 4 | 600 | 28px | (inherits) |
| Heading 5 | 600 | 24px | (inherits) |
| Heading 6 | 700 | 20px | Text |
| White Medium Heading | 700 | 24px | Primary contrast (for dark/colored backgrounds) |

## Form controls

**Input (default "Primary"), Dropdown (default "Standard"), Search Box
(default "standard")** all share one spec:

- Padding: `0 / 12`
- Text: `400 14px`, color `Text`
- Placeholder: color `Gray 40`
- Radius: `12`
- Border: `0.5px solid Borders`
- No background fill
- Transition: `border-color 200ms ease`

**Checkbox (Standard)**: text `400 16px` color `Text`; transition
`font-color 200ms ease`. No custom chrome beyond the native control + label
text.

**Radio Buttons (Standard)**: control color `Primary`; label text `400 16px`
color `Text`.

## Popup / modal (Standard, default)

- Backdrop (grayout): `Gray 70`, blur `0`
- Panel padding: `20 / 20`
- Panel radius: `20`
- Panel background: `Surface`
- No border, no shadow defined

## Page

- Background: `Background` token (#FFFFFF)

## Not captured (lower priority — pull if/when a screen needs them)

Multiline Input, Date/Time Picker, File Uploader, Picture Uploader, Map,
Video, HTML, Icon, Image, Shape, Slider Input, Group / Group Focus /
Floating Group / Repeating Group (layout containers — no distinct visual
styling beyond the tokens already captured), and the remaining Link variants
not individually spot-checked (see note above).
