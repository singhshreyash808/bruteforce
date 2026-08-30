const PatrolUnit = require('./models/PatrolUnit');

const basePatrols = [
  // Maharashtra - Mumbai & Suburbs
  {
    unitCode: 'PATROL-MH-01',
    vehicleNumber: 'MH-02-CP-1012',
    vehicleType: 'Cyber Quick-Response Interceptor',
    officerName: 'Insp. Rajesh Shinde',
    officerId: 'OFFICER-001',
    phone: '+91 98201 10001',
    status: 'AVAILABLE',
    isAvailable: true,
    latitude: 19.1136,
    longitude: 72.8697,
    state: 'Maharashtra',
    district: 'Mumbai',
    sector: 'Andheri East Tactical Zone'
  },
  {
    unitCode: 'PATROL-MH-02',
    vehicleNumber: 'MH-01-BK-4421',
    vehicleType: 'Sector Surveillance Mobile Unit',
    officerName: 'SI Vikram Rathore',
    officerId: 'OFFICER-002',
    phone: '+91 98201 10002',
    status: 'AVAILABLE',
    isAvailable: true,
    latitude: 19.0596,
    longitude: 72.8295,
    state: 'Maharashtra',
    district: 'Mumbai',
    sector: 'Bandra West Financial Zone'
  },
  {
    unitCode: 'PATROL-MH-03',
    vehicleNumber: 'MH-12-CY-3390',
    vehicleType: 'ATM Tactical Escort Van',
    officerName: 'ASI Amit Verma',
    officerId: 'OFFICER-003',
    phone: '+91 98201 10003',
    status: 'AVAILABLE',
    isAvailable: true,
    latitude: 18.5204,
    longitude: 73.8567,
    state: 'Maharashtra',
    district: 'Pune',
    sector: 'Shivaji Nagar Cyber Hub'
  },
  {
    unitCode: 'PATROL-MH-04',
    vehicleNumber: 'MH-31-TR-8812',
    vehicleType: 'Rapid Geofence Response Unit',
    officerName: 'Insp. Pradeep Deshmukh',
    officerId: 'OFFICER-004',
    phone: '+91 98201 10004',
    status: 'AVAILABLE',
    isAvailable: true,
    latitude: 21.1458,
    longitude: 79.0882,
    state: 'Maharashtra',
    district: 'Nagpur',
    sector: 'Sitabuldi Cash Corridor'
  },

  // Delhi NCR
  {
    unitCode: 'PATROL-DL-01',
    vehicleNumber: 'DL-01-LEA-9011',
    vehicleType: 'Cyber Taskforce Interceptor',
    officerName: 'Insp. Hardeep Singh',
    officerId: 'OFFICER-005',
    phone: '+91 98110 20001',
    status: 'AVAILABLE',
    isAvailable: true,
    latitude: 28.6139,
    longitude: 77.2090,
    state: 'Delhi',
    district: 'New Delhi',
    sector: 'Connaught Place Financial Ring'
  },
  {
    unitCode: 'PATROL-DL-02',
    vehicleNumber: 'DL-03-CY-7712',
    vehicleType: 'Sector Mobile Recon Unit',
    officerName: 'SI Neha Sharma',
    officerId: 'OFFICER-006',
    phone: '+91 98110 20002',
    status: 'AVAILABLE',
    isAvailable: true,
    latitude: 28.5355,
    longitude: 77.2600,
    state: 'Delhi',
    district: 'South Delhi',
    sector: 'Nehru Place IT Corridor'
  },

  // Uttar Pradesh
  {
    unitCode: 'PATROL-UP-01',
    vehicleNumber: 'UP-32-CY-9901',
    vehicleType: 'Cyber Crime Tactical Mobile',
    officerName: 'Insp. Alok Mishra',
    officerId: 'OFFICER-007',
    phone: '+91 94500 30001',
    status: 'AVAILABLE',
    isAvailable: true,
    latitude: 26.8467,
    longitude: 80.9462,
    state: 'Uttar Pradesh',
    district: 'Lucknow',
    sector: 'Hazratganj Banking Sector'
  },
  {
    unitCode: 'PATROL-UP-02',
    vehicleNumber: 'UP-16-LE-6612',
    vehicleType: 'Mule Interception Cruiser',
    officerName: 'SI Sanjay Yadav',
    officerId: 'OFFICER-008',
    phone: '+91 94500 30002',
    status: 'AVAILABLE',
    isAvailable: true,
    latitude: 28.5355,
    longitude: 77.3910,
    state: 'Uttar Pradesh',
    district: 'Gautam Buddha Nagar',
    sector: 'Noida Sector 62 Commercial'
  },

  // Karnataka
  {
    unitCode: 'PATROL-KA-01',
    vehicleNumber: 'KA-01-CR-5544',
    vehicleType: 'Cyber Interceptor Cruiser',
    officerName: 'Insp. R. Venkatesh',
    officerId: 'OFFICER-009',
    phone: '+91 99000 40001',
    status: 'AVAILABLE',
    isAvailable: true,
    latitude: 12.9716,
    longitude: 77.5946,
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    sector: 'MG Road Cyber Zone'
  },

  // Telangana
  {
    unitCode: 'PATROL-TS-01',
    vehicleNumber: 'TS-09-LEA-1122',
    vehicleType: 'Cyber Taskforce Interceptor',
    officerName: 'Insp. K. Srinivas',
    officerId: 'OFFICER-010',
    phone: '+91 99890 50001',
    status: 'AVAILABLE',
    isAvailable: true,
    latitude: 17.3850,
    longitude: 78.4867,
    state: 'Telangana',
    district: 'Hyderabad',
    sector: 'Hitec City IT Corridor'
  },

  // Gujarat
  {
    unitCode: 'PATROL-GJ-01',
    vehicleNumber: 'GJ-01-CY-3321',
    vehicleType: 'Sector Mobile Recon Unit',
    officerName: 'Insp. Chirag Patel',
    officerId: 'OFFICER-011',
    phone: '+91 98980 60001',
    status: 'AVAILABLE',
    isAvailable: true,
    latitude: 23.0225,
    longitude: 72.5714,
    state: 'Gujarat',
    district: 'Ahmedabad',
    sector: 'Ashram Road Financial Corridor'
  },

  // West Bengal
  {
    unitCode: 'PATROL-WB-01',
    vehicleNumber: 'WB-02-LEA-7788',
    vehicleType: 'Cyber Crime Quick Response',
    officerName: 'Insp. Sourav Banerjee',
    officerId: 'OFFICER-012',
    phone: '+91 98300 70001',
    status: 'AVAILABLE',
    isAvailable: true,
    latitude: 22.5726,
    longitude: 88.3639,
    state: 'West Bengal',
    district: 'Kolkata',
    sector: 'Park Street Banking Ring'
  },

  // Tamil Nadu
  {
    unitCode: 'PATROL-TN-01',
    vehicleNumber: 'TN-01-CY-4411',
    vehicleType: 'Cyber Recon Interceptor',
    officerName: 'Insp. M. Murugan',
    officerId: 'OFFICER-013',
    phone: '+91 98400 80001',
    status: 'AVAILABLE',
    isAvailable: true,
    latitude: 13.0827,
    longitude: 80.2707,
    state: 'Tamil Nadu',
    district: 'Chennai',
    sector: 'Anna Salai Financial Center'
  },

  // Andhra Pradesh
  {
    unitCode: 'PATROL-AP-01',
    vehicleNumber: 'AP-03-LEA-9912',
    vehicleType: 'Sector Mobile Tactical Van',
    officerName: 'Insp. B. Reddy',
    officerId: 'OFFICER-014',
    phone: '+91 98480 90001',
    status: 'AVAILABLE',
    isAvailable: true,
    latitude: 13.2172,
    longitude: 79.1003,
    state: 'Andhra Pradesh',
    district: 'Chittoor',
    sector: 'Chittoor Sector 2 Police Perimeter'
  }
];

async function seedPatrolUnits() {
  try {
    const count = await PatrolUnit.count();
    if (count === 0) {
      console.log('Seeding initial Patrol Units...');
      await PatrolUnit.bulkCreate(basePatrols);
      console.log(`Successfully seeded ${basePatrols.length} Patrol Units.`);
    } else {
      console.log(`PatrolUnits already populated (${count} units active).`);
    }
  } catch (err) {
    console.error('Error seeding patrol units:', err);
  }
}

module.exports = { seedPatrolUnits, basePatrols };
