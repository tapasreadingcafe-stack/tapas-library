# Design System Document: Modern Heritage

## 1. Overview & Creative North Star
This design system is built upon the concept of **"The Digital Curator’s Study."** It is a deliberate rejection of the sterile, "flat" web. Instead, we are creating a digital environment that feels as tactile as a leather-bound book and as warm as a sun-drenched library nook. 

We bridge the gap between "Heritage" (traditional craftsmanship, physical materials) and "Modern" (fluidity, editorial white space, glassmorphism). To achieve this, we move away from traditional rigid grids and standard containers. We embrace **intentional asymmetry**, where text may overlap image containers, and **high-contrast typography scales** that evoke the feel of a premium literary journal.

## 2. Colors: The Truffle Takeover
The palette is a sophisticated interplay of deep earthy tones and high-contrast accents.

*   **Primary (`#26170c`) & Primary Container (`#3d2b1f`):** These represent the "Walnut Wood" and "Deep Truffle." Use these for high-authority elements and background grounding.
*   **Secondary (`#006a6a`):** The "Tapas Teal." This is our intellectual spark. Use it for interactive elements, primary CTAs, and moments of discovery.
*   **Surface & Background (`#fbfbe2` / `#f5f5dc`):** The "Parchment." These are never pure white. They provide the warm, organic base that makes the typography "sink" into the page.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or card definition. Boundaries must be defined solely through background color shifts. A `surface-container-low` card sitting on a `surface` background provides all the definition needed. Let the colors do the structural work.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine paper. 
*   **Base:** `surface`
*   **Structural Sections:** `surface-container-low`
*   **Interactive Cards:** `surface-container-lowest` (to create a subtle "pop" out of the page) or `surface-container-high` (to "sink" the element into the page).

### The "Glass & Gradient" Rule
To ensure we feel "2026" and not "1996," use Glassmorphism for floating navigation or overlay modals. Use the `secondary_container` with a `backdrop-blur` of 12px-20px. For main CTAs, apply a subtle linear gradient from `primary` to `primary_container` to give buttons a "buffed leather" depth.

## 3. Typography
Our typography is a conversation between the past and the future.

*   **Display & Headlines (Newsreader):** This serif is our "Library Vibe." Use `display-lg` for hero moments with tight letter-spacing (-2%) to create an editorial, high-fashion look.
*   **Body & Labels (Plus Jakarta Sans):** This "Organic Sans" provides the modern balance. It is clean but has enough character (the "g" and "a" shapes) to feel human.
*   **The Scale:** Maintain extreme contrast. Use `display-md` for headers directly adjacent to `body-sm` for captions. This "Large-Small" pairing is a hallmark of premium editorial design.

## 4. Elevation & Depth
We reject the standard Material Design drop shadow. Depth in this design system is achieved through **Tonal Layering.**

*   **The Layering Principle:** Stack `surface-container` tiers. A `surface-container-lowest` card on a `surface-container-low` background creates a soft, natural lift without the "dirty" look of a generic shadow.
*   **Ambient Shadows:** If a floating element (like a FAB or Menu) requires a shadow, it must be "Ambient." Use the `on_surface` color at 6% opacity, with a blur radius of at least 32px. It should look like a soft glow, not a shadow.
*   **The "Ghost Border" Fallback:** If a container lacks contrast (e.g., on mobile), use the `outline_variant` at **15% opacity**. It should be felt, not seen.
*   **Glassmorphism:** Use semi-transparent versions of `surface_container_lowest` with a heavy `backdrop-blur`. This allows the "Truffle" and "Teal" tones to bleed through, making the UI feel integrated into the environment.

## 5. Components

### Buttons
*   **Primary:** A subtle gradient from `primary` to `primary_container`. Border radius: `md` (0.375rem). No border.
*   **Secondary:** `secondary` fill with `on_secondary` text. For a "2026" look, try an asymmetrical hover state where one corner rounds further to `xl`.
*   **Tertiary:** Bold `newsreader` text in `secondary` color. No container. Interaction is shown via a 2px underline in `secondary_fixed_dim`.

### Cards & Lists
*   **The Divider Ban:** Strictly forbid the use of horizontal rules (`<hr>`). Use `80px` of vertical white space or a subtle shift from `surface` to `surface-container-low` to separate content blocks.
*   **Cards:** Use `surface-container-highest` with a `lg` (0.5rem) corner radius. Elements inside should "float" using the `surface-container-lowest` token.

### Input Fields
*   **Style:** Do not use four-sided boxes. Use a "Modern Heritage" bottom-line approach using the `outline` token, or a soft-filled `surface-variant` container.
*   **State:** On focus, the bottom line transitions to `secondary` (Teal) and the label (in `newsreader`) floats upward.

### Specialized Components
*   **The "Tapas" Chip:** For categories/tags. Use `secondary_fixed` background with `on_secondary_fixed` text. Use a `full` (9999px) radius for a pebble-like, organic feel.
*   **Hand-Drawn Iconography:** Icons must not be pixel-perfect geometric shapes. Use icons with a slight "human" wobble or varied stroke weight (1.5pt to 2pt), reminiscent of a fountain pen sketch.

## 6. Do's and Don'ts

### Do
*   **Do** allow headers to "bleed" or overlap into images. It creates a sense of curated layering.
*   **Do** use extreme white space. If you think there is enough space, add 24px more.
*   **Do** mix the fonts within a single component (e.g., a `newsreader` title with a `plusJakartaSans` "New" badge).

### Don't
*   **Don't** use 100% opaque black. Use `primary` or `on_surface` for all "black" text to keep the warmth.
*   **Don't** use standard "Material" blue for links. Use `secondary` (Teal).
*   **Don't** use sharp `0px` corners unless it's for a full-bleed background image. The `DEFAULT` (0.25rem) or `md` (0.375rem) roundedness is our signature.
*   **Don't** use "Card Shadows" on every element. Let the background color tiers do the heavy lifting.