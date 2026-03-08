import { checkoutAction } from '@/lib/payments/actions';
import { Check } from 'lucide-react';
import { getStripePrices, getStripeProducts } from '@/lib/payments/stripe';
import { SubmitButton } from './submit-button';

// Prices are fresh for one hour max
export const revalidate = 3600;

const planFeatures: Record<string, string[]> = {
  Free: [
    '1,000 API calls/month',
    '2 applications',
    '5 API keys',
    'Community support',
    'Basic analytics',
  ],
  Pro: [
    '50,000 API calls/month',
    '10 applications',
    'Unlimited API keys',
    'Priority email support',
    'Advanced analytics',
    'Webhook integrations',
    'Custom rate limits',
  ],
  Enterprise: [
    'Unlimited API calls',
    'Unlimited applications',
    'Unlimited API keys',
    'Dedicated support + SLA',
    'Real-time analytics',
    'Custom integrations',
    'On-premise deployment option',
    'SSO / SAML',
  ],
};

export default async function PricingPage() {
  const [prices, products] = await Promise.all([
    getStripePrices(),
    getStripeProducts(),
  ]);

  const planOrder = ['Free', 'Pro', 'Enterprise'];
  const sortedProducts = planOrder
    .map((name) => {
      const product = products.find((p) => p.name === name);
      const price = prices.find((p) => p.productId === product?.id);
      return product && price ? { product, price } : null;
    })
    .filter(Boolean) as { product: typeof products[0]; price: typeof prices[0] }[];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900">API Pricing</h1>
        <p className="mt-3 text-lg text-gray-500">
          Start free, scale as you grow. All plans include core face recognition APIs.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {sortedProducts.map(({ product, price }) => (
          <PricingCard
            key={product.id}
            name={product.name}
            price={price.unitAmount || 0}
            interval={price.interval || 'month'}
            trialDays={price.trialPeriodDays || 0}
            features={planFeatures[product.name] || []}
            priceId={price.id}
            highlighted={product.name === 'Pro'}
          />
        ))}
      </div>
    </main>
  );
}

function PricingCard({
  name,
  price,
  interval,
  trialDays,
  features,
  priceId,
  highlighted,
}: {
  name: string;
  price: number;
  interval: string;
  trialDays: number;
  features: string[];
  priceId?: string;
  highlighted?: boolean;
}) {
  return (
    <div className={`pt-6 px-6 pb-8 rounded-2xl border-2 ${highlighted ? 'border-emerald-500 relative' : 'border-gray-200'}`}>
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-emerald-500 text-white text-xs font-medium px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}
      <h2 className="text-2xl font-medium text-gray-900 mb-2">{name}</h2>
      {trialDays > 0 && (
        <p className="text-sm text-gray-600 mb-4">
          with {trialDays} day free trial
        </p>
      )}
      {price === 0 ? (
        <p className="text-4xl font-medium text-gray-900 mb-6">
          Free
        </p>
      ) : (
        <p className="text-4xl font-medium text-gray-900 mb-6">
          ${price / 100}{' '}
          <span className="text-xl font-normal text-gray-600">
            / {interval}
          </span>
        </p>
      )}
      <ul className="space-y-4 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-emerald-500 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
      {price === 0 ? (
        <div className="text-center text-sm text-gray-500 py-2">
          Included — no card required
        </div>
      ) : (
        <form action={checkoutAction}>
          <input type="hidden" name="priceId" value={priceId} />
          <SubmitButton />
        </form>
      )}
    </div>
  );
}
