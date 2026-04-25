class GraphemeSplitter {
  constructor() {
    this._segmenter =
      typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
        ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
        : null
  }

  splitGraphemes(input) {
    const value = String(input ?? '')
    if (!this._segmenter) {
      return Array.from(value)
    }
    return Array.from(this._segmenter.segment(value), (part) => part.segment)
  }
}

export default GraphemeSplitter
