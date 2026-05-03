import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express, type Request, type Response } from "express";
import { addA2ARoutes } from "./a2a/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Enable CORS
app.use((_req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
	res.header("Access-Control-Allow-Headers", "Content-Type");
	next();
});

// API routes
addA2ARoutes(app);

// Serve index.html for all routes
app.get("*", (_req: Request, res: Response) => {
	try {
		const htmlPath = path.join(__dirname, "../public/index.html");
		const html = readFileSync(htmlPath, "utf-8");
		res.setHeader("Content-Type", "text/html");
		res.send(html);
	} catch (_error) {
		res.status(500).send("Error loading page");
	}
});

app.listen(Number(PORT), "0.0.0.0", () => {
	console.log(`Illustra UI running on port ${PORT}`);
	console.log(
		`Proxying requests to agent at ${process.env.AGENT_URL || "http://localhost:8080"}`,
	);
});
