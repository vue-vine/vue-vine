export const LifecycleConstant = {
  firstScreen: 'rLynxFirstScreen',
  updateFromRoot: 'updateFromRoot',
  globalEventFromLepus: 'globalEventFromLepus',
  jsReady: 'rLynxJSReady',
  patchUpdate: 'rLynxChange',
  publishEvent: 'rLynxPublishEvent',
  updateMTRefInitValue: 'rLynxChangeRefInitValue',
} as const
export type ELifecycleConstant = typeof LifecycleConstant[keyof typeof LifecycleConstant]

export interface FirstScreenData {
  root: string
  jsReadyEventIdSwap: Record<string | number, number>
}

export const NativeUpdateDataType = {
  UPDATE: 0,
  RESET: 1,
} as const
export type ENativeUpdateDataType = typeof NativeUpdateDataType[keyof typeof NativeUpdateDataType]
