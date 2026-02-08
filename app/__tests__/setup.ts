/**
 * Test setup file for Vitest
 * Configures global mocks and test utilities
 */

import { vi } from "vitest";

// Mock Prisma client
vi.mock("../db.server", () => ({
    default: {
        shopifySettings: {
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            upsert: vi.fn(),
        },
        shopifyShop: {
            findUnique: vi.fn(),
            create: vi.fn(),
        },
        shopifyFlowLog: {
            create: vi.fn(),
        },
        $queryRaw: vi.fn(),
    },
}));

// Mock Shopify authentication
vi.mock("../shopify.server", () => ({
    authenticate: {
        admin: vi.fn().mockResolvedValue({
            session: { shop: "test-shop.myshopify.com" },
            admin: {
                graphql: vi.fn(),
            },
        }),
        webhook: vi.fn().mockResolvedValue({
            shop: "test-shop.myshopify.com",
            topic: "APP_UNINSTALLED",
            payload: {},
        }),
    },
}));

// Mock environment variables
process.env.SHOPIFY_API_KEY = "test-api-key";
process.env.SHOPIFY_API_SECRET = "test-api-secret";
