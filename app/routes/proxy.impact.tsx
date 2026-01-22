import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * App Proxy endpoint to fetch impact data for storefront display.
 * This endpoint is called from the store's front-end via the app proxy.
 * URL: /apps/afforestation/impact
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const shop = session.shop;

  // Get shop record
  const shopRecord = await prisma.shopifyShop.findUnique({
    where: { shopDomain: shop }
  });

  if (!shopRecord) {
    return json(
      {
        treesPlanted: 0,
        co2Offset: 0,
        ordersContributing: 0,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      }
    );
  }

  // Query impact from the unified impact_ledger
  let treesPlanted = 0;
  let co2Offset = 0;
  let ordersContributing = 0;

  try {
    const impactResult = await prisma.$queryRaw<Array<{
      total_trees_planted: bigint | null;
      total_co2_offset_kg: number | null;
      total_orders: bigint | null;
    }>>`
      SELECT 
        COALESCE(SUM(trees_planted), 0) as total_trees_planted,
        COALESCE(SUM(co2_offset_kg), 0) as total_co2_offset_kg,
        COUNT(*) as total_orders
      FROM impact_ledger
      WHERE source_type = 'shopify' AND source_id = ${shopRecord.id.toString()}
    `;

    if (impactResult.length > 0) {
      treesPlanted = Number(impactResult[0].total_trees_planted || 0);
      co2Offset = Number(impactResult[0].total_co2_offset_kg || 0);
      ordersContributing = Number(impactResult[0].total_orders || 0);
    }
  } catch (error) {
    // impact_ledger table might not exist yet, return zeros
    console.warn("Could not query impact_ledger:", error);
  }

  // Return CORS-friendly JSON response
  return json(
    {
      treesPlanted,
      co2Offset,
      ordersContributing,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    }
  );
};
