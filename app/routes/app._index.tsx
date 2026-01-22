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
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let settings = await prisma.setting.findUnique({ where: { shop } });
  if (!settings) {
    settings = await prisma.setting.create({
      data: { shop, triggerType: "fixed", triggerValue: 1 },
    });
  }

  let impact = await prisma.impact.findUnique({ where: { shop } });
  if (!impact) {
    impact = await prisma.impact.create({
      data: { shop, treesPlanted: 0, co2Offset: 0 },
    });
  }

  return json({ settings, impact });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const actionType = formData.get("action");

  if (actionType === "updateSettings") {
    const triggerType = formData.get("triggerType") as string;
    const triggerValue = parseFloat(formData.get("triggerValue") as string);

    const settings = await prisma.setting.upsert({
      where: { shop },
      update: { triggerType, triggerValue },
      create: { shop, triggerType, triggerValue },
    });

    return json({ settings, success: true });
  }

  return json({ success: false });
};

export default function Index() {
  const { settings, impact } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const isSaving = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Settings updated");
    }
  }, [fetcher.data, shopify]);

  const currentTriggerType = (fetcher.formData?.get("triggerType") as string) || settings.triggerType;
  const currentTriggerValue = (fetcher.formData?.get("triggerValue") as string) || settings.triggerValue.toString();

  return (
    <Page>
      <TitleBar title="Afforestation Dashboard" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingLg">
                  Your Impact Overview 🌳
                </Text>
                <InlineStack gap="1000">
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Total Trees Planted
                    </Text>
                    <Text as="p" variant="heading2xl">
                      {impact.treesPlanted}
                    </Text>
                  </BlockStack>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      CO2 Offset (Estimated)
                    </Text>
                    <Text as="p" variant="heading2xl">
                      {impact.co2Offset.toFixed(2)} kg
                    </Text>
                  </BlockStack>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
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
                  />
                  <Button submit variant="primary" loading={isSaving}>
                    Save Settings
                  </Button>
                </BlockStack>
              </fetcher.Form>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
