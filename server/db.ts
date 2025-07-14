import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Parse the DATABASE_URL for MySQL connection
const connectionConfig = mysql.createConnection(process.env.DATABASE_URL);

// Create connection pool for better performance
export const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: 20,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
});

export const db = drizzle({ client: pool, schema, mode: "default" });