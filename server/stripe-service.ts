import Stripe from "stripe";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

export async function getOrCreateStripeCustomer(userId: string, email: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  });

  await db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, userId));

  return customer.id;
}

export async function createCheckoutSession(userId: string, email: string, priceId: string) {
  const customerId = await getOrCreateStripeCustomer(userId, email);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
  });

  return session;
}

export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

      await db
        .update(users)
        .set({
          stripeSubscriptionId: subscription.id,
          stripeSubscriptionStatus: subscription.status,
        })
        .where(eq(users.stripeCustomerId, customerId));
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await db
        .update(users)
        .set({
          stripeSubscriptionId: null,
          stripeSubscriptionStatus: null,
        })
        .where(eq(users.stripeSubscriptionId, subscription.id));
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
}
