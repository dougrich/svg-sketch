const Jimp = require('jimp');

const stepSizeFactor = 1 / 128
const maxWFactor = 1 / 2.5
const precision = 2

function VariableWidthLine(x1, y1, x2, y2) {
  let dTotal = ''
  let nx = x1 - x2
  let ny = y2 - y1
  let m = Math.sqrt(nx * nx + ny * ny)
  nx /= m
  ny /= m
  let currentPathTop = ''
  let currentPathBottom = []
  let lastX = x1
  let lastY = y1
  return {
    sample: (x, y, w) => {
      if (w === 0 && currentPathTop) {
        // close the loop
        currentPathTop += 'L' + x + ',' + y
        let path = `${currentPathTop} ${currentPathBottom.reverse().join('')}z`
        dTotal += path
        currentPathTop = ''
        currentPathBottom = []
      } else {
        if (currentPathTop === '') {
          currentPathTop = 'M' + lastX.toFixed(precision) + ',' + lastY.toFixed(precision)
        }
        currentPathTop += 'L' + (x + nx * w).toFixed(precision) + ',' + (y + ny * w).toFixed(precision)
        currentPathBottom.push('L' + (x - nx * w).toFixed(precision) + ',' + (y - ny * w).toFixed(precision))
      }
      lastX = x
      lastY = y
    },
    finalize: () => {
      if (currentPathTop) {
        let path = `${currentPathTop}L${lastX.toFixed(precision)},${lastY.toFixed(precision)}${currentPathBottom.reverse().join('')}z`
        dTotal += path
        currentPathTop = ''
        currentPathBottom = []
      }
      return dTotal
    }
  }
}

function compute(x1, y1, x2, y2, img, component, maxW) {
  let dx = x2 - x1, dy = y2 - y1
  let l = Math.sqrt(dx * dx + dy * dy)
  dx /= l
  dy /= l
  let line = VariableWidthLine(x1, y1, x2, y2)
  for (let t = 0; t <= l; t += 2) {
    const x = x1 + dx * t
    const y = y1 + dy * t
    if (x > (img.bitmap.width + 1) || y > (img.bitmap.height + 1) || x < 0 || y < 0) continue
    const hex = img.getPixelColor(Math.floor(x), Math.floor(y))
    const rgba = Jimp.intToRGBA(hex)
    let brightness = (rgba[component] / 255)
    brightness = Math.pow(brightness * 2, 1) / Math.pow(2, 1)
    brightness = Math.min(1, brightness)
    const weight = (1 - brightness) * maxW
    line.sample(x, y, weight)
  }
  return line.finalize()
}

function drawLeftTop(offset, stepSize, maxW, img, component, until) {
  let d = ''
  for (let i = offset; i < until * 2; i += stepSize) {
    let x1 = 0, y1 = i, x2 = i, y2 = 0
    d += compute(x1, y1, x2, y2, img, component, maxW)
  }
  return d
}

module.exports = (img, until) => {
  const stepSize = until * stepSizeFactor
  const maxW = stepSize * maxWFactor
  return `<path d="${drawLeftTop(stepSize, stepSize, maxW, img, 'r', until)}" stroke="none" fill="black"/>`
}