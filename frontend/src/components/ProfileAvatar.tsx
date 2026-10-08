import React from 'react';
import { User } from 'lucide-react';

interface ProfileAvatarProps {
  name?: string;
  src?: string;
  className?: string;
  alt?: string;
}

export default function ProfileAvatar({ name, src, className = 'h-10 w-10', alt }: ProfileAvatarProps) {
  if (src) {
    return <img src={src} alt={alt || `${name || 'User'} profile`} className={`${className} object-cover`} />;
  }

  return (
    <div
      role="img"
      aria-label={alt || `${name || 'User'} profile placeholder`}
      className={`${className} flex items-center justify-center bg-slate-100 text-slate-500`}
    >
      <User className="h-1/2 w-1/2" aria-hidden="true" />
    </div>
  );
}
