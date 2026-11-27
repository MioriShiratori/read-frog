// Detector corners can start at either end of a baseline. Keep translated text upright.
export function uprightAngle(angle: number): number {
  return Math.atan2(Math.sin(2 * angle), Math.cos(2 * angle)) / 2
}

export function wrapText(
  text: string,
  maxWidth: number,
  measure: (text: string) => number,
): string[] {
  const lines: string[] = []
  let line = ""
  for (const { segment } of new Intl.Segmenter(undefined, { granularity: "word" }).segment(text)) {
    for (const piece of splitWideWord(segment, maxWidth, measure)) {
      if (line && measure(line + piece) > maxWidth) {
        lines.push(line.trim())
        line = ""
      }
      line += piece
    }
  }
  if (line.trim()) lines.push(line.trim())
  return lines
}

function splitWideWord(
  word: string,
  maxWidth: number,
  measure: (text: string) => number,
): string[] {
  return measure(word) > maxWidth ? Array.from(word) : [word]
}

export function fitText(
  text: string,
  width: number,
  height: number,
  measure: (text: string, size: number) => number,
) {
  const max = Math.min(48, Math.max(8, height * 0.8))
  for (let size = Math.floor(max); size >= 6; size--) {
    const lines = wrapText(text, width, (value) => measure(value, size))
    if (lines.length * size * 1.2 <= height) return { size, lines }
  }
  throw new Error("IMAGE_TRANSLATION_TOO_LONG")
}
