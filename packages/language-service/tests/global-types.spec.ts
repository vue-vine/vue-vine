import { getDefaultCompilerOptions } from '@vue/language-core'
import { describe, expect, it } from 'vitest'
import { generateGlobalTypes } from '../src/injectTypes'

describe('verify global types generation', () => {
  it('should match with fixture.vine.ts virtual code', () => {
    const globalTypes = generateGlobalTypes(
      getDefaultCompilerOptions(
        (void 0),
        (void 0),
        true, // enable strict templates by default
      ),
    )

    expect(globalTypes).toMatchSnapshot()
  })
})
