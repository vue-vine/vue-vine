import type prettier from 'prettier'
import { makeModuleSynchronized } from 'make-synchronized'

// Copied from 'make-synchronized' type definitions
type AnyFunction = (...argumentsList: any[]) => any
type AsynchronousFunction = (...argumentsList: any[]) => Promise<any>
type ObjectWithFunctions = Record<string, any>
type SynchronizedFunction<
  InputAsynchronousFunction extends AnyFunction = AnyFunction,
> = (
  ...argumentsList: Parameters<InputAsynchronousFunction>
) => Awaited<ReturnType<InputAsynchronousFunction>>
type SynchronizedObject<
  InputObject extends ObjectWithFunctions = ObjectWithFunctions,
> = {
  [Key in keyof InputObject]: InputObject[Key] extends AsynchronousFunction
    ? SynchronizedFunction<InputObject[Key]>
    : Awaited<InputObject[Key]>
}

const syncPrettier: SynchronizedObject<typeof prettier> = makeModuleSynchronized('prettier')

export default syncPrettier
