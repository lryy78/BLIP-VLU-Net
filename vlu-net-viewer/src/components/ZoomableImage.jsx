import React, { useRef, useState, useEffect } from 'react';

const ZoomableImage = ({ src, alt, zoomState, onZoom, isActive }) => {
  const containerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  // We use a ref to always access the latest zoomState inside the wheel event listener
  const zoomStateRef = useRef(zoomState);
  useEffect(() => {
    zoomStateRef.current = zoomState;
  }, [zoomState]);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;

    // Call the parent to update global zoom state, preserving the current scale
    if (onZoom) {
      const currentScale = zoomStateRef.current ? zoomStateRef.current.scale : 2.5;
      onZoom({ x, y, scale: currentScale });
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (onZoom) {
      onZoom(null);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      // Only handle zoom if we are hovering
      if (!isHovered) return;
      
      e.preventDefault(); // Stop the page from scrolling

      let currentScale = zoomStateRef.current ? zoomStateRef.current.scale : 2.5;
      const zoomSensitivity = 0.2;

      if (e.deltaY < 0) {
        currentScale += zoomSensitivity; // zoom in
      } else {
        currentScale -= zoomSensitivity; // zoom out
      }

      currentScale = Math.max(1, Math.min(currentScale, 10)); // Clamp scale

      const { left, top, width, height } = container.getBoundingClientRect();
      const x = ((e.clientX - left) / width) * 100;
      const y = ((e.clientY - top) / height) * 100;

      if (onZoom) {
        onZoom({ x, y, scale: currentScale });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [isHovered, onZoom]);

  const shouldZoom = zoomState !== null;

  const style = shouldZoom ? {
    transformOrigin: `${zoomState.x}% ${zoomState.y}%`,
    transform: `scale(${zoomState.scale})`
  } : {};

  return (
    <div 
      className="zoom-container"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {!imgError ? (
        <img 
          src={src} 
          alt={alt} 
          className="zoom-img"
          style={style}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="loader">Image not found</div>
      )}
    </div>
  );
};

export default ZoomableImage;
