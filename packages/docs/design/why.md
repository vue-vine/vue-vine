# Why Vine

## Why another style

I've seen lots of discussions about supporting **"Multiple components in one SFC file"**, but to be honest, SFC was designed for one component per file, and the related toolchain is also based on this logic and continuously iterated during the development of Vue. Therefore, it is obviously unreasonable to directly support multiple components in one file based on this concept.

Through several Twitter posts' investigation, I found that there is indeed an universal demand for writing multiple components in one file. So I started exploring whether there is another syntax or organizational approach that can best fit into Vue's existing compilation toolchain and utilize existing achievements, while creating more flexibility for users to write components.

I believe that most programmers like me involved in web front-end development are not able to write UI views "from-top-to-bottom" but with a "from-bottom-to-top" approach. In other words, they start by writing long components, and cut out reusable components later.

Here's how I asked everyone: "What do you miss the most from React when writing Vue?" 

In the comparison of development experience between Vue and React, the most obvious difference is the the forms of component organization. Since JSX is just JavaScript function, so you can easily start writing a new component aside. Many people replied that JSX is actually what they like.

Vue also has not-bad support for JSX, however, the issue with JSX is that it's too flexible, and it can't provide enough compile-time information for Vue to optimize. But function style is good, we do like it.

So... why not try to use a function to create Vue component, but writing "script setup" logics and template inside?

That's how Vine was born.

![Quick view](/highlight-demo.png)

## Why it's achievable

After diving into the result of Vue SFC compilation, you'll found that it's actually transformed to a component object. So, there isn't a big difference between compiling a single component and compiling multiple components, all I need to do is just to create multiple component objects.

Templates are compiled based on some binding metadata from user scripts, which implemented the "Auto unwrap" in template. Some static parts can be automatically hoisted out for optimizing. All these processing are provided from the `@vue/compiler-dom` package. 
