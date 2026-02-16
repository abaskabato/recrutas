export interface PricingFeature {
  text: string;
  included: boolean;
}

export interface PricingPlan {
  tierName: string | null; // null = free tier (no DB lookup needed)
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: PricingFeature[];
  popular?: boolean;
}

// Candidates are 100% FREE - no paid tiers
export const CANDIDATE_PLANS: PricingPlan[] = [
  {
    tierName: null,
    name: 'Free Forever',
    description: 'All features included at no cost',
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      { text: 'Unlimited AI job matches', included: true },
      { text: 'AI resume enhancement', included: true },
      { text: 'Apply to unlimited jobs', included: true },
      { text: 'Application tracking', included: true },
      { text: 'Interview preparation tools', included: true },
      { text: 'Priority support', included: true },
    ],
  },
];

// Talent owner / recruiter plans
export const TALENT_OWNER_PLANS: PricingPlan[] = [
  {
    tierName: null,
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
  },
  {
    tierName: 'Growth',
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
    popular: true,
  },
  {
    tierName: 'Scale',
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
  },
];
