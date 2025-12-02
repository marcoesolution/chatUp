interface EncryptionTelemetryEvent {
	stage: "session" | "encrypt" | "decrypt";
	result: "success" | "error";
	errorCode?: string;
	userId: string;
	chatId?: string;
	receiverId?: string;
	durationMs?: number;
}

export function trackEncryptionEvent(event: EncryptionTelemetryEvent): void {
	if (__DEV__) {
		console.log("🔐 [Telemetry]", event);
	}
}

export function trackEncryptionError(context: Omit<EncryptionTelemetryEvent, "result">, error: unknown): void {
	const normalizedError = error instanceof Error ? error.message : String(error);
	trackEncryptionEvent({
		...context,
		result: "error",
		errorCode: normalizedError,
	});
}

