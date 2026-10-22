import { useEffect, useState } from 'react';
import { img, FALLBACK_IMG } from '@/data/storeData';

function resolveSrc(value, w) {
  if (!value) return img(FALLBACK_IMG, w);

  // Local public images
  if (value.startsWith('/')) return value;

  // External images
  if (value.startsWith('http')) return value;

  // Existing image IDs
  return img(value, w);
}

export default function SafeImg({ id, w = 1200, alt = '', className = '', ...rest }) {
  const [src, setSrc] = useState(() => resolveSrc(id, w));

  useEffect(() => {
    setSrc(resolveSrc(id, w));
  }, [id, w]);

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setSrc(img(FALLBACK_IMG, w))}
      className={className}
      {...rest}
    />
  );
}