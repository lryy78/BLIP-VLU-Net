# 🌟 BLIP-VLU-Net

This repository extends the CVPR 2025 accepted work **[VLU-Net](https://github.com/xianggkl/VLU-Net)** with **BLIP-enhanced** training and testing pipelines. It also features an interactive **web viewer** for seamlessly comparing image restoration results.

> **Vision-Language Gradient Descent-driven All-in-One Deep Unfolding Networks**  
> *Haijin Zeng, Xiangming Wang, Yongyong Chen, Jingyong Su, Jie Liu* (CVPR 2025)  
> 📄 [Read the Paper](https://arxiv.org/pdf/2503.16930)

## 📖 Abstract

This project proposes a severity-aware All-in-One Image Restoration (AiOIR) framework capable of restoring images affected by multiple degradations, including haze, rain, and low-light, using a single model. To achieve this, we introduce BLIP-VLU-Net, a vision-language-guided Deep Unfolding Network. By leveraging BLIP-2 to extract textual descriptions of degradation type and severity, the framework adaptively guides a hybrid CNN-Transformer U-Net to perform restoration tailored to the detected degradation. This approach demonstrates how vision-language priors can enhance generalized image restoration across diverse and complex environmental conditions, while achieving competitive performance on public benchmark datasets.

---

## 🖼️ Framework & Pipelines

### Overall Framework
<img src="BLIP-VLU-Net_assets\figures\Framework.png" alt="Framework" width="800" />

---

## 📁 Repository Structure

```text
BLIP-VLU-Net/
├── BLIP-VLU-Net_assets/           # Figures, posters, and qualitative evaluation results
├── blip-vlu-net-prototype/        # Web prototype with pre-prepared images (no upload & restore feature)
├── VLU-Net/                       # Core VLU-Net codebase and BLIP-enhanced training/testing
│   ├── Phase0_*.ipynb             # Setup and baseline VLU-Net testing
│   ├── Phase1_*.ipynb             # Caption generation, degradation classification, and merging
│   ├── Phase2_*.ipynb             # BLIP-2 fine-tuning for degradation-aware descriptions
│   ├── Phase3_*.ipynb             # Tokenization of enhanced captions
│   ├── Phase4_*.ipynb             # BLIP-VLU-Net training experiments
│   ├── Phase5_*.ipynb             # BLIP-VLU-Net testing and evaluation
│   └── Phase6_*.ipynb             # Qualitative results visualization
└── blip-vlu-net-interactive-viewer/ # Interactive web viewer (requires blip_vlunet_pretrained_ckpt/ and output/)
```

> **⚠️ Note:** Datasets, model outputs, and pretrained checkpoints are **not included** in this repository due to their large size. Please refer to the [original VLU-Net README](VLU-Net/README.md) for download instructions for the original VLU-Net datasets.
>
> **📥 BLIP-VLU-Net Downloads:**
> - [BLIP VLU-Net Pretrained Ckpt](https://drive.google.com/file/d/1ZP0-KT6TExKSi-AbRgoXInWWuBifoL3R/view?usp=drive_link) (Download and place in `VLU-Net/blip_vlunet_pretrained_ckpt`)
> - [Ckpt](https://drive.google.com/file/d/1xc4iLskmU4bDsG0voKQFQqPCKm3ztgyU/view?usp=drive_link) (Download and place in `VLU-Net/ckpt`)
> - [Output Images](https://drive.google.com/file/d/12e5UzSq4Q65lj2k1lqXB3eKCM3OUUfur/view?usp=drive_link) (Download and place in `VLU-Net/output`)
> - [VLU-Net Pretrained Ckpt](https://drive.google.com/file/d/1214SfTO5LDMr3Ck_aVVUuZhuqhteMJ7P/view?usp=sharing) (Download and place in `VLU-Net/pretrained_ckpt`)

---

## 📊 Datasets Overview

| Degradation Type | Training Dataset | Train Images | Testing Dataset | Test Images |
| :--- | :--- | :--- | :--- | :--- |
| **Denoising** | BSD400, WED | 5,143 | CBSD68, Urban100 | 168 |
| **Dehazing** | OTS | 72,135 | SOTS | 500 |
| **Deraining** | RainTrainL | 600 | Rain100L | 100 |
| **Deblurring** | GoPro | 2,103 | GoPro | 1,111 |
| **Low-light** | LoL | 485 | LoL | 15 |

---

## 🔧 Environment & Setup Guide

### Prerequisites

| Requirement | Version | Purpose |
| :--- | :--- | :--- |
| **Python** | 3.9 | VLU-Net / BLIP-VLU-Net training & testing |
| **Anaconda / Miniconda** | Latest | Conda environment management |
| **CUDA** | 12.1+ | GPU-accelerated PyTorch training |
| **Node.js** | v16+ | VLU-Net Viewer web frontend |
| **npm** | v8+ | Node package manager |

### 1. Clone the Repository

```shell
git clone https://github.com/lryy78/BLIP-VLU-Net.git
cd BLIP-VLU-Net
```

### 2. VLU-Net / BLIP-VLU-Net (Python Backend)

```shell
# Create and activate a new conda environment
conda create -n blipvlunet python=3.9 -y
conda activate blipvlunet

# Install PyTorch with CUDA support (adjust for your CUDA version)
# See https://pytorch.org/get-started/locally/ for other configurations
pip install torch==2.4.1 torchvision==0.19.1 --index-url https://download.pytorch.org/whl/cu121

# Install all remaining dependencies from the root requirements.txt
pip install -r requirements.txt

# Register the conda environment as a Jupyter kernel (for running the Phase notebooks)
pip install ipykernel
python -m ipykernel install --user --name blipvlunet --display-name "Python (blipvlunet)"
```

> **Key Dependencies:**
> - `torch==2.4.1`, `torchvision==0.19.1` — PyTorch with CUDA 12.1
> - `salesforce-lavis==1.0.2` — BLIP-2 model (Salesforce LAVIS)
> - `transformers==4.37.2` — Hugging Face Transformers
> - `openai-clip==1.0.1` — OpenAI CLIP
> - `pytorch-lightning==2.4.0` — Training framework

### 3. BLIP-VLU-Net Prototype (Web Prototype)

```shell
cd blip-vlu-net-prototype
npm install
npm start        # Starts both Vite dev server and Express backend
```

> The prototype viewer uses pre-prepared images for quick demonstration and testing. It runs independently from the main viewer.

### 4. VLU-Net Viewer (Web Frontend)

```shell
cd blip-vlu-net-interactive-viewer
npm install
npm start        # Starts both Vite dev server and Express backend
```

> **Note:** The viewer requires Anaconda Prompt (not standard `cmd` or PowerShell) when using the Upload & Restore feature, as it invokes PyTorch inference on the backend.

*For more details on the viewer, check out the [Viewer README](blip-vlu-net-interactive-viewer/README.md).*

---

## 🚀 Usage Guide

### BLIP-VLU-Net Training & Testing

**Training:**
```shell
cd VLU-Net
# 5-task NHRBL (Noise, Haze, Rain, Blur, Lowlight)
python blip_vlunet_train.py --name NHRBL --de_dim 7 --de_type "['denoise_15','denoise_25','denoise_50','derain','dehaze','deblur','delowlight']"
```

**Testing:**
```shell
cd VLU-Net
# 5-task NHRBL
python blip_vlu_test.py --name blip_final_results --task blip_NHRBL --de_dim 7 --pretrained_ckpt_path "blip_vlunet_pretrained_ckpt/5task_blip_vlunet.ckpt"
```

> For single-task or 3-task commands, as well as original VLU-Net commands, refer to the full script parameters.

> **💡 Tip:** Training and testing can also be run and modified interactively through the **Phase 4** (training) and **Phase 5** (testing) Jupyter notebooks located in `VLU-Net/`.

---

## 🤗 Acknowledgements

This work builds upon [VLU-Net](https://github.com/xianggkl/VLU-Net).

## 📧 Contact

For any questions, issues, or suggestions, please feel free to reach out:
- **Email:** lamrongyi983@gmail.com
