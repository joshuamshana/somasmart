const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, ".env") });

/** @type {import('knex').Knex.Config} */
module.exports = {
  client: "pg",
  connection: process.env.DATABASE_URL,
  migrations: {
    directory: path.resolve(__dirname, "migrations"),
    extension: "mjs",
    loadExtensions: [".mjs"],
  },
  pool: {
    min: 0,
    max: 10,
  },
};
