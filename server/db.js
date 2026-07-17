import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to start the backend.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
