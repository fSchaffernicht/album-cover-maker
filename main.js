const sharp = require("sharp")
const fs = require("fs")
const path = require("path")

const SIZE = 1200
const QUALITY = 100

async function getImageInfo(image) {
  return await sharp(image).metadata()
}

function getLogoPosition() {
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
  const logo = path.resolve(__dirname, "logo-big.png")

  try {
    const imageInfo = await getImageInfo(sourceImage)

    console.log("image", imageInfo)

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

    await createTile(sourceImage, { rotate, bottom, info: imageInfo })
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
        {
          input: logo,
          gravity: getLogoPosition(),
        },
      ])
      .jpeg({
        quality: QUALITY,
      })
      .toFile(
        path.resolve(
          __dirname,
          "output",
          `${image.replace(".jpg", "")}-${output}.jpg`
        )
      )

    console.log(`Made file: ${image.replace(".jpg", "")}-${output}.jpg`)

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
