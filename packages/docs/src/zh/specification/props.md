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

我们决定不再支持 props 的运行时 `type` 字段，因为我们认为当我们已经使用 TypeScript 时，它并不是非常有用。

在这种定义方式下，Vine 默认将所有 prop 视为**必需的**，您可以使用 `?` 标记其为可选 prop。

```vue-vine
import { SomeExternalType } from './path/to/somewhere'

function MyComponent(props: {
  foo: SomeExternalType
  bar?: number // 可选属性
  baz: boolean
}) { ... }
```

### 使用更复杂的类型 <code version>v0.2.0+</code> {#using-complex-type-v0-2-0}

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

因此，你必须使用**字面量** `boolean` 注解来指定任何布尔型属性，不允许在这里使用其他在别处定义的类型，即使它最终的结果是布尔类型。

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

```vue-vine
// Correct examples
const foo = vineProp.withDefault('bar')
const biz = vineProp.withDefault(someStringVariable)
const dar = vineProp<boolean>()
const bool = vineProp.withDefault(false)

// Incorrect examples
const bad1 = vineProp<SomeBooleanType>()
const bad2 = vineProp.withDefault(someBooleanVariable)
```
