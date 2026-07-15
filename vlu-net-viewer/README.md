# BLIP-VLU-Net Interactive Viewer

An interactive React + Vite web application for comparing and evaluating VLU-Net and BLIP-VLU-Net restoration outputs, complete with live model inference.

## ✨ Features
- **Shuffle Mode**: Randomly sample images from datasets for unbiased evaluation.
- **Top 10 Mode**: Automatically identify and showcase images where the model achieves the highest PSNR improvements.
- **Comparison Table**: Quantitative overview of PSNR and SSIM across datasets.
- **Upload & Restore**: Test the model on custom, real-world images with live backend PyTorch inference.
- **Save / Download**: Download restored images directly to your machine.

---

## 🛠️ Prerequisites
- **Node.js** (v16 or higher)
- **Anaconda** or **Miniconda** (Required for the backend PyTorch inference to run)

---

## 🚀 How to Run (Development Mode)

If you are running the project to make changes or test it locally, you should use the development mode. This gives you live hot-reloading for the UI.

1. Open your **Anaconda Prompt** (Do not use standard `cmd` or PowerShell).
2. Activate your project environment:
   ```shell
   conda activate base
   ```
   *(Replace `base` with your environment name if you created a specific one).*
3. Navigate to the viewer directory and install dependencies:
   ```shell
   cd vlu-net-viewer
   npm install
   ```
4. Start both the Vite Frontend and the Node.js Backend concurrently:
   ```shell
   npm start
   ```
   *(Note: `npm start` is a shortcut for `npm run dev`)*
5. Open your browser to `http://localhost:5173/`

---

## 📦 How to Build (Production Mode)

If you want to access the website from another device on your network (like a phone or laptop), you should build the production bundle so the Node.js backend can serve the latest UI on port `3001`.

1. Open your terminal and navigate to the viewer directory:
   ```shell
   cd vlu-net-viewer
   ```
2. Build the React frontend into static production files:
   ```shell
   npm run build
   ```
   *(This takes all your code in `src/` and compiles it into a highly optimized `dist/` folder).*
3. Start the server (just like development mode):
   ```shell
   npm start
   ```
4. Look at your terminal for the **Network** IP (e.g., `http://192.168.0.x:3001/`). Type that exact address into your phone or other device's browser to use the app!

---

## 📂 Supported Tasks
- Single lowlight, rain, haze, blur, and noise
- 3-task NHR with `CBSD68`, `Urban100_HR`, `SOTS_outdoors`, and `Rain100L`
- 5-task NHRBL with `CBSD68`, `Urban100_HR`, `SOTS_outdoors`, `Rain100L`, `GoPro`, and `LoL`

*Note: The viewer calculates PSNR/SSIM in the browser for VLU and BLIP-VLU images that exist. Missing BLIP outputs show `N/A` and do not block VLU metric calculation.*
