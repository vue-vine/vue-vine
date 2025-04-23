# format-html-self-closing ![](https://img.shields.io/badge/vue_vine-format-emerald)

This rule aims to enforce the self-closing sign as the configured style.

In Vue.js template, we can use either two styles for elements which don't have their content.

- `<YourComponent></YourComponent>`
- `<YourComponent/>` (self-closing)

Self-closing is simple and shorter, but it's not supported in the HTML spec.

<!-- eslint-skip -->
```html
<!-- ✓ GOOD -->
<div/>
<img>
<MyComponent/>
<svg><path d=""/></svg>

<!-- ✗ BAD -->
<div></div>
<img/>
<MyComponent></MyComponent>
<svg><path d=""></path></svg>
```

## Options

```json
{
  "vue/html-self-closing": ["error", {
    "html": {
      "void": "always", // We don't keep the same with eslint-plugin-vue here because we prefer prettier's style in format-vine-template
      "normal": "always",
      "component": "always"
    },
    "svg": "always",
    "math": "always"
  }]
}
```

- `html.void` (`"never"` by default) ... The style of well-known HTML void elements.
- `html.normal` (`"always"` by default) ... The style of well-known HTML elements except void elements.
- `html.component` (`"always"` by default) ... The style of Vue.js custom components.
- `svg`(`"always"` by default) .... The style of well-known SVG elements.
- `math`(`"always"` by default) .... The style of well-known MathML elements.

Every option can be set to one of the following values:

- "always" ... Require self-closing at elements which don't have their content.
- "never" ... Disallow self-closing.
- "any" ... Don't enforce self-closing style.

See results for `html: {normal: "never", void: "always"}`

```html
<!-- ✓ GOOD -->
<div></div>
<img/>
<MyComponent/>
<svg><path d=""/></svg>

<!-- ✗ BAD -->
<div/>
<img>
<MyComponent></MyComponent>
<svg><path d=""></path></svg>
```
