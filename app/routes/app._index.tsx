import { json } from "@remix-run/node"
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node"
import { useEffect, useState, useCallback } from "react"
import { useLoaderData, useFetcher, useSearchParams } from "@remix-run/react"
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  TextField,
  Select,
  Banner,
  Badge,
  Divider,
  ProgressBar,
  Box,
  Checkbox,
  ButtonGroup,
  Modal,
} from "@shopify/polaris"
import { SettingsIcon } from "@shopify/polaris-icons"
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react"
import { authenticate, unauthenticated } from "../shopify.server"
import prisma from "../db.server"

export interface TriggerRule {
  type: "fixed" | "per_product" | "per_tag" | "threshold" | "percentage"
  enabled: boolean
  value: number
  tag?: string
  minOrderValue?: number
}

const DEFAULT_RULES: TriggerRule[] = [
  { type: "fixed", enabled: true, value: 1 },
  { type: "per_product", enabled: false, value: 1 },
  { type: "per_tag", enabled: false, value: 1, tag: "" },
  { type: "threshold", enabled: false, value: 50, minOrderValue: 50 },
  { type: "percentage", enabled: false, value: 5 },
]

interface ImpactData {
  totalTreesPlanted: number
  totalCo2OffsetKg: number
  totalOrders: number
  isLinked: boolean
  companyId: number | null
}

interface Settings {
  triggerType: string
  triggerValue: number
  minOrderValue: number | null
  triggerRules: TriggerRule[] | null
  isEnabled: boolean
  impactType: string
  costPerTree: number
  costPerKgCo2: number
  monthlyLimit: number | null
  monthlySpent: number
  isPaused: boolean
  notifyOnLimit: boolean
  autoResumeMonthly: boolean
  // Loyalty settings
  loyaltyEnabled: boolean
  pointsPerTree: number
  loyaltyApiKey: string | null
}

interface ActivityItem {
  date: string
  treesPlanted: number
  orderNumber: string | null
  description: string
}

const DEFAULT_SETTINGS: Settings = {
  triggerType: "fixed",
  triggerValue: 1,
  minOrderValue: null,
  triggerRules: null,
  isEnabled: true,
  impactType: "trees",
  costPerTree: 0.50,
  costPerKgCo2: 0.20,
  monthlyLimit: null,
  monthlySpent: 0,
  isPaused: false,
  notifyOnLimit: true,
  autoResumeMonthly: true,
  // Loyalty defaults
  loyaltyEnabled: false,
  pointsPerTree: 200,
  loyaltyApiKey: null,
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request)
  const shop = session.shop

  // Get or create settings
  let settings = await prisma.shopifySettings.findUnique({ where: { shop } })
  if (!settings) {
    settings = await prisma.shopifySettings.create({
      data: { shop, triggerType: "fixed", triggerValue: 1 },
    })
  }

  // Get or create shop record
  let shopRecord = await prisma.shopifyShop.findUnique({
    where: { shopDomain: shop }
  })
  if (!shopRecord) {
    shopRecord = await prisma.shopifyShop.create({
      data: { shopDomain: shop },
    })
  }

  // Query impact from the unified impact_ledger
  let impact: ImpactData = {
    totalTreesPlanted: 0,
    totalCo2OffsetKg: 0,
    totalOrders: 0,
    isLinked: shopRecord.companyId !== null,
    companyId: shopRecord.companyId,
  }

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
      impact.totalTreesPlanted = Number(impactResult[0].total_trees_planted || 0)
      impact.totalCo2OffsetKg = Number(impactResult[0].total_co2_offset_kg || 0)
      impact.totalOrders = Number(impactResult[0].total_orders || 0)
    }
  } catch (error) {
    console.warn("Could not query impact_ledger:", error)
  }

  // Fetch recent activity for the activity feed (last 30 days)
  let recentActivity: ActivityItem[] = []
  try {
    const url = new URL(request.url)
    const period = url.searchParams.get("period") || "30"
    const days = Math.min(90, Math.max(7, parseInt(period, 10) || 30))
    const since = new Date()
    since.setDate(since.getDate() - days)

    const activityResult = await prisma.$queryRaw<Array<{
      created_at: Date
      trees_planted: number
      metadata: { order_number?: string } | null
    }>>`
      SELECT created_at, trees_planted, metadata
      FROM impact_ledger
      WHERE source_type = 'shopify' AND source_id = ${shopRecord.id.toString()}
        AND created_at >= ${since}
      ORDER BY created_at DESC
      LIMIT 20
    `

    recentActivity = activityResult.map((row) => {
      const meta = (row.metadata as { order_number?: string }) || {}
      const orderNum = meta.order_number || null
      const dateStr = new Date(row.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      return {
        date: dateStr,
        treesPlanted: Number(row.trees_planted),
        orderNumber: orderNum,
        description: orderNum
          ? `Order #${orderNum} planted ${row.trees_planted} tree${row.trees_planted !== 1 ? "s" : ""}`
          : `Planted ${row.trees_planted} tree${row.trees_planted !== 1 ? "s" : ""}`,
      }
    })
  } catch (err) {
    console.warn("Could not fetch recent activity:", err)
  }

  let triggerRules = settings.triggerRules as TriggerRule[] | null
  if (!Array.isArray(triggerRules) || triggerRules.length === 0) {
    triggerRules = DEFAULT_RULES.map((r) => ({
      ...r,
      enabled: r.type === settings.triggerType,
      value: r.type === settings.triggerType ? settings.triggerValue : r.value,
      minOrderValue: r.type === "threshold" ? settings.minOrderValue ?? 50 : r.minOrderValue,
    }))
  }

  let productCountByTag: Record<string, number> = {}
  for (const r of triggerRules) {
    if (r.type === "per_tag" && r.tag?.trim()) {
      try {
        const tagVal = r.tag.trim()
        const query = tagVal.includes(" ") ? `tag:"${tagVal.replace(/"/g, '\\"')}"` : `tag:${tagVal}`
        const { admin } = await unauthenticated.admin(shop)
        const res = await admin.graphql(
          `#graphql
          query countProductsByTag($query: String!) {
            productsCount(query: $query) {
              count
            }
          }`,
          { variables: { query } }
        )
        const json = await res.json()
        const count = json?.data?.productsCount?.count ?? 0
        productCountByTag[tagVal] = count
      } catch {
        productCountByTag[r.tag.trim()] = 0
      }
    }
  }

  return json({
    settings: {
      triggerType: settings.triggerType,
      triggerValue: settings.triggerValue,
      minOrderValue: settings.minOrderValue ?? null,
      triggerRules,
      isEnabled: settings.isEnabled,
      impactType: settings.impactType ?? "trees",
      costPerTree: settings.costPerTree ?? 0.50,
      costPerKgCo2: settings.costPerKgCo2 ?? 0.20,
      monthlyLimit: settings.monthlyLimit,
      monthlySpent: settings.monthlySpent ?? 0,
      isPaused: settings.isPaused ?? false,
      notifyOnLimit: settings.notifyOnLimit ?? true,
      autoResumeMonthly: settings.autoResumeMonthly ?? true,
      // Loyalty settings
      loyaltyEnabled: settings.loyaltyEnabled ?? false,
      pointsPerTree: settings.pointsPerTree ?? 200,
      loyaltyApiKey: settings.loyaltyApiKey ?? null,
    },
    impact,
    recentActivity,
    productCountByTag,
    shopId: shopRecord.id,
    shopName: shop,
  })
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request)
  const shop = session.shop
  const formData = await request.formData()
  const actionType = formData.get("action")

  if (actionType === "updateSettings") {
    const impactType = formData.get("impactType") as string
    const monthlyLimit = formData.get("monthlyLimit")
      ? parseFloat(formData.get("monthlyLimit") as string)
      : null
    const notifyOnLimit = formData.get("notifyOnLimit") === "true"
    const autoResumeMonthly = formData.get("autoResumeMonthly") === "true"

    const triggerRulesRaw = formData.get("triggerRules")
    let triggerRules: TriggerRule[] | null = null
    if (triggerRulesRaw && typeof triggerRulesRaw === "string") {
      try {
        triggerRules = JSON.parse(triggerRulesRaw) as TriggerRule[]
      } catch {}
    }

    const updateData: Record<string, unknown> = {
      impactType,
      monthlyLimit,
      notifyOnLimit,
      autoResumeMonthly,
    }
    if (triggerRules && triggerRules.length > 0) {
      updateData.triggerRules = triggerRules
      const firstEnabled = triggerRules.find((r) => r.enabled)
      if (firstEnabled) {
        updateData.triggerType = firstEnabled.type
        updateData.triggerValue = firstEnabled.value
        updateData.minOrderValue = firstEnabled.minOrderValue ?? null
      }
    } else {
      const triggerType = formData.get("triggerType") as string
      const triggerValue = parseFloat(formData.get("triggerValue") as string) || 1
      const minOrderValue = formData.get("minOrderValue")
        ? parseFloat(formData.get("minOrderValue") as string)
        : null
      updateData.triggerType = triggerType
      updateData.triggerValue = triggerValue
      updateData.minOrderValue = minOrderValue
    }

    const settings = await prisma.shopifySettings.upsert({
      where: { shop },
      update: updateData as Parameters<typeof prisma.shopifySettings.update>[0]["data"],
      create: {
        shop,
        triggerType: (updateData.triggerType as string) ?? "fixed",
        triggerValue: (updateData.triggerValue as number) ?? 1,
        impactType: (updateData.impactType as string) ?? "trees",
        monthlyLimit: updateData.monthlyLimit as number | null,
        notifyOnLimit: (updateData.notifyOnLimit as boolean) ?? true,
        autoResumeMonthly: (updateData.autoResumeMonthly as boolean) ?? true,
        triggerRules: updateData.triggerRules as object | null,
      },
    })

    return json({ settings, success: true, message: "Settings saved!" })
  }

  if (actionType === "togglePause") {
    const currentSettings = await prisma.shopifySettings.findUnique({ where: { shop } })
    const newPausedState = !(currentSettings?.isPaused ?? false)

    await prisma.shopifySettings.update({
      where: { shop },
      data: { isPaused: newPausedState },
    })

    return json({
      success: true,
      isPaused: newPausedState,
      message: newPausedState ? "Impact paused" : "Impact resumed"
    })
  }

  if (actionType === "syncMonthlySpent") {
    // Get shop record
    const shopRecord = await prisma.shopifyShop.findUnique({
      where: { shopDomain: shop }
    })

    if (!shopRecord) {
      return json({ success: false, message: "Shop not found" })
    }

    // Get current month's spending from impact_ledger
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const currentSettings = await prisma.shopifySettings.findUnique({ where: { shop } })
    const costPerTree = currentSettings?.costPerTree || 0.5

    const monthlyImpact = await prisma.$queryRaw<Array<{
      total_trees: bigint | null
    }>>`
      SELECT COALESCE(SUM(trees_planted), 0) as total_trees
      FROM impact_ledger
      WHERE source_type IN ('shopify', 'shopify_flow', 'shopify_loyalty')
        AND source_id = ${shopRecord.id.toString()}
        AND created_at >= ${startOfMonth}
    `

    const treesThisMonth = Number(monthlyImpact[0]?.total_trees || 0)
    const calculatedSpent = treesThisMonth * costPerTree

    await prisma.shopifySettings.update({
      where: { shop },
      data: { monthlySpent: calculatedSpent },
    })

    return json({
      success: true,
      monthlySpent: calculatedSpent,
      treesThisMonth,
      message: `Synced: ${treesThisMonth} trees = $${calculatedSpent.toFixed(2)} this month`
    })
  }

  if (actionType === "resetMonthlySpent") {
    await prisma.shopifySettings.update({
      where: { shop },
      data: { monthlySpent: 0 },
    })

    return json({ success: true, message: "Monthly spending reset" })
  }

  if (actionType === "updateLoyaltySettings") {
    const loyaltyEnabled = formData.get("loyaltyEnabled") === "true"
    const pointsPerTree = parseInt(formData.get("pointsPerTree") as string) || 200

    await prisma.shopifySettings.update({
      where: { shop },
      data: {
        loyaltyEnabled,
        pointsPerTree,
      },
    })

    return json({ success: true, message: "Loyalty settings saved!" })
  }

  if (actionType === "generateApiKey") {
    const crypto = await import("crypto")
    const apiKey = `aff_${crypto.randomBytes(24).toString("hex")}`

    await prisma.shopifySettings.update({
      where: { shop },
      data: { loyaltyApiKey: apiKey },
    })

    return json({ success: true, apiKey, message: "API key generated!" })
  }

  if (actionType === "revokeApiKey") {
    await prisma.shopifySettings.update({
      where: { shop },
      data: { loyaltyApiKey: null },
    })

    return json({ success: true, message: "API key revoked" })
  }

  return json({ success: false })
}

export default function Index() {
  const { settings: initialSettings, impact, recentActivity = [], productCountByTag = {}, shopId, shopName } = useLoaderData<typeof loader>()
  const fetcher = useFetcher<typeof action>()
  const shopify = useAppBridge()
  const [searchParams, setSearchParams] = useSearchParams()
  const period = searchParams.get("period") || "30"

  const [settings, setSettings] = useState<Settings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  })

  const [triggerRules, setTriggerRules] = useState<TriggerRule[]>(
    initialSettings.triggerRules ?? DEFAULT_RULES
  )

  const [settingsModalOpen, setSettingsModalOpen] = useState<string | null>(null)
  const [editingRuleIndex, setEditingRuleIndex] = useState<number>(0)

  const isSaving = fetcher.state !== "idle"

  const openSettingsModal = (index: number) => {
    setEditingRuleIndex(index)
    setSettingsModalOpen(triggerRules[index].type)
  }

  const closeSettingsModal = () => setSettingsModalOpen(null)

  const updateRule = (index: number, updates: Partial<TriggerRule>) => {
    setTriggerRules((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...updates }
      return next
    })
  }

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show((fetcher.data as any).message || "Saved!")
    }
    if ((fetcher.data as any)?.isPaused !== undefined) {
      setSettings(prev => ({ ...prev, isPaused: (fetcher.data as any).isPaused }))
    }
    if ((fetcher.data as any)?.apiKey) {
      setSettings(prev => ({ ...prev, loyaltyApiKey: (fetcher.data as any).apiKey }))
    }
    if ((fetcher.data as any)?.monthlySpent !== undefined) {
      setSettings(prev => ({ ...prev, monthlySpent: (fetcher.data as any).monthlySpent }))
    }
  }, [fetcher.data, shopify])

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleSave = useCallback(() => {
    const formData = new FormData()
    formData.append("action", "updateSettings")
    formData.append("triggerRules", JSON.stringify(triggerRules))
    formData.append("impactType", settings.impactType)
    if (settings.monthlyLimit !== null) {
      formData.append("monthlyLimit", settings.monthlyLimit.toString())
    }
    formData.append("notifyOnLimit", settings.notifyOnLimit.toString())
    formData.append("autoResumeMonthly", settings.autoResumeMonthly.toString())
    fetcher.submit(formData, { method: "POST" })
  }, [settings, triggerRules, fetcher])

  const handleTogglePause = useCallback(() => {
    const formData = new FormData()
    formData.append("action", "togglePause")
    fetcher.submit(formData, { method: "POST" })
  }, [fetcher])

  const getActiveRuleSummary = () => {
    const enabled = triggerRules.filter((r) => r.enabled)
    if (enabled.length === 0) return "No rules active"
    if (enabled.length === 1) {
      const r = enabled[0]
      if (r.type === "fixed") return `${r.value} tree${r.value !== 1 ? "s" : ""} per order`
      if (r.type === "per_product") return `${r.value} tree${r.value !== 1 ? "s" : ""} per product`
      if (r.type === "per_tag") return `1 tree per '${r.tag || "tag"}' product`
      if (r.type === "threshold") return `1 tree per $${r.value} spent`
      if (r.type === "percentage") return `${r.value}% of order value`
    }
    return `${enabled.length} rules active`
  }

  const getRuleTitle = (r: TriggerRule) => {
    if (r.type === "fixed") return `Plant ${r.value} tree${r.value !== 1 ? "s" : ""} per order`
    if (r.type === "per_product") return `Plant ${r.value} tree${r.value !== 1 ? "s" : ""} per product`
    if (r.type === "per_tag") return `Plant ${r.value} tree${r.value !== 1 ? "s" : ""} for every '${r.tag || "tag"}' product`
    if (r.type === "threshold") return `Plant 1 tree for every $${r.value} spent`
    if (r.type === "percentage") return `${r.value}% of order value`
    return "Custom rule"
  }

  const getRuleDesc = (r: TriggerRule, index: number) => {
    if (r.type === "fixed") return "For every order"
    if (r.type === "per_product") return "Trees per product unit in each order"
    if (r.type === "per_tag") {
      const count = r.tag ? productCountByTag[r.tag] : 0
      return r.tag
        ? `For selected product tags. Monitors ${count} products with tag '${r.tag}'`
        : "For products with a specific tag"
    }
    if (r.type === "threshold") return `For each $${r.value} in order subtotal${r.minOrderValue ? `. Minimum of $${r.minOrderValue} per order` : ""}`
    if (r.type === "percentage") return "Donate a percentage of each order to plant trees"
    return ""
  }

  const monthlyProgress = settings.monthlyLimit
    ? Math.min((settings.monthlySpent / settings.monthlyLimit) * 100, 100)
    : 0

  const estimatedCost = impact.totalTreesPlanted * settings.costPerTree +
    impact.totalCo2OffsetKg * settings.costPerKgCo2

  return (
    <Page>
      <TitleBar title="Afforestation Dashboard" />
      <BlockStack gap="500">
        {/* Active Rule Banner - inspired by Plant Trees app */}
        {!settings.isPaused && (
          <div style={{
            background: "linear-gradient(135deg, #2d5a27 0%, #3d7a37 100%)",
            borderRadius: "12px",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#fff",
            boxShadow: "0 2px 8px rgba(45, 90, 39, 0.2)",
          }}>
            <InlineStack gap="300" blockAlign="center">
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                overflow: 'hidden',
                flexShrink: 0,
                backgroundColor: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <img src="/logo.png" alt="Afforestation" style={{ width: 28, height: 28, objectFit: 'contain' }} />
              </div>
              <div>
                <Text as="p" variant="bodyMd" fontWeight="bold">
                  Afforestation.org | {getActiveRuleSummary()} | Active
                </Text>
                <p style={{ margin: 0, fontSize: "13px", color: "rgba(255, 255, 255, 0.95)", lineHeight: 1.4 }}>
                  Fund verified tree-planting with every order
                </p>
              </div>
            </InlineStack>
            <Badge tone="success">Active</Badge>
          </div>
        )}

        {/* Status Banner */}
        {settings.isPaused && (
          <Banner
            title="Impact is paused"
            tone="warning"
            action={{
              content: "Resume",
              onAction: handleTogglePause,
            }}
          >
            <p>Tree planting is currently paused. No trees will be planted until you resume.</p>
          </Banner>
        )}

        {!impact.isLinked && !settings.isPaused && (
          <Banner
            title="Link your Afforestation account"
            tone="info"
            action={{
              content: "Link Account",
              url: "/app/link-account",
            }}
          >
            <p>Connect to your company account to include this impact in ESG reports.</p>
          </Banner>
        )}

        {/* Impact Overview Cards */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingLg">Your Climate Impact <i className="fi fi-rr-earth-americas" style={{ color: "#2d5a27" }}></i></Text>
                  <ButtonGroup>
                    <Button
                      onClick={handleTogglePause}
                      tone={settings.isPaused ? "success" : undefined}
                    >
                      {settings.isPaused ? "▶ Resume" : "⏸ Pause"}
                    </Button>
                    <Button url="/app/widgets">
                      🌳 Impact Widgets
                    </Button>
                  </ButtonGroup>
                </InlineStack>

                <Divider />

                {/* Stats Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
                  <div style={{
                    background: "#fafafa",
                    border: "1px solid #e5e5e5",
                    borderRadius: "12px",
                    padding: "24px",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: "40px", marginBottom: "8px", color: "#2d5a27" }}><i className="fi fi-rr-tree"></i></div>
                    <Text as="p" variant="heading2xl" fontWeight="bold">
                      {impact.totalTreesPlanted.toLocaleString()}
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">Trees Planted</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      ${(impact.totalTreesPlanted * settings.costPerTree).toFixed(2)} funded
                    </Text>
                  </div>

                  <div style={{
                    background: "#fafafa",
                    border: "1px solid #e5e5e5",
                    borderRadius: "12px",
                    padding: "24px",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: "40px", marginBottom: "8px", color: "#3b82f6" }}><i className="fi fi-rr-cloud"></i></div>
                    <Text as="p" variant="heading2xl" fontWeight="bold">
                      {impact.totalCo2OffsetKg.toLocaleString()}
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">kg CO₂ Offset</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      ≈ {(impact.totalCo2OffsetKg / 1000).toFixed(1)} tonnes
                    </Text>
                  </div>

                  <div style={{
                    background: "#fafafa",
                    border: "1px solid #e5e5e5",
                    borderRadius: "12px",
                    padding: "24px",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: "40px", marginBottom: "8px", color: "#8b5cf6" }}><i className="fi fi-rr-shopping-cart"></i></div>
                    <Text as="p" variant="heading2xl" fontWeight="bold">
                      {impact.totalOrders.toLocaleString()}
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">Orders Contributing</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      ${estimatedCost.toFixed(2)} total impact
                    </Text>
                  </div>
                </div>

                {/* Monthly Spending Progress */}
                {settings.monthlyLimit && (
                  <Card>
                    <BlockStack gap="200">
                      <InlineStack align="space-between">
                        <InlineStack gap="200" blockAlign="center">
                          <Text as="p" variant="bodyMd" fontWeight="semibold">Monthly Spending</Text>
                          <Button
                            size="micro"
                            onClick={() => {
                              const formData = new FormData()
                              formData.append("action", "syncMonthlySpent")
                              fetcher.submit(formData, { method: "POST" })
                            }}
                            loading={isSaving}
                          >
                            🔄 Sync
                          </Button>
                        </InlineStack>
                        <Text as="p" variant="bodyMd">
                          ${settings.monthlySpent.toFixed(2)} / ${settings.monthlyLimit.toFixed(2)}
                        </Text>
                      </InlineStack>
                      <ProgressBar progress={monthlyProgress} tone={monthlyProgress >= 90 ? "critical" : "primary"} />
                      {monthlyProgress >= 90 && (
                        <Text as="p" variant="bodySm" tone="critical">
                          Approaching monthly limit. Impact will pause when limit is reached.
                        </Text>
                      )}
                    </BlockStack>
                  </Card>
                )}

                {/* Account linked banner - hiding since it's redundant when already linked */}
                {/* {impact.isLinked && (
                  <Banner tone="success">
                    <p>Linked to your Afforestation company account. Impact included in ESG dashboard.</p>
                  </Banner>
                )} */}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Impact Settings - Rule Cards with Toggle + Settings (inspired by Plant Trees app) */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingMd">When to Fund Impact</Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Choose how impact is calculated for each order. Toggle rules on/off and use the gear icon to modify parameters.
                </Text>

                {/* Rule Cards - multiple toggles, each can be on/off */}
                <BlockStack gap="300">
                  {triggerRules.map((rule, index) => (
                    <div
                      key={rule.type}
                      style={{
                        padding: "16px",
                        borderRadius: "12px",
                        border: "1px solid #e5e5e5",
                        background: "#fafafa",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "16px",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <Text as="p" variant="bodyMd" fontWeight="semibold">{getRuleTitle(rule)}</Text>
                        <Text as="p" variant="bodySm" tone="subdued">{getRuleDesc(rule, index)}</Text>
                      </div>
                      <InlineStack gap="300" blockAlign="center">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => updateRule(index, { enabled: !rule.enabled })}
                          onKeyDown={(e) => e.key === "Enter" && updateRule(index, { enabled: !rule.enabled })}
                          style={{
                            width: "44px",
                            height: "24px",
                            borderRadius: "12px",
                            background: rule.enabled ? "#2d5a27" : "#d1d5db",
                            cursor: "pointer",
                            position: "relative",
                            transition: "background 0.2s",
                          }}
                        >
                          <div
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              background: "#fff",
                              position: "absolute",
                              top: "2px",
                              left: rule.enabled ? "22px" : "2px",
                              transition: "left 0.2s",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                            }}
                          />
                        </div>
                        <Button
                          variant="plain"
                          icon={SettingsIcon}
                          accessibilityLabel={`Edit ${getRuleTitle(rule)} settings`}
                          onClick={() => openSettingsModal(index)}
                        />
                      </InlineStack>
                    </div>
                  ))}
                </BlockStack>

                {/* Settings Modal */}
                <Modal
                  open={settingsModalOpen !== null}
                  onClose={closeSettingsModal}
                  title={settingsModalOpen ? `Edit ${getRuleTitle(triggerRules[editingRuleIndex])}` : ""}
                  primaryAction={{
                    content: "Save",
                    onAction: () => {
                      handleSave()
                      closeSettingsModal()
                    },
                    loading: isSaving,
                  }}
                  secondaryActions={[{ content: "Cancel", onAction: closeSettingsModal }]}
                >
                  <Modal.Section>
                    {settingsModalOpen && triggerRules[editingRuleIndex] && (
                      <BlockStack gap="400">
                        {triggerRules[editingRuleIndex].type !== "per_tag" && (
                          <TextField
                            label={
                              triggerRules[editingRuleIndex].type === "fixed" ? "Trees per Order" :
                              triggerRules[editingRuleIndex].type === "per_product" ? "Trees per Product" :
                              triggerRules[editingRuleIndex].type === "threshold" ? "$ Spend per Tree" :
                              "% of Order Value"
                            }
                            type="number"
                            value={triggerRules[editingRuleIndex].value.toString()}
                            onChange={(v) => updateRule(editingRuleIndex, { value: parseFloat(v) || 1 })}
                            autoComplete="off"
                            min={triggerRules[editingRuleIndex].type === "percentage" ? 0.1 : 1}
                            step={triggerRules[editingRuleIndex].type === "percentage" ? 0.1 : 1}
                          />
                        )}
                        {triggerRules[editingRuleIndex].type === "per_tag" && (
                          <>
                            <TextField
                              label="Product tag"
                              value={triggerRules[editingRuleIndex].tag || ""}
                              onChange={(v) => updateRule(editingRuleIndex, { tag: v })}
                              placeholder="e.g. Eco"
                              helpText="Products with this tag will trigger tree planting"
                              autoComplete="off"
                            />
                            <TextField
                              label="Trees per matching product"
                              type="number"
                              value={triggerRules[editingRuleIndex].value.toString()}
                              onChange={(v) => updateRule(editingRuleIndex, { value: parseFloat(v) || 1 })}
                              autoComplete="off"
                              min={1}
                            />
                          </>
                        )}
                        {triggerRules[editingRuleIndex].type === "threshold" && (
                          <TextField
                            label="Minimum order value ($)"
                            type="number"
                            value={triggerRules[editingRuleIndex].minOrderValue?.toString() || ""}
                            onChange={(v) => updateRule(editingRuleIndex, { minOrderValue: v ? parseFloat(v) : undefined })}
                            placeholder="No minimum"
                            helpText="Only plant trees when order total meets this minimum"
                            autoComplete="off"
                          />
                        )}
                      </BlockStack>
                    )}
                  </Modal.Section>
                </Modal>

                <Divider />

                {/* Impact Type */}
                <BlockStack gap="300">
                  <Text as="h3" variant="headingSm">Impact Type</Text>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                    {[
                      { id: "trees", icon: "🌳", label: "Trees", price: `$${settings.costPerTree}/tree` },
                      { id: "carbon", icon: "☁️", label: "Carbon Removal", price: `$${settings.costPerKgCo2}/kg` },
                      { id: "both", icon: "🌍", label: "Both", price: "Combined impact" },
                    ].map((option) => (
                      <div
                        key={option.id}
                        onClick={() => updateSetting("impactType", option.id)}
                        style={{
                          cursor: "pointer",
                          padding: "12px",
                          borderRadius: "8px",
                          border: settings.impactType === option.id ? "2px solid #2d5a27" : "2px solid #e5e5e5",
                          background: settings.impactType === option.id ? "#f0fdf4" : "#fff",
                          textAlign: "center",
                          transition: "all 0.2s",
                        }}
                      >
                        <Text as="p" variant="bodySm" fontWeight="semibold">{option.label}</Text>
                        <Text as="p" variant="bodySm" tone="subdued">{option.price}</Text>
                      </div>
                    ))}
                  </div>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Activity Feed */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">Recent Activity</Text>
                  <InlineStack gap="200">
                    <ButtonGroup>
                      {[
                        { label: "7 days", value: "7" },
                        { label: "30 days", value: "30" },
                        { label: "90 days", value: "90" },
                      ].map((p) => (
                        <Button
                          key={p.value}
                          size="slim"
                          variant={period === p.value ? "primary" : "plain"}
                          onClick={() => setSearchParams({ period: p.value })}
                        >
                          {p.label}
                        </Button>
                      ))}
                    </ButtonGroup>
                    <Button url="/app" variant="primary">
                      View Impact Report
                    </Button>
                  </InlineStack>
                </InlineStack>
                {recentActivity.length > 0 ? (
                  <BlockStack gap="200">
                    {recentActivity.slice(0, 10).map((item, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "12px",
                          background: "#fafafa",
                          borderRadius: "8px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Text as="p" variant="bodyMd">{item.description}</Text>
                        <Text as="p" variant="bodySm" tone="subdued">{item.date}</Text>
                      </div>
                    ))}
                  </BlockStack>
                ) : (
                  <div style={{ padding: "24px", textAlign: "center", background: "#fafafa", borderRadius: "8px" }}>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No recent activity yet. Trees will appear here once orders are placed.
                    </Text>
                  </div>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Spending Controls */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Spending Controls</Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Set safety limits and stay in control of your environmental spending.
                </Text>
                <Divider />

                <InlineStack gap="400" wrap={false}>
                  <Box width="50%">
                    <TextField
                      label="Monthly Spending Limit ($)"
                      type="number"
                      value={settings.monthlyLimit?.toString() || ""}
                      onChange={(v) => updateSetting("monthlyLimit", v ? parseFloat(v) : null)}
                      placeholder="No limit"
                      helpText="Leave empty for unlimited spending"
                      autoComplete="off"
                    />
                  </Box>
                  <Box width="50%">
                    <BlockStack gap="300">
                      <Checkbox
                        label="Notify me when approaching limit"
                        checked={settings.notifyOnLimit}
                        onChange={(v) => updateSetting("notifyOnLimit", v)}
                      />
                      <Checkbox
                        label="Auto-resume at start of each month"
                        checked={settings.autoResumeMonthly}
                        onChange={(v) => updateSetting("autoResumeMonthly", v)}
                      />
                    </BlockStack>
                  </Box>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* 
          ===================================================
          🏆 LOYALTY INTEGRATION - HIDDEN FOR NOW
          To re-enable: uncomment this entire section
          Backend APIs still active at /api/loyalty/*
          ===================================================
        */}
        {/* <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <div>
                    <Text as="h2" variant="headingMd">🏆 Loyalty App Integration</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Let customers redeem loyalty points for tree planting.
                    </Text>
                  </div>
                  <Badge tone={settings.loyaltyEnabled ? "success" : "attention"}>
                    {settings.loyaltyEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </InlineStack>
                <Divider />

                <InlineStack gap="400" wrap={false}>
                  <Box width="50%">
                    <BlockStack gap="300">
                      <Checkbox
                        label="Enable Loyalty Integration"
                        checked={settings.loyaltyEnabled}
                        onChange={(v) => {
                          updateSetting("loyaltyEnabled", v)
                          // Auto-save this setting
                          const formData = new FormData()
                          formData.append("action", "updateLoyaltySettings")
                          formData.append("loyaltyEnabled", v.toString())
                          formData.append("pointsPerTree", settings.pointsPerTree.toString())
                          fetcher.submit(formData, { method: "POST" })
                        }}
                      />
                      <TextField
                        label="Points Per Tree"
                        type="number"
                        value={settings.pointsPerTree.toString()}
                        onChange={(v) => updateSetting("pointsPerTree", parseInt(v) || 200)}
                        helpText="How many loyalty points = 1 tree planted"
                        autoComplete="off"
                        disabled={!settings.loyaltyEnabled}
                      />
                      {settings.loyaltyEnabled && (
                        <Button
                          onClick={() => {
                            const formData = new FormData()
                            formData.append("action", "updateLoyaltySettings")
                            formData.append("loyaltyEnabled", settings.loyaltyEnabled.toString())
                            formData.append("pointsPerTree", settings.pointsPerTree.toString())
                            fetcher.submit(formData, { method: "POST" })
                          }}
                          loading={isSaving}
                        >
                          Save Points Setting
                        </Button>
                      )}
                    </BlockStack>
                  </Box>
                  <Box width="50%">
                    <BlockStack gap="300">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">API Key</Text>
                      {settings.loyaltyApiKey ? (
                        <BlockStack gap="200">
                          <TextField
                            label=""
                            value={settings.loyaltyApiKey}
                            readOnly
                            autoComplete="off"
                          />
                          <Button
                            tone="critical"
                            onClick={() => {
                              const formData = new FormData()
                              formData.append("action", "revokeApiKey")
                              fetcher.submit(formData, { method: "POST" })
                              updateSetting("loyaltyApiKey", null)
                            }}
                          >
                            Revoke API Key
                          </Button>
                        </BlockStack>
                      ) : (
                        <BlockStack gap="200">
                          <Text as="p" variant="bodySm" tone="subdued">
                            Generate an API key for loyalty apps to call our redemption endpoints.
                          </Text>
                          <Button
                            onClick={() => {
                              const formData = new FormData()
                              formData.append("action", "generateApiKey")
                              fetcher.submit(formData, { method: "POST" })
                            }}
                            loading={isSaving}
                            disabled={!settings.loyaltyEnabled}
                          >
                            Generate API Key
                          </Button>
                        </BlockStack>
                      )}
                    </BlockStack>
                  </Box>
                </InlineStack>

                {settings.loyaltyEnabled && (
                  <Banner tone="info">
                    <p>
                      <strong>API Endpoints:</strong><br />
                      POST /api/loyalty/redeem - Redeem points for trees<br />
                      GET /api/loyalty/rates - Get redemption rates<br />
                      GET /api/loyalty/impact/:customerId - Customer impact history
                    </p>
                  </Banner>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout> */}

        {/* Save Button */}
        <Layout>
          <Layout.Section>
            <InlineStack align="end" gap="300">
              <Button url="/app/widgets">
                🌳 View Impact Widgets
              </Button>
              <Button url="/app/additional">
                ⚙️ Customize Styles
              </Button>
              <Button variant="primary" onClick={handleSave} loading={isSaving}>
                💾 Save All Settings
              </Button>
            </InlineStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  )
}
