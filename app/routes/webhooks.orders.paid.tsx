import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { shop, payload, topic } = await authenticate.webhook(request);

    console.log(`Received ${topic} webhook for ${shop}`);

    if (topic !== "ORDERS_PAID") {
        return new Response();
    }

    const settings = await prisma.setting.findUnique({ where: { shop } });
    if (!settings || !settings.isEnabled) {
        return new Response();
    }

    let treesToPlant = 0;
    if (settings.triggerType === "fixed") {
        treesToPlant = settings.triggerValue;
    } else if (settings.triggerType === "threshold") {
        const totalAmount = parseFloat(payload.total_price || "0");
        treesToPlant = Math.floor(totalAmount / settings.triggerValue);
    }

    if (treesToPlant > 0) {
        const trees = Math.round(treesToPlant);
        const co2PerTree = 20; // estimate 20kg per tree

        await prisma.impact.upsert({
            where: { shop },
            update: {
                treesPlanted: { increment: trees },
                co2Offset: { increment: trees * co2PerTree },
            },
            create: {
                shop,
                treesPlanted: trees,
                co2Offset: trees * co2PerTree,
            },
        });

        console.log(`Successfully mapped impact: ${trees} trees for ${shop}`);
        // Here we would call the Tree-Nation / Ecologi API
    }

    return new Response();
};
