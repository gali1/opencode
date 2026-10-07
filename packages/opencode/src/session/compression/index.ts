export { compressByType, detectContentType, type ContentType, type CompressOptions, type DetectionResult } from "./router"
export { compressJson } from "./json"
export { compressLog } from "./log"
export { compressSearch } from "./search"
export { extractHtml } from "./html"
export { compressConfig } from "./config"
export { compressCode } from "./code"
export { compressCsv } from "./csv"
export {
  stripAnsi,
  collapseRuns,
  expandRuns,
  foldRepeatedBlocks,
  unfoldRepeatedBlocks,
  foldPathListing,
  unfoldPathListing,
  foldLossless,
} from "./lossless"
export { elideDenseLines, type DenseLineOptions, type DenseLineResult } from "./denseLines"
export { isCriticalLine, CRITICAL_LINE_RE, MUST_KEEP_RE } from "./protection"

export * as Compression from "."
