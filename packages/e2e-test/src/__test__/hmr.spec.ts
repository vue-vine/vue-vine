import { afterEach, describe, expect, test } from 'vitest'
import { editFile, getColor, untilUpdated } from '../../utils/test-utils'
import { page } from '../../utils/vitest-setup'

afterEach(() => {
  // reset
  editFile('app.vine.ts', code => code.replace('color: red', 'color: #fff'))
  // reset
  editFile('app.vine.ts', code => code.replace('change', 'Random pick a post'))
  // reset
  editFile('app.vine.ts', code => code.replace('ref(\'van\')', 'ref(\'vine\')'))
  // reset
  editFile('app.vine.ts', code =>
    code.replace('<span class="name">\n      {{name}}\n    </span>',
      '<p class="name">\n      {{name}}\n    </p>'),
  )
})
describe('hmr', () => {
  test('should re-render and preserve state when template is edited', async () => {
    await untilUpdated(() => {
      return page.textContent('button.btn')
    }, 'Random pick a post')

    editFile('app.vine.ts', code => code.replace('Random pick a post', 'change'))
    await untilUpdated(() => {
      return page.textContent('button.btn')
    }, 'Random pick a post')
  })

  test('should update style and preserve state when style is edited', async () => {
    expect(await getColor('.btn')).toBe('rgb(255, 255, 255)')
    editFile('app.vine.ts', code => code.replace('color: #fff', 'color: red'))
    await untilUpdated(() => getColor('.btn'), 'rgb(255, 0, 0)')
  })

  test('should reload and reset state when script is edited', async () => {
    editFile('app.vine.ts', code =>
      code.replace('ref(\'vine\')', 'ref(\'van\')'),
    )
    await untilUpdated(() => page.textContent('.name'), 'van')
  })

  test('should re-render when template is emptied', async () => {
    editFile('app.vine.ts', code =>
      code.replace('<p class="name">\n      {{name}}\n    </p>',
        '<span class="name">\n      {{name}}\n    </span>'),
    )
    await untilUpdated(() => page.textContent('span'), 'vine')
  })
})
