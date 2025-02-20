const express = require('express');
const smartcrop = require('smartcrop');
const fetch = require('node-fetch');
const { createCanvas, loadImage } = require('canvas');

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Define a custom canvasFactory as a function that returns a canvas.
 * Attach an `open` method to get the canvas context.
 */
function customCanvasFactory(width, height) {
  return createCanvas(width, height);
}
customCanvasFactory.open = function(canvas) {
  return canvas.getContext('2d');
};

/**
 * Route: /:dimensions/crop/:host/*
 * Example: /1080x1920/crop/images.bild.de/67b496cba918eb195a71f22f/ee041dbc12e6f9b376da7e48380ce52a,433c64b2
 */
app.get('/:dimensions/crop/:host/*', async (req, res) => {
  try {
    // Extract dimensions (e.g. "1080x1920")
    const dimensions = req.params.dimensions;
    const [widthStr, heightStr] = dimensions.split('x');
    const cropWidth = parseInt(widthStr, 10);
    const cropHeight = parseInt(heightStr, 10);
    
    if (isNaN(cropWidth) || isNaN(cropHeight)) {
      return res.status(400).send("Invalid dimensions provided.");
    }
    
    // Extract host and remaining image path
    const host = req.params.host; // e.g. "images.bild.de"
    const imagePath = req.params[0]; // e.g. "67b496cba918eb195a71f22f/ee041dbc12e6f9b376da7e48380ce52a,433c64b2"
    
    // Construct the full image URL (assuming HTTP, adjust if needed)
    const imageUrl = `http://${host}/${imagePath}`;
    
    // Fetch the image from the URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return res.status(400).send("Unable to fetch image from URL.");
    }
    const buffer = await response.buffer();
    const image = await loadImage(buffer);
    
    // Draw the image onto a canvas
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    
    // Run smartcrop with the desired dimensions and custom canvasFactory
    const cropResult = await smartcrop.crop(canvas, {
      width: cropWidth,
      height: cropHeight,
      canvasFactory: customCanvasFactory
    });
    const crop = cropResult.topCrop;
    
    // Create a new canvas for the cropped result and draw the cropped area
    const croppedCanvas = createCanvas(crop.width, crop.height);
    const croppedCtx = croppedCanvas.getContext('2d');
    croppedCtx.drawImage(
      canvas,
      crop.x, crop.y, crop.width, crop.height,
      0, 0, crop.width, crop.height
    );
    
    // Convert the cropped canvas to a PNG buffer and send it
    const pngBuffer = croppedCanvas.toBuffer('image/png');
    res.set('Content-Type', 'image/png');
    res.send(pngBuffer);
  } catch (error) {
    console.error("Error processing image:", error);
    res.status(500).send("Error processing image.");
  }
});

app.listen(PORT, () => {
  console.log(`Smartcrop service running on port ${PORT}`);
});
