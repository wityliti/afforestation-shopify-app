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
 * Parse message variables and replace with actual values
 * Available variables: {count}, {s}, {kg}, {percent}, {amount}, {total}
 */
function parseMessageVariables(message: string, data: {
  count?: number
  kg?: number
  percent?: number
  amount?: number
  total?: number
}): string {
  let parsed = message
  
  // Replace {count} with tree count
  if (data.count !== undefined) {
    parsed = parsed.replace(/{count}/g, data.count.toString())
  }
  
  // Replace {s} with plural suffix
  if (data.count !== undefined) {
    parsed = parsed.replace(/{s}/g, data.count === 1 ? '' : 's')
  }
  
  // Replace {kg} with CO2 kilograms
  if (data.kg !== undefined) {
    parsed = parsed.replace(/{kg}/g, data.kg.toLocaleString())
  }
  
  // Replace {percent} with percentage
  if (data.percent !== undefined) {
    parsed = parsed.replace(/{percent}/g, data.percent.toString())
  }
  
  // Replace {amount} with currency amount
  if (data.amount !== undefined) {
    parsed = parsed.replace(/{amount}/g, data.amount.toLocaleString())
  }
  
  // Replace {total} with total trees planted
  if (data.total !== undefined) {
    parsed = parsed.replace(/{total}/g, data.total.toLocaleString())
  }
  
  return parsed
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

  // Get shop record, core settings, and widget styles
  const [shopRecord, settings] = await Promise.all([
    prisma.shopifyShop.findUnique({
      where: { shopDomain: shop }
    }),
    prisma.shopifySettings.findUnique({
      where: { shop },
      include: { widgetStyles: true }
    })
  ])

  const styles = settings?.widgetStyles

  // Default widget settings
  const defaultStyles = {
    widgetTheme: "light",
    primaryColor: "#2d5a27",
    secondaryColor: "#4ade80",
    backgroundColor: "#f0fdf4",
    textColor: "#14532d",
    borderRadius: "rounded",
    borderColor: "#bbf7d0",
    fontFamily: "inherit",
    showAnimation: true,
    animationType: "pulse",
    treeEmoji: "🌳",
    showTreeCount: true,
    impactMessage: "This purchase plants {count} tree{s}!",
    forestTheme: "mixed",
    forestBackground: "#fdfdfd",
    showCo2Stats: true,
    forestTitle: "Our Virtual Forest",
    forestSubtitle: "Watch our forest grow with every purchase",
    bannerEnabled: true,
    bannerMessage: "{percent}% of every order funds climate action",
    bannerStyle: "standard",
    showBannerBranding: true,
    bannerIcon: "🌳",
    footerEnabled: true,
    footerStyle: "standard",
    footerLayout: "horizontal",
    showFooterAnimation: true,
    showFooterBranding: true,
    footerMessage: "{total} trees planted",
  }

  // Query impact data first to use in variable parsing
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
  const treesPerOrder = settings?.triggerType === "fixed" ? (settings?.triggerValue ?? 1) : 1
  const triggerPercent = settings?.triggerType === "percentage" ? (settings?.triggerValue ?? 1) : 1
  const triggerAmount = settings?.triggerType === "threshold" ? (settings?.triggerValue ?? 50) : 50

  // Variable data for message parsing
  const variableData = {
    count: treesPerOrder,
    kg: Math.round(treesPerOrder * 24), // ~24kg CO2 per tree
    percent: triggerPercent,
    amount: triggerAmount,
    total: treesPlanted,
  }

  // Build widget settings with parsed messages
  const widgetSettings = {
    // Theme & Colors
    widgetTheme: styles?.widgetTheme ?? defaultStyles.widgetTheme,
    primaryColor: styles?.primaryColor ?? defaultStyles.primaryColor,
    secondaryColor: styles?.secondaryColor ?? defaultStyles.secondaryColor,
    backgroundColor: styles?.backgroundColor ?? defaultStyles.backgroundColor,
    textColor: styles?.textColor ?? defaultStyles.textColor,
    borderRadius: styles?.borderRadius ?? defaultStyles.borderRadius,
    borderColor: styles?.borderColor ?? defaultStyles.borderColor,
    fontFamily: styles?.fontFamily ?? defaultStyles.fontFamily,
    
    // Animation
    showAnimation: styles?.showAnimation ?? defaultStyles.showAnimation,
    animationType: styles?.animationType ?? defaultStyles.animationType,
    treeEmoji: styles?.treeEmoji ?? defaultStyles.treeEmoji,
    
    // Impact Widget - parse message variables
    impactMessage: parseMessageVariables(
      styles?.impactMessage ?? defaultStyles.impactMessage,
      variableData
    ),
    showTreeCount: styles?.showTreeCount ?? defaultStyles.showTreeCount,
    treesPerOrder,
    
    // Banner - parse message variables
    bannerEnabled: styles?.bannerEnabled ?? defaultStyles.bannerEnabled,
    bannerMessage: parseMessageVariables(
      styles?.bannerMessage ?? defaultStyles.bannerMessage,
      variableData
    ),
    bannerStyle: styles?.bannerStyle ?? defaultStyles.bannerStyle,
    bannerIcon: styles?.bannerIcon ?? defaultStyles.bannerIcon,
    showBannerBranding: styles?.showBannerBranding ?? defaultStyles.showBannerBranding,
    
    // Footer - parse message variables
    footerEnabled: styles?.footerEnabled ?? defaultStyles.footerEnabled,
    footerMessage: parseMessageVariables(
      styles?.footerMessage ?? defaultStyles.footerMessage,
      variableData
    ),
    footerStyle: styles?.footerStyle ?? defaultStyles.footerStyle,
    footerLayout: styles?.footerLayout ?? defaultStyles.footerLayout,
    showFooterAnimation: styles?.showFooterAnimation ?? defaultStyles.showFooterAnimation,
    showFooterBranding: styles?.showFooterBranding ?? defaultStyles.showFooterBranding,
    
    // Forest
    forestTitle: styles?.forestTitle ?? defaultStyles.forestTitle,
    forestSubtitle: styles?.forestSubtitle ?? defaultStyles.forestSubtitle,
    forestTheme: styles?.forestTheme ?? defaultStyles.forestTheme,
    forestBackground: styles?.forestBackground ?? defaultStyles.forestBackground,
    showCo2Stats: styles?.showCo2Stats ?? defaultStyles.showCo2Stats,
    forestEmojis: FOREST_THEMES[styles?.forestTheme ?? "mixed"] || FOREST_THEMES.mixed,
    
    // Trigger settings (for reference)
    triggerType: settings?.triggerType ?? "fixed",
    triggerValue: settings?.triggerValue ?? 1,
    impactType: settings?.impactType ?? "trees",
  }

  // Return CORS-friendly JSON response
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
