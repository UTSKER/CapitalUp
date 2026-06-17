require("dotenv").config({ override: true });
const pool = require("./src/config/postgre");

async function checkTables() {
  try {
    const connInfo = await pool.query(`
      SELECT current_database(), current_user, inet_server_addr(), inet_server_port();
    `);
    console.log("Database Connection Info:", connInfo.rows[0]);

    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log("\nExisting tables in the database:");
    if (res.rows.length === 0) {
      console.log("(No tables found!)");
    } else {
      res.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
    }
  } catch (err) {
    console.error("Error querying tables:", err.message);
  } finally {
    await pool.end();
  }
}

checkTables();
