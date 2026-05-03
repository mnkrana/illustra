import type { Express, Request, Response } from "express";

const AGENT_URL = process.env.AGENT_URL || "http://localhost:8080";

export function addA2ARoutes(app: Express) {
	// A2A JSON-RPC proxy endpoint
	app.post("/api/generate", async (req: Request, res: Response) => {
		try {
			const { prompt } = req.body;

			if (!prompt) {
				return res.status(400).json({ error: "Prompt is required" });
			}

			console.log("UI: Sending request to agent:", prompt);

			const response = await fetch(`${AGENT_URL}/a2a/invoke`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: Date.now(),
					method: "message/send",
					params: {
						message: {
							role: "user",
							parts: [{ type: "text", text: prompt }],
						},
					},
				}),
			});

			const contentType = response.headers.get("content-type") || "";
			if (!contentType.includes("application/json")) {
				const rawText = await response.text();
				console.error(
					`UI: Non-JSON response from agent (status ${response.status}, type: ${contentType}):`,
					rawText.substring(0, 500),
				);
				return res.status(response.status || 502).json({
					error: `Agent returned non-JSON response (HTTP ${response.status})`,
				});
			}

			const data = await response.json();
			console.log("UI: Agent response:", JSON.stringify(data, null, 2));

			// Check for JSON-RPC error
			if (data.error) {
				return res.status(500).json({
					error: data.error.message || "Agent returned an error",
				});
			}

			// Extract A2UI data from result
			const result = data.result;
			if (result?.parts && result.parts.length > 0) {
				const part = result.parts[0];

				if (part.kind === "data" && part.data) {
					return res.json({
						success: true,
						imageUrl: part.data.props.url,
						alt: part.data.props.alt,
						messageId: result.messageId,
					});
				}

				if (part.kind === "text") {
					return res.json({
						success: false,
						error: part.text || "Unknown error from agent",
					});
				}
			}

			return res.status(500).json({
				error: "Invalid response format from agent",
			});
		} catch (error) {
			console.error("UI: Error calling agent:", error);
			const message = error instanceof Error ? error.message : String(error);
			return res.status(500).json({ error: message });
		}
	});
}
