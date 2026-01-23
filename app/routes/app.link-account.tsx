import { json, redirect } from "@remix-run/node"
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node"
import { useLoaderData, useFetcher, useNavigate } from "@remix-run/react"
import {
  Page,
  Card,
  Text,
  BlockStack,
  TextField,
  Button,
  Banner,
  InlineStack,
  Box,
  Divider,
  Icon,
} from "@shopify/polaris"
import { ExternalIcon, CheckCircleIcon } from "@shopify/polaris-icons"
import { TitleBar } from "@shopify/app-bridge-react"
import { authenticate } from "../shopify.server"
import prisma from "../db.server"
import { useEffect, useState } from "react"
import crypto from "crypto"

const MAIN_APP_URL = process.env.MAIN_APP_URL || "https://afforestation.org"

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request)
  const shop = session.shop

  const shopRecord = await prisma.shopifyShop.findUnique({
    where: { shopDomain: shop },
  })

  // If linked, get company name from the main database
  let companyName = null
  if (shopRecord?.companyId) {
    const company = await prisma.$queryRaw<{ company_name: string }[]>`
      SELECT company_name FROM company_profiles WHERE id = ${shopRecord.companyId}
    `
    companyName = company[0]?.company_name || null
  }

  return json({
    isLinked: shopRecord?.companyId !== null && shopRecord?.companyId !== undefined,
    companyId: shopRecord?.companyId,
    companyName,
    shopDomain: shop,
    shopName: shopRecord?.shopName || shop.replace('.myshopify.com', ''),
  })
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request)
  const shop = session.shop
  const formData = await request.formData()
  const actionType = formData.get("action")

  // Generate signup token and redirect to main app
  if (actionType === "createAccount") {
    try {
      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

      // Store token in database
      await prisma.$executeRaw`
        INSERT INTO shopify_auth_tokens (shop_domain, token, token_type, expires_at)
        VALUES (${shop}, ${token}, 'signup', ${expiresAt})
      `

      // Return the redirect URL
      return json({
        success: true,
        redirectUrl: `${MAIN_APP_URL}/signup/shopify?token=${token}`,
      })
    } catch (error) {
      console.error("Failed to generate signup token:", error)
      return json({
        success: false,
        error: "Could not generate signup link. Please try again.",
      })
    }
  }

  // Generate login token and redirect to main app dashboard
  if (actionType === "loginToDashboard") {
    try {
      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

      // Store token in database
      await prisma.$executeRaw`
        INSERT INTO shopify_auth_tokens (shop_domain, token, token_type, expires_at)
        VALUES (${shop}, ${token}, 'login', ${expiresAt})
      `

      // Return the redirect URL
      return json({
        success: true,
        redirectUrl: `${MAIN_APP_URL}/auth/shopify?token=${token}`,
      })
    } catch (error) {
      console.error("Failed to generate login token:", error)
      return json({
        success: false,
        error: "Could not generate login link. Please try again.",
      })
    }
  }

  // Link account with existing code
  if (actionType === "linkAccount") {
    const linkCode = formData.get("linkCode") as string

    if (!linkCode || linkCode.trim().length === 0) {
      return json({ success: false, error: "Please enter a link code" })
    }

    try {
      const response = await fetch(`${MAIN_APP_URL}/api/shopify/validate-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          linkCode: linkCode.trim(),
          shopDomain: shop,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return json({
          success: false,
          error: errorData.message || "Invalid or expired link code",
        })
      }

      const data = await response.json()
      
      if (data.companyId) {
        await prisma.shopifyShop.update({
          where: { shopDomain: shop },
          data: { companyId: data.companyId },
        })

        return json({ 
          success: true, 
          message: `Successfully linked to ${data.companyName || "company account"}!` 
        })
      }

      return json({ success: false, error: "Invalid link code" })
    } catch (error) {
      console.error("Failed to validate link code:", error)
      return json({
        success: false,
        error: "Could not connect to Afforestation. Please try again later.",
      })
    }
  }

  // Unlink account
  if (actionType === "unlinkAccount") {
    await prisma.shopifyShop.update({
      where: { shopDomain: shop },
      data: { companyId: null },
    })

    return json({ success: true, message: "Account unlinked successfully" })
  }

  return json({ success: false, error: "Unknown action" })
}

export default function LinkAccount() {
  const { isLinked, companyId, companyName, shopDomain, shopName } = useLoaderData<typeof loader>()
  const fetcher = useFetcher<typeof action>()
  const navigate = useNavigate()
  const [linkCode, setLinkCode] = useState("")
  const [showLinkForm, setShowLinkForm] = useState(false)

  const isSubmitting = fetcher.state !== "idle"

  // Handle redirect URLs from actions
  useEffect(() => {
    if (fetcher.data?.redirectUrl) {
      window.open(fetcher.data.redirectUrl, '_blank')
    }
  }, [fetcher.data])

  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.message) {
      setTimeout(() => navigate("/app"), 1500)
    }
  }, [fetcher.data, navigate])

  return (
    <Page
      backAction={{ content: "Dashboard", onAction: () => navigate("/app") }}
      title="Company Account"
    >
      <TitleBar title="Company Account" />
      <BlockStack gap="500">
        {fetcher.data?.success && fetcher.data?.message && (
          <Banner tone="success">
            <p>{fetcher.data.message}</p>
          </Banner>
        )}

        {fetcher.data?.error && (
          <Banner tone="critical">
            <p>{fetcher.data.error}</p>
          </Banner>
        )}

        {isLinked ? (
          // LINKED STATE
          <>
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="200" align="start">
                  <div style={{ color: '#2d5a27' }}>
                    <Icon source={CheckCircleIcon} />
                  </div>
                  <Text as="h2" variant="headingMd">
                    Account Connected
                  </Text>
                </InlineStack>
                
                <Text as="p" variant="bodyMd" tone="subdued">
                  Your Shopify store <strong>{shopName}</strong> is linked to your 
                  Afforestation company account{companyName ? ` "${companyName}"` : ''}.
                </Text>
                
                <Text as="p" variant="bodyMd">
                  All tree planting impact from this store will appear in your 
                  company ESG dashboard and reports.
                </Text>

                <Divider />

                <InlineStack gap="300">
                  <fetcher.Form method="POST">
                    <input type="hidden" name="action" value="loginToDashboard" />
                    <Button 
                      submit 
                      variant="primary" 
                      loading={isSubmitting}
                      icon={ExternalIcon}
                    >
                      Login to Dashboard
                    </Button>
                  </fetcher.Form>
                  
                  <fetcher.Form method="POST">
                    <input type="hidden" name="action" value="unlinkAccount" />
                    <Button submit tone="critical" loading={isSubmitting}>
                      Unlink Account
                    </Button>
                  </fetcher.Form>
                </InlineStack>
              </BlockStack>
            </Card>
          </>
        ) : (
          // NOT LINKED STATE
          <>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Connect to Afforestation
                </Text>
                <Text as="p" variant="bodyMd">
                  Link your Shopify store to an Afforestation company account 
                  to include your tree planting impact in ESG reports and dashboards.
                </Text>
                
                <Divider />

                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    New to Afforestation?
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Create a free company account and get started in seconds.
                  </Text>
                  <fetcher.Form method="POST">
                    <input type="hidden" name="action" value="createAccount" />
                    <Button 
                      submit 
                      variant="primary" 
                      loading={isSubmitting}
                      icon={ExternalIcon}
                    >
                      Create Company Account
                    </Button>
                  </fetcher.Form>
                </BlockStack>

                <Divider />

                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    Already have an account?
                  </Text>
                  {!showLinkForm ? (
                    <Button onClick={() => setShowLinkForm(true)}>
                      Link Existing Account
                    </Button>
                  ) : (
                    <fetcher.Form method="POST">
                      <input type="hidden" name="action" value="linkAccount" />
                      <BlockStack gap="300">
                        <TextField
                          label="Link Code"
                          name="linkCode"
                          value={linkCode}
                          onChange={setLinkCode}
                          placeholder="e.g. AFOR_123_ABC123"
                          autoComplete="off"
                          helpText="Get this code from your Afforestation dashboard under Settings → Integrations"
                        />
                        <InlineStack gap="200">
                          <Button submit variant="primary" loading={isSubmitting}>
                            Link Account
                          </Button>
                          <Button onClick={() => setShowLinkForm(false)}>
                            Cancel
                          </Button>
                        </InlineStack>
                      </BlockStack>
                    </fetcher.Form>
                  )}
                </BlockStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  How to Link an Existing Account
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">
                    1. Log in to your Afforestation company account at afforestation.org
                  </Text>
                  <Text as="p" variant="bodyMd">
                    2. Go to Settings → Integrations
                  </Text>
                  <Text as="p" variant="bodyMd">
                    3. Click "Generate Shopify Link Code"
                  </Text>
                  <Text as="p" variant="bodyMd">
                    4. Copy the code and paste it above
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </>
        )}
      </BlockStack>
    </Page>
  )
}
