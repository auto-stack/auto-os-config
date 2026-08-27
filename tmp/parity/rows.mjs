// tmp/parity/rows.mjs — 对比两图在指定 x 区间的"文本行带"（暗像素行聚类），输出每带 y 范围。
// 用法: node rows.mjs <imgA> <imgB> <xMin> <xMax> [lumaThreshold]
import { PNG } from 'pngjs'
import { readFileSync } from 'fs'

const [aPath, bPath, xMinS, xMaxS, thS] = process.argv.slice(2)
const th = thS ? Number(thS) : 120

function bands(path) {
  const p = PNG.sync.read(readFileSync(path))
  const rows = []
  for (let y = 0; y < p.height; y++) {
    let dark = 0
    for (let x = Number(xMinS); x <= Number(xMaxS); x++) {
      const i = (y * p.width + x) * 4
      const luma = 0.299 * p.data[i] + 0.587 * p.data[i + 1] + 0.114 * p.data[i + 2]
      if (luma < th) dark++
    }
    rows.push(dark > 0)
  }
  const out = []
  let start = -1
  for (let y = 0; y < rows.length; y++) {
    if (rows[y] && start < 0) start = y
    if (!rows[y] && start >= 0) { out.push([start, y - 1]); start = -1 }
  }
  return out
}

const A = bands(aPath), B = bands(bPath)
console.log('A(css) bands:', A.map(b => b.join('-')).join('  '))
console.log('B(vue) bands:', B.map(b => b.join('-')).join('  '))
console.log('count:', A.length, 'vs', B.length)
