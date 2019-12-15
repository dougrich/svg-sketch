const Jimp = require('jimp');

const strokeWeight = 1
const strokeMinLength = 5
const precision = 2
const weights = [0.95, 0.85, 0.8, 0.7, 0.6, 0.5]
const cmd = plan(weights, weights.length * weights.length * strokeWeight * 1.05)

function VariableLine(x1, y1, strokeStarts) {
  let d = ''
  let f = false
  let lastX = x1
  let lastY = y1

  return {
    sample: (x, y, w) => {
      if (Number.isNaN(x) || Number.isNaN(y)) return
      if (w === 0) {
        // finish the line if it is at least the minimum length
        if (f) {
          const [sx, sy] = strokeStarts[strokeStarts.length - 1]
          const dx = x - sx, dy = y - sy
          const l = Math.sqrt(dx * dx + dy * dy)
          if (l > strokeMinLength) {
            d += `L${lastX.toFixed(precision)},${lastY.toFixed(precision)}`
            f = false
          }
        }
      } else if (!f) {
        f = true
        d += 'M'
        d += `${x.toFixed(precision)},${y.toFixed(precision)}`
        strokeStarts.push([x, y])
      }
      lastX = x
      lastY = y
    },
    finalize: () => {
      if (f) {
        d += `L${lastX.toFixed(precision)},${lastY.toFixed(precision)}`
      }
      f = false
      if (d) {
        return `${d}`
      } else {
        return ''
      }
    }
  }
}

function compute(x1, y1, x2, y2, img, density, strokeStarts) {
  let dx = x2 - x1, dy = y2 - y1
  let l = Math.sqrt(dx * dx + dy * dy)
  dx /= l
  dy /= l
  let line = VariableLine(x1, y1, strokeStarts)
  for (let t = 0; t <= l; t += 0.05) {
    const x = x1 + dx * t
    const y = y1 + dy * t
    if (x > img.bitmap.width + 1 || y > img.bitmap.height + 1 || x < 0 || y < 0) continue
    const hex = img.getPixelColor(Math.floor(x), Math.floor(y))
    const rgba = Jimp.intToRGBA(hex)
    let brightness = (rgba.r / 255)
    brightness = brightness > density ? 1 : 0
    line.sample(x, y, 1 - brightness)
  }
  return line.finalize()
}

// left to top
function drawDensity0(offset, stepSize, density, until, img, strokeStarts) {
  let overlay = ''
  for (let i = offset; i < until * 2; i += stepSize) {
    let x1 = 0, y1 = i, x2 = i, y2 = 0
    overlay += compute(x1, y1, x2, y2, img, density, strokeStarts)
  }
  return overlay
}

// left to bottom
function drawDensity1(offset, stepSize, density, until, img, strokeStarts) {
  let overlay = ''
  for (let i = offset; i < until * 2; i += stepSize) {
    let x1 = 0, y1 = (until - i), x2 = i, y2 = until
    overlay += compute(x1, y1, x2, y2, img, density, strokeStarts)
  }
  return overlay
}

// figure out which draw commands are needed
function plan(weights, gap) {
  const topLevelGap = gap
  const commands = [
    [0, topLevelGap, weights[0]]
  ]
  function push(i, pos, gap) {
    if (weights.length === i) return
    push(i + 1, pos - gap, gap / 2)
    commands.push([pos, topLevelGap, weights[i]])
    push(i + 1, pos + gap, gap / 2)
  }
  push(1, gap / 2, gap / 4)
  return commands
}


module.exports = function(img, until) {
  let overlay = `<g>`
  const strokeStarts = []
  const draw = (drawDensity, override) => {
    let d = ''
    console.log('Drawing')
    for (const i in cmd) {
      const [offset, gap, weight] = cmd[i]
      d += drawDensity(offset, gap, override[i] ||weight, until, img, strokeStarts)
      console.log(`... ${((i + 1) * 10 / cmd.length).toFixed(1)}%`)
    }
    return d
  }

  overlay += `<path d="${draw(drawDensity0, [])}" stroke="black" stroke-opacity="0.5" stroke-width="${strokeWeight}" stroke-linecap="round"/>`
  overlay += `<path d="${draw(drawDensity1, [weights[1]])}" stroke="black" stroke-opacity="0.5" stroke-width="${strokeWeight}" stroke-linecap="round"/>`
  for (const [x, y] of strokeStarts) {
    overlay += `<circle cx="${x.toFixed(precision)}" cy="${y.toFixed(precision)}" r="${(strokeWeight / 2).toFixed(precision)}" stroke="none" fill="black" fill-opacity="0.5"/>`
  }
  overlay += '</g>'
  return overlay
}