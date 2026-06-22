/* ==========================================================
   Nyx docs — hash-routed, data-driven documentation engine.
   Each entry in PAGES becomes its own page at docs.html#/<id>.
   ========================================================== */
(function () {
  'use strict';

  /* ---------- helpers ---------- */
  function escHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
  function isComponent(p) { return p.group !== 'Getting Started' && p.group !== 'Customize' && p.group !== 'Examples'; }

  function hl(src, lang) {
    var e = escHtml(src);
    if (lang === 'css') {
      return e.replace(/(\/\*[\s\S]*?\*\/)|(--[\w-]+)|(#[0-9a-fA-F]{3,8}\b)|([.:&][\w-]+)/g,
        function (m, c, v, col, sel) {
          if (c) return '<span class="t-cmt">' + c + '</span>';
          if (v) return '<span class="t-attr">' + v + '</span>';
          if (col) return '<span class="t-str">' + col + '</span>';
          return '<span class="t-tag">' + sel + '</span>';
        });
    }
    if (lang === 'js') {
      return e.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('[^']*'|"[^"]*")|\b(const|let|var|function|return|new|if|else|import|export)\b/g,
        function (m, c, str, kw) {
          if (c) return '<span class="t-cmt">' + c + '</span>';
          if (str) return '<span class="t-str">' + str + '</span>';
          return '<span class="t-key">' + kw + '</span>';
        });
    }
    return e.replace(/(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?[a-zA-Z][\w-]*)|("[^"]*")|(\s[\w-]+=)/g,
      function (m) {
        if (m.indexOf('&lt;!--') === 0) return '<span class="t-cmt">' + m + '</span>';
        if (m.indexOf('&lt;') === 0) return m.replace(/(&lt;\/?)([a-zA-Z][\w-]*)/, '$1<span class="t-tag">$2</span>');
        if (m.charAt(0) === '"') return '<span class="t-str">' + m + '</span>';
        return m.replace(/(\s)([\w-]+)(=)/, '$1<span class="t-attr">$2</span>$3');
      });
  }

  /* ---------- pretty-print one-line demo HTML into indented multi-line ---------- */
  function formatHtml(html) {
    var raw = html.replace(/>\s+</g, '><').trim();
    var tokens = raw.split(/(<[^>]+>)/).filter(function (t) { return t.replace(/\s/g, '').length; });
    var voidEl = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i;
    var out = [], depth = 0;
    function pad(d) { return new Array(d + 1).join('  '); }
    for (var i = 0; i < tokens.length; i++) {
      var tk = tokens[i];
      if (/^<\//.test(tk)) {
        depth = Math.max(0, depth - 1);
        out.push(pad(depth) + tk);
      } else if (/^<[a-zA-Z]/.test(tk)) {
        var name = (tk.match(/^<([\w-]+)/) || [])[1] || '';
        var selfClose = /\/>\s*$/.test(tk) || voidEl.test(name);
        var nxt = tokens[i + 1], nxt2 = tokens[i + 2];
        if (!selfClose && nxt && nxt.charAt(0) !== '<' && nxt2 && /^<\//.test(nxt2)) {
          out.push(pad(depth) + tk + nxt.trim() + nxt2); i += 2;   // <tag>text</tag> stays inline
        } else {
          out.push(pad(depth) + tk);
          if (!selfClose) depth++;
        }
      } else {
        out.push(pad(depth) + tk.trim());
      }
    }
    return out.join('\n');
  }

  /* ---------- content registry ---------- */
  /* page = { id, group, title, summary, added?, sections:[{title,text?,demo?,code?,lang?}], classes?, js? } */
  var PAGES = [
    /* ===== GETTING STARTED ===== */
    {
      id: 'introduction', group: 'Getting Started', title: 'Introduction', added: 'v1.0',
      summary: 'Nyx is a dark-mode-native CSS/JS component framework with one signature trait — Luminous Depth: every interactive element feels lit from within. Zero dependencies, ~500 lines of CSS, a tiny vanilla-JS runtime.',
      sections: [
        { title: 'Why Nyx', text: 'Think Bootstrap, but opinionated for the SaaS era and dark by default. You get a complete component library, a token system you can retheme with a single variable, and declarative behaviors that need no JavaScript to wire up.' },
        { title: 'At a glance', demo: '<div class="nyx-flex nyx-wrap nyx-gap-3 nyx-items-center"><button class="nyx-btn nyx-btn-primary">Primary</button><button class="nyx-btn nyx-btn-glow">✦ Glow</button><span class="nyx-badge nyx-badge-success">stable</span><span class="nyx-badge-dot">live</span></div>' }
      ],
      classes: [['nyx', 'Required on <body> — applies canvas, typography, focus rings.'], ['nyx-reset', 'Optional box-sizing + margin reset for descendants.']]
    },
    {
      id: 'installation', group: 'Getting Started', title: 'Installation',
      summary: 'Two files, no build step. Link the stylesheet, opt your <body> into Nyx, and include the runtime.',
      sections: [
        {
          title: 'Drop-in', text: 'Add the fonts (the only external dependency), the framework stylesheet, and the runtime.', lang: 'html',
          code: '<!-- fonts -->\n<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">\n\n<!-- framework -->\n<link rel="stylesheet" href="nyx.css">\n\n<body class="nyx nyx-reset">\n  <button class="nyx-btn nyx-btn-primary">Hello, Nyx</button>\n  <script src="nyx.js"></script>\n</body>'
        },
        { title: 'Body classes', text: 'nyx applies the canvas background, base typography, focus rings and scrollbars. nyx-reset adds an opt-in box-sizing + margin/padding reset for everything inside.' }
      ]
    },
    {
      id: 'download', group: 'Getting Started', title: 'Download', added: 'v1.0',
      summary: 'Grab the whole framework as one bundle, load the minified build from a CDN, install from npm, or download just the component files you need — every à-la-carte file requires tokens.css for its CSS variables.',
      sections: [
        { title: 'Bundle — everything', lang: 'html', code: '<!-- one file, every component -->\n<link rel="stylesheet" href="nyx.css">\n<script src="nyx.js"></script>' },
        { title: 'CDN — jsDelivr / unpkg', text: 'No install — load the minified build straight from a CDN — @1 tracks the latest 1.x.', lang: 'html', code: '<!-- jsDelivr -->\n<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/nyx-css@1/nyx.min.css">\n<script src="https://cdn.jsdelivr.net/npm/nyx-css@1/nyx.min.js"></script>\n\n<!-- unpkg -->\n<link rel="stylesheet" href="https://unpkg.com/nyx-css@1/nyx.min.css">' },
        { title: 'npm', text: 'Published with an exports map, so you can import the full bundle, the minified build, or individual modules.', lang: 'bash', code: 'npm install nyx-css' },
        { title: 'À la carte — pick modules', lang: 'html', code: '<!-- tokens.css is always required -->\n<link rel="stylesheet" href="components/tokens.css">\n<link rel="stylesheet" href="components/base.css">\n<link rel="stylesheet" href="components/buttons.css">\n<link rel="stylesheet" href="components/cards.css">' },
        {
          title: 'Files', nocode: true, demo:
            '<div class="nyx-list-group">' +
            '<div class="nyx-list-item"><span><strong>nyx.css</strong> <span class="nyx-caption">· full bundle</span></span><a class="nyx-btn nyx-btn-primary nyx-btn-sm" href="nyx.css" download>↓ Bundle</a></div>' +
            '<div class="nyx-list-item"><span><strong>nyx.min.css</strong> <span class="nyx-badge nyx-badge-success">~11kb gzip</span></span><a class="nyx-btn nyx-btn-glass nyx-btn-sm" href="nyx.min.css" download>↓ Min CSS</a></div>' +
            '<div class="nyx-list-item"><span><strong>nyx.js</strong> · <strong>nyx.min.js</strong> <span class="nyx-badge nyx-badge-success">~4kb gzip</span></span><a class="nyx-btn nyx-btn-glass nyx-btn-sm" href="nyx.min.js" download>↓ Min JS</a></div>' +
            '<div class="nyx-list-item"><span><strong>tokens.css</strong> <span class="nyx-badge nyx-badge-warning">required</span></span><a class="nyx-btn nyx-btn-glass nyx-btn-sm" href="components/tokens.css" download>↓ CSS</a></div>' +
            ['base', 'layout', 'typography', 'buttons', 'cards', 'forms', 'navigation', 'feedback', 'data', 'overlays', 'signature', 'extras', 'motion', 'utilities', 'rtl'].map(function (n) {
              return '<div class="nyx-list-item"><span>' + n + '.css</span><a class="nyx-btn nyx-btn-glass nyx-btn-sm" href="components/' + n + '.css" download>↓ CSS</a></div>';
            }).join('') +
            '</div>'
        }
      ],
      classes: [['nyx.css / nyx.min.css', 'The bundle — full + minified (~11kb gzip).'], ['nyx.min.js', 'Minified runtime (~4kb gzip).'], ['CDN (jsDelivr/unpkg)', 'Serve the minified build with no install.'], ['components/*.css', 'Individual modules (each needs tokens.css).'], ['node build.js', 'Regenerates components/ + the minified files.']]
    },
    {
      id: 'theming', group: 'Customize', title: 'Theming',
      summary: 'Every value is a CSS custom property on :root. Override any --nyx-* token — anywhere downstream — to retheme. No recompile.',
      sections: [
        {
          title: 'Override tokens', lang: 'css',
          code: ':root {\n  --nyx-accent:   #ff5d8f;   /* swap the violet for pink   */\n  --nyx-accent-2: #29e0c4;   /* secondary / success accent */\n  --nyx-radius:   12px;      /* round everything a bit more */\n}'
        },
        {
          title: 'Accent themes', nocode: true,
          text: 'Every tint, border and glow derives from --nyx-accent through color-mix(), so swapping two variables retones the whole UI. Ship a prebuilt data-accent theme, or call Nyx.setAccent() (persists to localStorage). These buttons retheme this entire page live:',
          demo: '<div class="nyx-flex nyx-gap-3 nyx-wrap">' +
            '<button class="nyx-btn nyx-btn-glass nyx-btn-sm" onclick="Nyx.setAccent(\'violet\')"><span style="color:#6c63ff">●</span> Violet</button>' +
            '<button class="nyx-btn nyx-btn-glass nyx-btn-sm" onclick="Nyx.setAccent(\'emerald\')"><span style="color:#10b981">●</span> Emerald</button>' +
            '<button class="nyx-btn nyx-btn-glass nyx-btn-sm" onclick="Nyx.setAccent(\'rose\')"><span style="color:#f43f6b">●</span> Rose</button>' +
            '<button class="nyx-btn nyx-btn-glass nyx-btn-sm" onclick="Nyx.setAccent(\'amber\')"><span style="color:#f59e0b">●</span> Amber</button>' +
            '</div>'
        },
        { title: 'Prebuilt themes', lang: 'html', code: '<!-- one attribute on <html>; default is violet -->\n<html data-accent="emerald">   <!-- violet · emerald · rose · amber -->\n\n<!-- or at runtime, persisted to localStorage -->\n<button onclick="Nyx.setAccent(\'rose\')">Rose</button>' },
        {
          title: 'Live playground', nocode: true,
          text: 'Drag and pick — these controls write --nyx-* variables onto the preview box only. Because the tints are color-mixed, everything inside recolors instantly.',
          demo: '<div class="nyx-card" id="nyxPlay">' +
            '<div class="nyx-flex nyx-gap-5 nyx-wrap nyx-items-center" style="margin-bottom:var(--nyx-s4)">' +
            '<label class="nyx-caption nyx-flex nyx-items-center nyx-gap-2">Accent <input type="color" value="#6c63ff" oninput="document.getElementById(\'nyxPlay\').style.setProperty(\'--nyx-accent\',this.value)"></label>' +
            '<label class="nyx-caption nyx-flex nyx-items-center nyx-gap-2">Accent 2 <input type="color" value="#00d4aa" oninput="document.getElementById(\'nyxPlay\').style.setProperty(\'--nyx-accent-2\',this.value)"></label>' +
            '<label class="nyx-caption nyx-flex nyx-items-center nyx-gap-2">Radius <input type="range" min="0" max="22" value="10" class="nyx-slider" style="width:120px" oninput="var p=document.getElementById(\'nyxPlay\');p.style.setProperty(\'--nyx-radius\',this.value+\'px\');p.style.setProperty(\'--nyx-radius-lg\',(+this.value+6)+\'px\')"></label>' +
            '</div>' +
            '<div class="nyx-flex nyx-gap-3 nyx-wrap nyx-items-center">' +
            '<button class="nyx-btn nyx-btn-primary">Primary</button>' +
            '<button class="nyx-btn nyx-btn-outline-primary">Outline</button>' +
            '<span class="nyx-badge nyx-badge-info">badge</span>' +
            '<span class="nyx-chip nyx-chip-accent">chip</span>' +
            '<label class="nyx-toggle"><input type="checkbox" checked aria-label="preview"><span class="nyx-track"></span></label>' +
            '<div class="nyx-progress" style="width:120px"><span style="width:64%"></span></div>' +
            '</div></div>'
        },
        { title: 'Live swatch', demo: '<div class="nyx-flex nyx-gap-3 nyx-wrap"><span style="width:56px;height:56px;border-radius:12px;background:var(--nyx-accent);box-shadow:var(--nyx-glow)"></span><span style="width:56px;height:56px;border-radius:12px;background:var(--nyx-accent-2)"></span><span style="width:56px;height:56px;border-radius:12px;background:var(--nyx-danger)"></span><span style="width:56px;height:56px;border-radius:12px;background:var(--nyx-warning)"></span></div>' },
        { title: 'Light mode', text: 'Nyx ships a built-in light theme — flip it with a single attribute on <html>, or call Nyx.toggleTheme() to switch and persist at runtime (try the ◐ button in the navbar).', lang: 'html', code: '<html data-theme="light">   <!-- default is "dark" -->\n\n<!-- runtime toggle, saved to localStorage -->\n<button onclick="Nyx.toggleTheme()">Toggle theme</button>' }
      ],
      classes: [
        ['--nyx-accent', 'Primary accent. Every tint/border/glow color-mixes from it.'],
        ['--nyx-accent-2', 'Secondary / success accent (gradients, success states).'],
        ['data-accent="…"', 'Prebuilt theme on <html>: violet · emerald · rose · amber.'],
        ['Nyx.setAccent(name)', 'Switch accent theme at runtime; persists to localStorage.'],
        ['--nyx-bg / --nyx-surface / --nyx-surface-2', 'Layered dark surfaces for depth.'],
        ['--nyx-glow', 'The signature colored glow (derives from --nyx-accent).'],
        ['--nyx-fs-xs … --nyx-fs-3xl', 'Type scale (11 → 42px).'],
        ['--nyx-s1 … --nyx-s9', 'Spacing scale on a 4px base.']
      ]
    },
    {
      id: 'javascript', group: 'Getting Started', title: 'JavaScript',
      summary: 'nyx.js is UMD — it attaches a global Nyx and auto-initializes on DOMContentLoaded. Most behaviors are declarative via data-nyx-* attributes, so many pages need no JS at all.',
      sections: [
        { title: 'Declarative', lang: 'html', code: '<button data-nyx-toggle="modal"  data-nyx-target="#m">Open</button>\n<button data-nyx-toggle="drawer" data-nyx-target="#d">Panel</button>\n<button data-nyx-dismiss>Close</button>\n\n<div data-nyx-tabs> … </div>\n<nav data-nyx-spy> … </nav>\n<table class="nyx-table-sortable"> … </table>' },
        { title: 'Imperative', lang: 'js', code: "Nyx.toast('Saved ✓', 'success');\nNyx.openModal('#invite');\nNyx.init(container);   // re-wire after injecting markup" }
      ],
      js: [
        ['Nyx.toast(msg, type, ms)', 'Show a toast. type: info | success | warning | danger.'],
        ['Nyx.openModal(target)', 'Open a modal (selector or element).'],
        ['Nyx.openDrawer(target)', 'Open a right-side drawer.'],
        ['Nyx.close(target) / closeAll()', 'Close one / all open overlays.'],
        ['Nyx.openCommandPalette()', 'Open the ⌘K palette.'],
        ['Nyx.init(root)', 'Re-wire data-nyx-* inside root. Idempotent.'],
        ['Nyx.toggleTheme() / setTheme(t)', 'Switch light/dark; persists to localStorage.'],
        ['Nyx.toggleDir() / setDir(d)', 'Flip LTR/RTL; persists to localStorage.'],
        ['Nyx.setAccent(name)', 'Set accent theme (violet|emerald|rose|amber); persists.']
      ]
    },

    {
      id: 'rtl', group: 'Getting Started', title: 'RTL support', added: 'v1.0',
      summary: 'Nyx is fully bidirectional. Set dir="rtl" on <html> (or call Nyx.toggleDir()) and every component mirrors — drawers slide from the left, toasts dock left, timelines, tooltips, the select caret and badges all flip via CSS logical properties.',
      sections: [
        { title: 'Enable', lang: 'html', code: '<html dir="rtl">\n\n<!-- or toggle at runtime (persists to localStorage) -->\n<button onclick="Nyx.toggleDir()">عربى / EN</button>' },
        { title: 'Mirrored in place', text: 'This preview is wrapped in dir="rtl" to show automatic mirroring — note the alert edge, breadcrumb and button order.', demo: '<div dir="rtl" class="nyx-stack"><nav class="nyx-breadcrumb"><a href="#/rtl">الرئيسية</a><span class="nyx-sep">/</span><a href="#/rtl">المكوّنات</a><span class="nyx-sep">/</span><span aria-current="page">الأزرار</span></nav><div class="nyx-alert nyx-alert-info"><span class="nyx-alert-icon">ℹ️</span><div>الحدّ الملوّن ينتقل تلقائياً إلى الجهة الصحيحة.</div></div><div class="nyx-flex nyx-gap-3"><button class="nyx-btn nyx-btn-primary">حفظ</button><button class="nyx-btn nyx-btn-ghost">إلغاء</button></div></div>' }
      ],
      classes: [['dir="rtl"', 'Mirrors layout via CSS logical properties + an RTL layer.'], ['Nyx.toggleDir()', 'Flip direction at runtime; persisted.']]
    },
    {
      id: 'frameworks', group: 'Getting Started', title: 'React · Vue · Angular', added: 'v1.0',
      summary: 'Nyx is framework-agnostic — it is just a stylesheet plus a tiny runtime. Import the CSS once, use the classes in your markup, and call Nyx.init() after components mount so declarative data-nyx-* behaviors wire up on freshly-rendered DOM. For imperative calls (toasts, modals) call the global Nyx.',
      sections: [
        { title: 'React', lang: 'jsx', code: "// main.jsx — import the stylesheet once\nimport 'nyx-css/nyx.css';\nimport 'nyx-css/nyx.js';   // attaches window.Nyx\n\nfunction Page() {\n  useEffect(() => { window.Nyx.init(); }, []);   // wire data-nyx-* after mount\n  return (\n    <div className=\"nyx-card\">\n      <button className=\"nyx-btn nyx-btn-primary\"\n        onClick={() => window.Nyx.toast('Saved ✓', 'success')}>Save</button>\n    </div>\n  );\n}" },
        { title: 'Vue', lang: 'js', code: "// main.js\nimport 'nyx-css/nyx.css';\nimport 'nyx-css/nyx.js';\n\n// in a component\nimport { onMounted } from 'vue';\nonMounted(() => Nyx.init());\n\n// template:  <button class=\"nyx-btn nyx-btn-primary\" @click=\"Nyx.toast('Hi')\">Go</button>" },
        { title: 'Angular', lang: 'ts', code: "// angular.json → styles: [\"node_modules/nyx-css/nyx.css\"]\n// add nyx.js to scripts, or import it in main.ts\ndeclare const Nyx: any;\n\n@Component({ /* … */ })\nexport class CardComponent implements AfterViewInit {\n  ngAfterViewInit() { Nyx.init(); }   // re-wire after the view renders\n  save() { Nyx.toast('Saved ✓', 'success'); }\n}" },
        { title: 'Notes', text: 'Nyx.init(root) is idempotent and accepts a container, so re-run it (or scope it) whenever you inject markup — after a route change, a list render, or a modal mount. For SSR (Next/Nuxt), guard the runtime: it touches window/document, so import nyx.js in a client-only effect (useEffect / onMounted / afterNextRender). The CSS is safe to import on the server.' }
      ],
      classes: [
        ['import \"nyx-css/nyx.css\"', 'Load the stylesheet once at the app root.'],
        ['Nyx.init(root?)', 'Wire data-nyx-* after mount/render. Idempotent; scope with a root.'],
        ['window.Nyx.*', 'Imperative API (toast, openModal, progress…) from anywhere.'],
        ['SSR', 'Import nyx.js in a client-only effect; CSS is server-safe.']
      ]
    },
    {
      id: 'examples', group: 'Examples', title: 'Templates', added: 'v1.0',
      summary: 'Full pages built entirely with Nyx — copy them as starting points. Each is a single self-contained HTML file in examples/ that links nyx.css + nyx.js.',
      sections: [
        {
          title: 'Open a template', nocode: true, demo:
            '<div class="lp-comp" style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px">' +
            '<a href="examples/dashboard.html" target="_blank" rel="noopener"><div class="nyx-card nyx-card-interactive"><h3 class="nyx-h4">▦ Dashboard</h3><p class="nyx-caption">Sidebar, KPI cards with sparklines, sortable table, activity timeline, ⌘K palette.</p></div></a>' +
            '<a href="examples/checkout.html" target="_blank" rel="noopener"><div class="nyx-card nyx-card-interactive"><h3 class="nyx-h4">🛒 Checkout</h3><p class="nyx-caption">Cart with steppers, address, payment cards, coupon and a sticky order summary (VAT).</p></div></a>' +
            '<a href="examples/pricing.html" target="_blank" rel="noopener"><div class="nyx-card nyx-card-interactive"><h3 class="nyx-h4">💳 Pricing</h3><p class="nyx-caption">Monthly/yearly toggle, three plans (featured), feature lists and an FAQ accordion.</p></div></a>' +
            '<a href="examples/auth.html" target="_blank" rel="noopener"><div class="nyx-card nyx-card-interactive"><h3 class="nyx-h4">🔐 Auth</h3><p class="nyx-caption">Split-screen sign-in / sign-up with tabs, social buttons and an aurora brand panel.</p></div></a>' +
            '</div>'
        }
      ],
      classes: [['examples/*.html', 'Self-contained template pages — copy and adapt.']]
    },

    /* ===== LAYOUT ===== */
    {
      id: 'grid', group: 'Layout', title: 'Grid',
      summary: 'A 12-column CSS Grid. Use .nyx-grid on a wrapper and .nyx-col-{1..12} on children. Bare columns auto-collapse (to 6 below 1024px, full-width below 640px); add breakpoint classes for explicit control.',
      sections: [
        { title: 'Twelve columns', demo: '<div class="nyx-grid"><div class="nyx-col-6"><div class="nyx-card" style="text-align:center;padding:12px">col-6</div></div><div class="nyx-col-6"><div class="nyx-card" style="text-align:center;padding:12px">col-6</div></div><div class="nyx-col-4"><div class="nyx-card" style="text-align:center;padding:12px">col-4</div></div><div class="nyx-col-4"><div class="nyx-card" style="text-align:center;padding:12px">col-4</div></div><div class="nyx-col-4"><div class="nyx-card" style="text-align:center;padding:12px">col-4</div></div></div>' },
        { title: 'Responsive breakpoints', added: 'v1.0', text: 'Pair a base mobile column with a breakpoint column (sm 640 · md 768 · lg 1024 · xl 1280, mobile-first min-width). This row is full-width on phones, halves at md, thirds at lg. Resize to see it.', demo: '<div class="nyx-grid"><div class="nyx-col-12 nyx-col-md-6 nyx-col-lg-4"><div class="nyx-card" style="text-align:center;padding:12px">12 · md-6 · lg-4</div></div><div class="nyx-col-12 nyx-col-md-6 nyx-col-lg-4"><div class="nyx-card" style="text-align:center;padding:12px">12 · md-6 · lg-4</div></div><div class="nyx-col-12 nyx-col-md-12 nyx-col-lg-4"><div class="nyx-card" style="text-align:center;padding:12px">12 · md-12 · lg-4</div></div></div>' },
        { title: 'Markup', lang: 'html', code: '<div class="nyx-grid">\n  <!-- full-width on mobile, half at md, third at lg -->\n  <div class="nyx-col-12 nyx-col-md-6 nyx-col-lg-4"> … </div>\n  <div class="nyx-col-12 nyx-col-md-6 nyx-col-lg-4"> … </div>\n  <div class="nyx-col-12 nyx-col-md-12 nyx-col-lg-4"> … </div>\n</div>' }
      ],
      classes: [
        ['nyx-grid', '12-column grid container, 16px gap.'],
        ['nyx-col-1 … nyx-col-12', 'Span N of 12 (all widths; bare cols auto-collapse).'],
        ['nyx-col-sm-* (≥640)', 'Span N from the small breakpoint up.'],
        ['nyx-col-md-* (≥768)', 'Span N from the medium breakpoint up.'],
        ['nyx-col-lg-* (≥1024)', 'Span N from the large breakpoint up.'],
        ['nyx-col-xl-* (≥1280)', 'Span N from the extra-large breakpoint up.']
      ]
    },
    {
      id: 'flexbox', group: 'Utilities', title: 'Flex utilities',
      summary: 'Composable flexbox helpers for one-off layouts — alignment, distribution, wrapping and gaps.',
      sections: [
        { title: 'Align & distribute', demo: '<div class="nyx-flex nyx-items-center nyx-justify-between nyx-gap-3"><span class="nyx-badge-dot">items-center</span><button class="nyx-btn nyx-btn-ghost nyx-btn-sm">justify-between</button></div>' },
        { title: 'Gaps & wrap', demo: '<div class="nyx-flex nyx-wrap nyx-gap-2"><span class="nyx-chip">one</span><span class="nyx-chip">two</span><span class="nyx-chip">three</span><span class="nyx-chip">four</span></div>' }
      ],
      classes: [
        ['nyx-flex / nyx-inline-flex', 'display:flex / inline-flex.'],
        ['nyx-items-center / -start', 'align-items.'],
        ['nyx-justify-between / -center', 'justify-content.'],
        ['nyx-wrap / nyx-flex-col / nyx-grow', 'wrap, column direction, flex:1.'],
        ['nyx-gap-1 … nyx-gap-6', 'gap on the 4px scale.']
      ]
    },
    {
      id: 'container', group: 'Layout', title: 'Container',
      summary: 'Centers content with a max-width of 1280px and responsive inline padding.',
      sections: [{ title: 'Usage', lang: 'html', code: '<div class="nyx-container">\n  <!-- page content, centred & padded -->\n</div>' }],
      classes: [['nyx-container', 'max-width 1280px, auto margins, 24px inline padding.']]
    },
    {
      id: 'stack', group: 'Helpers', title: 'Stack',
      summary: 'A vertical flex column with a consistent gap between children — the simplest way to space stacked content.',
      sections: [
        { title: 'Vertical rhythm', demo: '<div class="nyx-stack"><div class="nyx-card" style="padding:12px">First</div><div class="nyx-card" style="padding:12px">Second</div><div class="nyx-card" style="padding:12px">Third</div></div>' }
      ],
      classes: [['nyx-stack', 'Vertical flex, 16px gap.']]
    },
    {
      id: 'divider', group: 'Helpers', title: 'Divider', summary: 'A subtle horizontal rule with an optional centered label.',
      sections: [
        { title: 'With label', demo: '<div class="nyx-divider">section</div>' },
        { title: 'Plain', demo: '<div class="nyx-divider plain"></div>' }
      ],
      classes: [['nyx-divider', 'Labeled rule.'], ['nyx-divider plain', 'Rule with no label/margins.']]
    },

    /* ===== CONTENT ===== */
    {
      id: 'typography', group: 'Content', title: 'Typography',
      summary: 'Plus Jakarta Sans for display, Inter for body, JetBrains Mono for code. A clear scale from overline to display.',
      sections: [
        { title: 'Scale', demo: '<div class="nyx-stack"><span class="nyx-overline">Overline · eyebrow</span><h1 class="nyx-display">Display <span class="nyx-gradient-text">gradient</span></h1><h2 class="nyx-h2">Heading two</h2><p class="nyx-lead">A lead paragraph in a calmer, larger voice.</p><p class="nyx-body">Body copy with inline <span class="nyx-code">nyx-code</span> and <span class="nyx-muted">muted</span> text.</p></div>' },
        { title: 'Weights', demo: '<div class="nyx-stack nyx-gap-1"><p class="nyx-fw-light">Light · 300 — the quick brown fox</p><p class="nyx-fw-normal">Normal · 400 — the quick brown fox</p><p class="nyx-fw-medium">Medium · 500 — the quick brown fox</p><p class="nyx-fw-semibold">Semibold · 600 — the quick brown fox</p><p class="nyx-fw-bold">Bold · 700 — the quick brown fox</p><p class="nyx-fw-black">Black · 900 — the quick brown fox</p></div>' },
        { title: 'Size scale', demo: '<div style="display:flex;align-items:baseline;gap:16px;flex-wrap:wrap"><span class="nyx-text-xs">xs</span><span class="nyx-text-sm">sm</span><span class="nyx-text-base">base</span><span class="nyx-text-lg">lg</span><span class="nyx-text-xl">xl</span><span class="nyx-text-2xl">2xl</span><span class="nyx-text-3xl">3xl</span></div>' },
        { title: 'Inline & decoration', demo: '<p class="nyx-body nyx-leading-relaxed">Press <kbd class="nyx-kbd">⌘</kbd> <kbd class="nyx-kbd">K</kbd> to search, open a <a href="#/typography" class="nyx-link">styled link</a>, <mark class="nyx-mark">highlight</mark> a phrase, <span class="nyx-strike">strike</span> it out, or glow an <span class="nyx-text-glow nyx-text-accent">accent</span> word.</p>' },
        { title: 'Gradient & outline', demo: '<div class="nyx-stack"><h3 class="nyx-h2 nyx-gradient-text">Violet → teal (default)</h3><h3 class="nyx-h2 nyx-gradient-text cool">Cool · teal → violet</h3><h3 class="nyx-h2 nyx-gradient-text warm">Warm · amber → rose</h3><h3 class="nyx-h2 nyx-text-stroke">Outlined stroke</h3></div>' },
        { title: 'Blockquote', demo: '<blockquote class="nyx-blockquote">Design is not just what it looks like and feels like. Design is how it works.<cite>— Steve Jobs</cite></blockquote>' },
        { title: 'Prose (rich text)', text: 'Wrap raw HTML — article bodies, markdown output — in .nyx-prose and headings, lists, links, code and quotes all get consistent, RTL-aware rhythm.', demo: '<div class="nyx-prose"><h3>Rich content</h3><p>Headings, <strong>bold</strong>, inline <code>code</code> and <a href="#/typography">links</a> all get sensible spacing automatically.</p><ul><li>Logical block rhythm</li><li>RTL-aware indentation</li></ul><blockquote>Quotes are styled too.</blockquote></div>' },
        { title: 'Truncate & clamp', demo: '<div class="nyx-stack" style="max-width:320px"><p class="nyx-text-truncate">Single line truncates with an ellipsis when it overflows the container width.</p><p class="nyx-line-clamp-2">Clamped to two lines: after the second line it cuts off with an ellipsis no matter how much more copy follows here in the source markup.</p></div>' },
        { title: 'Tabular numerals', text: 'Add .nyx-nums-tabular so digits share one width — prices, tables and counters stay aligned.', demo: '<div class="nyx-stack nyx-gap-1 nyx-text-lg"><span class="nyx-nums-tabular">1,209.40</span><span class="nyx-nums-tabular">88,003.15</span><span class="nyx-nums-tabular">7.99</span></div>' }
      ],
      classes: [
        ['nyx-display, nyx-h1 … nyx-h6', 'Display + heading levels.'],
        ['nyx-lead / nyx-lead-sm / nyx-body / nyx-caption / nyx-overline', 'Paragraph + label styles.'],
        ['nyx-text-xs … -3xl', 'Font-size scale utilities.'],
        ['nyx-fw-light … -black', 'Weights 300–900.'],
        ['nyx-leading-* / nyx-tracking-*', 'Line-height + letter-spacing (tracking auto-resets in RTL).'],
        ['nyx-font-display|body|mono|serif', 'Font-family utilities (serif = Aref Ruqaa).'],
        ['nyx-gradient-text (+ .cool / .warm / .animated)', 'Gradient-clip variants.'],
        ['nyx-text-stroke / nyx-text-glow', 'Outlined / glowing text.'],
        ['nyx-link / nyx-mark / nyx-kbd / nyx-code', 'Animated link, highlight, key, inline code.'],
        ['nyx-blockquote / nyx-prose', 'Pull-quote / rich-text container.'],
        ['nyx-dropcap / nyx-smallcaps', 'Drop cap / small caps (Arabic-aware).'],
        ['nyx-text-truncate / nyx-line-clamp-1..3', 'Single- and multi-line clamp.'],
        ['nyx-nums-tabular / nyx-text-balance / nyx-text-pretty', 'Tabular figures + modern text-wrap.']
      ]
    },

    /* ===== FORMS ===== */
    {
      id: 'inputs', group: 'Forms', title: 'Inputs',
      summary: 'Dark inputs, textareas and selects with a violet focus glow, plus labels and helper hints.',
      sections: [
        { title: 'Text & textarea', demo: '<div class="nyx-stack"><div><label class="nyx-label" for="i1">Email</label><input class="nyx-input" id="i1" type="email" placeholder="you@company.com"><span class="nyx-form-hint">We never share it.</span></div><div><label class="nyx-label" for="i2">Message</label><textarea class="nyx-textarea" id="i2" placeholder="Tell us more…"></textarea></div></div>' },
        { title: 'Select', demo: '<label class="nyx-label" for="s1">Plan</label><select class="nyx-select" id="s1"><option>Starter</option><option>Pro</option><option>Enterprise</option></select>' }
      ],
      classes: [['nyx-input / nyx-textarea / nyx-select', 'Form fields.'], ['nyx-label', 'Field label.'], ['nyx-form-hint', 'Helper text below a field.']]
    },
    {
      id: 'validation', group: 'Forms', title: 'Validation', added: 'v1.0', needsJs: true,
      summary: 'Bootstrap-style validity states and password strength metrics. Add .is-valid / .is-invalid to a field, or wrap a form in .nyx-was-validated to drive it from the browser’s native :valid/:invalid — then place a sibling .nyx-valid-feedback / .nyx-invalid-feedback message.',
      sections: [
        { title: 'Valid & invalid', demo: '<div class="nyx-stack"><div><label class="nyx-label">Email</label><input class="nyx-input is-valid" value="you@company.com" aria-label="Email"><div class="nyx-valid-feedback">Looks good.</div></div><div><label class="nyx-label">Password</label><input class="nyx-input is-invalid" type="password" value="123" aria-label="Password"><div class="nyx-invalid-feedback">Use at least 8 characters.</div></div><div><label class="nyx-label">Plan</label><select class="nyx-select is-invalid" aria-label="Plan"><option>Choose…</option></select><div class="nyx-invalid-feedback">Please pick a plan.</div></div></div>' },
        { title: 'Password Strength Meter', text: 'Wrap the password input in `.nyx-password-wrapper` and add `.nyx-strength-bar > .nyx-strength-fill` and `.nyx-strength-text` to render an automated interactive strength indicator.', demo: '<div class="nyx-password-wrapper" style="max-width:320px"><label class="nyx-label">Interactive Password</label><input class="nyx-input" type="password" placeholder="Type a strong password" aria-label="Password"><div class="nyx-strength-bar"><span class="nyx-strength-fill"></span></div><div class="nyx-strength-text" style="margin-top:4px"></div></div>' },
        { title: 'Whole form — native constraints', text: 'Wrap a form in .nyx-was-validated and feedback shows automatically from the browser’s constraint validation — no per-field classes needed.', lang: 'html', code: '<form class="nyx-was-validated">\n  <input class="nyx-input" type="email" required>\n  <div class="nyx-invalid-feedback">Enter a valid email.</div>\n</form>' },
        { title: 'JavaScript Validation Helper', text: 'Enable custom logic on form submission using native checkValidity() and the .nyx-was-validated class.', lang: 'js', code: 'const form = document.querySelector(\'form\');\nform.addEventListener(\'submit\', (e) => {\n  if (!form.checkValidity()) {\n    e.preventDefault();\n    e.stopPropagation();\n  }\n  form.classList.add(\'nyx-was-validated\');\n});' }
      ],
      classes: [
        ['is-valid / is-invalid', 'Validity state on an input / textarea / select.'],
        ['nyx-valid-feedback', 'Success message (shows next to .is-valid).'],
        ['nyx-invalid-feedback', 'Error message (shows next to .is-invalid).'],
        ['nyx-was-validated', 'On a <form>: drives feedback from :valid / :invalid.'],
        ['nyx-password-wrapper', 'Container wrapper for input and strength indicator elements.'],
        ['nyx-strength-bar', 'Outer strength meter bar.'],
        ['nyx-strength-fill', 'Inner strength progress fill (width: 0% to 100%, changes class strength-1 to strength-4).'],
        ['nyx-strength-text', 'Status text description (e.g. Weak, Strong).']
      ]
    },
    {
      id: 'combobox', group: 'Forms', title: 'Combobox', added: 'v1.0', needsJs: true,
      summary: 'An autocomplete input that filters a list as you type — type to narrow, click to choose, closes on outside click.',
      sections: [
        { title: 'Filter as you type', demo: '<div class="nyx-combobox" style="max-width:320px"><input class="nyx-input" placeholder="Search a country…" aria-label="country"><div class="nyx-combobox-menu"><div class="nyx-combobox-opt">Saudi Arabia</div><div class="nyx-combobox-opt">United Arab Emirates</div><div class="nyx-combobox-opt">Egypt</div><div class="nyx-combobox-opt">Qatar</div><div class="nyx-combobox-opt">Kuwait</div><div class="nyx-combobox-opt">Bahrain</div><div class="nyx-combobox-opt">Oman</div><div class="nyx-combobox-empty">No matches</div></div></div>' },
        { title: 'JavaScript Events', text: 'Listen for selection changes on the underlying input element.', lang: 'js', code: 'const input = document.querySelector(\'.nyx-combobox input\');\ninput.addEventListener(\'change\', (e) => {\n  console.log(\'Selected country:\', e.target.value);\n});' }
      ],
      classes: [['nyx-combobox', 'Wrapper (an input + .nyx-combobox-menu).'], ['nyx-combobox-opt', 'An option, filtered live by the typed text.'], ['nyx-combobox-empty', 'Shown when nothing matches.']]
    },
    {
      id: 'multi-select', group: 'Forms', title: 'Multi-select', added: 'v1.0', needsJs: true,
      summary: 'Pick several values as removable chips. Click the control to open, tick options, remove a chip with its ×.',
      sections: [
        { title: 'Tokens', demo: '<div class="nyx-multiselect" style="max-width:360px"><div class="nyx-multiselect-control"><input placeholder="Add teams…" aria-label="teams"></div><div class="nyx-multiselect-menu"><div class="nyx-multiselect-opt">Design</div><div class="nyx-multiselect-opt">Engineering</div><div class="nyx-multiselect-opt">Marketing</div><div class="nyx-multiselect-opt">Sales</div><div class="nyx-multiselect-opt">Support</div></div></div>' },
        { title: 'JavaScript Events', text: 'Listen for selection updates on the multiselect container. The value can be queried dynamically from the chips.', lang: 'js', code: 'const el = document.querySelector(\'.nyx-multiselect\');\nel.addEventListener(\'change\', () => {\n  const selected = Array.from(el.querySelectorAll(\'.nyx-chip\')).map(c => c.getAttribute(\'data-val\'));\n  console.log(\'Selected teams:\', selected);\n});' }
      ],
      classes: [['nyx-multiselect', 'Wrapper.'], ['nyx-multiselect-control', 'The chips + input box.'], ['nyx-multiselect-opt', 'A checkable option (toggles a chip).']]
    },
    {
      id: 'date-picker', group: 'Forms', title: 'Date picker', added: 'v1.0', needsJs: true,
      summary: 'An input with a calendar popover — page months with ‹ › or jump straight to any month/year with the header dropdowns, then click a day to fill the field. Set the input placeholder freely, control the written value with data-format, and bound the year list with data-min-year / data-max-year. Constrain selectable days with data-min / data-max, start the week on Monday with data-week-start="mon", and the footer adds Today / Clear.',
      sections: [
        { title: 'Pick a date', demo: '<div class="nyx-datepicker" data-nyx-datepicker><input class="nyx-input" placeholder="YYYY-MM-DD" aria-label="date" readonly style="min-width:210px"></div>' },
        { title: 'Placeholder, format & year range', text: 'The placeholder is just the native input attribute — use any prompt. data-format sets the written value (tokens YYYY · MM · DD); data-min-year / data-max-year bound the header year dropdown (great for birthdays or bookings).', demo: '<div class="nyx-datepicker" data-nyx-datepicker data-format="DD/MM/YYYY" data-min-year="2000" data-max-year="2035"><input class="nyx-input" placeholder="Select a date…" aria-label="date" readonly style="min-width:210px"></div>' },
        { title: 'JavaScript Events', text: 'Listen for selection updates on the underlying input element.', lang: 'js', code: 'const input = document.querySelector(\'.nyx-datepicker input\');\ninput.addEventListener(\'change\', (e) => {\n  console.log(\'Selected date:\', e.target.value);\n});' }
      ],
      classes: [['data-nyx-datepicker', 'Wrapper; runtime renders the calendar + handles selection.'], ['data-format', 'Output pattern for the filled value — tokens YYYY · MM · DD (default YYYY-MM-DD).'], ['data-min / data-max', 'Earliest / latest selectable day (YYYY-MM-DD); out-of-range days are disabled.'], ['data-week-start', '"mon" starts the week on Monday (default Sunday).'],['data-min-year / data-max-year', 'Bound the header year dropdown (default: today -100 … +10).'], ['placeholder (on input)', 'Native input placeholder — set any prompt text.'], ['nyx-datepicker-pop', 'Popover holding the calendar (auto-created if absent).']]
    },
    {
      id: 'phone', group: 'Forms', title: 'Phone input', added: 'v1.0',
      summary: 'A dial-code select fused with a number field — preloaded here with flags + Gulf / MENA codes, and a single focus ring around the whole control.',
      sections: [
        { title: 'Dial code + number', demo: '<div class="nyx-phone" style="max-width:300px"><select aria-label="country code"><option>🇸🇦 +966</option><option>🇦🇪 +971</option><option>🇪🇬 +20</option><option>🇰🇼 +965</option><option>🇶🇦 +974</option><option>🇧🇭 +973</option><option>🇴🇲 +968</option></select><input type="tel" placeholder="5X XXX XXXX" aria-label="phone"></div>' }
      ],
      classes: [['nyx-phone', 'Flex wrapper; focus-within glows the whole control.'], ['nyx-phone select', 'The dial-code addon.']]
    },
    {
      id: 'input-group', group: 'Forms', title: 'Input group',
      summary: 'Fuse an input with a prefix addon or a suffix button into a single focus-ringed control.',
      sections: [
        { title: 'Prefix + button', demo: '<div class="nyx-input-group"><span class="nyx-addon">@</span><input class="nyx-input" placeholder="username" aria-label="username"><button class="nyx-btn nyx-btn-primary">Go</button></div>' }
      ],
      classes: [['nyx-input-group', 'Flex wrapper; focus-within glows the whole group.'], ['nyx-addon', 'Prefix/suffix label cell.']]
    },
    {
      id: 'search', group: 'Forms', title: 'Search',
      summary: 'A pill search bar with a leading icon and a trailing keyboard-shortcut badge.',
      sections: [
        { title: 'With ⌘K badge', demo: '<div class="nyx-search"><span class="nyx-search-icon">⌕</span><input placeholder="Quick find…" aria-label="Quick find"><span class="nyx-command">⌘K</span></div>' }
      ],
      classes: [['nyx-search', 'Rounded search container.'], ['nyx-search-icon', 'Leading icon color.'], ['nyx-command', 'Keyboard-key badge.']]
    },
    {
      id: 'switches', group: 'Forms', title: 'Switches & checks',
      summary: 'CSS-only custom toggle switch, checkbox and radio — all glowing when active, no JS required.',
      sections: [
        { title: 'All three', demo: '<div class="nyx-flex nyx-gap-5 nyx-wrap nyx-items-center"><label class="nyx-toggle"><input type="checkbox" checked aria-label="toggle"><span class="nyx-track"></span></label><label class="nyx-checkbox"><input type="checkbox" checked><span class="nyx-box"></span> Subscribe</label><label class="nyx-radio"><input type="radio" name="rg" checked><span class="nyx-box"></span> Monthly</label><label class="nyx-radio"><input type="radio" name="rg"><span class="nyx-box"></span> Yearly</label></div>' }
      ],
      classes: [['nyx-toggle', 'Switch (wrap input + .nyx-track).'], ['nyx-checkbox', 'Checkbox (wrap input + .nyx-box).'], ['nyx-radio', 'Radio (wrap input + .nyx-box).']]
    },

    {
      id: 'range', group: 'Forms', title: 'Range', added: 'v1.0', needsJs: true,
      summary: 'A dual-handle range for picking a min and a max. The runtime keeps the lower value as the start handle, paints the selected segment, and (optionally) writes the live value to a sibling .nyx-range-out.',
      sections: [{ title: 'Min / max', demo: '<div style="max-width:340px"><div class="nyx-range"><div class="nyx-range-track"></div><div class="nyx-range-fill"></div><input type="range" min="0" max="100" value="25" aria-label="minimum"><input type="range" min="0" max="100" value="75" aria-label="maximum"></div><div style="display:flex;justify-content:space-between;margin-top:6px"><span class="nyx-caption">Selected range</span><span class="nyx-range-out nyx-caption">25 – 75</span></div></div>' }],
      classes: [['nyx-range', 'Dual-handle wrapper: two input[type=range] + .nyx-range-track + .nyx-range-fill.'], ['nyx-range-fill', 'Selected segment (driven by --nyx-lo / --nyx-hi the runtime sets).'], ['nyx-range-out', 'Optional sibling showing the live “lo – hi” value.']]
    },
    {
      id: 'floating', group: 'Forms', title: 'Floating label', added: 'v1.0',
      summary: 'A label that rests inside the field and floats up on focus or when filled. Give the input placeholder=" " and place the label right after it.',
      sections: [{ title: 'Float', demo: '<div class="nyx-float"><input class="nyx-input" id="fl1" placeholder=" "><label for="fl1">Email address</label></div>' }],
      classes: [['nyx-float', 'Wrapper around .nyx-input + a following label.']]
    },

    {
      id: 'stepper', group: 'Forms', title: 'Stepper', added: 'v1.0', needsJs: true,
      summary: 'A number input flanked by increment / decrement buttons. Respects min and max.',
      sections: [{ title: 'Quantity', demo: '<div class="nyx-stepper"><button data-nyx-step="dec" aria-label="decrease">−</button><input type="text" value="1" min="0" max="99" aria-label="Quantity"><button data-nyx-step="inc" aria-label="increase">+</button></div>' }],
      classes: [['nyx-stepper', 'Wrapper (input between two buttons).'], ['data-nyx-step="inc|dec"', 'Step buttons; honor input min/max.']]
    },
    {
      id: 'otp', group: 'Forms', title: 'OTP input', added: 'v1.0', needsJs: true,
      summary: 'A one-time-code / PIN entry that auto-advances as you type and steps back on delete.',
      sections: [
        { title: 'Four digits', demo: '<div class="nyx-otp"><input maxlength="1" inputmode="numeric" aria-label="digit 1"><input maxlength="1" inputmode="numeric" aria-label="digit 2"><input maxlength="1" inputmode="numeric" aria-label="digit 3"><input maxlength="1" inputmode="numeric" aria-label="digit 4"></div>' },
        { title: 'Need more? Use otp-input-kit', nocode: true, demo: '<div class="nyx-alert nyx-alert-info"><span class="nyx-alert-icon">📦</span><div>For paste-to-fill, masking, variable length and framework bindings, reach for the standalone package <strong>otp-input-kit</strong> by the same author — <a href="https://fadyehabamer.github.io/otp-input-kit/demo/" target="_blank" rel="noopener" style="color:var(--nyx-accent)">live demo &amp; docs ↗</a>.</div></div>' }
      ],
      classes: [['nyx-otp', 'Wrapper of single-character inputs (auto-advance via the runtime).'], ['otp-input-kit', 'External package for advanced OTP (paste, masking, variable length): fadyehabamer.github.io/otp-input-kit.']]
    },
    {
      id: 'tag-input', group: 'Forms', title: 'Tag input', added: 'v1.0', needsJs: true,
      summary: 'Type and press Enter to add a chip; click × to remove. Great for labels and recipients.',
      sections: [
        { title: 'Tags', demo: '<div class="nyx-tag-input"><span class="nyx-chip">design <span class="nyx-chip-x" role="button" aria-label="remove">×</span></span><span class="nyx-chip">react <span class="nyx-chip-x" role="button" aria-label="remove">×</span></span><input placeholder="Add tag + Enter" aria-label="Add tag"></div>' },
        { title: 'JavaScript Events', text: 'Listen for selection updates on the tag-input container.', lang: 'js', code: 'const el = document.querySelector(\'.nyx-tag-input\');\nel.addEventListener(\'change\', () => {\n  const tags = Array.from(el.querySelectorAll(\'.nyx-chip\')).map(c => c.textContent.replace(/\\s*×\\s*/, \'\').trim());\n  console.log(\'Tags updated:\', tags);\n});' }
      ],
      classes: [['nyx-tag-input', 'Wrapper of .nyx-chip tags + a text input.'], ['Enter / ×', 'Add / remove a tag (runtime).']]
    },

    /* ===== COMPONENTS ===== */
    {
      id: 'buttons', group: 'Components', title: 'Buttons',
      summary: 'Six variants, three sizes, plus loading and disabled states — every one lit from within on hover.',
      sections: [
        { title: 'Variants', demo: '<div class="nyx-flex nyx-wrap nyx-gap-3 nyx-items-center"><button class="nyx-btn nyx-btn-primary">Primary</button><button class="nyx-btn nyx-btn-secondary">Secondary</button><button class="nyx-btn nyx-btn-ghost">Ghost</button><button class="nyx-btn nyx-btn-danger">Danger</button><button class="nyx-btn nyx-btn-glass">Glass</button><button class="nyx-btn nyx-btn-glow">✦ Glow</button><button class="nyx-btn nyx-btn-icon nyx-btn-primary" aria-label="add">+</button></div>' },
        { title: 'Sizes & states', demo: '<div class="nyx-flex nyx-wrap nyx-gap-3 nyx-items-center"><button class="nyx-btn nyx-btn-primary nyx-btn-sm">Small</button><button class="nyx-btn nyx-btn-primary">Default</button><button class="nyx-btn nyx-btn-primary nyx-btn-lg">Large</button><button class="nyx-btn nyx-btn-primary nyx-btn-loading">Loading</button><button class="nyx-btn nyx-btn-primary" disabled>Disabled</button></div>' },
        { title: 'Outline & group', demo: '<div class="nyx-flex nyx-wrap nyx-gap-3 nyx-items-center"><button class="nyx-btn nyx-btn-outline-primary">Primary</button><button class="nyx-btn nyx-btn-outline-success">Success</button><button class="nyx-btn nyx-btn-outline-danger">Danger</button><button class="nyx-btn nyx-btn-outline-warning">Warning</button><span class="nyx-btn-group"><button class="nyx-btn nyx-btn-glass">One</button><button class="nyx-btn nyx-btn-glass">Two</button><button class="nyx-btn nyx-btn-glass">Three</button></span></div>' }
      ],
      classes: [
        ['nyx-btn', 'Base button.'],
        ['nyx-btn-primary / -secondary / -ghost / -danger / -glass / -glow', 'Variants.'],
        ['nyx-btn-outline-primary / -success / -danger / -warning', 'Outline variants.'],
        ['nyx-btn-icon', 'Square icon-only button.'],
        ['nyx-btn-sm / nyx-btn-lg', 'Sizes.'],
        ['nyx-btn-group / nyx-btn-block', 'Segmented group / full-width button.'],
        ['nyx-btn-loading', 'Replaces label with a spinner.']
      ]
    },
    {
      id: 'cards', group: 'Components', title: 'Cards',
      summary: 'Surfaces with depth — frosted glass, gradient accents, an interactive lift, plus SaaS stat and feature layouts.',
      sections: [
        { title: 'Variants', demo: '<div class="nyx-grid"><div class="nyx-col-4"><div class="nyx-card-gradient"><h4 class="nyx-h4">Gradient</h4><p class="nyx-caption">Accent bar on top.</p></div></div><div class="nyx-col-4"><div class="nyx-card-glass"><h4 class="nyx-h4">Glass</h4><p class="nyx-caption">Frosted blur.</p></div></div><div class="nyx-col-4"><div class="nyx-card nyx-card-interactive"><h4 class="nyx-h4">Interactive</h4><p class="nyx-caption">Hover to lift + glow.</p></div></div></div>' },
        { title: 'Stat & feature', demo: '<div class="nyx-grid"><div class="nyx-col-6"><div class="nyx-card-stat"><span class="nyx-stat-label">Monthly Revenue</span><span class="nyx-stat-num nyx-gradient-text">$48.2k</span><span class="nyx-badge nyx-badge-success">▲ 12.4%</span></div></div><div class="nyx-col-6"><div class="nyx-card-feature"><span class="nyx-feat-icon">⚡</span><h4 class="nyx-h4">Fast by default</h4><p class="nyx-caption">Zero-dependency delivery.</p></div></div></div>' }
      ],
      classes: [
        ['nyx-card', 'Base surface card.'],
        ['nyx-card-glass / -gradient / -interactive', 'Variants.'],
        ['nyx-card-stat', 'Metric card (.nyx-stat-num, .nyx-stat-label).'],
        ['nyx-card-feature', 'Icon + title + text (.nyx-feat-icon).']
      ]
    },
    {
      id: 'badges', group: 'Components', title: 'Badges',
      summary: 'Pill badges in five intents, plus a pulsing live-indicator dot variant.',
      sections: [
        { title: 'Intents', demo: '<div class="nyx-flex nyx-wrap nyx-gap-3 nyx-items-center"><span class="nyx-badge">default</span><span class="nyx-badge nyx-badge-success">success</span><span class="nyx-badge nyx-badge-danger">danger</span><span class="nyx-badge nyx-badge-warning">warning</span><span class="nyx-badge nyx-badge-info">info</span><span class="nyx-badge-dot">Live · 312 online</span></div>' }
      ],
      classes: [['nyx-badge', 'Base pill.'], ['nyx-badge-success/-danger/-warning/-info', 'Intents.'], ['nyx-badge-dot', 'Pulsing dot + label.']]
    },
    {
      id: 'alerts', group: 'Components', title: 'Alerts',
      summary: 'Banner messages with an intent-colored left edge and an icon slot.',
      sections: [
        { title: 'Intents', demo: '<div class="nyx-stack" style="gap:8px"><div class="nyx-alert nyx-alert-info"><span class="nyx-alert-icon">ℹ️</span><div><strong>Heads up.</strong> A new version is available.</div></div><div class="nyx-alert nyx-alert-success"><span class="nyx-alert-icon">✅</span><div><strong>Saved.</strong> Your changes are live.</div></div><div class="nyx-alert nyx-alert-danger"><span class="nyx-alert-icon">⛔</span><div><strong>Error.</strong> Payment could not be processed.</div></div></div>' }
      ],
      classes: [['nyx-alert', 'Base banner.'], ['nyx-alert-info/-success/-warning/-danger', 'Intent edge color.'], ['nyx-alert-icon', 'Leading icon.']]
    },
    {
      id: 'toasts', group: 'Components', title: 'Toasts',
      summary: 'Notifications that auto-dismiss, fired imperatively. Pass an options object for a title, an action button (e.g. Undo), a ✕ close, persistent (no auto-dismiss), or a corner position.',
      sections: [
        { title: 'Try it', demo: '<div class="nyx-flex nyx-gap-3 nyx-wrap"><button class="nyx-btn nyx-btn-glass" data-demo="toast:success">Success</button><button class="nyx-btn nyx-btn-glass" data-demo="toast:danger">Danger</button><button class="nyx-btn nyx-btn-glass" data-demo="toast:info">Info</button></div>', code: "Nyx.toast('Profile updated', 'success');\nNyx.toast('Connection lost', 'danger', 5000);", lang: 'js' }
      ],
      js: [['Nyx.toast(msg, type, ms)', 'type: info | success | warning | danger. Default ms 3200.'], ['Nyx.toast(msg, opts)', 'opts: { title, type, action:{label,onClick}, dismissible, persistent, position, icon, duration }. position: top/bottom + -left/-right/-center.']]
    },
    {
      id: 'progress', group: 'Components', title: 'Progress & Skeleton',
      summary: 'A gradient-filled progress bar and an animated shimmer placeholder for loading states.',
      sections: [
        { title: 'Progress', demo: '<div class="nyx-progress" role="progressbar" aria-valuenow="68" aria-valuemin="0" aria-valuemax="100"><span style="width:68%"></span></div>' },
        { title: 'Skeleton', demo: '<div class="nyx-flex nyx-gap-3 nyx-wrap"><div class="nyx-skeleton" style="width:48px;height:48px;border-radius:50%"></div><div class="nyx-stack nyx-grow" style="gap:8px"><div class="nyx-skeleton" style="height:12px;width:60%"></div><div class="nyx-skeleton" style="height:12px;width:40%"></div></div></div>' }
      ],
      classes: [['nyx-progress', 'Track; inner <span> with width is the fill.'], ['nyx-skeleton', 'Shimmer placeholder — size it inline.']]
    },
    {
      id: 'status-bar', group: 'Components', title: 'Status bar',
      summary: 'A multi-step progress indicator for onboarding and checkout flows, à la Stripe.',
      sections: [
        { title: 'Steps', demo: '<div class="nyx-status-bar"><div class="nyx-step done"><span class="nyx-step-dot">✓</span><span>Account</span></div><div class="nyx-step done"><span class="nyx-step-dot">✓</span><span>Profile</span></div><div class="nyx-step current"><span class="nyx-step-dot">3</span><span>Billing</span></div><div class="nyx-step"><span class="nyx-step-dot">4</span><span>Done</span></div></div>' }
      ],
      classes: [['nyx-status-bar', 'Even flex row; auto-draws connectors between steps.'], ['nyx-step (+ .done / .current)', 'A step: dot + label, with state.'], ['nyx-step-dot', 'The numbered or checked circle.']]
    },
    {
      id: 'navbar', group: 'Components', title: 'Navbar',
      summary: 'A sticky top navigation bar with a glass-blur background.',
      sections: [
        { title: 'Basic', demo: '<div class="nyx-navbar" style="position:static;border-radius:12px"><div class="docs-logo"><span class="mark">N</span> Nyx</div><div class="nyx-flex nyx-gap-3"><button class="nyx-btn nyx-btn-ghost nyx-btn-sm">Docs</button><button class="nyx-btn nyx-btn-primary nyx-btn-sm">Sign in</button></div></div>' },
        { title: 'Sticky & Shrinking', text: 'Add class `nyx-navbar-sticky` to make the navbar sticky, shrink dynamically upon page scroll, and glow at its bottom border.', demo: '<div class="nyx-navbar nyx-navbar-sticky scrolled" style="position:static;border-radius:12px"><div class="docs-logo"><span class="mark">N</span> Nyx</div><div class="nyx-flex nyx-gap-3"><button class="nyx-btn nyx-btn-ghost nyx-btn-sm">Docs</button><button class="nyx-btn nyx-btn-primary nyx-btn-sm">Sign in</button></div></div>' }
      ],
      classes: [['nyx-navbar', 'Sticky, blurred, bordered top bar.'], ['nyx-navbar-sticky', 'Sticky navbar that shrinks and glows when page is scrolled.'], ['scrolled', 'State class applied programmatically when scroll position exceeds 40px.']]
    },
    {
      id: 'sidebar', group: 'Components', title: 'Sidebar',
      summary: 'A vertical navigation list with hover and active states; pair with data-nyx-spy for scroll tracking.',
      sections: [
        { title: 'Basic', demo: '<nav class="nyx-sidebar" style="max-width:220px"><a class="active" href="#/sidebar">Overview</a><a href="#/sidebar">Members</a><a href="#/sidebar">Billing</a><a href="#/sidebar">Settings</a></nav>' }
      ],
      classes: [['nyx-sidebar', 'Vertical nav wrapper.'], ['a.active', 'Active item (violet edge).']]
    },
    {
      id: 'breadcrumb', group: 'Components', title: 'Breadcrumb',
      summary: 'A compact trail showing the current location in a hierarchy.',
      sections: [
        { title: 'Basic', demo: '<nav class="nyx-breadcrumb"><a href="#/breadcrumb">Home</a><span class="nyx-sep">/</span><a href="#/breadcrumb">Components</a><span class="nyx-sep">/</span><span aria-current="page">Breadcrumb</span></nav>' }
      ],
      classes: [['nyx-breadcrumb', 'Trail wrapper.'], ['nyx-sep', 'Separator glyph.']]
    },
    {
      id: 'tabs', group: 'Components', title: 'Tabs', needsJs: true,
      summary: 'Underline tabs with a glowing indicator. Add data-nyx-tabs to the wrapper — the runtime handles switching, arrow-key roving focus, and (with data-hash) deep-links the active tab to the URL #hash.',
      sections: [
        { title: 'Switchable', demo: '<div><div class="nyx-tabs" data-nyx-tabs><button class="nyx-tab active" data-nyx-tab="a">Overview</button><button class="nyx-tab" data-nyx-tab="b">Usage</button><button class="nyx-tab" data-nyx-tab="c">API</button></div><div class="nyx-tab-panel active" data-nyx-panel="a">Overview panel.</div><div class="nyx-tab-panel" data-nyx-panel="b">Usage panel.</div><div class="nyx-tab-panel" data-nyx-panel="c">API panel.</div></div>' },
        { title: 'JavaScript Events', text: 'Listen for active tab changes on the panel elements.', lang: 'js', code: 'document.addEventListener(\'nyx:tab-show\', (e) => {\n  console.log(\'Active tab:\', e.detail.tab);\n  console.log(\'Active panel:\', e.detail.panel);\n});' }
      ],
      classes: [['data-nyx-tabs', 'Wrapper that activates switching.'], ['nyx-tab + data-nyx-tab', 'A tab button → key.'], ['nyx-tab-panel + data-nyx-panel', 'Panel for a key.']],
      js: [
        ['Tab click', 'Programmatic tab activation by executing click() on any [data-nyx-tab] button element.'],
        ['Event: nyx:tab-show', 'Dispatched on the shown .nyx-tab-panel. detail: { tab, panel }']
      ]
    },
    {
      id: 'pagination', group: 'Components', title: 'Pagination',
      summary: 'Numbered page controls with a glowing active page.',
      sections: [
        { title: 'Basic', demo: '<div class="nyx-pagination"><button>‹</button><button class="active">1</button><button>2</button><button>3</button><span class="nyx-page-gap">…</span><button>12</button><button>›</button></div>' },
        { title: 'Rounded', demo: '<div class="nyx-pagination rounded"><button>‹</button><button class="active">1</button><button>2</button><button>3</button><button>›</button></div>' },
        { title: 'Ghost', demo: '<div class="nyx-pagination ghost"><button>‹</button><button class="active">1</button><button>2</button><button>3</button><button>›</button></div>' },
        { title: 'Compact + page info', demo: '<div class="nyx-flex nyx-items-center nyx-gap-4 nyx-wrap"><div class="nyx-pagination sm"><button>‹</button><button class="active">1</button><button>2</button><button>3</button><button>›</button></div><span class="nyx-pagination-info">Page 1 of 12</span></div>' }
      ],
      classes: [['nyx-pagination', 'Wrapper around <button> pages.'], ['button.active / :disabled', 'Current / disabled page.'], ['.rounded / .ghost / .sm', 'Pill, borderless and compact variants.'], ['nyx-page-gap / nyx-pagination-info', 'Ellipsis gap and a “page X of Y” label.']]
    },
    {
      id: 'command-palette', group: 'Components', title: 'Command palette', needsJs: true,
      summary: 'A fullscreen ⌘K search overlay. Trigger it with a data attribute or the keyboard; items can jump to targets.',
      sections: [
        { title: 'Open it', demo: '<button class="nyx-btn nyx-btn-secondary" data-nyx-toggle="command">Open ⌘K palette</button>', code: '<button data-nyx-toggle="command">Open</button>\n\n<div class="nyx-command-palette" id="commandPalette">\n  <div class="nyx-cp-box"> … items with data-nyx-target … </div>\n</div>' },
        { title: 'Via JavaScript', text: 'Manage the command palette state programmatically or listen for show/hide events.', lang: 'js', code: '// Open palette\nNyx.openCommandPalette();\n\n// Close palette\nNyx.closeCommandPalette();\n\n// Listen for events\nconst cp = document.querySelector(\'.nyx-command-palette\');\nif (cp) {\n  cp.addEventListener(\'nyx:palette-show\', () => console.log(\'Command palette opened\'));\n  cp.addEventListener(\'nyx:palette-hide\', () => console.log(\'Command palette closed\'));\n}' }
      ],
      classes: [['nyx-command-palette', 'Fullscreen overlay (one per page).'], ['data-nyx-toggle="command"', 'Open trigger (⌘K also works).'], ['nyx-cp-item + data-nyx-target', 'Result row → scrolls to target.']],
      js: [
        ['Nyx.openCommandPalette()', 'Open the command palette.'],
        ['Nyx.closeCommandPalette()', 'Close the command palette.'],
        ['Event: nyx:palette-show', 'Dispatched when the palette opens.'],
        ['Event: nyx:palette-hide', 'Dispatched when the palette closes.']
      ]
    },
    {
      id: 'tables', group: 'Components', title: 'Tables & Data',
      summary: 'A styled table with hover rows, a click-to-sort variant, a dense spreadsheet-like grid, and a KPI row.',
      sections: [
        { title: 'Sortable table', text: 'Add nyx-table-sortable and click any header — the runtime sorts numerically or alphabetically.', demo: '<table class="nyx-table nyx-table-sortable"><thead><tr><th>User</th><th>Plan</th><th>MRR</th></tr></thead><tbody><tr><td>Ava Chen</td><td>Pro</td><td>$49</td></tr><tr><td>Liam Patel</td><td>Enterprise</td><td>$499</td></tr><tr><td>Noah Kim</td><td>Starter</td><td>$0</td></tr></tbody></table>' },
        { title: 'Striped · bordered · compact', demo: '<table class="nyx-table striped bordered compact"><thead><tr><th>User</th><th>Plan</th><th>MRR</th></tr></thead><tbody><tr><td>Ava Chen</td><td>Pro</td><td>$49</td></tr><tr><td>Liam Patel</td><td>Enterprise</td><td>$499</td></tr><tr class="selected"><td>Noah Kim</td><td>Starter</td><td>$0</td></tr></tbody></table>' },
        { title: 'Responsive (scroll)', demo: '<div class="nyx-table-wrap"><table class="nyx-table"><thead><tr><th>User</th><th>Plan</th><th>Seats</th><th>MRR</th><th>Status</th></tr></thead><tbody><tr><td>Ava Chen</td><td>Pro</td><td>12</td><td>$49</td><td><span class="nyx-badge nyx-badge-success">Active</span></td></tr><tr><td>Liam Patel</td><td>Enterprise</td><td>240</td><td>$499</td><td><span class="nyx-badge nyx-badge-success">Active</span></td></tr></tbody></table></div>' },
        { title: 'KPI row', demo: '<div class="nyx-kpi-row"><div class="nyx-card-stat"><span class="nyx-stat-label">MRR</span><span class="nyx-stat-num">$48.2k</span><span class="nyx-badge nyx-badge-success">▲ 12%</span></div><div class="nyx-card-stat"><span class="nyx-stat-label">Churn</span><span class="nyx-stat-num">1.8%</span><span class="nyx-badge nyx-badge-success">▼ 0.3%</span></div><div class="nyx-card-stat"><span class="nyx-stat-label">Signups</span><span class="nyx-stat-num">1,204</span><span class="nyx-badge nyx-badge-warning">flat</span></div><div class="nyx-card-stat"><span class="nyx-stat-label">NPS</span><span class="nyx-stat-num">72</span><span class="nyx-badge nyx-badge-success">▲ 5</span></div></div>' }
      ],
      classes: [['nyx-table', 'Styled table.'], ['.striped / .bordered / .compact / .borderless', 'Row stripes, cell borders, dense padding, no borders.'], ['tr.selected', 'Highlighted row.'], ['nyx-table-sortable', 'Click-to-sort headers (runtime).'], ['nyx-table-wrap', 'Scroll container for wide tables.'], ['nyx-kpi-row', '4-up responsive stat grid.']]
    },
    {
      id: 'modal', group: 'Components', title: 'Modal', needsJs: true,
      summary: 'A centered dialog over a blurred backdrop. Open/close declaratively; Esc and backdrop-click dismiss.',
      sections: [
        { title: 'Open it', demo: '<button class="nyx-btn nyx-btn-primary" data-nyx-toggle="modal" data-nyx-target="#docModal">Open modal</button>', code: '<button data-nyx-toggle="modal" data-nyx-target="#m">Open</button>\n\n<div class="nyx-modal" id="m">\n  <div class="nyx-modal-box">\n    … <button data-nyx-dismiss>Close</button>\n  </div>\n</div>' },
        { title: 'Via JavaScript', text: 'Open/close modals programmatically or hook into their show and hide events.', lang: 'js', code: '// Open a modal\nNyx.openModal(\'#myModal\');\n\n// Close a modal\nNyx.close(\'#myModal\');\n\n// Close all open overlays\nNyx.closeAll();\n\n// Listen for events\nconst m = document.getElementById(\'myModal\');\nm.addEventListener(\'nyx:modal-show\', () => console.log(\'Modal shown\'));\nm.addEventListener(\'nyx:modal-hide\', () => console.log(\'Modal hidden\'));' }
      ],
      classes: [['nyx-modal', 'Dialog wrapper (place at end of <body>).'], ['nyx-modal-box', 'The panel.'], ['data-nyx-toggle="modal" / data-nyx-dismiss', 'Open / close triggers.']],
      js: [
        ['Nyx.openModal(target)', 'Open a modal by selector or element.'],
        ['Nyx.close(target)', 'Close a modal by selector or element.'],
        ['Nyx.closeAll()', 'Close all active overlays.'],
        ['Event: nyx:modal-show', 'Dispatched when the modal opens.'],
        ['Event: nyx:modal-hide', 'Dispatched when the modal closes.']
      ]
    },
    {
      id: 'drawer', group: 'Components', title: 'Drawer', needsJs: true,
      summary: 'A right-side slide-in panel sharing the modal backdrop and dismiss mechanics.',
      sections: [
        { title: 'Open it', demo: '<div class="nyx-flex nyx-gap-3 nyx-wrap"><button class="nyx-btn nyx-btn-secondary" data-nyx-toggle="drawer" data-nyx-target="#docDrawer">From the end</button><button class="nyx-btn nyx-btn-glass" data-nyx-toggle="drawer" data-nyx-target="#docDrawerLeft">From the start</button></div>', code: '<button data-nyx-toggle="drawer" data-nyx-target="#d">Open</button>\n\n<aside class="nyx-drawer" id="d"> … </aside>\n<aside class="nyx-drawer nyx-drawer-left" id="d2"> … </aside>' },
        { title: 'Via JavaScript', text: 'Interact with drawers programmatically or handle show and hide transitions.', lang: 'js', code: '// Open a drawer\nNyx.openDrawer(\'#myDrawer\');\n\n// Close a drawer\nNyx.close(\'#myDrawer\');\n\n// Listen for events\nconst d = document.getElementById(\'myDrawer\');\nd.addEventListener(\'nyx:drawer-show\', () => console.log(\'Drawer shown\'));\nd.addEventListener(\'nyx:drawer-hide\', () => console.log(\'Drawer hidden\'));' }
      ],
      classes: [['nyx-drawer', 'Slide-in panel (from the end edge).'], ['nyx-drawer-left', 'Slide-in from the start edge (offcanvas).'], ['data-nyx-toggle="drawer"', 'Open trigger.']],
      js: [
        ['Nyx.openDrawer(target)', 'Open a drawer panel by selector or element.'],
        ['Nyx.close(target)', 'Close a drawer panel by selector or element.'],
        ['Event: nyx:drawer-show', 'Dispatched when the drawer opens.'],
        ['Event: nyx:drawer-hide', 'Dispatched when the drawer closes.']
      ]
    },
    {
      id: 'tooltips', group: 'Components', title: 'Tooltips',
      summary: 'CSS-only hover tooltips on any of four sides — no JavaScript.',
      sections: [
        { title: 'Four sides', demo: '<div class="nyx-flex nyx-gap-4 nyx-wrap"><span class="nyx-tooltip"><button class="nyx-btn nyx-btn-glass">Top</button><span class="nyx-tip top">Tooltip on top</span></span><span class="nyx-tooltip"><button class="nyx-btn nyx-btn-glass">Right</button><span class="nyx-tip right">On the right</span></span><span class="nyx-tooltip"><button class="nyx-btn nyx-btn-glass">Bottom</button><span class="nyx-tip bottom">Below</span></span><span class="nyx-tooltip"><button class="nyx-btn nyx-btn-glass">Left</button><span class="nyx-tip left">On the left</span></span></div>' }
      ],
      classes: [['nyx-tooltip', 'Hover target wrapper.'], ['nyx-tip top/right/bottom/left', 'Tooltip + placement.']]
    },
    {
      id: 'popovers', group: 'Components', title: 'Popovers', needsJs: true,
      summary: 'A click-toggled floating panel with an arrow, for richer content than a tooltip.',
      sections: [
        { title: 'Toggle', demo: '<span class="nyx-popover"><button class="nyx-btn nyx-btn-glass" data-nyx-toggle="popover">Popover</button><span class="nyx-pop"><strong>Title</strong><p class="nyx-caption" style="margin-top:6px">Rich floating content with an arrow.</p></span></span>' },
        { title: 'Via JavaScript', text: 'Toggle popovers programmatically or listen for show/hide events.', lang: 'js', code: '// Toggle a popover\nNyx.togglePopover(\'#myPopover\');\n\n// Listen for events\nconst p = document.querySelector(\'.nyx-popover\');\np.addEventListener(\'nyx:popover-show\', () => console.log(\'Popover shown\'));\np.addEventListener(\'nyx:popover-hide\', () => console.log(\'Popover hidden\'));' }
      ],
      classes: [['nyx-popover', 'Wrapper.'], ['nyx-pop', 'The floating panel.'], ['data-nyx-toggle="popover"', 'Toggle trigger.']],
      js: [
        ['Nyx.togglePopover(node, forceState)', 'Toggle a popover. Optionally pass a boolean to force show/hide.'],
        ['Event: nyx:popover-show', 'Dispatched when the popover opens.'],
        ['Event: nyx:popover-hide', 'Dispatched when the popover closes.']
      ]
    },

    {
      id: 'button-group', group: 'Components', title: 'Button group', added: 'v1.0',
      summary: 'Group related buttons into a single segmented control with shared, seamless edges.',
      sections: [{ title: 'Grouped', demo: '<div class="nyx-btn-group"><button class="nyx-btn nyx-btn-glass">Left</button><button class="nyx-btn nyx-btn-glass">Center</button><button class="nyx-btn nyx-btn-glass">Right</button></div>' }],
      classes: [['nyx-btn-group', 'Flex wrapper that fuses child .nyx-btn edges.']]
    },
    {
      id: 'dropdown', group: 'Components', title: 'Dropdown', added: 'v1.0', needsJs: true,
      summary: 'A toggleable menu of actions. Opens on click; closes on outside-click or Esc.',
      sections: [
        { title: 'Menu', demo: '<div class="nyx-dropdown"><button class="nyx-btn nyx-btn-primary" data-nyx-toggle="dropdown">Actions ▾</button><div class="nyx-dropdown-menu"><button class="nyx-dropdown-item">✏️ Edit</button><button class="nyx-dropdown-item">📋 Duplicate</button><div class="nyx-dropdown-divider"></div><button class="nyx-dropdown-item">🗑️ Delete</button></div></div>' },
        { title: 'JavaScript Events', text: 'Listen for dropdown open and close events on the dropdown wrapper.', lang: 'js', code: 'const dd = document.querySelector(\'.nyx-dropdown\');\ndd.addEventListener(\'nyx:dropdown-show\', () => console.log(\'Dropdown opened\'));\ndd.addEventListener(\'nyx:dropdown-hide\', () => console.log(\'Dropdown closed\'));' }
      ],
      classes: [['nyx-dropdown', 'Wrapper.'], ['data-nyx-toggle="dropdown"', 'Toggle trigger.'], ['nyx-dropdown-menu / -item / -divider', 'Menu, item, separator.']]
    },
    {
      id: 'accordion', group: 'Components', title: 'Accordion', added: 'v1.0', needsJs: true,
      summary: 'Stacked collapsible panels. data-nyx-accordion keeps one open at a time; add data-multi to allow several open, and data-open="0" (index or comma-list) to expand panels on load.',
      sections: [{ title: 'Single-open', demo: '<div class="nyx-accordion" data-nyx-accordion><div class="nyx-accordion-item"><button class="nyx-accordion-head active" data-nyx-toggle="collapse" data-nyx-target="#ac1">What is Nyx?</button><div class="nyx-collapse open" id="ac1"><div class="nyx-accordion-body">A dark-mode-native component framework with Luminous Depth.</div></div></div><div class="nyx-accordion-item"><button class="nyx-accordion-head" data-nyx-toggle="collapse" data-nyx-target="#ac2">Does it support RTL?</button><div class="nyx-collapse" id="ac2"><div class="nyx-accordion-body">Yes — set dir="rtl" on the html element and everything mirrors.</div></div></div></div>' }],
      classes: [['nyx-accordion + data-nyx-accordion', 'Single-open wrapper.'], ['nyx-accordion-head', 'Toggle (uses data-nyx-toggle="collapse").'], ['nyx-collapse / nyx-accordion-body', 'Animated panel + content.']]
    },
    {
      id: 'collapse', group: 'Components', title: 'Collapse', added: 'v1.0', needsJs: true,
      summary: 'Toggle the visibility of any region with a smooth height transition.',
      sections: [
        { title: 'Toggle', demo: '<button class="nyx-btn nyx-btn-secondary" data-nyx-toggle="collapse" data-nyx-target="#col1">Toggle content</button><div class="nyx-collapse" id="col1"><div class="nyx-card" style="margin-top:12px">Now you see me. This region animates its height open and closed.</div></div>' },
        { title: 'JavaScript Events', text: 'Listen for collapse transitions on the collapsible element.', lang: 'js', code: 'const c = document.getElementById(\'col1\');\nc.addEventListener(\'nyx:collapse-show\', () => console.log(\'Collapse shown\'));\nc.addEventListener(\'nyx:collapse-hide\', () => console.log(\'Collapse hidden\'));' }
      ],
      classes: [['data-nyx-toggle="collapse" + data-nyx-target', 'Trigger → target.'], ['nyx-collapse', 'Animatable region (toggles .open).']]
    },
    {
      id: 'list-group', group: 'Components', title: 'List group', added: 'v1.0',
      summary: 'A flush, bordered list of items — static, linked, or with an active state and trailing badges.',
      sections: [{ title: 'Items', demo: '<div class="nyx-list-group"><div class="nyx-list-item active">Dashboard <span class="nyx-badge nyx-badge-info">12</span></div><div class="nyx-list-item">Projects <span class="nyx-badge">4</span></div><div class="nyx-list-item">Team <span class="nyx-badge">8</span></div><div class="nyx-list-item">Settings</div></div>' }],
      classes: [['nyx-list-group', 'List wrapper.'], ['nyx-list-item', 'Row (add .active; use on <a> for hover).']]
    },
    {
      id: 'spinner', group: 'Components', title: 'Spinner', added: 'v1.0',
      summary: 'Indeterminate loading indicators — a border ring in three sizes plus a bouncing-dots variant.',
      sections: [{ title: 'Variants', demo: '<div class="nyx-flex nyx-gap-5 nyx-items-center"><span class="nyx-spinner nyx-spinner-sm"></span><span class="nyx-spinner"></span><span class="nyx-spinner nyx-spinner-lg"></span><span class="nyx-spinner-dots"><span></span><span></span><span></span></span></div>' }],
      classes: [['nyx-spinner', 'Ring spinner.'], ['nyx-spinner-sm / -lg', 'Sizes.'], ['nyx-spinner-dots', 'Bouncing-dots spinner (3 inner spans).']]
    },
    {
      id: 'close-button', group: 'Components', title: 'Close button', added: 'v1.0',
      summary: 'A standardized dismiss affordance for cards, alerts, modals and toasts.',
      sections: [{ title: 'Default', demo: '<div class="nyx-flex nyx-items-center nyx-gap-3"><button class="nyx-close" aria-label="Close">✕</button><span class="nyx-caption">A consistent dismiss control.</span></div>' }],
      classes: [['nyx-close', 'Square close button (pair with data-nyx-dismiss in overlays).']]
    },
    {
      id: 'carousel', group: 'Components', title: 'Carousel', added: 'v1.0', needsJs: true,
      summary: 'A slideshow with prev/next controls and clickable dots — plus arrow-key and swipe/touch nav out of the box. Add data-autoplay (with data-interval, and pause-on-hover) to cycle automatically.',
      sections: [
        { title: 'Slides', demo: '<div class="nyx-carousel" data-nyx-carousel><div class="nyx-slide active"><div class="nyx-spotlight" style="padding:44px 24px"><h3 class="nyx-h2">Slide one</h3></div></div><div class="nyx-slide"><div class="nyx-spotlight" style="padding:44px 24px"><h3 class="nyx-h2 nyx-gradient-text">Slide two</h3></div></div><div class="nyx-slide"><div class="nyx-spotlight" style="padding:44px 24px"><h3 class="nyx-h2">Slide three</h3></div></div><button class="nyx-btn nyx-btn-icon nyx-btn-glass nyx-carousel-ctrl prev" data-nyx-slide="prev" aria-label="Previous">‹</button><button class="nyx-btn nyx-btn-icon nyx-btn-glass nyx-carousel-ctrl next" data-nyx-slide="next" aria-label="Next">›</button><div class="nyx-carousel-dots"><button class="active" data-nyx-slide-to="0" aria-label="Slide 1"></button><button data-nyx-slide-to="1" aria-label="Slide 2"></button><button data-nyx-slide-to="2" aria-label="Slide 3"></button></div></div>' },
        { title: 'Flat, with caption', demo: '<div class="nyx-carousel flat" data-nyx-carousel><div class="nyx-slide active"><div style="position:relative;min-height:150px;background:linear-gradient(120deg,var(--nyx-accent),var(--nyx-accent-2))"><div class="nyx-carousel-caption"><h4 class="nyx-h4">Mountains</h4><p class="nyx-caption">A caption band over the slide.</p></div></div></div><div class="nyx-slide"><div style="position:relative;min-height:150px;background:linear-gradient(120deg,var(--nyx-accent-2),var(--nyx-accent))"><div class="nyx-carousel-caption"><h4 class="nyx-h4">Ocean</h4><p class="nyx-caption">Add .flat to drop the outer frame.</p></div></div></div><button class="nyx-btn nyx-btn-icon nyx-btn-glass nyx-carousel-ctrl prev" data-nyx-slide="prev" aria-label="Previous">‹</button><button class="nyx-btn nyx-btn-icon nyx-btn-glass nyx-carousel-ctrl next" data-nyx-slide="next" aria-label="Next">›</button></div>' },
        { title: 'JavaScript Events', text: 'Listen for slide transitions on the carousel element.', lang: 'js', code: 'const c = document.querySelector(\'.nyx-carousel\');\nc.addEventListener(\'nyx:slide\', (e) => {\n  console.log(\'Active slide index:\', e.detail.index);\n  console.log(\'Previous slide index:\', e.detail.from);\n});' }
      ],
      classes: [['nyx-carousel (+ .flat / .fade)', 'Slideshow wrapper; .flat drops the border, .fade cross-fades slides.'], ['nyx-slide', 'A slide (one has .active).'], ['nyx-carousel-caption', 'Optional gradient caption band over a slide.'], ['data-nyx-slide / data-nyx-slide-to', 'Prev/next controls and indicator dots.']],
      js: [
        ['Event: nyx:slide', 'Dispatched on the carousel element when slide changes. detail: { index, from }']
      ]
    },
    {
      id: 'nav-pills', group: 'Components', title: 'Nav pills', added: 'v1.0',
      summary: 'A pill-style nav that drives panels using the same data-nyx-tabs mechanism as tabs.',
      sections: [
        { title: 'Pills', demo: '<div><div class="nyx-nav-pills" data-nyx-tabs><button class="nyx-pill active" data-nyx-tab="p1">All</button><button class="nyx-pill" data-nyx-tab="p2">Active</button><button class="nyx-pill" data-nyx-tab="p3">Archived</button></div><div class="nyx-tab-panel active" data-nyx-panel="p1" style="padding-top:16px">All items.</div><div class="nyx-tab-panel" data-nyx-panel="p2" style="padding-top:16px">Active items.</div><div class="nyx-tab-panel" data-nyx-panel="p3" style="padding-top:16px">Archived items.</div></div>' },
        { title: 'Sliding Nav Indicator', text: 'Add `data-nyx-slider-nav` to enable a glassmorphic sliding background highlights capsule that follows hover/click.', demo: '<div><div class="nyx-nav-pills" data-nyx-tabs data-nyx-slider-nav=".nyx-pill"><button class="nyx-pill active" data-nyx-tab="ps1">All</button><button class="nyx-pill" data-nyx-tab="ps2">Active</button><button class="nyx-pill" data-nyx-tab="ps3">Archived</button></div><div class="nyx-tab-panel active" data-nyx-panel="ps1" style="padding-top:16px">All items with sliding.</div><div class="nyx-tab-panel" data-nyx-panel="ps2" style="padding-top:16px">Active items with sliding.</div><div class="nyx-tab-panel" data-nyx-panel="ps3" style="padding-top:16px">Archived items with sliding.</div></div>' }
      ],
      classes: [['nyx-nav-pills + data-nyx-tabs', 'Pill nav wrapper.'], ['nyx-pill + data-nyx-tab', 'A pill → panel key.'], ['data-nyx-slider-nav', 'Enables dynamic sliding pill indicator background.']]
    },
    {
      id: 'ratio', group: 'Helpers', title: 'Ratio', added: 'v1.0',
      summary: 'Maintain a responsive aspect ratio for embeds like video and maps.',
      sections: [{ title: '16:9', demo: '<div class="nyx-ratio" style="max-width:360px"><div style="background:linear-gradient(120deg,var(--nyx-accent),var(--nyx-accent-2));display:grid;place-items:center;color:#fff;font-family:var(--nyx-font-display);font-weight:700">16 : 9</div></div>' }],
      classes: [['nyx-ratio', 'Default 16:9 box.'], ['nyx-ratio-1x1 / -4x3', 'Other ratios.']]
    },

    {
      id: 'split-button', group: 'Components', title: 'Split button', added: 'v1.0',
      summary: 'A primary action fused with a dropdown caret for secondary actions.',
      sections: [{ title: 'Split', demo: '<div class="nyx-btn-split"><button class="nyx-btn nyx-btn-primary">Save</button><div class="nyx-dropdown"><button class="nyx-btn nyx-btn-primary" data-nyx-toggle="dropdown" aria-label="more options">▾</button><div class="nyx-dropdown-menu"><button class="nyx-dropdown-item">Save as draft</button><button class="nyx-dropdown-item">Save &amp; publish</button></div></div></div>' }],
      classes: [['nyx-btn-split', 'Fuses a .nyx-btn with a .nyx-dropdown caret.']]
    },
    {
      id: 'toolbar', group: 'Components', title: 'Toolbar', added: 'v1.0',
      summary: 'A horizontal bar grouping actions, with separators between clusters.',
      sections: [{ title: 'Editor bar', demo: '<div class="nyx-toolbar"><button class="nyx-btn nyx-btn-icon nyx-btn-ghost" aria-label="bold"><strong>B</strong></button><button class="nyx-btn nyx-btn-icon nyx-btn-ghost" aria-label="italic"><em>I</em></button><span class="nyx-toolbar-sep"></span><button class="nyx-btn nyx-btn-icon nyx-btn-ghost" aria-label="link">🔗</button><button class="nyx-btn nyx-btn-icon nyx-btn-ghost" aria-label="image">🖼️</button><span class="nyx-toolbar-sep"></span><div class="nyx-btn-group"><button class="nyx-btn nyx-btn-glass nyx-btn-sm">Left</button><button class="nyx-btn nyx-btn-glass nyx-btn-sm">Center</button></div></div>' }],
      classes: [['nyx-toolbar', 'Action bar wrapper.'], ['nyx-toolbar-sep', 'Vertical separator.']]
    },
    {
      id: 'tree', group: 'Components', title: 'Tree view', added: 'v1.0',
      summary: 'A nested, collapsible hierarchy (files, categories). Built on the collapse behavior.',
      sections: [{ title: 'File tree', demo: '<div class="nyx-tree"><div class="nyx-tree-label active" data-nyx-toggle="collapse" data-nyx-target="#tr1">📁 src</div><div class="nyx-collapse open" id="tr1"><div class="nyx-tree-children"><div class="nyx-tree-leaf">📄 index.html</div><div class="nyx-tree-label" data-nyx-toggle="collapse" data-nyx-target="#tr2">📁 components</div><div class="nyx-collapse" id="tr2"><div class="nyx-tree-children"><div class="nyx-tree-leaf">📄 buttons.css</div><div class="nyx-tree-leaf">📄 cards.css</div></div></div></div></div></div>' }],
      classes: [['nyx-tree / nyx-tree-children', 'Tree wrapper / nested level.'], ['nyx-tree-label', 'Expandable node (data-nyx-toggle="collapse").'], ['nyx-tree-leaf', 'Leaf item.']]
    },
    {
      id: 'hierarchy', group: 'Components', title: 'Hierarchy', added: 'v1.0',
      summary: 'File / org hierarchies in two interactive layouts — a vertical indented tree you can expand/collapse, and a horizontal Finder-style column browser (Miller columns) you can drill through. Both wire up automatically and mirror in RTL.',
      sections: [
        {
          title: 'Vertical — click a folder to collapse', demo:
            '<div class="nyx-hierarchy"><ul>' +
            '<li><span class="nyx-hierarchy-node active"><span class="ico">📁</span> app <span class="meta">root</span></span><ul>' +
            '<li><span class="nyx-hierarchy-node"><span class="ico">📁</span> components</span><ul>' +
            '<li><span class="nyx-hierarchy-node"><span class="ico">📄</span> buttons.css <span class="meta">6kb</span></span></li>' +
            '<li><span class="nyx-hierarchy-node"><span class="ico">📄</span> cards.css <span class="meta">4kb</span></span></li>' +
            '</ul></li>' +
            '<li><span class="nyx-hierarchy-node"><span class="ico">📄</span> index.html</span></li>' +
            '<li><span class="nyx-hierarchy-node"><span class="ico">📄</span> nyx.css <span class="meta">65kb</span></span></li>' +
            '</ul></li></ul></div>'
        },
        {
          title: 'Horizontal — drill through the columns', demo:
            '<div class="nyx-hierarchy-cols">' +
            '<div class="nyx-hcol">' +
            '<span class="nyx-hitem active" data-nyx-hcol="#hcB">📁 app <span class="chev">›</span></span>' +
            '<span class="nyx-hitem" data-nyx-hcol="#hcDocs">📁 docs <span class="chev">›</span></span>' +
            '<span class="nyx-hitem">📄 readme.md</span></div>' +
            '<div class="nyx-hcol" id="hcB">' +
            '<span class="nyx-hitem active" data-nyx-hcol="#hcC">📁 components <span class="chev">›</span></span>' +
            '<span class="nyx-hitem">📄 index.html</span>' +
            '<span class="nyx-hitem">📄 nyx.css</span></div>' +
            '<div class="nyx-hcol" id="hcDocs" hidden>' +
            '<span class="nyx-hitem">📄 guide.md</span>' +
            '<span class="nyx-hitem">📄 api.md</span></div>' +
            '<div class="nyx-hcol" id="hcC">' +
            '<span class="nyx-hitem">📄 buttons.css</span>' +
            '<span class="nyx-hitem active">📄 cards.css</span>' +
            '<span class="nyx-hitem">📄 forms.css</span></div>' +
            '</div>'
        }
      ],
      classes: [
        ['nyx-hierarchy', 'Vertical tree wrapper (nested <ul>/<li>) — folders collapse on click.'],
        ['nyx-hierarchy-node', 'A tree row; .active highlights, .meta adds a trailing detail. Runtime adds a caret to rows with children.'],
        ['nyx-hierarchy-cols', 'Horizontal Miller-columns browser.'],
        ['nyx-hcol / nyx-hitem', 'A column / a selectable row (.chev for the arrow).'],
        ['data-nyx-hcol="#id"', 'On a row: selecting it reveals that column and hides deeper ones.']
      ]
    },
    {
      id: 'bottom-sheet', group: 'Components', title: 'Bottom sheet', added: 'v1.0', needsJs: true,
      summary: 'A panel that slides up from the bottom — the mobile-native alternative to a modal. Opens with data-nyx-toggle="sheet"; closes on backdrop, Esc, or data-nyx-dismiss.',
      sections: [
        { title: 'Open it', demo: '<button class="nyx-btn nyx-btn-primary" data-nyx-toggle="sheet" data-nyx-target="#docSheet">Open bottom sheet</button>' },
        { title: 'Via JavaScript', text: 'Open/close bottom sheets programmatically or listen for show/hide events.', lang: 'js', code: '// Open a sheet\nNyx.openModal(\'#mySheet\');\n\n// Close a sheet\nNyx.close(\'#mySheet\');\n\n// Listen for events\nconst s = document.getElementById(\'mySheet\');\ns.addEventListener(\'nyx:sheet-show\', () => console.log(\'Sheet shown\'));\ns.addEventListener(\'nyx:sheet-hide\', () => console.log(\'Sheet hidden\'));' }
      ],
      classes: [['nyx-sheet', 'The sheet panel (add a .nyx-sheet-grip handle).'], ['data-nyx-toggle="sheet"', 'Opens the targeted sheet (+ data-nyx-target).']],
      js: [
        ['Nyx.openModal(target)', 'Open a bottom sheet by selector or element.'],
        ['Nyx.close(target)', 'Close a bottom sheet by selector or element.'],
        ['Event: nyx:sheet-show', 'Dispatched when the sheet opens.'],
        ['Event: nyx:sheet-hide', 'Dispatched when the sheet closes.']
      ]
    },
    {
      id: 'fab', group: 'Components', title: 'FAB + speed dial', added: 'v1.0',
      summary: 'A floating action button that fans out a set of labelled actions on tap. Position it fixed in your app; here it is anchored inside the demo box.',
      sections: [
        { title: 'Tap to expand', demo: '<div style="position:relative;height:200px;border:1px dashed var(--nyx-border);border-radius:var(--nyx-radius-lg)"><div class="nyx-fab" style="position:absolute"><div class="nyx-fab-actions"><span class="nyx-fab-action"><span class="nyx-fab-label">Share</span><button class="nyx-fab-mini" aria-label="Share">↗</button></span><span class="nyx-fab-action"><span class="nyx-fab-label">Edit</span><button class="nyx-fab-mini" aria-label="Edit">✎</button></span><span class="nyx-fab-action"><span class="nyx-fab-label">New</span><button class="nyx-fab-mini" aria-label="New">＋</button></span></div><button class="nyx-fab-btn" aria-label="Actions">＋</button></div></div>' }
      ],
      classes: [['nyx-fab', 'Container (fixed by default).'], ['nyx-fab-btn', 'The main button; rotates when open.'], ['nyx-fab-actions / nyx-fab-action', 'Speed-dial list / one labelled action.']]
    },
    {
      id: 'back-to-top', group: 'Components', title: 'Back to top', added: 'v1.0', needsJs: true,
      summary: 'A button that appears after you scroll down and smooth-scrolls back to the top. Drop one anywhere; the runtime shows/hides it on scroll. (Shown inline here.)',
      sections: [
        { title: 'Button', demo: '<button class="nyx-to-top show" style="position:relative;inset:auto" aria-label="Back to top">↑</button>' }
      ],
      classes: [['nyx-to-top', 'Fixed button; runtime toggles .show past 320px scroll and scrolls to top on click.']]
    },
    {
      id: 'top-progress', group: 'Components', title: 'Top progress bar', added: 'v1.0', needsJs: true,
      summary: 'A thin page-load progress bar pinned to the top — NProgress-style. Drive it imperatively for route changes, fetches or uploads.',
      sections: [
        { title: 'Simulate a load', demo: '<button class="nyx-btn nyx-btn-secondary" onclick="Nyx.progress.start();setTimeout(function(){Nyx.progress.done()},1300)">Run progress</button>', lang: 'js', code: "Nyx.progress.start();   // trickles toward the top\n// …after your fetch / route change\nNyx.progress.done();    // fills to 100% and fades" }
      ],
      classes: [['Nyx.progress.start()', 'Show the bar and trickle forward.'], ['Nyx.progress.set(n)', 'Set the width to n%.'], ['Nyx.progress.done()', 'Complete and fade out.']],
      js: [
        ['Nyx.progress.start()', 'Show the progress bar and trickle forward.'],
        ['Nyx.progress.set(n)', 'Set the progress manually to percentage n (0-100).'],
        ['Nyx.progress.done()', 'Complete the progress bar (slides to 100%) and fades out.']
      ]
    },
    {
      id: 'context-menu', group: 'Components', title: 'Context menu', added: 'v1.0', needsJs: true,
      summary: 'A right-click menu positioned at the cursor. Add data-nyx-contextmenu="#id" to any element; closes on outside click or Esc.',
      sections: [
        { title: 'Right-click the card', demo: '<div data-nyx-contextmenu="#docCtx" class="nyx-card" style="text-align:center;padding:28px;cursor:context-menu">Right-click anywhere here</div><div class="nyx-context-menu" id="docCtx"><button class="nyx-dropdown-item">✎ Rename</button><button class="nyx-dropdown-item">⧉ Duplicate</button><div class="nyx-dropdown-divider"></div><button class="nyx-dropdown-item">🗑 Delete</button></div>' },
        { title: 'JavaScript Events', text: 'Listen for dropdown open/close events on context menus (which are sub-types of dropdowns).', lang: 'js', code: 'const menu = document.getElementById(\'docCtx\');\nmenu.addEventListener(\'nyx:dropdown-show\', () => console.log(\'Context menu opened\'));\nmenu.addEventListener(\'nyx:dropdown-hide\', () => console.log(\'Context menu closed\'));' }
      ],
      classes: [['data-nyx-contextmenu="#id"', 'On any element: right-click opens that menu at the cursor.'], ['nyx-context-menu', 'The menu (reuses .nyx-dropdown-item rows).']]
    },
    {
      id: 'vertical-tabs', group: 'Components', title: 'Vertical tabs', added: 'v1.0', needsJs: true,
      summary: 'The tabs component laid out vertically — the same data-nyx-tabs wiring.',
      sections: [{ title: 'Side tabs', demo: '<div class="nyx-tabs-vertical"><div class="nyx-tabs" data-nyx-tabs><button class="nyx-tab active" data-nyx-tab="vt1">Profile</button><button class="nyx-tab" data-nyx-tab="vt2">Account</button><button class="nyx-tab" data-nyx-tab="vt3">Billing</button></div><div style="flex:1"><div class="nyx-tab-panel active" data-nyx-panel="vt1">Profile settings.</div><div class="nyx-tab-panel" data-nyx-panel="vt2">Account settings.</div><div class="nyx-tab-panel" data-nyx-panel="vt3">Billing settings.</div></div></div>' }],
      classes: [['nyx-tabs-vertical', 'Vertical layout wrapper around .nyx-tabs + panels.']]
    },
    {
      id: 'calendar', group: 'Components', title: 'Calendar', added: 'v1.0', needsJs: true,
      summary: 'A month grid that renders the current month and pages through months with ‹ › or the header month/year dropdowns; click a day to select it. Add data-nyx-calendar and the runtime wires it (today + selection states), optionally bounding the year list with data-min-year / data-max-year.',
      sections: [
        { title: 'Interactive month', demo: '<div class="nyx-calendar" data-nyx-calendar></div>' },
        { title: 'JavaScript Events', text: 'Listen for selection updates on the calendar container.', lang: 'js', code: 'const cal = document.querySelector(\'[data-nyx-calendar]\');\ncal.addEventListener(\'nyx:date\', (e) => {\n  console.log(\'Selected date:\', e.detail); // e.detail is standard YYYY-MM-DD string\n});' }
      ],
      classes: [['nyx-calendar (+ data-nyx-calendar)', 'Month container; the attribute makes ‹ › paging and day-select live.'], ['nyx-calendar-grid .day', 'Day cell (+ .today / .selected / .muted).']]
    },
    {
      id: 'file', group: 'Components', title: 'File item', added: 'v1.0',
      summary: 'An upload / attachment row with an icon, name, meta, progress and a remove control.',
      sections: [{ title: 'Attachment', demo: '<div class="nyx-file"><div class="nyx-file-icon">📄</div><div class="nyx-file-meta"><div class="nyx-file-name">quarterly-report-2026.pdf</div><div class="nyx-file-sub">2.4 MB · uploaded</div><div class="nyx-progress" style="margin-top:6px"><span style="width:100%"></span></div></div><button class="nyx-close" aria-label="Remove file">✕</button></div>' }],
      classes: [['nyx-file', 'Row wrapper.'], ['nyx-file-icon / -meta / -name / -sub', 'Icon, text column, filename, sub-line.']]
    },

    /* ===== SIGNATURE ===== */
    {
      id: 'spotlight', group: 'Signature', title: 'Spotlight',
      summary: 'Luminous backdrop glows and dynamic cursor-following spotlight shine effects.',
      sections: [
        { title: 'Hero', demo: '<div class="nyx-spotlight" style="padding:48px 24px"><span class="nyx-overline">Signature</span><h2 class="nyx-h1" style="margin-top:8px">Lit from <span class="nyx-gradient-text">within</span></h2><p class="nyx-muted" style="margin-top:8px">A glow emanates from behind the content.</p></div>' },
        { title: 'Sibling Spotlight', text: 'Wrap cards or buttons inside `.nyx-spotlight-group`. Hovering over any item dims its siblings, highlighting the hovered item.', demo: '<div class="nyx-spotlight-group nyx-flex nyx-gap-3"><div class="nyx-card nyx-card-interactive" style="flex:1;padding:20px"><h5>Design</h5><p class="nyx-muted">Luminous patterns</p></div><div class="nyx-card nyx-card-interactive" style="flex:1;padding:20px"><h5>Develop</h5><p class="nyx-muted">Zero dependencies</p></div><div class="nyx-card nyx-card-interactive" style="flex:1;padding:20px"><h5>Deploy</h5><p class="nyx-muted">RTL & Localized</p></div></div>' },
        { title: 'Cursor Spotlight Shine', text: 'Apply `.nyx-shiny-card` or `.nyx-shiny-btn` to make a radial spotlight follow the mouse pointer inside the component bounds.', demo: '<div class="nyx-flex nyx-gap-3"><div class="nyx-card nyx-shiny-card" style="flex:1;padding:24px"><h5 style="margin-bottom:8px">Interactive Glow</h5><p class="nyx-muted">Move your mouse cursor over this card to watch the spotlight follow your pointer.</p></div><button class="nyx-btn nyx-btn-primary nyx-shiny-btn"><span>Hover me & move</span></button></div>' }
      ],
      classes: [['nyx-spotlight', 'Hero section with radial spotlight + top hairline.'], ['nyx-spotlight-group', 'Container that dims sibling elements on hover.'], ['nyx-shiny-card / -btn', 'Card / Button that receives cursor spotlight shine.']]
    },
    {
      id: 'orbit', group: 'Signature', title: 'Orbit',
      summary: 'A decorative animation: concentric rings with icon nodes orbiting a glowing center. CSS only.',
      sections: [
        { title: 'Animated', demo: '<div class="nyx-orbit"><div class="nyx-ring r1"></div><div class="nyx-ring r2"></div><div class="nyx-ring r3"></div><div class="nyx-spin"><div class="nyx-node">⚛</div></div><div class="nyx-spin s2"><div class="nyx-node">✦</div></div><div class="nyx-orbit-center">N</div></div>' }
      ],
      classes: [['nyx-orbit', 'Stage.'], ['nyx-ring r1/r2/r3', 'Concentric rings.'], ['nyx-spin (+.s2) > .nyx-node', 'Orbiting node.'], ['nyx-orbit-center', 'Glowing hub.']]
    },
    {
      id: 'command', group: 'Signature', title: 'Command key',
      summary: 'A beautifully styled keyboard-key element for shortcuts like ⌘K or Ctrl+S.',
      sections: [
        { title: 'Keys', demo: '<div class="nyx-flex nyx-gap-2 nyx-wrap"><span class="nyx-command">⌘ K</span><span class="nyx-command">⌘ S</span><span class="nyx-command">Ctrl ⏎</span><span class="nyx-command">esc</span></div>' }
      ],
      classes: [['nyx-command', 'Keycap-styled inline element.']]
    },
    {
      id: 'chip', group: 'Signature', title: 'Chip',
      summary: 'A removable tag/filter chip with an × in default, accent and outline variants.',
      sections: [
        { title: 'Removable', text: 'Click the × to remove (wired here for demo).', demo: '<div class="nyx-flex nyx-wrap nyx-gap-2"><span class="nyx-chip">Design <span class="nyx-chip-x" data-demo="remove" role="button" aria-label="remove">×</span></span><span class="nyx-chip nyx-chip-accent">Engineering <span class="nyx-chip-x" data-demo="remove" role="button" aria-label="remove">×</span></span><span class="nyx-chip nyx-chip-outline">Product <span class="nyx-chip-x" data-demo="remove" role="button" aria-label="remove">×</span></span></div>' }
      ],
      classes: [['nyx-chip', 'Base chip.'], ['nyx-chip-accent / -outline', 'Variants.'], ['nyx-chip-x', 'Remove affordance.']]
    },
    {
      id: 'timeline', group: 'Signature', title: 'Timeline',
      summary: 'A vertical event timeline with glowing dot markers, dates and content cards.',
      sections: [
        { title: 'Events', demo: '<div class="nyx-timeline"><div class="nyx-tl-item"><div class="nyx-tl-dot"></div><div class="nyx-tl-date">Jun 18, 2026</div><div class="nyx-card" style="padding:12px"><strong>Shipped v1.0</strong></div></div><div class="nyx-tl-item"><div class="nyx-tl-dot"></div><div class="nyx-tl-date">Jun 10, 2026</div><div class="nyx-card" style="padding:12px"><strong>Beta opened</strong></div></div></div>' }
      ],
      classes: [['nyx-timeline', 'Vertical rail.'], ['nyx-tl-item / -dot / -date', 'Event, marker, date.']]
    },
    {
      id: 'meter', group: 'Signature', title: 'Meter',
      summary: 'An SVG circular progress ring for scores and usage stats. Set the stroke-dashoffset to the percentage.',
      sections: [
        { title: 'Ring', demo: '<div class="nyx-meter"><svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label="72 percent"><defs><linearGradient id="docMeterGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6c63ff"/><stop offset="1" stop-color="#00d4aa"/></linearGradient></defs><circle class="nyx-meter-track" cx="60" cy="60" r="52"></circle><circle class="nyx-meter-fill" cx="60" cy="60" r="52" stroke-dasharray="326.7" stroke-dashoffset="91.5" style="stroke:url(#docMeterGrad)"></circle></svg><span class="nyx-meter-val">72%</span></div>' }
      ],
      classes: [['nyx-meter', 'Wrapper.'], ['nyx-meter-track / -fill', 'Ring track and gradient fill.'], ['nyx-meter-val', 'Centered value.']]
    },
    {
      id: 'gradient-border', group: 'Signature', title: 'Gradient border',
      summary: 'A wrapper that applies an animated, flowing gradient border to any surface.',
      sections: [
        { title: 'Animated', demo: '<div class="nyx-gradient-border" style="max-width:280px"><div class="nyx-stack" style="gap:8px"><h4 class="nyx-h4">Pro plan</h4><p class="nyx-caption">An animated gradient border wraps the surface.</p></div></div>' }
      ],
      classes: [['nyx-gradient-border', 'Animated border wrapper; put your card as its child.']]
    },
    {
      id: 'avatar', group: 'Signature', title: 'Avatar',
      summary: 'User avatars with initials fallback, an online indicator and an overlapping group variant.',
      sections: [
        { title: 'Group', demo: '<div class="nyx-avatar-group"><span class="nyx-avatar">AC</span><span class="nyx-avatar" style="background:linear-gradient(120deg,#ff4d6a,#ffb020)">LP</span><span class="nyx-avatar online" style="background:linear-gradient(120deg,#00d4aa,#6c63ff)">NK</span><span class="nyx-avatar" style="background:var(--nyx-surface-2);color:var(--nyx-text-muted)">+5</span></div>' }
      ],
      classes: [['nyx-avatar', 'Round avatar with initials.'], ['nyx-avatar.online', 'Adds presence dot.'], ['nyx-avatar-group', 'Overlapping stack.']]
    },
    {
      id: 'notification-dot', group: 'Signature', title: 'Notification dot',
      summary: 'An absolutely-positioned indicator — a count or a plain dot — to overlay on icons.',
      sections: [
        { title: 'Count & plain', demo: '<div class="nyx-flex nyx-gap-4 nyx-items-center"><span class="nyx-notification-dot" data-count="9"><button class="nyx-btn nyx-btn-icon nyx-btn-glass" aria-label="inbox">✉</button></span><span class="nyx-notification-dot plain"><button class="nyx-btn nyx-btn-icon nyx-btn-glass" aria-label="activity">◎</button></span></div>' }
      ],
      classes: [['nyx-notification-dot[data-count]', 'Numeric badge overlay.'], ['nyx-notification-dot.plain', 'Plain dot.']]
    },
    {
      id: 'marquee', group: 'Signature', title: 'Marquee',
      summary: 'A horizontal auto-scrolling strip for "trusted by" logo rows. CSS animation; pauses on hover.',
      sections: [
        { title: 'Scrolling', demo: '<div class="nyx-marquee"><div class="nyx-track"><span>Acme</span><span>Globex</span><span>Initech</span><span>Umbrella</span><span>Hooli</span><span>Stark</span><span>Acme</span><span>Globex</span><span>Initech</span><span>Umbrella</span><span>Hooli</span><span>Stark</span></div></div>' }
      ],
      classes: [['nyx-marquee', 'Masked viewport.'], ['nyx-marquee > .nyx-track', 'Scrolling content (duplicate items for a seamless loop).']]
    },
    {
      id: 'segmented', group: 'Signature', title: 'Segmented control', added: 'v1.0',
      summary: 'An iOS-style segmented switch built from radio inputs — pure CSS, keyboard accessible, with an optional sliding background capsule.',
      sections: [
        { title: 'Three up', demo: '<div class="nyx-segment"><label><input type="radio" name="seg1" checked><span>Day</span></label><label><input type="radio" name="seg1"><span>Week</span></label><label><input type="radio" name="seg1"><span>Month</span></label></div>' },
        { title: 'Sliding Capsule', text: 'Add `data-nyx-slider-nav` to segmented controls to enable a smooth glassmorphic sliding background selection highlight.', demo: '<div class="nyx-segment" data-nyx-slider-nav="label"><label class="active"><input type="radio" name="seg2" checked><span>Day</span></label><label><input type="radio" name="seg2"><span>Week</span></label><label><input type="radio" name="seg2"><span>Month</span></label></div>' }
      ],
      classes: [['nyx-segment', 'Container.'], ['label > input + span', 'Each segment (radio + visible label).'], ['data-nyx-slider-nav', 'Enables dynamic sliding pill indicator background.']]
    },
    {
      id: 'rating', group: 'Signature', title: 'Rating', added: 'v1.0',
      summary: 'A five-star rating control. Hover and selection light up with pure CSS — no JavaScript.',
      sections: [{ title: 'Stars', demo: '<div class="nyx-rating"><input type="radio" name="rate" id="r5"><label for="r5"></label><input type="radio" name="rate" id="r4"><label for="r4"></label><input type="radio" name="rate" id="r3" checked><label for="r3"></label><input type="radio" name="rate" id="r2"><label for="r2"></label><input type="radio" name="rate" id="r1"><label for="r1"></label></div>' }],
      classes: [['nyx-rating', 'Reverse-ordered radio group (5→1) of star labels.']]
    },
    {
      id: 'empty-state', group: 'Signature', title: 'Empty state', added: 'v1.0',
      summary: 'A friendly placeholder for zero-data views — icon, message and a call to action.',
      sections: [{ title: 'No data', demo: '<div class="nyx-empty"><div class="nyx-empty-icon">📭</div><h4 class="nyx-h4">No projects yet</h4><p class="nyx-caption" style="margin:6px 0 16px">Create your first project to get started.</p><button class="nyx-btn nyx-btn-primary">New project</button></div>' }],
      classes: [['nyx-empty', 'Dashed placeholder card.'], ['nyx-empty-icon', 'Large icon.']]
    },
    {
      id: 'banner', group: 'Signature', title: 'Banner', added: 'v1.0',
      summary: 'A full-width announcement / promo strip with a gradient wash.',
      sections: [{ title: 'Announcement', demo: '<div class="nyx-banner"><span class="nyx-badge nyx-badge-info">New</span> Nyx v1.0 adds light mode &amp; full RTL. <a href="#/rtl" class="nyx-gradient-text" style="font-weight:600">Learn more →</a></div>' }],
      classes: [['nyx-banner', 'Gradient announcement bar.']]
    },
    {
      id: 'dropzone', group: 'Signature', title: 'Dropzone', added: 'v1.0',
      summary: 'A file-upload drop target with a hover glow. Wrap a hidden file input in the label.',
      sections: [{ title: 'Upload', demo: '<label class="nyx-dropzone"><div class="nyx-dz-icon">⬆️</div><strong>Drop files here</strong><span class="nyx-caption">or click to browse</span><input type="file" hidden></label>' }],
      classes: [['nyx-dropzone', 'Dashed drop target (use on a label wrapping a file input).']]
    },
    {
      id: 'sparkline', group: 'Signature', title: 'Sparkline', added: 'v1.0',
      summary: 'A tiny inline bar chart for trends inside cards and tables — pure CSS; set each bar height.',
      sections: [{ title: 'Trend', demo: '<div class="nyx-sparkline"><span style="height:40%"></span><span style="height:60%"></span><span style="height:35%"></span><span style="height:80%"></span><span style="height:55%"></span><span style="height:95%"></span><span style="height:70%"></span><span style="height:88%"></span></div>' }],
      classes: [['nyx-sparkline', 'Inline bar chart (height set per <span>).']]
    },

    /* ===== HELPERS ===== */
    {
      id: 'vertical-rule', group: 'Helpers', title: 'Vertical rule', added: 'v1.0',
      summary: 'A thin vertical divider between inline items.',
      sections: [{ title: 'Between items', demo: '<div class="nyx-flex nyx-items-center nyx-gap-3" style="height:28px"><span>Edit</span><span class="nyx-vr"></span><span>Share</span><span class="nyx-vr"></span><span>Delete</span></div>' }],
      classes: [['nyx-vr', 'Vertical 1px rule.']]
    },
    {
      id: 'visually-hidden', group: 'Helpers', title: 'Visually hidden', added: 'v1.0',
      summary: 'Hide content visually while keeping it available to screen readers.',
      sections: [{ title: 'Usage', lang: 'html', code: '<button class="nyx-btn nyx-btn-icon nyx-btn-primary">\n  🔔<span class="nyx-visually-hidden">Notifications</span>\n</button>' }],
      classes: [['nyx-visually-hidden', 'Screen-reader-only content.']]
    },
    {
      id: 'stretched-link', group: 'Helpers', title: 'Stretched link', added: 'v1.0',
      summary: 'Make a link cover its whole containing block, so an entire card becomes clickable.',
      sections: [{ title: 'Clickable card', demo: '<div class="nyx-card nyx-position-relative" style="max-width:260px"><h4 class="nyx-h4">Project Apollo</h4><p class="nyx-caption">Click anywhere on the card.</p><a href="#/stretched-link" class="nyx-stretched-link" aria-label="Open project"></a></div>' }],
      classes: [['nyx-stretched-link', 'On a link inside a position:relative parent.']]
    },
    {
      id: 'focus-ring', group: 'Helpers', title: 'Focus ring', added: 'v1.0',
      summary: 'Add the signature glow focus ring to any custom interactive element, complete with a keyboard-triggered expanding ripple animation.',
      sections: [
        { title: 'Focusable', demo: '<div tabindex="0" class="nyx-card nyx-focus-ring" style="max-width:260px;cursor:pointer">Tab to me to see the ring.</div>' },
        { title: 'Keyboard Rippling Focus', text: 'All interactive elements in Nyx automatically trigger a one-shot expanding box-shadow ripple keyframe animation upon gaining focus via keyboard navigation (`:focus-visible`).', demo: '<div class="nyx-flex nyx-gap-3"><button class="nyx-btn nyx-btn-primary">Focus via Tab</button><input class="nyx-input" placeholder="Tab to me too" aria-label="Tab target"></div>' }
      ],
      classes: [['nyx-focus-ring', 'Glow ring on :focus.'], ['nyx-focus-ripple', 'Expanding shadow keyframe animation triggered on keyboard focus.']]
    },
    {
      id: 'clearfix', group: 'Helpers', title: 'Clearfix', added: 'v1.0',
      summary: 'Clear floated children within a container.',
      sections: [{ title: 'Usage', lang: 'html', code: '<div class="nyx-clearfix">\n  <button style="float:left">Left</button>\n  <button style="float:right">Right</button>\n</div>' }],
      classes: [['nyx-clearfix', 'Clears floats.']]
    },
    {
      id: 'text-truncate', group: 'Helpers', title: 'Text truncation', added: 'v1.0',
      summary: 'Truncate long single-line text with an ellipsis.',
      sections: [{ title: 'Ellipsis', demo: '<div class="nyx-text-truncate nyx-card" style="max-width:220px">This is a very long line of text that will be truncated with an ellipsis.</div>' }],
      classes: [['nyx-text-truncate', 'Single-line ellipsis.']]
    },

    /* ===== UTILITIES ===== */
    {
      id: 'spacing', group: 'Utilities', title: 'Spacing', added: 'v1.0',
      summary: 'Margin and padding utilities on the 4px scale (0–6). m/p with sides t, b, s (start), e (end), plus mx-auto. Start/end are RTL-aware.',
      sections: [{ title: 'Examples', demo: '<div class="nyx-bg-surface-2 nyx-rounded nyx-p-4"><div class="nyx-bg-accent nyx-rounded nyx-p-2 nyx-mb-3">.nyx-p-2 .nyx-mb-3</div><div class="nyx-bg-glass nyx-border nyx-rounded nyx-p-3">.nyx-p-3</div></div>' }],
      classes: [['nyx-m-0…6 / nyx-p-0…6', 'All-sides margin / padding.'], ['nyx-mt/mb/ms/me-* · pt/pb/ps/pe-*', 'Per-side (start/end RTL-aware).'], ['nyx-mx-auto', 'Center horizontally.']]
    },
    {
      id: 'display', group: 'Utilities', title: 'Display', added: 'v1.0',
      summary: 'Set the CSS display property.',
      sections: [{ title: 'Values', demo: '<div class="nyx-flex nyx-gap-2"><span class="nyx-badge nyx-d-inline-block">inline-block</span><span class="nyx-badge nyx-d-none">hidden</span><span class="nyx-badge">visible</span></div>' }],
      classes: [['nyx-d-none / -block / -inline / -inline-block', 'Display values.'], ['nyx-d-flex / -inline-flex / -grid', 'Flex & grid.']]
    },
    {
      id: 'text', group: 'Utilities', title: 'Text', added: 'v1.0',
      summary: 'Alignment, transform, weight, truncation and color text utilities.',
      sections: [{ title: 'Alignment & color', demo: '<div class="nyx-stack" style="gap:6px"><p class="nyx-text-center">Centered</p><p class="nyx-text-end">End-aligned</p><p class="nyx-text-uppercase nyx-fw-bold nyx-text-accent">accent bold upper</p></div>' }],
      classes: [['nyx-text-start/-center/-end', 'Alignment (RTL-aware).'], ['nyx-text-uppercase/-lowercase/-capitalize', 'Transform.'], ['nyx-fw-normal/-medium/-bold', 'Weight.'], ['nyx-text-accent/-accent-2/-danger/-warning/-muted', 'Color.']]
    },
    {
      id: 'colors', group: 'Utilities', title: 'Colors', added: 'v1.0',
      summary: 'Background and text color utilities driven by theme tokens — they adapt to light/dark automatically.',
      sections: [{ title: 'Backgrounds', demo: '<div class="nyx-flex nyx-gap-2 nyx-wrap"><span class="nyx-bg-surface nyx-border nyx-rounded nyx-p-2">surface</span><span class="nyx-bg-surface-2 nyx-rounded nyx-p-2">surface-2</span><span class="nyx-bg-accent nyx-rounded nyx-p-2">accent</span><span class="nyx-bg-glass nyx-border nyx-rounded nyx-p-2">glass</span></div>' }],
      classes: [['nyx-bg-surface/-surface-2/-accent/-glass', 'Background.'], ['nyx-text-* (see Text)', 'Foreground color.']]
    },
    {
      id: 'borders', group: 'Utilities', title: 'Borders', added: 'v1.0',
      summary: 'Border and border-radius utilities.',
      sections: [{ title: 'Radii', demo: '<div class="nyx-flex nyx-gap-3 nyx-wrap"><span class="nyx-border nyx-rounded-sm nyx-p-3 nyx-bg-surface">sm</span><span class="nyx-border nyx-rounded nyx-p-3 nyx-bg-surface">md</span><span class="nyx-border nyx-rounded-lg nyx-p-3 nyx-bg-surface">lg</span><span class="nyx-border nyx-rounded-full nyx-p-3 nyx-bg-surface">full</span></div>' }],
      classes: [['nyx-border / nyx-border-0', 'Add / remove border.'], ['nyx-rounded / -sm / -lg / -full', 'Radius.']]
    },
    {
      id: 'shadows', group: 'Utilities', title: 'Shadows', added: 'v1.0',
      summary: 'Elevation and glow shadow utilities.',
      sections: [{ title: 'Elevation', demo: '<div class="nyx-flex nyx-gap-4 nyx-wrap"><span class="nyx-bg-surface nyx-rounded nyx-p-4 nyx-shadow-sm">sm</span><span class="nyx-bg-surface nyx-rounded nyx-p-4 nyx-shadow">md</span><span class="nyx-bg-surface nyx-rounded nyx-p-4 nyx-shadow-lg">lg</span><span class="nyx-bg-surface nyx-rounded nyx-p-4 nyx-shadow-glow">glow</span></div>' }],
      classes: [['nyx-shadow-sm / -shadow / -shadow-lg', 'Elevation.'], ['nyx-shadow-glow', 'Accent glow.']]
    },
    {
      id: 'sizing', group: 'Utilities', title: 'Sizing', added: 'v1.0',
      summary: 'Width and height utilities.',
      sections: [{ title: 'Widths', demo: '<div class="nyx-stack" style="gap:6px"><div class="nyx-bg-accent nyx-rounded nyx-p-1 nyx-text-center nyx-w-25">25%</div><div class="nyx-bg-accent nyx-rounded nyx-p-1 nyx-text-center nyx-w-50">50%</div><div class="nyx-bg-accent nyx-rounded nyx-p-1 nyx-text-center nyx-w-100">100%</div></div>' }],
      classes: [['nyx-w-25/50/75/100', 'Width %.'], ['nyx-mw-100 / nyx-h-100', 'Max-width / full height.']]
    },
    {
      id: 'opacity', group: 'Utilities', title: 'Opacity', added: 'v1.0',
      summary: 'Opacity utilities.',
      sections: [{ title: 'Levels', demo: '<div class="nyx-flex nyx-gap-2"><span class="nyx-bg-accent nyx-rounded nyx-p-2 nyx-opacity-25">25</span><span class="nyx-bg-accent nyx-rounded nyx-p-2 nyx-opacity-50">50</span><span class="nyx-bg-accent nyx-rounded nyx-p-2 nyx-opacity-75">75</span><span class="nyx-bg-accent nyx-rounded nyx-p-2 nyx-opacity-100">100</span></div>' }],
      classes: [['nyx-opacity-0/25/50/75/100', 'Opacity levels.']]
    },
    {
      id: 'position', group: 'Utilities', title: 'Position', added: 'v1.0',
      summary: 'Set the CSS position property.',
      sections: [{ title: 'Usage', lang: 'html', code: '<div class="nyx-position-relative">\n  <span class="nyx-position-absolute" style="top:0;inset-inline-end:0">badge</span>\n</div>' }],
      classes: [['nyx-position-relative/-absolute/-fixed/-sticky', 'Position values.']]
    },

    /* ===== MOTION ===== */
    {
      id: 'big-type', group: 'Motion', title: 'Big type', added: 'v1.0',
      summary: 'Oversized hero typography — the bold display-type trend. Fluid sizing via clamp(), with gradient, outline-stroke and animation options. In RTL it switches to the Aref Ruqaa cursive Arabic display face (Ruqʼah).',
      sections: [
        { title: 'Hero headline', demo: '<h1 class="nyx-bigtype">Ship <span class="nyx-gradient-text animated">faster</span></h1>' },
        { title: 'Outline stroke', demo: '<h1 class="nyx-bigtype nyx-bigtype-sm">DESIGN <span class="stroke">SYSTEM</span></h1>' }
      ],
      classes: [['nyx-bigtype', 'Fluid oversized display type.'], ['nyx-bigtype-sm', 'Smaller scale.'], ['.stroke', 'Outlined (transparent) text.'], ['nyx-gradient-text.animated', 'Animated gradient sweep.']]
    },
    {
      id: 'animations', group: 'Motion', title: 'Animations', added: 'v1.0',
      summary: 'Entrance animations with directional slide-ins, stagger delays, a floating loop, hover tilt/lift, custom-pointer tracking spotlights, sweeps, a rotating aurora backdrop, magnetic hover pulls, cursor followers, and word cascade reveals.',
      sections: [
        { title: 'Entrances (stagger + direction)', demo: '<div class="nyx-flex nyx-gap-3 nyx-wrap"><span class="nyx-badge nyx-anim-up nyx-anim-delay-1">up</span><span class="nyx-badge nyx-anim-fade nyx-anim-delay-2">fade</span><span class="nyx-badge nyx-anim-zoom nyx-anim-delay-3">zoom</span><span class="nyx-badge nyx-anim-left nyx-anim-delay-4">left</span><span class="nyx-badge nyx-anim-right nyx-anim-delay-4">right</span></div>' },
        { title: 'Interactive spotlight & sheens', demo: '<div class="nyx-grid"><div class="nyx-col-4"><div class="nyx-card nyx-spotlight-card nyx-p-4 text-center" style="height:100%"><span class="nyx-overline">Spotlight</span><h4 class="nyx-h5 nyx-mt-2">Cursor glow</h4><p class="nyx-muted nyx-fs-sm">Radial accent light tracks your mouse.</p></div></div><div class="nyx-col-4"><div class="nyx-card nyx-glass-flare nyx-p-4 text-center" style="height:100%"><span class="nyx-overline">Glass flare</span><h4 class="nyx-h5 nyx-mt-2">Reflective sheen</h4><p class="nyx-muted nyx-fs-sm">Hover to trigger a sliding metallic light sheen.</p></div></div><div class="nyx-col-4"><div class="nyx-card nyx-hover-lift nyx-p-4 text-center" style="height:100%"><span class="nyx-overline">Hover lift</span><h4 class="nyx-h5 nyx-mt-2">Smooth translation</h4><p class="nyx-muted nyx-fs-sm">Hover to lift and expand shadow depth.</p></div></div></div>' },
        { title: 'Looping effects', demo: '<div class="nyx-flex nyx-gap-4 nyx-items-center"><div class="nyx-avatar nyx-anim-float">N</div><span class="nyx-badge nyx-badge-success nyx-anim-pulse-glow">pulse glow</span></div>' },
        { title: 'Magnetic Hover Pull', text: 'Add class `.nyx-magnetic` to buttons or icons to pull them dynamically toward the user cursor on hover.', demo: '<div class="nyx-flex nyx-gap-4 nyx-items-center"><button class="nyx-btn nyx-btn-icon nyx-btn-primary nyx-magnetic" style="font-size:24px;width:54px;height:54px;border-radius:50%">🚀</button><button class="nyx-btn nyx-btn-secondary nyx-magnetic">Magnetic Button</button></div>' },
        { title: 'Luminous Cursor Follower', text: 'Create an element with class `.nyx-cursor-follower` inside the body. A soft, trailing accent glow will follow the user pointer across the screen.', demo: '<div class="nyx-card" style="padding:24px;text-align:center"><div class="nyx-cursor-follower"></div><p class="nyx-muted">A cursor follower is active. Move your mouse around to see the soft gradient aura.</p></div>' },
        { title: 'Cascading Text Reveal', text: 'Wrap words in `<span>` tags inside a container with class `.nyx-anim-cascade` to reveal them sequentially.', demo: '<h3 class="nyx-anim-cascade"><span class="nyx-gradient-text animated">Luminous</span> <span>Depth</span> <span>Bilingual</span> <span>Design</span> <span>System</span></h3>' },
        { title: '3D Tilt Card', text: 'Add `.nyx-tilt` to any card or panel. The element tilts in perspective towards the cursor. Control intensity with `data-nyx-tilt-strength` (default: 15).', demo: '<div class="nyx-grid"><div class="nyx-col-4"><div class="nyx-card nyx-tilt nyx-p-4" style="text-align:center"><span class="nyx-overline">Tilt me</span><h4 class="nyx-h5 nyx-mt-2">3D Tilt Card</h4><p class="nyx-muted nyx-fs-sm">Move your mouse here — I tilt in perspective.</p></div></div><div class="nyx-col-4"><div class="nyx-card nyx-tilt nyx-p-4" data-nyx-tilt-strength="25" style="text-align:center;background:linear-gradient(135deg,var(--nyx-accent),var(--nyx-accent-2,#7c3aed))"><span class="nyx-overline" style="color:#fff">Strong</span><h4 class="nyx-h5 nyx-mt-2" style="color:#fff">Strength: 25</h4><p class="nyx-fs-sm" style="color:rgba(255,255,255,.8)">Higher tilt intensity.</p></div></div><div class="nyx-col-4"><div class="nyx-card nyx-tilt nyx-glass nyx-p-4" style="text-align:center"><span class="nyx-overline">Glass</span><h4 class="nyx-h5 nyx-mt-2">Glassmorphism</h4><p class="nyx-muted nyx-fs-sm">Combine with .nyx-glass for depth.</p></div></div></div>', jsSnippet: '<div class="nyx-tilt">Default tilt (strength 15)</div>\n<div class="nyx-tilt" data-nyx-tilt-strength="25">Stronger tilt</div>' },
        { title: 'Animated Counter', text: 'Add `data-nyx-count` to any element and set the target value. When it enters the viewport the runtime counts from 0 with easing. Accepts `data-nyx-prefix`, `data-nyx-suffix`, `data-nyx-decimals`, and `data-nyx-duration` (ms).', demo: '<div class="nyx-grid" style="text-align:center"><div class="nyx-col-3"><div class="nyx-card nyx-p-4"><div class="nyx-h2 nyx-gradient-text" data-nyx-count="98" data-nyx-suffix="%">0%</div><p class="nyx-muted nyx-fs-sm">Uptime</p></div></div><div class="nyx-col-3"><div class="nyx-card nyx-p-4"><div class="nyx-h2" data-nyx-count="12500" data-nyx-suffix="+">0+</div><p class="nyx-muted nyx-fs-sm">Users</p></div></div><div class="nyx-col-3"><div class="nyx-card nyx-p-4"><div class="nyx-h2" data-nyx-count="4.9" data-nyx-decimals="1" data-nyx-suffix="★">0★</div><p class="nyx-muted nyx-fs-sm">Rating</p></div></div><div class="nyx-col-3"><div class="nyx-card nyx-p-4"><div class="nyx-h2" data-nyx-count="360" data-nyx-suffix="°">0°</div><p class="nyx-muted nyx-fs-sm">Coverage</p></div></div></div>', jsSnippet: '<!-- Auto-starts on scroll into view -->\n<span data-nyx-count="12500" data-nyx-suffix="+">0</span>\n\n<!-- With decimal places -->\n<span data-nyx-count="4.75" data-nyx-decimals="2" data-nyx-suffix=" ms">0</span>\n\n<!-- Custom duration: 3 seconds -->\n<span data-nyx-count="1000000" data-nyx-duration="3000">0</span>' },
        { title: 'Typewriter Effect', text: 'Add `.nyx-typewriter` and set text via `data-nyx-text`. Characters are typed one-by-one at `data-nyx-speed` ms per character (default: 60ms). Add `data-nyx-loop` to repeat endlessly.', demo: '<div class="nyx-flex nyx-flex-col nyx-gap-4" style="padding:8px 0"><h3 class="nyx-h4"><span class="nyx-typewriter" data-nyx-text="Nyx UI — Luminous Depth Design System." data-nyx-loop></span></h3><p class="nyx-muted nyx-fs-sm">Loop enabled — the text re-types every cycle.</p></div>', jsSnippet: '<!-- Starts on scroll-into-view -->\n<span class="nyx-typewriter" data-nyx-text="Hello, World!"></span>\n\n<!-- Loop endlessly -->\n<span class="nyx-typewriter" data-nyx-text="Design. Build. Ship." data-nyx-loop></span>\n\n<!-- 30ms per character = faster -->\n<span class="nyx-typewriter" data-nyx-text="Fast." data-nyx-speed="30"></span>' },
        { title: 'Glitch Text Effect', text: 'Add `.nyx-glitch` and mirror the visible text in `data-text`. Two pseudo-element layers animated with `clip-path` produce chromatic aberration — a cyberpunk distortion. Pure CSS, no JS required.', demo: '<div class="nyx-flex nyx-flex-col nyx-gap-6 nyx-items-center" style="padding:32px"><h2 class="nyx-h2 nyx-glitch" data-text="NYX UI" style="font-weight:900;letter-spacing:0.05em">NYX UI</h2><p class="nyx-overline nyx-glitch" data-text="SYSTEM ONLINE" style="letter-spacing:0.2em">SYSTEM ONLINE</p></div>', jsSnippet: '<!-- data-text must mirror the visible content exactly -->\n<h1 class="nyx-glitch" data-text="SYSTEM FAULT">SYSTEM FAULT</h1>' },
        { title: 'Aurora hero', demo: '<div class="nyx-aurora nyx-card" style="text-align:center;padding:40px"><h3 class="nyx-h2">Animated <span class="nyx-gradient-text animated">aurora</span></h3><p class="nyx-muted">A rotating conic-gradient glow behind your content.</p></div>' }
      ],
      classes: [
        ['nyx-anim-fade / -up / -zoom', 'One-shot entrance animations.'],
        ['nyx-anim-left / -right', 'Directional entrances.'],
        ['nyx-anim-delay-1…4', 'Stagger delays.'],
        ['nyx-anim-float', 'Gentle floating loop.'],
        ['nyx-anim-pulse-glow', 'Looping breathing neon glow.'],
        ['nyx-spotlight-card', 'Interactive radial cursor shine card (pointer-move glow).'],
        ['nyx-glass-flare', 'Card with a sweeping reflective light flare on hover.'],
        ['nyx-hover-lift', 'Lifts card and casts a glowing shadow on hover.'],
        ['nyx-magnetic', 'Pulls elements dynamically toward the hovered pointer. JS'],
        ['nyx-cursor-follower', 'Fixed overlay radial glow following the cursor. JS'],
        ['nyx-anim-cascade', 'Staggered vertical fade-in for wrapped text spans.'],
        ['nyx-tilt', '3D perspective tilt towards the cursor on hover. JS'],
        ['data-nyx-count', 'Scroll-triggered eased number counter. JS'],
        ['nyx-typewriter', 'Character-by-character typing reveal animation. JS'],
        ['nyx-glitch', 'Cyberpunk clip-path chromatic glitch distortion. CSS only'],
        ['nyx-aurora', 'Rotating aurora backdrop (wrap content).']
      ]
    },
    {
      id: 'motion-effects', group: 'Motion', title: 'Hover & attention', added: 'v1.0',
      summary: 'Drop-in hover transitions and looping attention-seekers — all CSS-only and automatically disabled under prefers-reduced-motion.',
      sections: [
        { title: 'Hover effects', demo: '<div class="nyx-flex nyx-gap-3 nyx-wrap nyx-items-center"><button class="nyx-btn nyx-btn-glass nyx-hover-lift">Lift</button><button class="nyx-btn nyx-btn-glass nyx-hover-grow">Grow</button><button class="nyx-btn nyx-btn-glass nyx-hover-glow">Glow</button><button class="nyx-btn nyx-btn-glass nyx-hover-rotate">Rotate</button><a href="#/motion-effects" class="nyx-anim-underline">Animated underline</a></div>' },
        { title: 'Attention seekers', demo: '<div class="nyx-flex nyx-gap-4 nyx-items-center nyx-wrap"><span class="nyx-badge nyx-badge-success nyx-anim-bounce">Bounce</span><span class="nyx-badge nyx-anim-wiggle">Wiggle</span><span class="nyx-badge nyx-badge-danger nyx-anim-heartbeat">♥ Beat</span><span class="nyx-badge nyx-anim-shake">Shake</span><span class="nyx-anim-ping" style="border-radius:50%;width:12px;height:12px;background:var(--nyx-accent);display:inline-block"></span></div>' },
        { title: 'Media: Ken Burns & blur-in', demo: '<div class="nyx-flex nyx-gap-4 nyx-wrap nyx-items-center"><div style="width:150px;height:96px;border-radius:12px;overflow:hidden"><div class="nyx-anim-kenburns" style="width:100%;height:100%;background:linear-gradient(120deg,var(--nyx-accent),var(--nyx-accent-2))"></div></div><div class="nyx-card nyx-anim-blur" style="padding:18px">Blur-in</div></div>' }
      ],
      classes: [
        ['nyx-hover-lift / -grow / -shrink / -rotate / -glow', 'One-class hover transitions.'],
        ['nyx-anim-underline', 'Underline that wipes in on hover/focus.'],
        ['nyx-anim-bounce / -shake / -wiggle / -heartbeat', 'Attention-seeking animations.'],
        ['nyx-anim-spin-slow', 'Continuous slow rotation.'],
        ['nyx-anim-ping', 'Expanding notification ring (::before).'],
        ['nyx-anim-kenburns', 'Slow infinite image zoom / pan.'],
        ['nyx-anim-blur', 'Blur-to-sharp entrance.']
      ]
    },
    {
      id: 'reveal', group: 'Motion', title: 'Scroll reveal', added: 'v1.0',
      summary: 'Add data-nyx-reveal to fade-and-rise elements in as they scroll into view — wired automatically by the runtime via IntersectionObserver.',
      sections: [
        { title: 'Live demo', text: 'Each card fades and rises in once as it enters the viewport — scroll the page to retrigger. Stagger a group by adding an inline transition-delay to each item.', demo: '<div class="nyx-flex nyx-gap-4 nyx-wrap"><div class="nyx-card" style="flex:1 1 150px" data-nyx-reveal>Fades in</div><div class="nyx-card" style="flex:1 1 150px;transition-delay:.12s" data-nyx-reveal>…then this</div><div class="nyx-card" style="flex:1 1 150px;transition-delay:.24s" data-nyx-reveal>…then this</div></div>' },
        { title: 'Usage', lang: 'html', code: '<div data-nyx-reveal>I fade and rise in on scroll.</div>\n\n<!-- stagger a group with inline delays -->\n<div data-nyx-reveal style="transition-delay:.12s"> … </div>\n<div data-nyx-reveal style="transition-delay:.24s"> … </div>\n\n<!-- after injecting markup dynamically, re-wire: -->\n<script>Nyx.init(container)</script>' }
      ],
      classes: [['data-nyx-reveal', 'Reveal-on-scroll; the runtime adds .nyx-reveal then .nyx-in via IntersectionObserver.'], ['transition-delay', 'Inline per-item delay to stagger a group.']]
    },

    /* ===== BACKGROUNDS ===== */
    {
      id: 'backgrounds', group: 'Backgrounds', title: 'Background effects', added: 'v1.0',
      summary: 'Ambient backdrop layers — drop a class on any section, card or band and place your content inside; no child markup needed. Each paints a decorative layer behind the content in its own stacking context, every tint derives from --nyx-accent (so they retheme with the accent + data-accent), and all animated variants are switched off under prefers-reduced-motion.',
      sections: [
        { title: 'Grid lines', text: 'The masked hero grid, made reusable. Size the cell with --nyx-bg-cell.', demo: '<div class="nyx-bg-grid" style="border:1px solid var(--nyx-border);border-radius:14px;padding:40px 24px;text-align:center"><span class="nyx-overline">.nyx-bg-grid</span><h3 class="nyx-h4" style="margin-top:8px">Masked grid lines</h3></div>' },
        { title: 'Dot grid', demo: '<div class="nyx-bg-dots" style="border:1px solid var(--nyx-border);border-radius:14px;padding:40px 24px;text-align:center"><span class="nyx-overline">.nyx-bg-dots</span><h3 class="nyx-h4" style="margin-top:8px">Dotted backdrop</h3></div>' },
        { title: 'Mesh gradient', text: 'Static layered accent blobs — a soft, premium hero wash.', demo: '<div class="nyx-bg-mesh" style="border:1px solid var(--nyx-border);border-radius:14px;padding:48px 24px;text-align:center"><span class="nyx-overline">.nyx-bg-mesh</span><h3 class="nyx-h4" style="margin-top:8px">Layered accent mesh</h3></div>' },
        { title: 'Animated gradient surface', text: 'A two-tone gradient that slowly pans. Add .animated to move it.', demo: '<div class="nyx-bg-gradient animated" style="border-radius:14px;padding:48px 24px;text-align:center"><h3 class="nyx-h4" style="color:#fff">.nyx-bg-gradient.animated</h3></div>' },
        { title: 'Conic beams', text: 'Lighthouse light rays from the top edge. Add .animated to sweep them.', demo: '<div class="nyx-bg-beams animated" style="border:1px solid var(--nyx-border);border-radius:14px;min-height:170px;display:grid;place-items:center"><h3 class="nyx-h4">.nyx-bg-beams.animated</h3></div>' },
        { title: 'Film grain (stackable)', text: 'A grain overlay painted on ::after, so it stacks on top of any other effect — here on the mesh.', demo: '<div class="nyx-bg-mesh nyx-bg-noise" style="border:1px solid var(--nyx-border);border-radius:14px;padding:48px 24px;text-align:center"><h3 class="nyx-h4" style="margin-top:8px">.nyx-bg-mesh.nyx-bg-noise</h3></div>' },
        { title: 'Interactive squares', text: 'A grid that lights up under the cursor — the runtime feeds the pointer position to the layer. Move your mouse across it.', demo: '<div class="nyx-bg-squares" style="border:1px solid var(--nyx-border);border-radius:14px;min-height:180px;display:grid;place-items:center"><h3 class="nyx-h4">Hover me — .nyx-bg-squares</h3></div>' },
        { title: 'Starfield', text: 'Two parallax layers of drifting stars on the dark canvas.', demo: '<div class="nyx-bg-stars" style="border:1px solid var(--nyx-border);border-radius:14px;min-height:170px;display:grid;place-items:center"><h3 class="nyx-h4">.nyx-bg-stars</h3></div>' },
        { title: 'Usage', lang: 'html', code: '<!-- drop a class on any box; put content inside -->\n<section class="nyx-bg-grid">\n  <h1>Lit from within</h1>\n</section>\n\n<!-- animated variants -->\n<div class="nyx-bg-gradient animated"> … </div>\n<div class="nyx-bg-beams animated"> … </div>\n\n<!-- size the tiled patterns -->\n<div class="nyx-bg-dots" style="--nyx-bg-cell:18px"> … </div>\n\n<!-- stack the grain on top of another effect -->\n<div class="nyx-bg-mesh nyx-bg-noise"> … </div>\n\n<!-- squares need the runtime to wire the pointer -->\n<script src="nyx.js"></script>   <!-- or Nyx.init(container) after render -->' }
      ],
      classes: [
        ['nyx-bg-grid', 'Masked grid lines.'],
        ['nyx-bg-dots', 'Masked dot grid.'],
        ['nyx-bg-mesh', 'Static layered accent mesh gradient.'],
        ['nyx-bg-gradient (+.animated)', 'Two-tone gradient surface; .animated pans it.'],
        ['nyx-bg-beams (+.animated)', 'Conic light rays; .animated sweeps them.'],
        ['nyx-bg-noise', 'Film-grain overlay (::after) — stack on any other bg.'],
        ['nyx-bg-squares', 'Interactive hover-lit grid (needs Nyx.init).'],
        ['nyx-bg-stars', 'Drifting parallax starfield.'],
        ['--nyx-bg-cell', 'Tile size for grid / dots / squares.']
      ]
    },

    /* ===== CHARTS ===== */
    {
      id: 'charts', group: 'Components', title: 'Charts', added: 'v1.0',
      summary: 'Zero-dependency data viz. Bars are pure CSS — set --nyx-bar:0–100 on each bar. Line & area charts style an author-supplied <svg> (same approach as the meter). Donut & pie are just a conic-gradient you set inline. Everything is accent-driven and reduced-motion safe.',
      sections: [
        { title: 'Bar chart', text: 'Set --nyx-bar (0–100) per bar; add data-label and data-val (the value shows on hover). Use .alt for a second accent and .muted to de-emphasise.', demo: '<div class="nyx-chart-bars" style="--nyx-chart-h:170px"><div class="nyx-bar" style="--nyx-bar:48" data-label="Mon" data-val="48"></div><div class="nyx-bar" style="--nyx-bar:72" data-label="Tue" data-val="72"></div><div class="nyx-bar alt" style="--nyx-bar:61" data-label="Wed" data-val="61"></div><div class="nyx-bar" style="--nyx-bar:88" data-label="Thu" data-val="88"></div><div class="nyx-bar" style="--nyx-bar:54" data-label="Fri" data-val="54"></div><div class="nyx-bar muted" style="--nyx-bar:33" data-label="Sat" data-val="33"></div><div class="nyx-bar muted" style="--nyx-bar:40" data-label="Sun" data-val="40"></div></div>' },
        { title: 'Line & area', text: 'Style a hand-authored <svg>: .nyx-line for the stroke, .nyx-area for the fill (give it a linearGradient with id nyxArea), .nyx-dot for points, .nyx-grid for guides.', demo: '<svg class="nyx-chart-line" viewBox="0 0 320 140" role="img" aria-label="Weekly trend"><defs><linearGradient id="nyxArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6c63ff" stop-opacity="0.35"/><stop offset="1" stop-color="#6c63ff" stop-opacity="0"/></linearGradient></defs><line class="nyx-grid" x1="0" y1="35" x2="320" y2="35"/><line class="nyx-grid" x1="0" y1="70" x2="320" y2="70"/><line class="nyx-grid" x1="0" y1="105" x2="320" y2="105"/><polygon class="nyx-area" points="10,140 10,110 60,70 110,90 160,40 210,75 260,30 310,55 310,140"/><polyline class="nyx-line" points="10,110 60,70 110,90 160,40 210,75 260,30 310,55"/><circle class="nyx-dot" cx="10" cy="110" r="3.5"/><circle class="nyx-dot" cx="60" cy="70" r="3.5"/><circle class="nyx-dot" cx="110" cy="90" r="3.5"/><circle class="nyx-dot" cx="160" cy="40" r="3.5"/><circle class="nyx-dot" cx="210" cy="75" r="3.5"/><circle class="nyx-dot" cx="260" cy="30" r="3.5"/><circle class="nyx-dot" cx="310" cy="55" r="3.5"/></svg>' },
        { title: 'Donut, pie & legend', text: 'Set the slices as an inline conic-gradient. Wrap a donut in .nyx-donut to center a value. Legends colour each dot with --nyx-legend-c.', demo: '<div class="nyx-flex nyx-gap-5 nyx-items-center nyx-wrap"><div class="nyx-donut"><div class="nyx-chart-donut" style="background:conic-gradient(var(--nyx-accent) 0 62%,var(--nyx-accent-2) 62% 84%,var(--nyx-surface-2) 84%)"></div><span class="nyx-donut-val">62%</span></div><div class="nyx-chart-pie" style="background:conic-gradient(var(--nyx-accent) 0 45%,var(--nyx-accent-2) 45% 72%,var(--nyx-warning) 72% 88%,var(--nyx-surface-2) 88%)"></div><div class="nyx-chart-legend"><span class="nyx-legend">Direct</span><span class="nyx-legend" style="--nyx-legend-c:var(--nyx-accent-2)">Referral</span><span class="nyx-legend" style="--nyx-legend-c:var(--nyx-warning)">Social</span><span class="nyx-legend" style="--nyx-legend-c:var(--nyx-surface-2)">Other</span></div></div>' },
        { title: 'Semicircle gauge', text: 'Set --nyx-gauge (0–100); size with --nyx-gauge-size.', demo: '<div class="nyx-flex nyx-gap-6 nyx-items-end nyx-wrap"><div class="nyx-gauge" style="--nyx-gauge:68"><span class="nyx-gauge-val">68%</span></div><div class="nyx-gauge" style="--nyx-gauge:91;--nyx-gauge-size:140px"><span class="nyx-gauge-val">91</span></div></div>' },
        { title: 'Radial meter (SVG)', text: 'A full ring from a hand-authored <svg> with a gradient stroke (id nyxMeterGrad). The value = (circumference − dashoffset) / circumference.', demo: '<div class="nyx-meter" style="width:128px;height:128px"><svg viewBox="0 0 120 120" width="128" height="128"><defs><linearGradient id="nyxMeterGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6c63ff"/><stop offset="1" stop-color="#00d4aa"/></linearGradient></defs><circle class="nyx-meter-track" cx="60" cy="60" r="52"/><circle class="nyx-meter-fill" cx="60" cy="60" r="52" stroke-dasharray="327" stroke-dashoffset="92"/></svg><span class="nyx-meter-val">72%</span></div>' },
        { title: 'Sparkline', text: 'A tiny inline trend — set each span height inline. Great inside stat cards and tables.', demo: '<span class="nyx-sparkline"><span style="height:40%"></span><span style="height:65%"></span><span style="height:50%"></span><span style="height:80%"></span><span style="height:60%"></span><span style="height:95%"></span><span style="height:72%"></span><span style="height:88%"></span></span>' },
        { title: 'Bar markup', lang: 'html', code: '<div class="nyx-chart-bars" style="--nyx-chart-h:170px">\n  <div class="nyx-bar"     style="--nyx-bar:72" data-label="Tue" data-val="72"></div>\n  <div class="nyx-bar alt" style="--nyx-bar:61" data-label="Wed" data-val="61"></div>\n  <div class="nyx-bar muted" style="--nyx-bar:33" data-label="Sat" data-val="33"></div>\n</div>\n\n<!-- donut: a conic-gradient + a centered value -->\n<div class="nyx-donut">\n  <div class="nyx-chart-donut"\n       style="background:conic-gradient(var(--nyx-accent) 0 62%,var(--nyx-surface-2) 62%)"></div>\n  <span class="nyx-donut-val">62%</span>\n</div>' }
      ],
      classes: [
        ['nyx-chart-bars', 'Bar-chart track; size with --nyx-chart-h, gap with --nyx-bar-gap.'],
        ['nyx-bar', 'A bar — set --nyx-bar:0–100; data-label / data-val. +.alt / .muted.'],
        ['nyx-chart-line', 'Styles an <svg>: .nyx-line / .nyx-area / .nyx-dot / .nyx-grid.'],
        ['nyx-chart-donut / -pie', 'Conic-gradient ring / pie (set background inline; --nyx-pie-size, --nyx-donut-w).'],
        ['nyx-donut + .nyx-donut-val', 'Center a value label inside a donut.'],
        ['nyx-chart-legend > .nyx-legend', 'Legend; colour each with --nyx-legend-c.'],
        ['nyx-gauge + .nyx-gauge-val', 'Semicircle gauge; set --nyx-gauge 0–100.'],
        ['nyx-meter (SVG)', 'Radial ring; gradient stroke via nyxMeterGrad.'],
        ['nyx-sparkline', 'Inline micro bar-trend (heights set inline).']
      ]
    },

    /* ===== CODE BLOCK ===== */
    {
      id: 'code-block', group: 'Components', title: 'Code block', added: 'v1.0',
      summary: 'A titled code window with traffic-light dots, a filename, syntax tokens and a one-tap copy button. Wrap snippets in nyx-tok-* spans; the tag / attr / str / comment colours follow the accent so your code samples retheme too.',
      sections: [
        { title: 'With copy button', text: 'The copy button uses data-nyx-copy — the runtime copies the block and toasts. Click it.', demo: '<div class="nyx-code-block"><div class="nyx-code-bar"><span class="nyx-dot r"></span><span class="nyx-dot y"></span><span class="nyx-dot g"></span><span class="nyx-code-name">button.html</span><button class="nyx-code-copy" data-nyx-copy aria-label="Copy code" style="width:auto;padding:0 10px;font-size:11px;font-family:var(--nyx-font-mono)">copy</button></div><pre><code><span class="nyx-tok-comment">&lt;!-- a primary button --&gt;</span>\n<span class="nyx-tok-tag">&lt;button</span> <span class="nyx-tok-attr">class</span>=<span class="nyx-tok-str">"nyx-btn nyx-btn-primary"</span><span class="nyx-tok-tag">&gt;</span>Save<span class="nyx-tok-tag">&lt;/button&gt;</span></code></pre></div>' },
        { title: 'Markup', lang: 'html', code: '<div class="nyx-code-block">\n  <div class="nyx-code-bar">\n    <span class="nyx-dot r"></span><span class="nyx-dot y"></span><span class="nyx-dot g"></span>\n    <span class="nyx-code-name">index.html</span>\n    <button class="nyx-code-copy" data-nyx-copy aria-label="Copy">Copy</button>\n  </div>\n  <pre><code><!-- wrap text in nyx-tok-tag / -attr / -str / -comment / -kw / -fn / -num -->\n  </code></pre>\n</div>' },
        { title: 'Copy a different target', lang: 'html', code: '<!-- no value = copy this block; or point at any element -->\n<button class="nyx-btn nyx-btn-ghost" data-nyx-copy="#snippet">Copy snippet</button>' }
      ],
      classes: [
        ['nyx-code-block', 'Code window container.'],
        ['nyx-code-bar + .nyx-dot(.r/.y/.g) + .nyx-code-name', 'Title bar: traffic lights + filename.'],
        ['nyx-code-copy [data-nyx-copy]', 'Copy button (empty = this block; or data-nyx-copy="#sel").'],
        ['nyx-tok-tag / -attr / -str / -comment / -kw / -fn / -num', 'Syntax tokens; tag/attr/str/comment follow the accent.']
      ]
    },

    /* ===== BLOCKS (v1.0) ===== */
    {
      id: 'chat', group: 'Components', title: 'Chat bubbles', added: 'v1.0',
      summary: 'Message bubbles for chat & AI UIs — received and sent variants, timestamps and a typing indicator. RTL-aware (sent bubbles flip to the correct side automatically).',
      sections: [
        { title: 'Conversation', demo: '<div class="nyx-chat" style="max-width:440px"><div class="nyx-bubble">How do I start with Nyx?<span class="nyx-bubble-meta">10:02</span></div><div class="nyx-bubble sent">Add two files and you are live ✨<span class="nyx-bubble-meta">10:03</span></div><div class="nyx-typing"><i></i><i></i><i></i></div></div>' }
      ],
      classes: [['nyx-chat', 'Vertical stack.'], ['nyx-bubble (+.sent)', 'Received / sent bubble.'], ['nyx-bubble-meta', 'Timestamp line.'], ['nyx-typing', 'Animated typing indicator (3 dots).']]
    },
    {
      id: 'slider', group: 'Components', title: 'Range slider', added: 'v1.0',
      summary: 'A styled range input with an accent-filled track and a glowing thumb. The runtime fills the track from the value/min/max and updates it live on drag. Point data-output at any element (with optional data-prefix / data-suffix) to mirror the value live.',
      sections: [
        { title: 'Slider', demo: '<input type="range" class="nyx-slider" min="0" max="100" value="65" aria-label="Volume">' },
        { title: 'Markup', lang: 'html', code: '<input type="range" class="nyx-slider" min="0" max="100" value="65">\n<!-- nyx.js fills the track; or set it statically with style="--nyx-slider:65" -->' }
      ],
      classes: [['nyx-slider', 'Styled range input; runtime sets --nyx-slider (0–100) for the fill.']]
    },
    {
      id: 'steps', group: 'Components', title: 'Steps / wizard', added: 'v1.0',
      summary: 'A horizontal step indicator for checkout and onboarding flows. Auto-numbered; mark steps .done (check) or .current (glowing).',
      sections: [
        { title: 'Flow', demo: '<div class="nyx-steps"><div class="nyx-step done">Cart</div><div class="nyx-step done">Shipping</div><div class="nyx-step current">Payment</div><div class="nyx-step">Review</div></div>' }
      ],
      classes: [['nyx-steps', 'Step rail (auto-numbers via counters).'], ['nyx-step (+.done / .current)', 'A step; done shows a check, current glows.']]
    },
    {
      id: 'testimonial', group: 'Components', title: 'Testimonial', added: 'v1.0',
      summary: 'A quote card with a decorative quote mark, author avatar + role, and an optional rating.',
      sections: [
        { title: 'Quote', demo: '<div class="nyx-testimonial" style="max-width:520px"><p class="nyx-quote">Nyx let us ship a polished, RTL-ready dashboard in a single weekend.</p><div class="nyx-cite"><span class="nyx-avatar">L</span><div><b>Layla H.</b><span>Frontend lead</span></div><span style="margin-inline-start:auto;color:var(--nyx-warning)">★★★★★</span></div></div>' }
      ],
      classes: [['nyx-testimonial', 'Quote card.'], ['nyx-quote', 'Quote text (adds a decorative “).'], ['nyx-cite', 'Author row (avatar + name + role).']]
    },
    {
      id: 'pricing', group: 'Components', title: 'Pricing table', added: 'v1.0',
      summary: 'Tiered pricing cards with a highlighted .featured tier, gradient price, check-marked feature lists and a corner badge.',
      sections: [
        { title: 'Tiers', demo: '<div class="nyx-pricing"><div class="nyx-price-card"><div class="nyx-price-name">Starter</div><div class="nyx-price">$0<small>/mo</small></div><ul class="nyx-price-feat"><li>Up to 3 projects</li><li>Community support</li></ul><a class="nyx-btn nyx-btn-secondary">Choose</a></div><div class="nyx-price-card featured"><span class="nyx-price-tag nyx-badge nyx-badge-info">Popular</span><div class="nyx-price-name">Pro</div><div class="nyx-price">$19<small>/mo</small></div><ul class="nyx-price-feat"><li>Unlimited projects</li><li>Priority support</li><li>Advanced analytics</li></ul><a class="nyx-btn nyx-btn-primary">Choose</a></div><div class="nyx-price-card"><div class="nyx-price-name">Team</div><div class="nyx-price">$49<small>/mo</small></div><ul class="nyx-price-feat"><li>SSO &amp; roles</li><li>Audit log</li></ul><a class="nyx-btn nyx-btn-secondary">Choose</a></div></div>' }
      ],
      classes: [['nyx-pricing', 'Responsive tier grid.'], ['nyx-price-card (+.featured)', 'A tier; featured is highlighted + scaled.'], ['nyx-price', 'Amount (gradient on featured).'], ['nyx-price-name / -feat / -tag', 'Tier name, feature list, corner badge.']]
    },
    {
      id: 'kanban', group: 'Components', title: 'Kanban board', added: 'v1.0', needsJs: true,
      summary: 'Horizontally-scrolling columns of cards for boards and pipelines. Cards are drag-and-drop — reorder within a column or move across columns (the runtime wires it). RTL flips the column order automatically.',
      sections: [
        { title: 'Board', demo: '<div class="nyx-kanban"><div class="nyx-kanban-col"><h4>To do <span class="nyx-badge">2</span></h4><div class="nyx-kanban-card">Design tokens</div><div class="nyx-kanban-card">RTL audit</div></div><div class="nyx-kanban-col"><h4>In progress <span class="nyx-badge">1</span></h4><div class="nyx-kanban-card">Charts module</div></div><div class="nyx-kanban-col"><h4>Done <span class="nyx-badge">1</span></h4><div class="nyx-kanban-card">Backgrounds</div></div></div>' },
        { title: 'JavaScript Events', text: 'Listen for cards being moved / reordered on the board.', lang: 'js', code: 'document.addEventListener(\'nyx:kanban-move\', (e) => {\n  console.log(\'Card moved:\', e.target);\n  console.log(\'New column:\', e.target.parentElement);\n});' }
      ],
      classes: [['nyx-kanban', 'Scrollable column row (runtime enables drag-and-drop).'], ['nyx-kanban-col', 'A column (header + cards); highlights as a drop target.'], ['nyx-kanban-card', 'A card you can drag between columns.']],
      js: [
        ['Event: nyx:kanban-move', 'Dispatched on the dragged card element when it is dropped/moved.']
      ]
    },
    {
      id: 'notifications', group: 'Components', title: 'Notifications', added: 'v1.0',
      summary: 'A notification / activity feed — icon, message, timestamp, and an .unread state with an accent tint and dot.',
      sections: [
        { title: 'Feed', demo: '<div class="nyx-notif nyx-card" style="max-width:460px;padding:0;overflow:hidden"><div class="nyx-notif-item unread"><span class="nyx-notif-ico">✦</span><div class="nyx-notif-body"><p>New sign-up from <b>Cairo</b></p><div class="nyx-notif-time">2m ago</div></div></div><div class="nyx-notif-item"><span class="nyx-notif-ico">↑</span><div class="nyx-notif-body"><p>MRR is up 12% this week</p><div class="nyx-notif-time">1h ago</div></div></div></div>' }
      ],
      classes: [['nyx-notif', 'Feed wrapper.'], ['nyx-notif-item (+.unread)', 'A row; unread is tinted with a dot.'], ['nyx-notif-ico / -body / -time', 'Icon, message, timestamp.']]
    },

    /* ===== NEW IN v1.0 ===== */
    {
      id: 'progress-ring', group: 'Components', title: 'Progress ring', added: 'v1.0',
      summary: 'A circular progress indicator from a single conic-gradient — set --nyx-ring (0–100), --nyx-ring-size and --nyx-ring-w. No SVG. For an SVG ring with a gradient stroke, see the radial meter on the Charts page.',
      sections: [
        { title: 'Rings', demo: '<div class="nyx-flex nyx-gap-5 nyx-items-center nyx-wrap"><div class="nyx-progress-ring" style="--nyx-ring:72"><span>72%</span></div><div class="nyx-progress-ring" style="--nyx-ring:40;--nyx-ring-size:96px"><span class="nyx-text-lg">40%</span></div><div class="nyx-progress-ring" style="--nyx-ring:100;--nyx-ring-size:72px;--nyx-ring-w:9px"><span class="nyx-text-accent-2">✓</span></div></div>' }
      ],
      classes: [['nyx-progress-ring', 'Conic ring; set --nyx-ring 0–100.'], ['--nyx-ring-size / --nyx-ring-w', 'Diameter / track thickness.']]
    },
    {
      id: 'heatmap', group: 'Components', title: 'Heatmap', added: 'v1.0',
      summary: 'A GitHub-style contribution graph — 7 rows (days) by 52 columns (weeks). Wrapped in an optional labeled, interactive container with weekday and month titles, hover zoom effects, and zero-dependency CSS tooltips.',
      sections: [
        {
          title: 'Labeled Activity Heatmap',
          demo: '<div class="nyx-heatmap-container">' +
                '  <div class="nyx-heatmap-header">' +
                '    <div class="nyx-heatmap-title">Contribution History</div>' +
                '    <div class="nyx-heatmap-legend">' +
                '      <span>Less</span>' +
                '      <i data-l="0"></i>' +
                '      <i data-l="1" style="background:color-mix(in srgb,var(--nyx-accent) 28%,var(--nyx-surface-2))"></i>' +
                '      <i data-l="2" style="background:color-mix(in srgb,var(--nyx-accent) 52%,var(--nyx-surface-2))"></i>' +
                '      <i data-l="3" style="background:color-mix(in srgb,var(--nyx-accent) 78%,var(--nyx-surface-2))"></i>' +
                '      <i data-l="4" style="background:var(--nyx-accent)"></i>' +
                '      <span>More</span>' +
                '    </div>' +
                '  </div>' +
                '  <div class="nyx-heatmap-grid-wrapper">' +
                '    <div class="nyx-heatmap-weekdays"><div></div><div>Mon</div><div></div><div>Wed</div><div></div><div>Fri</div><div></div></div>' +
                '    <div class="nyx-heatmap-body">' +
                '      <div class="nyx-heatmap-months">' +
                '        <span style="grid-column: span 4">Jan</span>' +
                '        <span style="grid-column: span 4">Feb</span>' +
                '        <span style="grid-column: span 5">Mar</span>' +
                '        <span style="grid-column: span 4">Apr</span>' +
                '        <span style="grid-column: span 4">May</span>' +
                '        <span style="grid-column: span 5">Jun</span>' +
                '        <span style="grid-column: span 4">Jul</span>' +
                '        <span style="grid-column: span 4">Aug</span>' +
                '        <span style="grid-column: span 5">Sep</span>' +
                '        <span style="grid-column: span 4">Oct</span>' +
                '        <span style="grid-column: span 4">Nov</span>' +
                '        <span style="grid-column: span 5">Dec</span>' +
                '      </div>' +
                '      <div class="nyx-heatmap">' +
                (function() {
                  var cells = [], levels = [2,0,1,3,4,1,0,1,2,4,2,0,3,1,0,1,1,4,3,2,0,3,2,0,1,4,1,2,1,0,3,2,1,4,0,2,4,1,0,2,3,1,0,1,2,3,1,0,4,4,2,1,3,0,1,2,1,3,2,0,4,1,0,2,0,1,4,2,3,1];
                  for (var i = 0; i < 364; i++) {
                    var l = levels[i % levels.length];
                    cells.push('<i data-l="' + l + '" data-tooltip="Day ' + (i+1) + ': ' + (l * 3) + ' contributions"></i>');
                  }
                  return cells.join('');
                })() +
                '      </div>' +
                '    </div>' +
                '  </div>' +
                '</div>',
          code: '<div class="nyx-heatmap-container">\n  <div class="nyx-heatmap-header">\n    <div class="nyx-heatmap-title">Contributions</div>\n    <div class="nyx-heatmap-legend">\n      <span>Less</span>\n      <i data-l="0"></i>\n      <i data-l="1"></i>\n      <i data-l="2"></i>\n      <i data-l="3"></i>\n      <i data-l="4"></i>\n      <span>More</span>\n    </div>\n  </div>\n  <div class="nyx-heatmap-grid-wrapper">\n    <div class="nyx-heatmap-weekdays">\n      <div></div><div>Mon</div><div></div><div>Wed</div><div></div><div>Fri</div><div></div>\n    </div>\n    <div class="nyx-heatmap-body">\n      <div class="nyx-heatmap-months">\n        <span style="grid-column: span 4">Jan</span>\n        <span style="grid-column: span 4">Feb</span>\n        <span style="grid-column: span 5">Mar</span> …\n      </div>\n      <div class="nyx-heatmap">\n        <i data-l="2" data-tooltip="Day 1: 6 contributions"></i>\n        <!-- 364 cells (52 weeks) -->\n      </div>\n    </div>\n  </div>\n</div>'
        }
      ],
      classes: [
        ['nyx-heatmap-container', 'Main wrapper; holds title, legend, and grid.'],
        ['nyx-heatmap-weekdays / -months', 'Skins for labels aligning correctly with rows/columns.'],
        ['nyx-heatmap', '7-row grid; columns flow automatically.'],
        ['i[data-tooltip]', 'Add a tooltip description displayed on hover.']
      ]
    },
    {
      id: 'stat-card', group: 'Components', title: 'Stat card', added: 'v1.0',
      summary: 'A KPI tile with a big tabular number, an up/down delta pill and an optional sparkline.',
      sections: [
        { title: 'Metrics', demo: '<div class="nyx-flex nyx-gap-4 nyx-wrap"><div class="nyx-stat-card" style="flex:1 1 220px"><div class="nyx-stat-top"><span class="nyx-stat-label">Revenue</span><span class="nyx-stat-delta up">▲ 12.4%</span></div><div class="nyx-stat-num">$48,250</div><span class="nyx-sparkline"><span style="height:40%"></span><span style="height:55%"></span><span style="height:48%"></span><span style="height:70%"></span><span style="height:62%"></span><span style="height:85%"></span><span style="height:78%"></span><span style="height:96%"></span></span></div><div class="nyx-stat-card" style="flex:1 1 220px"><div class="nyx-stat-top"><span class="nyx-stat-label">Churn</span><span class="nyx-stat-delta down">▼ 0.6%</span></div><div class="nyx-stat-num">1.8%</div><span class="nyx-sparkline"><span style="height:90%"></span><span style="height:80%"></span><span style="height:85%"></span><span style="height:60%"></span><span style="height:65%"></span><span style="height:45%"></span><span style="height:50%"></span><span style="height:38%"></span></span></div></div>' }
      ],
      classes: [['nyx-stat-card', 'KPI tile (header + number + sparkline).'], ['nyx-stat-num', 'Big tabular figure.'], ['nyx-stat-delta (+.up / .down)', 'Trend pill.']]
    },
    {
      id: 'description-list', group: 'Components', title: 'Description list', added: 'v1.0',
      summary: 'A two-column term/value list (dl/dt/dd) for spec sheets, profiles and order summaries. Add .divided for ruled rows.',
      sections: [
        { title: 'Details', demo: '<dl class="nyx-dl divided" style="max-width:420px"><dt>Plan</dt><dd>Enterprise</dd><dt>Seats</dt><dd>240</dd><dt>Renews</dt><dd>12 Mar 2027</dd><dt>Owner</dt><dd>layla@example.com</dd></dl>' }
      ],
      classes: [['nyx-dl', 'Grid of dt (term) + dd (value).'], ['.divided', 'Adds a rule under each row.']]
    },
    {
      id: 'skeleton', group: 'Components', title: 'Skeleton', added: 'v1.0',
      summary: 'Shimmering placeholders for loading states. Compose the .nyx-skeleton shimmer with shape helpers, or use the ready-made card and list presets.',
      sections: [
        { title: 'Card', demo: '<div class="nyx-skeleton-card" style="max-width:300px"><div class="nyx-skeleton nyx-skeleton-media"></div><div class="nyx-skeleton nyx-skeleton-text w-60"></div><div class="nyx-skeleton nyx-skeleton-text"></div><div class="nyx-skeleton nyx-skeleton-text w-80"></div></div>' },
        { title: 'List rows', demo: '<div class="nyx-stack nyx-gap-4" style="max-width:340px"><div class="nyx-skeleton-row"><div class="nyx-skeleton nyx-skeleton-circle"></div><div class="nyx-skeleton-lines"><div class="nyx-skeleton nyx-skeleton-text w-60"></div><div class="nyx-skeleton nyx-skeleton-text w-40"></div></div></div><div class="nyx-skeleton-row"><div class="nyx-skeleton nyx-skeleton-circle"></div><div class="nyx-skeleton-lines"><div class="nyx-skeleton nyx-skeleton-text w-80"></div><div class="nyx-skeleton nyx-skeleton-text w-40"></div></div></div></div>' }
      ],
      classes: [['nyx-skeleton', 'The shimmer base (combine with a shape).'], ['nyx-skeleton-text (+.w-40 / 60 / 80)', 'Text line at a width.'], ['nyx-skeleton-circle / -media', 'Avatar dot / image block.'], ['nyx-skeleton-card / -row / -lines', 'Card and list-row scaffolds.']]
    },
    {
      id: 'image', group: 'Components', title: 'Image', added: 'v1.0', needsJs: true,
      summary: 'Responsive image component with built-in aspect ratios, lazy loading, and placeholder shimmers until the image loads.',
      sections: [
        { title: 'Responsive 16:9', demo: '<div class="nyx-image nyx-image--ratio-16-9" data-loaded="false" style="width: 300px;"><div class="nyx-image__placeholder" aria-hidden="true"></div><img alt="Demo" src="https://picsum.photos/300/168" loading="lazy" decoding="async"></div>' }
      ],
      classes: [['nyx-image', 'Image wrapper container.'], ['nyx-image--ratio-16-9', 'Aspect ratio modifier (16-9, 1-1, 4-3).'], ['nyx-image__placeholder', 'Animated placeholder state.'], ['data-loaded="true"', 'Hides the placeholder once the image loads natively.']],
      js: [
        ['Image Load handler', 'The runtime listens to native load events on the inner image, then sets data-loaded="true" on the parent container to dismiss the shimmer.']
      ]
    },
    {
      id: 'responsive-nav', group: 'Components', title: 'Responsive Nav', added: 'v1.0', needsJs: true,
      summary: 'A fully responsive navigation bar with a mobile hamburger toggle and an embedded hover/focus-driven mega menu panel.',
      sections: [
        { title: 'Interactive Navbar', demo: '<div style="transform:scale(0.8);transform-origin:top left;width:125%;border:1px solid var(--nyx-border);border-radius:var(--nyx-radius)"><header class="nyx-nav" data-open="false"><div class="brand">Brand</div><button class="nav-toggle" aria-expanded="false">☰</button><nav class="nav-links"><a href="#/">Home</a><div class="nyx-mega"><a href="#/">Products ▾</a><div class="mega-panel"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><a href="#/">Store</a><a href="#/">Docs</a></div></div></div><a href="#/">Contact</a></nav></header></div>' }
      ],
      classes: [['nyx-nav', 'The main navbar wrapper.'], ['.nav-toggle', 'Mobile hamburger button.'], ['.nav-links', 'The inline or dropdown links container.'], ['nyx-mega', 'Wrapper for a mega menu.'], ['.mega-panel', 'The mega dropdown pane.']],
      js: [
        ['Navbar toggling', 'The runtime wires click triggers on the .nav-toggle button to alternate the header [data-open="true|false"] attribute on mobile screens.']
      ]
    },
    {
      id: 'bottom-nav', group: 'Components', title: 'Bottom navigation', added: 'v1.0',
      summary: 'A mobile tab bar — icon over label, with an active state. Add .fixed to pin it to the bottom of the viewport (it mirrors in RTL automatically).',
      sections: [
        { title: 'Tab bar', demo: '<nav class="nyx-bottom-nav" style="max-width:380px"><a href="#/bottom-nav" class="active"><span class="ico">🏠</span> Home</a><a href="#/bottom-nav"><span class="ico">🔍</span> Search</a><a href="#/bottom-nav"><span class="ico">🔔</span> Alerts</a><a href="#/bottom-nav"><span class="ico">👤</span> Profile</a></nav>' }
      ],
      classes: [['nyx-bottom-nav', 'Flex tab bar; .fixed pins it to the bottom.'], ['a / button (+.active)', 'A destination; .active is accented.'], ['.ico', 'The icon line above the label.']]
    },
    {
      id: 'mega-menu', group: 'Components', title: 'Mega menu', added: 'v1.0',
      summary: 'A wide multi-column dropdown panel that opens on hover or keyboard focus — for grouping a lot of navigation in one place.',
      sections: [
        { title: 'Products menu', demo: '<div class="nyx-megamenu"><button class="nyx-btn nyx-btn-glass">Products ▾</button><div class="nyx-megamenu-panel"><div class="nyx-megamenu-col"><h5>Build</h5><a href="#/mega-menu">Components</a><a href="#/mega-menu">Templates</a><a href="#/mega-menu">Icons</a></div><div class="nyx-megamenu-col"><h5>Learn</h5><a href="#/mega-menu">Docs</a><a href="#/mega-menu">Guides</a><a href="#/mega-menu">Changelog</a></div><div class="nyx-megamenu-col"><h5>Company</h5><a href="#/mega-menu">About</a><a href="#/mega-menu">Blog</a><a href="#/mega-menu">Careers</a></div></div></div>' }
      ],
      classes: [['nyx-megamenu', 'Hover / focus wrapper.'], ['nyx-megamenu-panel', 'The dropdown grid panel.'], ['nyx-megamenu-col + h5', 'A column with a heading.']]
    },
    {
      id: 'snackbar', group: 'Components', title: 'Snackbar', added: 'v1.0', needsJs: true,
      summary: 'A brief bottom-centered message with an optional action button — call Nyx.snackbar(message, options). Auto-dismisses unless you pass duration: 0.',
      sections: [
        { title: 'Show one', demo: '<div class="nyx-flex nyx-gap-3 nyx-wrap"><button class="nyx-btn nyx-btn-primary" onclick="Nyx.snackbar(&#39;Message sent.&#39;)">Simple</button><button class="nyx-btn nyx-btn-secondary" onclick="Nyx.snackbar(&#39;Conversation archived.&#39;,{action:&#39;Undo&#39;,onAction:function(){Nyx.toast(&#39;Restored&#39;,&#39;success&#39;)}})">With action</button></div>', lang: 'js', code: "Nyx.snackbar('Conversation archived.', {\n  action: 'Undo',\n  onAction: () => restore(),\n  duration: 4500   // ms; 0 = sticky\n});" }
      ],
      classes: [['Nyx.snackbar(msg, opts)', 'Imperative API: { action, onAction, duration }.'], ['nyx-snackbar', 'The element (styling hook).']],
      js: [
        ['Nyx.snackbar(msg, opts)', 'Displays a snackbar message. Options: { action, onAction, duration }. Returns the snackbar DOM element.'],
        ['snackbar.dismiss()', 'Calling dismiss() on the returned element fades and removes it.']
      ]
    },
    {
      id: 'confirm', group: 'Components', title: 'Confirm dialog', added: 'v1.0', needsJs: true,
      summary: 'A promise-based confirmation modal — Nyx.confirm(message, options) resolves to true or false. Esc or an outside click counts as cancel.',
      sections: [
        { title: 'Ask first', demo: '<div class="nyx-flex nyx-gap-3 nyx-wrap"><button class="nyx-btn nyx-btn-primary" onclick="Nyx.confirm(&#39;Publish these changes now?&#39;,{title:&#39;Publish&#39;}).then(function(ok){Nyx.toast(ok?&#39;Published&#39;:&#39;Cancelled&#39;,ok?&#39;success&#39;:&#39;info&#39;)})">Publish…</button><button class="nyx-btn nyx-btn-glass" onclick="Nyx.confirm(&#39;Delete this project? This cannot be undone.&#39;,{title:&#39;Delete project&#39;,danger:true,confirmText:&#39;Delete&#39;}).then(function(ok){if(ok)Nyx.toast(&#39;Deleted&#39;,&#39;danger&#39;)})">Delete…</button></div>', lang: 'js', code: "const ok = await Nyx.confirm('Delete this project?', {\n  title: 'Delete project',\n  danger: true,\n  confirmText: 'Delete'\n});\nif (ok) remove();" }
      ],
      classes: [['Nyx.confirm(msg, opts)', 'Returns Promise<boolean>: { title, confirmText, cancelText, danger }.']],
      js: [
        ['Nyx.confirm(message, options)', 'Renders a confirmation modal dialog. Returns a Promise resolving to true (confirm clicked) or false (cancel/backdrop/Esc). Options: { title, confirmText, cancelText, danger }.']
      ]
    },
    {
      id: 'compare', group: 'Components', title: 'Before / after', added: 'v1.0', needsJs: true,
      summary: 'Drag the handle to wipe between two stacked images — great for edits, retouching and theme comparisons. The runtime wires the pointer drag.',
      sections: [
        { title: 'Drag the slider', demo: '<div class="nyx-compare" style="max-width:420px"><img class="nyx-compare-before" alt="before" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22420%22 height=%22260%22%3E%3Crect width=%22420%22 height=%22260%22 fill=%22%231a1a2e%22/%3E%3Ctext x=%2250%25%22 y=%2252%25%22 fill=%22%23888%22 font-family=%22sans-serif%22 font-size=%2228%22 text-anchor=%22middle%22%3EBefore%3C/text%3E%3C/svg%3E"><img class="nyx-compare-after" alt="after" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22420%22 height=%22260%22%3E%3Crect width=%22420%22 height=%22260%22 fill=%22%236c63ff%22/%3E%3Ctext x=%2250%25%22 y=%2252%25%22 fill=%22%23fff%22 font-family=%22sans-serif%22 font-size=%2228%22 text-anchor=%22middle%22%3EAfter%3C/text%3E%3C/svg%3E"><div class="nyx-compare-handle"></div></div>' }
      ],
      classes: [['nyx-compare', 'Wrapper of two images + a handle.'], ['nyx-compare-after', 'Top image, clipped to the slider.'], ['nyx-compare-handle', 'The draggable divider.']],
      js: [
        ['Slider dragging', 'The runtime handles pointermove and pointerdown listeners on the handle divider to calculate the percentage clip-path width dynamically.']
      ]
    },
    {
      id: 'lightbox', group: 'Components', title: 'Lightbox gallery', added: 'v1.0', needsJs: true,
      summary: 'A thumbnail grid that opens a fullscreen viewer on click — arrow keys or the on-screen controls step through, Esc or a backdrop click closes. Use data-full on each thumb for a higher-res source.',
      sections: [
        { title: 'Click a thumb', demo: '<div class="nyx-gallery" style="max-width:380px">' + ['%236c63ff','%2300d4aa','%23f5a623','%23e2406b','%231a1a2e','%233ad6c5'].map(function (c, i) { return '<img alt="image ' + (i + 1) + '" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22240%22 height=%22240%22%3E%3Crect width=%22240%22 height=%22240%22 fill=%22' + c + '%22/%3E%3C/svg%3E">'; }).join('') + '</div>', code: '<div class="nyx-gallery">\n  <img src="thumb1.jpg" data-full="full1.jpg" alt="">\n  <img src="thumb2.jpg" data-full="full2.jpg" alt="">\n</div>' }
      ],
      classes: [['nyx-gallery', 'Responsive thumb grid (runtime opens the lightbox).'], ['img[data-full]', 'Optional high-res source for the viewer.']],
      js: [
        ['Lightbox initialization', 'The runtime dynamically binds click listeners to child images of a .nyx-gallery, building a fullscreen lightbox with carousel navigation (.nyx-lightbox).']
      ]
    },
    {
      id: 'video', group: 'Components', title: 'Video facade', added: 'v1.0', needsJs: true,
      summary: 'A poster with a play button that swaps in the real iframe only on click — keeps pages fast by deferring the embed. Put the embed URL in data-embed.',
      sections: [
        { title: 'Click to play', demo: '<div class="nyx-video" data-embed="https://www.youtube.com/embed/aqz-KE-bpKQ" style="max-width:480px"><img alt="video poster" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22480%22 height=%22270%22%3E%3Crect width=%22480%22 height=%22270%22 fill=%22%231a1a2e%22/%3E%3Ctext x=%2250%25%22 y=%2252%25%22 fill=%22%23888%22 font-family=%22sans-serif%22 font-size=%2222%22 text-anchor=%22middle%22%3EPoster%3C/text%3E%3C/svg%3E"><button class="nyx-video-play" aria-label="play">▶</button></div>', code: '<div class="nyx-video" data-embed="https://www.youtube.com/embed/VIDEO_ID">\n  <img src="poster.jpg" alt="">\n  <button class="nyx-video-play" aria-label="play">▶</button>\n</div>' }
      ],
      classes: [['nyx-video[data-embed]', 'Facade; the embed URL loads on click.'], ['nyx-video-play', 'The play-button overlay.']],
      js: [
        ['Video play loading', 'The runtime listens to click actions on the facade, then builds and injects an <iframe> referencing the data-embed URL to replace the poster.']
      ]
    },
    {
      id: 'hijri-calendar', group: 'Regional', title: 'Hijri calendar', added: 'v1.0', needsJs: true,
      summary: 'A full Islamic (Umm al-Qura) month grid — add data-nyx-calendar="hijri" and the runtime computes the month with Intl, pages with ‹ ›, marks today, and localises month names + numerals to Arabic under dir="rtl".',
      sections: [
        { title: 'Hijri month', demo: '<div class="nyx-calendar" data-nyx-calendar="hijri"></div>' },
        { title: 'JavaScript Events', text: 'Listen for date selection updates on the Hijri calendar.', lang: 'js', code: 'const cal = document.querySelector(\'[data-nyx-calendar="hijri"]\');\ncal.addEventListener(\'nyx:date\', (e) => {\n  console.log(\'Selected Hijri date:\', e.detail); // e.detail is Gregorian YYYY-MM-DD string of selected cell\n});' }
      ],
      classes: [['data-nyx-calendar="hijri"', 'Live Umm al-Qura month (runtime-rendered).'], ['data-nyx-calendar', 'No value = a Gregorian month instead.']],
      js: [
        ['Event: nyx:date', 'Dispatched on selection changes. detail: YYYY-MM-DD string']
      ]
    },

    /* ===== REGIONAL (MENA) ===== */
    {
      id: 'prayer-times', group: 'Regional', title: 'Prayer times', added: 'v1.0', needsJs: true,
      summary: 'A row of the five daily prayers — add data-nyx-prayers and the runtime reads each data-time and glows whichever prayer is next from the device clock. A staple of MENA apps.',
      sections: [
        {
          title: 'Today (the next prayer is auto-highlighted)', demo:
            '<div class="nyx-prayer-times" data-nyx-prayers>' +
            '<div class="nyx-prayer" data-time="04:38"><span class="name">Fajr</span><span class="time">04:38</span></div>' +
            '<div class="nyx-prayer" data-time="12:09"><span class="name">Dhuhr</span><span class="time">12:09</span></div>' +
            '<div class="nyx-prayer" data-time="15:34"><span class="name">Asr</span><span class="time">15:34</span></div>' +
            '<div class="nyx-prayer" data-time="18:42"><span class="name">Maghrib</span><span class="time">18:42</span></div>' +
            '<div class="nyx-prayer" data-time="20:12"><span class="name">Isha</span><span class="time">20:12</span></div>' +
            '</div>'
        },
        { title: 'Arabic + Arabic-Indic numerals', text: 'Same component in RTL — data-time stays Western for parsing while data-nyx-numerals renders the display as ٠-٩.', demo: '<div dir="rtl" class="nyx-prayer-times" data-nyx-prayers><div class="nyx-prayer" data-time="04:38"><span class="name">الفجر</span><span class="time" data-nyx-numerals="arab">04:38</span></div><div class="nyx-prayer" data-time="12:09"><span class="name">الظهر</span><span class="time" data-nyx-numerals="arab">12:09</span></div><div class="nyx-prayer" data-time="15:34"><span class="name">العصر</span><span class="time" data-nyx-numerals="arab">15:34</span></div><div class="nyx-prayer" data-time="18:42"><span class="name">المغرب</span><span class="time" data-nyx-numerals="arab">18:42</span></div><div class="nyx-prayer" data-time="20:12"><span class="name">العشاء</span><span class="time" data-nyx-numerals="arab">20:12</span></div></div>' },
        { title: 'Markup', lang: 'html', code: '<div class="nyx-prayer-times" data-nyx-prayers>\n  <div class="nyx-prayer" data-time="04:38"><span class="name">Fajr</span><span class="time">04:38</span></div>\n  <!-- … the runtime adds .next to the upcoming prayer -->\n</div>' }
      ],
      classes: [['nyx-prayer-times[data-nyx-prayers]', 'Flex row; runtime highlights the next prayer.'], ['nyx-prayer[data-time="HH:MM"]', 'One prayer (.name + .time); data-time drives the logic.'], ['nyx-prayer next', 'Manual highlight if you don’t use the runtime.'], ['data-nyx-numerals="arab"', 'Runtime converts 0-9 to ٠-٩.']]
    },
    {
      id: 'hijri-date', group: 'Regional', title: 'Hijri date', added: 'v1.0',
      summary: 'Show the Hijri (Islamic) date alongside the Gregorian one — stacked or inline. You provide the values (e.g. from Intl.DateTimeFormat with the islamic calendar).',
      sections: [
        { title: 'Stacked', demo: '<div class="nyx-datepair"><span class="hijri">١٥ رمضان ١٤٤٦</span><span class="greg">2025-03-15</span></div>' },
        { title: 'Inline + badge', demo: '<div class="nyx-flex nyx-gap-4 nyx-items-center"><div class="nyx-datepair inline"><span class="hijri">15 Ramadan 1446</span><span class="greg">· 15 Mar 2025</span></div><span class="nyx-badge nyx-badge-info">رمضان كريم</span></div>' }
      ],
      classes: [['nyx-datepair', 'Stacked Hijri (.hijri) over Gregorian (.greg).'], ['nyx-datepair inline', 'Lay the two out on one line.']]
    },
    {
      id: 'numerals', group: 'Regional', title: 'Arabic-Indic numerals', added: 'v1.0', needsJs: true,
      summary: 'Convert Western digits 0-9 to Arabic-Indic ٠-٩ — add data-nyx-numerals="arab" and the runtime converts on init, or call Nyx.toArabicNumerals(value) yourself.',
      sections: [
        { title: 'Auto-convert', demo: '<div class="nyx-flex nyx-gap-5 nyx-wrap nyx-items-center"><span>Order <strong data-nyx-numerals="arab">#10482</strong></span><span class="nyx-badge nyx-badge-success" data-nyx-numerals="arab">2025</span></div>' },
        { title: 'Imperative (JS)', text: 'Call the helper directly to convert any string.', lang: 'js', code: "Nyx.toArabicNumerals('2025');  // => '٢٠٢٥'" }
      ],
      classes: [['data-nyx-numerals="arab"', 'Convert Western digits to Arabic-Indic on init.'], ['Nyx.toArabicNumerals(v)', 'Helper that returns the converted string.']],
      js: [
        ['Nyx.toArabicNumerals(str)', 'Utility method to translate ASCII digits 0-9 to Arabic-Indic glyphs ٠-٩.']
      ]
    },
    {
      id: 'countdown', group: 'Components', title: 'Countdown', added: 'v1.0', needsJs: true,
      summary: 'A live countdown to any deadline — product launches, flash sales, events, or Iftar/Suhoor. Use data-nyx-countdown="HH:MM" for a daily time (wraps to tomorrow if passed), or data-date="2026-12-31" (ISO date/datetime) for a fixed target. Add a 4th .unit for days and listen for nyx:countdown-done at zero. Add data-nyx-numerals="arab" for Arabic-Indic digits that persist as it ticks.',
      sections: [
        { title: 'Until Iftar', demo: '<div class="nyx-countdown" data-nyx-countdown="18:42"><div class="unit"><b>00</b><span>hrs</span></div><span class="sep">:</span><div class="unit"><b>00</b><span>min</span></div><span class="sep">:</span><div class="unit"><b>00</b><span>sec</span></div></div>' },
        { title: 'Fixed date (launch / sale)', text: 'data-date sets an absolute target; add a 4th .unit to show days.', demo: '<div class="nyx-countdown" data-date="2026-12-31T00:00"><div class="unit"><b>00</b><span>days</span></div><div class="unit"><b>00</b><span>hrs</span></div><div class="unit"><b>00</b><span>min</span></div><div class="unit"><b>00</b><span>sec</span></div></div>' },
      ],
      classes: [['nyx-countdown', 'The countdown wrapper.'], ['data-nyx-countdown="HH:MM"', 'Daily time target (today, or tomorrow if past).'], ['data-date', 'Absolute target — ISO date or datetime.'], ['.unit > b / span', 'Number / label; add a 4th .unit for days.']],
      js: [
        ['Event: nyx:countdown-done', 'Fired on the element when the countdown reaches zero (also adds .nyx-countdown-done).']
      ]
    },
    {
      id: 'zakat', group: 'Regional', title: 'Zakat calculator', added: 'v1.0', needsJs: true,
      summary: 'A live 2.5% calculator (override with data-rate). The amount is a text field with built-in numeric validation (digits + one decimal only); type eligible wealth and the due figure updates instantly. Add data-nisab="THRESHOLD" so no zakat is owed below the nisab — the widget gets a .nyx-below-nisab state and shows your optional .nyx-zakat-nisab-note.',
      sections: [
        { title: 'Calculate', demo: '<div class="nyx-zakat"><div><label class="nyx-label">Eligible wealth</label><div class="nyx-input-group"><span class="nyx-addon">ر.س</span><input class="nyx-input nyx-zakat-amount" type="text" inputmode="decimal" value="100000" aria-label="wealth"></div></div><div class="nyx-zakat-out"><span class="nyx-muted">Zakat due (2.5%)</span><b><span class="nyx-zakat-result">0</span> ر.س</b></div></div>' }
      ],
      classes: [['nyx-zakat', 'Wrapper (data-rate sets the %; default 2.5).'], ['nyx-zakat-amount', 'The amount input (runtime listens).'], ['nyx-zakat-result', 'Where the computed figure is written.']]
    },
    {
      id: 'qibla', group: 'Regional', title: 'Qibla indicator', added: 'v1.0', needsJs: true,
      summary: 'A compass dial whose needle points toward the Qibla. Give it data-coords="lat,lng" and the runtime computes the great-circle bearing to the Kaaba for you (or set data-nyx-qibla="degrees" directly). Also exposed as Nyx.qiblaBearing(lat, lng); pair with the Device Orientation API for a live compass.',
      sections: [
        { title: 'Bearing 119°', demo: '<div class="nyx-qibla" data-nyx-qibla="119"><span class="dir n">N</span><span class="dir e">E</span><span class="dir s">S</span><span class="dir w">W</span><span class="needle"></span><span class="kaaba">🕋</span><span class="hub"></span></div>' }
      ],
      classes: [['nyx-qibla[data-nyx-qibla]', 'Compass; runtime rotates the needle to the bearing.'], ['.needle / .kaaba / .dir', 'Pointer / Kaaba marker / N-E-S-W labels.']]
    },
    {
      id: 'delivery', group: 'Regional', title: 'Delivery tracking', added: 'v1.0',
      summary: 'A vertical order-tracking timeline — mark steps .done (completed) and .current (in progress). Common across MENA delivery and e-commerce apps.',
      sections: [
        { title: 'Order status', demo: '<div class="nyx-delivery"><div class="nyx-dstep done"><span class="nyx-ddot">✓</span><div class="nyx-dmeta"><div class="nyx-dtitle">Order placed</div><div class="nyx-dtime">10:24</div></div></div><div class="nyx-dstep done"><span class="nyx-ddot">✓</span><div class="nyx-dmeta"><div class="nyx-dtitle">Packed</div><div class="nyx-dtime">11:05</div></div></div><div class="nyx-dstep current"><span class="nyx-ddot">🚚</span><div class="nyx-dmeta"><div class="nyx-dtitle">Out for delivery</div><div class="nyx-dtime">12:30</div></div></div><div class="nyx-dstep"><span class="nyx-ddot">🏠</span><div class="nyx-dmeta"><div class="nyx-dtitle">Delivered</div><div class="nyx-dtime">—</div></div></div></div>' }
      ],
      classes: [['nyx-delivery', 'Vertical tracker.'], ['nyx-dstep done / current', 'A completed / in-progress step.'], ['nyx-ddot / nyx-dtitle / nyx-dtime', 'Step icon / title / timestamp.']]
    },
    {
      id: 'id-input', group: 'Regional', title: 'National ID / Iqama', added: 'v1.1', needsJs: true,
      summary: 'A masked input for the Saudi 10-digit national ID. The runtime keeps it digits-only and LTR, caps the length, validates the real Luhn check digit (not just the format), sets aria-invalid, and labels the holder from the first digit — 1 = citizen (مواطن), 2 = resident/Iqama (مقيم). Degrades to a plain numeric field without JS.',
      sections: [
        { title: 'Citizen / resident', demo: '<div style="display:flex;flex-direction:column;gap:12px;max-width:360px"><div class="nyx-id-input"><span class="nyx-id-flag">🪪</span><input inputmode="numeric" maxlength="10" placeholder="1xxxxxxxxx" aria-label="national id"><span class="nyx-id-type"></span></div><div class="nyx-id-input"><span class="nyx-id-flag">🪪</span><input inputmode="numeric" maxlength="10" value="2000000007" aria-label="iqama"><span class="nyx-id-type"></span></div></div>' }
      ],
      classes: [['nyx-id-input', 'Field wrapper (runtime masks + validates).'], ['nyx-id-flag', 'Leading icon.'], ['nyx-id-type', 'Auto-filled holder label (مواطن / مقيم).'], ['.is-valid / .is-invalid', 'Validity state set by the runtime.']]
    },
    {
      id: 'name-ar', group: 'Regional', title: 'Arabic name (4-part)', added: 'v1.1',
      summary: 'The four-part Arabic name layout used across MENA government and banking forms — first, father, grandfather, family. Add .triple to drop the grandfather field. Collapses to two columns on mobile.',
      sections: [
        { title: 'Four parts', demo: '<div class="nyx-name-ar"><label class="nyx-field"><span>الاسم الأول</span><input class="nyx-input" value="محمد"></label><label class="nyx-field"><span>اسم الأب</span><input class="nyx-input" value="عبدالله"></label><label class="nyx-field"><span>اسم الجد</span><input class="nyx-input" value="إبراهيم"></label><label class="nyx-field"><span>اسم العائلة</span><input class="nyx-input" value="القحطاني"></label></div>' }
      ],
      classes: [['nyx-name-ar', 'Responsive 4-column grid.'], ['nyx-name-ar.triple', 'Drops the grandfather field (3 columns).'], ['.nyx-field > span', 'Field label.']]
    },
    {
      id: 'national-address', group: 'Regional', title: 'National address', added: 'v1.1',
      summary: 'The Saudi National Address (العنوان الوطني) form — building number, secondary number, street, district, city and postal code — plus a highlighted short-code chip. .full spans the grid row; collapses to one column on mobile.',
      sections: [
        { title: 'Short code', demo: '<span class="nyx-natl-short">RRRD2929</span>' },
        { title: 'Full form', demo: '<div class="nyx-national-address"><label class="nyx-field"><span>رقم المبنى</span><input class="nyx-input" inputmode="numeric" value="2929"></label><label class="nyx-field"><span>الرقم الإضافي</span><input class="nyx-input" inputmode="numeric" value="7945"></label><label class="nyx-field full"><span>اسم الشارع</span><input class="nyx-input" value="طريق الملك فهد"></label><label class="nyx-field"><span>الحي</span><input class="nyx-input" value="العليا"></label><label class="nyx-field"><span>المدينة</span><input class="nyx-input" value="الرياض"></label><label class="nyx-field"><span>الرمز البريدي</span><input class="nyx-input" inputmode="numeric" maxlength="5" value="12211"></label></div>' }
      ],
      classes: [['nyx-national-address', 'Responsive 2-column address grid.'], ['.nyx-field.full', 'Span the full row.'], ['nyx-natl-short', 'Mono short-code chip.']]
    },
    {
      id: 'region-select', group: 'Regional', title: 'Region select', added: 'v1.1',
      summary: 'A native select pre-styled with a location pin for picking a Saudi region (or GCC country). The pin sits at the start and the chevron at the end — mirrored automatically in RTL.',
      sections: [
        { title: 'Saudi regions', demo: '<div class="nyx-region-select" style="max-width:320px"><span class="nyx-rs-pin">📍</span><select class="nyx-select" aria-label="region"><option>الرياض</option><option>مكة المكرمة</option><option>المدينة المنورة</option><option>القصيم</option><option>المنطقة الشرقية</option><option>عسير</option><option>تبوك</option><option>حائل</option><option>الحدود الشمالية</option><option>جازان</option><option>نجران</option><option>الباحة</option><option>الجوف</option></select></div>' }
      ],
      classes: [['nyx-region-select', 'Wrapper positioning the pin.'], ['nyx-rs-pin', 'Leading location icon (start side).']]
    },
    {
      id: 'hijri-convert', group: 'Regional', title: 'Hijri converter', added: 'v1.1', needsJs: true,
      summary: 'Convert between Hijri and Gregorian dates, both ways. Uses the browser-native Umm al-Qura (official Saudi) calendar via Intl, with a tabular fallback when unavailable — edit either side and the other updates instantly. Also exposes Nyx.toHijri / fromHijri / formatHijri, plus a one-attribute [data-nyx-hijri-today] to print today’s Hijri date anywhere.',
      sections: [
        { title: 'Today’s date', text: 'Add data-nyx-hijri-today to any element (optional data-nyx-numerals="arab").', demo: '<p style="font-size:var(--nyx-fs-lg)">اليوم: <strong data-nyx-hijri-today data-nyx-numerals="arab" style="color:var(--nyx-accent)"></strong></p>' },
        { title: 'Bidirectional converter', demo: '<div class="nyx-hijri-convert" data-nyx-hijri><div class="nyx-hc-row"><span class="nyx-hc-label">التاريخ الميلادي</span><input type="date" class="nyx-input nyx-hc-greg" aria-label="gregorian"></div><span class="nyx-hc-arrow">⇅</span><div class="nyx-hc-row"><span class="nyx-hc-label">التاريخ الهجري</span><div class="nyx-hc-fields"><input type="number" class="nyx-input nyx-hc-hd" min="1" max="30" aria-label="day"><select class="nyx-select nyx-hc-hm" aria-label="month"></select><input type="number" class="nyx-input nyx-hc-hy" min="1" max="1600" aria-label="year"></div></div><div class="nyx-hc-out" data-hijri-text></div></div>' }
      ],
      classes: [['nyx-hijri-convert[data-nyx-hijri]', 'Bidirectional converter widget.'], ['nyx-hc-greg', 'Gregorian date input hook.'], ['nyx-hc-hd / -hm / -hy', 'Hijri day / month-select / year hooks.'], ['[data-hijri-text]', 'Formatted Hijri output target.'], ['[data-nyx-hijri-today]', 'Fills the element with today’s Hijri date.']],
      js: [['Nyx.toHijri(date | y,m,d)', 'Gregorian → {y, m, d, month}.'], ['Nyx.fromHijri(y,m,d)', 'Hijri → Gregorian Date (UTC).'], ['Nyx.formatHijri(date|obj, {numerals})', 'e.g. "١٥ رمضان ١٤٤٧ هـ".']]
    },

    /* ===== COMMERCE ===== */
    {
      id: 'product', group: 'Commerce', title: 'Product card', added: 'v1.0',
      summary: 'A storefront product tile — media, tag, title, rating, price and an add-to-cart action.',
      sections: [
        { title: 'Product', demo: '<div class="nyx-product" style="max-width:240px"><div class="nyx-product-media">🎧<span class="nyx-product-tag nyx-badge nyx-badge-danger">-20%</span></div><div class="nyx-product-body"><div class="nyx-rating" style="font-size:14px"><input type="radio" name="pr" checked><label></label></div><div class="nyx-product-title">Wireless Headphones</div><div class="nyx-product-foot"><span class="nyx-price"><span class="amt">399</span><span class="cur">ر.س</span></span><button class="nyx-btn nyx-btn-primary nyx-btn-sm">Add</button></div></div></div>' }
      ],
      classes: [['nyx-product', 'Product card (hover lifts + glows).'], ['nyx-product-media / -tag', 'Image area / corner badge.'], ['nyx-product-body / -title / -foot', 'Content / name / price+action row.']]
    },
    {
      id: 'cart', group: 'Commerce', title: 'Cart & order summary', added: 'v1.0',
      summary: 'Cart line items with quantity steppers, and an order summary with subtotal, VAT and total.',
      sections: [
        { title: 'Cart', demo: '<div class="nyx-grid"><div class="nyx-col-7"><div class="nyx-cart-item"><span class="nyx-cart-thumb">🎧</span><div class="nyx-cart-meta"><div style="font-weight:600;font-size:var(--nyx-fs-sm)">Wireless Headphones</div><span class="nyx-caption">Black</span></div><div class="nyx-stepper"><button data-nyx-step="-1">−</button><input value="1" aria-label="qty"><button data-nyx-step="1">+</button></div><span class="nyx-price"><span class="amt">399</span><span class="cur">ر.س</span></span></div><div class="nyx-cart-item"><span class="nyx-cart-thumb">⌚</span><div class="nyx-cart-meta"><div style="font-weight:600;font-size:var(--nyx-fs-sm)">Smart Watch</div><span class="nyx-caption">42mm</span></div><div class="nyx-stepper"><button data-nyx-step="-1">−</button><input value="2" aria-label="qty"><button data-nyx-step="1">+</button></div><span class="nyx-price"><span class="amt">1,198</span><span class="cur">ر.س</span></span></div></div><div class="nyx-col-5"><div class="nyx-order"><div class="nyx-order-row"><span>Subtotal</span><span>1,597 ر.س</span></div><div class="nyx-order-row"><span>VAT (15%)</span><span>239.55 ر.س</span></div><div class="nyx-order-row"><span>Shipping</span><span>Free</span></div><div class="nyx-order-row total"><span>Total</span><span>1,836.55 ر.س</span></div><button class="nyx-btn nyx-btn-primary nyx-btn-block" style="margin-top:var(--nyx-s4)">Checkout</button></div></div></div>' }
      ],
      classes: [['nyx-cart-item / nyx-cart-thumb', 'A cart row / its thumbnail.'], ['nyx-order', 'Summary box.'], ['nyx-order-row / .total', 'A line / the bold total row.']]
    },
    {
      id: 'coupon', group: 'Commerce', title: 'Coupon input', added: 'v1.0',
      summary: 'A promo-code field with an apply button — wire the click to your validation.',
      sections: [
        { title: 'Apply a code', demo: '<div class="nyx-coupon" style="max-width:360px"><input class="nyx-input" placeholder="Promo code" aria-label="promo code"><button class="nyx-btn nyx-btn-secondary" onclick="Nyx.toast(\'Coupon applied ✓\',\'success\')">Apply</button></div>' }
      ],
      classes: [['nyx-coupon', 'Flex row (input + apply button).']]
    },
    {
      id: 'payment', group: 'Commerce', title: 'Payment method', added: 'v1.0',
      summary: 'Radio cards for choosing a payment method — the selected one glows. Includes options common in MENA (card, Apple Pay, cash on delivery, Mada/STC Pay).',
      sections: [
        { title: 'Choose method', demo: '<div class="nyx-pay" style="max-width:380px"><label class="nyx-pay-opt"><input type="radio" name="pay" checked><span class="nyx-pay-icon">💳</span> Card<span class="nyx-pay-check">✓</span></label><label class="nyx-pay-opt"><input type="radio" name="pay"><span class="nyx-pay-icon"></span> Apple Pay<span class="nyx-pay-check">✓</span></label><label class="nyx-pay-opt"><input type="radio" name="pay"><span class="nyx-pay-icon">💵</span> Cash on delivery<span class="nyx-pay-check">✓</span></label></div>' }
      ],
      classes: [['nyx-pay', 'Stack of options.'], ['nyx-pay-opt', 'A radio card (wraps a radio input); selected glows via :has().']]
    },
    {
      id: 'address', group: 'Commerce', title: 'Address card', added: 'v1.0',
      summary: 'A saved-address block for checkout — icon, label and the full address lines.',
      sections: [
        { title: 'Saved address', demo: '<div class="nyx-address" style="max-width:380px"><span class="nyx-address-icon">📍</span><div><div class="nyx-flex nyx-items-center nyx-gap-2" style="margin-bottom:4px"><strong>Home</strong> <span class="nyx-badge nyx-badge-success">Default</span></div><div class="nyx-muted">King Fahd Rd, Al Olaya<br>Riyadh 12211, Saudi Arabia</div></div></div>' }
      ],
      classes: [['nyx-address', 'Address card (icon + lines).'], ['nyx-address-icon', 'Accent location icon.']]
    },
    {
      id: 'bnpl', group: 'Commerce', title: 'BNPL (split payments)', added: 'v1.1',
      summary: 'Buy-now-pay-later widgets in the Tabby / Tamara style — a compact inline badge and a full installment schedule with .paid and .current step states. The provider name is yours; retint with --nyx-accent.',
      sections: [
        { title: 'Inline badge', demo: '<span class="nyx-bnpl"><span class="nyx-bnpl-brand">tabby</span> <span>4 payments of <b>99.75 ر.س</b></span></span>' },
        { title: 'Installment schedule', demo: '<div class="nyx-bnpl-plan" style="max-width:420px"><div class="nyx-bnpl-step paid"><span class="dot">✓</span><span class="amt">99.75</span><span class="when">Today</span></div><div class="nyx-bnpl-step current"><span class="dot">2</span><span class="amt">99.75</span><span class="when">Aug 1</span></div><div class="nyx-bnpl-step"><span class="dot">3</span><span class="amt">99.75</span><span class="when">Sep 1</span></div><div class="nyx-bnpl-step"><span class="dot">4</span><span class="amt">99.75</span><span class="when">Oct 1</span></div></div>' }
      ],
      classes: [['nyx-bnpl', 'Inline badge (brand + terms).'], ['nyx-bnpl-plan', 'Installment schedule row.'], ['nyx-bnpl-step.paid / .current', 'A settled / active installment.'], ['.dot / .amt / .when', 'Marker / amount / due label.']]
    },
    {
      id: 'invoice', group: 'Commerce', title: 'Tax e-invoice (ZATCA)', added: 'v1.1',
      summary: 'A simplified tax invoice (فاتورة ضريبية مبسطة) header in the ZATCA layout — seller, VAT registration number, a QR slot for the e-invoice payload, a meta grid, and totals with a separate 15% VAT line. Drop your generated QR (img/svg) into .nyx-invoice-qr.',
      sections: [
        { title: 'Simplified invoice', demo: '<div class="nyx-invoice"><div class="nyx-invoice-head"><div class="nyx-invoice-brand"><b>متجر نون</b><small>VAT 300000000000003</small><span class="nyx-invoice-stamp">فاتورة ضريبية مبسطة</span></div><div class="nyx-invoice-qr">QR</div></div><div class="nyx-invoice-meta"><div class="row"><span class="k">رقم الفاتورة</span><span class="v">INV-2043</span></div><div class="row"><span class="k">التاريخ</span><span class="v">2026-06-22</span></div></div><div class="nyx-invoice-totals"><div class="row"><span>الإجمالي قبل الضريبة</span><span class="v">300.00</span></div><div class="row vat"><span>ضريبة القيمة المضافة (15%)</span><span class="v">45.00</span></div><div class="row grand"><span>الإجمالي</span><span class="v">345.00 ر.س</span></div></div></div>' }
      ],
      classes: [['nyx-invoice', 'Invoice card.'], ['nyx-invoice-head / -brand / -stamp', 'Header / seller block / tax-invoice badge.'], ['nyx-invoice-qr', 'QR slot — drop an img/svg in.'], ['nyx-invoice-meta .row (.k/.v)', 'Meta grid rows.'], ['nyx-invoice-totals .row.vat / .grand', 'VAT line / bold total.']]
    },
    {
      id: 'scroll-progress', group: 'Components', title: 'Scroll progress', added: 'v1.0', needsJs: true,
      summary: 'A thin fixed progress indicator bar at the top of the viewport representing active page scroll depth.',
      sections: [
        { title: 'Usage', text: 'Place `.nyx-scroll-progress` directly under `<body>` to display an automatic scroll tracking indicator.', lang: 'html', code: '<div class="nyx-scroll-progress"></div>' }
      ],
      classes: [['nyx-scroll-progress', 'Fixed top page scroll progress indicator bar.']]
    }
  ];

  var byId = {};
  PAGES.forEach(function (p) { byId[p.id] = p; });

  /* group display order (mirrors Bootstrap's docs taxonomy) */
  var GROUP_ORDER = ['Getting Started', 'Examples', 'Customize', 'Layout', 'Content', 'Forms', 'Components', 'Helpers', 'Utilities', 'Signature', 'Motion', 'Regional', 'Commerce'];
  function groupRank(g) { var i = GROUP_ORDER.indexOf(g); return i < 0 ? 99 : i; }

  /* ---------- i18n (optional; Arabic etc. provided via window.NYX_I18N) ---------- */
  var I18N = (typeof window !== 'undefined' && window.NYX_I18N) || null;
  function L(p, field) { var pg = I18N && I18N.pages && I18N.pages[p.id]; return (pg && pg[field] != null) ? pg[field] : p[field]; }
  function G(g) { return (I18N && I18N._groups && I18N._groups[g]) || g; }
  function C(k, fb) { return (I18N && I18N._ui && I18N._ui[k] != null) ? I18N._ui[k] : fb; }
  function S(t) { return (I18N && I18N._terms && I18N._terms[t] != null) ? I18N._terms[t] : t; }

  /* ---------- sidebar ---------- */
  function buildSidebar() {
    var groups = [], seen = {};
    PAGES.forEach(function (p) { if (!seen[p.group]) { seen[p.group] = []; groups.push(p.group); } seen[p.group].push(p); });
    groups.sort(function (a, b) { return groupRank(a) - groupRank(b); });
    var html = '';
    groups.forEach(function (g) {
      html += '<div class="docs-group"><div class="label">' + G(g) + '</div>';
      seen[g].forEach(function (p) {
        var badge = '';
        if (isComponent(p)) {
          badge = p.needsJs
            ? '<span class="docs-badge-js">' + C('JS', 'JS') + '</span>'
            : '<span class="docs-badge-css">' + C('CSS', 'CSS') + '</span>';
        }
        html += '<a href="#/' + p.id + '" data-id="' + p.id + '">' + L(p, 'title') + badge + '</a>';
      });
      html += '</div>';
    });
    document.getElementById('docsSide').innerHTML =
      '<div class="filter"><div class="nyx-search" style="max-width:none;padding:6px 6px 6px 12px"><span class="nyx-search-icon">⌕</span><input id="docsFilter" placeholder="' + C('filter', 'Filter…') + '" aria-label="Filter"></div></div>' +
      '<div id="docsNav">' + html + '</div>';

    var filter = document.getElementById('docsFilter');
    filter.addEventListener('input', function () {
      var q = filter.value.toLowerCase();
      document.querySelectorAll('#docsNav .docs-group').forEach(function (grp) {
        var any = false;
        grp.querySelectorAll('a').forEach(function (a) {
          var hit = a.textContent.toLowerCase().indexOf(q) > -1;
          a.style.display = hit ? '' : 'none'; if (hit) any = true;
        });
        grp.style.display = any ? '' : 'none';
      });
    });
  }

  /* ---------- render a page ---------- */
  function codeBlock(src, lang, hasDemo) {
    return '<div class="docs-code' + (hasDemo ? '' : ' no-demo') + '">' +
      '<button class="nyx-btn nyx-btn-icon nyx-btn-sm nyx-btn-glass copy" data-copy aria-label="Copy code">⧉</button>' +
      '<pre><code>' + hl(src, lang || 'html') + '</code></pre></div>';
  }

  function renderPage(id) {
    if (window.Nyx) Nyx.closeAll();
    var p = byId[id] || byId.introduction;
    var idx = PAGES.indexOf(p);
    var toc = [];
    var html = '<div class="doc-head"><div><div class="doc-eyebrow">' + G(p.group) + '</div>' +
      '<h1 class="nyx-h1">' + L(p, 'title') + '</h1>' +
      '<p class="nyx-lead nyx-muted">' + L(p, 'summary') + '</p></div>' +
      '<div class="doc-meta">' + 
      (p.added ? '<span class="nyx-badge nyx-badge-success">' + C('added', 'Added in') + ' ' + p.added + '</span>' : '') +
      (isComponent(p) ? '<span class="nyx-badge ' + (p.needsJs ? 'nyx-badge-glow' : 'nyx-badge-glass') + '">' + C(p.needsJs ? 'markupJs' : 'markupOnly', p.needsJs ? 'Markup + JS' : 'Markup Only') + '</span>' : '') +
      '<a class="nyx-btn nyx-btn-glass nyx-btn-sm" href="nyx.css" target="_blank" rel="noopener">' + C('viewSource', 'View source') + '</a></div></div>';

    (p.sections || []).forEach(function (s) {
      var sid = slug(s.title); toc.push({ id: sid, title: S(s.title) });
      html += '<section class="doc-section" id="' + sid + '"><h2>' + S(s.title) +
        ' <a class="anchor" href="#/' + p.id + '" aria-hidden="true">#</a></h2>';
      if (s.text) html += '<p>' + s.text + '</p>';
      if (s.demo) html += '<div class="docs-demo">' + s.demo + '</div>';
      var codeSrc = s.nocode ? '' : (s.code || (s.demo ? formatHtml(s.demo) : ''));
      if (codeSrc) html += codeBlock(codeSrc, s.code ? (s.lang || 'html') : 'html', !!s.demo);
      html += '</section>';
    });

    if (p.classes) {
      toc.push({ id: 'class-reference', title: C('classRef', 'Class reference') });
      html += '<section class="doc-section" id="class-reference"><h2>' + C('classRef', 'Class reference') + ' <a class="anchor" href="#/' + p.id + '">#</a></h2>' +
        '<table class="docs-table"><thead><tr><th>' + C('thClass', 'Class / token') + '</th><th>' + C('thDesc', 'Description') + '</th></tr></thead><tbody>' +
        p.classes.map(function (r) { return '<tr><td><span class="nyx-code">' + escHtml(r[0]) + '</span></td><td>' + r[1] + '</td></tr>'; }).join('') +
        '</tbody></table></section>';
    }
    if (p.js) {
      toc.push({ id: 'js-api', title: C('jsApi', 'JavaScript API') });
      html += '<section class="doc-section" id="js-api"><h2>' + C('jsApi', 'JavaScript API') + ' <a class="anchor" href="#/' + p.id + '">#</a></h2>' +
        '<table class="docs-table"><thead><tr><th>' + C('thMethod', 'Method') + '</th><th>' + C('thDesc', 'Description') + '</th></tr></thead><tbody>' +
        p.js.map(function (r) { return '<tr><td><span class="nyx-code">' + escHtml(r[0]) + '</span></td><td>' + r[1] + '</td></tr>'; }).join('') +
        '</tbody></table></section>';
    }

    /* pager */
    var prev = PAGES[idx - 1], next = PAGES[idx + 1];
    html += '<nav class="docs-pager">';
    if (prev) html += '<a class="prev" href="#/' + prev.id + '"><span class="dir">← ' + C('prev', 'Previous') + '</span><span class="ttl">' + L(prev, 'title') + '</span></a>';
    if (next) html += '<a class="next" href="#/' + next.id + '"><span class="dir">' + C('next', 'Next') + ' →</span><span class="ttl">' + L(next, 'title') + '</span></a>';
    html += '</nav>';

    var main = document.getElementById('docsMain');
    main.innerHTML = html;
    document.title = 'Nyx · ' + L(p, 'title');

    /* right TOC */
    document.getElementById('docsToc').innerHTML = toc.length
      ? '<div class="toc-title">' + C('onThisPage', 'On this page') + '</div>' + toc.map(function (t) {
        return '<a href="#" data-toc="' + t.id + '">' + t.title + '</a>';
      }).join('')
      : '';

    /* sidebar active */
    document.querySelectorAll('#docsNav a').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-id') === p.id);
    });

    Nyx.init(main);            // wire injected sortable tables etc.
    bindTOC();
    closeMobileNav();
    window.scrollTo(0, 0);
  }

  /* ---------- TOC scroll + spy ---------- */
  var tocObserver;
  function bindTOC() {
    document.querySelectorAll('#docsToc a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var t = document.getElementById(a.getAttribute('data-toc'));
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    if (tocObserver) tocObserver.disconnect();
    if (!('IntersectionObserver' in window)) return;
    var links = {};
    document.querySelectorAll('#docsToc a').forEach(function (a) { links[a.getAttribute('data-toc')] = a; });
    tocObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove('active'); });
          if (links[en.target.id]) links[en.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    document.querySelectorAll('#docsMain .doc-section').forEach(function (s) { tocObserver.observe(s); });
  }

  /* ---------- mobile nav ---------- */
  function openMobileNav() { document.getElementById('docsSide').classList.add('open'); document.getElementById('docsBackdrop').classList.add('open'); }
  function closeMobileNav() { document.getElementById('docsSide').classList.remove('open'); document.getElementById('docsBackdrop').classList.remove('open'); }

  /* ---------- demo-only behaviors (toast / chip remove) ---------- */
  document.addEventListener('click', function (e) {
    var d = e.target.closest('[data-demo]'); if (!d) return;
    var v = d.getAttribute('data-demo');
    if (v === 'remove') { var c = d.closest('.nyx-chip'); if (c) c.remove(); return; }
    if (v.indexOf('toast:') === 0) Nyx.toast(v.split(':')[1].replace(/^\w/, function (m) { return m.toUpperCase(); }) + ' toast fired', v.split(':')[1]);
  });
  document.addEventListener('click', function (e) {
    var c = e.target.closest('[data-copy]'); if (!c) return;
    var code = c.parentElement.querySelector('code');
    if (code && navigator.clipboard) {
      navigator.clipboard.writeText(code.innerText).then(function () {
        var isRtl = document.documentElement.getAttribute('dir') === 'rtl';
        Nyx.toast(isRtl ? 'تم نسخ الرمز' : 'Copied to clipboard', 'success', 1500);
        c.classList.add('copied');
        c.innerHTML = '✓';
        setTimeout(function () {
          c.classList.remove('copied');
          c.innerHTML = '⧉';
        }, 1500);
      });
    }
  });

  /* ---------- router ---------- */
  function router() {
    var id = (location.hash.replace(/^#\/?/, '') || 'introduction').trim();
    renderPage(id);
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildSidebar();
    document.getElementById('docsMenuBtn').addEventListener('click', openMobileNav);
    document.getElementById('docsBackdrop').addEventListener('click', closeMobileNav);
    window.addEventListener('hashchange', router);
    router();
  });
})();
