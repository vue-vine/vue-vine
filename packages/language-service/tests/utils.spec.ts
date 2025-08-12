import { describe, expect, it } from 'vitest'
import { convertEmitToOnHandler, needsQuotes } from '../src/codegen'

describe('convertEmitToOnHandler', () => {
  describe('complex property names (containing special characters)', () => {
    it('should handle emit names containing colons', () => {
      expect(convertEmitToOnHandler('update:modelValue')).toBe('onUpdate:modelValue')
      expect(convertEmitToOnHandler('update:something')).toBe('onUpdate:something')
      expect(convertEmitToOnHandler('change:value')).toBe('onChange:value')
    })

    it('should handle emit names containing underscores', () => {
      expect(convertEmitToOnHandler('custom_event')).toBe('onCustom_event')
      expect(convertEmitToOnHandler('user_login')).toBe('onUser_login')
      expect(convertEmitToOnHandler('data_change')).toBe('onData_change')
    })

    it('should handle emit names containing dots', () => {
      expect(convertEmitToOnHandler('namespace.event')).toBe('onNamespace.event')
      expect(convertEmitToOnHandler('module.action')).toBe('onModule.action')
    })

    it('should handle emit names containing double colons', () => {
      expect(convertEmitToOnHandler('event::name')).toBe('onEvent::name')
      expect(convertEmitToOnHandler('module::action')).toBe('onModule::action')
    })

    it('should handle emit names containing mixed special characters', () => {
      expect(convertEmitToOnHandler('update:model_value')).toBe('onUpdate:model_value')
      expect(convertEmitToOnHandler('change:data.value')).toBe('onChange:data.value')
      expect(convertEmitToOnHandler('ns::event_name')).toBe('onNs::event_name')
    })

    it('should handle emit names starting with special characters', () => {
      expect(convertEmitToOnHandler(':special')).toBe('on:special')
      expect(convertEmitToOnHandler('_private')).toBe('on_private')
      expect(convertEmitToOnHandler('.dotted')).toBe('on.dotted')
    })
  })

  describe('simple property names (only containing letters and numbers)', () => {
    it('should handle simple emit names', () => {
      expect(convertEmitToOnHandler('click')).toBe('onClick')
      expect(convertEmitToOnHandler('change')).toBe('onChange')
      expect(convertEmitToOnHandler('input')).toBe('onInput')
    })

    it('should handle emit names containing hyphens (camel case conversion)', () => {
      expect(convertEmitToOnHandler('my-event')).toBe('onMyEvent')
      expect(convertEmitToOnHandler('user-click')).toBe('onUserClick')
      expect(convertEmitToOnHandler('data-change')).toBe('onDataChange')
    })

    it('should handle multiple hyphens in emit names', () => {
      expect(convertEmitToOnHandler('very-long-event-name')).toBe('onVeryLongEventName')
      expect(convertEmitToOnHandler('a-b-c-d')).toBe('onABCD')
    })

    it('should handle emit names containing numbers', () => {
      expect(convertEmitToOnHandler('event1')).toBe('onEvent1')
      expect(convertEmitToOnHandler('data2change')).toBe('onData2change')
      expect(convertEmitToOnHandler('test123')).toBe('onTest123')
    })

    it('should handle mixed case emit names', () => {
      expect(convertEmitToOnHandler('myEvent')).toBe('onMyEvent')
      expect(convertEmitToOnHandler('DataChange')).toBe('onDataChange')
      expect(convertEmitToOnHandler('userAction')).toBe('onUserAction')
    })
  })

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      expect(convertEmitToOnHandler('')).toBe('on')
    })

    it('should handle single character emit names', () => {
      expect(convertEmitToOnHandler('a')).toBe('onA')
      expect(convertEmitToOnHandler('1')).toBe('on1')
      expect(convertEmitToOnHandler(':')).toBe('on:')
      expect(convertEmitToOnHandler('_')).toBe('on_')
    })

    it('should handle emit names containing only special characters', () => {
      expect(convertEmitToOnHandler(':::')).toBe('on:::')
      expect(convertEmitToOnHandler('___')).toBe('on___')
      expect(convertEmitToOnHandler('...')).toBe('on...')
    })

    it('should handle long strings', () => {
      const longEmit = 'very-very-very-long-event-name-with-many-words'
      const expected = 'onVeryVeryVeryLongEventNameWithManyWords'
      expect(convertEmitToOnHandler(longEmit)).toBe(expected)
    })
  })
})

describe('needsQuotes', () => {
  describe('should return true for invalid JavaScript identifiers', () => {
    it('should handle property names containing special characters', () => {
      expect(needsQuotes('onUpdate:modelValue')).toBe(true)
      expect(needsQuotes('onChange:value')).toBe(true)
      expect(needsQuotes('onNamespace.event')).toBe(true)
      expect(needsQuotes('onEvent::name')).toBe(true)
    })

    it('should handle property names starting with numbers', () => {
      expect(needsQuotes('123invalid')).toBe(true)
      expect(needsQuotes('1event')).toBe(true)
    })

    it('should handle property names with spaces', () => {
      expect(needsQuotes('on event')).toBe(true)
      expect(needsQuotes('my prop')).toBe(true)
    })

    it('should handle property names with other special characters', () => {
      expect(needsQuotes('on-event')).toBe(true) // hyphen is not valid in identifier
      expect(needsQuotes('on@event')).toBe(true)
      expect(needsQuotes('on#event')).toBe(true)
      expect(needsQuotes('on%event')).toBe(true)
    })

    it('should handle empty string', () => {
      expect(needsQuotes('')).toBe(true)
    })
  })

  describe('should return false for valid JavaScript identifiers', () => {
    it('should handle simple camelCase property names', () => {
      expect(needsQuotes('onClick')).toBe(false)
      expect(needsQuotes('onChange')).toBe(false)
      expect(needsQuotes('onInput')).toBe(false)
      expect(needsQuotes('onMyEvent')).toBe(false)
    })

    it('should handle property names starting with valid characters', () => {
      expect(needsQuotes('onEvent')).toBe(false)
      expect(needsQuotes('_private')).toBe(false)
      expect(needsQuotes('$special')).toBe(false)
      expect(needsQuotes('a')).toBe(false)
    })

    it('should handle property names with numbers (but not starting with)', () => {
      expect(needsQuotes('onEvent1')).toBe(false)
      expect(needsQuotes('data2change')).toBe(false)
      expect(needsQuotes('test123')).toBe(false)
    })

    it('should handle property names with underscores and dollar signs', () => {
      expect(needsQuotes('on_event')).toBe(false)
      expect(needsQuotes('onCustom_event')).toBe(false)
      expect(needsQuotes('$onEvent')).toBe(false)
      expect(needsQuotes('_on_event_')).toBe(false)
      expect(needsQuotes('$$private$$')).toBe(false)
    })
  })
})
