# 🖥️ BLIP-VLU-Net Interactive Viewer

An interactive **React + Vite** web application designed to compare and evaluate VLU-Net and BLIP-VLU-Net image restoration outputs. It provides an intuitive interface for qualitative metric tracking, as well as a feature to **upload and restore custom images** via live model inference.

## ✨ Key Features

- 🔀 **Shuffle Mode**: Randomly sample images from datasets for an unbiased evaluation of the model.
- 🏆 **Top 10 Mode**: Automatically identify and highlight images where the model achieves the highest PSNR improvements.
- 📊 **Comparison Table**: Gain a comprehensive quantitative overview of PSNR and SSIM across all datasets.
- ☁️ **Upload & Restore**: Upload custom, real-world images and test them across **each model** (VLU-Net and BLIP-VLU-Net, including single-task, 3-task, and 5-task variants). Live backend PyTorch inference processes the images.
- 💾 **Save / Download**: Easily save and download the restored images directly to your local machine.

---

## 🛠️ Prerequisites & Setup Guide

Before starting the viewer, ensure your environment is fully configured and the necessary checkpoints and outputs are downloaded.

### 1. Required Downloads
The viewer relies on the pre-computed outputs for metric calculation and pretrained checkpoints for live inference. Ensure you have downloaded and extracted these into the `VLU-Net/` directory:

- **[BLIP-VLU-Net Pretrained Ckpt](https://drive.google.com/file/d/1ZP0-KT6TExKSi-AbRgoXInWWuBifoL3R/view?usp=drive_link)** — Extract to `VLU-Net/blip_vlunet_pretrained_ckpt/` (Required for BLIP-VLU-Net live inference)
- **[Output Images](https://drive.google.com/file/d/12e5UzSq4Q65lj2k1lqXB3eKCM3OUUfur/view?usp=drive_link)** — Extract to `VLU-Net/output/` (Required for the dataset viewer and metrics calculations)

### 2. Environment Dependencies
Ensure you have the following installed:
- **Node.js** (v16 or higher) & **npm** (v8+)
- **Anaconda** or **Miniconda** (Required for the backend PyTorch inference)

You must also have the `blipvlunet` Python environment properly set up as described in the root repository. The viewer's backend utilizes this environment to run the PyTorch models.

---

## 🚀 Getting Started (Development Mode)

Use development mode if you are making changes to the UI and want hot-reloading.

1. Open your **Anaconda Prompt** (Do not use standard `cmd` or PowerShell).
2. Activate the Python project environment:
   ```shell
   conda activate blipvlunet
   ```
3. Navigate to the viewer directory and install Node.js dependencies:
   ```shell
   cd blip-vlu-net-interactive-viewer
   npm install
   ```
4. Start both the Vite Frontend and the Node.js Backend concurrently:
   ```shell
   npm start
   ```
5. Open your browser and navigate to `http://localhost:5173/`.

---

## 📦 Building for Production

Use production mode if you want to access the web app from another device on your local network (e.g., a smartphone or tablet).

1. Open **Anaconda Prompt**, activate the environment, and navigate to the viewer:
   ```shell
   conda activate blipvlunet
   cd blip-vlu-net-interactive-viewer
   ```
2. Build the React frontend into static production files:
   ```shell
   npm run build
   ```
   *(This compiles your code in `src/` into a highly optimized `dist/` folder).*
3. Start the Node.js server:
   ```shell
   npm start
   ```
4. Check your terminal for the **Network** IP address (e.g., `http://192.168.0.x:3001/`). Enter this exact address into the browser of your other device.

---

## 📂 Supported Restoration Tasks

- **Single Tasks**: Lowlight enhancement, Deraining, Dehazing, Deblurring, and Denoising.
- **3-Task (NHR)**: Evaluated on `CBSD68`, `Urban100_HR`, `SOTS_outdoors`, and `Rain100L`.
- **5-Task (NHRBL)**: Evaluated on `CBSD68`, `Urban100_HR`, `SOTS_outdoors`, `Rain100L`, `GoPro`, and `LoL`.

> **Note on Dataset Evaluation:** When browsing the datasets, the viewer dynamically calculates PSNR/SSIM in the browser for both VLU and BLIP-VLU outputs. If BLIP outputs are missing from the `output/` folder, they will simply show `N/A` without interrupting the standard VLU metric calculations. *(This does not apply to the "Upload & Restore" feature, which does not compute reference metrics).*
