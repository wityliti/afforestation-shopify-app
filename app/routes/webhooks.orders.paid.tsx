import type { ActionFunctionArgs } from "@remix-run/node"
import { authenticate, unauthenticated } from "../shopify.server"
import prisma from "../db.server"

const CO2_PER_TREE_KG = 20

interface TriggerRule {
  type: string
  enabled: boolean
  value: number
  tag?: string
  minOrderValue?: number
}

function treesFromRule (
  rule: TriggerRule,
  totalAmount: number,
  lineItems: Array<{ product_id?: string | number; quantity?: number }>,
  productIdToTags: Map<string, string[]>,
  costPerTree: number
): number {
  if (!rule.enabled) return 0

  switch (rule.type) {
    case "fixed":
      return Math.floor(rule.value)
    case "per_product": {
      const treesPerUnit = Math.max(1, Math.floor(rule.value))
      return lineItems.reduce((sum, item) => {
        const qty = typeof item.quantity === "number" ? item.quantity : 1
        return sum + qty * treesPerUnit
      }, 0)
    }
    case "per_tag": {
      if (!rule.tag?.trim()) return 0
      const tagLower = rule.tag.trim().toLowerCase()
      const treesPerMatch = Math.max(1, Math.floor(rule.value))
      let matches = 0
      for (const item of lineItems) {
        const pid = item.product_id
        if (pid == null) continue
        const gid = typeof pid === "number" ? `gid://shopify/Product/${pid}` : pid
        const tags = productIdToTags.get(gid) || []
        const hasTag = tags.some((t) => t.toLowerCase() === tagLower)
        if (hasTag) {
          const qty = typeof item.quantity === "number" ? item.quantity : 1
          matches += qty
        }
      }
      return matches * treesPerMatch
    }
    case "threshold": {
      const min = rule.minOrderValue ?? 0
      if (min > 0 && totalAmount < min) return 0
      return Math.floor(totalAmount / rule.value)
    }
    case "percentage": {
      const donationAmount = totalAmount * (rule.value / 100)
      return Math.floor(donationAmount / costPerTree)
    }
    default:
      return 0
  }
}

async function fetchProductTags (
  shop: string,
  productIds: (string | number)[]
): Promise<Map<string, string[]>> {
  if (productIds.length === 0) return new Map()
  const ids = productIds
    .filter((id) => id != null)
    .map((id) => (typeof id === "number" ? `gid://shopify/Product/${id}` : id))
  if (ids.length === 0) return new Map()

  try {
    const { admin } = await unauthenticated.admin(shop)
    const response = await admin.graphql(
      `#graphql
      query getProductTags($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            tags
          }
        }
      }`,
      { variables: { ids } }
    )
    const json = await response.json()
    const nodes = (json?.data?.nodes ?? []) as Array<{ id: string; tags?: string[] } | null>
    const map = new Map<string, string[]>()
    for (const node of nodes) {
      if (node?.id) {
        map.set(node.id, node.tags ?? [])
      }
    }
    return map
  } catch (err) {
    console.warn("Failed to fetch product tags:", err)
    return new Map()
  }
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request)

  console.log(`Received ${topic} webhook for ${shop}`)

  if (topic !== "ORDERS_PAID" && topic !== "ORDERS_CREATE") {
    return new Response()
  }

  const settings = await prisma.shopifySettings.findUnique({ where: { shop } })
  if (!settings || !settings.isEnabled) {
    return new Response()
  }

  if (settings.isPaused) {
    console.log(`Impact paused for ${shop}, skipping order ${payload.order_number}`)
    return new Response()
  }

  const totalAmount = parseFloat(payload.total_price || "0")
  const lineItems = payload.line_items || payload.lineItems || []
  const costPerTree = settings.costPerTree ?? 0.5

  let treesToPlant = 0
  const triggerRules = settings.triggerRules as TriggerRule[] | null

  if (Array.isArray(triggerRules) && triggerRules.length > 0) {
    const enabledRules = triggerRules.filter((r) => r.enabled)
    if (enabledRules.length === 0) {
      return new Response()
    }

    const hasPerTag = enabledRules.some((r) => r.type === "per_tag")
    let productIdToTags = new Map<string, string[]>()
    if (hasPerTag && lineItems.length > 0) {
      const productIds = lineItems
        .map((i) => i.product_id)
        .filter((id): id is string | number => id != null)
      productIdToTags = await fetchProductTags(shop, productIds)
    }

    for (const rule of enabledRules) {
      treesToPlant += treesFromRule(
        rule,
        totalAmount,
        lineItems,
        productIdToTags,
        costPerTree
      )
    }
  } else {
    const minOrderValue = settings.minOrderValue
    if (minOrderValue != null && minOrderValue > 0 && totalAmount < minOrderValue) {
      console.log(`Order ${payload.order_number} below minimum $${minOrderValue}, skipping`)
      return new Response()
    }

    if (settings.triggerType === "fixed") {
      treesToPlant = settings.triggerValue
    } else if (settings.triggerType === "threshold") {
      treesToPlant = Math.floor(totalAmount / settings.triggerValue)
    } else if (settings.triggerType === "percentage") {
      const donationAmount = totalAmount * (settings.triggerValue / 100)
      treesToPlant = Math.floor(donationAmount / costPerTree)
    } else if (settings.triggerType === "per_product") {
      const treesPerItem = Math.max(1, Math.floor(settings.triggerValue))
      treesToPlant = lineItems.reduce((sum: number, item: { quantity?: number }) => {
        const qty = typeof item.quantity === "number" ? item.quantity : 1
        return sum + qty * treesPerItem
      }, 0)
    }
  }

  if (treesToPlant > 0) {
    const trees = Math.round(treesToPlant)
    const co2Offset = trees * CO2_PER_TREE_KG
    const treeCost = trees * costPerTree

    if (settings.monthlyLimit && settings.monthlySpent + treeCost > settings.monthlyLimit) {
      console.log(`Monthly limit reached for ${shop}, skipping order ${payload.order_number}`)
      return new Response()
    }

    let shopRecord = await prisma.shopifyShop.findUnique({
      where: { shopDomain: shop }
    })

    if (!shopRecord) {
      shopRecord = await prisma.shopifyShop.create({
        data: {
          shopDomain: shop,
          shopName: payload.shop?.name || shop.replace(".myshopify.com", ""),
        }
      })
    }

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
          shop,
          order_id: payload.id,
          order_number: payload.order_number,
          total_price: payload.total_price,
          currency: payload.currency,
          customer_email: payload.email,
          trigger_rules: triggerRules ?? undefined,
          tree_cost: treeCost,
        })}::jsonb
      )
    `

    await prisma.shopifySettings.update({
      where: { shop },
      data: { monthlySpent: { increment: treeCost } },
    })

    console.log(`Recorded impact: ${trees} trees ($${treeCost.toFixed(2)}) for ${shop} (order ${payload.order_number})`)
  }

  return new Response()
}
