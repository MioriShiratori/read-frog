// SPDX-License-Identifier: GPL-3.0-or-later
// Adapted from Unheat/Kites @ 98751588e5f37ef468a0e00059d3eb953b66eb4c.
// See public/image-translation/licenses/ for source attribution and upstream notices.
/** Pixel flag: clean known background or already inpainted pixel. */
const FLAG_KNOWN = 0
/** Pixel flag: narrow band boundary pixel actively propagating. */
const FLAG_BAND = 1
/** Pixel flag: masked pixel awaiting inpainting. */
const FLAG_INSIDE = 2

/** Sentinel representing infinity for initial distance field values. */
const INF_DISTANCE = 1.0e6
/** Epsilon floor for directional dot products and normalization to avoid zero-division. */
const EPSILON = 1.0e-6
const DEFAULT_INPAINT_RADIUS = 3
class MinHeap {
  private values: Float32Array
  private indices: Int32Array
  private count = 0

  /**
   * Constructs a typed min-heap with initial capacity.
   *
   * @param capacity - Initial capacity of the heap.
   */
  constructor(capacity: number) {
    this.values = new Float32Array(Math.max(16, capacity))
    this.indices = new Int32Array(Math.max(16, capacity))
  }

  /**
   * Current number of elements in the heap.
   */
  get size(): number {
    return this.count
  }

  /**
   * Pushes a new item with key `val` and payload `idx` into the min-heap.
   * Dynamically resizes backing storage if capacity is reached.
   *
   * @param val - Priority key (distance / arrival time).
   * @param idx - Item identifier (flat pixel coordinate index).
   */
  push(val: number, idx: number): void {
    if (this.count >= this.values.length) {
      const newCap = this.values.length * 2
      const newVals = new Float32Array(newCap)
      const newIdxs = new Int32Array(newCap)
      newVals.set(this.values)
      newIdxs.set(this.indices)
      this.values = newVals
      this.indices = newIdxs
    }

    let i = this.count++
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.values[parent]! <= val) break
      this.values[i] = this.values[parent]!
      this.indices[i] = this.indices[parent]!
      i = parent
    }
    this.values[i] = val
    this.indices[i] = idx
  }

  /**
   * Pops and returns the item identifier with the lowest priority value.
   *
   * @returns Item index, or -1 if empty.
   */
  pop(): number {
    if (this.count === 0) return -1
    const minIdx = this.indices[0]!
    const lastVal = this.values[--this.count]!
    const lastIdx = this.indices[this.count]!

    if (this.count > 0) {
      let i = 0
      const half = this.count >> 1
      while (i < half) {
        let left = (i << 1) + 1
        const right = left + 1
        if (right < this.count && this.values[right]! < this.values[left]!) {
          left = right
        }
        if (lastVal <= this.values[left]!) break
        this.values[i] = this.values[left]!
        this.indices[i] = this.indices[left]!
        i = left
      }
      this.values[i] = lastVal
      this.indices[i] = lastIdx
    }

    return minIdx
  }
}

/**
 * Solves a single quadrant step of the upwind discretized Eikonal equation:
 * (max(T - T1, 0))^2 + (max(T - T2, 0))^2 = 1
 *
 * @param i1 - Row index of first neighbor.
 * @param j1 - Col index of first neighbor.
 * @param i2 - Row index of second neighbor.
 * @param j2 - Col index of second neighbor.
 * @param f - Flags array (padded).
 * @param t - Distance field array (padded).
 * @param stride - Stride (padded width).
 * @returns Computed arrival distance.
 */
function solveEikonal(
  i1: number,
  j1: number,
  i2: number,
  j2: number,
  f: Uint8Array,
  t: Float32Array,
  stride: number,
): number {
  const idx1 = i1 * stride + j1
  const idx2 = i2 * stride + j2
  const a11 = t[idx1]!
  const a22 = t[idx2]!
  const m12 = a11 < a22 ? a11 : a22

  const f1Known = f[idx1] !== FLAG_INSIDE
  const f2Known = f[idx2] !== FLAG_INSIDE

  if (f1Known) {
    if (f2Known) {
      const diff = Math.abs(a11 - a22)
      if (diff >= 1.0) {
        return 1.0 + m12
      }
      const det = 2.0 - diff * diff
      return (a11 + a22 + Math.sqrt(det > 0 ? det : 0)) * 0.5
    }
    return 1.0 + a11
  } else if (f2Known) {
    return 1.0 + a22
  }
  return 1.0 + m12
}

export class TeleaKernel {
  public inpaintFMM(
    width: number,
    height: number,
    imgBytes: Uint8ClampedArray,
    maskBytes: Uint8ClampedArray,
    radius: number = DEFAULT_INPAINT_RADIUS,
  ): void {
    if (width <= 0 || height <= 0) return

    const { pWidth, pHeight, flags, dists, heap, masked } = createState(width, height, maskBytes)
    if (masked === 0) return
    seedBand(width, height, pWidth, flags, dists, heap)

    // Offsets for 4-connected neighbors: Up, Left, Down, Right
    const dRows = [-1, 0, 1, 0]
    const dCols = [0, -1, 0, 1]

    // 3. March wavefront inward
    while (heap.size > 0) {
      const pIdx = heap.pop()
      if (pIdx < 0) break

      const py = Math.floor(pIdx / pWidth)
      const px = pIdx % pWidth

      flags[pIdx] = FLAG_KNOWN

      for (let k = 0; k < 4; k++) {
        const ny = py + dRows[k]!
        const nx = px + dCols[k]!
        const nIdx = ny * pWidth + nx

        if (flags[nIdx] === FLAG_INSIDE) {
          // A. Solve Eikonal equation across 4 quadrants to find smallest arrival distance
          const d1 = solveEikonal(ny - 1, nx, ny, nx - 1, flags, dists, pWidth)
          const d2 = solveEikonal(ny + 1, nx, ny, nx - 1, flags, dists, pWidth)
          const d3 = solveEikonal(ny - 1, nx, ny, nx + 1, flags, dists, pWidth)
          const d4 = solveEikonal(ny + 1, nx, ny, nx + 1, flags, dists, pWidth)
          const sol = Math.min(d1, d2, d3, d4)
          dists[nIdx] = sol

          const gradTx = distanceGradient(flags, dists, nIdx, 1)
          const gradTy = distanceGradient(flags, dists, nIdx, pWidth)

          // C. Inpaint pixel (nx, ny) from surrounding KNOWN pixels within radius
          this.inpaintPoint(
            nx,
            ny,
            gradTx,
            gradTy,
            flags,
            dists,
            pWidth,
            pHeight,
            width,
            imgBytes,
            radius,
          )

          // D. Add pixel to BAND and push to priority queue
          flags[nIdx] = FLAG_BAND
          heap.push(sol, nIdx)
        }
      }
    }
  }

  /**
   * Inpaints a single pixel using weighted neighborhood color without Taylor gradient overshoot.
   */
  private inpaintPoint(
    nx: number,
    ny: number,
    gradTx: number,
    gradTy: number,
    flags: Uint8Array,
    dists: Float32Array,
    pWidth: number,
    pHeight: number,
    cropWidth: number,
    imgBytes: Uint8ClampedArray,
    radius: number,
  ): void {
    let sumR = 0
    let sumG = 0
    let sumB = 0
    let sumW = 0

    const targetT = dists[ny * pWidth + nx]!
    const radiusSq = radius * radius

    const qyMin = Math.max(1, ny - radius)
    const qyMax = Math.min(pHeight - 2, ny + radius)
    const qxMin = Math.max(1, nx - radius)
    const qxMax = Math.min(pWidth - 2, nx + radius)

    for (let qy = qyMin; qy <= qyMax; qy++) {
      for (let qx = qxMin; qx <= qxMax; qx++) {
        const qIdx = qy * pWidth + qx
        if (flags[qIdx] === FLAG_INSIDE) continue

        const rx = nx - qx
        const ry = ny - qy
        const d2 = rx * rx + ry * ry
        if (d2 > radiusSq || d2 === 0) continue

        const d = Math.sqrt(d2)

        // Directional factor: projection of (p - q) onto distance gradient
        let dir = rx * gradTx + ry * gradTy
        if (Math.abs(dir) <= 0.01) {
          dir = EPSILON
        }

        // Geometric distance factor: 1 / (d * d^2) = 1 / d^3
        const dst = 1.0 / (d * d2)

        // Level set factor: closeness in wavefront arrival time
        const lev = 1.0 / (1.0 + Math.abs(dists[qIdx]! - targetT))

        const w = Math.abs(dir * dst * lev)

        const imgX = qx - 1
        const imgY = qy - 1
        const qImgBase = (imgY * cropWidth + imgX) * 4

        // Telea 0th-order weighted average (matches Pyheal & antimatter15)
        // Eliminates unconstrained Taylor gradient explosion and rainbow zebra fringing
        sumR += w * imgBytes[qImgBase]!
        sumG += w * imgBytes[qImgBase + 1]!
        sumB += w * imgBytes[qImgBase + 2]!
        sumW += w
      }
    }

    const targetImgBase = ((ny - 1) * cropWidth + (nx - 1)) * 4
    if (sumW > 0) {
      imgBytes[targetImgBase] = Math.max(0, Math.min(255, Math.round(sumR / sumW)))
      imgBytes[targetImgBase + 1] = Math.max(0, Math.min(255, Math.round(sumG / sumW)))
      imgBytes[targetImgBase + 2] = Math.max(0, Math.min(255, Math.round(sumB / sumW)))
    }
    imgBytes[targetImgBase + 3] = 255
  }
}

function createState(width: number, height: number, mask: Uint8ClampedArray) {
  const pWidth = width + 2,
    pHeight = height + 2
  const flags = new Uint8Array(pWidth * pHeight)
  const dists = new Float32Array(flags.length)
  const heap = new MinHeap(Math.min(flags.length, 65536))
  let masked = 0
  // Zero-initialized arrays supply the clean one-pixel boundary.
  for (let i = 0; i < width * height; i++) {
    if (mask[i * 4]! <= 127) continue
    const index = (Math.floor(i / width) + 1) * pWidth + (i % width) + 1
    flags[index] = FLAG_INSIDE
    dists[index] = INF_DISTANCE
    masked++
  }
  return { pWidth, pHeight, flags, dists, heap, masked }
}

function seedBand(
  width: number,
  height: number,
  pWidth: number,
  flags: Uint8Array,
  dists: Float32Array,
  heap: MinHeap,
) {
  const neighbors = [-1, 1, -pWidth, pWidth]
  for (let y = 1; y <= height; y++) {
    for (let x = 1; x <= width; x++) {
      const index = y * pWidth + x
      if (flags[index] !== FLAG_KNOWN) continue
      if (!neighbors.some((offset) => flags[index + offset] === FLAG_INSIDE)) continue
      flags[index] = FLAG_BAND
      dists[index] = 0
      heap.push(0, index)
    }
  }
}

function distanceGradient(
  flags: Uint8Array,
  dists: Float32Array,
  index: number,
  step: number,
): number {
  const positive = flags[index + step] !== FLAG_INSIDE
  const negative = flags[index - step] !== FLAG_INSIDE
  if (positive && negative) return (dists[index + step]! - dists[index - step]!) * 0.5
  if (positive) return dists[index + step]! - dists[index]!
  if (negative) return dists[index]! - dists[index - step]!
  return 0
}
