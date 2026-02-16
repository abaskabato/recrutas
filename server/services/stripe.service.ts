/**
 * Stripe Service - Subscription and Payment Management
 *
 * Handles:
 * - Checkout session creation
 * - Webhook processing
 * - Subscription management
 * - Feature access control
 * - Usage tracking
 */

import Stripe from 'stripe';
import { db } from '../db';
import {
  userSubscriptions,
  subscriptionTiers,
  usageTracking,
  users
} from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { sql, gte, lte } from 'drizzle-orm/sql';

// Free tier limits - Candidates get unlimited everything (100% free model)
const FREE_TIER_LIMITS: Record<string, number> = {
  ai_match: -1,        // Unlimited for candidates
  job_post: 3,         // 3 active job postings (for talent owners)
  resume_enhancement: -1, // Unlimited for candidates
  candidate_ranking: 0,  // No AI candidate ranking on free tier
  analytics: 0,         // No advanced analytics on free tier
};

// Premium tier limits (-1 means unlimited)
const PREMIUM_TIER_LIMITS: Record<string, number> = {
  ai_match: -1,
  job_post: -1,
  resume_enhancement: -1,
  candidate_ranking: -1,
  analytics: -1,
};

class StripeService {
  private stripe: Stripe | null = null;

  constructor() {
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-12-15.clover',
      });
    } else {
      console.log('[StripeService] STRIPE_SECRET_KEY not configured - payment features disabled');
    }
  }

  /**
   * Check if Stripe is configured
   */
  isConfigured(): boolean {
    return this.stripe !== null;
  }

  /**
   * Create a Stripe checkout session for subscription
   */
  async createCheckoutSession(
    userId: string,
    tierId: number,
    billingCycle: 'monthly' | 'yearly'
  ): Promise<string> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    // Get the subscription tier
    const [tier] = await db.select()
      .from(subscriptionTiers)
      .where(eq(subscriptionTiers.id, tierId));

    if (!tier) {
      throw new Error('Invalid subscription tier');
    }

    const priceId = billingCycle === 'monthly'
      ? tier.stripePriceIdMonthly
      : tier.stripePriceIdYearly;

    if (!priceId) {
      throw new Error('Price not configured for this tier and billing cycle');
    }

    // Get or create Stripe customer
    const customerId = await this.getOrCreateCustomer(userId);

    // Create checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.APP_URL || 'http://localhost:5000'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:5000'}/pricing`,
      metadata: {
        userId,
        tierId: tierId.toString(),
      },
    });

    return session.url!;
  }

  /**
   * Create a customer portal session for managing subscription
   */
  async createPortalSession(userId: string): Promise<string> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    const [subscription] = await db.select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId));

    if (!subscription?.stripeCustomerId) {
      throw new Error('No subscription found');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.APP_URL || 'http://localhost:5000'}/settings/subscription`,
    });

    return session.url;
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    console.log(`[StripeService] Processing webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[StripeService] Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Get user's subscription status
   */
  async getUserSubscription(userId: string): Promise<{
    status: string;
    tier: string | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    limits: Record<string, number>;
  }> {
    const [subscription] = await db.select({
      subscription: userSubscriptions,
      tier: subscriptionTiers,
    })
      .from(userSubscriptions)
      .leftJoin(subscriptionTiers, eq(userSubscriptions.tierId, subscriptionTiers.id))
      .where(eq(userSubscriptions.userId, userId));

    if (!subscription || subscription.subscription.status === 'free') {
      return {
        status: 'free',
        tier: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        limits: FREE_TIER_LIMITS,
      };
    }

    const tierLimits = subscription.tier?.limits as Record<string, number> || PREMIUM_TIER_LIMITS;

    return {
      status: subscription.subscription.status || 'free',
      tier: subscription.tier?.name || null,
      currentPeriodEnd: subscription.subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.subscription.cancelAtPeriodEnd || false,
      limits: tierLimits,
    };
  }

  /**
   * Check if user can access a feature
   */
  async canAccessFeature(userId: string, feature: string): Promise<{
    allowed: boolean;
    remaining: number | null;
    limit: number;
    message?: string;
  }> {
    const subscription = await this.getUserSubscription(userId);
    const limit = subscription.limits[feature];

    // Unlimited access
    if (limit === -1) {
      return { allowed: true, remaining: null, limit: -1 };
    }

    // Feature not available
    if (limit === 0) {
      return {
        allowed: false,
        remaining: 0,
        limit: 0,
        message: `${feature} is a premium feature. Upgrade to access.`,
      };
    }

    // Check usage for limited feature
    const usage = await this.getUsageCount(userId, feature);
    const remaining = Math.max(0, limit - usage);

    if (remaining <= 0) {
      return {
        allowed: false,
        remaining: 0,
        limit,
        message: `Daily ${feature} limit reached (${limit}). Upgrade for unlimited access.`,
      };
    }

    return { allowed: true, remaining, limit };
  }

  /**
   * Track feature usage
   */
  async trackUsage(userId: string, featureType: string): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    // Try to update existing record for today
    const result = await db.update(usageTracking)
      .set({
        usageCount: sql`${usageTracking.usageCount} + 1`,
      })
      .where(and(
        eq(usageTracking.userId, userId),
        eq(usageTracking.featureType, featureType as any),
        gte(usageTracking.periodStart, periodStart),
        lte(usageTracking.periodEnd, periodEnd)
      ))
      .returning();

    // If no existing record, create new one
    if (result.length === 0) {
      await db.insert(usageTracking).values({
        userId,
        featureType: featureType as any,
        usageCount: 1,
        periodStart,
        periodEnd,
      });
    }
  }

  /**
   * Get usage count for a feature
   */
  private async getUsageCount(userId: string, feature: string): Promise<number> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [usage] = await db.select({
      count: usageTracking.usageCount,
    })
      .from(usageTracking)
      .where(and(
        eq(usageTracking.userId, userId),
        eq(usageTracking.featureType, feature as any),
        gte(usageTracking.periodStart, periodStart)
      ));

    return usage?.count || 0;
  }

  /**
   * Get or create Stripe customer
   */
  private async getOrCreateCustomer(userId: string): Promise<string> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    // Check for existing subscription with customer ID
    const [existing] = await db.select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId));

    if (existing?.stripeCustomerId) {
      return existing.stripeCustomerId;
    }

    // Get user email
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId));

    // Create new Stripe customer
    const customer = await this.stripe.customers.create({
      email: user?.email,
      metadata: { userId },
    });

    // Store customer ID
    await db.insert(userSubscriptions).values({
      userId,
      stripeCustomerId: customer.id,
      status: 'free',
    }).onConflictDoUpdate({
      target: userSubscriptions.userId,
      set: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  /**
   * Handle checkout completion
   */
  private async handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
    const { userId, tierId } = session.metadata || {};

    if (!userId || !tierId) {
      console.error('[StripeService] Missing metadata in checkout session');
      return;
    }

    await db.update(userSubscriptions)
      .set({
        tierId: parseInt(tierId),
        stripeSubscriptionId: session.subscription as string,
        status: 'active',
        currentPeriodStart: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.userId, userId));

    console.log(`[StripeService] User ${userId} subscribed to tier ${tierId}`);
  }

  /**
   * Handle subscription update
   */
  private async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;

    await db.update(userSubscriptions)
      .set({
        status: this.mapStripeStatus(subscription.status),
        currentPeriodStart: new Date((subscription.start_date ?? subscription.billing_cycle_anchor) * 1000),
        currentPeriodEnd: subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000)
          : new Date(Date.now()),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.stripeCustomerId, customerId));
  }

  /**
   * Handle subscription cancellation
   */
  private async handleSubscriptionCanceled(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;

    await db.update(userSubscriptions)
      .set({
        status: 'canceled',
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.stripeCustomerId, customerId));

    console.log(`[StripeService] Subscription canceled for customer ${customerId}`);
  }

  /**
   * Handle payment failure
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.parent?.subscription_details?.subscription) return;

    const customerId = invoice.customer as string;

    await db.update(userSubscriptions)
      .set({
        status: 'past_due',
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.stripeCustomerId, customerId));

    console.log(`[StripeService] Payment failed for customer ${customerId}`);
  }

  /**
   * Handle payment success
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.parent?.subscription_details?.subscription) return;

    const customerId = invoice.customer as string;

    // Reactivate subscription if it was past due
    await db.update(userSubscriptions)
      .set({
        status: 'active',
        updatedAt: new Date(),
      })
      .where(and(
        eq(userSubscriptions.stripeCustomerId, customerId),
        eq(userSubscriptions.status, 'past_due')
      ));
  }

  /**
   * Map Stripe status to our status
   */
  private mapStripeStatus(stripeStatus: string): 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'free' {
    const statusMap: Record<string, any> = {
      active: 'active',
      canceled: 'canceled',
      past_due: 'past_due',
      trialing: 'trialing',
      incomplete: 'incomplete',
      incomplete_expired: 'canceled',
      unpaid: 'past_due',
    };
    return statusMap[stripeStatus] || 'free';
  }

  /**
   * Construct webhook event from raw body
   */
  constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  /**
   * Get available subscription tiers
   */
  async getAvailableTiers(): Promise<any[]> {
    const tiers = await db.select()
      .from(subscriptionTiers)
      .where(eq(subscriptionTiers.isActive, true));

    return tiers;
  }

  /**
   * Initialize default subscription tiers (run once on setup)
   * Updated 2025: Candidates are free, Recruiters have 3 tiers
   */
  async initializeDefaultTiers(): Promise<void> {
    const existingTiers = await db.select().from(subscriptionTiers);

    if (existingTiers.length > 0) {
      console.log('[StripeService] Subscription tiers already exist');
      return;
    }

    const defaultTiers = [
      // Candidates are 100% free - no paid tiers
      {
        name: 'Candidate Free',
        type: 'candidate' as const,
        priceMonthly: 0,
        priceYearly: 0,
        features: [
          'Unlimited AI job matches',
          'AI resume enhancement',
          'Apply to unlimited jobs',
          'Application tracking',
          'Interview preparation tools',
          'Priority support',
        ],
        limits: PREMIUM_TIER_LIMITS, // All features unlocked for free
        isActive: true,
      },
      {
        name: 'Growth',
        type: 'talent_owner' as const,
        priceMonthly: 14900, // $149.00
        priceYearly: 149000, // $1,490.00
        features: [
          '10 active job postings',
          'AI candidate ranking',
          'Advanced analytics',
          'Custom screening exams',
          'Priority support',
          'Team collaboration (3 users)',
        ],
        limits: {
          ...PREMIUM_TIER_LIMITS,
          job_post: 10, // Limited to 10 postings
        },
        isActive: true,
      },
      {
        name: 'Scale',
        type: 'talent_owner' as const,
        priceMonthly: 29900, // $299.00
        priceYearly: 299000, // $2,990.00
        features: [
          'Unlimited job postings',
          'AI candidate ranking',
          'Advanced analytics',
          'Custom screening exams',
          'Priority support',
          'Unlimited team members',
          'API access',
          'Dedicated account manager',
        ],
        limits: PREMIUM_TIER_LIMITS,
        isActive: true,
      },
    ];

    await db.insert(subscriptionTiers).values(defaultTiers);
    console.log('[StripeService] Default subscription tiers created (2025 pricing)');
  }
}

export const stripeService = new StripeService();
