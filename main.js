const sharp = require("sharp")
const fs = require("fs")
const path = require("path")

const SIZE = 1200

function createTile(image, rotate) {
  return sharp(image)
    .rotate(rotate ? 90 : 0)
    .resize(SIZE, SIZE, { fill: true })
    .extract({ left: 0, top: 0, width: SIZE, height: SIZE })
}

async function makeImage({ image, rotate, output }) {
  await createTile(path.resolve(__dirname, "input/" + image), rotate)
    .flip()
    .toFile(path.resolve(__dirname, "temp/top-right.jpg"))

  await createTile(path.resolve(__dirname, "temp/top-right.jpg"))
    .flip()
    .toFile(path.resolve(__dirname, "temp/bottom-right.jpg"))

  await createTile(path.resolve(__dirname, "temp/bottom-right.jpg"))
    .flop()
    .toFile(path.resolve(__dirname, "temp/bottom-left.jpg"))

  await createTile(path.resolve(__dirname, "input/" + image))
    .rotate(rotate ? 90 : 0)
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
        input: path.resolve(__dirname, "temp/top-right.jpg"),
        gravity: "northeast",
      },
      {
        input: path.resolve(__dirname, "temp/bottom-right.jpg"),
        gravity: "southeast",
      },
      {
        input: path.resolve(__dirname, "temp/bottom-left.jpg"),
        gravity: "southwest",
      },
      {
        input: path.resolve(__dirname, "reduce-logo.png"),
        gravity: "center",
      },
    ])
    .toFile(path.resolve(__dirname, "output", `${output}-${image}`))

  const files = fs.readdirSync(path.resolve(__dirname, "temp"))
  for (const file of files) {
    fs.unlinkSync(path.join(path.resolve(__dirname, "temp"), file))
  }
}

fs.readdir("./input", "utf-8", async (error, files) => {
  for (const file of files) {
    console.log(file)
    await makeImage({
      image: `${file}`,
      output: "first-image",
    })
    await makeImage({
      image: `${file}`,
      output: "second-image",
      rotate: true,
    })
  }
})
