import type { ActionFunctionArgs } from "@remix-run/node"
import { json } from "@remix-run/node"
import prisma from "../db.server"
import crypto from "crypto"

/**
 * POST /api/loyalty/redeem
 * Redeem loyalty points for tree planting
 * 
 * Required headers:
 * - X-Shop-Domain: The shop domain
 * - X-Api-Key: The loyalty API key
 * 
 * Body:
 * {
 *   customerId: string,
 *   customerEmail?: string,
 *   pointsSpent: number,
 *   loyaltyApp: string,  // "smile", "yotpo", "loyaltylion", etc.
 *   externalId?: string  // ID from loyalty app for reference
 * }
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 })
  }

  const shopDomain = request.headers.get("X-Shop-Domain")
  const apiKey = request.headers.get("X-Api-Key")

  if (!shopDomain || !apiKey) {
    return json(
      { error: "Missing required headers: X-Shop-Domain, X-Api-Key" },
      { status: 400 }
    )
  }

  // Verify API key
  const settings = await prisma.shopifySettings.findUnique({
    where: { shop: shopDomain },
  })

  if (!settings) {
    return json({ error: "Shop not found" }, { status: 404 })
  }

  if (!settings.loyaltyEnabled) {
    return json({ error: "Loyalty integration not enabled for this shop" }, { status: 403 })
  }

  if (settings.loyaltyApiKey !== apiKey) {
    return json({ error: "Invalid API key" }, { status: 401 })
  }

  // Parse request body
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { customerId, customerEmail, pointsSpent, loyaltyApp, externalId } = body

  if (!customerId || !pointsSpent || !loyaltyApp) {
    return json(
      { error: "Missing required fields: customerId, pointsSpent, loyaltyApp" },
      { status: 400 }
    )
  }

  if (typeof pointsSpent !== "number" || pointsSpent < 1) {
    return json({ error: "pointsSpent must be a positive number" }, { status: 400 })
  }

  // Calculate trees based on points
  const pointsPerTree = settings.pointsPerTree || 200
  const treesPlanted = Math.floor(pointsSpent / pointsPerTree)

  if (treesPlanted < 1) {
    return json(
      { error: `Minimum ${pointsPerTree} points required to plant 1 tree` },
      { status: 400 }
    )
  }

  // Check spending limits if enabled
  if (settings.monthlyLimit && settings.monthlyLimit > 0) {
    const treeCost = treesPlanted * (settings.costPerTree || 0.5)
    if (settings.monthlySpent + treeCost > settings.monthlyLimit) {
      return json(
        { error: "Monthly spending limit reached" },
        { status: 429 }
      )
    }
  }

  // Create redemption record
  const redemption = await prisma.shopifyLoyaltyRedemption.create({
    data: {
      shop: shopDomain,
      customerId,
      customerEmail: customerEmail || null,
      pointsSpent,
      treesPlanted,
      loyaltyApp,
      externalId: externalId || null,
    },
  })

  // Update monthly spend
  const treeCost = treesPlanted * (settings.costPerTree || 0.5)
  await prisma.shopifySettings.update({
    where: { shop: shopDomain },
    data: {
      monthlySpent: { increment: treeCost },
    },
  })

  // Record in impact ledger
  try {
    const shopRecord = await prisma.shopifyShop.findUnique({
      where: { shopDomain },
    })

    if (shopRecord) {
      await prisma.$executeRaw`
        INSERT INTO impact_ledger (source_type, source_id, trees_planted, co2_offset_kg, notes, created_at)
        VALUES ('shopify_loyalty', ${shopRecord.id.toString()}, ${treesPlanted}, ${treesPlanted * 24}, ${`Loyalty redemption: ${pointsSpent} points from ${loyaltyApp}`}, NOW())
      `
    }
  } catch (error) {
    console.warn("Could not record in impact_ledger:", error)
  }

  return json({
    success: true,
    redemption: {
      id: redemption.id,
      treesPlanted: redemption.treesPlanted,
      pointsSpent: redemption.pointsSpent,
      co2OffsetKg: treesPlanted * 24,
      createdAt: redemption.createdAt,
    },
  })
}

// Handle OPTIONS for CORS
export const loader = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Shop-Domain, X-Api-Key",
      },
    })
  }
  
  return json({ error: "Method not allowed" }, { status: 405 })
}
