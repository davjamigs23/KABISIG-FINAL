import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import kabisigApi, { SystemNotification } from '../lib/api';

export interface NotificationMenuItem {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at?: string;
  link?: string | null;
  actionLabel?: string;
  countInBadge?: boolean;
  onSelect?: () => void;
}

interface NotificationMenuProps {
  supplementalItems?: NotificationMenuItem[];
  onNavigate?: (link: string) => void;
  buttonClassName?: string;
}

export default function NotificationMenu({ supplementalItems = [], onNavigate, buttonClassName = '' }: NotificationMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  useEffect(() => {
    let isMounted = true;
    const loadNotifications = async () => {
      const items = await kabisigApi.getNotifications();
      if (isMounted) setNotifications(items);
    };

    void loadNotifications();
    const retry = window.setTimeout(() => void loadNotifications(), 3000);
    const interval = window.setInterval(() => void loadNotifications(), 30_000);

    const onVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') void loadNotifications();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      isMounted = false;
      window.clearTimeout(retry);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const unreadCount = notifications.filter(item => !item.is_read).length + supplementalItems.filter(item => !item.is_read && item.countInBadge !== false).length;
  const items: NotificationMenuItem[] = [...supplementalItems, ...notifications];

  const handleSelect = (item: NotificationMenuItem) => {
    if (item.onSelect) {
      item.onSelect();
      setIsOpen(false);
      return;
    }

    if (!item.is_read) {
      setNotifications(previous => previous.map(notification => notification.id === item.id ? { ...notification, is_read: true } : notification));
      void kabisigApi.markNotificationRead(item.id);
    }
    if (item.link) onNavigate?.(item.link);
    setIsOpen(false);
  };

  const handleMarkAllRead = () => {
    setNotifications(previous => previous.map(item => ({ ...item, is_read: true })));
    void kabisigApi.markAllNotificationsRead();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(open => !open)}
        className={`relative cursor-pointer rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 ${buttonClassName}`}
        title="Notifications"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-white">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div
          onMouseLeave={() => setIsOpen(false)}
          className="absolute right-0 z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-100 bg-white py-2 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-bold text-slate-800">Notifications</span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-400">{unreadCount} unread</span>
              {notifications.some(item => !item.is_read) && <button type="button" onClick={handleMarkAllRead} className="text-[10px] font-semibold text-blue-700 hover:underline">Mark all read</button>}
            </div>
          </div>
          <div className="max-h-[min(70vh,40rem)] overflow-y-auto px-4">
            {items.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                className="flex w-full items-start justify-between gap-3 border-b border-slate-100 py-3 text-left last:border-b-0 hover:bg-slate-50/60"
              >
                <span className="min-w-0 flex-1">
                  <span className={`block text-xs leading-snug ${item.is_read ? 'font-semibold text-slate-600' : 'font-bold text-slate-800'}`}>{item.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">{item.message}</span>
                  {item.created_at && <span className="mt-1 block text-[10px] text-slate-400">{new Date(item.created_at).toLocaleString()}</span>}
                </span>
                {item.actionLabel && <span className="shrink-0 pt-0.5 text-[10px] font-semibold text-blue-700">{item.actionLabel}</span>}
                {!item.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Unread" />}
              </button>
            ))}
            {items.length === 0 && <p className="py-6 text-center text-xs text-slate-500">You&apos;re all caught up.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
