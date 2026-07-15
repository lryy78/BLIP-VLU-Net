import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

import { spawn } from 'child_process';
import os from 'os';

const app = express();
app.use(cors());

// Add JSON and URL-encoded middleware for form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, '..', 'VLU-Net');
const imagesDir = path.join(__dirname, 'public', 'images');

// Paths mapping - all images are served from the prototype's public/images directory
const TASKS = {
  'Single lowlight': {
    degraded: path.join(imagesDir, 'single_lowlight', 'degraded'),
    vlu: path.join(imagesDir, 'single_lowlight', 'vlu'),
    blip_vlu: path.join(imagesDir, 'single_lowlight', 'blip_vlu'),
    gt: path.join(imagesDir, 'single_lowlight', 'gt'),
  },
  'Single blur': {
    degraded: path.join(imagesDir, 'single_blur', 'degraded'),
    vlu: path.join(imagesDir, 'single_blur', 'vlu'),
    blip_vlu: path.join(imagesDir, 'single_blur', 'blip_vlu'),
    gt: path.join(imagesDir, 'single_blur', 'gt'),
  },
  'Single rain': {
    degraded: path.join(imagesDir, 'single_rain', 'degraded'),
    vlu: path.join(imagesDir, 'single_rain', 'vlu'),
    blip_vlu: path.join(imagesDir, 'single_rain', 'blip_vlu'),
    gt: path.join(imagesDir, 'single_rain', 'gt'),
  },
  'Single haze': {
    degraded: path.join(imagesDir, 'single_haze', 'degraded'),
    vlu: path.join(imagesDir, 'single_haze', 'vlu'),
    blip_vlu: path.join(imagesDir, 'single_haze', 'blip_vlu'),
    gt: path.join(imagesDir, 'single_haze', 'gt'),
  },
};

const NOISE_TASKS = {
  'Single noise': {
    datasets: ['CBSD68', 'Urban100_HR'],
    levels: ['noisy15', 'noisy25', 'noisy50', 'noisy_rand'],
    paths: (dataset, level) => {
      return {
        degraded: path.join(imagesDir, 'single_noise', dataset, level, 'degraded'),
        vlu: path.join(imagesDir, 'single_noise', dataset, level, 'vlu'),
        blip_vlu: path.join(imagesDir, 'single_noise', dataset, level, 'blip_vlu'),
        gt: path.join(imagesDir, 'single_noise', dataset, level, 'gt')
      };
    }
  },
  '3tasks': {
    datasets: ['CBSD68', 'Urban100_HR', 'SOTS_outdoors', 'Rain100L'],
    levels: {
      'CBSD68': ['noisy15', 'noisy25', 'noisy50', 'noisy_rand'],
      'Urban100_HR': ['noisy15', 'noisy25', 'noisy50', 'noisy_rand'],
      'SOTS_outdoors': ['hazy'],
      'Rain100L': ['rainy']
    },
    paths: (dataset, level) => {
      if (dataset === 'CBSD68' || dataset === 'Urban100_HR') {
        return {
          degraded: path.join(imagesDir, '3tasks', dataset, level, 'degraded'),
          vlu: path.join(imagesDir, '3tasks', dataset, level, 'vlu'),
          blip_vlu: path.join(imagesDir, '3tasks', dataset, level, 'blip_vlu'),
          gt: path.join(imagesDir, '3tasks', dataset, level, 'gt')
        }
      } else if (dataset === 'SOTS_outdoors') {
        return {
          degraded: path.join(imagesDir, '3tasks', 'SOTS_outdoors', 'hazy', 'degraded'),
          vlu: path.join(imagesDir, '3tasks', 'SOTS_outdoors', 'hazy', 'vlu'),
          blip_vlu: path.join(imagesDir, '3tasks', 'SOTS_outdoors', 'hazy', 'blip_vlu'),
          gt: path.join(imagesDir, '3tasks', 'SOTS_outdoors', 'hazy', 'gt')
        }
      } else if (dataset === 'Rain100L') {
        return {
          degraded: path.join(imagesDir, '3tasks', 'Rain100L', 'rainy', 'degraded'),
          vlu: path.join(imagesDir, '3tasks', 'Rain100L', 'rainy', 'vlu'),
          blip_vlu: path.join(imagesDir, '3tasks', 'Rain100L', 'rainy', 'blip_vlu'),
          gt: path.join(imagesDir, '3tasks', 'Rain100L', 'rainy', 'gt')
        }
      }
    }
  },
  '5tasks': {
    datasets: ['CBSD68', 'Urban100_HR', 'SOTS_outdoors', 'Rain100L', 'GoPro', 'LoL'],
    levels: {
      'CBSD68': ['noisy15', 'noisy25', 'noisy50', 'noisy_rand'],
      'Urban100_HR': ['noisy15', 'noisy25', 'noisy50', 'noisy_rand'],
      'SOTS_outdoors': ['hazy'],
      'Rain100L': ['rainy'],
      'GoPro': ['blur'],
      'LoL': ['lowlight']
    },
    paths: (dataset, level) => {
      if (dataset === 'CBSD68' || dataset === 'Urban100_HR') {
        return {
          degraded: path.join(imagesDir, '5tasks', dataset, level, 'degraded'),
          vlu: path.join(imagesDir, '5tasks', dataset, level, 'vlu'),
          blip_vlu: path.join(imagesDir, '5tasks', dataset, level, 'blip_vlu'),
          gt: path.join(imagesDir, '5tasks', dataset, level, 'gt')
        }
      } else if (dataset === 'SOTS_outdoors') {
        return {
          degraded: path.join(imagesDir, '5tasks', 'SOTS_outdoors', 'hazy', 'degraded'),
          vlu: path.join(imagesDir, '5tasks', 'SOTS_outdoors', 'hazy', 'vlu'),
          blip_vlu: path.join(imagesDir, '5tasks', 'SOTS_outdoors', 'hazy', 'blip_vlu'),
          gt: path.join(imagesDir, '5tasks', 'SOTS_outdoors', 'hazy', 'gt')
        }
      } else if (dataset === 'Rain100L') {
        return {
          degraded: path.join(imagesDir, '5tasks', 'Rain100L', 'rainy', 'degraded'),
          vlu: path.join(imagesDir, '5tasks', 'Rain100L', 'rainy', 'vlu'),
          blip_vlu: path.join(imagesDir, '5tasks', 'Rain100L', 'rainy', 'blip_vlu'),
          gt: path.join(imagesDir, '5tasks', 'Rain100L', 'rainy', 'gt')
        }
      } else if (dataset === 'GoPro') {
        return {
          degraded: path.join(imagesDir, '5tasks', 'GoPro', 'blur', 'degraded'),
          vlu: path.join(imagesDir, '5tasks', 'GoPro', 'blur', 'vlu'),
          blip_vlu: path.join(imagesDir, '5tasks', 'GoPro', 'blur', 'blip_vlu'),
          gt: path.join(imagesDir, '5tasks', 'GoPro', 'blur', 'gt')
        }
      } else if (dataset === 'LoL') {
        return {
          degraded: path.join(imagesDir, '5tasks', 'LoL', 'lowlight', 'degraded'),
          vlu: path.join(imagesDir, '5tasks', 'LoL', 'lowlight', 'vlu'),
          blip_vlu: path.join(imagesDir, '5tasks', 'LoL', 'lowlight', 'blip_vlu'),
          gt: path.join(imagesDir, '5tasks', 'LoL', 'lowlight', 'gt')
        }
      }
    }
  }
}

app.get('/api/tasks', (req, res) => {
  const { task, dataset, level } = req.query;
  let paths = null;
  if (TASKS[task]) {
    paths = TASKS[task];
  } else if (NOISE_TASKS[task]) {
    paths = NOISE_TASKS[task].paths(dataset, level);
  }

  if (!paths) {
    return res.status(404).json({ error: 'Task not found' });
  }

  try {
    // Read files from degraded dir
    const files = fs.readdirSync(paths.degraded).filter(f => f.match(/\.(png|jpg|jpeg)$/i));
    res.json({ files, paths });
  } catch (err) {
    res.status(500).json({ error: 'Could not read directory', details: err.message });
  }
});

// Endpoint to serve raw image content by absolute path (unchanged originals)
app.get('/api/image', (req, res) => {
  const { path: filePath } = req.query;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Image not found' });
  }
  // Tell the browser to cache this image aggressively for 1 year
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.sendFile(filePath);
});

/**
 * Endpoint: /api/aligned-image
 * Replicates Python's crop_img(image, base=16) exactly:
 *   Removes (h % 16) / 2 pixels from top and bottom
 *   Removes (w % 16) / 2 pixels from left and right
 * This ensures all displayed images share the same base-16-aligned dimensions,
 * matching what the model outputs, without modifying any stored files.
 */
app.get('/api/aligned-image', async (req, res) => {
  const { path: filePath } = req.query;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Image not found' });
  }

  const BASE = 16;

  try {
    const metadata = await sharp(filePath).metadata();
    const h = metadata.height;
    const w = metadata.width;

    // Exact replication of Python's crop_img logic:
    //   crop_h = h % base
    //   crop_w = w % base
    //   return image[crop_h//2 : h-crop_h+crop_h//2, crop_w//2 : w-crop_w+crop_w//2, :]
    const cropH = h % BASE;
    const cropW = w % BASE;

    const left = Math.floor(cropW / 2);
    const top = Math.floor(cropH / 2);
    const extractWidth = w - cropW;
    const extractHeight = h - cropH;

    // Tell the browser to cache this image aggressively for 1 year
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    // Only crop if needed (if image is already base-16 aligned, serve full image)
    if (cropH === 0 && cropW === 0) {
      // Already aligned; serve as-is for efficiency
      res.sendFile(filePath);
      return;
    }

    const buffer = await sharp(filePath)
      .extract({ left, top, width: extractWidth, height: extractHeight })
      .jpeg({ quality: 95 })
      .toBuffer();

    res.type('image/jpeg');
    res.send(buffer);
  } catch (err) {
    console.error('Error aligning image:', err);
    res.status(500).json({ error: 'Error processing image', details: err.message });
  }
});

// Helper function to crop image to base-16 alignment (same as frontend logic)
const alignImage = async (imgPath) => {
  const BASE = 16;
  const metadata = await sharp(imgPath).metadata();
  const h = metadata.height;
  const w = metadata.width;

  const cropH = h % BASE;
  const cropW = w % BASE;

  // If already aligned, return original
  if (cropH === 0 && cropW === 0) {
    return imgPath;
  }

  const left = Math.floor(cropW / 2);
  const top = Math.floor(cropH / 2);
  const extractWidth = w - cropW;
  const extractHeight = h - cropH;

  // Create temporary aligned image
  const tempPath = imgPath + '.aligned.jpg';
  await sharp(imgPath)
    .extract({ left, top, width: extractWidth, height: extractHeight })
    .jpeg({ quality: 95 })
    .toFile(tempPath);

  return tempPath;
};

// Helper function to calculate PSNR between two images (aligned to base-16, full resolution)
// Uses raw pixel data without resize or re-compression to match frontend calculation
const calculatePSNR = async (imgPath1, imgPath2) => {
  try {
    // Align both images to base-16 (same as frontend)
    const [aligned1, aligned2] = await Promise.all([
      alignImage(imgPath1),
      alignImage(imgPath2)
    ]);

    // Get raw pixel data at full resolution (no resize, no JPEG re-compression)
    const [img1, img2] = await Promise.all([
      sharp(aligned1).raw().toBuffer(),
      sharp(aligned2).raw().toBuffer()
    ]);

    // Clean up temporary aligned images
    if (aligned1 !== imgPath1) {
      try { fs.unlinkSync(aligned1); } catch (e) { }
    }
    if (aligned2 !== imgPath2) {
      try { fs.unlinkSync(aligned2); } catch (e) { }
    }

    const len = img1.length;
    if (len !== img2.length) {
      return null;
    }

    let mse = 0;
    for (let i = 0; i < len; i++) {
      const diff = img1[i] - img2[i];
      mse += diff * diff;
    }
    mse /= len;

    if (mse === 0) return 100;
    return (10 * Math.log10((255 * 255) / mse)).toFixed(2);
  } catch (err) {
    console.error('PSNR calculation error:', err.message, 'for', imgPath1, 'vs', imgPath2);
    return null;
  }
};

// Endpoint to get top 10 images with biggest PSNR difference between VLU and BLIP (optimized for speed)
app.get('/api/top10', async (req, res) => {
  const { task, dataset, level } = req.query;
  let paths = null;
  if (TASKS[task]) {
    paths = TASKS[task];
  } else if (NOISE_TASKS[task]) {
    paths = NOISE_TASKS[task].paths(dataset, level);
  }

  if (!paths) {
    return res.status(404).json({ error: 'Task not found' });
  }

  try {
    const files = fs.readdirSync(paths.degraded).filter(f => f.match(/\.(png|jpg|jpeg)$/i));
    console.log(`[top10] Task: ${task}, Found ${files.length} files`);
    const results = [];
    const BATCH_SIZE = 10; // Process in batches for better performance

    // Process images in batches
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(async (file) => {
        const vluPath = path.join(paths.vlu, file);
        const blipPath = path.join(paths.blip_vlu, file);
        const gtFile = getGTFilename(task, file, dataset);
        const gtPath = path.join(paths.gt, gtFile);

        const vluExists = fs.existsSync(vluPath);
        const blipExists = fs.existsSync(blipPath);
        const gtExists = fs.existsSync(gtPath);

        if (!vluExists || !blipExists || !gtExists) {
          if (i === 0) { // Only log for first batch to avoid spam
            console.log(`[top10] Missing files for ${file}: vlu=${vluExists}, blip=${blipExists}, gt=${gtExists}`);
          }
          return null;
        }

        const [vluPsnr, blipPsnr] = await Promise.all([
          calculatePSNR(gtPath, vluPath),
          calculatePSNR(gtPath, blipPath)
        ]);

        if (vluPsnr && blipPsnr) {
          const diff = Math.abs(parseFloat(vluPsnr) - parseFloat(blipPsnr));
          return {
            filename: file,
            vlu_psnr: parseFloat(vluPsnr),
            blip_psnr: parseFloat(blipPsnr),
            difference: diff
          };
        }
        return null;
      }));

      // Add non-null results
      results.push(...batchResults.filter(r => r !== null));
    }

    console.log(`[top10] Calculated PSNR for ${results.length} images`);

    // Sort by difference (biggest first) and take top 10
    results.sort((a, b) => b.difference - a.difference);
    const top10 = results.slice(0, 10);

    console.log(`[top10] Returning top ${top10.length} images`);
    res.json({ files: top10, paths });
  } catch (err) {
    console.error('Error in /api/top10:', err);
    res.status(500).json({ error: 'Could not calculate top 10 images', details: err.message });
  }
});

// Helper function to get GT filename (same logic as in frontend)
function getGTFilename(task, filename, dataset) {
  if (task === 'Single haze' || ((task === '3tasks' || task === '5tasks') && dataset === 'SOTS_outdoors')) {
    return filename.split('_')[0] + '.png';
  } else if (task === 'Single rain' || ((task === '3tasks' || task === '5tasks') && dataset === 'Rain100L')) {
    return filename.replace('rain-', 'norain-');
  }
  return filename;
}

// Serve static files from the React frontend build
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // Hand over any other requests to the React Router
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    // Only intercept if not an API route
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'API endpoint not found' });
    }
  });
} else {
  // 404 handler for when frontend is not built
  app.use((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(404).json({ error: 'Not found. Please run npm run build' });
  });
}

// Global error handler - MUST BE LAST
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.setHeader('Content-Type', 'application/json');
  res.status(500).json({
    error: 'Internal server error',
    details: err.message
  });
});

const PORT = 3001;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  AiOIR Viewer Server is ready!`);
  console.log(`  ➜  Local:   http://localhost:${PORT}/`);

  let networkIP = null;
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (!networkIP) networkIP = iface.address;
        if (iface.address.startsWith('192.168.') || iface.address.startsWith('10.')) {
          networkIP = iface.address;
        }
      }
    }
  }
  if (networkIP) {
    console.log(`  ➜  Network: http://${networkIP}:${PORT}/`);
  }
  console.log('\n');
});
server.on('error', err => {
  console.error(`Backend server failed: ${err.message}`);
  process.exit(1);
});