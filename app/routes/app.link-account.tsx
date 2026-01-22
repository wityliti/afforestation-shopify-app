import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher, useNavigate } from "@remix-run/react";
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
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { useEffect, useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const shopRecord = await prisma.shopifyShop.findUnique({
    where: { shopDomain: shop },
  });

  return json({
    isLinked: shopRecord?.companyId !== null,
    companyId: shopRecord?.companyId,
    shopDomain: shop,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const actionType = formData.get("action");

  if (actionType === "linkAccount") {
    const linkCode = formData.get("linkCode") as string;

    if (!linkCode || linkCode.trim().length === 0) {
      return json({ success: false, error: "Please enter a link code" });
    }

    // Validate link code with main app
    // Link code format: COMPANY_<company_id>_<random_token>
    // In production, this would be an API call to the main app
    const mainAppUrl = process.env.MAIN_APP_URL || "https://afforestation.com";
    
    try {
      const response = await fetch(`${mainAppUrl}/api/shopify/validate-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          linkCode: linkCode.trim(),
          shopDomain: shop,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return json({
          success: false,
          error: errorData.message || "Invalid or expired link code",
        });
      }

      const data = await response.json();
      
      if (data.companyId) {
        // Update shop with company link
        await prisma.shopifyShop.update({
          where: { shopDomain: shop },
          data: { companyId: data.companyId },
        });

        return json({ 
          success: true, 
          message: `Successfully linked to ${data.companyName || "company account"}!` 
        });
      }

      return json({ success: false, error: "Invalid link code" });
    } catch (error) {
      console.error("Failed to validate link code:", error);
      return json({
        success: false,
        error: "Could not connect to Afforestation. Please try again later.",
      });
    }
  }

  if (actionType === "unlinkAccount") {
    await prisma.shopifyShop.update({
      where: { shopDomain: shop },
      data: { companyId: null },
    });

    return json({ success: true, message: "Account unlinked successfully" });
  }

  return json({ success: false, error: "Unknown action" });
};

export default function LinkAccount() {
  const { isLinked, companyId, shopDomain } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  const [linkCode, setLinkCode] = useState("");

  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.success) {
      // Redirect to main dashboard after successful action
      setTimeout(() => navigate("/app"), 1500);
    }
  }, [fetcher.data, navigate]);

  return (
    <Page
      backAction={{ content: "Dashboard", onAction: () => navigate("/app") }}
      title="Link Company Account"
    >
      <TitleBar title="Link Account" />
      <BlockStack gap="500">
        {fetcher.data?.success && (
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
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Account Linked ✓
              </Text>
              <Text as="p" variant="bodyMd">
                Your Shopify store ({shopDomain}) is linked to your Afforestation 
                company account. All tree planting impact from this store will 
                appear in your company ESG dashboard.
              </Text>
              <Box paddingBlockStart="200">
                <fetcher.Form method="POST">
                  <input type="hidden" name="action" value="unlinkAccount" />
                  <Button submit tone="critical" loading={isSubmitting}>
                    Unlink Account
                  </Button>
                </fetcher.Form>
              </Box>
            </BlockStack>
          </Card>
        ) : (
          <>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Connect to Your Afforestation Account
                </Text>
                <Text as="p" variant="bodyMd">
                  Link your Shopify store to your Afforestation company account 
                  to include this store's tree planting impact in your company's 
                  ESG reports and dashboards.
                </Text>
                
                <fetcher.Form method="POST">
                  <input type="hidden" name="action" value="linkAccount" />
                  <BlockStack gap="400">
                    <TextField
                      label="Link Code"
                      name="linkCode"
                      value={linkCode}
                      onChange={setLinkCode}
                      placeholder="Enter your company link code"
                      autoComplete="off"
                      helpText="Get this code from your Afforestation company dashboard under Settings → Integrations"
                    />
                    <InlineStack gap="300">
                      <Button submit variant="primary" loading={isSubmitting}>
                        Link Account
                      </Button>
                      <Button
                        url="https://afforestation.com/for-business"
                        target="_blank"
                      >
                        Create Company Account
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </fetcher.Form>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  How to Get Your Link Code
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">
                    1. Log in to your Afforestation company account
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
  );
}
