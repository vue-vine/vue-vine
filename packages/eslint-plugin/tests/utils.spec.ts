import { describe, expect, it } from 'vitest'
import { checkPascalCase } from '../src/utils'

describe('test utils', () => {
  describe('checkPascalCase', () => {
    it('should return true if the function name is in PascalCase', () => {
      expect(checkPascalCase('FooBar')).toBe(true)
      expect(checkPascalCase('E2ETestComp')).toBe(true)
      expect(checkPascalCase('ChildComp1')).toBe(true)
    })
  })
})
