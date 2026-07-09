# VLU-Net Viewer

Interactive React + Vite viewer for comparing VLU-Net and BLIP-VLU-Net restoration outputs.

## Run

```shell
npm install
npm start
```

`npm start` and `npm run dev` both start the Vite frontend and Express image backend together.

## Supported Tasks

- Single lowlight, rain, haze, blur, and noise
- 3-task NHR with `CBSD68`, `Urban100_HR`, `SOTS_outdoors`, and `Rain100L`
- 5-task NHRBL with `CBSD68`, `Urban100_HR`, `SOTS_outdoors`, `Rain100L`, `GoPro`, and `LoL`

The viewer calculates PSNR/SSIM in the browser for VLU and BLIP-VLU images that exist. Missing BLIP outputs show `N/A` and do not block VLU metric calculation.
