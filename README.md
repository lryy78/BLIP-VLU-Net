# BLIP-VLU-Net

This repository extends [VLU-Net](https://github.com/xianggkl/VLU-Net) (CVPR 2025) with **BLIP-enhanced** training/testing pipelines and an interactive **web viewer** for comparing restoration results.

> **Vision-Language Gradient Descent-driven All-in-One Deep Unfolding Networks**
> Original work: Zeng, Wang, Chen, Su, Liu — CVPR 2025. Paper: <https://arxiv.org/pdf/2503.16930>

## Framework & Pipelines

### Overall Framework
<img src="BLIP-VLU-Net\figures\Framework.png" alt="Framework" width="800" />

### General Flow
<img src="BLIP-VLU-Net\figures\GeneralFlow.png" alt="General Flow" width="600" />

### Phase 1: Caption and Degradation Extraction
<img src="BLIP-VLU-Net\figures\Phase1.png" alt="Phase 1" width="600" />

### Phase 2: BLIP-2 Fine-Tuning
<img src="BLIP-VLU-Net\figures\Phase2.png" alt="Phase 2" width="600" />

---

## 📁 Repository Structure

```text
BLIP-VLU-Net/
├── blip-vlu-net-prototype/        # Includes the pre-prepared images
├── VLU-Net/                       # Core VLU-Net codebase (forked from xianggkl/VLU-Net)
│   ├── net/                       # Network definitions (Final.py, clip.py)
│   ├── open_clip/                 # Open CLIP model implementation
│   ├── utils/                     # Datasets, losses, schedulers, validation utilities
│   ├── figures/                   # Paper figures
│   ├── train.py                   # Original training entry point
│   ├── test.py                    # Original testing entry point
│   ├── vlu_test.py                # CLI test script (original VLU-Net, uses pretrained_ckpt/)
│   ├── blip_vlunet_train.py       # BLIP-enhanced training script (uses blip_vlunet_pretrained_ckpt/)
│   ├── blip_vlu_test.py           # BLIP-enhanced test script (uses blip_vlunet_pretrained_ckpt/)
│   ├── requirements.txt           # Python dependencies
│   ├── README.md                  # Original VLU-Net README
│   ├── blip_vlunet_pretrained_ckpt/ # Pretrained BLIP-enhanced CLIP checkpoint
│   ├── Phase*.ipynb               # BLIP-enhanced experiment notebooks
│   │   ├── Phase0_blipissue.ipynb      # Tests on the original BLIP unable to describe the image with degraded type and severity level
│   │   ├── Phase0_setup.ipynb          # Setup by setting up the datasets etc.
│   │   ├── Phase0_test_orivlunet.ipynb # Tests on the original VLU-Net baseline result using the checkpoint
│   │   ├── Phase1_*.ipynb              # Enhanced caption is generated, classified on the degradation with different severity levels, and trained and merged with the original VLU-Net
│   │   ├── Phase2_*.ipynb              # Fine-tunes the BLIP-2 to ensure it is able to describe the image scene with degradation type and severity level
│   │   ├── Phase2a_*.ipynb             # Shows how the caption transforms from original BLIP into enhanced caption and to fine-tuned BLIP-2
│   │   ├── Phase3_*.ipynb              # Passes the captions into the tokenizer, etc.
│   │   ├── Phase4_*.ipynb              # Train
│   │   ├── Phase5_*.ipynb              # Tests on the train result
│   │   └── Phase6a_*.ipynb             # Displays the qualitative results for each task
│   └── ...
│
├── vlu-net-viewer/                # Interactive React + Vite web viewer. It is run on the web viewer from the datasets and output.
│   ├── src/                       # React components (ImageSlider, ZoomableImage)
│   ├── server.js                  # Express backend serving images & computing PSNR/SSIM
│   ├── public/                    # Static assets
│   └── package.json
│
└── paths.txt                      # Dataset/output path reference notes
```

> **Note:** Datasets (`VLU-Net/datasets/`), model outputs (`VLU-Net/output/`), and pretrained checkpoints (`VLU-Net/pretrained_ckpt/`, `VLU-Net/blip_vlunet_pretrained_ckpt/`) are **not included** in this repository due to size. See the [original VLU-Net README](VLU-Net/README.md) for download links.

---

## 📊 Datasets

### Training Datasets
*Table: Training datasets used for both VLU-Net and BLIP-VLU-Net implementation*

| Degradation Type | Training Dataset | Image Paths | Total Image Paths |
| :--- | :--- | :--- | :--- |
| Denoising | BSD400<br>WED | 400<br>4,743 | 5,143 |
| Dehazing | OTS | 72,135 | 72,135 |
| Deraining | RainTrainL | 600 | 600 |
| Deblurring | GoPro | 2,103 | 2,103 |
| Low-light | LoL | 485 | 485 |

### Testing Datasets
*Table: Testing datasets used for both VLU-Net and BLIP-VLU-Net evaluation*

| Degradation Type | Testing Dataset | Image Paths | Total Image Paths |
| :--- | :--- | :--- | :--- |
| Denoising | CBSD68<br>Urban100 | 68<br>100 | 168 |
| Dehazing | SOTS | 500 | 500 |
| Deraining | Rain100L | 100 | 100 |
| Deblurring | GoPro | 1,111 | 1,111 |
| Low-light | LoL | 15 | 15 |

---

## 🔧 Setup

### 1. VLU-Net (Python backend)

```shell
cd VLU-Net
conda create -n vlunet
conda activate vlunet
pip install -r requirements.txt
```

Download pretrained weights and datasets as described in [`VLU-Net/README.md`](VLU-Net/README.md).

### 2. vlu-net-viewer (Web frontend)

```shell
cd vlu-net-viewer
npm install
npm start          # same as npm run dev; runs Vite + Express image server
```

The viewer lets you:
- Select restoration tasks (single lowlight / rain / haze / blur / noise, 3-task, 5-task)
- Use dataset/level selectors for single noise, 3-task NHR, and 5-task NHRBL results
- Shuffle images within each task
- Compare **degraded**, **VLU restored**, **BLIP-VLU restored**, and **GT** images with an image slider
- View per-image **PSNR/SSIM** metrics
- Hover-to-zoom and scroll-to-zoom on individual result tiles

---

## 🚀 Usage

### Original VLU-Net (train.py / test.py)

**Training:**
```shell
cd VLU-Net
python train.py --name Final5 --de_dim 7 --de_type ['denoise_15','denoise_25','denoise_50','derain','dehaze','delowlight','deblur']
```

**Testing:**
```shell
python test.py --name final_results --task NHR --de_dim 7 --pretrained_ckpt_path "./pretrained_ckpt/3task_vlunet.ckpt"
```

See [`VLU-Net/README.md`](VLU-Net/README.md) for all task variants.

### BLIP-VLU-Net (blip_vlunet_train.py / blip_vlu_test.py)

**Training:**
```shell
cd VLU-Net

# 5-task NHRBL (noise, haze, rain, blur, lowlight)
python blip_vlunet_train.py --name NHRBL --de_dim 7 --de_type ['denoise_15','denoise_25','denoise_50','derain','dehaze','deblur','delowlight']

# 3-task NHR (noise, haze, rain)
python blip_vlunet_train.py --name NHR --de_dim 7 --de_type ['denoise_15','denoise_25','denoise_50','derain','dehaze']

# Single-task: denoising
python blip_vlunet_train.py --name Denoise --de_dim 7 --de_type ['denoise_15','denoise_25','denoise_50']

# Single-task: dehazing
python blip_vlunet_train.py --name Dehaze --de_dim 7 --de_type ['dehaze']

# Single-task: deraining
python blip_vlunet_train.py --name Derain --de_dim 7 --de_type ['derain']

# Single-task: lowlight enhancement
python blip_vlunet_train.py --name Delowlight --de_dim 7 --de_type ['delowlight']

# Single-task: deblurring
python blip_vlunet_train.py --name Deblur --de_dim 7 --de_type ['deblur']
```

**Testing (with BLIP-tuned checkpoints):**
```shell
cd VLU-Net

# 5-task NHRBL
python blip_vlu_test.py --name blip_final_results --task blip_NHRBL --de_dim 7 --pretrained_ckpt_path "blip_vlunet_pretrained_ckpt/5task_blip_vlunet.ckpt"

# 3-task NHR
python blip_vlu_test.py --name blip_final_results --task blip_NHR --de_dim 7 --pretrained_ckpt_path "blip_vlunet_pretrained_ckpt/3task_blip_vlunet.ckpt"

# Single-task: denoising
python blip_vlu_test.py --name blip_final_results --task blip_N --de_dim 7 --pretrained_ckpt_path "blip_vlunet_pretrained_ckpt/single_noise_blip_vlunet.ckpt"

# Single-task: dehazing
python blip_vlu_test.py --name blip_final_results --task blip_H --de_dim 7 --pretrained_ckpt_path "blip_vlunet_pretrained_ckpt/single_haze_blip_vlunet.ckpt"

# Single-task: deraining
python blip_vlu_test.py --name blip_final_results --task blip_R --de_dim 7 --pretrained_ckpt_path "blip_vlunet_pretrained_ckpt/single_rain_blip_vlunet.ckpt"

# Single-task: deblurring
python blip_vlu_test.py --name blip_final_results --task blip_B --de_dim 7 --pretrained_ckpt_path "blip_vlunet_pretrained_ckpt/single_blur_blip_vlunet.ckpt"

# Single-task: lowlight enhancement
python blip_vlu_test.py --name blip_final_results --task blip_L --de_dim 7 --pretrained_ckpt_path "blip_vlunet_pretrained_ckpt/single_lowlight_blip_vlunet.ckpt"
```

---

## 📜 Citation

If you use this work, please cite the original VLU-Net paper:

```bibtex
@inproceedings{vlunet2025,
  title={Vision-Language Gradient Descent-driven All-in-One Deep Unfolding Networks},
  author={Zeng, Haijin and Wang, Xiangming and Chen, Yongyong and Su, Jingyong and Liu, Jie},
  booktitle={Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition},
  year={2025}
}
```

## 🤗 Acknowledgement

This work is based on [VLU-Net](https://github.com/xianggkl/VLU-Net), [Restormer](https://github.com/swz30/Restormer), [DGUNet](https://github.com/MC-E/Deep-Generalized-Unfolding-Networks-for-Image-Restoration), and [open_clip](https://github.com/mlfoundations/open_clip).
