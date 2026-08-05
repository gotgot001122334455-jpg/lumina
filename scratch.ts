import prisma from './api/db.ts';

async function main() {
  console.log('Clearing all tables in database...');
  
  // List of tables in schema
  const tables = ['Device', 'KycRequest', 'Notification', 'Setting', 'Transaction', 'Wallet', 'User'];
  
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
      console.log(`Truncated table: ${table}`);
    } catch (e) {
      console.error(`Failed to truncate ${table}:`, e);
    }
  }

  console.log('✅ Database clear complete!');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    // Explicitly exit process because pg Pool keeps the Node event loop alive
    process.exit(0);
  });
