import React, { useState, useEffect, useRef } from 'react';
import { ssim } from 'ssim.js';
import './App.css';
import ComparisonTable from './components/ComparisonTable';

const API_BASE = '/api';

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
  const [top10Images, setTop10Images] = useState([]);
  const [viewMode, setViewMode] = useState('shuffle'); // 'shuffle' or 'top10'
  const [top10MetricsCache, setTop10MetricsCache] = useState({}); // Cache PSNR from server

  const [metrics, setMetrics] = useState({ vlu: { psnr: 'N/A', ssim: 'N/A' }, blip: { psnr: 'N/A', ssim: 'N/A' } });
  const [loading, setLoading] = useState(false);
  const [imageStatus, setImageStatus] = useState('Loading images...');
  const [top10Loading, setTop10Loading] = useState(false);
  const [top10Error, setTop10Error] = useState(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Slider State
  const [sliderLeft, setSliderLeft] = useState('degraded');
  const [sliderRight, setSliderRight] = useState('vlu');
  const [sliderPos, setSliderPos] = useState(50);

  const [zoomStyle, setZoomStyle] = useState({ transform: 'scale(1)', transformOrigin: 'center center' });
  const [zoomScale, setZoomScale] = useState(1);
  const [isHovering, setIsHovering] = useState(false);
  const zoomScaleRef = useRef(1);
  const imgWrapperRefs = useRef([]);

  // Upload and Restore State
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [restoredImage, setRestoredImage] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState(null);
  const [selectedDegradation, setSelectedDegradation] = useState('denoise_15');
  const fileInputRef = useRef(null);

  // Get available degradation types - always show all options for upload feature
  const getAvailableDegradations = () => {
    return [
      { value: 'denoise_15', label: 'Denoise' },
      { value: 'derain', label: 'Rain Removal' },
      { value: 'dehaze', label: 'Haze Removal' },
      { value: 'deblur', label: 'Deblur' },
      { value: 'delowlight', label: 'Lowlight Enhancement' },
      { value: '3task', label: '3Task Model (NHR)' },
      { value: '5task', label: '5Task Model (NHRBL)' }
    ];
  };

  const availableDegradations = getAvailableDegradations();

  // Upload viewer zoom state
  const [uploadZoomStyle, setUploadZoomStyle] = useState({ transform: 'scale(1)', transformOrigin: 'center center' });
  const uploadZoomScaleRef = useRef(1);
  const [uploadZoomEnabled, setUploadZoomEnabled] = useState(false);
  const uploadImgRefs = useRef([]);
  
  // Upload zoom wheel handler
  const handleUploadWheel = (e) => {
    if (!uploadZoomEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.5 : -0.5;
    const newScale = Math.min(Math.max(uploadZoomScaleRef.current + delta, 1), 8);
    uploadZoomScaleRef.current = newScale;
    setUploadZoomStyle(prev => ({ ...prev, transform: `scale(${newScale})` }));
  };

  // Slider Zoom State
  const [sliderZoomEnabled, setSliderZoomEnabled] = useState(false);
  const [sliderZoomLocked, setSliderZoomLocked] = useState(false);
  const [sliderZoomStyle, setSliderZoomStyle] = useState({ transform: 'scale(1)', transformOrigin: 'center center' });
  const sliderZoomScaleRef = useRef(1);
  const sliderRef = useRef(null);

  // Comparison table modal state
  const [showComparison, setShowComparison] = useState(false);

  // Upload and Restore Functions
  const handleFileSelect = (e) => {
    console.log('File selected:', e.target.files);
    const file = e.target.files[0];
    if (file) {
      console.log('Processing file:', file.name, file.size, file.type);
      const reader = new FileReader();
      reader.onload = (event) => {
        console.log('File loaded successfully');
        setUploadedImage(event.target.result);
        setRestoredImage(null);
        setRestoreError(null);
      };
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        setRestoreError('Failed to read file');
      };
      reader.readAsDataURL(file);
    } else {
      console.log('No file selected');
    }
  };

  // Map degradation type to the corresponding task name for the backend
  const getTaskForDegradation = (degType) => {
    const degToTask = {
      'denoise_15': 'Single noise',
      'denoise_25': 'Single noise',
      'denoise_50': 'Single noise',
      'derain': 'Single rain',
      'dehaze': 'Single haze',
      'deblur': 'Single blur',
      'delowlight': 'Single lowlight',
      '3task': '3tasks',
      '5task': '5tasks'
    };
    return degToTask[degType] || 'Single lowlight';
  };

  const handleRestore = async () => {
    if (!uploadedImage) return;

    setIsRestoring(true);
    setRestoreError(null);
    setRestoredImage(null);

    try {
      // Convert data URL to blob
      const response = await fetch(uploadedImage);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('image', blob, 'uploaded_image.png');
      formData.append('degradationType', selectedDegradation);
      // Derive task from degradation type, not from sidebar selection
      formData.append('task', getTaskForDegradation(selectedDegradation));

      const res = await fetch(`${API_BASE}/restore`, {
        method: 'POST',
        body: formData
      });

      // Check content type before parsing JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.details || data.error || 'Restoration failed');
      }

      if (data.success) {
        setRestoredImage(data.restoredImage);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Restoration error:', err);
      setRestoreError(err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleResetUpload = () => {
    setUploadedImage(null);
    setRestoredImage(null);
    setRestoreError(null);
    setShowUploadSection(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
    // Close upload section when switching tasks
    setShowUploadSection(false);
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

    // Only fetch regular images in shuffle mode
    if (viewMode === 'shuffle') {
      fetchImages();
    } else if (viewMode === 'top10') {
      fetchTop10Images();
    }
  }, [selectedTask, dataset, noiseLevel, viewMode]);

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

  const fetchTop10Images = async () => {
    setTop10Loading(true);
    setImageStatus('Loading top 10 images...');
    setCurrentImage(null);
    setTop10MetricsCache({});
    try {
      const url = new URL(`${API_BASE}/top10`);
      url.search = new URLSearchParams({ task: selectedTask, dataset, level: noiseLevel });
      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `Request failed with ${res.status}`);
      }
      const data = await res.json();

      const files = data.files || [];
      setTop10Images(files);
      setPaths(data.paths || null);

      // Build cache of server-calculated PSNR values
      const cache = {};
      for (const item of files) {
        cache[item.filename] = {
          vlu_psnr: item.vlu_psnr,
          blip_psnr: item.blip_psnr
        };
      }
      setTop10MetricsCache(cache);

      if (files.length > 0) {
        // Select the first image (biggest difference)
        const firstImage = files[0].filename;
        setCurrentImage(firstImage);
        // Calculate SSIM for the first image using cached PSNR values
        calculateSSIMOnly(firstImage, data.paths, {
          vlu_psnr: files[0].vlu_psnr,
          blip_psnr: files[0].blip_psnr
        });
        setImageStatus(`Loaded ${files.length} images with biggest PSNR differences.`);
      } else {
        setCurrentImage(null);
        setImageStatus('No top 10 images found.');
      }
    } catch (err) {
      console.error('Error fetching top 10 images:', err);
      setTop10Images([]);
      setCurrentImage(null);
      setPaths(null);
      setImageStatus(`Could not load top 10 images: ${err.message}. Make sure the backend server is running.`);
    } finally {
      setTop10Loading(false);
    }
  };

  const selectTop10Image = (imageData) => {
    setCurrentImage(imageData.filename);
    // Use cached server-calculated PSNR values, but calculate SSIM on frontend
    const cached = top10MetricsCache[imageData.filename];
    if (cached) {
      // Calculate SSIM on frontend while using server PSNR values
      calculateSSIMOnly(imageData.filename, paths, cached);
    } else {
      fetchMetrics(imageData.filename, paths);
    }
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
      case 'degraded': return `${API_BASE}/aligned-image?path=${encodeURIComponent(p.degraded + '/' + f)}`;
      case 'vlu': return `${API_BASE}/aligned-image?path=${encodeURIComponent(p.vlu + '/' + f)}`;
      case 'blip': return p.blip_vlu ? `${API_BASE}/aligned-image?path=${encodeURIComponent(p.blip_vlu + '/' + f)}` : '';
      case 'gt': return `${API_BASE}/aligned-image?path=${encodeURIComponent(p.gt + '/' + getGTFilename(selectedTask, f))}`;
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

  // Calculate only SSIM (PSNR comes from server cache)
  const calculateSSIMOnly = async (filename, currentPaths, cachedPsnr) => {
    setLoading(true);
    try {
      const imgFilename = filename;
      const imgPaths = currentPaths;
      if (!imgFilename || !imgPaths) {
        throw new Error('No filename or paths available');
      }

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

      const vluImg = await tryLoadImage(getAlignedImageUrl('vlu', imgPaths, imgFilename));
      const blipImg = await tryLoadImage(getAlignedImageUrl('blip', imgPaths, imgFilename));

      const images = [gtImg];
      if (vluImg) images.push(vluImg);
      if (blipImg) images.push(blipImg);

      const minW = Math.min(...images.map(img => img.width));
      const minH = Math.min(...images.map(img => img.height));

      const ensureSize = (img, targetW, targetH) => {
        if (img.width === targetW && img.height === targetH) return img;
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, (targetW - img.width) / 2, (targetH - img.height) / 2);
        const result = new Image();
        result.src = canvas.toDataURL('image/jpeg', 0.95);
        return new Promise(resolve => { result.onload = () => resolve(result); });
      };

      const [gtFinal, vluFinal, blipFinal] = await Promise.all([
        gtImg,
        vluImg ? ensureSize(vluImg, minW, minH) : null,
        blipImg ? ensureSize(blipImg, minW, minH) : null
      ]);

      const gtData = getImageData(gtFinal);
      const unavailableMetrics = { psnr: 'N/A', ssim: 'N/A' };

      let vluMetrics = unavailableMetrics;
      if (vluFinal) {
        const vluData = getImageData(vluFinal);
        const ssimRes = ssim(vluData, gtData);
        vluMetrics = { psnr: cachedPsnr.vlu_psnr.toFixed(2), ssim: ssimRes.mssim.toFixed(4) };
      }

      let blipMetrics = unavailableMetrics;
      if (blipFinal) {
        const blipData = getImageData(blipFinal);
        const ssimRes = ssim(blipData, gtData);
        blipMetrics = { psnr: cachedPsnr.blip_psnr.toFixed(2), ssim: ssimRes.mssim.toFixed(4) };
      }

      setMetrics({ vlu: vluMetrics, blip: blipMetrics });
    } catch (e) {
      console.error('Error calculating SSIM:', e);
      setMetrics({
        vlu: { psnr: cachedPsnr.vlu_psnr.toFixed(2), ssim: 'Err' },
        blip: { psnr: cachedPsnr.blip_psnr.toFixed(2), ssim: 'Err' }
      });
    }
    setLoading(false);
  };

  const getImageUrl = (dir, filename) => {
    if (!dir) return '';
    return `${API_BASE}/image?path=${encodeURIComponent(dir + '/' + filename)}`;
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

    const uploadHandler = (e) => {
      if (!uploadZoomEnabled) return;
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 0.5 : -0.5;
      const newScale = Math.min(Math.max(uploadZoomScaleRef.current + delta, 1), 8);
      uploadZoomScaleRef.current = newScale;
      setUploadZoomStyle(prev => ({ ...prev, transform: `scale(${newScale})` }));
    };

    const refs = imgWrapperRefs.current;
    refs.forEach(el => {
      if (el) el.addEventListener('wheel', handler, { passive: false });
    });

    if (sliderRef.current) {
      sliderRef.current.addEventListener('wheel', sliderHandler, { passive: false });
    }

    // Add wheel listeners to upload image wrappers
    const uploadRefs = uploadImgRefs.current;
    uploadRefs.forEach(el => {
      if (el) el.addEventListener('wheel', uploadHandler, { passive: false });
    });

    return () => {
      refs.forEach(el => {
        if (el) el.removeEventListener('wheel', handler);
      });
      if (sliderRef.current) {
        sliderRef.current.removeEventListener('wheel', sliderHandler);
      }
      uploadRefs.forEach(el => {
        if (el) el.removeEventListener('wheel', uploadHandler);
      });
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
              className={`task-btn ${(!showUploadSection && selectedTask === t) ? 'active' : ''}`}
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

        <div className="mode-toggle">
          <button
            className={`mode-btn ${viewMode === 'shuffle' ? 'active' : ''}`}
            onClick={() => setViewMode('shuffle')}
          >
            🎲 Shuffle Mode
          </button>
          <button
            className={`mode-btn ${viewMode === 'top10' ? 'active' : ''}`}
            onClick={() => setViewMode('top10')}
          >
            📊 Top 10 Mode
          </button>
        </div>

        {/* Search Section */}
        <div className="search-section">
          <label>🔍 Search Image:</label>
          <input
            type="text"
            placeholder="Enter filename..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim()) {
                const filtered = imageList.filter(img =>
                  img.toLowerCase().includes(e.target.value.toLowerCase())
                );
                setSearchResults(filtered);
                setShowSearchResults(true);
              } else {
                setSearchResults([]);
                setShowSearchResults(false);
              }
            }}
            className="search-input"
          />
          {showSearchResults && searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.slice(0, 10).map((img, idx) => (
                <div
                  key={idx}
                  className={`search-result-item ${currentImage === img ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentImage(img);
                    setSearchQuery('');
                    setShowSearchResults(false);
                    setViewMode('shuffle');
                    fetchMetrics(img, paths);
                  }}
                >
                  {img}
                </div>
              ))}
              {searchResults.length > 10 && (
                <div className="search-results-more">
                  +{searchResults.length - 10} more results
                </div>
              )}
            </div>
          )}
          {showSearchResults && searchResults.length === 0 && searchQuery.trim() && (
            <div className="search-no-results">
              No images found
            </div>
          )}
        </div>

        {viewMode === 'shuffle' ? (
          <button className="shuffle-btn" onClick={() => pickRandomImage()} disabled={imageList.length === 0}>
            <span>&#x1F500;</span> Shuffle Image
          </button>
        ) : (
          <div className="top10-selector">
            <label>Select Image (Top 10 by PSNR Difference):</label>
            <select
              value={currentImage || ''}
              onChange={(e) => {
                const selected = top10Images.find(img => img.filename === e.target.value);
                if (selected) selectTop10Image(selected);
              }}
              disabled={top10Images.length === 0}
            >
              <option value="">-- Select an image --</option>
              {top10Images.map((img, idx) => (
                <option key={img.filename} value={img.filename}>
                  #{idx + 1}: {img.filename} (Diff: {img.difference.toFixed(2)} dB)
                </option>
              ))}
            </select>
          </div>
        )}

        <button className="compare-btn" onClick={() => setShowComparison(true)}>
          <span>&#x1F4CA;</span> Compare Quantitative Results
        </button>

        {/* Upload and Restore Section */}
        <div className="upload-section">
          <button
            className={`upload-toggle-btn ${showUploadSection ? 'active' : ''}`}
            onClick={() => setShowUploadSection(!showUploadSection)}
          >
            <span>&#x1F4F7;</span> Upload & Restore
          </button>

          {showUploadSection && (
            <div className="upload-controls">
              <div className="upload-field">
                <label>Select Degradation Type:</label>
                <select
                  value={selectedDegradation}
                  onChange={e => setSelectedDegradation(e.target.value)}
                  className="degradation-select"
                >
                  {availableDegradations.map(deg => (
                    <option key={deg.value} value={deg.value}>{deg.label}</option>
                  ))}
                </select>
              </div>

              <div className="upload-field">
                <label>Upload Image:</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="file-input"
                />
              </div>

              {uploadedImage && (
                <div className="upload-actions">
                  <button
                    className="restore-btn"
                    onClick={handleRestore}
                    disabled={isRestoring}
                  >
                    {isRestoring ? '⏳ Restoring...' : '✨ Restore Image'}
                  </button>
                  <button
                    className="reset-btn"
                    onClick={handleResetUpload}
                    disabled={isRestoring}
                  >
                    Reset
                  </button>
                </div>
              )}

              {restoreError && (
                <div className="error-message">
                  ❌ Error: {restoreError}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {showUploadSection && uploadedImage ? (
          <div className="upload-viewer">
            <h2 className="image-title">Upload & Restore Result</h2>

            <button
              className={`zoom-toggle-btn ${uploadZoomEnabled ? 'active' : ''}`}
              onClick={() => {
                const willBeEnabled = !uploadZoomEnabled;
                setUploadZoomEnabled(willBeEnabled);
                if (!willBeEnabled) {
                  uploadZoomScaleRef.current = 1;
                  setUploadZoomStyle({ transform: 'scale(1)', transformOrigin: 'center center' });
                }
              }}
            >
              {uploadZoomEnabled ? '🔍 Disable Zoom' : '🔍 Enable Zoom'}
            </button>

            <div className="images-grid">
              <div className="image-card">
                <h3>Uploaded Degraded Image</h3>
                <div className="img-wrapper"
                  ref={el => uploadImgRefs.current[0] = el}
                  onMouseMove={(e) => {
                    if (!uploadZoomEnabled) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    setUploadZoomStyle(prev => ({ ...prev, transformOrigin: `${x}% ${y}%` }));
                  }}
                  onMouseEnter={() => {
                    if (!uploadZoomEnabled) return;
                    setUploadZoomStyle(prev => ({ ...prev, transform: `scale(${Math.max(2, uploadZoomScaleRef.current)})` }));
                  }}
                  onMouseLeave={() => {
                    if (!uploadZoomEnabled) return;
                    uploadZoomScaleRef.current = 1;
                    setUploadZoomStyle({ transform: 'scale(1)', transformOrigin: 'center center' });
                  }}
                >
                  <img src={uploadedImage} style={uploadZoomEnabled ? uploadZoomStyle : {}} alt="Uploaded Degraded" draggable="false" />
                </div>
              </div>

              {restoredImage ? (
                <div className="image-card blip-card">
                  <h3>BLIP VLU Restore (ours)</h3>
                  <div className="img-wrapper"
                    ref={el => uploadImgRefs.current[1] = el}
                    onMouseMove={(e) => {
                      if (!uploadZoomEnabled) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = ((e.clientX - rect.left) / rect.width) * 100;
                      const y = ((e.clientY - rect.top) / rect.height) * 100;
                      setUploadZoomStyle(prev => ({ ...prev, transformOrigin: `${x}% ${y}%` }));
                    }}
                    onMouseEnter={() => {
                      if (!uploadZoomEnabled) return;
                      setUploadZoomStyle(prev => ({ ...prev, transform: `scale(${Math.max(2, uploadZoomScaleRef.current)})` }));
                    }}
                    onMouseLeave={() => {
                      if (!uploadZoomEnabled) return;
                      uploadZoomScaleRef.current = 1;
                      setUploadZoomStyle({ transform: 'scale(1)', transformOrigin: 'center center' });
                    }}
                  >
                    <img src={restoredImage} style={uploadZoomEnabled ? uploadZoomStyle : {}} alt="Restored" draggable="false" />
                  </div>
                  <div className="metrics">
                    ✅ Restoration completed
                  </div>
                </div>
              ) : (
                <div className="image-card blip-card">
                  <h3>BLIP VLU Restore (ours)</h3>
                  <div className="img-wrapper">
                    <div className="placeholder">
                      {isRestoring ? '⏳ Processing...' : 'Click "Restore Image" to start'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {restoreError && (
              <div className="error-message">
                ❌ Error: {restoreError}
              </div>
            )}
          </div>
        ) : null}
        {showUploadSection && uploadedImage ? null : viewMode === 'top10' && top10Loading ? (
          <div className="empty-state">⏳ Calculating top 10 images... This may take a moment.</div>
        ) : !currentImage ? (
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
                    {paths.blip_vlu && <option value="blip">BLIP VLU Restore (ours)</option>}
                    <option value="gt">Ground Truth</option>
                  </select>
                </div>
                <div className="slider-select">
                  <label>Right Image:</label>
                  <select value={sliderRight} onChange={e => setSliderRight(e.target.value)}>
                    <option value="degraded">Degraded</option>
                    <option value="vlu">VLU Restore</option>
                    {paths.blip_vlu && <option value="blip">BLIP VLU Restore (ours)</option>}
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
                <div className="image-card blip-card">
                  <h3>BLIP VLU Restore (ours)</h3>
                  <div className="img-wrapper" ref={el => imgWrapperRefs.current[2] = el} onMouseMove={handleMouseMove} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                    <img src={getAlignedImageUrl('blip')} style={zoomStyle} alt="BLIP VLU (ours)" draggable="false" />
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
      {showComparison && <ComparisonTable onClose={() => setShowComparison(false)} />}
    </div>
  );
}

export default App;
