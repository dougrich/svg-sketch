const program = require('commander');
var fs = require('fs'),
    Jimp = require('jimp');


const methods = {
  'crosshatch': require('./method/crosshatch'),
  'weighted': require('./method/weighted')
}

program
  .version('0.0.1')
  .name("art-sketch")
  .option('-s, --sketchy', 'Adds sketchy filter')
  .arguments('<method> <input> <output>')
  .action((method, input, output) => {
    Jimp.read(input, (err, img) => {
      if (err) throw err;
      img.grayscale(() => {
        const width = img.bitmap.width
        const height = img.bitmap.height
        const until = Math.max(width, height)
        let overlay = ''
        if (program.sketchy) {
          overlay += `
          <filter id="sketchy">
            <feTurbulence id="turbulence" baseFrequency="0.02" numOctaves="3" result="noise" seed="3" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1" />
          </filter>
          <g filter="url(#sketchy)">`
        } else {
          overlay += `<g>`
        }
        overlay += methods[method](img, until)
        overlay += `<rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="black" stroke-width="2"/>`
        overlay += '</g>'
        fs.writeFileSync(output, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" version="1.1">` + overlay + '</svg>');
      })
    });
  })

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

program.parse(process.argv)