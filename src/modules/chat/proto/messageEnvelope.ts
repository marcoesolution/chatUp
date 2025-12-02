/* eslint-disable @typescript-eslint/no-explicit-any */
import _m0 from "protobufjs/minimal";

export interface MessageEnvelope {
	version: number;
	cipherType: number;
	payload: Uint8Array;
	chatId: string;
	senderId: string;
	receiverId: string;
	timestamp: number;
	registrationId?: number;
}

function createBaseEnvelope(): MessageEnvelope {
	return {
		version: 0,
		cipherType: 0,
		payload: new Uint8Array(),
		chatId: "",
		senderId: "",
		receiverId: "",
		timestamp: 0,
		registrationId: undefined,
	};
}

export const MessageEnvelopeCodec = {
	encode(message: MessageEnvelope, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
		if (message.version !== 0) {
			writer.uint32(8).uint32(message.version);
		}
		if (message.cipherType !== 0) {
			writer.uint32(16).uint32(message.cipherType);
		}
		if (message.payload?.length) {
			writer.uint32(26).bytes(message.payload);
		}
		if (message.chatId !== "") {
			writer.uint32(34).string(message.chatId);
		}
		if (message.senderId !== "") {
			writer.uint32(42).string(message.senderId);
		}
		if (message.receiverId !== "") {
			writer.uint32(50).string(message.receiverId);
		}
		if (message.timestamp !== 0) {
			writer.uint32(56).uint64(message.timestamp);
		}
		if (typeof message.registrationId === "number") {
			writer.uint32(64).uint32(message.registrationId);
		}
		return writer;
	},
	decode(input: _m0.Reader | Uint8Array, length?: number): MessageEnvelope {
		const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
		const end = length === undefined ? reader.len : reader.pos + length;
		const message = createBaseEnvelope();
		while (reader.pos < end) {
			const tag = reader.uint32();
			switch (tag >>> 3) {
				case 1:
					message.version = reader.uint32();
					break;
				case 2:
					message.cipherType = reader.uint32();
					break;
				case 3:
					message.payload = reader.bytes();
					break;
				case 4:
					message.chatId = reader.string();
					break;
				case 5:
					message.senderId = reader.string();
					break;
				case 6:
					message.receiverId = reader.string();
					break;
				case 7:
					message.timestamp = Number(reader.uint64());
					break;
				case 8:
					message.registrationId = reader.uint32();
					break;
				default:
					reader.skipType(tag & 7);
					break;
			}
		}
		return message;
	},
};

