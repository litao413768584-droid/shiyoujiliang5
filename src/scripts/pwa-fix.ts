// @ts-nocheck
import * as fs from 'fs';
import * as path from 'path';
import { Jimp } from 'jimp';

const publicDir = path.join(process.cwd(), 'public');

async function processAppAssets() {
  const srcIcon = path.join(publicDir, 'icon.jpg');
  const srcDesktop = path.join(publicDir, 'screenshot_desktop.jpg');
  const srcMobile = path.join(publicDir, 'screenshot_mobile.jpg');

  // 1. Process App Icons
  if (fs.existsSync(srcIcon)) {
    console.log('--- Processing main icon.jpg into multiple PNG sizes ---');
    const sizes = [72, 96, 128, 144, 152, 192, 384, 512, 1024];
    
    for (const size of sizes) {
      const destPath = path.join(publicDir, `icon-${size}.png`);
      const image = await Jimp.read(srcIcon);
      image.resize({ w: size, h: size });
      const buffer = await image.getBuffer('image/png');
      fs.writeFileSync(destPath, buffer);
      console.log(`Generated: icon-${size}.png (${size}x${size})`);
    }

    // Also write a default icon.png of 512x512
    const defaultIconPath = path.join(publicDir, 'icon.png');
    const defaultImage = await Jimp.read(srcIcon);
    defaultImage.resize({ w: 512, h: 512 });
    const defaultBuffer = await defaultImage.getBuffer('image/png');
    fs.writeFileSync(defaultIconPath, defaultBuffer);
    console.log(`Generated: default icon.png (512x512)`);
  } else {
    console.warn('Source icon.jpg not found inside publicDir');
  }

  // 2. Process Desktop Screenshot
  if (fs.existsSync(srcDesktop)) {
    console.log('--- Converting screenshot_desktop.jpg in genuine png format ---');
    const image = await Jimp.read(srcDesktop);
    // Explicitly resize or preserve 1376x768 to ensure it meets exact declared aspect-ratio
    image.resize({ w: 1376, h: 768 });
    const buffer = await image.getBuffer('image/png');
    fs.writeFileSync(path.join(publicDir, 'screenshot_desktop.png'), buffer);
    console.log(`Generated: screenshot_desktop.png (1376x768)`);
  } else {
    console.warn('Source screenshot_desktop.jpg not found');
  }

  // 3. Process Mobile Screenshot
  if (fs.existsSync(srcMobile)) {
    console.log('--- Converting screenshot_mobile.jpg in genuine png format ---');
    const image = await Jimp.read(srcMobile);
    // Explicitly resize or preserve 768x1376 to match declaration
    image.resize({ w: 768, h: 1376 });
    const buffer = await image.getBuffer('image/png');
    fs.writeFileSync(path.join(publicDir, 'screenshot_mobile.png'), buffer);
    console.log(`Generated: screenshot_mobile.png (768x1376)`);
  } else {
    console.warn('Source screenshot_mobile.jpg not found');
  }
  
  console.log('PWA Assets correction successfully completed!');
}

processAppAssets().catch((err) => {
  console.error('Error processing PWA assets:', err);
  process.exit(1);
});

