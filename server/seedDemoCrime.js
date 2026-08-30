/**
 * DEMO CRIME COMPLAINT SEED SCRIPT
 *
 * Generates and seeds EXACTLY 1,000 synthetic/demo cybercrime complaint records
 * distributed realistically across all 28 Indian States and 8 Union Territories.
 *
 * All records are explicitly tagged with:
 * - isDemoData: true
 * - source: "DEMO_SEED"
 *
 * Safe & repeatable: Won't duplicate if already seeded.
 */

const sequelize = require('./database');
const Complaint = require('./models/Complaint');
const statesDistricts = require('./statesDistricts.json');

const CRIME_TYPES = [
  "UPI Fraud",
  "ATM Fraud & Card Skimming",
  "Online Banking & Corporate Phishing",
  "Phishing & SIM Swap",
  "Call Center & Tech Support Scam",
  "Investment Scam",
  "Identity Theft & Aadhaar Fraud",
  "Loan App Harassment"
];

const VICTIM_BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Axis Bank",
  "Canara Bank",
  "Kotak Mahindra Bank",
  "Union Bank of India"
];

const STATUSES = ["Pending", "Analyzed", "Under Investigation", "Resolved", "Closed"];

// Approximate state center coordinates
const STATE_COORDS = {
  "Andhra Pradesh": [15.9129, 79.7400],
  "Arunachal Pradesh": [28.2180, 94.7278],
  "Assam": [26.2006, 92.9376],
  "Bihar": [25.0961, 85.3131],
  "Chhattisgarh": [21.2787, 81.8661],
  "Goa": [15.2993, 74.1240],
  "Gujarat": [22.2587, 71.1924],
  "Haryana": [29.0588, 76.0856],
  "Himachal Pradesh": [31.1048, 77.1734],
  "Jharkhand": [23.6102, 85.2799],
  "Karnataka": [15.3173, 75.7139],
  "Kerala": [10.8505, 76.2711],
  "Madhya Pradesh": [22.9734, 78.6569],
  "Maharashtra": [19.7515, 75.7139],
  "Manipur": [24.6637, 93.9063],
  "Meghalaya": [25.4670, 91.3662],
  "Mizoram": [23.1645, 92.9376],
  "Nagaland": [26.1584, 94.5624],
  "Odisha": [20.9517, 85.0985],
  "Punjab": [31.1471, 75.3412],
  "Rajasthan": [27.0238, 74.2179],
  "Sikkim": [27.5330, 88.5122],
  "Tamil Nadu": [11.1271, 78.6569],
  "Telangana": [18.1124, 79.0193],
  "Tripura": [23.9408, 91.9882],
  "Uttar Pradesh": [26.8467, 80.9462],
  "Uttarakhand": [30.0668, 79.0193],
  "West Bengal": [22.9868, 87.8550],
  "Andaman and Nicobar Islands": [11.7401, 92.6586],
  "Chandigarh": [30.7333, 76.7794],
  "Dadra and Nagar Haveli and Daman and Diu": [20.3974, 72.8328],
  "Delhi": [28.7041, 77.1025],
  "Jammu and Kashmir": [33.7782, 76.5762],
  "Ladakh": [34.1526, 77.5771],
  "Lakshadweep": [10.5667, 72.6417],
  "Puducherry": [11.9416, 79.8083]
};

async function seedDemoCrimeData() {
  await sequelize.sync();

  // Ensure new columns exist on SQLite table
  const queryInterface = sequelize.getQueryInterface();
  const table = await queryInterface.describeTable('Complaints');
  if (!table.source) {
    await sequelize.query("ALTER TABLE Complaints ADD COLUMN source TEXT DEFAULT 'DEMO_SEED';");
  }
  if (!table.isDemoData) {
    await sequelize.query("ALTER TABLE Complaints ADD COLUMN isDemoData BOOLEAN DEFAULT 1;");
  }
  if (!table.latitude) {
    await sequelize.query("ALTER TABLE Complaints ADD COLUMN latitude REAL;");
  }
  if (!table.longitude) {
    await sequelize.query("ALTER TABLE Complaints ADD COLUMN longitude REAL;");
  }

  const { Op } = require('sequelize');
  const existingDemoCount = await Complaint.count({ where: { complaintId: { [Op.like]: 'DEMO-CC-%' } } });
  if (existingDemoCount >= 1000) {
    console.log(`Demo crime records (DEMO-CC-*) already present (${existingDemoCount} records). Skipping seeding.`);
    return;
  }

  console.log("Generating 1,000 synthetic demo crime complaint records...");

  const allStates = Object.keys(statesDistricts);
  const records = [];

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];

  for (let i = 1; i <= 1000; i++) {
    const state = allStates[(i - 1) % allStates.length];
    const districts = statesDistricts[state] || ["Central"];
    const district = districts[i % districts.length];
    const crimeType = CRIME_TYPES[i % CRIME_TYPES.length];
    const bank = VICTIM_BANKS[i % VICTIM_BANKS.length];
    const status = STATUSES[i % STATUSES.length];

    // Center coordinates with small jitter for neighborhood spread
    const baseCoord = STATE_COORDS[state] || [22.0, 79.0];
    const lat = +(baseCoord[0] + (Math.sin(i * 13) * 0.15)).toFixed(5);
    const lng = +(baseCoord[1] + (Math.cos(i * 17) * 0.15)).toFixed(5);

    // Realistic loss amount between ₹15,000 and ₹9,50,000
    const rawAmt = 15000 + (Math.floor(Math.sin(i * 7) * 450000) + 460000);
    const amountStr = `₹${rawAmt.toLocaleString('en-IN')}`;

    // Date in August 2026 or 2026 range
    const day = (i % 28) + 1;
    const month = MONTHS[i % MONTHS.length];
    const dateStr = `${String(day).padStart(2, '0')} ${month} 2026`;

    const hour = (i * 3) % 24;
    const minute = (i * 7) % 60;
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    const riskScore = 40 + (i % 55);
    const riskLevel = riskScore >= 75 ? "HIGH" : riskScore >= 55 ? "MEDIUM" : "LOW";

    records.push({
      complaintId: `DEMO-CC-${String(i).padStart(4, '0')}`,
      type: crimeType,
      location: `${district} Sector ${1 + (i % 12)}, ${state}`,
      state: state,
      district: district,
      city: district,
      amount: amountStr,
      date: dateStr,
      status: status,
      time: timeStr,
      victimBank: bank,
      suspectMule: `MULE-ACC-${100000 + (i * 37) % 900000} (Cluster ${1 + (i % 8)})`,
      latitude: lat,
      longitude: lng,
      isDemoData: true,
      source: 'DEMO_SEED',
      predictionData: {
        score: riskScore,
        riskLevel: riskLevel,
        coordinates: [lat, lng],
        time: `${timeStr} - ${String((hour + 3) % 24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        nearby: `${3 + (i % 12)} ATMs nearby`,
        confidence: `${(80 + (i % 18)).toFixed(1)}%`,
        model: "CNN-LSTM Spatio-Temporal Net",
        recommendedAction: riskScore >= 75 ? "Immediate Lien & Geofence Patrol" : "Standard Surveillance"
      }
    });
  }

  // Bulk insert
  await Complaint.bulkCreate(records, { ignoreDuplicates: true });

  const finalCount = await Complaint.count({ where: { complaintId: { [Op.like]: 'DEMO-CC-%' } } });
  const totalCount = await Complaint.count();

  console.log("==================================================");
  console.log("Demo Crime Seed Completed Successfully!");
  console.log(`Records Seeded: ${finalCount} (Marked isDemoData: true, source: DEMO_SEED)`);
  console.log(`Total Complaints in DB: ${totalCount}`);
  console.log("==================================================");
}

if (require.main === module) {
  seedDemoCrimeData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed error:", err);
      process.exit(1);
    });
}

module.exports = seedDemoCrimeData;
