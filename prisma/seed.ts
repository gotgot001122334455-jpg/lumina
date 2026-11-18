import prisma from '../api/db.ts';
import bcrypt from 'bcrypt';

async function upsertSetting(key: string, value: string) {
  const existing = await prisma.setting.findUnique({ where: { key } });
  if (existing) {
    await prisma.setting.update({ where: { key }, data: { value } });
  } else {
    await prisma.setting.create({ data: { key, value } });
  }
}

async function main() {
  console.log('Seeding settings...');
  await upsertSetting('EMAIL_PROVIDER', 'BREVO');
  await upsertSetting('BREVO_API_KEY', process.env.BREVO_API_KEY || 'xkeysib-placeholder');
  await upsertSetting('SMTP_FROM', '"Lumina Bank" <team@theluminaonlinebanking.com>');
  await upsertSetting('SMARTSUPP_KEY', process.env.SMARTSUPP_KEY || 'a29b1125935b9e4e98019434f0cfae05fa0ee5e8');
  await upsertSetting('SMARTSUPP_ENABLED', 'true');

  console.log('Checking if admin user exists...');
  const existingAdminByEmail = await prisma.user.findUnique({
    where: { email: 'admin@theluminaonlinebanking.com' }
  });

  const existingAdminByAccount = await prisma.user.findFirst({
    where: { accountNumber: '00000000' }
  });

  const passwordHash = await bcrypt.hash('Mickey123@', 10);

  if (existingAdminByEmail) {
    console.log('Updating existing admin user by email...');
    await prisma.user.update({
      where: { id: existingAdminByEmail.id },
      data: {
        passwordHash,
        fullName: 'Mr Mickey',
        role: 'ADMIN',
        kycStatus: 'APPROVED',
        accountStatus: 'ACTIVE'
      }
    });
    console.log('✅ Admin user updated successfully.');
  } else if (existingAdminByAccount) {
    console.log('Updating existing admin user by account number...');
    await prisma.user.update({
      where: { id: existingAdminByAccount.id },
      data: {
        email: 'admin@theluminaonlinebanking.com',
        passwordHash,
        fullName: 'Mr Mickey',
        role: 'ADMIN',
        kycStatus: 'APPROVED',
        accountStatus: 'ACTIVE'
      }
    });
    console.log('✅ Admin user updated successfully with new email: admin@theluminaonlinebanking.com');
  } else {
    console.log('Creating admin user...');
    await prisma.user.create({
      data: {
        email: 'admin@theluminaonlinebanking.com',
        passwordHash: passwordHash,
        fullName: 'Mr Mickey',
        accountNumber: '00000000',
        role: 'ADMIN',
        kycStatus: 'APPROVED',
        accountStatus: 'ACTIVE'
      }
    });
    console.log('✅ Admin user created successfully:');
    console.log('Email: admin@theluminaonlinebanking.com');
    console.log('Password: Mickey123@');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
