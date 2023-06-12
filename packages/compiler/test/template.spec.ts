import { describe, expect, test } from 'vitest'
import { html } from '@ast-grep/napi'
import { findTemplateAllIdentifiers } from '../src/template/parse'
import { compileVineTemplate } from '../src/template/compose'
import { VineBindingTypes } from '../src/types'
import { dedupe } from '../src/utils'

describe('Template compile', () => {
  test('vue/compiler-dom inline mode', () => {
    const { code, preamble } = compileVineTemplate(`
      <h1>Hello Vine</h1>
      <p>{{ msg }}</p>
      <input v-model="msg">
    `, {
      bindingMetadata: { msg: VineBindingTypes.SETUP_MAYBE_REF },
      scopeId: 'data-v-test',
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
      "import { createElementVNode as _createElementVNode, unref as _unref, toDisplayString as _toDisplayString, isRef as _isRef, vModelText as _vModelText, withDirectives as _withDirectives, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, pushScopeId as _pushScopeId, popScopeId as _popScopeId } from \\"vue\\"

      const _withScopeId = n => (_pushScopeId(\\"data-v-test\\"),n=n(),_popScopeId(),n)
      const _hoisted_1 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode(\\"h1\\", null, \\"Hello Vine\\", -1 /* HOISTED */))

      "
    `)
  })

  test('vue/compiler-dom not-inline mode', () => {
    const { code } = compileVineTemplate(`
      <h1>Hello Vine</h1>
      <p>{{ msg }}</p>
      <input v-model="msg">
    `, {
      inline: false,
      bindingMetadata: { msg: VineBindingTypes.SETUP_MAYBE_REF },
      scopeId: 'data-v-test',
    })
    expect(code).toMatchInlineSnapshot(`
      "import { createElementVNode as _createElementVNode, toDisplayString as _toDisplayString, vModelText as _vModelText, withDirectives as _withDirectives, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, pushScopeId as _pushScopeId, popScopeId as _popScopeId } from \\"vue\\"

      const _withScopeId = n => (_pushScopeId(\\"data-v-test\\"),n=n(),_popScopeId(),n)
      const _hoisted_1 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode(\\"h1\\", null, \\"Hello Vine\\", -1 /* HOISTED */))

      export function render(_ctx: any,_cache: any,$props: any,$setup: any,$data: any,$options: any) {
        return (_openBlock(), _createElementBlock(_Fragment, null, [
          _hoisted_1,
          _createElementVNode(\\"p\\", null, _toDisplayString($setup.msg), 1 /* TEXT */),
          _withDirectives(_createElementVNode(\\"input\\", {
            \\"onUpdate:modelValue\\": _cache[0] || (_cache[0] = ($event: any) => (($setup.msg) = $event))
          }, null, 512 /* NEED_PATCH */), [
            [_vModelText, $setup.msg]
          ])
        ], 64 /* STABLE_FRAGMENT */))
      }"
    `)
  })
})

describe('template parsing tests', () => {
  test('should extract out all TypeScript part', () => {
    const templateAst = html.parse(`
    <div class="main-container" v-bind:class="{
      display: style.isFlex ? 'flex' : 'block',
      'flex-direction': style.isColumn ? 'column' : 'row',
    }">
      <div class="header-title" v-if="title">{{ title.length > 10 ? title.slice(0, 10) : title }}</div>
      <div class="labels-bar">
        <div class="label" v-for="l in labels" :key="l.id">{{ l.text }}</div>
      </div>
      <p>
        Content: {{ content }}
      </p>

      <div class="footer">
        <button @click="goPrev">Prev Article</button>
        <button v-on:click="(i) => navigate(i+1)">Next article</button>
      </div>
    </div>
    `.trim()).root()
    const allIdentifiers = findTemplateAllIdentifiers(templateAst)
    expect(
      dedupe(allIdentifiers.map(id => id.text())),
    ).toMatchInlineSnapshot(`
      [
        "style",
        "title",
        "l",
        "labels",
        "goPrev",
        "i",
        "navigate",
        "content",
      ]
    `)
  })
})
