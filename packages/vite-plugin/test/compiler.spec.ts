import { describe, expect, test } from 'vitest'
import { compileVineTemplate } from '../src/compile-template'
import { VineBindingTypes } from '../src/shared'

describe('Template compile', () => {
  test('vue/compiler-dom should work', () => {
    const { code, preamble } = compileVineTemplate(`
      <h1>Hello Vine</h1>
      <p>{{ msg }}</p>
      <input v-model="msg">
    `, {
      bindingMetadata: {
        msg: VineBindingTypes.SETUP_MAYBE_REF,
      },
      scopeId: 'test',
    })
    expect(code).toMatchInlineSnapshot(`
      "(_ctx: any,_cache: any) => {
        return (_openBlock(), _createElementBlock(_Fragment, null, [
          _hoisted_1,
          _createElementVNode(\\"p\\", null, _toDisplayString(_unref(msg)), 1 /* TEXT */),
          _withDirectives(_createElementVNode(\\"input\\", {
            \\"onUpdate:modelValue\\": _cache[0] || (_cache[0] = ($event: any) => (_isRef(msg) ? (msg).value = $event : null))
          }, null, 512 /* NEED_PATCH */), [
            [_vModelText, _unref(msg)]
          ])
        ], 64 /* STABLE_FRAGMENT */))
      }"
    `)
    expect(preamble).toMatchInlineSnapshot(`
      "import { createElementVNode as _createElementVNode, unref as _unref, toDisplayString as _toDisplayString, isRef as _isRef, vModelText as _vModelText, withDirectives as _withDirectives, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock } from \\"vue\\"

      const _hoisted_1 = /*#__PURE__*/_createElementVNode(\\"h1\\", null, \\"Hello Vine\\", -1 /* HOISTED */)

      "
    `)
  })
})
