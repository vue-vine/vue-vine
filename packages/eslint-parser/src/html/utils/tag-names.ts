/**
 * HTML tag names.
 */
export const HTML_TAGS = new Set([
  'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base',
  'bdi', 'bdo', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption',
  'cite', 'code', 'col', 'colgroup', 'data', 'datalist', 'dd', 'del',
  'details', 'dfn', 'dialog', 'div', 'dl', 'document', 'dt', 'em', 'embed',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'iframe',
  'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'link', 'main',
  'map', 'mark', 'marquee', 'menu', 'meta', 'meter', 'nav', 'noscript',
  'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param', 'picture',
  'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script',
  'section', 'select', 'slot', 'small', 'source', 'span', 'strong', 'style',
  'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'template', 'textarea',
  'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track', 'u', 'ul', 'var',
  'video', 'wbr',
])

/**
 * HTML tag names of void elements.
 */
export const HTML_VOID_ELEMENT_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
])

/**
 * https://github.com/vuejs/vue/blob/e4da249ab8ef32a0b8156c840c9d2b9773090f8a/src/platforms/web/compiler/util.js#L12
 */
export const HTML_CAN_BE_LEFT_OPEN_TAGS = new Set([
  'colgroup', 'li', 'options', 'p', 'td', 'tfoot', 'th', 'thead',
  'tr', 'source',
])

/**
 * https://github.com/vuejs/vue/blob/e4da249ab8ef32a0b8156c840c9d2b9773090f8a/src/platforms/web/compiler/util.js#L18
 */
export const HTML_NON_FHRASING_TAGS = new Set([
  'address', 'article', 'aside', 'base', 'blockquote', 'body', 'caption',
  'col', 'colgroup', 'dd', 'details', 'dialog', 'div', 'dl', 'dt', 'fieldset',
  'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5',
  'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'legend', 'li', 'menuitem',
  'meta', 'optgroup', 'option', 'param', 'rp', 'rt', 'source', 'style',
  'summary', 'tbody', 'td', 'tfoot', 'th', 'thead', 'title', 'tr', 'track',
])

/**
 * HTML tag names of RCDATA.
 */
export const HTML_RCDATA_TAGS = new Set([
  'title', 'textarea',
])

/**
 * HTML tag names of RAWTEXT.
 */
export const HTML_RAWTEXT_TAGS = new Set([
  'style', 'xmp', 'iframe', 'noembed', 'noframes', 'noscript', 'script',
])

/**
 * SVG tag names.
 */
export const SVG_TAGS = new Set([
  'a', 'altGlyph', 'altGlyphDef', 'altGlyphItem', 'animate', 'animateColor',
  'animateMotion', 'animateTransform', 'animation', 'audio', 'canvas',
  'circle', 'clipPath', 'color-profile', 'cursor', 'defs', 'desc', 'discard',
  'ellipse', 'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite',
  'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap',
  'feDistantLight', 'feDropShadow', 'feFlood', 'feFuncA', 'feFuncB',
  'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode',
  'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting',
  'feSpotLight', 'feTile', 'feTurbulence', 'filter', 'font', 'font-face',
  'font-face-format', 'font-face-name', 'font-face-src', 'font-face-uri',
  'foreignObject', 'g', 'glyph', 'glyphRef', 'handler', 'hatch', 'hatchpath',
  'hkern', 'iframe', 'image', 'line', 'linearGradient', 'listener', 'marker',
  'mask', 'mesh', 'meshgradient', 'meshpatch', 'meshrow', 'metadata',
  'missing-glyph', 'mpath', 'path', 'pattern', 'polygon', 'polyline',
  'prefetch', 'radialGradient', 'rect', 'script', 'set', 'solidColor',
  'solidcolor', 'stop', 'style', 'svg', 'switch', 'symbol', 'tbreak', 'text',
  'textArea', 'textPath', 'title', 'tref', 'tspan', 'unknown', 'use', 'video',
  'view', 'vkern',
])

/**
 * The map from lowercase names to actual names in SVG.
 */
export const SVG_ELEMENT_NAME_MAP = new Map<string, string>()
for (const name of SVG_TAGS) {
  if (/[A-Z]/.test(name)) {
    SVG_ELEMENT_NAME_MAP.set(name.toLowerCase(), name)
  }
}

/**
 * MathML tag names.
 */
export const MATHML_TAGS = new Set([
  'abs', 'and', 'annotation', 'annotation-xml', 'apply', 'approx', 'arccos',
  'arccosh', 'arccot', 'arccoth', 'arccsc', 'arccsch', 'arcsec', 'arcsech',
  'arcsin', 'arcsinh', 'arctan', 'arctanh', 'arg', 'bind', 'bvar', 'card',
  'cartesianproduct', 'cbytes', 'ceiling', 'cerror', 'ci', 'cn', 'codomain',
  'complexes', 'compose', 'condition', 'conjugate', 'cos', 'cosh', 'cot',
  'coth', 'cs', 'csc', 'csch', 'csymbol', 'curl', 'declare', 'degree',
  'determinant', 'diff', 'divergence', 'divide', 'domain',
  'domainofapplication', 'emptyset', 'encoding', 'eq', 'equivalent',
  'eulergamma', 'exists', 'exp', 'exponentiale', 'factorial', 'factorof',
  'false', 'floor', 'fn', 'forall', 'function', 'gcd', 'geq', 'grad', 'gt',
  'ident', 'image', 'imaginary', 'imaginaryi', 'implies', 'in', 'infinity',
  'int', 'integers', 'intersect', 'interval', 'inverse', 'lambda',
  'laplacian', 'lcm', 'leq', 'limit', 'list', 'ln', 'log', 'logbase',
  'lowlimit', 'lt', 'm:apply', 'm:mrow', 'maction', 'malign', 'maligngroup',
  'malignmark', 'malignscope', 'math', 'matrix', 'matrixrow', 'max', 'mean',
  'median', 'menclose', 'merror', 'mfenced', 'mfrac', 'mfraction', 'mglyph',
  'mi', 'mi"', 'min', 'minus', 'mlabeledtr', 'mlongdiv', 'mmultiscripts',
  'mn', 'mo', 'mode', 'moment', 'momentabout', 'mover', 'mpadded', 'mphantom',
  'mprescripts', 'mroot', 'mrow', 'ms', 'mscarries', 'mscarry', 'msgroup',
  'msline', 'mspace', 'msqrt', 'msrow', 'mstack', 'mstyle', 'msub', 'msubsup',
  'msup', 'mtable', 'mtd', 'mtext', 'mtr', 'munder', 'munderover',
  'naturalnumbers', 'neq', 'none', 'not', 'notanumber', 'notin',
  'notprsubset', 'notsubset', 'or', 'otherwise', 'outerproduct',
  'partialdiff', 'pi', 'piece', 'piecewice', 'piecewise', 'plus', 'power',
  'primes', 'product', 'prsubset', 'quotient', 'rationals', 'real', 'reals',
  'reln', 'rem', 'root', 'scalarproduct', 'sdev', 'sec', 'sech', 'select',
  'selector', 'semantics', 'sep', 'set', 'setdiff', 'share', 'sin', 'sinh',
  'span', 'subset', 'sum', 'tan', 'tanh', 'tendsto', 'times', 'transpose',
  'true', 'union', 'uplimit', 'var', 'variance', 'vector', 'vectorproduct',
  'xor',
])
