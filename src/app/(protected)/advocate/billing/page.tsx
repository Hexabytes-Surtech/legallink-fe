'use client';

import * as React from 'react';
import Script from 'next/script';
import { toast } from 'sonner';
import { CreditCard, Check, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import {
  billingApi,
  type BillingPlan,
  type SubscriptionStatus,
  type RazorpayHandlerResponse,
} from '@/lib/api/billing';
import { useQuery } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// Minimal typing for the Razorpay Checkout global (loaded via <Script> below).
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler?: (response: RazorpayHandlerResponse) => void;
  modal?: { ondismiss?: () => void };
}
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

export default function AdvocateBillingPage() {
  const { t, language } = useLanguage();
  const isBn = language === 'bn';
  const { user } = useAuth();

  const plansQ = useQuery<BillingPlan[]>(() => billingApi.getPlans(), []);
  const subQ = useQuery<SubscriptionStatus>(() => billingApi.getSubscription(), []);
  const [rzpReady, setRzpReady] = React.useState(false);
  const [pendingPlan, setPendingPlan] = React.useState<string | null>(null);

  // Safety net: if checkout.js was already loaded on a previous mount, onLoad won't refire.
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.Razorpay) setRzpReady(true);
  }, []);

  const sub = subQ.data;
  const isActive = !!sub?.is_active;

  const priceLabel = (p: BillingPlan) => {
    const rupees = (p.amount / 100).toLocaleString(isBn ? 'bn-IN' : 'en-IN');
    return `₹${rupees}${p.periodMonths === 12 ? t('adv.billing.perYear') : t('adv.billing.perMonth')}`;
  };

  async function subscribe(plan: BillingPlan) {
    setPendingPlan(plan.id);
    try {
      const order = await billingApi.createOrder(plan.id);
      if (!order.keyId) {
        toast.error(t('adv.billing.notConfigured'));
        return;
      }
      if (!window.Razorpay) {
        toast.error(t('adv.billing.opening'));
        return;
      }
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'LegalLink',
        description: order.plan.label,
        order_id: order.orderId,
        prefill: { name: user?.name ?? undefined, email: user?.email ?? undefined },
        theme: { color: '#b8860b' },
        handler: async (resp) => {
          try {
            await billingApi.verify({
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            toast.success(t('adv.billing.success'));
            subQ.refetch();
          } catch (e) {
            toast.error(e instanceof ApiError ? e.first : t('adv.billing.failed'));
          }
        },
        modal: { ondismiss: () => toast.message(t('adv.billing.cancelled')) },
      });
      rzp.open();
    } catch (e) {
      if (e instanceof ApiError && e.code === 503) toast.error(t('adv.billing.notConfigured'));
      else toast.error(e instanceof ApiError ? e.first : t('adv.billing.failed'));
    } finally {
      setPendingPlan(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      {/* Razorpay Checkout — loaded once for this route (next/script). */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setRzpReady(true)}
        onError={() => toast.error(t('adv.billing.failed'))}
      />

      <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight">
        <CreditCard className="size-7 text-gold" /> {t('adv.billing.title')}
      </h1>
      <p className="mt-1 text-muted-foreground">{t('adv.billing.subtitle')}</p>

      {/* Current status */}
      {subQ.loading && !sub ? (
        <Skeleton className="mt-6 h-20 w-full rounded-xl" />
      ) : (
        <Card className={`mt-6 ${isActive ? 'border-success/40 bg-success/5' : ''}`}>
          <CardContent className="flex items-center gap-3 py-5">
            <span
              className={`grid size-10 place-items-center rounded-full ${
                isActive ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
              }`}
            >
              {isActive ? <ShieldCheck className="size-5" /> : <Sparkles className="size-5" />}
            </span>
            <div>
              <p className="font-medium">
                {isActive ? t('adv.billing.statusActive') : t('adv.billing.statusInactive')}
              </p>
              {isActive && sub?.current_period_end && (
                <p className="text-xs text-muted-foreground">
                  {t('adv.billing.validUntil')}{' '}
                  {new Date(sub.current_period_end).toLocaleDateString(isBn ? 'bn-IN' : 'en-IN', {
                    dateStyle: 'medium',
                  })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans */}
      <h2 className="mt-8 text-lg font-semibold">{t('adv.billing.choosePlan')}</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {plansQ.loading && !plansQ.data
          ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)
          : (plansQ.data ?? []).map((p) => (
              <Card key={p.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-base">{p.label}</CardTitle>
                  <p className="mt-1 font-display text-2xl font-semibold">{priceLabel(p)}</p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                  <Button
                    className="mt-4 w-full"
                    disabled={!rzpReady || pendingPlan !== null}
                    onClick={() => subscribe(p)}
                  >
                    {pendingPlan === p.id ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> {t('adv.billing.opening')}
                      </>
                    ) : isActive ? (
                      <>
                        <Check className="size-4" /> {t('adv.billing.renew')}
                      </>
                    ) : (
                      t('adv.billing.subscribe')
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Compliance microcopy + test-mode hint */}
      <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" /> {t('adv.billing.compliance')}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">{t('adv.billing.testHint')}</p>
    </div>
  );
}
