import type { LoaderFunctionArgs } from "@remix-run/node"
import { json } from "@remix-run/node"
import prisma from "../db.server"

/**
 * GET /api/loyalty/impact/:customerId
 * Get a customer's impact history from loyalty redemptions
 * 
 * Required headers:
 * - X-Shop-Domain: The shop domain
 * - X-Api-Key: The loyalty API key
 * 
 * Response:
 * {
 *   customerId: string,
 *   totalTreesPlanted: number,
 *   totalCo2OffsetKg: number,
 *   totalPointsSpent: number,
 *   redemptions: Array<{
 *     id: string,
 *     treesPlanted: number,
 *     pointsSpent: number,
 *     loyaltyApp: string,
 *     createdAt: string
 *   }>
 * }
 */
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { customerId } = params
  const shopDomain = request.headers.get("X-Shop-Domain")
  const apiKey = request.headers.get("X-Api-Key")

  if (!shopDomain || !apiKey) {
    return json(
      { error: "Missing required headers: X-Shop-Domain, X-Api-Key" },
      { 
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*" }
      }
    )
  }

  if (!customerId) {
    return json(
      { error: "Missing customerId parameter" },
      { 
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*" }
      }
    )
  }

  // Verify API key
  const settings = await prisma.shopifySettings.findUnique({
    where: { shop: shopDomain },
  })

  if (!settings) {
    return json(
      { error: "Shop not found" },
      { 
        status: 404,
        headers: { "Access-Control-Allow-Origin": "*" }
      }
    )
  }

  if (!settings.loyaltyEnabled) {
    return json(
      { error: "Loyalty integration not enabled for this shop" },
      { 
        status: 403,
        headers: { "Access-Control-Allow-Origin": "*" }
      }
    )
  }

  if (settings.loyaltyApiKey !== apiKey) {
    return json(
      { error: "Invalid API key" },
      { 
        status: 401,
        headers: { "Access-Control-Allow-Origin": "*" }
      }
    )
  }

  // Get customer's redemption history
  const redemptions = await prisma.shopifyLoyaltyRedemption.findMany({
    where: {
      shop: shopDomain,
      customerId,
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  // Calculate totals
  const totalTreesPlanted = redemptions.reduce((sum, r) => sum + r.treesPlanted, 0)
  const totalPointsSpent = redemptions.reduce((sum, r) => sum + r.pointsSpent, 0)
  const totalCo2OffsetKg = totalTreesPlanted * 24

  return json(
    {
      customerId,
      totalTreesPlanted,
      totalCo2OffsetKg,
      totalPointsSpent,
      redemptionCount: redemptions.length,
      redemptions: redemptions.map((r) => ({
        id: r.id,
        treesPlanted: r.treesPlanted,
        pointsSpent: r.pointsSpent,
        co2OffsetKg: r.treesPlanted * 24,
        loyaltyApp: r.loyaltyApp,
        createdAt: r.createdAt.toISOString(),
      })),
    },
    {
      headers: { "Access-Control-Allow-Origin": "*" }
    }
  )
}
