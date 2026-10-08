import React from 'react';
import ProfileAvatar from './ProfileAvatar';

interface UserMenuProps {
  userName: string;
  role: string;
  avatarUrl?: string;
  onLogout?: () => void;
  onNavigateProfile?: () => void;
}

export function UserMenu({ userName, role, avatarUrl, onNavigateProfile }: UserMenuProps) {
  const handleClick = () => {
    if (onNavigateProfile) {
      onNavigateProfile();
    }
  };

  return (
    <div className="relative">
      <div 
        className={`flex items-center gap-3 pl-4 border-l border-slate-100 select-none ${
          onNavigateProfile ? 'cursor-pointer group' : ''
        }`}
        onClick={handleClick}
        title={onNavigateProfile ? "View My Profile" : undefined}
      >
        <ProfileAvatar
          name={userName}
          src={avatarUrl}
          alt={userName}
          className={`w-10 h-10 rounded-full border border-slate-100 transition-all ${
            onNavigateProfile ? 'group-hover:border-[#091d64] group-hover:scale-105' : ''
          }`}
        />
        <div className="hidden sm:flex flex-col text-left">
          <span className={`text-xs font-bold text-slate-800 leading-none transition-colors ${
            onNavigateProfile ? 'group-hover:text-[#091d64]' : ''
          }`}>
            {userName}
          </span>
          <span className="text-[10px] text-slate-400 font-semibold mt-1 leading-none">{role}</span>
        </div>
      </div>
    </div>
  );
}

