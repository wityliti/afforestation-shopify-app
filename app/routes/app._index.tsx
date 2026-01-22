import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useEffect } from "react";
import { useLoaderData, useFetcher } from "@remix-run/react";
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
  Link,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

interface ImpactData {
  totalTreesPlanted: number;
  totalCo2OffsetKg: number;
  totalOrders: number;
  isLinked: boolean;
  companyId: number | null;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Get or create settings
  let settings = await prisma.shopifySettings.findUnique({ where: { shop } });
  if (!settings) {
    settings = await prisma.shopifySettings.create({
      data: { shop, triggerType: "fixed", triggerValue: 1 },
    });
  }

  // Get or create shop record
  let shopRecord = await prisma.shopifyShop.findUnique({
    where: { shopDomain: shop }
  });
  if (!shopRecord) {
    shopRecord = await prisma.shopifyShop.create({
      data: { shopDomain: shop },
    });
  }

  // Query impact from the unified impact_ledger via the view
  // Falls back to direct query if view doesn't exist yet
  let impact: ImpactData = {
    totalTreesPlanted: 0,
    totalCo2OffsetKg: 0,
    totalOrders: 0,
    isLinked: shopRecord.companyId !== null,
    companyId: shopRecord.companyId,
  };

  try {
    const impactResult = await prisma.$queryRaw<Array<{
      total_trees_planted: bigint | null;
      total_co2_offset_kg: number | null;
      total_orders: bigint | null;
    }>>`
      SELECT 
        COALESCE(SUM(trees_planted), 0) as total_trees_planted,
        COALESCE(SUM(co2_offset_kg), 0) as total_co2_offset_kg,
        COUNT(*) as total_orders
      FROM impact_ledger
      WHERE source_type = 'shopify' AND source_id = ${shopRecord.id.toString()}
    `;

    if (impactResult.length > 0) {
      impact.totalTreesPlanted = Number(impactResult[0].total_trees_planted || 0);
      impact.totalCo2OffsetKg = Number(impactResult[0].total_co2_offset_kg || 0);
      impact.totalOrders = Number(impactResult[0].total_orders || 0);
    }
  } catch (error) {
    // impact_ledger table might not exist yet
    console.warn("Could not query impact_ledger:", error);
  }

  return json({ settings, impact, shopId: shopRecord.id });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const actionType = formData.get("action");

  if (actionType === "updateSettings") {
    const triggerType = formData.get("triggerType") as string;
    const triggerValue = parseFloat(formData.get("triggerValue") as string);

    const settings = await prisma.shopifySettings.upsert({
      where: { shop },
      update: { triggerType, triggerValue },
      create: { shop, triggerType, triggerValue },
    });

    return json({ settings, success: true });
  }

  if (actionType === "linkAccount") {
    const linkCode = formData.get("linkCode") as string;
    
    // TODO: Validate link code against main app's company linking system
    // For now, just store the code and show success
    // In production, this would make an API call to the main app to validate
    // and retrieve the company_id
    
    return json({ 
      success: false, 
      error: "Account linking coming soon. Contact support to link your account." 
    });
  }

  return json({ success: false });
};

export default function Index() {
  const { settings, impact, shopId } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const isSaving = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Settings updated");
    }
    if (fetcher.data?.error) {
      shopify.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.data, shopify]);

  const currentTriggerType = (fetcher.formData?.get("triggerType") as string) || settings.triggerType;
  const currentTriggerValue = (fetcher.formData?.get("triggerValue") as string) || settings.triggerValue.toString();

  return (
    <Page>
      <TitleBar title="Afforestation Dashboard" />
      <BlockStack gap="500">
        {!impact.isLinked && (
          <Banner
            title="Link your Afforestation account"
            tone="info"
            action={{
              content: "Link Account",
              url: "/app/link-account",
            }}
            secondaryAction={{
              content: "Learn more",
              url: "https://afforestation.com/for-business",
              target: "_blank",
            }}
          >
            <p>
              Connect your Shopify store to your Afforestation company account 
              to include this impact in your company's ESG dashboard and reports.
            </p>
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingLg">
                  Your Impact Overview 🌳
                </Text>
                <InlineStack gap="1000" wrap={false}>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Total Trees Planted
                    </Text>
                    <Text as="p" variant="heading2xl">
                      {impact.totalTreesPlanted.toLocaleString()}
                    </Text>
                  </BlockStack>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      CO₂ Offset (Est.)
                    </Text>
                    <Text as="p" variant="heading2xl">
                      {impact.totalCo2OffsetKg.toLocaleString()} kg
                    </Text>
                  </BlockStack>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Orders Contributing
                    </Text>
                    <Text as="p" variant="heading2xl">
                      {impact.totalOrders.toLocaleString()}
                    </Text>
                  </BlockStack>
                </InlineStack>
                {impact.isLinked && (
                  <Banner tone="success">
                    <p>
                      This store is linked to your Afforestation company account. 
                      Impact is included in your company dashboard.
                    </p>
                  </Banner>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <fetcher.Form method="POST">
                  <input type="hidden" name="action" value="updateSettings" />
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      Planting Settings
                    </Text>
                    <Select
                      label="Trigger Type"
                      name="triggerType"
                      options={[
                        { label: "Fixed (per order)", value: "fixed" },
                        { label: "Threshold (per spend)", value: "threshold" },
                      ]}
                      value={currentTriggerType}
                      onChange={() => { }} // Form will handle this
                    />
                    <TextField
                      label={currentTriggerType === "fixed" ? "Trees per Order" : "Spend Threshold ($)"}
                      name="triggerValue"
                      type="number"
                      value={currentTriggerValue}
                      autoComplete="off"
                      onChange={() => { }}
                      helpText={
                        currentTriggerType === "fixed"
                          ? "Number of trees to plant per order"
                          : "Plant 1 tree for every $ spent"
                      }
                    />
                    <Button submit variant="primary" loading={isSaving}>
                      Save Settings
                    </Button>
                  </BlockStack>
                </fetcher.Form>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Display Widget
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Show your impact to customers using the Afforestation 
                    theme extension in your storefront.
                  </Text>
                  <Button url="/app/additional">
                    Configure Widget
                  </Button>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
