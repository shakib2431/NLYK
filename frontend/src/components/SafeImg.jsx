import { useState } from 'react';
import { img, FALLBACK_IMG } from '@/data/storeData';

export default function SafeImg({ id, w = 1200, alt = '', className = '', ...rest }) {
  const [src, setSrc] = useState(() => (id.startsWith('http') ? id : img(id, w)));
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
