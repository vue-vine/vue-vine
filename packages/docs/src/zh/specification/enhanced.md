# 附加功能 {#enhanced-features}

Vine 提供了一些附加功能，它们是一些好用的语法糖。

## 转换布尔值属性 {#transform-boolean-props}

自 v1.3.0 起，Vine 提供了一种特殊的转换机制来处理布尔值属性，这借鉴自 [Vue Macros](https://vue-macros.dev/features/boolean-prop.html) —— 基于 MIT 许可证。

将 `<Comp checked />` 转换为 `<Comp :checked="true" />`。

将 `<Comp !checked />` 转换为 `<Comp :checked="false" />`。
