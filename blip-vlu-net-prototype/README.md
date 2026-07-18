# 🔬 BLIP-VLU-Net Prototype

This directory contains the initial prototypes and pre-prepared images used during the development of the **BLIP-VLU-Net** architecture.

## 📂 Contents

- **Pre-prepared Images**: Sample images used for early testing and validation of the BLIP-enhanced training pipeline.
- **Experimental Assets**: Various prototype scripts and configurations that were tested before integrating into the core `VLU-Net/` directory.

## 🚀 How to Run (Development Mode)

If you want to run the prototype locally with live reloading:

1. Open your terminal and navigate to the prototype directory:
   ```shell
   cd blip-vlu-net-prototype
   ```
2. Install the Node.js dependencies:
   ```shell
   npm install
   ```
3. Start the Vite development server and Express backend concurrently:
   ```shell
   npm start
   ```
   *(Note: `npm start` is a shortcut for `npm run dev`)*
4. Open your browser and navigate to `http://localhost:5173/`.

## 📦 How to Build (Production Mode)

If you want to compile the prototype for production:

1. Navigate to the directory:
   ```shell
   cd blip-vlu-net-prototype
   ```
2. Build the React frontend into static files:
   ```shell
   npm run build
   ```
3. Start the production server:
   ```shell
   npm run serve
   ```
   *(This command runs the build and then starts `server.js`)*

---

> **Note:** For the full interactive web viewer with model inference capabilities, please refer to the [`blip-vlu-net-interactive-viewer/`](../blip-vlu-net-interactive-viewer/) directory. For the main model implementation, please refer to the [`VLU-Net/`](../VLU-Net/) directory.
