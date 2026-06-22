import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

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

// Endpoint to serve image content by absolute path
app.get('/api/image', (req, res) => {
  const { path: filePath } = req.query;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).send('Image not found');
  }
  res.sendFile(filePath);
});

// Metrics calculation removed from backend. Will be done in frontend using Canvas to avoid heavy npm installs.

const PORT = 3001;
const server = app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
server.on('error', err => {
  console.error(`Backend server failed: ${err.message}`);
  process.exit(1);
});
