/**
 * Vine ESLint parser for Vue template.
 *
 * - We need a `IntermediateTokenizer` instance to read tokens.
 *
 * - We need a `LocationCalculator` to compute the offset with a vine`...` string's inner tokens.
 *   Because we'll build a `VTemplateRoot` token from our custom intermediate tokenizer
 *   on looping reading next token.
 *
 * - We need a `tokens` array and a `comments` to store the tokens,
 *   because the result of a custom ESLint parser must contain `tokens`, `comments` these two properties.
 *   (refer to: https://eslint.org/docs/latest/extend/custom-parsers)
 *
 *   We cut out the original ESTree node of vine`...` string, and willing to replace with our custom `VTemplateRoot`.
 *   Also, we removed the token of vine`...` string from this `.ts` file's `tokens` array,
 *   and we're responsible to supplement all the actual tokens inside vine`...` string back.
 *
 * - We need a `VTemplateRoot` ESTree node as the representation of the component's Vue template.
 */
