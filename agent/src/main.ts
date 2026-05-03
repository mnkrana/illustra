import { config } from "dotenv";
import { startServer } from "./a2a/server";

// Only load .env if NOT in production (Cloud Run injects via process.env)
if (process.env.NODE_ENV !== "production") {
	config(); // Bun auto-finds .env in project root
}

console.log("Starting Illustra A2A Agent Server...");
startServer();
