import { useState } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Check,
  Zap,
  Crown,
  Building,
  Briefcase,
  ArrowLeft,
  Loader2,
  Sparkles,
  Target,
  BarChart3,
  Users,
  Shield,
  MessageSquare
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import RecrutasLogo from '@/components/recrutas-logo';
import { ThemeToggleButton } from '@/components/theme-toggle-button';

interface SubscriptionStatus {
  status: string;
  tier: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  limits: Record<string, number>;
}

// Define plans for candidates
const candidatePlans = [
  {
    id: 'free-candidate',
    name: 'Free',
    description: 'Get started with basic features',
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      { text: '10 AI job matches per day', included: true },
      { text: 'Basic profile', included: true },
      { text: 'Apply to jobs', included: true },
      { text: 'Unlimited AI matches', included: false },
      { text: 'Priority visibility', included: false },
      { text: 'AI resume enhancement', included: false },
    ],
    tierId: null,
    icon: Zap,
  },
  {
    id: 'pro-candidate',
    name: 'Pro',
    description: 'Supercharge your job search',
    priceMonthly: 9.99,
    priceYearly: 99,
    features: [
      { text: 'Unlimited AI job matches', included: true },
      { text: 'Priority visibility to recruiters', included: true },
      { text: 'AI resume enhancement', included: true },
      { text: 'Application tracking insights', included: true },
      { text: 'Interview preparation tips', included: true },
      { text: 'Priority support', included: true },
    ],
    tierId: 1,
    icon: Crown,
    popular: true,
  },
];

// Define plans for talent owners
const talentOwnerPlans = [
  {
    id: 'free-talent',
    name: 'Starter',
    description: 'Perfect for getting started',
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      { text: '3 active job postings', included: true },
      { text: 'Basic applicant view', included: true },
      { text: 'Manual screening', included: true },
      { text: 'Unlimited postings', included: false },
      { text: 'AI candidate ranking', included: false },
      { text: 'Advanced analytics', included: false },
    ],
    tierId: null,
    icon: Briefcase,
  },
  {
    id: 'business-talent',
    name: 'Business',
    description: 'Scale your hiring',
    priceMonthly: 49.99,
    priceYearly: 499,
    features: [
      { text: 'Unlimited job postings', included: true },
      { text: 'AI candidate ranking', included: true },
      { text: 'Advanced analytics dashboard', included: true },
      { text: 'Custom screening exams', included: true },
      { text: 'Priority support', included: true },
      { text: 'Team collaboration', included: true },
    ],
    tierId: 2,
    icon: Building,
    popular: true,
  },
];

export default function PricingPage() {
  const session = useSession();
  const [, setLocation] = useLocation();
  const [isYearly, setIsYearly] = useState(false);
  const [userType, setUserType] = useState<'candidate' | 'talent_owner'>('candidate');

  // Fetch current subscription status
  const { data: subscription, isLoading: subscriptionLoading } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/subscription/status'],
    enabled: !!session,
  });

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async ({ tierId, billingCycle }: { tierId: number; billingCycle: string }) => {
      const response = await apiRequest('POST', '/api/stripe/create-checkout', {
        tierId,
        billingCycle,
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
      return data;
    },
  });

  // Portal mutation (for managing existing subscription)
  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/stripe/portal');
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
      return data;
    },
  });

  const plans = userType === 'candidate' ? candidatePlans : talentOwnerPlans;
  const isPremium = subscription?.status === 'active';

  const handleSelectPlan = (tierId: number | null) => {
    if (!session) {
      // Redirect to auth with return URL
      setLocation('/auth?redirect=/pricing');
      return;
    }

    if (!tierId) {
      // Free plan - no action needed
      return;
    }

    checkoutMutation.mutate({
      tierId,
      billingCycle: isYearly ? 'yearly' : 'monthly',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setLocation('/')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <RecrutasLogo size={28} />
                <span className="font-semibold text-lg">Recrutas</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggleButton />
              {session ? (
                <Button variant="outline" size="sm" onClick={() => setLocation('/candidate-dashboard')}>
                  Dashboard
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setLocation('/auth')}>
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="h-3 w-3 mr-1" />
            Simple, transparent pricing
          </Badge>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Unlock your full potential with premium features. Start free, upgrade when you need more.
          </p>
        </div>

        {/* User Type Toggle */}
        <div className="flex justify-center gap-4 mb-8">
          <Button
            variant={userType === 'candidate' ? 'default' : 'outline'}
            onClick={() => setUserType('candidate')}
            className="gap-2"
          >
            <Target className="h-4 w-4" />
            For Job Seekers
          </Button>
          <Button
            variant={userType === 'talent_owner' ? 'default' : 'outline'}
            onClick={() => setUserType('talent_owner')}
            className="gap-2"
          >
            <Building className="h-4 w-4" />
            For Recruiters
          </Button>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <Label htmlFor="billing-toggle" className={!isYearly ? 'font-semibold' : 'text-muted-foreground'}>
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <Label htmlFor="billing-toggle" className={isYearly ? 'font-semibold' : 'text-muted-foreground'}>
            Yearly
          </Label>
          {isYearly && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Save 20%
            </Badge>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = isYearly ? plan.priceYearly : plan.priceMonthly;
            const isCurrentPlan = isPremium && plan.tierId === subscription?.tier;
            const isFreeAndActive = !plan.tierId && subscription?.status === 'free';

            return (
              <Card
                key={plan.id}
                className={`relative transition-all ${
                  plan.popular
                    ? 'border-primary shadow-lg scale-[1.02]'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}

                <CardHeader className="text-center pb-4">
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4 ${
                    plan.popular
                      ? 'bg-primary/10 text-primary'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="text-center pb-6">
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      ${price}
                    </span>
                    {price > 0 && (
                      <span className="text-gray-500 dark:text-gray-400">
                        /{isYearly ? 'year' : 'month'}
                      </span>
                    )}
                  </div>

                  <ul className="space-y-3 text-left">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                          feature.included
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                        }`}>
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
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    size="lg"
                    disabled={
                      checkoutMutation.isPending ||
                      isCurrentPlan ||
                      isFreeAndActive ||
                      (!plan.tierId && isPremium)
                    }
                    onClick={() => {
                      if (isPremium && !plan.tierId) {
                        // Downgrade - go to portal
                        portalMutation.mutate();
                      } else {
                        handleSelectPlan(plan.tierId);
                      }
                    }}
                  >
                    {checkoutMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrentPlan ? (
                      'Current Plan'
                    ) : isFreeAndActive ? (
                      'Current Plan'
                    ) : !plan.tierId ? (
                      session ? 'Current Plan' : 'Get Started Free'
                    ) : (
                      'Upgrade Now'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Manage Subscription */}
        {isPremium && (
          <div className="text-center mt-8">
            <Button
              variant="outline"
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
            >
              {portalMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Manage Subscription'
              )}
            </Button>
          </div>
        )}

        {/* Features Section */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-center mb-10 text-gray-900 dark:text-white">
            Why Upgrade to Premium?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">Unlimited AI Matches</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Get unlimited AI-powered job matches tailored to your skills and preferences.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 mx-auto rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">Advanced Analytics</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Deep insights into your hiring pipeline and application performance.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">Priority Support</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Get help when you need it with dedicated priority support.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Yes, you can cancel your subscription at any time. You'll continue to have access to premium features until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                We accept all major credit cards including Visa, Mastercard, and American Express through our secure payment partner Stripe.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Is there a free trial?</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Our free tier gives you access to basic features. You can upgrade to premium anytime to unlock all features.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 mt-20 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600 dark:text-gray-400 text-sm">
          <p>Secure payments powered by Stripe. Your payment information is never stored on our servers.</p>
        </div>
      </footer>
    </div>
  );
}
