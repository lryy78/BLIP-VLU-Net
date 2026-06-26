import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const app = express();
app.use(cors());

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, '..', 'VLU-Net');

// Paths mapping based on paths.txt
const TASKS = {
  'Single lowlight': {
    degraded: path.join(baseDir, 'datasets', 'delowlight_datasets', 'LoL', 'eval15', 'low'),
    vlu: path.join(baseDir, 'output', 'final_results', 'L', 'LoL', 'Delowlight'),
    blip_vlu: path.join(baseDir, 'output', 'blip_final_results', 'blip_L', 'LoL', 'Delowlight'),
    gt: path.join(baseDir, 'datasets', 'delowlight_datasets', 'LoL', 'eval15', 'high'),
  },
  'Single blur': {
    degraded: path.join(baseDir, 'datasets', 'deblurring_datasets', 'GoPro', 'test', 'blur'),
    vlu: path.join(baseDir, 'output', 'final_results', 'B', 'GoPro', 'Deblurring'),
    blip_vlu: path.join(baseDir, 'output', 'blip_final_results', 'blip_B', 'GoPro', 'Deblurring'),
    gt: path.join(baseDir, 'datasets', 'deblurring_datasets', 'GoPro', 'test', 'sharp'),
  },
  'Single rain': {
    degraded: path.join(baseDir, 'datasets', 'deraining_datasets', 'Rain100L', 'rainy'),
    vlu: path.join(baseDir, 'output', 'final_results', 'R', 'Rain100L', 'Deraining'),
    blip_vlu: path.join(baseDir, 'output', 'blip_final_results', 'blip_R', 'Rain100L', 'Deraining'),
    gt: path.join(baseDir, 'datasets', 'deraining_datasets', 'Rain100L', 'gt'),
  },
  'Single haze': {
    degraded: path.join(baseDir, 'datasets', 'dehazing_datasets', 'SOTS_outdoors', 'hazy'),
    vlu: path.join(baseDir, 'output', 'final_results', 'H', 'SOTS_outdoors', 'Dehazing'),
    blip_vlu: path.join(baseDir, 'output', 'blip_final_results', 'blip_H', 'SOTS_outdoors', 'Dehazing'),
    gt: path.join(baseDir, 'datasets', 'dehazing_datasets', 'SOTS_outdoors', 'clear'),
  },
};

const NOISE_TASKS = {
  'Single noise': {
    datasets: ['CBSD68', 'Urban100_HR'],
    levels: ['noisy15', 'noisy25', 'noisy50', 'noisy_rand'],
    paths: (dataset, level) => {
      const vlu_level_map = {
        'noisy15': 'Denoise15',
        'noisy25': 'Denoise25',
        'noisy50': 'Denoise50',
        'noisy_rand': 'Denoise_rand'
      };
      const vlu_level = vlu_level_map[level];
      
      return {
        degraded: path.join(baseDir, 'datasets', 'denoising_datasets', dataset, level),
        vlu: path.join(baseDir, 'output', 'final_results', 'N', dataset, vlu_level),
        blip_vlu: path.join(baseDir, 'output', 'blip_final_results', 'blip_N', dataset, vlu_level),
        gt: path.join(baseDir, 'datasets', 'denoising_datasets', dataset, 'clean')
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
        const vlu_level_map = {
          'noisy15': 'Denoise15',
          'noisy25': 'Denoise25',
          'noisy50': 'Denoise50',
          'noisy_rand': 'Denoise_rand'
        };
        const vlu_level = vlu_level_map[level];
        return {
          degraded: path.join(baseDir, 'datasets', 'denoising_datasets', dataset, level),
          vlu: path.join(baseDir, 'output', 'final_results', 'NHR', dataset, vlu_level),
          blip_vlu: path.join(baseDir, 'output', 'blip_final_results', 'blip_NHR', dataset, vlu_level),
          gt: path.join(baseDir, 'datasets', 'denoising_datasets', dataset, 'clean')
        }
      } else if (dataset === 'SOTS_outdoors') {
        return {
          degraded: path.join(baseDir, 'datasets', 'dehazing_datasets', 'SOTS_outdoors', 'hazy'),
          vlu: path.join(baseDir, 'output', 'final_results', 'NHR', 'SOTS_outdoors', 'Dehazing'),
          blip_vlu: path.join(baseDir, 'output', 'blip_final_results', 'blip_NHR', 'SOTS_outdoors', 'Dehazing'),
          gt: path.join(baseDir, 'datasets', 'dehazing_datasets', 'SOTS_outdoors', 'clear')
        }
      } else if (dataset === 'Rain100L') {
        return {
          degraded: path.join(baseDir, 'datasets', 'deraining_datasets', 'Rain100L', 'rainy'),
          vlu: path.join(baseDir, 'output', 'final_results', 'NHR', 'Rain100L', 'Deraining'),
          blip_vlu: path.join(baseDir, 'output', 'blip_final_results', 'blip_NHR', 'Rain100L', 'Deraining'),
          gt: path.join(baseDir, 'datasets', 'deraining_datasets', 'Rain100L', 'gt')
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
        const vlu_level_map = {
          'noisy15': 'Denoise15',
          'noisy25': 'Denoise25',
          'noisy50': 'Denoise50',
          'noisy_rand': 'Denoise_rand'
        };
        const vlu_level = vlu_level_map[level];
        return {
          degraded: path.join(baseDir, 'datasets', 'denoising_datasets', dataset, level),
          vlu: path.join(baseDir, 'output', 'final_results', 'NHRBL', dataset, vlu_level),
          blip_vlu: path.join(baseDir, 'output', 'blip_final_results', 'blip_NHRBL', dataset, vlu_level),
          gt: path.join(baseDir, 'datasets', 'denoising_datasets', dataset, 'clean')
        }
      } else if (dataset === 'SOTS_outdoors') {
        return {
          degraded: path.join(baseDir, 'datasets', 'dehazing_datasets', 'SOTS_outdoors', 'hazy'),
          vlu: path.join(baseDir, 'output', 'final_results', 'NHRBL', 'SOTS_outdoors', 'Dehazing'),
          blip_vlu: path.join(baseDir, 'output', 'blip_final_results', 'blip_NHRBL', 'SOTS_outdoors', 'Dehazing'),
          gt: path.join(baseDir, 'datasets', 'dehazing_datasets', 'SOTS_outdoors', 'clear')
        }
      } else if (dataset === 'Rain100L') {
        return {
          degraded: path.join(baseDir, 'datasets', 'deraining_datasets', 'Rain100L', 'rainy'),
          vlu: path.join(baseDir, 'output', 'final_results', 'NHRBL', 'Rain100L', 'Deraining'),
          blip_vlu: path.join(baseDir, 'output', 'blip_final_results', 'blip_NHRBL', 'Rain100L', 'Deraining'),
          gt: path.join(baseDir, 'datasets', 'deraining_datasets', 'Rain100L', 'gt')
        }
      } else if (dataset === 'GoPro') {
        return {
          degraded: path.join(baseDir, 'datasets', 'deblurring_datasets', 'GoPro', 'test', 'blur'),
          vlu: path.join(baseDir, 'output', 'final_results', 'NHRBL', 'GoPro', 'Deblurring'),
          blip_vlu: path.join(baseDir, 'output', 'blip_final_results', 'blip_NHRBL', 'GoPro', 'Deblurring'),
          gt: path.join(baseDir, 'datasets', 'deblurring_datasets', 'GoPro', 'test', 'sharp')
        }
      } else if (dataset === 'LoL') {
        return {
          degraded: path.join(baseDir, 'datasets', 'delowlight_datasets', 'LoL', 'eval15', 'low'),
          vlu: path.join(baseDir, 'output', 'final_results', 'NHRBL', 'LoL', 'Delowlight'),
          blip_vlu: path.join(baseDir, 'output', 'blip_final_results', 'blip_NHRBL', 'LoL', 'Delowlight'),
          gt: path.join(baseDir, 'datasets', 'delowlight_datasets', 'LoL', 'eval15', 'high')
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
    return res.status(404).send('Image not found');
  }
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
    return res.status(404).send('Image not found');
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
    res.status(500).send('Error processing image');
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
      try { fs.unlinkSync(aligned1); } catch(e) {}
    }
    if (aligned2 !== imgPath2) {
      try { fs.unlinkSync(aligned2); } catch(e) {}
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

const PORT = 3001;
const server = app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
server.on('error', err => {
  console.error(`Backend server failed: ${err.message}`);
  process.exit(1);
});
