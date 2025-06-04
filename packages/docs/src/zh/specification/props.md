# Props {#props}

你最开始学习在 Vue 中定义 props 类型的方式应该是使用诸如 `String`、`Number`、`Boolean` 等类型构造函数，这是用于 Vue 的运行时类型检查的。事实上，Vue 仅主要关注组件的 props 名字说什么，以更好地与普通 attribute 区分，即使提供运行时检查也仅仅只会报告 warning 而不会抛出异常导致程序中断。

但从 Vue 3 开始，用户逐渐期望类型检查过程由 TypeScript 和 IDE 提示来完成，因此我们决定放弃对 props 的 `type` 字段的支持，因为我们认为当我们已经全面使用 TypeScript 时，它并不是非常有用。

::: warning 💡 注意

Vine 会在生成组件对象的 `props` 字段时会删除所有类型信息，彻底抛弃运行时检查类型这一过程。

:::

在 VCF 中定义 props 有两种方式，第一种是为函数的第一个形参提供 TypeScript 类型注解，另一种是使用 [`vineProp` 宏](./macros.md#宏)。

如果您没有为 VCF 提供形参，并且在 VCF 内部也没有 `vineProp` 宏的调用，Vue Vine 将默认组件没有 props，组件的 `props` 字段将为 `{}`。

## 用类型注解声明 {#using-type-annotation-to-define}

如果你想在 VCF 参数上定义 props，它应该是第一个参数，并为其编写一个 TypeScript 对象字面量类型注解，其中包含您想要定义的所有 props。

在这种定义方式下，Vine 默认将所有 prop 视为**必需的**，您可以使用 `?` 标记其为可选 prop。

```vue-vine
import { SomeExternalType } from './path/to/somewhere'

function MyComponent(props: {
  foo: SomeExternalType
  bar?: number // 可选属性
  baz: boolean
}) { ... }
```

### 解构 `props` 形参 <VersionTip version="v0.3.0+" /> {#destructure-props-parameter}

从 Vue Vine v0.3.0 版本开始，您可以解构 `props` 形参，并使用解构后的变量来访问 props 的属性。

```vue-vine
function MyComponent({ foo, bar, ...rest }: {
  foo: string,
  bar?: number,
  other1: boolean,
  other2: string
}) {

  watchEffect(() => {
    console.log(
      'foo: ', foo,
      ', bar: ', bar,
      ', rest: ', rest
    )
  })

  return vine`...`
}
```

以上将先被转换成以下等效内容再进行之后的编译：

```vue-vine
import { createPropsRestProxy as _createPropsRestProxy } from 'vue'

// ...

  const rest = _createPropsRestProxy(props, ['foo', 'bar'])
  watchEffect(() => {
    console.log(
      'foo: ', props.foo,
      ', bar: ', props.bar,
      ', rest: ', rest
    )
  })

// ...
```

这样的解构写法和 Vue 3.5 当中的 [响应式 Props 解构](https://cn.vuejs.org/api/sfc-script-setup.html#reactive-props-destructure) 是等价的。本质是一个方便你使用单个 prop 的语法糖。

同时你也可以利用解构时的赋值来定义 props 的默认值，示例如下：

```vue-vine
function MyComponent({
  foo = 'foo',
  bar = 1
}: SomeType) {
  // ...
}
```

### 使用更复杂的类型 <VersionTip version="v0.2.0+" /> {#using-complex-type-v0-2-0}

从 Vue Vine v0.2.0 版本开始，我们引入了 ts-morph 来解析 props 类型注解，因此您可以使用任何类型，而不仅仅是 `TSTypeLiteral`。

```vue-vine
import type { SomeExternalType } from '../path/to/somewhere'

function MyComponent(props: SomeExternalType) {
  // ...
  return vine`...`
}
```

如果您发现任何异常情况，[请在 Github 上向我们提交问题](https://github.com/vue-vine/vue-vine/issues/new)。

另外，在定义 props 的类型注解时，有一些特殊情况需要注意，比如布尔型的 props，见下文：

### 布尔型转换机制 {#boolean-cast-mechanism}

在编译时，我们必须知道一个属性是否为布尔型，以确定如何处理这样的属性传递：`<MyComponent foo />`。在 Web 标准 HTML 中，属性 `foo` 的值实际上是一个空字符串。

因此，在使用对象字面量类型注解定义 props 时，你必须使用**字面量** `boolean` 注解来指定任何布尔型属性，不允许在这里使用其他在别处定义的类型，即使它最终的结果是布尔类型。

<code version-tip style="font-size: 14px">v0.2.0+</code> 而对于使用 ts-morph 分析的情况，即形如 `props: SomeTypeName`，它将自动推断出某些属性是否为布尔型，但我们不能保证其完全正确，如果您发现任何异常情况，[同样请在 Github 上向我们提交此类问题](https://github.com/vue-vine/vue-vine/issues/new)。

```vue-vine
function MyComponent(props: {
  // ...
  isFrontEnd: boolean
  isBackEnd: OtherTypeButActuallyBoolean
}) { ... }
```

::: info 💡 建议

为了使我们的解析更加简单和准确，我们强烈建议您将 prop 的类型尽可能简单化，避免使用非常复杂的类型体操。

:::

## `vineProp` {#vineprop}

这是一个用于定义组件的 prop 的编译宏函数。这个想法启发自 [Vue Macros](https://vue-macros.sxzz.moe/macros/define-prop.html)。

- 您必须给出一个类型参数来指定 prop 的类型，或者您必须提供一个默认值来推导出类型。
- 如果你要定义一个可选的 prop，请使用 `vineProp.optional`。如果你使用 `vineProp.withDefault`，它也会被视为可选。

```vue-vine
const foo = vineProp.optional<string>()
```

- `vineProp` 的第一个参数是 prop 的验证器，它是可选的。

```vue-vine
const foo = vineProp<string>()
const title = vineProp<string>(value => value.startsWith('#'))
```

- 若要设置带有默认值的 prop，您可以使用 `vineProp.withDefault`，验证器是第二个参数。

  由于 TypeScript 能够自动推断出默认值的类型，您不需要将类型参数传递给它。

就像我们上面在 “布尔型转换机制” 部分所提到的，当您确实需要一个布尔型 prop 时，类型参数应该是一个字面量 `boolean`，并且不应该将变量作为默认值传递，而只能传递 `true` 或 `false` 字面量。尽管 TypeScript 可以从变量中推断出类型，但 Vine 编译器并没有嵌入 TypeScript 编译器来得知这个 prop 是布尔型的。

这一条限制在 Vue Vine v0.2.0 引入了 ts-morph 后也依然存在，因为我们在 vineProp 这种定义方式中并未启用 ts-morph 来解析类型，按照设计，这条限制并不会太多影响日常使用，我们推荐您对于布尔型 prop 始终显式标注出类型。

```vue-vine
// 正确示例
const foo = vineProp.withDefault('bar') // 默认值可以自动推导出类型
const biz = vineProp.withDefault(someStringVariable) // 默认值可以自动推导出类型
const dar = vineProp<boolean>() // 明确指定为布尔型
const bool = vineProp.withDefault(false) // 指定布尔型只能是 true 或 false

// 错误示例
const bad1 = vineProp<SomeBooleanType>() // 错误，因为 Vine 编译器不能解析出是布尔型
const bad2 = vineProp.withDefault(someBooleanVariable) // 错误，因为 Vine 编译器不能解析出是布尔型
```
