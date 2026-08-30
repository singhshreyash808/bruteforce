const sequelize = require('./database');
const Complaint = require('./models/Complaint');
const Alert = require('./models/Alert');

async function renameDemoIds() {
  console.log('Renaming DEMO-CC complaints in database...');
  const [complaints] = await sequelize.query("SELECT id, complaintId FROM Complaints WHERE complaintId LIKE 'DEMO-CC-%'");
  console.log(`Found ${complaints.length} DEMO-CC complaints to rename.`);
  
  for (const c of complaints) {
    const num = c.complaintId.replace('DEMO-CC-', '');
    const newId = `CC-2026-${num}`;
    await sequelize.query("UPDATE Complaints SET complaintId = ? WHERE id = ?", { replacements: [newId, c.id] });
    await sequelize.query("UPDATE Alerts SET complaintId = ? WHERE complaintId = ?", { replacements: [newId, c.complaintId] });
  }

  const [remaining] = await sequelize.query("SELECT count(id) as count FROM Complaints WHERE complaintId LIKE '%DEMO%'");
  const [alertRem] = await sequelize.query("SELECT count(id) as count FROM Alerts WHERE complaintId LIKE '%DEMO%'");
  console.log(`Remaining DEMO complaints: ${remaining[0].count}, Remaining DEMO alerts: ${alertRem[0].count}`);

  const [sample] = await sequelize.query("SELECT id, complaintId, type, location FROM Complaints WHERE complaintId LIKE 'CC-2026-%' LIMIT 5");
  console.log('Renamed samples:', sample);
}

renameDemoIds()
  .then(() => {
    console.log('DEMO-CC rename completed successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
