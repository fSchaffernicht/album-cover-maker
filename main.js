const sharp = require("sharp")
const fs = require("fs")
const path = require("path")
const jimp = require("jimp")

const SIZE = 1200
const QUALITY = 100

const positions = [
  "north",
  "northeast",
  "southeast",
  "south",
  "southwest",
  "west",
  "northwest",
  "east",
  "center",
  "centre",
]

async function getImageInfo(image) {
  return await sharp(image).metadata()
}

async function pixelAverage(src) {
  const img = await jimp.read(src)

  var avgR = 0
  var avgG = 0
  var avgB = 0
  var avgA = 0
  img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
    avgR += this.bitmap.data[idx + 0]
    avgG += this.bitmap.data[idx + 1]
    avgB += this.bitmap.data[idx + 2]
    avgA += this.bitmap.data[idx + 3]
  })
  var pixels = img.bitmap.width * img.bitmap.height
  avgR = avgR / pixels
  avgG = avgG / pixels
  avgB = avgB / pixels
  avgA = avgA / pixels

  var brightness = Math.floor((avgR + avgG + avgB) / 3)
  var results = {
    red: avgR,
    green: avgG,
    blue: avgB,
    alpha: avgA,
    brightness: brightness,
  }

  return results
}

function getFileName(image, output) {
  return `${image.replace(".jpg", "")}-${output}.jpg`
}

function getExtractionValues({ logoPosition, image }) {
  const width = 800
  const height = 800
  const centerX = image.width / 2 - width / 2
  const centerY = image.height / 2 - height / 2
  const right = image.width - width
  const bottom = image.height - height

  const positions = {
    north: {
      left: centerX,
      top: 0,
      width,
      height,
    },
    northeast: { left: image.width - width, top: 0, width, height },
    southeast: {
      left: right,
      top: bottom,
      width,
      height,
    },
    south: { left: centerX, top: bottom, width, height },
    southwest: { left: 0, top: bottom, width, height },
    west: { left: 0, top: centerY, width, height },
    northwest: { left: 0, top: 0, width, height },
    east: { left: right, top: centerY, width, height },
    center: {
      left: centerX,
      top: centerY,
      width,
      height,
    },
    centre: {
      left: centerX,
      top: centerY,
      width,
      height,
    },
  }

  return positions[logoPosition]
}

function getLogoPosition() {
  return positions[Math.floor(Math.random() * positions.length)]
}

function createTile(image, { rotate, bottom, info } = {}) {
  if (bottom) {
    return sharp(image)
      .rotate(rotate ? 180 : 0)
      .extract({
        left: 0,
        top: Math.floor(info.height / 2),
        width: Math.floor(info.height / 2),
        height: Math.floor(info.height / 2),
      })
      .resize(SIZE, SIZE, { cover: true })
  }

  return sharp(image)
    .rotate(rotate ? 90 : 0)
    .resize(SIZE, SIZE, { cover: true })
    .extract({ left: 0, top: 0, width: SIZE, height: SIZE })
}

async function makeImage({ image, rotate = false, output, bottom }) {
  const sourceImage = path.resolve(__dirname, "input/" + image)
  const topRightImage = path.resolve(__dirname, "temp/top-right.jpg")
  const bottomRightImage = path.resolve(__dirname, "temp/bottom-right.jpg")
  const bottomLeftImage = path.resolve(__dirname, "temp/bottom-left.jpg")
  // const logo = path.resolve(__dirname, "logo-big.png")

  try {
    const imageInfo = await getImageInfo(sourceImage)

    await createTile(sourceImage, { rotate, bottom, info: imageInfo })
      .flip()
      .jpeg({
        quality: QUALITY,
      })
      .toFile(topRightImage)

    await createTile(topRightImage)
      .flip()
      .jpeg({
        quality: QUALITY,
      })
      .toFile(bottomRightImage)

    await createTile(bottomRightImage)
      .flop()
      .jpeg({
        quality: QUALITY,
      })
      .toFile(bottomLeftImage)

    await createTile(sourceImage, {
      rotate,
      bottom,
      info: imageInfo,
    })
      .flip()
      .flop()
      .extend({
        top: 0,
        bottom: SIZE,
        left: 0,
        right: SIZE,
        background: "black",
      })
      .composite([
        {
          input: topRightImage,
          gravity: "northeast",
        },
        {
          input: bottomRightImage,
          gravity: "southeast",
        },
        {
          input: bottomLeftImage,
          gravity: "southwest",
        },
      ])
      .jpeg({
        quality: QUALITY,
      })
      .toFile(path.resolve(__dirname, "temp", getFileName(image, output)))

    const finalImage = path.resolve(
      __dirname,
      "temp",
      getFileName(image, output)
    )

    const logoPosition = getLogoPosition()

    const finalImageInfo = await getImageInfo(finalImage)

    // Save logo background for brightness check
    await sharp(finalImage)
      .extract(
        getExtractionValues({
          logoPosition: logoPosition,
          image: finalImageInfo,
        })
      )
      .toFile(path.resolve(__dirname, "temp", `${logoPosition}-${output}.jpg`))

    const { brightness } = await pixelAverage(
      path.resolve(__dirname, "temp", `${logoPosition}-${output}.jpg`)
    )

    let logo
    if (brightness > 100) {
      logo = path.resolve(__dirname, "logo/logo-black.png")
    } else {
      logo = path.resolve(__dirname, "logo/logo-white.png")
    }

    await sharp(finalImage)
      .composite([
        {
          input: logo,
          gravity: logoPosition,
        },
      ])
      .jpeg({
        quality: QUALITY,
      })
      .toFile(path.resolve(__dirname, "output", getFileName(image, output)))

    console.log(`Made file: ${getFileName(image, output)}`)

    const files = fs.readdirSync(path.resolve(__dirname, "temp"))
    for (const file of files) {
      fs.unlinkSync(path.join(path.resolve(__dirname, "temp"), file))
    }
  } catch (error) {
    console.log(error, image)
  }
}

fs.readdir("./input", "utf-8", async (error, files) => {
  for (const file of files) {
    await makeImage({
      image: `${file}`,
      output: "1",
    })
    await makeImage({
      image: `${file}`,
      output: "2",
      rotate: true,
    })
    await makeImage({
      image: `${file}`,
      output: "3",
      bottom: true,
      rotate: false,
    })
    await makeImage({
      image: `${file}`,
      output: "4",
      bottom: true,
      rotate: true,
    })
  }
})
