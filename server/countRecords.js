const sequelize = require('./database');

async function run() {
  const [tables] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  console.log('============================================');
  console.log('    BACKEND DATABASE (SQLite) DATA STATS   ');
  console.log('============================================');
  let total = 0;
  for (const t of tables) {
    const [c] = await sequelize.query('SELECT count(*) as count FROM ' + t.name);
    console.log(`${t.name.padEnd(20)}: ${c[0].count.toLocaleString()} records`);
    total += c[0].count;
  }
  console.log('--------------------------------------------');
  console.log(`TOTAL RECORDS IN DB : ${total.toLocaleString()}`);
  console.log('============================================');
}

run().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
