/**
 * Billing API — advocate SaaS subscription (Razorpay, Orders / period-access model).
 *
 * Compliance note (docs/MONETIZATION_PLAN.md): this is the platform charging an advocate
 * a FLAT software fee. It is never a share of the advocate's legal fee, and it never buys
 * visibility/ranking/leads. The legal fee itself is settled off-platform.
 */
import { api } from './client';

export interface BillingPlan {
  id: string;
  label: string;
  amount: number; // in paise
  currency: string;
  periodMonths: number;
  description: string;
}

export interface SubscriptionStatus {
  plan_id: string | null;
  status: 'inactive' | 'active' | 'expired' | 'cancelled';
  current_period_start: string | null;
  current_period_end: string | null;
  is_active: boolean;
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string | null; // publishable key — safe in the browser; null if not configured
  plan: { id: string; label: string; periodMonths: number };
}

/** The three fields Razorpay Checkout hands back to the browser on success. */
export interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyResponse {
  alreadyProcessed: boolean;
  subscription: Omit<SubscriptionStatus, 'is_active'> | null;
}

export const billingApi = {
  /** Public pricing — no auth needed. */
  getPlans: () => api.get<BillingPlan[]>('/billing/plans', { skipAuth: true }),
  getSubscription: () => api.get<SubscriptionStatus>('/billing/subscription'),
  createOrder: (planId: string) => api.post<CreateOrderResponse>('/billing/order', { planId }),
  verify: (payload: RazorpayHandlerResponse) => api.post<VerifyResponse>('/billing/verify', payload),
};
