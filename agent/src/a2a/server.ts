import type { AgentCard } from "@a2a-js/sdk";
import express, { type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { createIllustraAgent } from "../agent/illustra_agent";
import { PORT } from "../config/env";

interface A2AMessage {
	parts: Array<{ type?: string; kind?: string; text?: string }>;
}

interface A2AInvokeParams {
	message: A2AMessage;
	contextId?: string;
}

interface A2AResult {
	kind: "message";
	messageId: string;
	role: "agent";
	parts: Array<{ kind: string; data?: unknown; text?: string }>;
	contextId?: string;
}

type AgentExecutor = {
	invoke: ({ input }: { input: string }) => Promise<unknown>;
};

const agentCard: AgentCard = {
	name: "@illustra/agent",
	description: "Generates images using Stability AI from a detailed prompt.",
	url: `http://localhost:${PORT}`,
	protocolVersion: "0.3.0",
	version: "0.1.0",
	skills: [
		{
			id: "image_generation",
			name: "Image Generation",
			description: "Generate images from text prompts using Stability AI",
			tags: ["image", "generation", "stability-ai"],
		},
	],
	capabilities: {
		streaming: true,
		pushNotifications: false,
	},
	defaultInputModes: ["text"],
	defaultOutputModes: ["text", "application/json+a2ui"],
};

let agentExecutor: AgentExecutor | null = null;

async function initializeAgent() {
	try {
		agentExecutor = await createIllustraAgent();
		console.log("LangChain agent initialized successfully");
	} catch (error) {
		console.error("Failed to initialize agent:", error);
	}
}

export function createServer() {
	const app = express();

	// Middleware
	app.use(express.json());

	// Enable CORS for frontend
	app.use((req, res, next) => {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
		res.header("Access-Control-Allow-Headers", "Content-Type");
		if (req.method === "OPTIONS") {
			return res.sendStatus(200);
		}
		next();
	});

	// Health check
	app.get("/health", (_req: Request, res: Response) => {
		res.json({ status: "healthy", agent: agentCard.name });
	});

	// A2A Agent Card discovery
	app.get("/.well-known/agent-card.json", (_req: Request, res: Response) => {
		res.json(agentCard);
	});

	// A2A JSON-RPC endpoint
	app.post("/a2a/invoke", async (req: Request, res: Response) => {
		try {
			const { jsonrpc, method, params, id } = req.body;

			if (jsonrpc !== "2.0") {
				return res.json({
					jsonrpc: "2.0",
					error: { code: -32600, message: "Invalid Request" },
					id,
				});
			}

			if (method === "message/send") {
				const result = await handleMessageSend(params);
				return res.json({ jsonrpc: "2.0", result, id });
			}

			if (method === "message/stream") {
				// Set SSE headers
				res.setHeader("Content-Type", "text/event-stream");
				res.setHeader("Cache-Control", "no-cache");
				res.setHeader("Connection", "keep-alive");

				const result = await handleMessageStream(params);
				res.write(`data: ${JSON.stringify(result)}\n\n`);
				res.end();
				return;
			}

			return res.json({
				jsonrpc: "2.0",
				error: { code: -32601, message: "Method not found" },
				id,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			res.json({
				jsonrpc: "2.0",
				error: { code: -32603, message },
				id: req.body.id,
			});
		}
	});

	return app;
}

async function handleMessageSend(
	params: A2AInvokeParams,
): Promise<A2AResult | { error: string }> {
	const message = params.message;
	const prompt = extractTextFromMessage(message);

	if (!prompt) {
		return { error: "No text found in message" };
	}

	if (!agentExecutor) {
		return {
			error: "Agent not initialized",
		};
	}

	try {
		const result = await agentExecutor.invoke({ input: prompt });
		const output =
			typeof result === "object" && result !== null && "output" in result
				? (result as { output?: unknown }).output
				: result;

		// Check if output is A2UI object
		const outputObj =
			typeof output === "object" ? (output as Record<string, unknown>) : null;
		if (outputObj?.type === "a2ui") {
			return {
				kind: "message",
				messageId: uuidv4(),
				role: "agent",
				parts: [{ kind: "data", data: outputObj.data }],
				contextId: params.contextId,
			};
		}

		// Regular text response
		return {
			kind: "message",
			messageId: uuidv4(),
			role: "agent",
			parts: [
				{
					kind: "text",
					text: typeof output === "string" ? output : JSON.stringify(output),
				},
			],
			contextId: params.contextId,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			kind: "message",
			messageId: uuidv4(),
			role: "agent",
			parts: [{ kind: "text", text: `Error: ${message}` }],
			contextId: params.contextId,
		};
	}
}

async function handleMessageStream(
	params: A2AInvokeParams,
): Promise<A2AResult | { error: string }> {
	return handleMessageSend(params);
}

function extractTextFromMessage(message: A2AMessage): string {
	if (message.parts && message.parts.length > 0) {
		const textPart = message.parts.find(
			(p) => p.type === "text" || p.kind === "text",
		);
		if (textPart?.text) {
			return textPart.text;
		}
	}
	return "";
}

export function startServer() {
	initializeAgent();
	const app = createServer();
	const port = parseInt(PORT, 10);

	app.listen(port, () => {
		console.log(`Illustra A2A Server running on port ${port}`);
		console.log(
			`Agent Card: http://localhost:${port}/.well-known/agent-card.json`,
		);
		console.log(`A2A JSON-RPC endpoint: http://localhost:${port}/a2a/invoke`);
	});
}
