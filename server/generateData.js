const sequelize = require('./database');
const Complaint = require('./models/Complaint');
const Task = require('./models/Task');
const Document = require('./models/Document');
const Notification = require('./models/Notification');
const Message = require('./models/Message');
const AuditLog = require('./models/AuditLog');
const { faker } = require('@faker-js/faker');
const fs = require('fs');
const path = require('path');

const BUCKS_MIN = 10000;
const BUCKS_MAX = 500000;

async function generateData() {
  console.log("Syncing database...");
  await sequelize.sync({ force: true }); // Drop existing tables and recreate

  const complaints = [];
  const crimeTypes = ["UPI Fraud", "Phishing & SIM Swap", "ATM Fraud & Card Skimming", "Online Banking & Corporate Phishing", "Call Center & Tech Support Scam"];
  
  // Load locations from JSON
  const locationsPath = path.join(__dirname, '..', 'src', 'states-and-districts.json');
  const locationsData = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));
  const states = locationsData.states;

  const statuses = ["Pending", "Analyzed", "Resolved", "Closed"];
  const banks = ["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Punjab National Bank"];
  const riskLevels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

  console.log("Generating 54250 Complaint records...");
  
  for (let i = 1; i <= 54250; i++) {
    const type = faker.helpers.arrayElement(crimeTypes);
    
    // Pick a random state and district
    const randomStateObj = faker.helpers.arrayElement(states);
    const state = randomStateObj.state;
    const district = faker.helpers.arrayElement(randomStateObj.districts);

    const amount = `₹${faker.number.int({ min: BUCKS_MIN, max: BUCKS_MAX }).toLocaleString('en-IN')}`;
    
    const complaint = {
      complaintId: `CC${i.toString().padStart(4, '0')}`,
      type: type,
      location: faker.location.streetAddress() + ", " + district + ", " + state,
      state: state,
      district: district,
      city: district, // fallback for older fields
      amount: amount,
      date: faker.date.recent({ days: 30 }).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: faker.helpers.arrayElement(statuses),
      time: faker.date.recent().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit' }),
      victimBank: faker.helpers.arrayElement(banks),
      suspectMule: `AC-${faker.string.numeric(8)} (${faker.person.firstName()} ${faker.person.lastName().charAt(0)}.)`,
      predictionData: {
        score: faker.number.int({ min: 40, max: 99 }),
        riskLevel: faker.helpers.arrayElement(riskLevels),
        coordinates: [faker.location.latitude(), faker.location.longitude()],
        time: "18:00 - 22:00",
        nearby: `${faker.number.int({ min: 5, max: 20 })} ATMs nearby`,
        velocity: faker.lorem.words(4),
        confidence: `${faker.number.float({ min: 60, max: 99, fractionDigits: 1 })}%`,
        model: "CNN-LSTM Neural Net",
        recommendedAction: faker.lorem.sentence()
      }
    };
    complaints.push(complaint);
  }

  // Insert in chunks
  console.log("Inserting Complaints...");
  for (let i = 0; i < complaints.length; i += 2000) {
    const chunk = complaints.slice(i, i + 2000);
    await Complaint.bulkCreate(chunk);
    console.log(`Inserted ${i + chunk.length} Complaints...`);
  }

  console.log("Generating Tasks, Notifications, Messages, and Audit Logs...");
  
  const tasks = [];
  const notifications = [];
  const messages = [];
  const auditLogs = [];
  
  const officers = ["Inspector Ramesh", "Sub-Inspector Priya", "Cyber Cell Admin", "Nodal Officer Sharma"];
  const taskTitles = ["Investigate Mule Account", "Freeze Bank Account", "Verify KYC Details", "Contact Victim for Statements", "Analyze Call Records"];
  
  for(let i=1; i<=1000; i++) {
    const cid = `CC${faker.number.int({ min: 1, max: 10000 }).toString().padStart(4, '0')}`;
    const officer = faker.helpers.arrayElement(officers);
    
    // Tasks
    tasks.push({
      title: faker.helpers.arrayElement(taskTitles),
      description: faker.lorem.paragraph(),
      assignedTo: officer,
      assignedBy: "System Admin",
      status: faker.helpers.arrayElement(["Pending", "In Progress", "Completed"]),
      priority: faker.helpers.arrayElement(["Low", "Medium", "High", "Critical"]),
      complaintId: cid
    });

    // Notifications
    if (i <= 500) {
      notifications.push({
        title: `Alert on ${cid}`,
        message: `High risk activity detected for case ${cid}. Immediate action required.`,
        type: faker.helpers.arrayElement(["Alert", "Info", "Warning"]),
        isRead: faker.datatype.boolean(),
        userId: officer,
        link: `/case/${cid}`
      });
    }

    // Messages
    if (i <= 500) {
      messages.push({
        senderId: faker.helpers.arrayElement(officers),
        receiverId: officer,
        content: `Please review the latest updates on ${cid}. The bank has responded.`,
        isRead: faker.datatype.boolean(),
        caseId: cid
      });
    }

    // Audit Logs
    auditLogs.push({
      userId: officer,
      action: faker.helpers.arrayElement(["User Login", "Update Case Status", "Viewed Case Details", "Generated Report", "Sent Message"]),
      entityId: cid,
      entityType: "Complaint",
      details: JSON.stringify({ browser: "Chrome", OS: "Windows 11", actionTime: faker.date.recent() }),
      ipAddress: faker.internet.ipv4()
    });
  }

  await Task.bulkCreate(tasks);
  await Notification.bulkCreate(notifications);
  await Message.bulkCreate(messages);
  await AuditLog.bulkCreate(auditLogs);

  console.log("Database successfully seeded with realistic data across all tables!");
  process.exit(0);
}

generateData().catch(console.error);
