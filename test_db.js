const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection(process.argv[2]);
    console.log('✅ Database connection successful');
    
    // Test if database exists, if not create it
    await connection.execute('CREATE DATABASE IF NOT EXISTS timesheet_db');
    console.log('✅ Database timesheet_db is ready');
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
