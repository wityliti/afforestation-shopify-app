import type { ActionFunctionArgs } from "@remix-run/node"
import { json } from "@remix-run/node"
import prisma from "../db.server"

/**
 * Shopify Flow Action Handler: Plant Trees
 * 
 * This endpoint is called by Shopify Flow when the "Plant Trees" action is triggered.
 * 
 * Expected payload from Flow:
 * {
 *   shop_id: string,
 *   shopify_domain: string,
 *   properties: {
 *     tree_count: number,
 *     reason?: string
 *   },
 *   handle: "afforestation-flow",
 *   step_reference: string
 * }
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 })
  }

  let payload
  try {
    payload = await request.json()
  } catch {
    return json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const { shopify_domain, properties, step_reference } = payload
  
  if (!shopify_domain || !properties) {
    return json({ error: "Missing required fields" }, { status: 400 })
  }

  const treeCount = parseInt(properties.tree_count) || 1
  const reason = properties.reason || "flow_action"
  const flowId = step_reference || `flow_${Date.now()}`

  if (treeCount < 1) {
    return json({ error: "tree_count must be at least 1" }, { status: 400 })
  }

  try {
    // Verify the shop exists and is active
    const settings = await prisma.shopifySettings.findUnique({
      where: { shop: shopify_domain },
    })

    if (!settings) {
      return json({ error: "Shop not registered" }, { status: 404 })
    }

    if (settings.isPaused) {
      return json({ error: "Impact is currently paused for this shop" }, { status: 429 })
    }

    // Check spending limits
    const treeCost = treeCount * (settings.costPerTree || 0.5)
    if (settings.monthlyLimit && settings.monthlySpent + treeCost > settings.monthlyLimit) {
      return json({ error: "Monthly spending limit reached" }, { status: 429 })
    }

    // Log the flow action
    await prisma.shopifyFlowLog.create({
      data: {
        shop: shopify_domain,
        flowId,
        actionType: "plant_trees",
        treesPlanted: treeCount,
        co2OffsetKg: treeCount * 24, // ~24kg CO2 per tree
        reason,
        metadata: { step_reference, properties },
      },
    })

    // Update monthly spending
    await prisma.shopifySettings.update({
      where: { shop: shopify_domain },
      data: {
        monthlySpent: { increment: treeCost },
      },
    })

    // Record in impact ledger
    try {
      const shopRecord = await prisma.shopifyShop.findUnique({
        where: { shopDomain: shopify_domain },
      })

      if (shopRecord) {
        await prisma.$executeRaw`
          INSERT INTO impact_ledger (source_type, source_id, trees_planted, co2_offset_kg, notes, created_at)
          VALUES ('shopify_flow', ${shopRecord.id.toString()}, ${treeCount}, ${treeCount * 24}, ${`Flow action: ${reason}`}, NOW())
        `
      }
    } catch (error) {
      console.warn("Could not record in impact_ledger:", error)
    }

    // Return success response
    return json({
      success: true,
      treesPlanted: treeCount,
      co2OffsetKg: treeCount * 24,
      cost: treeCost,
      message: `Successfully planted ${treeCount} tree${treeCount > 1 ? "s" : ""}!`,
    })

  } catch (error) {
    console.error("Flow plant-trees error:", error)
    return json({ error: "Internal server error" }, { status: 500 })
  }
}

// Handle GET requests (health check)
export const loader = async () => {
  return json({ status: "ok", action: "plant-trees" })
}
