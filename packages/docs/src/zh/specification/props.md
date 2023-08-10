# Props {#props}

在 VCF 中定义 props 有两种方式，第一种是为函数的第一个形参提供 TypeScript 类型注解，另一种是使用 [`vineProp` 宏](./macros.md#宏)。

如果您没有为 VCF 提供形参，并且在 VCF 内部也没有 `vineProp` 宏的调用，组件的 `props` 字段将为 `{}`。

## 属性类型 {#prop-type}

我们决定不再支持属性的 `type` 字段，因为我们认为当我们已经使用 TypeScript 时，它并不是非常有用。

Vine 默认将所有属性视为**必需的**，您可以使用 `?` 标记为可选属性。

```vue-vine
import { SomeExternalType } from './path/to/somewhere'

function MyComponent(props: {
  foo: SomeExternalType
  bar?: number // 可选属性
  baz: boolean
}) { ... }
```

当您注解一个 props 的类型时，它会在您的 IDE 环境中根据当前 TypeScript 上下文进行分析。Vine 让 IDE 接管类型检查，我们在生成组件对象的 `props` 字段时会删除所有类型信息。

### 布尔型转换 {#boolean-cast}

Vine 确实忽略 props 的类型，但由于 Vue 的“布尔型转换”机制，这里会有一个特殊情况，也就是说，在编译时，我们必须知道一个属性是否为布尔型，以确定如何处理这样的属性传递：`<MyComponent foo />`。在 Web 标准 HTML 中，属性 `foo` 的值实际上是一个空字符串。

因此，您必须使用字面量 `boolean` 类型注解来指定任何布尔型属性。

```vue-vine
function MyComponent(props: {
  // ... 其他属性
  foo: boolean
}) { ... }
```
