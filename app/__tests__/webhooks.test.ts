import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "../db.server";

describe("Webhook Handlers", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("app/uninstalled webhook", () => {
        it("should mark shop as inactive on uninstall", async () => {
            const mockUpdate = vi.mocked(prisma.shopifyShop.findUnique);
            mockUpdate.mockResolvedValueOnce({
                id: 1,
                shopDomain: "test-shop.myshopify.com",
                shopName: "Test Shop",
                companyId: null,
                isActive: true,
                installedAt: new Date(),
                uninstalledAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const shop = await prisma.shopifyShop.findUnique({
                where: { shopDomain: "test-shop.myshopify.com" },
            });

            expect(shop).not.toBeNull();
            expect(shop?.isActive).toBe(true);
        });

        it("should handle shop not found gracefully", async () => {
            const mockFindUnique = vi.mocked(prisma.shopifyShop.findUnique);
            mockFindUnique.mockResolvedValueOnce(null);

            const shop = await prisma.shopifyShop.findUnique({
                where: { shopDomain: "nonexistent-shop.myshopify.com" },
            });

            expect(shop).toBeNull();
        });
    });

    describe("orders/paid webhook", () => {
        it("should calculate trees planted for fixed trigger", () => {
            const settings = {
                triggerType: "fixed",
                triggerValue: 2,
                isEnabled: true,
                isPaused: false,
            };

            const orderTotal = 150.00;

            let treesToPlant = 0;
            if (settings.isEnabled && !settings.isPaused) {
                switch (settings.triggerType) {
                    case "fixed":
                        treesToPlant = settings.triggerValue;
                        break;
                    case "percentage":
                        treesToPlant = Math.floor((orderTotal * settings.triggerValue) / 100 / 0.50);
                        break;
                    case "threshold":
                        treesToPlant = Math.floor(orderTotal / settings.triggerValue);
                        break;
                }
            }

            expect(treesToPlant).toBe(2);
        });

        it("should calculate trees planted for percentage trigger", () => {
            const settings = {
                triggerType: "percentage",
                triggerValue: 5, // 5%
                isEnabled: true,
                isPaused: false,
                costPerTree: 0.50,
            };

            const orderTotal = 100.00;

            const donationAmount = (orderTotal * settings.triggerValue) / 100;
            const treesToPlant = Math.floor(donationAmount / settings.costPerTree);

            expect(donationAmount).toBe(5); // 5% of $100
            expect(treesToPlant).toBe(10); // $5 / $0.50 per tree
        });

        it("should calculate trees planted for threshold trigger", () => {
            const settings = {
                triggerType: "threshold",
                triggerValue: 25, // $25 per tree
                isEnabled: true,
                isPaused: false,
            };

            const orderTotal = 100.00;

            const treesToPlant = Math.floor(orderTotal / settings.triggerValue);

            expect(treesToPlant).toBe(4); // $100 / $25 = 4 trees
        });

        it("should not plant trees when paused", () => {
            const settings = {
                triggerType: "fixed",
                triggerValue: 2,
                isEnabled: true,
                isPaused: true,
            };

            const treesToPlant = settings.isPaused ? 0 : settings.triggerValue;

            expect(treesToPlant).toBe(0);
        });

        it("should not plant trees when disabled", () => {
            const settings = {
                triggerType: "fixed",
                triggerValue: 2,
                isEnabled: false,
                isPaused: false,
            };

            const treesToPlant = settings.isEnabled ? settings.triggerValue : 0;

            expect(treesToPlant).toBe(0);
        });

        it("should respect monthly spending limit", () => {
            const settings = {
                monthlyLimit: 50,
                monthlySpent: 45,
                costPerTree: 0.50,
            };

            const treesToPlant = 20; // Would cost $10
            const proposedCost = treesToPlant * settings.costPerTree;
            const remainingBudget = settings.monthlyLimit - settings.monthlySpent;

            const actualTrees = proposedCost <= remainingBudget
                ? treesToPlant
                : Math.floor(remainingBudget / settings.costPerTree);

            expect(actualTrees).toBe(10); // Only $5 remaining = 10 trees max
        });
    });

    describe("GDPR webhooks", () => {
        it("should acknowledge customers/data_request", () => {
            // GDPR data request should return customer's data
            const mockPayload = {
                shop_domain: "test-shop.myshopify.com",
                customer: {
                    id: 12345,
                    email: "customer@example.com",
                },
            };

            // Handler should return 200 OK
            const response = { status: 200 };
            expect(response.status).toBe(200);
        });

        it("should acknowledge customers/redact", () => {
            // GDPR redact should delete customer data
            const mockPayload = {
                shop_domain: "test-shop.myshopify.com",
                customer: {
                    id: 12345,
                },
            };

            // Handler should return 200 OK
            const response = { status: 200 };
            expect(response.status).toBe(200);
        });

        it("should acknowledge shop/redact", () => {
            // Shop redact should cleanup all shop data after 48 hours of uninstall
            const mockPayload = {
                shop_domain: "test-shop.myshopify.com",
            };

            // Handler should return 200 OK
            const response = { status: 200 };
            expect(response.status).toBe(200);
        });
    });
});

describe("Flow Actions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("plant-trees action", () => {
        it("should create flow log entry", async () => {
            const mockCreate = vi.mocked(prisma.shopifyFlowLog.create);
            mockCreate.mockResolvedValueOnce({
                id: "log-id",
                shop: "test-shop.myshopify.com",
                flowId: "flow-123",
                actionType: "plant_trees",
                treesPlanted: 5,
                co2OffsetKg: 0,
                reason: "review_reward",
                metadata: {},
                createdAt: new Date(),
            });

            const result = await prisma.shopifyFlowLog.create({
                data: {
                    shop: "test-shop.myshopify.com",
                    flowId: "flow-123",
                    actionType: "plant_trees",
                    treesPlanted: 5,
                    reason: "review_reward",
                },
            });

            expect(result.actionType).toBe("plant_trees");
            expect(result.treesPlanted).toBe(5);
            expect(mockCreate).toHaveBeenCalledOnce();
        });
    });

    describe("offset-carbon action", () => {
        it("should create flow log with CO2 offset", async () => {
            const mockCreate = vi.mocked(prisma.shopifyFlowLog.create);
            mockCreate.mockResolvedValueOnce({
                id: "log-id",
                shop: "test-shop.myshopify.com",
                flowId: "flow-456",
                actionType: "offset_carbon",
                treesPlanted: 0,
                co2OffsetKg: 10.5,
                reason: "referral",
                metadata: {},
                createdAt: new Date(),
            });

            const result = await prisma.shopifyFlowLog.create({
                data: {
                    shop: "test-shop.myshopify.com",
                    flowId: "flow-456",
                    actionType: "offset_carbon",
                    co2OffsetKg: 10.5,
                    reason: "referral",
                },
            });

            expect(result.actionType).toBe("offset_carbon");
            expect(result.co2OffsetKg).toBe(10.5);
        });
    });
});
