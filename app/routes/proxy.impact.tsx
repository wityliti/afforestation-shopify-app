import type { LoaderFunctionArgs } from "@remix-run/node"
import { json } from "@remix-run/node"
import { authenticate } from "../shopify.server"
import prisma from "../db.server"

const FOREST_THEMES: Record<string, string[]> = {
  mixed: ["🌳", "🌲", "🌴", "🌿"],
  pine: ["🌲", "🎄", "🌲", "🎋"],
  deciduous: ["🌳", "🍂", "🍁", "🌳"],
  tropical: ["🌴", "🌺", "🌸", "🌴"],
}

/**
 * App Proxy endpoint to fetch impact data and widget settings for storefront display.
 * This endpoint is called from the store's front-end via the app proxy.
 * URL: /apps/afforestation/impact
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request)

  if (!session) {
    return json({ error: "Unauthorized" }, { status: 401 })
  }

  const shop = session.shop

  // Get shop record and settings
  const [shopRecord, settings] = await Promise.all([
    prisma.shopifyShop.findUnique({
      where: { shopDomain: shop }
    }),
    prisma.shopifySettings.findUnique({
      where: { shop }
    })
  ])

  // Default widget settings
  const defaultSettings = {
    widgetTheme: "light",
    primaryColor: "#2d5a27",
    secondaryColor: "#4ade80",
    backgroundColor: "#f0f9f0",
    textColor: "#1a1a1a",
    borderRadius: "rounded",
    borderColor: "#d4edda",
    fontFamily: "inherit",
    showAnimation: true,
    animationType: "pulse",
    treeEmoji: "🌳",
    showTreeCount: true,
    customMessage: "This purchase plants {count} tree{s}!",
    forestTheme: "mixed",
    forestBackground: "#fdfdfd",
    showCo2Stats: true,
    forestTitle: "Our Virtual Forest",
    forestSubtitle: "Watch our forest grow with every purchase",
  }

  // Merge settings with defaults
  const widgetSettings = {
    widgetTheme: settings?.widgetTheme ?? defaultSettings.widgetTheme,
    primaryColor: settings?.primaryColor ?? defaultSettings.primaryColor,
    secondaryColor: settings?.secondaryColor ?? defaultSettings.secondaryColor,
    backgroundColor: settings?.backgroundColor ?? defaultSettings.backgroundColor,
    textColor: settings?.textColor ?? defaultSettings.textColor,
    borderRadius: settings?.borderRadius ?? defaultSettings.borderRadius,
    borderColor: settings?.borderColor ?? defaultSettings.borderColor,
    fontFamily: settings?.fontFamily ?? defaultSettings.fontFamily,
    showAnimation: settings?.showAnimation ?? defaultSettings.showAnimation,
    animationType: settings?.animationType ?? defaultSettings.animationType,
    treeEmoji: settings?.treeEmoji ?? defaultSettings.treeEmoji,
    showTreeCount: settings?.showTreeCount ?? defaultSettings.showTreeCount,
    customMessage: settings?.customMessage ?? defaultSettings.customMessage,
    forestTheme: settings?.forestTheme ?? defaultSettings.forestTheme,
    forestBackground: settings?.forestBackground ?? defaultSettings.forestBackground,
    showCo2Stats: settings?.showCo2Stats ?? defaultSettings.showCo2Stats,
    forestTitle: settings?.forestTitle ?? defaultSettings.forestTitle,
    forestSubtitle: settings?.forestSubtitle ?? defaultSettings.forestSubtitle,
    forestEmojis: FOREST_THEMES[settings?.forestTheme ?? "mixed"] || FOREST_THEMES.mixed,
    treesPerOrder: settings?.triggerType === "fixed" ? (settings?.triggerValue ?? 1) : 1,
  }

  if (!shopRecord) {
    return json(
      {
        treesPlanted: 0,
        co2Offset: 0,
        ordersContributing: 0,
        settings: widgetSettings,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      }
    )
  }

  // Query impact from the unified impact_ledger
  let treesPlanted = 0
  let co2Offset = 0
  let ordersContributing = 0

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
    // impact_ledger table might not exist yet, return zeros
    console.warn("Could not query impact_ledger:", error)
  }

  // Return CORS-friendly JSON response with settings
  return json(
    {
      treesPlanted,
      co2Offset,
      ordersContributing,
      settings: widgetSettings,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    }
  )
}
