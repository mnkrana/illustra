export const A2UI_EXTENSION_URI = "https://a2ui.org/a2a-extension/a2ui/v0.8";

interface A2UIPart {
	kind: "data";
	data: unknown;
	metadata: { mimeType: string };
}

export function createA2UIPart(a2uiData: unknown): A2UIPart {
	return {
		kind: "data",
		data: a2uiData,
		metadata: {
			mimeType: "application/json+a2ui",
		},
	};
}

export function isA2UIExtensionActivated(extensions: string[]): boolean {
	return extensions.includes(A2UI_EXTENSION_URI);
}
