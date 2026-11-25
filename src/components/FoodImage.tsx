import { useEffect, useState } from 'react';
import { Utensils } from 'lucide-react';

interface FoodImageProps {
  src?: string;
  alt: string;
  className?: string;
}

export function FoodImage({ src, alt, className = 'w-full h-full object-cover' }: FoodImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-stone-100 text-emerald-800 p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Utensils className="w-7 h-7 mb-2 text-emerald-600" aria-hidden="true" />
        <span className="text-xs font-medium text-emerald-900/80 line-clamp-2">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
