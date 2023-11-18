import sortedLastIndex from 'lodash/sortedLastIndex'
import type { Location } from '../ast'
import type { LocationCalculator } from './location-calculator'

/**
 * A class for getting lines and columns location.
 */
export class LinesAndColumns {
  protected ltOffsets: number[]

  /**
   * Initialize.
   * @param ltOffsets The list of the offset of line terminators.
   */
  public constructor(ltOffsets: number[]) {
    this.ltOffsets = ltOffsets
  }

  /**
   * Calculate the location of the given index.
   * @param index The index to calculate their location.
   * @returns The location of the index.
   */
  public getLocFromIndex(index: number): Location {
    const line = sortedLastIndex(this.ltOffsets, index) + 1
    const column = index - (line === 1 ? 0 : this.ltOffsets[line - 2])
    return { line, column }
  }

  public createOffsetLocationCalculator(offset: number): LocationCalculator {
    return {
      getFixOffset() {
        return offset
      },
      getLocFromIndex: this.getLocFromIndex.bind(this),
    }
  }
}
