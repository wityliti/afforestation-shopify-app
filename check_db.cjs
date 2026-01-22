const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Check impact ledger using raw query
  const impact = await prisma.$queryRaw`
    SELECT * FROM impact_ledger WHERE source_type = 'shopify' ORDER BY created_at DESC LIMIT 5
  `;
  console.log('Impact Ledger entries:');
  console.log(JSON.stringify(impact, null, 2));
  
  // Check shopify_shops
  const shops = await prisma.shopifyShop.findMany();
  console.log('\nShopify Shops:');
  console.log(JSON.stringify(shops, null, 2));
  
  // Check shopify_settings
  const settings = await prisma.shopifySettings.findMany();
  console.log('\nShopify Settings:');
  console.log(JSON.stringify(settings, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
