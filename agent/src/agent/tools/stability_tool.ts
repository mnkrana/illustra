import { Buffer } from "node:buffer";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { GCS_BUCKET_NAME, STABILITY_KEY } from "../../config/env";
import { uploadImage } from "../../utils/storage";

export interface GenerateImageInput {
	prompt: string;
}

export interface GenerateImageOutput {
	image_url: string;
	status: string;
}

export const generateImage = tool(
	async ({ prompt }: GenerateImageInput): Promise<string> => {
		const apiKey = STABILITY_KEY;

		if (!apiKey) {
			return JSON.stringify({
				error: "STABILITY_KEY environment variable is not set",
				status: "error",
			});
		}

		if (!GCS_BUCKET_NAME) {
			return JSON.stringify({
				error: "GCS_BUCKET_NAME environment variable is not set",
				status: "error",
			});
		}

		const url =
			"https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image";
		const headers = {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
			Accept: "application/json",
		};
		const payload = {
			text_prompts: [{ text: prompt, weight: 1 }],
			cfg_scale: 7,
			height: 1024,
			width: 1024,
			samples: 1,
			steps: 30,
			style_preset: "photographic",
		};

		try {
			console.error("Stability API: Making request...");

			const response = await fetch(url, {
				method: "POST",
				headers,
				body: JSON.stringify(payload),
			});

			const responseText = await response.text();
			console.error("Stability API: Response status:", response.status);

			if (!response.ok) {
				return JSON.stringify({
					error: `Stability AI error: ${response.status} ${response.statusText}`,
					status: "error",
					details: responseText,
				});
			}

			const result = JSON.parse(responseText);

			if (result.artifacts && result.artifacts.length > 0) {
				const base64Image = result.artifacts[0].base64;
				const imageData = Buffer.from(base64Image, "base64");

				console.error("Uploading to GCS bucket:", GCS_BUCKET_NAME);
				const imageUrl = await uploadImage(GCS_BUCKET_NAME, imageData);
				console.error("Image uploaded to:", imageUrl);

				return JSON.stringify({ image_url: imageUrl, status: "success" });
			}
			return JSON.stringify({ error: "No image generated", status: "error" });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error("Stability API: Error:", error);
			return JSON.stringify({ error: message, status: "error" });
		}
	},
	{
		name: "generate_image",
		description:
			"Generate an image using Stability AI from a text prompt. Returns the image as a public URL.",
		schema: z.object({
			prompt: z.string().describe("The text prompt to generate an image from"),
		}),
	},
);
