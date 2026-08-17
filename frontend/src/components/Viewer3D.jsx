import { useEffect, useRef, useState } from 'react';
import { X, Maximize, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { motion } from 'framer-motion';
import SafeImg from '@/components/SafeImg';
import { img } from '@/data/storeData';

export default function Viewer3D({ product, onClose }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [rotating, setRotating] = useState(true);
  const viewerRef = useRef(null);
  const shellRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    let alive = true;
    import('@google/model-viewer')
      .then(() => alive && setReady(true))
      .catch(() => alive && setFailed(true));
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      alive = false;
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const onErr = () => setFailed(true);
    el.addEventListener('error', onErr);
    return () => el.removeEventListener('error', onErr);
  }, [ready]);

  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else shellRef.current?.requestFullscreen?.();
  };

  const setFov = (delta) => {
    const el = viewerRef.current;
    if (!el) return;
    const cur = parseFloat(el.getAttribute('field-of-view') || '30');
    el.setAttribute('field-of-view', `${Math.min(45, Math.max(15, cur + delta))}deg`);
  };

  const poster = product.posterImage ? img(product.posterImage, 1200) : img(product.images[0], 1200);

  return (
    <motion.div
      ref={shellRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${product.name} 3D viewer`}
      className="fixed inset-0 z-50 bg-ink text-paper flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      data-testid="viewer-3d"
    >
      <div className="flex items-center justify-between px-4 md:px-8 h-16 border-b border-paper/15 shrink-0">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-paper/50">3D VIEW</p>
          <p className="font-display font-bold uppercase tracking-tight text-sm md:text-base">{product.name}</p>
        </div>
        <button
          ref={closeRef}
          data-testid="viewer-3d-close"
          onClick={onClose}
          aria-label="Close 3D viewer"
          className="flex items-center gap-2 text-[11px] tracking-[0.25em] hover:text-paper/60 transition-colors"
        >
          CLOSE <X size={18} strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 relative min-h-0">
        {failed || !product.modelUrl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center" data-testid="viewer-3d-fallback">
            <div className="max-w-md w-full aspect-[3/4] max-h-[60vh] overflow-hidden border border-paper/20">
              <SafeImg id={product.posterImage || product.images[0]} w={900} alt={product.name} className="h-full w-full object-cover" />
            </div>
            <p className="mt-6 text-[11px] tracking-[0.25em] text-paper/60">3D PREVIEW UNAVAILABLE FOR THIS PIECE — THE PHOTOS DO IT MORE JUSTICE ANYWAY.</p>
          </div>
        ) : !ready ? (
          <div className="absolute inset-0 flex items-center justify-center" data-testid="viewer-3d-loading">
            <p className="text-[11px] tracking-[0.35em] text-paper/60 animate-pulse">PREPARING 3D</p>
          </div>
        ) : (
          <model-viewer
            ref={viewerRef}
            src={product.modelUrl}
            poster={poster}
            camera-controls
            auto-rotate={rotating}
            field-of-view="30deg"
            shadow-intensity="1"
            exposure="1"
            style={{ width: '100%', height: '100%', background: 'transparent' }}
            aria-label={`Interactive 3D model of ${product.name}`}
          />
        )}
      </div>

      <div className="flex items-center justify-center gap-6 md:gap-10 px-4 h-16 border-t border-paper/15 shrink-0" data-testid="viewer-3d-controls">
        <button
          data-testid="viewer-3d-rotate"
          onClick={() => setRotating(!rotating)}
          aria-pressed={rotating}
          aria-label="Toggle auto rotation"
          className={`flex items-center gap-2 text-[11px] tracking-[0.25em] transition-colors ${rotating ? 'text-paper' : 'text-paper/50 hover:text-paper'}`}
        >
          <RotateCw size={15} strokeWidth={1.5} /> ROTATE
        </button>
        <div className="flex items-center gap-3" role="group" aria-label="Zoom controls">
          <button data-testid="viewer-3d-zoom-out" onClick={() => setFov(5)} aria-label="Zoom out" className="text-paper/50 hover:text-paper transition-colors">
            <ZoomOut size={16} strokeWidth={1.5} />
          </button>
          <span className="text-[11px] tracking-[0.25em] text-paper/50 hidden sm:inline">DRAG · PINCH · SCROLL</span>
          <button data-testid="viewer-3d-zoom-in" onClick={() => setFov(-5)} aria-label="Zoom in" className="text-paper/50 hover:text-paper transition-colors">
            <ZoomIn size={16} strokeWidth={1.5} />
          </button>
        </div>
        <button
          data-testid="viewer-3d-fullscreen"
          onClick={fullscreen}
          aria-label="Toggle fullscreen"
          className="flex items-center gap-2 text-[11px] tracking-[0.25em] text-paper/50 hover:text-paper transition-colors"
        >
          <Maximize size={15} strokeWidth={1.5} /> FULLSCREEN
        </button>
      </div>
    </motion.div>
  );
}
