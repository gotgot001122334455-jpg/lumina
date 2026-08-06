import prisma from '../api/db.ts';

async function main() {
  console.log('Starting migration to assign unique account numbers...');
  
  const allUsers = await prisma.user.findMany();
  console.log(`Found ${allUsers.length} total users.`);
  
  const usersNeedMigration = allUsers.filter(user => !user.accountNumber);
  console.log(`Found ${usersNeedMigration.length} users needing an account number.`);
  
  if (usersNeedMigration.length === 0) {
    console.log('No users need migration.');
    return;
  }

  // Keep track of all account numbers currently in use (or being assigned)
  const usedAccountNumbers = new Set(
    allUsers.map(u => u.accountNumber).filter(Boolean) as string[]
  );

  for (const user of usersNeedMigration) {
    let accountNumber = '';
    let isUnique = false;
    
    while (!isUnique) {
      accountNumber = Math.floor(10000000 + Math.random() * 90000000).toString();
      if (!usedAccountNumbers.has(accountNumber)) {
        isUnique = true;
      }
    }
    
    usedAccountNumbers.add(accountNumber);
    
    console.log(`Assigning account number ${accountNumber} to user ${user.email} (${user.fullName})...`);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { accountNumber }
    });
  }
  
  console.log('✅ Migration completed successfully!');
}

main()
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
