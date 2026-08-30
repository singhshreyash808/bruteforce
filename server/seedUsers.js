/**
 * seedUsers.js
 * Initialize baseline demo accounts in the database with secure bcrypt password hashing.
 */
const bcrypt = require('bcryptjs');
const sequelize = require('./database');
const User = require('./models/User');

async function seedDefaultUsers() {
  await sequelize.sync();

  const defaultUsers = [
    {
      userId: 'officer',
      fullName: 'Inspector Ramesh Kumar',
      email: 'officer@cybex-intelligence.gov.in',
      phone: '+919876543210',
      password: '1234',
      role: 'officer',
      badgeNumber: 'LEA-MUM-8921',
      designation: 'Cyber Crime Investigator',
      policeStation: 'Cyber Crime Central Cell, Mumbai'
    },
    {
      userId: 'citizen',
      fullName: 'Vikram Sharma',
      email: 'citizen@cybex-intelligence.gov.in',
      phone: '+919876543211',
      password: '1234',
      role: 'citizen',
      aadhaar: '5489 7412 9632',
      city: 'Mumbai'
    },
    {
      userId: 'bank',
      fullName: 'Amitabh Sen',
      email: 'bank@cybex-intelligence.gov.in',
      phone: '+919876543212',
      password: '1234',
      role: 'bank',
      bankName: 'State Bank of India',
      branchCode: 'SBIN0001842',
      employeeId: 'SBI-NODAL-4102'
    },
    {
      userId: 'admin',
      fullName: 'System Administrator',
      email: 'admin@cybex-intelligence.gov.in',
      phone: '+919876543213',
      password: '1234',
      role: 'admin',
      badgeNumber: 'ADMIN-01',
      designation: 'Chief Cyber Intelligence Director'
    }
  ];

  for (const u of defaultUsers) {
    const existing = await User.findOne({ where: { userId: u.userId } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      await User.create({
        userId: u.userId,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        passwordHash,
        role: u.role,
        badgeNumber: u.badgeNumber || null,
        designation: u.designation || null,
        policeStation: u.policeStation || null,
        bankName: u.bankName || null,
        branchCode: u.branchCode || null,
        employeeId: u.employeeId || null,
        aadhaar: u.aadhaar || null,
        city: u.city || null,
        isActive: true
      });
      console.log(`Seeded baseline user: ${u.userId} (${u.role})`);
    }
  }
}

module.exports = { seedDefaultUsers };

if (require.main === module) {
  seedDefaultUsers()
    .then(() => {
      console.log('User seeding complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error seeding users:', err);
      process.exit(1);
    });
}