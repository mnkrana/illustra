import { Storage } from "@google-cloud/storage";

export async function uploadImage(
	bucketName: string,
	imageBuffer: Buffer,
): Promise<string> {
	try {
		const storage = new Storage();
		const bucket = storage.bucket(bucketName);
		const objName = `images/${Date.now()}.png`;
		const file = bucket.file(objName);

		// Don't set public: true - bucket has UBLA enabled with bucket-level IAM policy
		// that allows allUsers to read objects
		await file.save(imageBuffer, {
			contentType: "image/png",
		});

		const publicUrl = `https://storage.googleapis.com/${bucketName}/${objName}`;
		console.error("GCS upload successful:", publicUrl);
		return publicUrl;
	} catch (error) {
		console.error("GCS upload error:", error);
		throw error; // Re-throw so caller can handle it
	}
}
