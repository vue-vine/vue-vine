/**
 * Location information in lines and columns.
 */
export interface Location {
  /**
   * The line number. This is 1-based.
   */
  line: number

  /**
   * The column number. This is 0-based.
   */
  column: number
}

/**
 * Range information in lines and columns.
 */
export interface LocationRange {
  /**
   * The start location.
   */
  start: Location

  /**
   * The end location.
   */
  end: Location
}

/**
 * Location information in offsets.
 * This is 0-based.
 */
export type Offset = number

/**
 * Range information in offsets.
 * The 1st element is the start offset.
 * The 2nd element is the end offset.
 *
 * This is 0-based.
 */
export type OffsetRange = [Offset, Offset]

/**
 * Objects which have their location.
 */
export interface HasLocation {
  range: OffsetRange
  loc: LocationRange
  start?: number
  end?: number
}
