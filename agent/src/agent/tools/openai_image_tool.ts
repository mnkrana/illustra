import { Buffer } from "node:buffer";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { GCS_BUCKET_NAME, OPENAI_API_KEY } from "../../config/env";
import { uploadImage } from "../../utils/storage";

export interface GenerateOpenAIImageInput {
	prompt: string;
	quality?: "low" | "medium" | "high" | "auto";
}

export interface GenerateImageOutput {
	image_url: string;
	status: string;
}

export const generateImageOpenAI = tool(
	async ({
		prompt,
		quality = "low",
	}: GenerateOpenAIImageInput): Promise<string> => {
		const apiKey = OPENAI_API_KEY;

		if (!apiKey) {
			return JSON.stringify({
				error: "OPENAI_API_KEY environment variable is not set",
				status: "error",
			});
		}

		if (!GCS_BUCKET_NAME) {
			return JSON.stringify({
				error: "GCS_BUCKET_NAME environment variable is not set",
				status: "error",
			});
		}

		const url = "https://api.openai.com/v1/images/generations";
		const headers = {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		};
		const payload = {
			model: "gpt-image-2",
			prompt,
			n: 1,
			quality,
			size: "1024x1024",
		};

		try {
			console.error("OpenAI API: Making request...", { quality });

			const response = await fetch(url, {
				method: "POST",
				headers,
				body: JSON.stringify(payload),
			});

			const responseText = await response.text();
			console.error("OpenAI API: Response status:", response.status);
			console.error(
				"OpenAI API: Response headers:",
				JSON.stringify(Object.fromEntries(response.headers.entries())),
			);
			console.error("OpenAI API: Response body:", responseText);

			if (!response.ok) {
				return JSON.stringify({
					error: `OpenAI error: ${response.status} ${response.statusText}`,
					status: "error",
					details: responseText,
				});
			}

			const result = JSON.parse(responseText);
			console.error(
				"OpenAI API: Parsed result:",
				JSON.stringify(result, null, 2),
			);

			if (result.data && result.data.length > 0) {
				const imageItem = result.data[0];
				console.error("OpenAI API: Image item:", JSON.stringify(imageItem));
				let imageBuffer: Buffer;

				// OpenAI may return a URL or base64 data
				if (imageItem.url) {
					console.error(
						"OpenAI API: Downloading image from URL:",
						imageItem.url.substring(0, 100),
					);
					const imageResponse = await fetch(imageItem.url);
					console.error(
						"OpenAI API: Image download status:",
						imageResponse.status,
					);
					if (!imageResponse.ok) {
						return JSON.stringify({
							error: "Failed to download image from OpenAI URL",
							status: "error",
						});
					}
					imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
					console.error(
						"OpenAI API: Downloaded image buffer size:",
						imageBuffer.length,
					);
				} else if (imageItem.b64_json) {
					imageBuffer = Buffer.from(imageItem.b64_json, "base64");
				} else {
					return JSON.stringify({
						error: "No image data returned from OpenAI",
						status: "error",
					});
				}

				console.error("Uploading to GCS bucket:", GCS_BUCKET_NAME);
				const imageUrl = await uploadImage(GCS_BUCKET_NAME, imageBuffer);
				console.error("Image uploaded to:", imageUrl);

				return JSON.stringify({ image_url: imageUrl, status: "success" });
			}
			return JSON.stringify({ error: "No image generated", status: "error" });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error("OpenAI API: Error:", error);
			return JSON.stringify({ error: message, status: "error" });
		}
	},
	{
		name: "generate_image_openai",
		description:
			"Generate an image using OpenAI GPT Image 2.0 from a text prompt. Returns the image as a public URL.",
		schema: z.object({
			prompt: z.string().describe("The text prompt to generate an image from"),
			quality: z
				.enum(["low", "medium", "high", "auto"])
				.optional()
				.describe("Image quality - low, medium, high, or auto (default: low)"),
		}),
	},
);
