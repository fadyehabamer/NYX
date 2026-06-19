/* ==========================================================
   Nyx docs — hash-routed, data-driven documentation engine.
   Each entry in PAGES becomes its own page at docs.html#/<id>.
   ========================================================== */
(function () {
  'use strict';

  /* ---------- helpers ---------- */
  function escHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

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
      id: 'download', group: 'Getting Started', title: 'Download', added: 'v1.2',
      summary: 'Grab the whole framework as one bundle, or download just the component files you need — every à-la-carte file requires tokens.css for its CSS variables.',
      sections: [
        { title: 'Bundle — everything', lang: 'html', code: '<!-- one file, every component -->\n<link rel="stylesheet" href="nyx.css">\n<script src="nyx.js"></script>' },
        { title: 'À la carte — pick modules', lang: 'html', code: '<!-- tokens.css is always required -->\n<link rel="stylesheet" href="components/tokens.css">\n<link rel="stylesheet" href="components/base.css">\n<link rel="stylesheet" href="components/buttons.css">\n<link rel="stylesheet" href="components/cards.css">' },
        {
          title: 'Files', nocode: true, demo:
            '<div class="nyx-list-group">' +
            '<div class="nyx-list-item"><span><strong>nyx.css</strong> <span class="nyx-caption">· the full bundle</span></span><a class="nyx-btn nyx-btn-primary nyx-btn-sm" href="nyx.css" download>↓ Bundle</a></div>' +
            '<div class="nyx-list-item"><span><strong>nyx.js</strong> <span class="nyx-caption">· runtime</span></span><a class="nyx-btn nyx-btn-glass nyx-btn-sm" href="nyx.js" download>↓ JS</a></div>' +
            '<div class="nyx-list-item"><span><strong>tokens.css</strong> <span class="nyx-badge nyx-badge-warning">required</span></span><a class="nyx-btn nyx-btn-glass nyx-btn-sm" href="components/tokens.css" download>↓ CSS</a></div>' +
            ['base', 'layout', 'typography', 'buttons', 'cards', 'forms', 'navigation', 'feedback', 'data', 'overlays', 'signature', 'extras', 'rtl'].map(function (n) {
              return '<div class="nyx-list-item"><span>' + n + '.css</span><a class="nyx-btn nyx-btn-glass nyx-btn-sm" href="components/' + n + '.css" download>↓ CSS</a></div>';
            }).join('') +
            '</div>'
        }
      ],
      classes: [['nyx.css', 'The bundle — all modules in one file.'], ['components/*.css', 'Individual modules (each needs tokens.css).'], ['node build.js', 'Regenerates components/ from the bundle.']]
    },
    {
      id: 'theming', group: 'Customize', title: 'Theming',
      summary: 'Every value is a CSS custom property on :root. Override any --nyx-* token — anywhere downstream — to retheme. No recompile.',
      sections: [
        {
          title: 'Override tokens', lang: 'css',
          code: ':root {\n  --nyx-accent:   #ff5d8f;   /* swap the violet for pink   */\n  --nyx-accent-2: #29e0c4;   /* secondary / success accent */\n  --nyx-radius:   12px;      /* round everything a bit more */\n}'
        },
        { title: 'Live swatch', demo: '<div class="nyx-flex nyx-gap-3 nyx-wrap"><span style="width:56px;height:56px;border-radius:12px;background:var(--nyx-accent);box-shadow:var(--nyx-glow)"></span><span style="width:56px;height:56px;border-radius:12px;background:var(--nyx-accent-2)"></span><span style="width:56px;height:56px;border-radius:12px;background:var(--nyx-danger)"></span><span style="width:56px;height:56px;border-radius:12px;background:var(--nyx-warning)"></span></div>' },
        { title: 'Light mode', text: 'Nyx ships a built-in light theme — flip it with a single attribute on <html>, or call Nyx.toggleTheme() to switch and persist at runtime (try the ◐ button in the navbar).', lang: 'html', code: '<html data-theme="light">   <!-- default is "dark" -->\n\n<!-- runtime toggle, saved to localStorage -->\n<button onclick="Nyx.toggleTheme()">Toggle theme</button>' }
      ],
      classes: [
        ['--nyx-accent', 'Primary violet. Drives buttons, focus, glow.'],
        ['--nyx-accent-2', 'Teal-green secondary / success accent.'],
        ['--nyx-bg / --nyx-surface / --nyx-surface-2', 'Layered dark surfaces for depth.'],
        ['--nyx-glow', 'The signature colored glow shadow.'],
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
        ['Nyx.toggleDir() / setDir(d)', 'Flip LTR/RTL; persists to localStorage.']
      ]
    },

    {
      id: 'rtl', group: 'Getting Started', title: 'RTL support', added: 'v1.1',
      summary: 'Nyx is fully bidirectional. Set dir="rtl" on <html> (or call Nyx.toggleDir()) and every component mirrors — drawers slide from the left, toasts dock left, timelines, tooltips, the select caret and badges all flip via CSS logical properties.',
      sections: [
        { title: 'Enable', lang: 'html', code: '<html dir="rtl">\n\n<!-- or toggle at runtime (persists to localStorage) -->\n<button onclick="Nyx.toggleDir()">عربى / EN</button>' },
        { title: 'Mirrored in place', text: 'This preview is wrapped in dir="rtl" to show automatic mirroring — note the alert edge, breadcrumb and button order.', demo: '<div dir="rtl" class="nyx-stack"><nav class="nyx-breadcrumb"><a href="#/rtl">الرئيسية</a><span class="nyx-sep">/</span><a href="#/rtl">المكوّنات</a><span class="nyx-sep">/</span><span aria-current="page">الأزرار</span></nav><div class="nyx-alert nyx-alert-info"><span class="nyx-alert-icon">ℹ️</span><div>الحدّ الملوّن ينتقل تلقائياً إلى الجهة الصحيحة.</div></div><div class="nyx-flex nyx-gap-3"><button class="nyx-btn nyx-btn-primary">حفظ</button><button class="nyx-btn nyx-btn-ghost">إلغاء</button></div></div>' }
      ],
      classes: [['dir="rtl"', 'Mirrors layout via CSS logical properties + an RTL layer.'], ['Nyx.toggleDir()', 'Flip direction at runtime; persisted.']]
    },

    /* ===== LAYOUT ===== */
    {
      id: 'grid', group: 'Layout', title: 'Grid',
      summary: 'A 12-column CSS Grid. Use .nyx-grid on a wrapper and .nyx-col-{1..12} on children. Columns collapse to 6 below 1024px and to full width below 640px.',
      sections: [
        { title: 'Twelve columns', demo: '<div class="nyx-grid"><div class="nyx-col-6"><div class="nyx-card" style="text-align:center;padding:12px">col-6</div></div><div class="nyx-col-6"><div class="nyx-card" style="text-align:center;padding:12px">col-6</div></div><div class="nyx-col-4"><div class="nyx-card" style="text-align:center;padding:12px">col-4</div></div><div class="nyx-col-4"><div class="nyx-card" style="text-align:center;padding:12px">col-4</div></div><div class="nyx-col-4"><div class="nyx-card" style="text-align:center;padding:12px">col-4</div></div></div>' }
      ],
      classes: [['nyx-grid', '12-column grid container, 16px gap.'], ['nyx-col-1 … nyx-col-12', 'Span N of 12 columns.']]
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
        { title: 'Scale', demo: '<div class="nyx-stack"><span class="nyx-overline">Overline · eyebrow</span><h1 class="nyx-display">Display <span class="nyx-gradient-text">gradient</span></h1><h2 class="nyx-h2">Heading two</h2><p class="nyx-lead">A lead paragraph in a calmer, larger voice.</p><p class="nyx-body">Body copy with inline <span class="nyx-code">nyx-code</span> and <span class="nyx-muted">muted</span> text.</p></div>' }
      ],
      classes: [
        ['nyx-display, nyx-h1 … nyx-h6', 'Display + heading levels.'],
        ['nyx-lead / nyx-body / nyx-caption', 'Paragraph styles.'],
        ['nyx-overline / nyx-muted', 'Eyebrow label / muted color.'],
        ['nyx-gradient-text', 'Accent→teal gradient clip.'],
        ['nyx-code', 'Inline monospace code.']
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
      id: 'range', group: 'Forms', title: 'Range', added: 'v1.1',
      summary: 'A styled slider input with a glowing thumb that works across WebKit and Firefox.',
      sections: [{ title: 'Slider', demo: '<input type="range" class="nyx-range" min="0" max="100" value="60" aria-label="Volume">' }],
      classes: [['nyx-range', 'Styled input[type=range].']]
    },
    {
      id: 'floating', group: 'Forms', title: 'Floating label', added: 'v1.1',
      summary: 'A label that rests inside the field and floats up on focus or when filled. Give the input placeholder=" " and place the label right after it.',
      sections: [{ title: 'Float', demo: '<div class="nyx-float"><input class="nyx-input" id="fl1" placeholder=" "><label for="fl1">Email address</label></div>' }],
      classes: [['nyx-float', 'Wrapper around .nyx-input + a following label.']]
    },

    {
      id: 'stepper', group: 'Forms', title: 'Stepper', added: 'v1.2',
      summary: 'A number input flanked by increment / decrement buttons. Respects min and max.',
      sections: [{ title: 'Quantity', demo: '<div class="nyx-stepper"><button data-nyx-step="dec" aria-label="decrease">−</button><input type="text" value="1" min="0" max="99" aria-label="Quantity"><button data-nyx-step="inc" aria-label="increase">+</button></div>' }],
      classes: [['nyx-stepper', 'Wrapper (input between two buttons).'], ['data-nyx-step="inc|dec"', 'Step buttons; honor input min/max.']]
    },
    {
      id: 'otp', group: 'Forms', title: 'OTP input', added: 'v1.2',
      summary: 'A one-time-code / PIN entry that auto-advances as you type and steps back on delete.',
      sections: [{ title: 'Four digits', demo: '<div class="nyx-otp"><input maxlength="1" inputmode="numeric" aria-label="digit 1"><input maxlength="1" inputmode="numeric" aria-label="digit 2"><input maxlength="1" inputmode="numeric" aria-label="digit 3"><input maxlength="1" inputmode="numeric" aria-label="digit 4"></div>' }],
      classes: [['nyx-otp', 'Wrapper of single-character inputs (auto-advance via the runtime).']]
    },
    {
      id: 'tag-input', group: 'Forms', title: 'Tag input', added: 'v1.2',
      summary: 'Type and press Enter to add a chip; click × to remove. Great for labels and recipients.',
      sections: [{ title: 'Tags', demo: '<div class="nyx-tag-input"><span class="nyx-chip">design <span class="nyx-chip-x" role="button" aria-label="remove">×</span></span><span class="nyx-chip">react <span class="nyx-chip-x" role="button" aria-label="remove">×</span></span><input placeholder="Add tag + Enter" aria-label="Add tag"></div>' }],
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
      summary: 'Bottom-right notifications that auto-dismiss. Fired imperatively via the runtime; the container is created for you.',
      sections: [
        { title: 'Try it', demo: '<div class="nyx-flex nyx-gap-3 nyx-wrap"><button class="nyx-btn nyx-btn-glass" data-demo="toast:success">Success</button><button class="nyx-btn nyx-btn-glass" data-demo="toast:danger">Danger</button><button class="nyx-btn nyx-btn-glass" data-demo="toast:info">Info</button></div>', code: "Nyx.toast('Profile updated', 'success');\nNyx.toast('Connection lost', 'danger', 5000);", lang: 'js' }
      ],
      js: [['Nyx.toast(msg, type, ms)', 'type: info | success | warning | danger. Default ms 3200.']]
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
        { title: 'Steps', demo: '<div class="nyx-status-bar"><div class="nyx-step done"><span class="nyx-step-dot">✓</span> Account</div><span class="nyx-step-line"></span><div class="nyx-step done"><span class="nyx-step-dot">✓</span> Profile</div><span class="nyx-step-line"></span><div class="nyx-step current"><span class="nyx-step-dot">3</span> Billing</div><span class="nyx-step-line"></span><div class="nyx-step"><span class="nyx-step-dot">4</span> Done</div></div>' }
      ],
      classes: [['nyx-status-bar', 'Flex row of steps.'], ['nyx-step + .done / .current', 'A step and its state.'], ['nyx-step-line', 'Connector between steps.']]
    },
    {
      id: 'navbar', group: 'Components', title: 'Navbar',
      summary: 'A sticky top navigation bar with a glass-blur background.',
      sections: [
        { title: 'Basic', demo: '<div class="nyx-navbar" style="position:static;border-radius:12px"><div class="docs-logo"><span class="mark">N</span> Nyx</div><div class="nyx-flex nyx-gap-3"><button class="nyx-btn nyx-btn-ghost nyx-btn-sm">Docs</button><button class="nyx-btn nyx-btn-primary nyx-btn-sm">Sign in</button></div></div>' }
      ],
      classes: [['nyx-navbar', 'Sticky, blurred, bordered top bar.']]
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
      id: 'tabs', group: 'Components', title: 'Tabs',
      summary: 'Underline tabs with a glowing indicator. Add data-nyx-tabs to the wrapper — the runtime handles switching.',
      sections: [
        { title: 'Switchable', demo: '<div><div class="nyx-tabs" data-nyx-tabs><button class="nyx-tab active" data-nyx-tab="a">Overview</button><button class="nyx-tab" data-nyx-tab="b">Usage</button><button class="nyx-tab" data-nyx-tab="c">API</button></div><div class="nyx-tab-panel active" data-nyx-panel="a">Overview panel.</div><div class="nyx-tab-panel" data-nyx-panel="b">Usage panel.</div><div class="nyx-tab-panel" data-nyx-panel="c">API panel.</div></div>' }
      ],
      classes: [['data-nyx-tabs', 'Wrapper that activates switching.'], ['nyx-tab + data-nyx-tab', 'A tab button → key.'], ['nyx-tab-panel + data-nyx-panel', 'Panel for a key.']]
    },
    {
      id: 'pagination', group: 'Components', title: 'Pagination',
      summary: 'Numbered page controls with a glowing active page.',
      sections: [
        { title: 'Basic', demo: '<div class="nyx-pagination"><button>‹</button><button class="active">1</button><button>2</button><button>3</button><button>›</button></div>' }
      ],
      classes: [['nyx-pagination', 'Wrapper around <button> pages.'], ['button.active', 'Current page.']]
    },
    {
      id: 'command-palette', group: 'Components', title: 'Command palette',
      summary: 'A fullscreen ⌘K search overlay. Trigger it with a data attribute or the keyboard; items can jump to targets.',
      sections: [
        { title: 'Open it', demo: '<button class="nyx-btn nyx-btn-secondary" data-nyx-toggle="command">Open ⌘K palette</button>', code: '<button data-nyx-toggle="command">Open</button>\n\n<div class="nyx-command-palette" id="commandPalette">\n  <div class="nyx-cp-box"> … items with data-nyx-target … </div>\n</div>' }
      ],
      classes: [['nyx-command-palette', 'Fullscreen overlay (one per page).'], ['data-nyx-toggle="command"', 'Open trigger (⌘K also works).'], ['nyx-cp-item + data-nyx-target', 'Result row → scrolls to target.']]
    },
    {
      id: 'tables', group: 'Components', title: 'Tables & Data',
      summary: 'A styled table with hover rows, a click-to-sort variant, a dense spreadsheet-like grid, and a KPI row.',
      sections: [
        { title: 'Sortable table', text: 'Add nyx-table-sortable and click any header — the runtime sorts numerically or alphabetically.', demo: '<table class="nyx-table nyx-table-sortable"><thead><tr><th>User</th><th>Plan</th><th>MRR</th></tr></thead><tbody><tr><td>Ava Chen</td><td>Pro</td><td>$49</td></tr><tr><td>Liam Patel</td><td>Enterprise</td><td>$499</td></tr><tr><td>Noah Kim</td><td>Starter</td><td>$0</td></tr></tbody></table>' },
        { title: 'KPI row', demo: '<div class="nyx-kpi-row"><div class="nyx-card-stat"><span class="nyx-stat-label">MRR</span><span class="nyx-stat-num">$48.2k</span><span class="nyx-badge nyx-badge-success">▲ 12%</span></div><div class="nyx-card-stat"><span class="nyx-stat-label">Churn</span><span class="nyx-stat-num">1.8%</span><span class="nyx-badge nyx-badge-success">▼ 0.3%</span></div><div class="nyx-card-stat"><span class="nyx-stat-label">Signups</span><span class="nyx-stat-num">1,204</span><span class="nyx-badge nyx-badge-warning">flat</span></div><div class="nyx-card-stat"><span class="nyx-stat-label">NPS</span><span class="nyx-stat-num">72</span><span class="nyx-badge nyx-badge-success">▲ 5</span></div></div>' }
      ],
      classes: [['nyx-table', 'Styled table.'], ['nyx-table-sortable', 'Adds click-to-sort headers.'], ['nyx-data-grid', 'Dense, sticky-header grid.'], ['nyx-kpi-row', '4-up responsive stat grid.']]
    },
    {
      id: 'modal', group: 'Components', title: 'Modal',
      summary: 'A centered dialog over a blurred backdrop. Open/close declaratively; Esc and backdrop-click dismiss.',
      sections: [
        { title: 'Open it', demo: '<button class="nyx-btn nyx-btn-primary" data-nyx-toggle="modal" data-nyx-target="#docModal">Open modal</button>', code: '<button data-nyx-toggle="modal" data-nyx-target="#m">Open</button>\n\n<div class="nyx-modal" id="m">\n  <div class="nyx-modal-box">\n    … <button data-nyx-dismiss>Close</button>\n  </div>\n</div>' }
      ],
      classes: [['nyx-modal', 'Dialog wrapper (place at end of <body>).'], ['nyx-modal-box', 'The panel.'], ['data-nyx-toggle="modal" / data-nyx-dismiss', 'Open / close triggers.']]
    },
    {
      id: 'drawer', group: 'Components', title: 'Drawer',
      summary: 'A right-side slide-in panel sharing the modal backdrop and dismiss mechanics.',
      sections: [
        { title: 'Open it', demo: '<div class="nyx-flex nyx-gap-3 nyx-wrap"><button class="nyx-btn nyx-btn-secondary" data-nyx-toggle="drawer" data-nyx-target="#docDrawer">From the end</button><button class="nyx-btn nyx-btn-glass" data-nyx-toggle="drawer" data-nyx-target="#docDrawerLeft">From the start</button></div>', code: '<button data-nyx-toggle="drawer" data-nyx-target="#d">Open</button>\n\n<aside class="nyx-drawer" id="d"> … </aside>\n<aside class="nyx-drawer nyx-drawer-left" id="d2"> … </aside>' }
      ],
      classes: [['nyx-drawer', 'Slide-in panel (from the end edge).'], ['nyx-drawer-left', 'Slide-in from the start edge (offcanvas).'], ['data-nyx-toggle="drawer"', 'Open trigger.']]
    },
    {
      id: 'tooltips', group: 'Components', title: 'Tooltips',
      summary: 'CSS-only hover tooltips on any of four sides — no JavaScript.',
      sections: [
        { title: 'Four sides', demo: '<div class="nyx-flex nyx-gap-4 nyx-wrap"><span class="nyx-tooltip"><button class="nyx-btn nyx-btn-glass">Top</button><span class="nyx-tip top">Tooltip on top</span></span><span class="nyx-tooltip"><button class="nyx-btn nyx-btn-glass">Right</button><span class="nyx-tip right">On the right</span></span><span class="nyx-tooltip"><button class="nyx-btn nyx-btn-glass">Bottom</button><span class="nyx-tip bottom">Below</span></span></div>' }
      ],
      classes: [['nyx-tooltip', 'Hover target wrapper.'], ['nyx-tip top/right/bottom/left', 'Tooltip + placement.']]
    },
    {
      id: 'popovers', group: 'Components', title: 'Popovers',
      summary: 'A click-toggled floating panel with an arrow, for richer content than a tooltip.',
      sections: [
        { title: 'Toggle', demo: '<span class="nyx-popover"><button class="nyx-btn nyx-btn-glass" data-nyx-toggle="popover">Popover</button><span class="nyx-pop"><strong>Title</strong><p class="nyx-caption" style="margin-top:6px">Rich floating content with an arrow.</p></span></span>' }
      ],
      classes: [['nyx-popover', 'Wrapper.'], ['nyx-pop', 'The floating panel.'], ['data-nyx-toggle="popover"', 'Toggle trigger.']]
    },

    {
      id: 'button-group', group: 'Components', title: 'Button group', added: 'v1.1',
      summary: 'Group related buttons into a single segmented control with shared, seamless edges.',
      sections: [{ title: 'Grouped', demo: '<div class="nyx-btn-group"><button class="nyx-btn nyx-btn-glass">Left</button><button class="nyx-btn nyx-btn-glass">Center</button><button class="nyx-btn nyx-btn-glass">Right</button></div>' }],
      classes: [['nyx-btn-group', 'Flex wrapper that fuses child .nyx-btn edges.']]
    },
    {
      id: 'dropdown', group: 'Components', title: 'Dropdown', added: 'v1.1',
      summary: 'A toggleable menu of actions. Opens on click; closes on outside-click or Esc.',
      sections: [{ title: 'Menu', demo: '<div class="nyx-dropdown"><button class="nyx-btn nyx-btn-primary" data-nyx-toggle="dropdown">Actions ▾</button><div class="nyx-dropdown-menu"><button class="nyx-dropdown-item">✏️ Edit</button><button class="nyx-dropdown-item">📋 Duplicate</button><div class="nyx-dropdown-divider"></div><button class="nyx-dropdown-item">🗑️ Delete</button></div></div>' }],
      classes: [['nyx-dropdown', 'Wrapper.'], ['data-nyx-toggle="dropdown"', 'Toggle trigger.'], ['nyx-dropdown-menu / -item / -divider', 'Menu, item, separator.']]
    },
    {
      id: 'accordion', group: 'Components', title: 'Accordion', added: 'v1.1',
      summary: 'Stacked collapsible panels. Add data-nyx-accordion to keep only one open at a time.',
      sections: [{ title: 'Single-open', demo: '<div class="nyx-accordion" data-nyx-accordion><div class="nyx-accordion-item"><button class="nyx-accordion-head active" data-nyx-toggle="collapse" data-nyx-target="#ac1">What is Nyx?</button><div class="nyx-collapse open" id="ac1"><div class="nyx-accordion-body">A dark-mode-native component framework with Luminous Depth.</div></div></div><div class="nyx-accordion-item"><button class="nyx-accordion-head" data-nyx-toggle="collapse" data-nyx-target="#ac2">Does it support RTL?</button><div class="nyx-collapse" id="ac2"><div class="nyx-accordion-body">Yes — set dir="rtl" on the html element and everything mirrors.</div></div></div></div>' }],
      classes: [['nyx-accordion + data-nyx-accordion', 'Single-open wrapper.'], ['nyx-accordion-head', 'Toggle (uses data-nyx-toggle="collapse").'], ['nyx-collapse / nyx-accordion-body', 'Animated panel + content.']]
    },
    {
      id: 'collapse', group: 'Components', title: 'Collapse', added: 'v1.1',
      summary: 'Toggle the visibility of any region with a smooth height transition.',
      sections: [{ title: 'Toggle', demo: '<button class="nyx-btn nyx-btn-secondary" data-nyx-toggle="collapse" data-nyx-target="#col1">Toggle content</button><div class="nyx-collapse" id="col1"><div class="nyx-card" style="margin-top:12px">Now you see me. This region animates its height open and closed.</div></div>' }],
      classes: [['data-nyx-toggle="collapse" + data-nyx-target', 'Trigger → target.'], ['nyx-collapse', 'Animatable region (toggles .open).']]
    },
    {
      id: 'list-group', group: 'Components', title: 'List group', added: 'v1.1',
      summary: 'A flush, bordered list of items — static, linked, or with an active state and trailing badges.',
      sections: [{ title: 'Items', demo: '<div class="nyx-list-group"><div class="nyx-list-item active">Dashboard <span class="nyx-badge nyx-badge-info">12</span></div><div class="nyx-list-item">Projects <span class="nyx-badge">4</span></div><div class="nyx-list-item">Team <span class="nyx-badge">8</span></div><div class="nyx-list-item">Settings</div></div>' }],
      classes: [['nyx-list-group', 'List wrapper.'], ['nyx-list-item', 'Row (add .active; use on <a> for hover).']]
    },
    {
      id: 'spinner', group: 'Components', title: 'Spinner', added: 'v1.1',
      summary: 'Indeterminate loading indicators — a border ring in three sizes plus a bouncing-dots variant.',
      sections: [{ title: 'Variants', demo: '<div class="nyx-flex nyx-gap-5 nyx-items-center"><span class="nyx-spinner nyx-spinner-sm"></span><span class="nyx-spinner"></span><span class="nyx-spinner nyx-spinner-lg"></span><span class="nyx-spinner-dots"><span></span><span></span><span></span></span></div>' }],
      classes: [['nyx-spinner', 'Ring spinner.'], ['nyx-spinner-sm / -lg', 'Sizes.'], ['nyx-spinner-dots', 'Bouncing-dots spinner (3 inner spans).']]
    },
    {
      id: 'close-button', group: 'Components', title: 'Close button', added: 'v1.1',
      summary: 'A standardized dismiss affordance for cards, alerts, modals and toasts.',
      sections: [{ title: 'Default', demo: '<div class="nyx-flex nyx-items-center nyx-gap-3"><button class="nyx-close" aria-label="Close">✕</button><span class="nyx-caption">A consistent dismiss control.</span></div>' }],
      classes: [['nyx-close', 'Square close button (pair with data-nyx-dismiss in overlays).']]
    },
    {
      id: 'carousel', group: 'Components', title: 'Carousel', added: 'v1.1',
      summary: 'A slideshow with prev/next controls and clickable indicator dots.',
      sections: [{ title: 'Slides', demo: '<div class="nyx-carousel" data-nyx-carousel><div class="nyx-slide active"><div class="nyx-spotlight" style="padding:44px 24px"><h3 class="nyx-h2">Slide one</h3></div></div><div class="nyx-slide"><div class="nyx-spotlight" style="padding:44px 24px"><h3 class="nyx-h2 nyx-gradient-text">Slide two</h3></div></div><div class="nyx-slide"><div class="nyx-spotlight" style="padding:44px 24px"><h3 class="nyx-h2">Slide three</h3></div></div><button class="nyx-btn nyx-btn-icon nyx-btn-glass nyx-carousel-ctrl prev" data-nyx-slide="prev" aria-label="Previous">‹</button><button class="nyx-btn nyx-btn-icon nyx-btn-glass nyx-carousel-ctrl next" data-nyx-slide="next" aria-label="Next">›</button><div class="nyx-carousel-dots"><button class="active" data-nyx-slide-to="0" aria-label="Slide 1"></button><button data-nyx-slide-to="1" aria-label="Slide 2"></button><button data-nyx-slide-to="2" aria-label="Slide 3"></button></div></div>' }],
      classes: [['nyx-carousel', 'Slideshow wrapper.'], ['nyx-slide', 'A slide (one has .active).'], ['data-nyx-slide / data-nyx-slide-to', 'Prev/next controls and indicator dots.']]
    },
    {
      id: 'nav-pills', group: 'Components', title: 'Nav pills', added: 'v1.1',
      summary: 'A pill-style nav that drives panels using the same data-nyx-tabs mechanism as tabs.',
      sections: [{ title: 'Pills', demo: '<div><div class="nyx-nav-pills" data-nyx-tabs><button class="nyx-pill active" data-nyx-tab="p1">All</button><button class="nyx-pill" data-nyx-tab="p2">Active</button><button class="nyx-pill" data-nyx-tab="p3">Archived</button></div><div class="nyx-tab-panel active" data-nyx-panel="p1" style="padding-top:16px">All items.</div><div class="nyx-tab-panel" data-nyx-panel="p2" style="padding-top:16px">Active items.</div><div class="nyx-tab-panel" data-nyx-panel="p3" style="padding-top:16px">Archived items.</div></div>' }],
      classes: [['nyx-nav-pills + data-nyx-tabs', 'Pill nav wrapper.'], ['nyx-pill + data-nyx-tab', 'A pill → panel key.']]
    },
    {
      id: 'ratio', group: 'Helpers', title: 'Ratio', added: 'v1.1',
      summary: 'Maintain a responsive aspect ratio for embeds like video and maps.',
      sections: [{ title: '16:9', demo: '<div class="nyx-ratio" style="max-width:360px"><div style="background:linear-gradient(120deg,var(--nyx-accent),var(--nyx-accent-2));display:grid;place-items:center;color:#fff;font-family:var(--nyx-font-display);font-weight:700">16 : 9</div></div>' }],
      classes: [['nyx-ratio', 'Default 16:9 box.'], ['nyx-ratio-1x1 / -4x3', 'Other ratios.']]
    },

    {
      id: 'split-button', group: 'Components', title: 'Split button', added: 'v1.2',
      summary: 'A primary action fused with a dropdown caret for secondary actions.',
      sections: [{ title: 'Split', demo: '<div class="nyx-btn-split"><button class="nyx-btn nyx-btn-primary">Save</button><div class="nyx-dropdown"><button class="nyx-btn nyx-btn-primary" data-nyx-toggle="dropdown" aria-label="more options">▾</button><div class="nyx-dropdown-menu"><button class="nyx-dropdown-item">Save as draft</button><button class="nyx-dropdown-item">Save &amp; publish</button></div></div></div>' }],
      classes: [['nyx-btn-split', 'Fuses a .nyx-btn with a .nyx-dropdown caret.']]
    },
    {
      id: 'toolbar', group: 'Components', title: 'Toolbar', added: 'v1.2',
      summary: 'A horizontal bar grouping actions, with separators between clusters.',
      sections: [{ title: 'Editor bar', demo: '<div class="nyx-toolbar"><button class="nyx-btn nyx-btn-icon nyx-btn-ghost" aria-label="bold"><strong>B</strong></button><button class="nyx-btn nyx-btn-icon nyx-btn-ghost" aria-label="italic"><em>I</em></button><span class="nyx-toolbar-sep"></span><button class="nyx-btn nyx-btn-icon nyx-btn-ghost" aria-label="link">🔗</button><button class="nyx-btn nyx-btn-icon nyx-btn-ghost" aria-label="image">🖼️</button><span class="nyx-toolbar-sep"></span><div class="nyx-btn-group"><button class="nyx-btn nyx-btn-glass nyx-btn-sm">Left</button><button class="nyx-btn nyx-btn-glass nyx-btn-sm">Center</button></div></div>' }],
      classes: [['nyx-toolbar', 'Action bar wrapper.'], ['nyx-toolbar-sep', 'Vertical separator.']]
    },
    {
      id: 'tree', group: 'Components', title: 'Tree view', added: 'v1.2',
      summary: 'A nested, collapsible hierarchy (files, categories). Built on the collapse behavior.',
      sections: [{ title: 'File tree', demo: '<div class="nyx-tree"><div class="nyx-tree-label active" data-nyx-toggle="collapse" data-nyx-target="#tr1">📁 src</div><div class="nyx-collapse open" id="tr1"><div class="nyx-tree-children"><div class="nyx-tree-leaf">📄 index.html</div><div class="nyx-tree-label" data-nyx-toggle="collapse" data-nyx-target="#tr2">📁 components</div><div class="nyx-collapse" id="tr2"><div class="nyx-tree-children"><div class="nyx-tree-leaf">📄 buttons.css</div><div class="nyx-tree-leaf">📄 cards.css</div></div></div></div></div></div>' }],
      classes: [['nyx-tree / nyx-tree-children', 'Tree wrapper / nested level.'], ['nyx-tree-label', 'Expandable node (data-nyx-toggle="collapse").'], ['nyx-tree-leaf', 'Leaf item.']]
    },
    {
      id: 'vertical-tabs', group: 'Components', title: 'Vertical tabs', added: 'v1.2',
      summary: 'The tabs component laid out vertically — the same data-nyx-tabs wiring.',
      sections: [{ title: 'Side tabs', demo: '<div class="nyx-tabs-vertical"><div class="nyx-tabs" data-nyx-tabs><button class="nyx-tab active" data-nyx-tab="vt1">Profile</button><button class="nyx-tab" data-nyx-tab="vt2">Account</button><button class="nyx-tab" data-nyx-tab="vt3">Billing</button></div><div style="flex:1"><div class="nyx-tab-panel active" data-nyx-panel="vt1">Profile settings.</div><div class="nyx-tab-panel" data-nyx-panel="vt2">Account settings.</div><div class="nyx-tab-panel" data-nyx-panel="vt3">Billing settings.</div></div></div>' }],
      classes: [['nyx-tabs-vertical', 'Vertical layout wrapper around .nyx-tabs + panels.']]
    },
    {
      id: 'calendar', group: 'Components', title: 'Calendar', added: 'v1.2',
      summary: 'A styled month grid with today and selected states — compose your own date picker around it.',
      sections: [{ title: 'Month', demo: '<div class="nyx-calendar"><div class="nyx-calendar-head"><button class="nyx-btn nyx-btn-icon nyx-btn-sm nyx-btn-ghost" aria-label="previous month">‹</button><span>June 2026</span><button class="nyx-btn nyx-btn-icon nyx-btn-sm nyx-btn-ghost" aria-label="next month">›</button></div><div class="nyx-calendar-grid"><span class="dow">S</span><span class="dow">M</span><span class="dow">T</span><span class="dow">W</span><span class="dow">T</span><span class="dow">F</span><span class="dow">S</span><span class="day muted">31</span><span class="day">1</span><span class="day">2</span><span class="day">3</span><span class="day">4</span><span class="day">5</span><span class="day">6</span><span class="day">7</span><span class="day">8</span><span class="day">9</span><span class="day">10</span><span class="day">11</span><span class="day">12</span><span class="day">13</span><span class="day">14</span><span class="day">15</span><span class="day">16</span><span class="day">17</span><span class="day">18</span><span class="day today">19</span><span class="day">20</span><span class="day">21</span><span class="day selected">22</span><span class="day">23</span><span class="day">24</span><span class="day">25</span><span class="day">26</span><span class="day">27</span><span class="day">28</span><span class="day">29</span><span class="day">30</span><span class="day muted">1</span><span class="day muted">2</span><span class="day muted">3</span><span class="day muted">4</span></div></div>' }],
      classes: [['nyx-calendar', 'Month container.'], ['nyx-calendar-grid .day', 'Day cell (+ .today / .selected / .muted).']]
    },
    {
      id: 'file', group: 'Components', title: 'File item', added: 'v1.2',
      summary: 'An upload / attachment row with an icon, name, meta, progress and a remove control.',
      sections: [{ title: 'Attachment', demo: '<div class="nyx-file"><div class="nyx-file-icon">📄</div><div class="nyx-file-meta"><div class="nyx-file-name">quarterly-report-2026.pdf</div><div class="nyx-file-sub">2.4 MB · uploaded</div><div class="nyx-progress" style="margin-top:6px"><span style="width:100%"></span></div></div><button class="nyx-close" aria-label="Remove file">✕</button></div>' }],
      classes: [['nyx-file', 'Row wrapper.'], ['nyx-file-icon / -meta / -name / -sub', 'Icon, text column, filename, sub-line.']]
    },

    /* ===== SIGNATURE ===== */
    {
      id: 'spotlight', group: 'Signature', title: 'Spotlight',
      summary: 'A hero device: a radial-gradient spotlight glowing from behind the heading. Perfect for SaaS landing heroes.',
      sections: [
        { title: 'Hero', demo: '<div class="nyx-spotlight" style="padding:48px 24px"><span class="nyx-overline">Signature</span><h2 class="nyx-h1" style="margin-top:8px">Lit from <span class="nyx-gradient-text">within</span></h2><p class="nyx-muted" style="margin-top:8px">A glow emanates from behind the content.</p></div>' }
      ],
      classes: [['nyx-spotlight', 'Hero section with radial spotlight + top hairline.']]
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
      id: 'segmented', group: 'Signature', title: 'Segmented control', added: 'v1.1',
      summary: 'An iOS-style segmented switch built from radio inputs — pure CSS and keyboard accessible.',
      sections: [{ title: 'Three up', demo: '<div class="nyx-segment"><label><input type="radio" name="seg1" checked><span>Day</span></label><label><input type="radio" name="seg1"><span>Week</span></label><label><input type="radio" name="seg1"><span>Month</span></label></div>' }],
      classes: [['nyx-segment', 'Container.'], ['label > input + span', 'Each segment (radio + visible label).']]
    },
    {
      id: 'rating', group: 'Signature', title: 'Rating', added: 'v1.1',
      summary: 'A five-star rating control. Hover and selection light up with pure CSS — no JavaScript.',
      sections: [{ title: 'Stars', demo: '<div class="nyx-rating"><input type="radio" name="rate" id="r5"><label for="r5"></label><input type="radio" name="rate" id="r4"><label for="r4"></label><input type="radio" name="rate" id="r3" checked><label for="r3"></label><input type="radio" name="rate" id="r2"><label for="r2"></label><input type="radio" name="rate" id="r1"><label for="r1"></label></div>' }],
      classes: [['nyx-rating', 'Reverse-ordered radio group (5→1) of star labels.']]
    },
    {
      id: 'empty-state', group: 'Signature', title: 'Empty state', added: 'v1.1',
      summary: 'A friendly placeholder for zero-data views — icon, message and a call to action.',
      sections: [{ title: 'No data', demo: '<div class="nyx-empty"><div class="nyx-empty-icon">📭</div><h4 class="nyx-h4">No projects yet</h4><p class="nyx-caption" style="margin:6px 0 16px">Create your first project to get started.</p><button class="nyx-btn nyx-btn-primary">New project</button></div>' }],
      classes: [['nyx-empty', 'Dashed placeholder card.'], ['nyx-empty-icon', 'Large icon.']]
    },
    {
      id: 'banner', group: 'Signature', title: 'Banner', added: 'v1.1',
      summary: 'A full-width announcement / promo strip with a gradient wash.',
      sections: [{ title: 'Announcement', demo: '<div class="nyx-banner"><span class="nyx-badge nyx-badge-info">New</span> Nyx v1.1 adds light mode &amp; full RTL. <a href="#/rtl" class="nyx-gradient-text" style="font-weight:600">Learn more →</a></div>' }],
      classes: [['nyx-banner', 'Gradient announcement bar.']]
    },
    {
      id: 'dropzone', group: 'Signature', title: 'Dropzone', added: 'v1.1',
      summary: 'A file-upload drop target with a hover glow. Wrap a hidden file input in the label.',
      sections: [{ title: 'Upload', demo: '<label class="nyx-dropzone"><div class="nyx-dz-icon">⬆️</div><strong>Drop files here</strong><span class="nyx-caption">or click to browse</span><input type="file" hidden></label>' }],
      classes: [['nyx-dropzone', 'Dashed drop target (use on a label wrapping a file input).']]
    },
    {
      id: 'sparkline', group: 'Signature', title: 'Sparkline', added: 'v1.2',
      summary: 'A tiny inline bar chart for trends inside cards and tables — pure CSS; set each bar height.',
      sections: [{ title: 'Trend', demo: '<div class="nyx-sparkline"><span style="height:40%"></span><span style="height:60%"></span><span style="height:35%"></span><span style="height:80%"></span><span style="height:55%"></span><span style="height:95%"></span><span style="height:70%"></span><span style="height:88%"></span></div>' }],
      classes: [['nyx-sparkline', 'Inline bar chart (height set per <span>).']]
    },

    /* ===== HELPERS ===== */
    {
      id: 'vertical-rule', group: 'Helpers', title: 'Vertical rule', added: 'v1.3',
      summary: 'A thin vertical divider between inline items.',
      sections: [{ title: 'Between items', demo: '<div class="nyx-flex nyx-items-center nyx-gap-3" style="height:28px"><span>Edit</span><span class="nyx-vr"></span><span>Share</span><span class="nyx-vr"></span><span>Delete</span></div>' }],
      classes: [['nyx-vr', 'Vertical 1px rule.']]
    },
    {
      id: 'visually-hidden', group: 'Helpers', title: 'Visually hidden', added: 'v1.3',
      summary: 'Hide content visually while keeping it available to screen readers.',
      sections: [{ title: 'Usage', lang: 'html', code: '<button class="nyx-btn nyx-btn-icon nyx-btn-primary">\n  🔔<span class="nyx-visually-hidden">Notifications</span>\n</button>' }],
      classes: [['nyx-visually-hidden', 'Screen-reader-only content.']]
    },
    {
      id: 'stretched-link', group: 'Helpers', title: 'Stretched link', added: 'v1.3',
      summary: 'Make a link cover its whole containing block, so an entire card becomes clickable.',
      sections: [{ title: 'Clickable card', demo: '<div class="nyx-card nyx-position-relative" style="max-width:260px"><h4 class="nyx-h4">Project Apollo</h4><p class="nyx-caption">Click anywhere on the card.</p><a href="#/stretched-link" class="nyx-stretched-link" aria-label="Open project"></a></div>' }],
      classes: [['nyx-stretched-link', 'On a link inside a position:relative parent.']]
    },
    {
      id: 'focus-ring', group: 'Helpers', title: 'Focus ring', added: 'v1.3',
      summary: 'Add the signature glow focus ring to any custom interactive element.',
      sections: [{ title: 'Focusable', demo: '<div tabindex="0" class="nyx-card nyx-focus-ring" style="max-width:260px;cursor:pointer">Tab to me to see the ring.</div>' }],
      classes: [['nyx-focus-ring', 'Glow ring on :focus.']]
    },
    {
      id: 'clearfix', group: 'Helpers', title: 'Clearfix', added: 'v1.3',
      summary: 'Clear floated children within a container.',
      sections: [{ title: 'Usage', lang: 'html', code: '<div class="nyx-clearfix">\n  <button style="float:left">Left</button>\n  <button style="float:right">Right</button>\n</div>' }],
      classes: [['nyx-clearfix', 'Clears floats.']]
    },
    {
      id: 'text-truncate', group: 'Helpers', title: 'Text truncation', added: 'v1.3',
      summary: 'Truncate long single-line text with an ellipsis.',
      sections: [{ title: 'Ellipsis', demo: '<div class="nyx-text-truncate nyx-card" style="max-width:220px">This is a very long line of text that will be truncated with an ellipsis.</div>' }],
      classes: [['nyx-text-truncate', 'Single-line ellipsis.']]
    },

    /* ===== UTILITIES ===== */
    {
      id: 'spacing', group: 'Utilities', title: 'Spacing', added: 'v1.3',
      summary: 'Margin and padding utilities on the 4px scale (0–6). m/p with sides t, b, s (start), e (end), plus mx-auto. Start/end are RTL-aware.',
      sections: [{ title: 'Examples', demo: '<div class="nyx-bg-surface-2 nyx-rounded nyx-p-4"><div class="nyx-bg-accent nyx-rounded nyx-p-2 nyx-mb-3">.nyx-p-2 .nyx-mb-3</div><div class="nyx-bg-glass nyx-border nyx-rounded nyx-p-3">.nyx-p-3</div></div>' }],
      classes: [['nyx-m-0…6 / nyx-p-0…6', 'All-sides margin / padding.'], ['nyx-mt/mb/ms/me-* · pt/pb/ps/pe-*', 'Per-side (start/end RTL-aware).'], ['nyx-mx-auto', 'Center horizontally.']]
    },
    {
      id: 'display', group: 'Utilities', title: 'Display', added: 'v1.3',
      summary: 'Set the CSS display property.',
      sections: [{ title: 'Values', demo: '<div class="nyx-flex nyx-gap-2"><span class="nyx-badge nyx-d-inline-block">inline-block</span><span class="nyx-badge nyx-d-none">hidden</span><span class="nyx-badge">visible</span></div>' }],
      classes: [['nyx-d-none / -block / -inline / -inline-block', 'Display values.'], ['nyx-d-flex / -inline-flex / -grid', 'Flex & grid.']]
    },
    {
      id: 'text', group: 'Utilities', title: 'Text', added: 'v1.3',
      summary: 'Alignment, transform, weight, truncation and color text utilities.',
      sections: [{ title: 'Alignment & color', demo: '<div class="nyx-stack" style="gap:6px"><p class="nyx-text-center">Centered</p><p class="nyx-text-end">End-aligned</p><p class="nyx-text-uppercase nyx-fw-bold nyx-text-accent">accent bold upper</p></div>' }],
      classes: [['nyx-text-start/-center/-end', 'Alignment (RTL-aware).'], ['nyx-text-uppercase/-lowercase/-capitalize', 'Transform.'], ['nyx-fw-normal/-medium/-bold', 'Weight.'], ['nyx-text-accent/-accent-2/-danger/-warning/-muted', 'Color.']]
    },
    {
      id: 'colors', group: 'Utilities', title: 'Colors', added: 'v1.3',
      summary: 'Background and text color utilities driven by theme tokens — they adapt to light/dark automatically.',
      sections: [{ title: 'Backgrounds', demo: '<div class="nyx-flex nyx-gap-2 nyx-wrap"><span class="nyx-bg-surface nyx-border nyx-rounded nyx-p-2">surface</span><span class="nyx-bg-surface-2 nyx-rounded nyx-p-2">surface-2</span><span class="nyx-bg-accent nyx-rounded nyx-p-2">accent</span><span class="nyx-bg-glass nyx-border nyx-rounded nyx-p-2">glass</span></div>' }],
      classes: [['nyx-bg-surface/-surface-2/-accent/-glass', 'Background.'], ['nyx-text-* (see Text)', 'Foreground color.']]
    },
    {
      id: 'borders', group: 'Utilities', title: 'Borders', added: 'v1.3',
      summary: 'Border and border-radius utilities.',
      sections: [{ title: 'Radii', demo: '<div class="nyx-flex nyx-gap-3 nyx-wrap"><span class="nyx-border nyx-rounded-sm nyx-p-3 nyx-bg-surface">sm</span><span class="nyx-border nyx-rounded nyx-p-3 nyx-bg-surface">md</span><span class="nyx-border nyx-rounded-lg nyx-p-3 nyx-bg-surface">lg</span><span class="nyx-border nyx-rounded-full nyx-p-3 nyx-bg-surface">full</span></div>' }],
      classes: [['nyx-border / nyx-border-0', 'Add / remove border.'], ['nyx-rounded / -sm / -lg / -full', 'Radius.']]
    },
    {
      id: 'shadows', group: 'Utilities', title: 'Shadows', added: 'v1.3',
      summary: 'Elevation and glow shadow utilities.',
      sections: [{ title: 'Elevation', demo: '<div class="nyx-flex nyx-gap-4 nyx-wrap"><span class="nyx-bg-surface nyx-rounded nyx-p-4 nyx-shadow-sm">sm</span><span class="nyx-bg-surface nyx-rounded nyx-p-4 nyx-shadow">md</span><span class="nyx-bg-surface nyx-rounded nyx-p-4 nyx-shadow-lg">lg</span><span class="nyx-bg-surface nyx-rounded nyx-p-4 nyx-shadow-glow">glow</span></div>' }],
      classes: [['nyx-shadow-sm / -shadow / -shadow-lg', 'Elevation.'], ['nyx-shadow-glow', 'Accent glow.']]
    },
    {
      id: 'sizing', group: 'Utilities', title: 'Sizing', added: 'v1.3',
      summary: 'Width and height utilities.',
      sections: [{ title: 'Widths', demo: '<div class="nyx-stack" style="gap:6px"><div class="nyx-bg-accent nyx-rounded nyx-p-1 nyx-text-center nyx-w-25">25%</div><div class="nyx-bg-accent nyx-rounded nyx-p-1 nyx-text-center nyx-w-50">50%</div><div class="nyx-bg-accent nyx-rounded nyx-p-1 nyx-text-center nyx-w-100">100%</div></div>' }],
      classes: [['nyx-w-25/50/75/100', 'Width %.'], ['nyx-mw-100 / nyx-h-100', 'Max-width / full height.']]
    },
    {
      id: 'opacity', group: 'Utilities', title: 'Opacity', added: 'v1.3',
      summary: 'Opacity utilities.',
      sections: [{ title: 'Levels', demo: '<div class="nyx-flex nyx-gap-2"><span class="nyx-bg-accent nyx-rounded nyx-p-2 nyx-opacity-25">25</span><span class="nyx-bg-accent nyx-rounded nyx-p-2 nyx-opacity-50">50</span><span class="nyx-bg-accent nyx-rounded nyx-p-2 nyx-opacity-75">75</span><span class="nyx-bg-accent nyx-rounded nyx-p-2 nyx-opacity-100">100</span></div>' }],
      classes: [['nyx-opacity-0/25/50/75/100', 'Opacity levels.']]
    },
    {
      id: 'position', group: 'Utilities', title: 'Position', added: 'v1.3',
      summary: 'Set the CSS position property.',
      sections: [{ title: 'Usage', lang: 'html', code: '<div class="nyx-position-relative">\n  <span class="nyx-position-absolute" style="top:0;inset-inline-end:0">badge</span>\n</div>' }],
      classes: [['nyx-position-relative/-absolute/-fixed/-sticky', 'Position values.']]
    },

    /* ===== MOTION ===== */
    {
      id: 'big-type', group: 'Motion', title: 'Big type', added: 'v1.3',
      summary: 'Oversized hero typography — the bold display-type trend. Fluid sizing via clamp(), with gradient, outline-stroke and animation options. In RTL it switches to the Aref Ruqaa cursive Arabic display face (Ruqʼah).',
      sections: [
        { title: 'Hero headline', demo: '<h1 class="nyx-bigtype">Ship <span class="nyx-gradient-text animated">faster</span></h1>' },
        { title: 'Outline stroke', demo: '<h1 class="nyx-bigtype nyx-bigtype-sm">DESIGN <span class="stroke">SYSTEM</span></h1>' }
      ],
      classes: [['nyx-bigtype', 'Fluid oversized display type.'], ['nyx-bigtype-sm', 'Smaller scale.'], ['.stroke', 'Outlined (transparent) text.'], ['nyx-gradient-text.animated', 'Animated gradient sweep.']]
    },
    {
      id: 'animations', group: 'Motion', title: 'Animations', added: 'v1.3',
      summary: 'Entrance animations with stagger delays, a floating loop, an animated gradient sweep, and a rotating aurora backdrop for heroes. All honor prefers-reduced-motion.',
      sections: [
        { title: 'Entrances (stagger)', demo: '<div class="nyx-flex nyx-gap-3 nyx-wrap"><span class="nyx-badge nyx-anim-up nyx-anim-delay-1">up</span><span class="nyx-badge nyx-anim-fade nyx-anim-delay-2">fade</span><span class="nyx-badge nyx-anim-zoom nyx-anim-delay-3">zoom</span></div>' },
        { title: 'Float loop', demo: '<div class="nyx-avatar nyx-anim-float">N</div>' },
        { title: 'Aurora hero', demo: '<div class="nyx-aurora nyx-card" style="text-align:center;padding:40px"><h3 class="nyx-h2">Animated <span class="nyx-gradient-text animated">aurora</span></h3><p class="nyx-muted">A rotating conic-gradient glow behind your content.</p></div>' }
      ],
      classes: [['nyx-anim-fade / -up / -zoom', 'One-shot entrance animations.'], ['nyx-anim-delay-1…4', 'Stagger delays.'], ['nyx-anim-float', 'Gentle floating loop.'], ['nyx-aurora', 'Rotating aurora backdrop (wrap content).']]
    },
    {
      id: 'reveal', group: 'Motion', title: 'Scroll reveal', added: 'v1.3',
      summary: 'Add data-nyx-reveal to fade-and-rise elements in as they scroll into view — wired automatically by the runtime via IntersectionObserver.',
      sections: [{ title: 'Usage', lang: 'html', code: '<div data-nyx-reveal>\n  I fade and rise into view on scroll.\n</div>' }],
      classes: [['data-nyx-reveal', 'Reveal-on-scroll (runtime adds .nyx-reveal then .nyx-in).']]
    }
  ];

  var byId = {};
  PAGES.forEach(function (p) { byId[p.id] = p; });

  /* group display order (mirrors Bootstrap's docs taxonomy) */
  var GROUP_ORDER = ['Getting Started', 'Customize', 'Layout', 'Content', 'Forms', 'Components', 'Helpers', 'Utilities', 'Signature', 'Motion'];
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
      seen[g].forEach(function (p) { html += '<a href="#/' + p.id + '" data-id="' + p.id + '">' + L(p, 'title') + '</a>'; });
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
      '<div class="doc-meta">' + (p.added ? '<span class="nyx-badge nyx-badge-success">' + C('added', 'Added in') + ' ' + p.added + '</span>' : '') +
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
        '<table class="docs-table"><thead><tr><th>Method</th><th>Description</th></tr></thead><tbody>' +
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
    if (code && navigator.clipboard) navigator.clipboard.writeText(code.innerText).then(function () { Nyx.toast('Copied to clipboard', 'success', 1500); });
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
