import { format } from 'prettier'
import { describe, expect, it } from 'vitest'
import { defaultPrettierOptions } from '../src/rules/format/format-vine-template'
import { checkPascalCase } from '../src/utils'

describe('test utils', () => {
  describe('checkPascalCase', () => {
    it('should return true if the function name is in PascalCase', () => {
      expect(checkPascalCase('FooBar')).toBe(true)
      expect(checkPascalCase('E2ETestComp')).toBe(true)
      expect(checkPascalCase('ChildComp1')).toBe(true)
    })
  })

  describe('test prettier output', () => {
    it('should format the code with the default prettier options', async () => {
      const code = `
<div
  class="flex flex-col justify-center items-center p-2 transition shadow-md rounded-lg"
  :data-testid="testId"
 >     
  <p
  v-text="sampleText"
class="paragraph"
  />

  <MyComponent
 :foo="'hello'"
 :bar="123"
     baz
     :class="{
  active:
      count > 0
    ,
    }"
  >
     <template #default>
 <span :class="[
 'text-red-500',
    'font-bold',
 ]">This is a placeholder</span>
     </template>

  </MyComponent>
</div>
      `

      const formattedCode = await format(
        `<template>\n${code}</template>`,
        {
          parser: 'vue',
          ...defaultPrettierOptions,
        },
      )

      expect(`\n${formattedCode}`).toMatchInlineSnapshot(`
        "
        <template>
          <div
            class="flex flex-col justify-center items-center p-2 transition shadow-md rounded-lg"
            :data-testid="testId"
          >
            <p v-text="sampleText" class="paragraph" />

            <MyComponent
              :foo="'hello'"
              :bar="123"
              baz
              :class="{
                active: count > 0,
              }"
            >
              <template #default>
                <span :class="['text-red-500', 'font-bold']">This is a placeholder</span>
              </template>
            </MyComponent>
          </div>
        </template>
        "
      `)
    })
  })
})
