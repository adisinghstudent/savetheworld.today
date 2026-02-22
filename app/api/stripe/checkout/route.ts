import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { amount } = await req.json();

    // Amount in cents, minimum $1, maximum $1000
    const cents = Math.round(Number(amount) * 100);
    if (!cents || cents < 100 || cents > 100000) {
      return NextResponse.json(
        { error: "Amount must be between $1 and $1,000" },
        { status: 400 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: cents,
      currency: "usd",
      description: "Your Support to Save the World",
      metadata: {
        product: "savetheworld-donation",
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
