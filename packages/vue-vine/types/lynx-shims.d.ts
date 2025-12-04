// Copyright 2024 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import type {
  ComponentProps,
  FilterImageProps,
  ImageProps,
  ImageUIMethods,
  InputProps,
  InputUIMethods,
  ListItemProps,
  ListProps,
  ListRowProps,
  ListUIMethods,
  NoProps,
  PageProps,
  ScrollViewProps,
  ScrollViewUIMethods,
  StandardProps,
  TextAreaProps,
  TextAreaUIMethods,
  TextProps,
  ViewProps,
} from '@lynx-js/types'

export interface UIMethods {
  'list': ListUIMethods
  'scroll-view': ScrollViewUIMethods
  'image': ImageUIMethods
  'input': InputUIMethods
  'textarea': TextAreaUIMethods
}

type CamelCase<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<CamelCase<Tail>>}`
  : S
type LynxPropsNormalized<P> = {
  [K in keyof P as K extends string ? (K | CamelCase<K>) : K]: P[K]
} & { [key: string]: any }
type LynxBultinComponent<P> = import('vue').FunctionalComponent<LynxPropsNormalized<P>>

// add also to global.JSX.IntrinsicElements
declare module 'vue/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'component': LynxComponentProps<ComponentProps>
      'filter-image': FilterImageProps<FilterImageProps>
      'image': ImageProps<ImageProps>
      'inline-image': ImageProps<ImageProps>
      'inline-text': TextProps<TextProps>
      'inline-truncation': NoProps<NoProps>
      'list': ListProps<ListProps>
      'list-item': ListItemProps<ListItemProps>
      'list-row': ListRowProps<ListRowProps>
      'page': PageProps<PageProps>
      'scroll-view': ScrollViewProps<ScrollViewProps>
      'text': TextProps<TextProps>
      'view': ViewProps<ViewProps>
      'raw-text': StandardProps<StandardProps> & { text: number | string }
      'input': InputProps<InputProps>
      'textarea': TextAreaProps<TextAreaProps>
    }
  }
}

declare module 'vue' {
  interface GlobalComponents {
    'component': LynxBultinComponent<LynxComponentProps>
    'filter-image': LynxBultinComponent<FilterImageProps>
    'image': LynxBultinComponent<ImageProps>
    'inline-image': LynxBultinComponent<ImageProps>
    'inline-text': LynxBultinComponent<TextProps>
    'inline-truncation': LynxBultinComponent<NoProps>
    'list': LynxBultinComponent<ListProps>
    'list-item': LynxBultinComponent<ListItemProps>
    'list-row': LynxBultinComponent<ListRowProps>
    'page': LynxBultinComponent<PageProps>
    'scroll-view': LynxBultinComponent<ScrollViewProps>
    'text': LynxBultinComponent<TextProps>
    'view': LynxBultinComponent<ViewProps>
    'raw-text': LynxBultinComponent<StandardProps & { text: number | string }>
    'input': LynxBultinComponent<InputProps>
    'textarea': LynxBultinComponent<TextAreaProps>
  }
}
