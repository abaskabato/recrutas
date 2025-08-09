import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Pro",
    priceId: "price_1234567890", // Replace with your actual price ID
    price: "$49/mo",
    features: [
      "Unlimited Job Postings",
      "Unlimited Candidate Matches",
      "Direct Chat with Candidates",
      "Advanced Application Intelligence",
      "Priority Support",
    ],
  },
];

export default function PricingPage() {
  const mutation = useMutation({
    mutationFn: (priceId: string) => {
      return apiRequest("/api/stripe/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({ priceId }),
      });
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Pricing
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
            Choose the plan that's right for you.
          </p>
        </div>

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-1 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0">
          {plans.map((plan) => (
            <Card key={plan.name} className="divide-y divide-gray-200">
              <CardHeader className="p-6">
                <h2 className="text-lg leading-6 font-medium text-gray-900">{plan.name}</h2>
                <p className="mt-4 text-sm text-gray-500">All the features you need to hire the best talent.</p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <div className="flex-shrink-0">
                        <Check className="h-6 w-6 text-green-500" />
                      </div>
                      <p className="ml-3 text-base font-medium text-gray-500">{feature}</p>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => mutation.mutate(plan.priceId)}
                  disabled={mutation.isPending}
                  className="mt-8 w-full"
                >
                  {mutation.isPending ? "Redirecting..." : "Subscribe"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
