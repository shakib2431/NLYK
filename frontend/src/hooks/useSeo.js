import { useEffect } from 'react';

export function useSeo(title, description) {
  useEffect(() => {
    document.title = title ? `${title} — NALAYAK` : 'NALAYAK — Not For Everyone';
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', description);
    }
  }, [title, description]);
}
