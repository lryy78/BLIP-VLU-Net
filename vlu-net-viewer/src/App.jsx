import React, { useState, useEffect, useRef } from 'react';
import { ssim } from 'ssim.js';
import './App.css';

const API_BASE = 'http://localhost:3001/api';

const TASKS = [
  'Single lowlight',
  'Single rain',
  'Single haze',
  'Single blur',
  'Single noise',
  '3tasks',
  '5tasks'
];

function App() {
  const [selectedTask, setSelectedTask] = useState(TASKS[0]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dataset, setDataset] = useState('');
  const [noiseLevel, setNoiseLevel] = useState('');

  const [imageList, setImageList] = useState([]);
  const [currentImage, setCurrentImage] = useState(null);
  const [paths, setPaths] = useState(null);

  const [metrics, setMetrics] = useState({ vlu: { psnr: 'N/A', ssim: 'N/A' }, blip: { psnr: 'N/A', ssim: 'N/A' } });
  const [loading, setLoading] = useState(false);
  const [imageStatus, setImageStatus] = useState('Loading images...');

  // Slider State
  const [sliderLeft, setSliderLeft] = useState('degraded');
  const [sliderRight, setSliderRight] = useState('vlu');
  const [sliderPos, setSliderPos] = useState(50);

  const [zoomStyle, setZoomStyle] = useState({ transform: 'scale(1)', transformOrigin: 'center center' });
  const [zoomScale, setZoomScale] = useState(1);
  const [isHovering, setIsHovering] = useState(false);
  const zoomScaleRef = useRef(1);
  const imgWrapperRefs = useRef([]);

  // Slider Zoom State
  const [sliderZoomEnabled, setSliderZoomEnabled] = useState(false);
  const [sliderZoomLocked, setSliderZoomLocked] = useState(false);
  const [sliderZoomStyle, setSliderZoomStyle] = useState({ transform: 'scale(1)', transformOrigin: 'center center' });
  const sliderZoomScaleRef = useRef(1);
  const sliderRef = useRef(null);

  useEffect(() => {
    // Reset dataset/level when task changes
    if (selectedTask === 'Single noise') {
      setDataset('CBSD68');
      setNoiseLevel('noisy15');
    } else if (selectedTask === '3tasks' || selectedTask === '5tasks') {
      setDataset('CBSD68');
      setNoiseLevel('noisy15');
    } else {
      setDataset('');
      setNoiseLevel('');
    }
  }, [selectedTask]);

  useEffect(() => {
    // For noise-type tasks, wait until dataset and noiseLevel are set
    if (selectedTask === 'Single noise' || selectedTask === '3tasks' || selectedTask === '5tasks') {
      if (!dataset || !noiseLevel) return;
      const fixedLevels = {
        SOTS_outdoors: 'hazy',
        Rain100L: 'rainy',
        GoPro: 'blur',
        LoL: 'lowlight'
      };
      if (fixedLevels[dataset] && noiseLevel !== fixedLevels[dataset]) {
        setNoiseLevel(fixedLevels[dataset]);
        return;
      }
    }

    fetchImages();
  }, [selectedTask, dataset, noiseLevel]);

  const fetchImages = async () => {
    setImageStatus('Loading images...');
    try {
      const url = new URL(`${API_BASE}/tasks`);
      url.search = new URLSearchParams({ task: selectedTask, dataset, level: noiseLevel });
      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `Request failed with ${res.status}`);
      }
      const data = await res.json();
      
      const files = data.files || [];
      setImageList(files);
      setPaths(data.paths || null);
      
      if (files.length > 0) {
        pickRandomImage(files, data.paths);
      } else {
        setCurrentImage(null);
        setImageStatus('No images found in the selected directory.');
      }
    } catch (err) {
      console.error('Error fetching images:', err);
      setImageList([]);
      setCurrentImage(null);
      setPaths(null);
      setImageStatus(`Could not load images: ${err.message}. Make sure the backend server is running.`);
    }
  };

  const pickRandomImage = (files = imageList, currentPaths = paths) => {
    if (files.length === 0) return;
    const randIdx = Math.floor(Math.random() * files.length);
    const selected = files[randIdx];
    setCurrentImage(selected);

    // Fetch metrics
    fetchMetrics(selected, currentPaths);
  };

  const loadImage = (url) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image: ${url}`));
    img.src = url;
  });

  const getImageData = (img) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  };

  const calculatePSNR = (data1, data2) => {
    let mse = 0;
    const len = data1.data.length;
    for (let i = 0; i < len; i += 4) {
      mse += Math.pow(data1.data[i] - data2.data[i], 2);
      mse += Math.pow(data1.data[i + 1] - data2.data[i + 1], 2);
      mse += Math.pow(data1.data[i + 2] - data2.data[i + 2], 2);
    }
    mse /= (len / 4) * 3;
    if (mse === 0) return 100;
    return (10 * Math.log10((255 * 255) / mse)).toFixed(2);
  };

  // Build aligned image URL for a given image type.
  // Uses /api/aligned-image which applies symmetric base-16 cropping (exact match to Python's crop_img).
  // Model outputs (vlu, blip) are already base-16 aligned, so the crop is a no-op on them.
  // GT and degraded are cropped to match the model's spatial dimensions.
  // Accepts optional overridePaths/overrideFilename to avoid React stale closure issues.
  const getAlignedImageUrl = (type, overridePaths = null, overrideFilename = null) => {
    const p = overridePaths || paths;
    const f = overrideFilename || currentImage;
    if (!p || !f) return '';
    switch (type) {
      case 'degraded': return `${API_BASE}/aligned-image?path=${encodeURIComponent(p.degraded + '\\' + f)}`;
      case 'vlu': return `${API_BASE}/aligned-image?path=${encodeURIComponent(p.vlu + '\\' + f)}`;
      case 'blip': return p.blip_vlu ? `${API_BASE}/aligned-image?path=${encodeURIComponent(p.blip_vlu + '\\' + f)}` : '';
      case 'gt': return `${API_BASE}/aligned-image?path=${encodeURIComponent(p.gt + '\\' + getGTFilename(selectedTask, f))}`;
      default: return '';
    }
  };
  const fetchMetrics = async (filename, currentPaths) => {
    setLoading(true);
    setMetrics({ vlu: null, blip: null });
    try {
      // Use the passed filename and paths directly to avoid React stale closure issues
      const imgFilename = filename;
      const imgPaths = currentPaths;
      if (!imgFilename || !imgPaths) {
        throw new Error('No filename or paths available');
      }

      // Load all images through the aligned endpoint so everything is base-16 cropped to matching dimensions
      const gtUrl = getAlignedImageUrl('gt', imgPaths, imgFilename);
      const gtImg = await loadImage(gtUrl);

      const tryLoadImage = async (url) => {
        if (!url) return null;
        try {
          return await loadImage(url);
        } catch (error) {
          console.warn(error.message);
          return null;
        }
      };

      const degImg = await tryLoadImage(getAlignedImageUrl('degraded', imgPaths, imgFilename));
      const vluImg = await tryLoadImage(getAlignedImageUrl('vlu', imgPaths, imgFilename));
      const blipImg = await tryLoadImage(getAlignedImageUrl('blip', imgPaths, imgFilename));
      // After base-16 cropping, all images should have identical dimensions.
      // We verify: if dimensions differ, fall back to min-dimension crop as safety measure.
      const images = [gtImg];
      if (vluImg) images.push(vluImg);
      if (blipImg) images.push(blipImg);

      const minW = Math.min(...images.map(img => img.width));
      const minH = Math.min(...images.map(img => img.height));

      // Ensure all images are exactly the same size for pixel-accurate PSNR/SSIM
      const ensureSize = (img, targetW, targetH) => {
        if (img.width === targetW && img.height === targetH) return img;
        // Fallback: center-crop if base-16 alignment didn't produce identical sizes
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, (targetW - img.width) / 2, (targetH - img.height) / 2);
        // Return as Image via data URL
        const result = new Image();
        result.src = canvas.toDataURL('image/jpeg', 0.95);
        return new Promise(resolve => { result.onload = () => resolve(result); });
      };

      const [gtFinal, vluFinal, blipFinal] = await Promise.all([
        gtImg,
        vluImg ? ensureSize(vluImg, minW, minH) : null,
        blipImg ? ensureSize(blipImg, minW, minH) : null
      ]);

      // PSNR/SSIM calculation
      const gtData = getImageData(gtFinal);
      const unavailableMetrics = { psnr: 'N/A', ssim: 'N/A' };

      let vluMetrics = unavailableMetrics;
      if (vluFinal) {
        const vluData = getImageData(vluFinal);
        const psnr = calculatePSNR(vluData, gtData);
        const ssimRes = ssim(vluData, gtData);
        vluMetrics = { psnr, ssim: ssimRes.mssim.toFixed(4) };
      }

      let blipMetrics = unavailableMetrics;
      if (blipFinal) {
        const blipData = getImageData(blipFinal);
        const psnr = calculatePSNR(blipData, gtData);
        const ssimRes = ssim(blipData, gtData);
        blipMetrics = { psnr, ssim: ssimRes.mssim.toFixed(4) };
      }

      setMetrics({ vlu: vluMetrics, blip: blipMetrics });
    } catch (e) {
      console.error('Error calculating metrics:', e);
      setMetrics({ vlu: { psnr: 'Err: ' + e.message, ssim: 'Err' }, blip: { psnr: 'Err: ' + e.message, ssim: 'Err' } });
    }
    setLoading(false);
  };

  const getImageUrl = (dir, filename) => {
    if (!dir) return '';
    return `${API_BASE}/image?path=${encodeURIComponent(dir + '\\' + filename)}`;
  };

  const getGTFilename = (task, filename) => {
    if (task === 'Single haze' || ((task === '3tasks' || task === '5tasks') && dataset === 'SOTS_outdoors')) {
      // 0001_0.8_0.2.jpg -> 0001.png
      return filename.split('_')[0] + '.png';
    } else if (task === 'Single rain' || ((task === '3tasks' || task === '5tasks') && dataset === 'Rain100L')) {
      // rain-001.png -> norain-001.png
      return filename.replace('rain-', 'norain-');
    }
    return filename; // Default to same filename
  };

  const handleSliderChange = (e) => {
    setSliderPos(e.target.value);
  };

  // Zoom Handling
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomStyle(prev => ({
      ...prev,
      transformOrigin: `${x}% ${y}%`
    }));
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
    setZoomStyle(prev => ({ ...prev, transform: `scale(${Math.max(2, zoomScaleRef.current)})` }));
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setZoomScaleRef(1);
    setZoomStyle({ transform: 'scale(1)', transformOrigin: 'center center' });
  };

  const setZoomScaleRef = (val) => {
    zoomScaleRef.current = val;
    setZoomScale(val);
  };

  const handleSliderMouseMove = (e) => {
    if (!sliderZoomEnabled || sliderZoomLocked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setSliderZoomStyle(prev => ({
      ...prev,
      transformOrigin: `${x}% ${y}%`
    }));
  };

  const handleSliderMouseLeave = () => {
    if (!sliderZoomEnabled || sliderZoomLocked) return;
    sliderZoomScaleRef.current = 1;
    setSliderZoomStyle({ transform: 'scale(1)', transformOrigin: 'center center' });
  };

  const handleSliderClick = (e) => {
    if (!sliderZoomEnabled || sliderZoomLocked) return;
    // When unlocked, clicking the image locks the view
    setSliderZoomLocked(true);
  };

  // Attach native wheel listeners with { passive: false } so preventDefault works
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 0.5 : -0.5;
      const newScale = Math.min(Math.max(zoomScaleRef.current + delta, 1), 8);
      zoomScaleRef.current = newScale;
      setZoomScale(newScale);
      setZoomStyle(prev => ({ ...prev, transform: `scale(${newScale})` }));
    };

    const sliderHandler = (e) => {
      if (!sliderZoomEnabled) return;
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 0.5 : -0.5;
      const newScale = Math.min(Math.max(sliderZoomScaleRef.current + delta, 1), 8);
      sliderZoomScaleRef.current = newScale;
      setSliderZoomStyle(prev => ({ ...prev, transform: `scale(${newScale})` }));
    };

    const refs = imgWrapperRefs.current;
    refs.forEach(el => {
      if (el) el.addEventListener('wheel', handler, { passive: false });
    });

    if (sliderRef.current) {
      sliderRef.current.addEventListener('wheel', sliderHandler, { passive: false });
    }

    return () => {
      refs.forEach(el => {
        if (el) el.removeEventListener('wheel', handler);
      });
      if (sliderRef.current) {
        sliderRef.current.removeEventListener('wheel', sliderHandler);
      }
    };
  });

  return (
    <div className="app-container">
      {/* Sidebar Toggle */}
      <button className={`sidebar-toggle ${sidebarOpen ? '' : 'sidebar-toggle-collapsed'}`} onClick={() => setSidebarOpen(p => !p)} title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}>
        {sidebarOpen ? '◀' : '▶'}
      </button>
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
        <h1 className="logo">VLU-Net Viewer</h1>
        <div className="task-list">
          {TASKS.map(t => (
            <button
              key={t}
              className={`task-btn ${selectedTask === t ? 'active' : ''}`}
              onClick={() => setSelectedTask(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {(selectedTask === 'Single noise' || selectedTask === '3tasks' || selectedTask === '5tasks') && (
          <div className="sub-options">
            <label>Dataset:</label>
            <select value={dataset} onChange={e => setDataset(e.target.value)}>
              <option value="CBSD68">CBSD68</option>
              <option value="Urban100_HR">Urban100_HR</option>
              {(selectedTask === '3tasks' || selectedTask === '5tasks') && (
                <>
                  <option value="SOTS_outdoors">SOTS_outdoors</option>
                  <option value="Rain100L">Rain100L</option>
                </>
              )}
              {selectedTask === '5tasks' && (
                <>
                  <option value="GoPro">GoPro</option>
                  <option value="LoL">LoL</option>
                </>
              )}
            </select>

            {(dataset === 'CBSD68' || dataset === 'Urban100_HR') && (
              <>
                <label>Noise Level:</label>
                <select value={noiseLevel} onChange={e => setNoiseLevel(e.target.value)}>
                  <option value="noisy15">noisy15</option>
                  <option value="noisy25">noisy25</option>
                  <option value="noisy50">noisy50</option>
                  <option value="noisy_rand">noisy_rand</option>
                </select>
              </>
            )}
          </div>
        )}

        <button className="shuffle-btn" onClick={() => pickRandomImage()} disabled={imageList.length === 0}>
          <span>&#x1F500;</span> Shuffle Image
        </button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {!currentImage ? (
          <div className="empty-state">{imageStatus}</div>
        ) : (
          <div className="viewer">
            <h2 className="image-title">Filename: {currentImage}</h2>

            {/* --- Image Slider Section --- */}
            <div className="slider-section">
              <div className="slider-controls">
                <div className="slider-select">
                  <label>Left Image:</label>
                  <select value={sliderLeft} onChange={e => setSliderLeft(e.target.value)}>
                    <option value="degraded">Degraded</option>
                    <option value="vlu">VLU Restore</option>
                    {paths.blip_vlu && <option value="blip">BLIP VLU Restore</option>}
                    <option value="gt">Ground Truth</option>
                  </select>
                </div>
                <div className="slider-select">
                  <label>Right Image:</label>
                  <select value={sliderRight} onChange={e => setSliderRight(e.target.value)}>
                    <option value="degraded">Degraded</option>
                    <option value="vlu">VLU Restore</option>
                    {paths.blip_vlu && <option value="blip">BLIP VLU Restore</option>}
                    <option value="gt">Ground Truth</option>
                  </select>
                </div>
                <button 
                  className={`zoom-toggle-btn ${sliderZoomEnabled ? 'active' : ''}`}
                  onClick={() => {
                    const willBeEnabled = !sliderZoomEnabled;
                    setSliderZoomEnabled(willBeEnabled);
                    sliderZoomScaleRef.current = 1;
                    setSliderZoomStyle({ transform: 'scale(1)', transformOrigin: 'center center' });
                    setSliderZoomLocked(false);
                  }}
                >
                  {sliderZoomEnabled ? '🔍 Disable Zoom' : '🔍 Enable Zoom'}
                </button>
                {sliderZoomEnabled && (
                  <button
                    className={`zoom-toggle-btn ${sliderZoomLocked ? 'active' : ''}`}
                    onClick={() => setSliderZoomLocked(!sliderZoomLocked)}
                  >
                    {sliderZoomLocked ? '🔒 View Locked (Click to Unlock)' : '🔓 View Unlocked (Click Image to Lock)'}
                  </button>
                )}
              </div>

              <div 
                className={`comparison-slider ${sliderZoomEnabled ? 'zooming' : ''}`}
                ref={sliderRef}
                onMouseMove={handleSliderMouseMove}
                onMouseLeave={handleSliderMouseLeave}
                onClick={handleSliderClick}
              >
                <div className="slider-img-wrapper">
                  {/* Slider uses aligned images for perfect pixel-aligned comparison */}
                  <img src={getAlignedImageUrl(sliderRight)} alt="Right Image" className="slider-img" style={sliderZoomEnabled ? sliderZoomStyle : {}} draggable="false" />
                </div>
                <div className="slider-img-wrapper" style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}>
                  <img src={getAlignedImageUrl(sliderLeft)} alt="Left Image" className="slider-img" style={sliderZoomEnabled ? sliderZoomStyle : {}} draggable="false" />
                </div>
                <input
                  type="range"
                  min="0" max="100"
                  value={sliderPos}
                  onChange={handleSliderChange}
                  className="slider-input"
                  style={{ pointerEvents: (sliderZoomEnabled && !sliderZoomLocked) ? 'none' : 'auto' }}
                />
                <div className="slider-line" style={{ left: `${sliderPos}%` }}>
                  <div className="slider-button"></div>
                </div>
              </div>
            </div>
            <hr className="divider" />
            {/* --------------------------- */}

            <div className="images-grid">

              <div className="image-card">
                <h3>Degraded</h3>
                <div className="img-wrapper" ref={el => imgWrapperRefs.current[0] = el} onMouseMove={handleMouseMove} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                  {/* All grid images use aligned-image for consistent dimensions */}
                  <img src={getAlignedImageUrl('degraded')} style={zoomStyle} alt="Degraded" draggable="false" />
                </div>
              </div>

              <div className="image-card">
                <h3>VLU Restore</h3>
                <div className="img-wrapper" ref={el => imgWrapperRefs.current[1] = el} onMouseMove={handleMouseMove} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                  <img src={getAlignedImageUrl('vlu')} style={zoomStyle} alt="VLU" draggable="false" />
                </div>
                <div className="metrics">
                  {loading ? 'Calculating...' : metrics.vlu ? `PSNR: ${metrics.vlu.psnr} | SSIM: ${metrics.vlu.ssim}` : 'N/A'}
                </div>
              </div>

              {paths.blip_vlu && (
                <div className="image-card">
                  <h3>BLIP VLU Restore</h3>
                  <div className="img-wrapper" ref={el => imgWrapperRefs.current[2] = el} onMouseMove={handleMouseMove} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                    <img src={getAlignedImageUrl('blip')} style={zoomStyle} alt="BLIP VLU" draggable="false" />
                  </div>
                  <div className="metrics">
                    {loading ? 'Calculating...' : metrics.blip ? `PSNR: ${metrics.blip.psnr} | SSIM: ${metrics.blip.ssim}` : 'N/A'}
                  </div>
                </div>
              )}

              <div className="image-card">
                <h3>Ground Truth</h3>
                <div className="img-wrapper" ref={el => imgWrapperRefs.current[3] = el} onMouseMove={handleMouseMove} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                  <img src={getAlignedImageUrl('gt')} style={zoomStyle} alt="GT" draggable="false" />
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;