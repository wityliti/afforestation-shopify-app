import type { LoaderFunctionArgs } from "@remix-run/node"
import { json } from "@remix-run/node"
import { authenticate } from "../shopify.server"
import prisma from "../db.server"

/**
 * App Proxy endpoint to fetch impact data for storefront display.
 * This endpoint returns only:
 * - Real impact numbers (trees planted, CO2 offset, orders)
 * - Business settings (trigger type, value)
 * - Global enable/disable states
 * 
 * Visual settings are now handled directly in the Theme Editor.
 * 
 * URL: /apps/afforestation/impact
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request)

  if (!session) {
    return json({ error: "Unauthorized" }, { status: 401 })
  }

  const shop = session.shop

  // Get shop record and settings
  const [shopRecord, settings, widgetStyles] = await Promise.all([
    prisma.shopifyShop.findUnique({
      where: { shopDomain: shop }
    }),
    prisma.shopifySettings.findUnique({
      where: { shop }
    }),
    prisma.shopifyWidgetStyles.findUnique({
      where: { shop }
    })
  ])

  // Query real impact data
  let treesPlanted = 0
  let co2Offset = 0
  let ordersContributing = 0

  if (shopRecord) {
    try {
      const impactResult = await prisma.$queryRaw<Array<{
        total_trees_planted: bigint | null
        total_co2_offset_kg: number | null
        total_orders: bigint | null
      }>>`
        SELECT 
          COALESCE(SUM(trees_planted), 0) as total_trees_planted,
          COALESCE(SUM(co2_offset_kg), 0) as total_co2_offset_kg,
          COUNT(*) as total_orders
        FROM impact_ledger
        WHERE source_type = 'shopify' AND source_id = ${shopRecord.id.toString()}
      `

      if (impactResult.length > 0) {
        treesPlanted = Number(impactResult[0].total_trees_planted || 0)
        co2Offset = Number(impactResult[0].total_co2_offset_kg || 0)
        ordersContributing = Number(impactResult[0].total_orders || 0)
      }
    } catch (error) {
      console.warn("Could not query impact_ledger:", error)
    }
  }

  // Calculate trees per order based on trigger type
  const triggerType = settings?.triggerType ?? "fixed"
  const triggerValue = settings?.triggerValue ?? 1
  const treesPerOrder = triggerType === "fixed" ? triggerValue : 1

  // Return CORS-friendly JSON response with only business data
  return json(
    {
      // Real impact numbers
      treesPlanted,
      co2Offset,
      ordersContributing,
      
      // Business settings for widgets that need them
      triggerType,
      triggerValue,
      treesPerOrder,
      
      // Global enable/disable states (for app embeds)
      bannerEnabled: widgetStyles?.bannerEnabled ?? true,
      footerEnabled: widgetStyles?.footerEnabled ?? true,
      
      // Impact type
      impactType: settings?.impactType ?? "trees",
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    }
  )
}
