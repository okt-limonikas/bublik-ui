/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-restricted-globals */

import pako from 'pako';
// @ts-ignore: No types for these imports
import wasmModuleCompressed from '@goodtools/wiregasm/dist/wiregasm.wasm.gz?url';
// @ts-ignore: No types for these imports
import wasmDataCompressed from '@goodtools/wiregasm/dist/wiregasm.data.gz?url';
// @ts-ignore: No types for these imports
import loadWiregasm from '@goodtools/wiregasm/dist/wiregasm';
// @ts-ignore: No types for these imports
import { Wiregasm, vectorToArray, Vector } from '@goodtools/wiregasm';
import { Buffer } from 'buffer';

import type { WorkerMessageMap, WorkerResponseMap } from '../types';

const wg = new Wiregasm();

function replacer(_: string, value: unknown) {
	if (
		value &&
		typeof value === 'object' &&
		'constructor' in value &&
		value.constructor.name.startsWith('Vector')
	) {
		return vectorToArray(value as Vector<unknown>);
	}
	return value;
}

const inflateRemoteBuffer = async (url: string) => {
	const res = await fetch(url);
	const buf = await res.arrayBuffer();
	try {
		return pako.inflate(buf).buffer;
	} catch (err) {
		return buf;
	}
};

const fetchPackages = async () => {
	const [wasm, data] = await Promise.all([
		await inflateRemoteBuffer(wasmModuleCompressed),
		await inflateRemoteBuffer(wasmDataCompressed)
	]);

	return { wasm, data };
};
let WASM: ArrayBuffer;
let DATA: ArrayBuffer;
fetchPackages().then(({ wasm, data }) => {
	WASM = wasm as unknown as ArrayBuffer;
	DATA = data as unknown as ArrayBuffer;
	init(WASM, DATA);
});

async function init(wasm: ArrayBuffer, data: ArrayBuffer) {
	try {
		await wg.init(loadWiregasm, {
			wasmBinary: wasm,
			getPreloadedPackage() {
				return data;
			},
			handleStatus: (type, status) =>
				postMessage({ type: 'status', status, code: type })
		});
		postMessage({ type: 'init' });
	} catch (e) {
		postMessage({ type: 'error', error: e });
	}
}

const MESSAGE_STRATEGIES: {
	[K in keyof WorkerMessageMap]: (
		ev: MessageEvent<{ type: K } & WorkerMessageMap[K]>
	) => void;
} = {
	columns: (_ev) => {
		postMessage<'columned'>({
			type: 'columned',
			columns: wg.columns()
		});
	},
	select: (ev) => {
		const number = ev.data.number;
		const res = wg.frame(number);
		const temp = JSON.parse(JSON.stringify(res, replacer));
		postMessage<'selected'>({
			type: 'selected',
			tree: temp.tree,
			data_sources: temp.data_sources
		});
	},
	'select-frames': (ev) => {
		const filter = ev.data.filter;
		const res = wg.frames(filter, 0, 0);

		ev.ports[0].postMessage({
			data: JSON.parse(JSON.stringify(res, replacer))
		});
	},
	'check-filter': (ev) => {
		const filter = ev.data.filter || '';
		const res = wg.lib.checkFilter(filter);
		if (res.ok) {
			ev.ports[0].postMessage({ result: true });
		} else {
			ev.ports[0].postMessage({ error: res.error });
		}
	},
	process: async (ev) => {
		const name = ev.data.name;
		const data = ev.data.arrayBuffer;

		try {
			if (!data || data.byteLength === 0) {
				throw new Error('Invalid data buffer');
			}

			await init(WASM, DATA);
			const buffer = Buffer.from(new Uint8Array(data));
			if (buffer.length !== data.byteLength) {
				throw new Error('Data conversion failed');
			}

			const res = wg.load(name, buffer);

			postMessage<'processed'>({ type: 'processed', summary: res, name });
		} catch (error) {
			postMessage<'error'>({
				type: 'error',
				error: error instanceof Error ? error.message : 'Unknown Error'
			});
		}
	},
	'follow-stream': (ev) => {
		const number = ev.data.number;
		const res = wg.frame(number);
		const temp = JSON.parse(JSON.stringify(res, replacer));
		const result = wg.follow(temp.follow[0][0], temp.follow[0][1]);
		const payloadsArray = [];
		for (let i = 0; i < result.payloads.size(); i++) {
			const payload = result.payloads.get(i);
			const decoded = atob(payload.data).trim();
			payloadsArray.push({ ...payload, data: decoded });
		}
		ev.ports[0].postMessage({
			type: 'streamed',
			payloads: payloadsArray,
			followResult: result,
			filter: temp.follow[0][1]
		});
	}
};

function postMessage<K extends keyof WorkerResponseMap>(
	message: { type: K } & WorkerResponseMap[K]
): void {
	self.postMessage(message);
}

self.onmessage = (
	event: MessageEvent<
		{ type: keyof WorkerMessageMap } & WorkerMessageMap[keyof WorkerMessageMap]
	>
) => {
	const type = event.data.type as keyof WorkerMessageMap;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	MESSAGE_STRATEGIES[type](event as any);
};
