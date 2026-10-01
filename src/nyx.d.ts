/*!
 * Type definitions for NYX
 * Project: https://github.com/fadyehabamer/NYX
 *
 * NYX ships as UMD: a global `Nyx` for <script> usage, a CommonJS export
 * (`nyx.js`), and an ESM default export (`nyx.mjs`). These declarations
 * cover the public imperative API returned by the runtime.
 */

export = Nyx;
export as namespace Nyx;

declare const Nyx: Nyx.NyxStatic;

declare namespace Nyx {
  /** Theme applied via `data-theme`. `'auto'` follows the OS `prefers-color-scheme` and stays in sync. */
  type Theme = 'dark' | 'light' | 'auto';
  type Dir = 'ltr' | 'rtl';
  /** Built-in accents; any custom string that maps to a `[data-accent]` rule is also valid. */
  type Accent = 'violet' | 'emerald' | 'rose' | 'amber' | (string & {});
  /** Feedback variants; any custom string with matching CSS is also valid. */
  type Variant = 'info' | 'success' | 'danger' | 'warning' | (string & {});
  /** A CSS selector, an element, or null. */
  type Target = string | Element | null;

  /** Floating placement: `<side>` or `<side>-<align>`. `start`/`end` are logical (honor `dir="rtl"`). */
  type Placement =
    | 'top' | 'bottom' | 'left' | 'right'
    | 'top-start' | 'top-center' | 'top-end'
    | 'bottom-start' | 'bottom-center' | 'bottom-end'
    | 'left-start' | 'left-center' | 'left-end'
    | 'right-start' | 'right-center' | 'right-end';

  interface PositionOptions {
    /** Default `'bottom'`. */
    placement?: Placement;
    /** Gap between anchor and floating element, px. Default 8. */
    offset?: number;
    /** Minimum gap from the viewport edge when shifting, px. Default 8. */
    padding?: number;
  }

  interface PositionResult {
    top: number;
    left: number;
    /** The placement actually used (may differ from the requested one after a flip). */
    placement: string;
  }

  interface ToastAction {
    label: string;
    onClick?: () => void;
  }

  interface ToastOptions {
    type?: Variant;
    /** Auto-dismiss delay in ms. Default 3200. Ignored when `persistent` is true. */
    duration?: number;
    /** Keep the toast until dismissed manually. */
    persistent?: boolean;
    /** Override the leading icon glyph. */
    icon?: string;
    title?: string;
    /** Action button — a label string, or `{ label, onClick }`. */
    action?: ToastAction | string;
    /** Show a ✕ close button. */
    dismissible?: boolean;
    /** Corner/position of the toast stack, e.g. `'top-right'`, `'bottom-left'`. */
    position?: string;
  }

  interface ToastElement extends HTMLElement {
    dismiss(): void;
  }

  interface SnackbarOptions {
    /** Action button label. */
    action?: string;
    onAction?: () => void;
    /** Auto-dismiss delay in ms. Default 4500. Pass 0 to keep it until dismissed. */
    duration?: number;
  }

  interface SnackbarElement extends HTMLElement {
    dismiss(): void;
  }

  interface ConfirmOptions {
    title?: string;
    confirmText?: string;
    cancelText?: string;
    /** Style the confirm button as a destructive action. */
    danger?: boolean;
  }

  /**
   * Object-oriented handle for a component element
   * (modal/drawer/sheet/popover/collapse/dropdown/tab).
   * Tab instances support `show()` only; `hide()`/`toggle()` act as `show()`.
   */
  interface Instance {
    readonly el: Element;
    show(): Instance;
    hide(): Instance;
    toggle(): Instance;
    /** Forget this instance (getInstance returns null afterwards). */
    dispose(): void;
  }

  /** Imperative handle for a `.nyx-carousel`. Slides honor the cancelable `nyx:before-slide` event. */
  interface CarouselInstance {
    readonly el: Element;
    next(): CarouselInstance;
    prev(): CarouselInstance;
    /** Go to slide `index` (clamped to range). */
    to(index: number): CarouselInstance;
    /** Stop autoplay if running. */
    dispose(): void;
  }

  /** One coachmark in a product tour. */
  interface TourStep {
    /** Element (or selector) to spotlight. Omit for a centered, target-less step. */
    target?: Target;
    title?: string;
    text?: string;
    /** Preferred coachmark side, e.g. `'bottom'`, `'right-start'` (flips on overflow). */
    placement?: string;
  }

  interface TourOptions {
    /** Label for the coachmark dialog (a11y). */
    label?: string;
    nextText?: string;
    doneText?: string;
    backText?: string;
    skipText?: string;
  }

  /** Imperative handle for a running product tour. */
  interface TourInstance {
    next(): void;
    prev(): void;
    /** End the tour early (fires `nyx:tour-end`). */
    stop(): void;
  }

  /** Top-of-page progress bar. All methods return the same object for chaining. */
  interface Progress {
    start(): Progress;
    /** Set the bar to a percentage (0–100). */
    set(percent: number): Progress;
    done(): Progress;
  }

  interface HijriDate {
    y: number;
    m: number;
    d: number;
    /** Arabic month name. */
    month: string;
  }

  interface HijriInput {
    y: number;
    m: number;
    d: number;
    month?: string;
  }

  interface ZatcaInvoice {
    seller?: string;
    vatNumber?: string;
    /** ISO 8601 timestamp. */
    timestamp?: string;
    total?: number | string;
    vatTotal?: number | string;
  }

  interface NyxStatic {
    readonly version: string;

    /** (Re)initialize NYX behaviors within `root` (default `document`). Idempotent — safe to call after injecting HTML. */
    init(root?: Document | Element): void;
    /**
     * Tear down everything NYX wired up inside `root` (default `document`): intervals,
     * observers and window/document listeners the behaviours own, then the internal init
     * guards, so a later `init()` re-initializes the same markup cleanly.
     *
     * Removing an element from the DOM does **not** stop its interval or disconnect its
     * observer — call this on unmount (React `useEffect` cleanup, Vue `onUnmounted`).
     */
    destroy(root?: Document | Element | string): void;

    // ----- overlays -----
    /** Show a modal by selector/element. */
    openModal(target: Target): void;
    /** Show a drawer/sheet by selector/element (alias of `openModal`). */
    openDrawer(target: Target): void;
    /** Close a specific overlay. */
    close(target: Target): void;
    /** Close every open overlay. */
    closeAll(): void;
    togglePopover(node: Element, forceState?: boolean): void;
    openCommandPalette(): void;
    closeCommandPalette(): void;

    // ----- components -----
    /** Activate a tab by its trigger element/selector (`[data-nyx-tab]`). */
    showTab(target: Target): void;
    /** Toggle a collapse/accordion by its trigger element/selector (`[data-nyx-toggle="collapse"]`). */
    toggleCollapse(target: Target): void;
    /** Toggle a dropdown by its `.nyx-dropdown` element or its `[data-nyx-toggle="dropdown"]` trigger. */
    toggleDropdown(target: Target): void;
    /** Existing instance for a component element, or `null`. */
    getInstance(target: Target): Instance | CarouselInstance | null;
    /**
     * Instance for a component element, creating one if needed. Returns an `Instance`
     * (modal/drawer/sheet/popover/collapse/dropdown/tab), a `CarouselInstance` for a
     * `.nyx-carousel`, or `null` for an unrecognized element (no assumed overlay behavior).
     */
    getOrCreateInstance(target: Target): Instance | CarouselInstance | null;
    /** Imperative handle for a `.nyx-carousel` element, or `null` if it isn't one. */
    carousel(target: Target): CarouselInstance | null;
    /**
     * Start a spotlight product tour over `steps`. Dims the page, lights the current
     * target, and shows a coachmark with Back/Next/step-counter. Returns a handle, or
     * `null` if `steps` is empty. Fires `nyx:tour-start`/`-step`/`-end`.
     */
    tour(steps: TourStep[], opts?: TourOptions): TourInstance | null;
    /**
     * Zero-dependency floating engine: pin `floating` (position:fixed) next to `anchor`,
     * flipping to the opposite side on overflow and shifting to stay in view. Returns the
     * resolved coordinates and placement, or `null` if either element is missing.
     */
    position(anchor: Target, floating: Target, opts?: PositionOptions): PositionResult | null;

    // ----- theming -----
    setTheme(theme: Theme): void;
    toggleTheme(): void;
    setDir(dir: Dir): void;
    toggleDir(): void;
    setAccent(accent: Accent): void;

    // ----- feedback -----
    toast(message: string, typeOrOpts?: Variant | ToastOptions, ms?: number): ToastElement;
    snackbar(message: string, opts?: SnackbarOptions): SnackbarElement;
    /** Promise resolves to `true` on confirm, `false` on cancel/dismiss. */
    confirm(message: string, opts?: ConfirmOptions): Promise<boolean>;
    progress: Progress;

    // ----- i18n / regional -----
    /** Convert Western digits in a string/number to Arabic-Indic digits. */
    toArabicNumerals(value: string | number): string;
    toHijri(date: Date): HijriDate;
    toHijri(year: number, month: number, day: number): HijriDate;
    fromHijri(hy: number, hm: number, hd: number): Date;
    formatHijri(input: Date | HijriInput, opts?: { numerals?: 'arab' | null }): string;
    /** Initial great-circle bearing (degrees) from a coordinate to the Kaaba. */
    qiblaBearing(lat: number, lng: number): number;
    /** Base64-encoded ZATCA (Saudi e-invoicing) TLV QR payload. */
    zatcaQR(invoice: ZatcaInvoice): string;
  }
}

declare global {
  interface Window {
    Nyx: Nyx.NyxStatic;
  }
}
