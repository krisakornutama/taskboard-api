/** Type declarations for tools/order.mjs so typecheck covers the CLI. */

export interface TierSpec {
  label: string;
  price: number;
  defaultDays: number;
  revisions: number;
  included: string[];
  excluded: string[];
}

export interface ExtraSpec {
  price: number;
  days: number;
}

export interface Order {
  id: string;
  client: string;
  tier: keyof typeof TIERS;
  tierLabel: string;
  basePrice: number;
  extras: string[];
  extraTotal: number;
  total: number;
  startedAt: string;
  deliveryDays: number;
  extraDays: number;
  dueAt: string;
  dueAtWithExtras: string;
  revisionsAllowed: number;
  revisionsUsed: number;
  notes: string;
}

export interface ScopeFlag {
  kind: 'out-of-scope' | 'available-extra' | 'pricing';
  item: string;
  quote: string;
}

export interface DeliveryStatus {
  daysLeft: number;
  hoursLeft: number;
  overdue: boolean;
  progressUsed: number;
  progressAllowed: number;
  revisionsLeft: number;
}

export declare const TIERS: Record<'basic' | 'standard' | 'premium', TierSpec>;
export declare const EXTRAS: Record<string, ExtraSpec>;

export declare function slugify(value: string): string;
export declare function orderId(date: string, client: string): string;

export declare function buildOrder(input: {
  client: string;
  tier: string;
  days?: number | string;
  extras?: string[];
  date?: string;
  notes?: string;
}): Order;

export declare function createOrder(input: {
  client: string;
  tier: string;
  days?: number | string;
  extras?: string[];
  date?: string;
  notes?: string;
}): { order: Order; dir: string };

export declare function listOrders(): string[];
export declare function detectScopeDrift(requestText: string, order: Order): ScopeFlag[];
export declare function deliveryStatus(order: Order, now?: Date): DeliveryStatus;