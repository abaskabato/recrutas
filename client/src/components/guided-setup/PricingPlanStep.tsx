import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Building, Zap, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useGuidedSetup } from '@/contexts/GuidedSetupContext';
import { apiRequest } from '@/lib/queryClient';

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: { text: string; included: boolean }[];
  tierId: number | null;
  icon: React.ElementType;
  popular?: boolean;
}

const talentOwnerPlans: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for getting started',
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      { text: '3 active job postings', included: true },
      { text: 'Basic applicant view', included: true },
      { text: 'Manual screening', included: true },
      { text: 'AI candidate ranking', included: false },
      { text: 'Advanced analytics', included: false },
      { text: 'Custom screening exams', included: false },
    ],
    tierId: null,
    icon: Zap,
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'For growing teams',
    priceMonthly: 149,
    priceYearly: 1490,
    features: [
      { text: '10 active job postings', included: true },
      { text: 'AI candidate ranking', included: true },
      { text: 'Advanced analytics', included: true },
      { text: 'Custom screening exams', included: true },
      { text: 'Priority support', included: true },
      { text: 'Team collaboration (3 users)', included: true },
    ],
    tierId: 2,
    icon: Building,
    popular: true,
  },
  {
    id: 'scale',
    name: 'Scale',
    description: 'For high-volume hiring',
    priceMonthly: 299,
    priceYearly: 2990,
    features: [
      { text: 'Unlimited job postings', included: true },
      { text: 'AI candidate ranking', included: true },
      { text: 'Advanced analytics', included: true },
      { text: 'Custom screening exams', included: true },
      { text: 'Priority support', included: true },
      { text: 'Unlimited team members', included: true },
      { text: 'API access', included: true },
      { text: 'Dedicated account manager', included: true },
    ],
    tierId: 3,
    icon: Crown,
  },
];

export default function PricingPlanStep() {
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [isYearly, setIsYearly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setStep } = useGuidedSetup();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSelectPlan = async (plan: PricingPlan) => {
    setSelectedPlan(plan);
    
    if (!plan.tierId) {
      // Free plan - skip payment, go to dashboard
      toast({
        title: 'Plan Selected',
        description: 'You\'re on the Starter plan. You can upgrade anytime.',
      });
      setLocation('/talent-dashboard');
      return;
    }

    // Paid plan - initiate checkout
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/stripe/create-checkout', {
        tierId: plan.tierId,
        billingCycle: isYearly ? 'yearly' : 'monthly',
      });
      
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: 'Checkout Failed',
        description: 'Unable to start payment process. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="text-center space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Choose your plan</h2>
        <p className="text-muted-foreground">
          Select the plan that fits your hiring needs. Upgrade or downgrade anytime.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4">
        <span className={`text-sm ${!isYearly ? 'font-semibold' : 'text-muted-foreground'}`}>
          Monthly
        </span>
        <button
          onClick={() => setIsYearly(!isYearly)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isYearly ? 'bg-primary' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isYearly ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-sm ${isYearly ? 'font-semibold' : 'text-muted-foreground'}`}>
          Yearly
        </span>
        {isYearly && (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            Save 17%
          </Badge>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {talentOwnerPlans.map((plan) => {
          const Icon = plan.icon;
          const price = isYearly ? plan.priceYearly : plan.priceMonthly;
          const isSelected = selectedPlan?.id === plan.id;

          return (
            <Card
              key={plan.id}
              className={`relative transition-all cursor-pointer ${
                plan.popular
                  ? 'border-primary shadow-lg scale-[1.02]'
                  : 'border-gray-200'
              } ${isSelected ? 'ring-2 ring-primary' : ''}`}
              onClick={() => !isLoading && handleSelectPlan(plan)}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  Most Popular
                </Badge>
              )}

              <CardHeader className="text-center pb-4">
                <div
                  className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4 ${
                    plan.popular
                      ? 'bg-primary/10 text-primary'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="text-center pb-6">
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">
                    ${price}
                  </span>
                  {price > 0 && (
                    <span className="text-gray-500">/{isYearly ? 'year' : 'month'}</span>
                  )}
                </div>

                <ul className="space-y-3 text-left text-sm">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <div
                        className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                          feature.included
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {feature.included ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <span className="h-0.5 w-2 bg-current rounded" />
                        )}
                      </div>
                      <span className={feature.included ? '' : 'text-gray-400'}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full mt-6"
                  variant={plan.popular ? 'default' : 'outline'}
                  disabled={isLoading}
                >
                  {isLoading && selectedPlan?.id === plan.id
                    ? 'Processing...'
                    : plan.tierId
                    ? 'Choose Plan'
                    : 'Start Free'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        All plans include unlimited AI job matching for your candidates. No hidden fees.
      </p>
    </div>
  );
}
