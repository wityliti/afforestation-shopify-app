import type { ActionFunctionArgs } from "@remix-run/node"
import { json } from "@remix-run/node"
import prisma from "../db.server"

/**
 * Shopify Flow Action Handler: Offset Carbon
 * 
 * This endpoint is called by Shopify Flow when the "Offset Carbon" action is triggered.
 * 
 * Expected payload from Flow:
 * {
 *   shop_id: string,
 *   shopify_domain: string,
 *   properties: {
 *     kg_co2: number,
 *     reason?: string
 *   },
 *   handle: "afforestation-carbon",
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

  const kgCo2 = parseFloat(properties.kg_co2) || 1
  const reason = properties.reason || "flow_action"
  const flowId = step_reference || `flow_${Date.now()}`

  if (kgCo2 < 0.1) {
    return json({ error: "kg_co2 must be at least 0.1" }, { status: 400 })
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
    const carbonCost = kgCo2 * (settings.costPerKgCo2 || 0.2)
    if (settings.monthlyLimit && settings.monthlySpent + carbonCost > settings.monthlyLimit) {
      return json({ error: "Monthly spending limit reached" }, { status: 429 })
    }

    // Log the flow action
    await prisma.shopifyFlowLog.create({
      data: {
        shop: shopify_domain,
        flowId,
        actionType: "offset_carbon",
        treesPlanted: 0,
        co2OffsetKg: kgCo2,
        reason,
        metadata: { step_reference, properties },
      },
    })

    // Update monthly spending
    await prisma.shopifySettings.update({
      where: { shop: shopify_domain },
      data: {
        monthlySpent: { increment: carbonCost },
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
          VALUES ('shopify_flow', ${shopRecord.id.toString()}, 0, ${kgCo2}, ${`Flow carbon offset: ${reason}`}, NOW())
        `
      }
    } catch (error) {
      console.warn("Could not record in impact_ledger:", error)
    }

    // Return success response
    return json({
      success: true,
      co2OffsetKg: kgCo2,
      cost: carbonCost,
      message: `Successfully offset ${kgCo2} kg of CO2!`,
    })

  } catch (error) {
    console.error("Flow offset-carbon error:", error)
    return json({ error: "Internal server error" }, { status: 500 })
  }
}

// Handle GET requests (health check)
export const loader = async () => {
  return json({ status: "ok", action: "offset-carbon" })
}
