import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

const CO2_PER_TREE_KG = 20 // Conservative estimate: 20kg CO2 per tree

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  if (topic !== "ORDERS_PAID") {
    return new Response();
  }

  const settings = await prisma.shopifySettings.findUnique({ where: { shop } });
  if (!settings || !settings.isEnabled) {
    return new Response();
  }

  let treesToPlant = 0;
  if (settings.triggerType === "fixed") {
    treesToPlant = settings.triggerValue;
  } else if (settings.triggerType === "threshold") {
    const totalAmount = parseFloat(payload.total_price || "0");
    treesToPlant = Math.floor(totalAmount / settings.triggerValue);
  }

  if (treesToPlant > 0) {
    const trees = Math.round(treesToPlant);
    const co2Offset = trees * CO2_PER_TREE_KG;

    // Get or create the shop record
    let shopRecord = await prisma.shopifyShop.findUnique({
      where: { shopDomain: shop }
    });

    if (!shopRecord) {
      shopRecord = await prisma.shopifyShop.create({
        data: {
          shopDomain: shop,
          shopName: payload.shop?.name || shop.replace('.myshopify.com', ''),
        }
      });
    }

    // Record impact in the unified impact_ledger table
    // Using raw SQL since impact_ledger is managed by the main app's schema
    await prisma.$executeRaw`
      INSERT INTO impact_ledger (
        source_type, source_id, trees_planted, co2_offset_kg,
        reference_id, reference_type, metadata
      ) VALUES (
        'shopify',
        ${shopRecord.id.toString()},
        ${trees},
        ${co2Offset},
        ${payload.id?.toString() || payload.order_number?.toString()},
        'order',
        ${JSON.stringify({
          shop: shop,
          order_id: payload.id,
          order_number: payload.order_number,
          total_price: payload.total_price,
          currency: payload.currency,
          customer_email: payload.email,
          trigger_type: settings.triggerType,
          trigger_value: settings.triggerValue,
        })}::jsonb
      )
    `;

    console.log(`Successfully recorded impact: ${trees} trees for ${shop} (order ${payload.order_number})`);
    // TODO: Call Tree-Nation / Ecologi API to actually plant trees
  }

  return new Response();
};
