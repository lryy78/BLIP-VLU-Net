
const comparisonData = [

  // ──────────────────────────────────────────────
  // 5-task model (NHRBL) – Noise + Haze + Rain + Blur + Lowlight
  // ──────────────────────────────────────────────
  { task: 'NHRBL',   dataset: 'CBSD68',        type: 'Denoise15',    vlu_psnr: 34.04, vlu_ssim: 0.9343, blip_psnr: null, blip_ssim: null },
  { task: 'NHRBL',   dataset: 'CBSD68',        type: 'Denoise25',    vlu_psnr: 31.41, vlu_ssim: 0.8918, blip_psnr: null, blip_ssim: null },
  { task: 'NHRBL',   dataset: 'CBSD68',        type: 'Denoise50',    vlu_psnr: 28.18, vlu_ssim: 0.8042, blip_psnr: null, blip_ssim: null },

  { task: 'NHRBL',   dataset: 'SOTS_outdoors', type: 'Dehazing',     vlu_psnr: 30.85, vlu_ssim: 0.9801, blip_psnr: null, blip_ssim: null },
  { task: 'NHRBL',   dataset: 'Rain100L',      type: 'Deraining',    vlu_psnr: 38.52, vlu_ssim: 0.9824, blip_psnr: null, blip_ssim: null },
  { task: 'NHRBL',   dataset: 'GoPro',         type: 'Deblurring',   vlu_psnr: 26.49, vlu_ssim: 0.8306, blip_psnr: null, blip_ssim: null },
  { task: 'NHRBL',   dataset: 'LoL',           type: 'Delowlight',   vlu_psnr: 22.38, vlu_ssim: 0.8323, blip_psnr: null, blip_ssim: null },

  { task: 'NHRBL',   dataset: 'CBSD68',        type: 'Denoise_rand', vlu_psnr: 30.93, vlu_ssim: 0.8737, blip_psnr: null, blip_ssim: null },
  { task: 'NHRBL',   dataset: 'Urban100_HR',   type: 'Denoise_rand', vlu_psnr: 31.38, vlu_ssim: 0.8953, blip_psnr: null, blip_ssim: null },
  { task: 'NHRBL',   dataset: 'Urban100_HR',   type: 'Denoise15',    vlu_psnr: 34.00, vlu_ssim: 0.9394, blip_psnr: null, blip_ssim: null },
  { task: 'NHRBL',   dataset: 'Urban100_HR',   type: 'Denoise25',    vlu_psnr: 31.47, vlu_ssim: 0.9022, blip_psnr: null, blip_ssim: null },
  { task: 'NHRBL',   dataset: 'Urban100_HR',   type: 'Denoise50',    vlu_psnr: 28.13, vlu_ssim: 0.8313, blip_psnr: null, blip_ssim: null },




  // ──────────────────────────────────────────────
  // 3-task model (NHR) – Noise + Haze + Rain
  // ──────────────────────────────────────────────
  { task: 'NHR',     dataset: 'CBSD68',        type: 'Denoise15',    vlu_psnr: 34.04, vlu_ssim: 0.9342, blip_psnr: 34.09, blip_ssim: 0.9348 },
  { task: 'NHR',     dataset: 'CBSD68',        type: 'Denoise25',    vlu_psnr: 31.45, vlu_ssim: 0.8921, blip_psnr: 31.44, blip_ssim: 0.8915 },
  { task: 'NHR',     dataset: 'CBSD68',        type: 'Denoise50',    vlu_psnr: 28.21, vlu_ssim: 0.8045, blip_psnr: 28.18, blip_ssim: 0.8025 },

  { task: 'NHR',     dataset: 'SOTS_outdoors', type: 'Dehazing',     vlu_psnr: 30.71, vlu_ssim: 0.9793, blip_psnr: 30.92, blip_ssim: 0.9798 },
  { task: 'NHR',     dataset: 'Rain100L',      type: 'Deraining',    vlu_psnr: 38.86, vlu_ssim: 0.9834, blip_psnr: 38.42, blip_ssim: 0.9824 },

  { task: 'NHR',     dataset: 'CBSD68',        type: 'Denoise_rand', vlu_psnr: 30.95, vlu_ssim: 0.8740, blip_psnr: 30.94, blip_ssim: 0.8731 },
  { task: 'NHR',     dataset: 'Urban100_HR',   type: 'Denoise_rand', vlu_psnr: 31.65, vlu_ssim: 0.9080, blip_psnr: 31.70, blip_ssim: 0.9130 },

  { task: 'NHR',     dataset: 'Urban100_HR',   type: 'Denoise15',    vlu_psnr: 34.14, vlu_ssim: 0.9430, blip_psnr: 34.22, blip_ssim: 0.9472 },
  { task: 'NHR',     dataset: 'Urban100_HR',   type: 'Denoise25',    vlu_psnr: 31.77, vlu_ssim: 0.9158, blip_psnr: 31.85, blip_ssim: 0.9206 },
  { task: 'NHR',     dataset: 'Urban100_HR',   type: 'Denoise50',    vlu_psnr: 28.57, vlu_ssim: 0.8556, blip_psnr: 28.54, blip_ssim: 0.8618 },



  // ──────────────────────────────────────────────
  // Single-task models
  // ──────────────────────────────────────────────

  // Denoising (N) – CBSD68
  { task: 'N',       dataset: 'CBSD68',       type: 'Denoise15',    vlu_psnr: 34.30, vlu_ssim: 0.9379, blip_psnr: 34.33, blip_ssim: 0.9379 },
  { task: 'N',       dataset: 'CBSD68',       type: 'Denoise25',    vlu_psnr: 31.69, vlu_ssim: 0.8969, blip_psnr: 31.69, blip_ssim: 0.8970 },
  { task: 'N',       dataset: 'CBSD68',       type: 'Denoise50',    vlu_psnr: 28.45, vlu_ssim: 0.8123, blip_psnr: 28.45, blip_ssim: 0.8121 },
  { task: 'N',       dataset: 'CBSD68',       type: 'Denoise_rand', vlu_psnr: 31.19, vlu_ssim: 0.8796, blip_psnr: 31.20, blip_ssim: 0.8795 },

  // Denoising (N) – Urban100_HR
  { task: 'N',       dataset: 'Urban100_HR',  type: 'Denoise_rand',    vlu_psnr: 32.54, vlu_ssim: 0.9245, blip_psnr: 32.51, blip_ssim: 0.9242 },
  { task: 'N',       dataset: 'Urban100_HR',  type: 'Denoise15',    vlu_psnr: 34.86, vlu_ssim: 0.9523, blip_psnr: 34.81, blip_ssim: 0.9516 },
  { task: 'N',       dataset: 'Urban100_HR',  type: 'Denoise25',    vlu_psnr: 32.68, vlu_ssim: 0.9306, blip_psnr: 32.64, blip_ssim: 0.9304 },
  { task: 'N',       dataset: 'Urban100_HR',  type: 'Denoise50', vlu_psnr: 29.60, vlu_ssim: 0.8834, blip_psnr: 29.55, blip_ssim: 0.8828 },

  // Dehazing (H)
  { task: 'H',       dataset: 'SOTS_outdoors', type: 'Dehazing',    vlu_psnr: 30.98, vlu_ssim: 0.9801, blip_psnr: 31.52, blip_ssim: 0.9776 },

  // Deraining (R)
  { task: 'R',       dataset: 'Rain100L',      type: 'Deraining',   vlu_psnr: 38.60, vlu_ssim: 0.9833, blip_psnr: 38.58, blip_ssim: 0.9833 },

  // Deblurring (B)
  { task: 'B',       dataset: 'GoPro',         type: 'Deblurring',  vlu_psnr: 27.35, vlu_ssim: 0.8598, blip_psnr: 29.01, blip_ssim: 0.8785 },

  // Low-light (L)
  { task: 'L',       dataset: 'LoL',           type: 'Delowlight',  vlu_psnr: 22.39, vlu_ssim: 0.8223, blip_psnr: 22.52, blip_ssim: 0.8145 },

];

// Task display names
export const taskLabels = {
  'NHRBL': '5-task (NHRBL)',
  'NHR':   '3-task (NHR)',
  'N':     'Single Noise',
  'H':     'Single Haze',
  'R':     'Single Rain',
  'B':     'Single Blur',
  'L':     'Single Lowlight',
};


export function getEnrichedData() {
  return comparisonData.map(row => {
    const vluPsnr = row.vlu_psnr;
    const vluSsim = row.vlu_ssim;
    const blipPsnr = row.blip_psnr;
    const blipSsim = row.blip_ssim;

    let psnrDelta = null;
    let ssimDelta = null;
    if (vluPsnr !== null && blipPsnr !== null) {
      psnrDelta = (blipPsnr - vluPsnr);
    }
    if (vluSsim !== null && blipSsim !== null) {
      ssimDelta = (blipSsim - vluSsim);
    }

    return {
      ...row,
      psnr_delta: psnrDelta !== null ? Number(psnrDelta.toFixed(4)) : null,
      ssim_delta: ssimDelta !== null ? Number(ssimDelta.toFixed(4)) : null,
    };
  });
}

export default comparisonData;