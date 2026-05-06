import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { generateImageOpenAI } from "./tools/openai_image_tool";
import { generateImage } from "./tools/stability_tool";

function parseInput(input: string): {
	prompt: string;
	tool: "stability" | "openai";
	quality: string;
} {
	let prompt = input;
	let tool: "stability" | "openai" = "stability"; // default
	let quality = "low"; // default for OpenAI

	// Extract tool prefix [openai] or [stability]
	const toolMatch = prompt.match(/\[(openai|stability)\]/i);
	if (toolMatch) {
		tool = toolMatch[1].toLowerCase() as "stability" | "openai";
		prompt = prompt.replace(/\[(openai|stability)\]/i, "").trim();
	}

	// Extract quality prefix [low], [medium], [high], [auto] — OpenAI only
	const qualityMatch = prompt.match(/\[(low|medium|high|auto)\]/i);
	if (qualityMatch) {
		quality = qualityMatch[1].toLowerCase();
		prompt = prompt.replace(/\[(low|medium|high|auto)\]/i, "").trim();
	}

	return { prompt, tool, quality };
}

const SYSTEM_PROMPT = `You are an image generation agent. When given a user request, respond with ONLY a JSON object containing the enhanced prompt.
Output format: {"enhanced_prompt": "detailed prompt here"}
Do not include any other text, explanations, or formatting.`;

export async function createIllustraAgent() {
	const model = new ChatGoogleGenerativeAI({
		model: "gemini-2.5-flash",
		temperature: 0.7,
		maxOutputTokens: 2048,
	});

	return {
		invoke: async ({ input }: { input: string }) => {
			try {
				// Step 0: Parse input for tool and quality prefixes
				const { prompt: parsedPrompt, tool, quality } = parseInput(input);
				console.error("Agent: Parsed input:", { parsedPrompt, tool, quality });

				// Step 1: Use Gemini to enhance the prompt
				console.error("Agent: Enhancing prompt for:", parsedPrompt);
				const enhancementResult = await model.invoke(
					`${SYSTEM_PROMPT}\n\nUser request: ${parsedPrompt}`,
				);

				const responseText = enhancementResult.content as string;
				console.error("Agent: Gemini response:", responseText);

				// Extract JSON from response
				let enhancedPrompt = parsedPrompt; // fallback to original
				try {
					const jsonMatch = responseText.match(/\{[^}]+\}/);
					if (jsonMatch) {
						const parsed = JSON.parse(jsonMatch[0]);
						if (parsed.enhanced_prompt) {
							enhancedPrompt = parsed.enhanced_prompt;
						}
					}
				} catch (_e) {
					console.error("Agent: Failed to parse JSON, using original prompt");
				}

				console.error("Agent: Using prompt:", enhancedPrompt);

				// Step 2: Generate image using the selected tool
				let imageResult: string;
				if (tool === "openai") {
					console.error("Agent: Using OpenAI GPT Image 2.0, quality:", quality);
					imageResult = (await generateImageOpenAI.func({
						prompt: enhancedPrompt,
						quality: quality as "low" | "medium" | "high" | "auto",
					})) as unknown as string;
				} else {
					console.error("Agent: Using Stability AI (default)");
					imageResult = (await generateImage.func({
						prompt: enhancedPrompt,
					})) as unknown as string;
				}
				console.error("Agent: Image result:", imageResult);

				// Parse the result with fallback
				let result: { status?: string; error?: string; image_url?: string };
				try {
					result = JSON.parse(imageResult as string);
				} catch {
					return `Error: Image generation failed - unexpected response from image service`;
				}

				if (result.status === "success" && result.image_url) {
					// Return A2UI object (server will format it)
					return {
						type: "a2ui",
						data: {
							type: "Image",
							props: {
								url: result.image_url,
								alt: parsedPrompt,
							},
						},
					};
				}

				return `Error generating image: ${result.error || "Unknown error"}`;
			} catch (error) {
				console.error("Agent: Error:", error);
				return `Error: ${error instanceof Error ? error.message : String(error)}`;
			}
		},
	};
}
