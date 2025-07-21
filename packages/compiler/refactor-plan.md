# Vue Vine Compiler 重构计划 (基于 alien-signals)

## 1. 背景与目标

当前 Vue Vine 的编译器（`@vue-vine/compiler`）采用的是一种全量编译模型。每当 `.vine.ts` 文件发生变更时，编译器会完整地重新执行“校验 -> 分析 -> 转换”的整个流程。虽然在首次构建时性能尚可，但在开发环境的 HMR（热模块替换）场景下，这种全量更新的模式暴露了一些性能瓶颈：

1.  **重复工作**: 即使只修改了一个组件中的一小部分（例如一个CSS属性），整个文件中的所有 Vine 组件都需要被重新分析和转换。
2.  **HMR 性能**: 随着项目中组件数量的增加，单次 HMR 的时间会线性增长，影响开发体验。
3.  **扩展性限制**: 当前架构不利于实现更高级的编译时优化，例如跨组件的常量提升、更精细的依赖分析等。

为了解决以上问题，我们计划引入一个基于信号（Signals）的增量编译机制。本次重构将选用 [alien-signals](https://github.com/stackblitz/alien-signals) 作为核心依赖库。`alien-signals` 是一个高性能、轻量级的响应式信号库，其作者的初衷就是为了在 Vue 语言工具中实现**增量 AST 解析和虚拟代码生成**，这与我们的目标完全一致。

**核心目标：**

*   **实现增量编译**: 当文件变更时，只重新编译真正受影响的 Vine 组件及其依赖项，而不是整个文件。
*   **提升 HMR 性能**: 大幅降低 HMR 的延迟，提供接近即时的开发反馈。
*   **构建可扩展的编译架构**: 为未来更高级的编译时优化和特性（如 Tree-shaking 优化、懒编译）打下基础。

## 2. 现有编译器架构分析

在深入探讨新架构之前，我们首先需要清晰地理解当前编译器的运作方式。`@vue-vine/compiler` 的核心流程可以分为三个主要阶段：

### 2.1. Validate (校验阶段)

-   **入口**: `validateVine` in `validate.ts`
-   **职责**:
    -   使用 Babel 解析文件内容，生成 AST。
    -   遍历 AST，对 Vine 的特定语法规则进行严格的静态校验。
    -   **宏调用位置检查**: 确保如 `vineProp`, `vineEmits`, `vineStyle` 等宏在正确的上下文（必须在 Vine 组件函数内）被调用。
    -   **`vine` 模板字符串校验**: 确保每个组件只有一个 `vine\`...\`` 返回，并且模板中无插值。
    -   **Props/Emits/Slots 定义校验**: 对函数参数式 Props、宏定义式 Props、`vineEmits` 和 `vineSlots` 的类型和结构进行合法性检查。
    -   **其他宏使用校验**: 确保 `vineExpose`, `vineOptions` 等宏的参数和使用方式正确。
-   **产物**: 此阶段不产生新的数据结构，主要通过抛出错误来保证进入下一阶段的 AST 是符合 Vine 语法的。

### 2.2. Analyze (分析阶段)

-   **入口**: `analyzeVine` in `analyze.ts`
-   **职责**:
    -   遍历通过校验的 AST，**深度理解**每个 Vine 组件的构成。
    -   **构建组件上下文 (`VineCompFnCtx`)**: 为每个 Vine 组件函数创建一个上下文对象，用于存储所有分析信息。
    -   **导入分析**: 分析文件中的所有 `import` 语句，建立模块依赖关系，并特别标记来自 `'vue'` 的 API。
    -   **Props 分析**: 识别 `props` 的两种定义方式（函数参数与 `vineProp` 宏），提取 props 名称、类型、是否必需、默认值等元信息。当遇到复杂的 TS 类型时，会**集成 `ts-morph` 进行深度类型解析**。
    -   **Emits/Slots/Model 分析**: 解析 `vineEmits`, `vineSlots`, `vineModel` 宏，提取事件、插槽和 v-model 的详细信息。
    -   **样式分析**: 解析 `vineStyle` 宏，提取 CSS 代码、语言、是否 `scoped`，并解析 CSS 中的 `v-bind()` 以便后续处理。
    -   **绑定分析 (`analyzeVineBindings`)**: 这是至关重要的一步。它会分析组件 `setup` 函数体内的所有变量、函数、导入绑定，并确定它们的**绑定类型**（例如 `SETUP_CONST`, `SETUP_REF`, `SETUP_REACTIVE_CONST`, `PROPS` 等）。此信息是后续模板编译的**关键依据**。
-   **产物**: 一个包含多个 `VineCompFnCtx` 对象的数组，每个对象都详尽地描述了一个 Vine 组件的所有结构化信息。

### 2.3. Transform (转换阶段)

-   **入口**: `transformFile` in `transform.ts` (实际逻辑在 `transform/steps.ts` 中)
-   **职责**:
    -   将 `Analyze` 阶段生成的结构化信息（`VineCompFnCtx`）“翻译”成标准的 Vue 3 组件代码。
    -   **代码生成流水线**: 这是一个核心特点。`transformFile` 会按严格顺序调用一系列 `generate...` 函数，每一步都基于 `VineCompFnCtx` 的信息，使用 `magic-string` 对原代码进行精确的增删改。
    -   **主要步骤包括**:
        1.  移除所有 Vine 宏调用。
        2.  生成 `props`、`emits` 的运行时选项对象。
        3.  生成 `v-model`、`v-slots` 的相关实现代码。
        4.  生成 `useCssVars` 调用（如果需要）。
        5.  构建 `setup` 函数的完整形态，包括参数、内部逻辑和 `return` 对象。
        6.  用 `defineComponent` 将所有部分包裹起来，形成一个标准的 Vue 组件定义。
        7.  生成所有 `import` 语句（包括用户原有导入和编译器新生成的导入）并置于文件顶部。
-   **产物**: 最终输出的、可直接被 Vue 运行的 JavaScript/TypeScript 代码字符串。

### 2.4. 架构总结

| 阶段 | 核心输入 | 核心处理 | 核心输出 |
| :--- | :--- | :--- | :--- |
| **Validate** | 文件源代码字符串 | Babel AST 遍历与静态规则断言 | 一个通过校验的 AST |
| **Analyze** | 通过校验的 AST | 遍历 AST，构建 `VineCompFnCtx`，深度解析类型与绑定 | `VineCompFnCtx[]` (组件结构化信息) |
| **Transform**| `VineCompFnCtx[]` | `magic-string` 代码生成流水线 | 最终的 JS/TS 代码字符串 |

当前架构是一种典型的**线性批处理**模式。它的优点是逻辑清晰、易于理解。但缺点也同样明显：**缺乏增量处理能力**，任何微小的改动都会触发完整的处理流程，这是我们本次重构要解决的核心问题。

## 3. 基于 Alien-Signals 的新架构设计

新架构的核心思想是将整个编译流程从“一次性的线性批处理”重构成一个“**可响应的、细粒度的依赖图**”。我们将不再使用静态的 `VineFileCtx` 和 `VineCompFnCtx` 对象，而是将它们改造为由 `alien-signals` 驱动的**响应式上下文容器**。

### 3.1. 核心概念与数据结构

我们将摒弃一次性、全量创建上下文对象的做法，转而为文件的编译状态建立一个持久化的、可响应的图模型。

-   **`signal`**: 代表最基础的、可变的编译源。例如，文件内容是图的根 `signal`。
-   **`computed`**: 代表从其他 `signal` 或 `computed`派生出的只读结果。例如，从文件内容派生的 AST、从组件 AST 派生出的 `props` 信息、最终生成的代码片段等。`computed` 会缓存其结果，只有当其依赖变化时才会重新计算。
-   **`effect`**: 代表需要执行的“副作用”，通常是最终的 I/O 操作，如图的终点——将最终生成的代码写入文件系统、更新 HMR 模块等。

### 3.2. 响应式上下文架构

我们将建立一个分层的响应式上下文结构，以文件路径和组件函数名（`fnName`）作为关键索引。

**顶层：编译器实例 (`Compiler`)**

一个全局单例，负责管理所有文件的编译状态。
`compiler.reactiveFileCtxMap: Map<filePath, ReactiveFileCtx>`

**第一层：响应式文件上下文 (`ReactiveFileCtx`)**

每个 `.vine.ts` 文件都对应一个 `ReactiveFileCtx`。它不再是一个普通对象，而是一个信号的集合，描述了整个文件的状态。

```typescript
interface ReactiveFileCtx {
  // 根信号，存储文件原始内容
  content: Signal<string>;

  // 从 content 派生出的文件级计算结果
  ast: Computed<BabelAST>;
  imports: Computed<ImportInfo[]>;
  allCompFnDecls: Computed<Map<fnName, BabelNode>>; // Map<组件名, 组件的 AST 节点>

  // 持久化的、响应式的组件上下文 Map
  compCtxMap: Map<fnName, ReactiveCompContext>;
}
```

-   当 `content` 变化时，`ast` 会自动重新解析。
-   当 `ast` 变化时，`allCompFnDecls` 会重新计算。它会智能地与上一次的结果进行比对，然后**差量更新** `compCtxMap`：
    -   **新增**的组件，则在 `compCtxMap` 中创建新的 `ReactiveCompContext`。
    -   **删除**的组件，则从 `compCtxMap` 中移除，并清理其所有信号。
    -   **未变**的组件，其 `ReactiveCompContext` 保持不变。
    -   **内容发生改变**的组件，则更新其对应的 `ReactiveCompContext` 中的 `fnAst` 信号，触发该组件的增量更新。

**第二层：响应式组件上下文 (`ReactiveCompContext`)**

这是实现细粒度更新的核心。`ReactiveCompContext` 将**只负责“分析”阶段**，作为一个纯粹的、响应式的数据容器，其每个属性都是一个 `computed` 信号，代表一项分析结果。

```typescript
interface ReactiveCompContext {
  // 输入信号：组件函数的 AST 节点
  fnAst: Signal<BabelNode>;

  // 分析阶段：所有分析结果都是派生出的 computed
  // 这些 computed 的结果是纯数据结构（如对象、数组），
  // 即使 fnAst 引用变化，但若分析出的内容不变，它们的“值”也不会变。
  scopeId: Computed<string>;
  props: Computed<PropsMeta>;
  emits: Computed<EmitsMeta>;
  style: Computed<StyleMeta[]>;
  bindings: Computed<BindingInfo>;
  template: Computed<TemplateInfo>; // e.g., { source: '...', lang: 'html' }
  // ... 其他所有分析结果
}
```

**第三层：转换与文件输出 (`Transformation & Output Effect`)**

文件的最终代码生成被统一到一个 `computed` 信号中处理，它作为**转换器（Transformer）**，依赖所有组件的分析结果。

-   **`fileFinalCode(filePath)`**: 这是一个核心的 `computed` 转换器。它依赖于：
    1.  `ReactiveFileCtx.imports`
    2.  `ReactiveFileCtx.compCtxMap` 中所有组件的**全部分析信号**（`props`, `emits`, `style`, `bindings` 等）。

    它的工作流程是：
    -   当任何一个组件的任何一项分析结果（如 `props`）发生**值的变化**时，这个 `computed` 会重新执行。
    -   它会遍历 `compCtxMap`，对每一个组件，根据其最新的分析结果，**即时地**执行原 `transform/steps.ts` 中的所有代码生成逻辑。
    -   对于分析结果未发生变化的组件，尽管 `fileFinalCode` 重新执行，但由于输入给转换逻辑的数据没变，可以设计为复用上一次的生成结果，或快速地重新生成相同的代码。
    -   最后，它将所有生成的组件代码和 import 语句拼接成最终的完整文件代码字符串。

-   **`HMR Effect`**: 这是一个 `effect`，它只依赖 `fileFinalCode`。当最终文件代码字符串发生变化时，此 `effect` 被触发，执行 Vite HMR。

### 3.3. 增量更新流程示例

让我们用一个更精确的视角来模拟一次修改过程：

1.  **场景**: 用户在 `ComponentA.vine.ts` 文件中，只修改了 `ComponentA` 函数的一个 `prop` 的类型。
2.  **触发**: `ReactiveFileCtx('.../ComponentA.vine.ts').content` 信号的值发生变化。
3.  **传播 (Propagation)**:
    *   `ast` `computed` 重新计算，生成新的文件 AST。
    *   `allCompFnDecls` `computed` 重新计算，识别到 `ComponentA` 的 AST 节点变了。
    *   `compCtxMap` 更新 `ComponentA` 的 `ReactiveCompContext` 中的 `fnAst` 信号。`ComponentB` 的上下文完全不被触碰。
    *   **在 `ComponentA` 的响应式上下文中**:
        *   `fnAst` 变化，触发所有依赖它的分析 `computed`。
        *   `emits`, `bindings`, `style` 等 `computed` 重新计算，但由于相关代码未变，它们的计算结果和上次相同（值相等），因此**不会通知它们的下游订阅者**。
        *   **只有 `props` 这个 `computed`**，在重新分析后，产出了一个新的值（因为 prop 类型变了）。
    *   **在 `ComponentB` 的响应式上下文中**: **没有任何计算发生**。
4.  **最终效果**:
    *   `fileFinalCode` 这个 `computed` 因为它依赖的 `ComponentA` 的 `props` 信号的值发生了变化，从而被触发重新计算。
    *   在 `fileFinalCode` 内部，它会为 `ComponentA` 完整地运行一次代码生成逻辑（因为 `props` 变了），并对 `ComponentB` 采取复用策略（因为其所有分析结果都未变）。
    *   最终生成新的文件代码字符串。
    *   `HMR Effect` 被触发，完成更新。

**结论**: 这种架构将“分析”和“转换”解耦，使得依赖追踪更精确。只有当分析结果的“值”真正改变时，才会触发重量级的代码生成步骤，最大化地实现了增量编译。

## 4. 实施计划

重构将分阶段进行，以确保平稳过渡。

### 阶段一：搭建响应式基础框架 (Foundation)

1.  **引入 `alien-signals`**: 将库添加到 `compiler` 包的依赖中。
2.  **建立响应式上下文**: 实现 `ReactiveFileCtx` 和 `ReactiveCompContext` 的基本结构和管理逻辑（`Compiler` 实例和 `compCtxMap` 的差量更新）。
3.  **包装 Babel**: 将 Babel 解析过程封装到 `ast` `computed` 信号中。

### 阶段二：重构 Analyze 阶段 (Incremental Analysis)

1.  **逐一迁移分析逻辑**: 将 `analyze.ts` 中的分析逻辑，如 `analyzeVineProps`, `analyzeVineEmits` 等，逐一重构为 `ReactiveCompContext` 内部的 `computed` 信号。
2.  **细化依赖关系**: 精确声明每个 `computed` 的依赖。例如，`props` 信号依赖于 `fnAst` 信号。
3.  **处理 `ts-morph`**: 将 `ts-morph` 的调用也封装在 `computed` 中，并设计缓存策略，避免对未改变的类型重复进行重量级分析。

### 阶段三：实现增量转换器 (Incremental Transformer)

1.  **创建 `fileFinalCode` 转换器**: 实现核心的 `fileFinalCode` `computed`。
2.  **适配转换逻辑**: 改造 `transform/steps.ts` 中的代码生成函数，使其成为可以被 `fileFinalCode` 调用的、无副作用的纯函数，输入为分析结果，输出为代码字符串或变换指令。
3.  **实现 `magic-string` 应用**: 在 `fileFinalCode` 内部管理 `magic-string` 实例，或者让转换逻辑返回变换指令（`{ type: 'replace', start, end, content }`），在 `computed` 的末尾统一应用。

### 阶段四：集成与测试 (Integration & Testing)

1.  **连接 `vite-plugin`**: 修改 `@vue-vine/vite-plugin`，使其与新的 `Compiler` 实例交互，通过更新 `content` 信号来驱动编译。
2.  **实现 HMR**: 在 Vite 插件中设置 `effect` 来监听 `fileFinalCode` 的变化并触发 HMR。
3.  **编写测试用例**: 针对增量更新的各个场景（修改 props、修改样式、修改模板、增删组件等）编写详尽的单元测试和集成测试。
4.  **性能基准测试**: 建立 benchmark，量化重构前后在不同项目规模下的编译速度和 HMR 速度差异。

## 5. 风险与挑战

1.  **复杂性管理**: 信号依赖图的逻辑比线性流程更复杂，需要有清晰的文档和注释，防止出现循环依赖或不正确的依赖声明。
2.  **`ts-morph` 的集成**: `ts-morph` 是一个重量级的工具，其本身的启动和分析有一定开销。需要精细地控制其使用，确保它也能被增量地调用，避免成为新的性能瓶颈。
3.  **SourceMap 的生成**: 在一个由多个 `computed` 节点拼接生成的最终文件中，正确地生成 SourceMap 是一个挑战，需要细致地处理。
4.  **调试难度**: 当出现问题时，追踪信号的传播链条可能比调试线性代码更困难，需要建立良好的日志和调试工具。

通过本次基于 `alien-signals` 的重构，我们有信心将 Vue Vine 的编译体验提升到一个新的水平，使其在大型项目中也能保持高效和灵敏。
