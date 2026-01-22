import type { LoaderFunctionArgs } from "@remix-run/node"
import { json } from "@remix-run/node"
import prisma from "../db.server"

/**
 * GET /api/loyalty/rates
 * Get redemption rates for a shop
 * 
 * Required headers:
 * - X-Shop-Domain: The shop domain
 * - X-Api-Key: The loyalty API key (optional for public rate info)
 * 
 * Response:
 * {
 *   pointsPerTree: number,
 *   costPerTree: number,
 *   co2PerTree: number,
 *   enabled: boolean,
 *   monthlyLimit: number | null,
 *   monthlyRemaining: number | null
 * }
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const shopDomain = request.headers.get("X-Shop-Domain")
  const apiKey = request.headers.get("X-Api-Key")

  if (!shopDomain) {
    return json(
      { error: "Missing required header: X-Shop-Domain" },
      { 
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        }
      }
    )
  }

  const settings = await prisma.shopifySettings.findUnique({
    where: { shop: shopDomain },
  })

  if (!settings) {
    return json(
      { error: "Shop not found" },
      { 
        status: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
        }
      }
    )
  }

  // Public info - doesn't require API key
  const publicInfo = {
    pointsPerTree: settings.pointsPerTree || 200,
    costPerTree: settings.costPerTree || 0.5,
    co2PerTree: 24, // ~24kg CO2 sequestered per tree
    enabled: settings.loyaltyEnabled,
  }

  // Extended info for authenticated requests
  if (apiKey && settings.loyaltyApiKey === apiKey) {
    const monthlyRemaining = settings.monthlyLimit 
      ? Math.max(0, settings.monthlyLimit - settings.monthlySpent)
      : null

    return json(
      {
        ...publicInfo,
        monthlyLimit: settings.monthlyLimit,
        monthlySpent: settings.monthlySpent,
        monthlyRemaining,
        treesRemainingThisMonth: monthlyRemaining 
          ? Math.floor(monthlyRemaining / (settings.costPerTree || 0.5))
          : null,
        isPaused: settings.isPaused,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
        }
      }
    )
  }

  return json(publicInfo, {
    headers: {
      "Access-Control-Allow-Origin": "*",
    }
  })
}
