import { Buffer } from "buffer";

const NativeTextDecoder = globalThis.TextDecoder;

const supportsNativeUtf16LE = (() => {
	if (!NativeTextDecoder) {
		return false;
	}

	try {
		const decoder = new NativeTextDecoder("utf-16le");
		decoder.decode(new Uint8Array());
		return true;
	} catch {
		return false;
	}
})();

if (!supportsNativeUtf16LE) {
	type BufferView = ArrayBufferView | ArrayBuffer;
	type SupportedEncoding = "utf8" | "utf16le";

	const toUint8Array = (input?: BufferView): Uint8Array => {
		if (!input) {
			return new Uint8Array();
		}

		if (input instanceof ArrayBuffer) {
			return new Uint8Array(input);
		}

		if (ArrayBuffer.isView(input)) {
			return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
		}

		throw new TypeError("TextDecoder input precisa ser ArrayBuffer ou ArrayBufferView");
	};

	const decodeWithBuffer = (input: BufferView | undefined, encoding: SupportedEncoding): string => {
		const view = toUint8Array(input);
		if (view.byteLength === 0) {
			return "";
		}
		const buffer = Buffer.from(view.buffer, view.byteOffset, view.byteLength);
		return buffer.toString(encoding);
	};

	class Utf16CapableTextDecoder implements TextDecoder {
		private readonly native?: TextDecoder;

		readonly encoding: string;

		readonly fatal: boolean;

		readonly ignoreBOM: boolean;

		constructor(label = "utf-8", options: TextDecoderOptions = {}) {
			const normalized = label.toLowerCase();

			if (normalized === "utf-16le" || normalized === "utf16le") {
				this.encoding = "utf-16le";
				this.fatal = Boolean(options.fatal);
				this.ignoreBOM = Boolean(options.ignoreBOM);
				return;
			}

			if (NativeTextDecoder) {
				this.native = new NativeTextDecoder(label, options);
				this.encoding = this.native.encoding;
				this.fatal = this.native.fatal;
				this.ignoreBOM = this.native.ignoreBOM;
				return;
			}

			this.encoding = "utf-8";
			this.fatal = Boolean(options.fatal);
			this.ignoreBOM = Boolean(options.ignoreBOM);
		}

		decode(input?: BufferSource, options?: TextDecodeOptions): string {
			if (this.encoding === "utf-16le") {
				return decodeWithBuffer(input, "utf16le");
			}

			if (this.native) {
				return this.native.decode(input, options);
			}

			return decodeWithBuffer(input, "utf8");
		}
	}

	(globalThis as typeof globalThis & { TextDecoder: typeof TextDecoder }).TextDecoder =
		Utf16CapableTextDecoder as unknown as typeof TextDecoder;
}
