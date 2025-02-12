import { format } from 'prettier'
import { describe, expect, it } from 'vitest'
import { compileVineTypeScriptFile } from '../src'
import { createMockTransformCtx } from './test-utils'

describe('test vapor mode', async () => {
  it('should compile in vapor mode', async () => {
    const { mockCompilerCtx, mockCompilerHooks } = createMockTransformCtx()
    const sample = `
function VaporExample() {
  'use vapor'

  return vine\`
    <div class="test-vapor">
      <button @click="increment"> +1 </button>
      <button @click="decrement"> -1 </button>
      <p> count: {{ count }} </p>
    </div>
  \`
}
    `

    compileVineTypeScriptFile(sample, 'vapor-example', { compilerHooks: mockCompilerHooks })

    expect(mockCompilerCtx.vineCompileErrors.length).toBe(0)
    const fileCtx = mockCompilerCtx.fileCtxMap.get('vapor-example')
    const transformed = fileCtx?.fileMagicCode.toString() ?? ''
    const formated = await format(transformed, { parser: 'babel-ts' })
    expect(formated).toMatchInlineSnapshot(`
      "import {
        child as _child,
        next as _next,
        toDisplayString as _toDisplayString,
        setText as _setText,
        renderEffect as _renderEffect,
        delegateEvents as _delegateEvents,
        template as _template,
        defineComponent as _defineComponent,
        useCssVars as _useCssVars,
        unref as _unref,
      } from "vue";

      export const VaporExample = (() => {
        const t0 = _template(
          '<div data-v-48e8aa0d class="test-vapor"><button data-v-48e8aa0d> +1 </button><button data-v-48e8aa0d> -1 </button><p data-v-48e8aa0d> </p></div>',
          true,
        );
        _delegateEvents("click");
        const __vine = _defineComponent({
          name: "VaporExample",
          /* No props */
          /* No emits */
          setup(__props, { expose: __expose }) {
            __expose();
            const props = __props;

            const n3 = t0();
            const n0 = _child(n3);
            const n1 = _next(n0);
            const n2 = _next(n1);
            n0.$evtclick = (e) => increment(e);
            n1.$evtclick = (e) => decrement(e);
            const x2 = _child(n2);
            _renderEffect(() => _setText(x2, " count: " + _toDisplayString(count)));
            return n3;
          },
        });

        __vine.__hmrId = "48e8aa0d";

        return __vine;
      })();

      typeof __VUE_HMR_RUNTIME__ !== "undefined" &&
        __VUE_HMR_RUNTIME__.createRecord(VaporExample.__hmrId, VaporExample);
      export const _rerender_only = false;
      export const _rerender_vcf_fn_name = "";
      if (import.meta.hot) {
        import.meta.hot.accept((mod) => {
          if (!mod) {
            return;
          }
          const { _rerender_only, _rerender_vcf_fn_name } = mod;
          if (!_rerender_vcf_fn_name) {
            return;
          }
          const component = mod[_rerender_vcf_fn_name];
          if (_rerender_only) {
            __VUE_HMR_RUNTIME__.rerender(component.__hmrId, component.render);
          } else {
            __VUE_HMR_RUNTIME__.reload(component.__hmrId, component);
          }
        });
      }
      "
    `)
  })
})
