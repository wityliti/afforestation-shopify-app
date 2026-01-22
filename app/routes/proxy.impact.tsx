import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * App Proxy endpoint to fetch impact data for storefront display.
 * This endpoint is called from the store's front-end via the app proxy.
 * URL: /apps/afforestation/impact
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.public.appProxy(request);

    if (!session) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    const shop = session.shop;

    let impact = await prisma.impact.findUnique({ where: { shop } });

    if (!impact) {
        impact = {
            id: "",
            shop,
            treesPlanted: 0,
            co2Offset: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }

    // Return CORS-friendly JSON response
    return json(
        {
            treesPlanted: impact.treesPlanted,
            co2Offset: impact.co2Offset,
        },
        {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json",
            },
        }
    );
};
