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
  items?: any[];
  userRole?: string;
  supplementalItems?: NotificationMenuItem[];
  onNavigate?: (link: string) => void;
  buttonClassName?: string;
}

export default function NotificationMenu({
  items: providedItems,
  supplementalItems = [],
  onNavigate,
  buttonClassName = '',
  userRole,
}: NotificationMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [locallyReadIds, setLocallyReadIds] = useState<Set<string>>(() => new Set());
  const hasProvidedItems = Array.isArray(providedItems) && providedItems.length > 0;

  useEffect(() => {
    if (hasProvidedItems || !userRole || userRole === 'Viewer' || !kabisigApi.getToken()) return;
    let isMounted = true;
    const loadNotifications = async () => {
      try {
        const rows = await kabisigApi.getNotifications();
        if (isMounted) setNotifications(rows);
      } catch (error) {
        if (isMounted) console.warn('Unable to load notifications:', error);
      }
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
  }, [hasProvidedItems, userRole]);

  const items: NotificationMenuItem[] = [...supplementalItems, ...(hasProvidedItems ? (providedItems as any[]) : notifications)];

  const filteredItems = items.filter((item: any) => {
    if (!userRole) return false;
    const r = String(userRole).toLowerCase();
    const link = String(item.link || '').toLowerCase();
    const text = String((item.title || '') + ' ' + (item.message || '')).toLowerCase();

    // BLOCK all generic system alerts and budget alerts
    if (text.includes('budget') || text.includes('expense') || text.includes('invoice') || text.includes('financial') || text.includes('alert') || text.includes('no pending validations') || text.includes('no overspending detected')) return false;

    // 1. Youth Constituent
    if (r.includes('youth') || r.includes('constituent')) {
      return link.includes('feedback') || text.includes('feedback') || link.includes('program') || text.includes('program') || text.includes('announcement') || text.includes('outreach');
    }

    // 2. Treasurer
    if (r.includes('treasurer')) return link.includes('budget') || link.includes('expense') || text.includes('budget alert');
    
    // 3. Secretary
    if (r.includes('secretary')) return link.includes('document') || link.includes('resolution') || text.includes('document');
    
    // 4. Kagawad
    if (r.includes('kagawad')) return link.includes('program') || link.includes('calendar') || link.includes('attendance') || text.includes('program is coming up');
    
    // 5. Chairperson / Super Admin
    if (r.includes('chair') || r.includes('barangay admin') || r.includes('super')) {
        return link.includes('user') || link.includes('registration') || text.includes('registration') || text.includes('compliance') || text.includes('approval') || text.includes('pending');
    }
    return false;
  });

  const unreadCount = filteredItems.filter((item: any) => !item.is_read && !locallyReadIds.has(item.id)).length;

  const handleSelect = (item: NotificationMenuItem) => {
    const isSystemNotification = notifications.some(notification => notification.id === item.id)
      || Boolean(providedItems?.some((notification: any) => notification.id === item.id));
    if (!item.is_read && !locallyReadIds.has(item.id)) {
      setLocallyReadIds(previous => new Set(previous).add(item.id));
    }
    if (item.link && onNavigate) { onNavigate(item.link); }
      if (isSystemNotification && !item.is_read) {
      setNotifications(previous => previous.map(notification => notification.id === item.id ? { ...notification, is_read: true } : notification));
      void kabisigApi.markNotificationRead(item.id);
    }

    if (item.onSelect) {
      item.onSelect();
      setIsOpen(false);
      return;
    }


    setIsOpen(false);
  };

  const handleMarkAllRead = () => {
    setNotifications(previous => previous.map(item => ({ ...item, is_read: true })));
    setLocallyReadIds(previous => new Set([...previous, ...items.map(item => item.id)]));
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
              {items.some(item => !item.is_read && !locallyReadIds.has(item.id)) && <button type="button" onClick={handleMarkAllRead} className="text-[10px] font-semibold text-blue-700 hover:underline">Mark all read</button>}
            </div>
          </div>
          <div className="max-h-[min(70vh,40rem)] overflow-y-auto px-4">
            {filteredItems.map(item => {
              const isRead = item.is_read || locallyReadIds.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={`flex w-full items-start justify-between gap-3 border-b border-slate-100 py-3 text-left last:border-b-0 ${isRead ? 'bg-white hover:bg-slate-50/60' : 'bg-slate-100/80 hover:bg-slate-100'}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block text-xs leading-snug ${isRead ? 'font-semibold text-slate-600' : 'font-bold text-slate-800'}`}>{item.title}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-500">{item.message}</span>
                    <span className="mt-1 block text-[10px] text-slate-400">{item.created_at ? new Date(item.created_at).toLocaleString() : 'Just now'}</span>
                  </span>
                  {item.actionLabel && <span className="shrink-0 pt-0.5 text-[10px] font-semibold text-blue-700">{item.actionLabel}</span>}
                  {!isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Unread" />}
                </button>
              );
            })}
            {filteredItems.length === 0 && <p className="py-6 text-center text-xs text-slate-500">You&apos;re all caught up.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
