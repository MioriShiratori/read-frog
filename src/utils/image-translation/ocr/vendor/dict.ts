// SPDX-License-Identifier: MPL-2.0
// Adapted from OPerepadia/ocr-translator-extension @ d4a28e9a9014e4a6b89f50f336ddb2857c5bf5be.
// Copyright (c) 2026 Oleksandr Perepadia. See public/image-translation/licenses/.
// Character dictionary handling for the PP-OCRv6 recognizer.
//
// The model emits `dict.length + 2` classes. The class layout follows
// PaddleOCR's CTCLabelDecode with use_space_char:
//   index 0                 -> CTC blank
//   index 1 .. dict.length  -> dict[index - 1]
//   index dict.length + 1   -> " " (space, appended by use_space_char)

const BLANK_INDEX = 0

/** Parse a dict.txt file (one character per line) into an array. A single
 * trailing newline is ignored; internal blank lines are preserved as entries
 * because the model's class count depends on the exact line count. */
export function parseDict(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n")
  const lines = normalized.split("\n")
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop()
  }
  return lines
}

/** Build a class-index → character mapper for the given dictionary. */
export function makeCharAt(dict: string[]): (index: number) => string | null {
  const spaceIndex = dict.length + 1
  return (index: number): string | null => {
    if (index === BLANK_INDEX) {
      return null
    }
    if (index >= 1 && index <= dict.length) {
      return dict[index - 1]!
    }
    if (index === spaceIndex) {
      return " "
    }
    return null
  }
}
