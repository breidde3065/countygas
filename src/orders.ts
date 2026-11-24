export type Status = 'new' | 'confirmed' | 'dispatched' | 'completed' | 'cancelled';
export type Mode = 'delivery' | 'pickup';
export type OrderItem = { size: string; kind: 'refill' | 'fresh'; qty: number; brand: string; unitPrice: number };
export type Order = {
  ref: string; createdAt: string; status: Status; name: string; phone: string; branchId: string; branchName: string;
  mode: Mode; location: string; payment: string; note: string; items: OrderItem[]; deliveryFee: number; total: number;
  history: { status: Status; at: string }[];
};
/** What a customer is allowed to see when tracking: no name, phone or address. */
export type TrackedOrder = Pick<Order, 'ref' | 'status' | 'mode' | 'branchName' | 'items' | 'total' | 'deliveryFee' | 'createdAt' | 'history'>;

export const STATUSES: Status[] = ['new', 'confirmed', 'dispatched', 'completed', 'cancelled'];

export const statusLabel = (s: Status, mode: Mode) =>
  ({ new: 'New', confirmed: 'Confirmed', dispatched: mode === 'delivery' ? 'On the way' : 'Ready for pickup', completed: 'Completed', cancelled: 'Cancelled' })[s];

export const itemText = (i: OrderItem) => `${i.qty} x ${i.size} kg ${i.kind === 'refill' ? 'refill' : 'new cylinder'}${i.brand ? ` (${i.brand})` : ''}`;

export const when = (iso: string) =>
  new Date(iso).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** 0712 345 678 or +254712345678 -> 254712345678, for wa.me links. */
export const intlPhone = (v: string) => {
  const d = v.replace(/\D/g, '');
  return d.startsWith('0') ? `254${d.slice(1)}` : d.length === 9 ? `254${d}` : d;
};
