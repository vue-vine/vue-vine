import { describe, expect, it } from 'vitest'
import { createBrowserContext, createEvaluator, runTestAtPage, wait } from '../utils/test-utils'

describe('test todo list', async () => {
  const browserCtx = await createBrowserContext()
  const evaluator = createEvaluator(browserCtx)

  const addTodo = async (text: string) => {
    await evaluator.inputText('.todo-input', text)
    await evaluator.click('.todo-add-btn')
    await wait(100)
  }

  it(
    'should work',
    runTestAtPage(
      '/todo-list',
      browserCtx,
      async () => {
        expect(await evaluator.getElementCount('.todo-item')).toBe(0)

        await addTodo('todo test 1')
        expect(await evaluator.getElementCount('.todo-item')).toBe(1)

        await addTodo('todo test 2')
        await addTodo('todo test 3')
        await addTodo('todo test 4')
        expect(await evaluator.getElementCount('.todo-item')).toBe(4)

        await evaluator.click('.todo-item:nth-child(2) .todo-complete-btn')
        expect(await evaluator.getElementCount('.todo-item')).toBe(4)
        await wait(200)

        await evaluator.click('.todo-item:nth-child(2) .todo-delete-btn')
        expect(await evaluator.getElementCount('.todo-item')).toBe(3)
        await wait(200)

        await evaluator.click('.todo-item:nth-child(2) .todo-complete-btn')
        expect(await evaluator.getElementCount('.todo-item')).toBe(3)
        await wait(200)

        await evaluator.click('.todo-item:nth-child(2) .todo-delete-btn')
        expect(await evaluator.getElementCount('.todo-item')).toBe(2)

        await evaluator.click('.todo-item:nth-child(2) .todo-cancel-btn')
        expect(await evaluator.getElementCount('.todo-item')).toBe(2)
      },
    )
  )
})