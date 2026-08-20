import { useState } from 'react';
import { img, FALLBACK_IMG } from '@/data/storeData';

export default function SafeImg({ id, w = 1200, alt = '', className = '', ...rest }) {
  const getSrc = (value) => {
    if (!value) return img(FALLBACK_IMG, w);

    // Local public images
    if (value.startsWith('/')) return value;

    // External images
    if (value.startsWith('http')) return value;

    // Existing image IDs
    return img(value, w);
  };

  const [src, setSrc] = useState(() => getSrc(id));

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