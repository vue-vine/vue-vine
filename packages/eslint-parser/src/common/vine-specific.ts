import type { TSESTree } from '@typescript-eslint/types'
import * as tsEscopeTypes from '@typescript-eslint/scope-manager'
import { ReferenceFlag, ReferenceTypeFlag } from '../types'

export function createVirtualVineFnPropsReference(
  {
    compFnPropsIdentifier,
    foundVCFScope,
  }: {
    compFnPropsIdentifier: TSESTree.Identifier
    foundVCFScope: tsEscopeTypes.Scope
  },
): tsEscopeTypes.Reference {
  // Generate a virtual reference to the `props` variable
  const virtualReference = new tsEscopeTypes.Reference(
    compFnPropsIdentifier,
    foundVCFScope,
    ReferenceFlag.Read,
    undefined,
    undefined,
    undefined,
    ReferenceTypeFlag.Value,
  )
  virtualReference.isWrite = () => false
  virtualReference.isWriteOnly = () => false
  virtualReference.isRead = () => true
  virtualReference.isReadOnly = () => true
  virtualReference.isReadWrite = () => false

  return virtualReference
}
