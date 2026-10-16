import {
  AlertTriangle,
  CheckCircle2,
  Info,
  MapPin,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Wallet,
  FileText,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { NotificationType, PortalNotification } from '../data/notifications';

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  order: ShoppingCart,
  quotation: FileText,
  payment: Wallet,
  visit: MapPin,
  depot: Store,
  stock: Package,
  system: Settings,
};

const TONE_ICON: Partial<Record<PortalNotification['tone'], LucideIcon>> = {
  positive: CheckCircle2,
  critical: XCircle,
  warning: AlertTriangle,
};

const TONE_STYLE: Record<PortalNotification['tone'], { color: string; bg: string }> = {
  positive: { color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10' },
  critical: { color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' },
  warning: { color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  info: { color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
};

/** Icon and colours for a notification: the outcome when there is one, else its subject. */
export function notificationVisual(n: PortalNotification) {
  const icon = n.type === 'stock' || n.type === 'payment' || n.type === 'visit' ? TYPE_ICON[n.type] : TONE_ICON[n.tone] ?? TYPE_ICON[n.type] ?? Info;
  return { icon, ...TONE_STYLE[n.tone] };
}
