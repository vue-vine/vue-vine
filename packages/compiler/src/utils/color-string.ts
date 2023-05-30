export type ColorfulOptions =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'inverse'
  | 'strikethrough'
  | 'white'
  | 'grey'
  | 'black'
  | 'blue'
  | 'cyan'
  | 'green'
  | 'magenta'
  | 'red'
  | 'yellow'
  | 'bgWhite'
  | 'bgGrey'
  | 'bgBlack'
  | 'bgBlue'
  | 'bgCyan'
  | 'bgGreen'
  | 'bgMagenta'
  | 'bgRed'
  | 'bgYellow'

const colorMap: Record<ColorfulOptions, string> = {
  bold: '1',
  italic: '3',
  underline: '4',
  inverse: '7',
  strikethrough: '9',
  white: '37',
  grey: '90',
  black: '30',
  blue: '34',
  cyan: '36',
  green: '32',
  magenta: '35',
  red: '31',
  yellow: '33',
  bgWhite: '47',
  bgGrey: '49',
  bgBlack: '40',
  bgBlue: '44',
  bgCyan: '46',
  bgGreen: '42',
  bgMagenta: '45',
  bgRed: '41',
  bgYellow: '43',
}

/**
 * Transform a string to ascii colorful string.
 *
 * ## Example
 * ```typescript
 * import { colorful } from 'my-pearls'
 *
 * colorful('This is red', ['red'])
 * colorful('This is green background', ['bgGreen'])
 * colorful('This is cyan and bold', ['cyan', 'bold'])
 * ```
 *
 * @param str String to be colored.
 * @param options Colorful options.
 * @returns Ascii colorful string.
 */
export function colorful(str: string, options: ColorfulOptions[] = []) {
  const colors = options
    .map((option) => {
      return colorMap[option]
    })
    .join(';')

  return `\u001B[${colors}m${str}\u001B[0m`
}

export function createColorful(options: ColorfulOptions[]) {
  return (str: string) => colorful(str, options)
}

/**
 * Colorful string creator functions map.
 *
 * ## Example
 * ```typescript
 * import { Colorful } from 'my-pearls'
 *
 * Colorful.red('This is red')
 * Colorful.bgGreen('This is green background')
 * Colorful.bold('This is bold')
 * ```
 */
export const Colorful: Record<ColorfulOptions, (str: string) => string>
  = Object.keys(colorMap).reduce((acc, key) => {
    acc[key as ColorfulOptions] = createColorful([key as ColorfulOptions])
    return acc
  }, {} as Record<ColorfulOptions, (str: string) => string>)
