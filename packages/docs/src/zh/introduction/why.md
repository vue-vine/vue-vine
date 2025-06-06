# 缘起 {#why-vine}

### 闹心的来回跳转 {#annoying-navigation-between-files}

我曾经看到很多关于支持 **"一个 SFC 文件中写多个组件"** 的讨论，但说实话，SFC 是为一个文件一个组件设计的，相关的工具链也是基于这个逻辑不断迭代的。因此，基于这个设计理念，直接在一个 SFC 文件中支持多个组件并不合适。

通过调查后我发现，确实大家也都想要能够在一个文件中写多个组件。所以我开始探索是否有另一种语法或组织方式，可以最好地适应和充分利用 Vue 现有的编译工具链，为用户创造更多编写组件的灵活性。

开发者通常是先写一个长组件，然后再从中剪切出可复用的组件，这是一种"自下而上"的方式，也是最直接的方式。但是在 Vue 中，"剪出"这个动作可能会有点痛苦，因为我们总是需要创建一个新的 `.vue` 文件，写一些样板代码，然后才能开始写我们自己的代码。

在多个文件之间来回切换也不是一个好的开发体验，特别是当你在写一个只在一个地方使用的小组件时。例如，当你一次又一次地在子组件定义完 props 后，再切换到父组件文件完成后续工作时，你可能会觉得很麻烦。

### 设计初衷 {#original-design-intention}

我试着向大家问了这样一个问题："在写 Vue 时，你可能会想念 React 的哪些特性？"

在比较 Vue 和 React 的开发体验时，最明显的区别是组件组织的形式。由于 JSX 只是 JavaScript 表达式，因此您可以非常轻松地开始编写一个新的组件。许多人回复说，他们确实也想在 Vue 中能这样做。

实际上不仅仅是 JSX 或函数使得 React 在编码中更加灵活，而是因为这种模式代表着对更聚合的 JavaScript 上下文的追求，这或许是保持 JavaScript 用户在工作中保持心流的关键，可以少写很多框架设计所需要的样板代码。

前端的工作本来就需求开发者常常在视图、样式和逻辑三者之间来回切换，而在日益复杂的前端应用开发趋势下，虽然的确还是有不少开发者坚持 “关注点应该分离” 的圣经教条，但我们并不想死板地完全遵循这一原则。

Vine 所提供的写法并没有减少太多你实际需要编写的内容总量，而是着重在提供更方便的组织形式。

### JSX 与模板的语法 {#the-trade-off-between-jsx-and-template}

既然 Vue 对 JSX 也有不错的支持，为什么我们不在 JSX 工具链的开发上投入更多精力？

目前 JSX 的主要问题是它过于灵活，很难为 Vue 提供足够的编译时信息以进行优化，而 Vue 对模板有原生支持，并具有许多编译时优化。

为了更好地适应 Vue 的设计理念和生态系统，我们选择使用 Vue 模板作为 Vine 的视图描述语法。

### 最终方案 {#final-solution}

我们知道，在 JavaScript 中，"函数"可以创建一个相当独立的上下文，如果能将模板和组件的 `setup` 语句放在一起的话，开发体验一定会非常棒！

那么...为什么不使用函数风格来描述 Vue 组件，而将 "script setup" 和模板混合在一起呢？

因此 `Vine` 应运而生。

### 如何实现这一目标 {#how-is-this-achievable}

在深入研究 Vue SFC 编译结果后，您会发现它实际上被转换为一个组件对象。因此，编译单个组件和编译多个组件之间没有太大的区别，我所需要做的就是创建多个组件对象。

所有这些处理都来自于 `@vue/compiler-dom` 包，它非常细粒度，我们可以轻松自定义。

模板是基于用户脚本的一些绑定元数据进行编译的，它实现了模板中的 "自动解包"，此外，一些静态部分可以自动提升出来进行优化...

在这个神奇的旅程中，您会发现更多有趣的事情值得学习！
