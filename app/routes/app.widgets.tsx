import { json } from "@remix-run/node"
import type { LoaderFunctionArgs } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"
import { useState } from "react"
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Badge,
  Box,
  Modal,
  Divider,
  MediaCard,
  VideoThumbnail,
  CalloutCard,
  Banner,
} from "@shopify/polaris"
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react"
import { authenticate } from "../shopify.server"
import prisma from "../db.server"

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request)
  const shop = session.shop

  // Get shop record for stats
  let shopRecord = await prisma.shopifyShop.findUnique({
    where: { shopDomain: shop }
  })

  let stats = { trees: 0, co2: 0, orders: 0 }

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
        stats.trees = Number(impactResult[0].total_trees_planted || 0)
        stats.co2 = Number(impactResult[0].total_co2_offset_kg || 0)
        stats.orders = Number(impactResult[0].total_orders || 0)
      }
    } catch (e) {
      console.warn("Could not fetch stats")
    }
  }

  return json({ shop, stats })
}

export default function WidgetsShowcase() {
  const { shop, stats } = useLoaderData<typeof loader>()
  const shopify = useAppBridge()
  const [activeModal, setActiveModal] = useState<string | null>(null)

  const openThemeEditor = () => {
    window.open(`https://${shop}/admin/themes/current/editor`, '_blank')
  }

  const widgets = [
    {
      id: "product",
      name: "Product Page Widget",
      description: "Display the environmental impact on your product pages to increase customer engagement and conversion.",
      features: ["Shows trees planted per purchase", "Customizable message", "Animated icon"],
      placement: "Product pages, below Add to Cart",
    },
    {
      id: "banner",
      name: "Announcement Banner",
      description: "Highlight your impact funding commitment across your site with our sticky banner widget. Simply drag and drop it onto any page.",
      features: ["Sticky header banner", "Shows impact percentage", "Brand colors"],
      placement: "Site-wide header",
    },
    {
      id: "forest",
      name: "Virtual Forest Page",
      description: "A beautiful dedicated page showcasing your total impact with an animated virtual forest. Perfect for your about page or sustainability page.",
      features: ["Animated tree grid", "Live impact counter", "CO₂ statistics"],
      placement: "Dedicated impact page",
    },
    {
      id: "footer",
      name: "Footer Badge",
      description: "Our footer widget lets you showcase your partnership with Afforestation and display your live impact totals on every page of your store.",
      features: ["Compact design", "Live tree count", "Subtle animation"],
      placement: "Footer section",
    },
  ]

  // Preview components for each widget
  const ProductWidgetPreview = () => (
    <div style={{
      background: "#fff",
      borderRadius: "12px",
      padding: "16px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      maxWidth: "280px",
    }}>
      <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
        <div style={{
          width: "60px", height: "60px",
          background: "#f3f4f6", borderRadius: "8px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}><i className="fi fi-rr-box-open" style={{ fontSize: "24px", color: "#6b7280" }}></i></div>
        <div>
          <div style={{ fontSize: "11px", color: "#9ca3af" }}>Product Name</div>
          <div style={{ fontSize: "16px", fontWeight: "600" }}>$49.99</div>
        </div>
      </div>
      <div style={{
        background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
        border: "1px solid #bbf7d0",
        borderRadius: "8px",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}>
        <span style={{ fontSize: "22px", color: "#2d5a27" }}><i className="fi fi-rr-tree"></i></span>
        <span style={{ color: "#14532d", fontSize: "13px" }}>
          This purchase plants <strong>1 tree</strong>!
        </span>
      </div>
      <div style={{
        background: "#111", color: "#fff",
        padding: "10px", borderRadius: "6px",
        marginTop: "12px", textAlign: "center",
        fontSize: "13px",
      }}>Add to Cart</div>
    </div>
  )

  const BannerWidgetPreview = () => (
    <div style={{ borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <div style={{
        background: "linear-gradient(90deg, #15803d 0%, #16a34a 100%)",
        color: "#fff",
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        fontSize: "13px",
      }}>
        <span><i className="fi fi-rr-tree" style={{ color: "#fff" }}></i></span>
        <span><strong>1 tree</strong> planted with every order</span>
        <span style={{
          background: "rgba(255,255,255,0.2)",
          padding: "3px 10px",
          borderRadius: "20px",
          fontSize: "11px",
        }}>Afforestation</span>
      </div>
      <div style={{ background: "#fff", padding: "16px", textAlign: "center" }}>
        <div style={{ fontSize: "11px", color: "#9ca3af" }}>Your store header...</div>
      </div>
    </div>
  )

  const ForestWidgetPreview = () => (
    <div style={{
      background: "linear-gradient(180deg, #f0fdf4 0%, #fff 100%)",
      borderRadius: "12px",
      padding: "20px",
      textAlign: "center",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    }}>
      <div style={{ fontSize: "16px", fontWeight: "600", color: "#15803d" }}>Our Virtual Forest</div>
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "16px" }}>
        Watch our forest grow with every purchase
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginBottom: "16px" }}>
        <div>
          <div style={{ fontSize: "22px", fontWeight: "700", color: "#16a34a" }}>{stats.trees || 127}</div>
          <div style={{ fontSize: "11px", color: "#6b7280" }}><i className="fi fi-rr-tree" style={{ marginRight: "4px" }}></i>Trees</div>
        </div>
        <div>
          <div style={{ fontSize: "22px", fontWeight: "700", color: "#0ea5e9" }}>{stats.co2 || 3048}</div>
          <div style={{ fontSize: "11px", color: "#6b7280" }}><i className="fi fi-rr-cloud" style={{ marginRight: "4px" }}></i>kg CO₂</div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: "4px" }}>
        {[1, 2, 3, 4, 5, 6].map((_, i) => (
          <i key={i} className={`fi fi-rr-${i % 2 === 0 ? 'tree' : 'leaf'}`} style={{ fontSize: "20px", color: i % 2 === 0 ? "#16a34a" : "#22c55e" }}></i>
        ))}
      </div>
    </div>
  )

  const FooterWidgetPreview = () => (
    <div style={{
      background: "#f9fafb",
      borderRadius: "12px",
      padding: "16px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderTop: "1px solid #e5e7eb",
        paddingTop: "12px",
      }}>
        <div style={{ fontSize: "11px", color: "#9ca3af" }}>© 2026 Your Store</div>
        <div style={{
          background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
          border: "1px solid #bbf7d0",
          borderRadius: "6px",
          padding: "6px 12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}>
          <span style={{ fontSize: "16px", color: "#15803d" }}><i className="fi fi-rr-tree"></i></span>
          <span style={{ fontWeight: "600", color: "#15803d", fontSize: "14px" }}>{stats.trees || 127}</span>
          <span style={{ fontSize: "11px", color: "#6b7280" }}>trees</span>
        </div>
      </div>
    </div>
  )

  const getPreview = (id: string) => {
    switch (id) {
      case "product": return <ProductWidgetPreview />
      case "banner": return <BannerWidgetPreview />
      case "forest": return <ForestWidgetPreview />
      case "footer": return <FooterWidgetPreview />
      default: return null
    }
  }

  return (
    <Page>
      <TitleBar title="Impact Widgets" />

      <BlockStack gap="600">
        {/* Compact Header */}
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="300" blockAlign="center">
              <Text as="h1" variant="headingLg">Impact Widgets</Text>
              <Badge tone="success">4 Available</Badge>
            </InlineStack>
            <InlineStack gap="200">
              <Button onClick={openThemeEditor} variant="primary">
                🎨 Open Theme Editor
              </Button>
              <Button url="/app/additional">
                ⚙️ Customize Styles
              </Button>
            </InlineStack>
          </InlineStack>
          <Text as="p" variant="bodyMd" tone="subdued">
            Explore our widget library and add beautiful impact displays to your store. Simply drag and drop in the Theme Editor.
          </Text>
        </BlockStack>

        {/* Widgets List - Horizontal Layout */}
        <BlockStack gap="400">
          <Text as="h2" variant="headingLg">Available Widgets</Text>

          {widgets.map((widget, index) => (
            <Card key={widget.id}>
              <Layout>
                {/* Left: Text content */}
                <Layout.Section variant="oneHalf">
                  <Box padding="400">
                    <BlockStack gap="400">
                      <Text as="h3" variant="headingMd">{widget.name}</Text>
                      <Text as="p" variant="bodyMd">{widget.description}</Text>

                      <BlockStack gap="200">
                        <Text as="p" variant="bodySm" fontWeight="semibold">Features:</Text>
                        <InlineStack gap="200" wrap>
                          {widget.features.map((feature, i) => (
                            <Badge key={i} tone="success">✓ {feature}</Badge>
                          ))}
                        </InlineStack>
                      </BlockStack>

                      <Text as="p" variant="bodySm" tone="subdued">
                        📍 {widget.placement}
                      </Text>

                      <InlineStack gap="200">
                        <Button variant="primary" onClick={openThemeEditor}>
                          Add to Theme
                        </Button>
                        <Button onClick={() => setActiveModal(widget.id)}>
                          📖 Setup Guide
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  </Box>
                </Layout.Section>

                {/* Right: Preview */}
                <Layout.Section variant="oneHalf">
                  <Box
                    padding="400"
                    background="bg-surface-secondary"
                    borderRadius="200"
                    minHeight="200px"
                  >
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      minHeight: "200px",
                    }}>
                      {getPreview(widget.id)}
                    </div>
                  </Box>
                </Layout.Section>
              </Layout>
            </Card>
          ))}
        </BlockStack>

        {/* How to Add Section */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingLg">🚀 How to Add Widgets</Text>
            <Divider />
            <Layout>
              <Layout.Section variant="oneThird">
                <BlockStack gap="200" inlineAlign="center">
                  <div style={{
                    width: "48px", height: "48px",
                    background: "#f0fdf4",
                    borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "24px",
                    border: "2px solid #bbf7d0",
                    color: "#16a34a",
                  }}><i className="fi fi-rr-palette"></i></div>
                  <Text as="p" variant="headingSm">Open Theme Editor</Text>
                  <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                    Go to Online Store → Themes → Customize
                  </Text>
                </BlockStack>
              </Layout.Section>
              <Layout.Section variant="oneThird">
                <BlockStack gap="200" inlineAlign="center">
                  <div style={{
                    width: "48px", height: "48px",
                    background: "#f0fdf4",
                    borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "24px",
                    border: "2px solid #bbf7d0",
                    color: "#16a34a",
                  }}><i className="fi fi-rr-apps-add"></i></div>
                  <Text as="p" variant="headingSm">Add App Block</Text>
                  <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                    Click "Add section" and search for "Afforestation"
                  </Text>
                </BlockStack>
              </Layout.Section>
              <Layout.Section variant="oneThird">
                <BlockStack gap="200" inlineAlign="center">
                  <div style={{
                    width: "48px", height: "48px",
                    background: "#f0fdf4",
                    borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "24px",
                    border: "2px solid #bbf7d0",
                    color: "#16a34a",
                  }}><i className="fi fi-rr-check"></i></div>
                  <Text as="p" variant="headingSm">Save & Done</Text>
                  <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                    Position the widget and click Save
                  </Text>
                </BlockStack>
              </Layout.Section>
            </Layout>
            <Divider />
            <InlineStack align="center">
              <Button variant="primary" size="large" onClick={openThemeEditor}>
                🎨 Open Theme Editor Now
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        {/* Support */}
        <Card>
          <Layout>
            <Layout.Section variant="twoThirds">
              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">Need help setting up?</Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Our team is here to help you get the most out of your impact widgets.
                </Text>
              </BlockStack>
            </Layout.Section>
            <Layout.Section variant="oneThird">
              <InlineStack align="end" gap="200">
                <Button url="https://afforestation.org/docs/shopify" external>
                  📚 Docs
                </Button>
                <Button url="https://afforestation.org/contact" external variant="primary">
                  💬 Support
                </Button>
              </InlineStack>
            </Layout.Section>
          </Layout>
        </Card>
      </BlockStack>

      {/* Setup Guide Modals */}
      {widgets.map((widget) => (
        <Modal
          key={widget.id}
          open={activeModal === widget.id}
          onClose={() => setActiveModal(null)}
          title={`Add the ${widget.name}`}
          primaryAction={{
            content: "Open Theme Editor",
            onAction: () => {
              openThemeEditor()
              setActiveModal(null)
            },
          }}
          secondaryActions={[{ content: "Close", onAction: () => setActiveModal(null) }]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                <div style={{ display: "flex", justifyContent: "center" }}>
                  {getPreview(widget.id)}
                </div>
              </Box>

              <Text as="p" variant="bodyMd">{widget.description}</Text>

              <Divider />

              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">Installation Steps</Text>

                {[
                  "Go to Online Store → Themes → Customize in your Shopify admin",
                  `Navigate to ${widget.placement} where you want the widget`,
                  'Click "Add section" or "Add block" and search for "Afforestation"',
                  `Select "${widget.name}" and click Save`,
                ].map((step, i) => (
                  <InlineStack key={i} gap="200" blockAlign="start">
                    <div style={{
                      background: "#16a34a",
                      color: "#fff",
                      width: "20px", height: "20px",
                      borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "11px",
                      flexShrink: 0,
                    }}>{i + 1}</div>
                    <Text as="p" variant="bodyMd">{step}</Text>
                  </InlineStack>
                ))}
              </BlockStack>

              <Banner tone="info">
                <p>💡 Customize colors and styles from the <a href="/app/additional">Customize Styles</a> page.</p>
              </Banner>
            </BlockStack>
          </Modal.Section>
        </Modal>
      ))}
    </Page>
  )
}
