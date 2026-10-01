import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const OUT = new URL('../extension/icons/', import.meta.url)
const SS = 4

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Unit-square shapes: teal rounded tile with three white "wipe" bars of decreasing length.
const inRoundRect = (x, y, x0, y0, x1, y1, r) => {
  const cx = Math.min(Math.max(x, x0 + r), x1 - r)
  const cy = Math.min(Math.max(y, y0 + r), y1 - r)
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}
const BARS = [
  [0.22, 0.27, 0.78, 0.37],
  [0.22, 0.45, 0.66, 0.55],
  [0.22, 0.63, 0.5, 0.73],
]
const TILE = [15, 118, 110]

function sample(x, y) {
  if (!inRoundRect(x, y, 0.02, 0.02, 0.98, 0.98, 0.2)) return null
  for (const [x0, y0, x1, y1] of BARS) {
    if (inRoundRect(x, y, x0, y0, x1, y1, (y1 - y0) / 2)) return [255, 255, 255]
  }
  return TILE
}

for (const size of [16, 32, 48, 128]) {
  const buf = Buffer.alloc(size * size * 4)
  const n = size * SS
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = sample((px * SS + sx + 0.5) / n, (py * SS + sy + 0.5) / n)
          if (!c) continue
          r += c[0]
          g += c[1]
          b += c[2]
          a++
        }
      }
      const i = (py * size + px) * 4
      if (a) {
        buf[i] = r / a
        buf[i + 1] = g / a
        buf[i + 2] = b / a
        buf[i + 3] = (a / (SS * SS)) * 255
      }
    }
  }
  writeFileSync(new URL(`icon${size}.png`, OUT), png(size, buf))
}
