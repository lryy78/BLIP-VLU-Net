# BLIP-VLU-Net

This repository extends [VLU-Net](https://github.com/xianggkl/VLU-Net) (CVPR 2025) with **BLIP-enhanced** training/testing pipelines and an interactive **web viewer** for comparing restoration results.

> **Vision-Language Gradient Descent-driven All-in-One Deep Unfolding Networks**
> Original work: Zeng, Wang, Chen, Su, Liu — CVPR 2025. Paper: <https://arxiv.org/pdf/2503.16930>

---

## 📁 Repository Structure

```
BLIP-VLU-Net/
├── VLU-Net/                 # Core VLU-Net codebase (forked from xianggkl/VLU-Net)
│   ├── net/                 # Network definitions (Final.py, clip.py)
│   ├── open_clip/           # Open CLIP model implementation
│   ├── utils/               # Datasets, losses, schedulers, validation utilities
│   ├── figures/             # Paper figures
│   ├── train.py             # Training entry point
│   ├── test.py              # Testing entry point
│   ├── requirements.txt     # Python dependencies
│   ├── README.md            # Original VLU-Net README
│   └── Phase*.ipynb         # BLIP-enhanced experiment notebooks
│       ├── Phase0_*.ipynb       # Setup, dataset config, original VLU-Net test
│       ├── Phase1_*.ipynb       # Caption & degradation extraction
│       ├── Phase2_*.ipynb       # Fine-tuning
│       ├── Phase3_*.ipynb       # CLIP degradation extractor
│       ├── Phase4_*.ipynb       # BLIP-VLU-Net training (deblur / lowlight)
│       └── Phase5_*.ipynb       # BLIP-VLU-Net testing
│
├── vlu-net-viewer/          # Interactive React + Vite web viewer
│   ├── src/                 # React components (ImageSlider, ZoomableImage)
│   ├── server.js            # Express backend serving images & computing PSNR/SSIM
│   ├── public/              # Static assets
│   └── package.json
│
└── paths.txt                # Dataset/output path reference notes
```

> **Note:** Datasets (`VLU-Net/datasets/`), model outputs (`VLU-Net/output/`), and pretrained checkpoints (`VLU-Net/pretrained_ckpt/`) are **not included** in this repository due to size. See the [original VLU-Net README](VLU-Net/README.md) for download links.

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

### Training

```shell
cd VLU-Net
python train.py --name Final5 --de_dim 7 --de_type ['denoise_15','denoise_25','denoise_50','derain','dehaze','delowlight','deblur']
```

### Testing

```shell
python test.py --name final_results --task NHR --de_dim 7 --pretrained_ckpt_path "./pretrained_ckpt/3task_vlunet.ckpt"
```

See [`VLU-Net/README.md`](VLU-Net/README.md) for all task variants.

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
