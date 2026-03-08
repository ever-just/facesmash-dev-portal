'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Check, CreditCard, Zap } from 'lucide-react';
import { checkoutAction, customerPortalAction } from '@/lib/payments/actions';
import { TeamDataWithMembers } from '@/lib/db/schema';
import useSWR from 'swr';
import { Suspense } from 'react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const plans = [
  {
    name: 'Free',
    price: 0,
    priceId: null,
    description: 'For testing and prototyping',
    features: [
      '1,000 API calls/month',
      '2 applications',
      '5 API keys',
      'Community support',
      'Basic analytics',
    ],
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 29,
    priceId: 'price_1T8Z5JKL0p3ve1jH64BJPsd1',
    description: 'For production applications',
    features: [
      '50,000 API calls/month',
      '10 applications',
      'Unlimited API keys',
      'Priority email support',
      'Advanced analytics',
      'Webhook integrations',
      'Custom rate limits',
    ],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 99,
    priceId: 'price_1T8Z5QKL0p3ve1jHKFvi36pL',
    description: 'For large-scale deployments',
    features: [
      'Unlimited API calls',
      'Unlimited applications',
      'Unlimited API keys',
      'Dedicated support + SLA',
      'Real-time analytics',
      'Custom integrations',
      'On-premise deployment option',
      'SSO / SAML',
    ],
    highlighted: false,
  },
];

function CurrentPlan() {
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Current Plan
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-xl font-semibold">
              {teamData?.planName || 'Free'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {teamData?.subscriptionStatus === 'active'
                ? 'Active — billed monthly'
                : teamData?.subscriptionStatus === 'trialing'
                ? 'Trial period active'
                : '1,000 API calls/month included'}
            </p>
          </div>
          {teamData?.stripeCustomerId && (
            <form action={customerPortalAction}>
              <Button type="submit" variant="outline">
                Manage Subscription
              </Button>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BillingPage() {
  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium mb-6">Billing</h1>

      <Suspense fallback={<Card className="mb-8 h-[120px]"><CardHeader><CardTitle>Current Plan</CardTitle></CardHeader></Card>}>
        <CurrentPlan />
      </Suspense>

      <h2 className="text-lg font-medium mb-4">Available Plans</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={
              plan.highlighted
                ? 'border-emerald-500 border-2 relative'
                : ''
            }
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-emerald-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
            )}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                {plan.price === 0 ? (
                  <p className="text-3xl font-bold">Free</p>
                ) : (
                  <p className="text-3xl font-bold">
                    ${plan.price}
                    <span className="text-base font-normal text-gray-500">/mo</span>
                  </p>
                )}
              </div>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {plan.price === 0 ? (
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              ) : plan.priceId ? (
                <form action={checkoutAction} className="w-full">
                  <input type="hidden" name="priceId" value={plan.priceId} />
                  <Button
                    type="submit"
                    className={`w-full ${
                      plan.highlighted
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : ''
                    }`}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Upgrade to {plan.name}
                  </Button>
                </form>
              ) : (
                <Button variant="outline" className="w-full">
                  Contact Sales
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
