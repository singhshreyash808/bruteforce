const sequelize = require('./database');
const Complaint = require('./models/Complaint');
const Alert = require('./models/Alert');

const CATEGORIES = ['UPI Fraud','Phishing','ATM Fraud','Online Banking Fraud','SIM Swap','Card Skimming','Lottery Scam','Vishing','Call Center Fraud','Investment Scam'];

function riskLevel(score) {
  if (score >= 85) return 'CRITICAL';
  if (score >= 70) return 'HIGH';
  if (score >= 50) return 'MEDIUM';
  return 'LOW';
}

(async () => {
  await sequelize.sync();
  const existing = await Alert.count();
  if (existing > 0) {
    console.log('Alerts table already has ' + existing + ' records. Skipping seed.');
    process.exit(0);
  }

  const complaints = await Complaint.findAll({ order: [['createdAt', 'DESC']], limit: 500 });
  const toInsert = [];
  for (const c of complaints) {
    const pd = c.predictionData || {};
    const score = typeof pd.score === 'number' ? pd.score : (Math.floor(Math.random() * 55) + 45);
    if (score < 55) continue;
    if (toInsert.length >= 200) break;
    toInsert.push({
      level: riskLevel(score),
      location: c.location || ((c.district ? c.district + ', ' : '') + (c.state || 'Unknown')),
      state: c.state || null,
      district: c.district || null,
      score,
      timeWindow: (pd.time || '18:00 - 22:00'),
      status: Math.random() < 0.65 ? 'Active' : (Math.random() < 0.5 ? 'Acknowledged' : 'Resolved'),
      category: c.type || CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)],
      complaintId: c.complaintId || null,
      createdAt: c.createdAt || new Date()
    });
  }

  const STATES_SAMPLE = [
    ['Maharashtra','Mumbai'],['Maharashtra','Pune'],['Delhi','New Delhi'],
    ['Karnataka','Bengaluru'],['Tamil Nadu','Chennai'],['Telangana','Hyderabad'],
    ['Uttar Pradesh','Lucknow'],['Rajasthan','Jaipur'],['Gujarat','Ahmedabad'],['West Bengal','Kolkata']
  ];
  while (toInsert.length < 80) {
    const pair = STATES_SAMPLE[Math.floor(Math.random() * STATES_SAMPLE.length)];
    const st = pair[0]; const di = pair[1];
    const score = Math.floor(Math.random() * 45) + 55;
    const daysAgo = Math.floor(Math.random() * 30);
    const d = new Date(); d.setDate(d.getDate() - daysAgo);
    toInsert.push({
      level: riskLevel(score),
      location: di + ', ' + st,
      state: st, district: di, score,
      timeWindow: '19:00 - 23:00',
      status: score >= 75 ? 'Active' : (Math.random() < 0.5 ? 'Acknowledged' : 'Resolved'),
      category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)],
      complaintId: null,
      createdAt: d
    });
  }

  await Alert.bulkCreate(toInsert);
  const total = await Alert.count();
  const active = await Alert.count({ where: { status: 'Active' } });
  console.log('Seeded ' + toInsert.length + ' alerts. Total: ' + total + '  Active: ' + active);
  process.exit(0);
})().catch(function(err) { console.error(err); process.exit(1); });