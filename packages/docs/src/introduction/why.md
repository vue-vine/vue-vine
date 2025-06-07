# Why Vine

## Annoying navigation between files

I've seen lots of discussions about supporting **"Multiple components in one SFC file"**, but to be honest, SFC was designed for one component per file, and the related toolchain is also based on this logic and continuously iterated during the development of Vue. Therefore, it is obviously unreasonable to directly support multiple components in one file based on this concept.

Through several Twitter posts' investigation, I found that there is indeed an universal demand for writing multiple components in one file. So I started exploring whether there is another syntax or organizing approach that can best fit into Vue's existing compilation toolchain and utilize existing achievements, while creating more flexibility for users to write components.

People often writing a long component first, and then cut out reusable components later, it's a "from-bottom-to-top" approach and also the most straightforward way. But the "cut out" action could be a little bit painful in Vue, because we always need to create a new `.vue` file, writing some boilerplate codes and then start to write our own.

Navigating between multiple files is not a good experience too, especially when you're writing a small component that's only used in one place. For examples, the props definition and interactions with parent component will make you probably feel annoying after switching between files time and time again.

## Original design intention

Here's how I asked everyone: "What do you miss the most from React when writing Vue?"

In the comparison of development experience between Vue and React, the most obvious difference is the the forms of component organization. Since JSX is just JavaScript expression, so you can easily start writing a new component aside. Many people replied that this is actually what they want.

because it's not just JSX or function that makes React more flexible in coding, but because this pattern represents its pursuit of more aggregated JavaScript context.

Maybe this is the secret to keep JavaScript users in their heart-flow. Front-end work requires developers to switch between views, styles, and logic frequently, and we find that in the increasingly complex front-end application development trend, writing logic has gradually become the main task.

Front-end work requires developers to often switch between views, styles, and logic, and we find that in the increasingly complex front-end application development trend, although there are still many developers who insist on the "separation of concerns" dogma, we don't want to rigidly follow it.

We must admit this may just be a sweet syntax sugar, and it won't change the reality that you "need to write XML-like when describing views, and CSS-like when describing styles". The original intention of Vine is to **provide more convenience and flexibility for your code organization**.

## The trade-off between JSX and template

Vue also has not-bad support for JSX, so why don't we put more effort on developing toolchain with JSX?

The main problem with JSX is that it's too flexible, and it's hard to provide enough compile-time information for Vue to optimize, and template is native supported by Vue with a lot of compile-time optimizations.

In order to better fit Vue's design concept and ecology, we've chosen to use template as the main syntax for Vine.

## Final solution

We know that "function" can create a very independent context in JavaScript, and it's awesome if we can put template next to those setup statements.

So... Why not try to use a function style to describe Vue component by mixing "script setup" logics and template inside?

That's how Vine was born.

## How is this achievable

After diving into the result of Vue SFC compilation, you'll found that it's actually transformed to a component object. So, there isn't a big difference between compiling a single component and compiling multiple components, all I need to do is just to create multiple component objects.

All these processing are provided from the `@vue/compiler-dom` package, and it's so fine-grained that we can easily customize by our own.

Templates are compiled based on some binding metadata from user scripts, which implemented the "Auto unwrap" in template, in addition, some static parts can be automatically hoisted out for optimizing...

You'll find more interesting things to learn in this magic journey!
