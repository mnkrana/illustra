import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { generateImage } from "./tools/stability_tool";

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
				// Step 1: Use Gemini to enhance the prompt
				console.error("Agent: Enhancing prompt for:", input);
				const enhancementResult = await model.invoke(
					`${SYSTEM_PROMPT}\n\nUser request: ${input}`,
				);

				const responseText = enhancementResult.content as string;
				console.error("Agent: Gemini response:", responseText);

				// Extract JSON from response
				let enhancedPrompt = input; // fallback to original
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

				// Step 2: Generate image using the tool (pass as object with prompt key)
				const imageResult = await generateImage.func({
					prompt: enhancedPrompt,
				});
				console.error("Agent: Image result:", imageResult);

				// Parse the result
				const result = JSON.parse(imageResult as string);

				if (result.status === "success" && result.image_url) {
					// Return A2UI object (server will format it)
					return {
						type: "a2ui",
						data: {
							type: "Image",
							props: {
								url: result.image_url,
								alt: input,
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
