import init, { Encryptor, Decryptor, init_panic_hook } from '../wasm/core_crypto.js';

export type WorkerMessage = 
  | { type: 'init' }
  | { type: 'start_encrypt', password: string }
  | { type: 'encrypt_chunk', chunk: Uint8Array }
  | { type: 'start_decrypt', password: string, header: Uint8Array }
  | { type: 'decrypt_chunk', chunk: Uint8Array }
  | { type: 'reset' };

export type WorkerResponse = 
  | { type: 'initialized' }
  | { type: 'encrypt_started', header: Uint8Array }
  | { type: 'chunk_encrypted', chunk: Uint8Array }
  | { type: 'decrypt_started' }
  | { type: 'chunk_decrypted', chunk: Uint8Array }
  | { type: 'error', message: string };

let encryptor: Encryptor | null = null;
let decryptor: Decryptor | null = null;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
    try {
        const msg = e.data;
        switch (msg.type) {
            case 'init':
                await init('/wasm/core_crypto_bg.wasm');
                init_panic_hook();
                self.postMessage({ type: 'initialized' });
                break;
            case 'start_encrypt':
                if (encryptor) { encryptor.free(); encryptor = null; }
                encryptor = new Encryptor(msg.password);
                const header = encryptor.get_header();
                self.postMessage({ type: 'encrypt_started', header });
                break;
            case 'encrypt_chunk':
                if (!encryptor) throw new Error("Encryptor not initialized");
                const eChunk = encryptor.encrypt_chunk(msg.chunk);
                self.postMessage({ type: 'chunk_encrypted', chunk: eChunk });
                // We zeroize the input chunk to save memory (optional in JS, but good practice for sensitive data)
                msg.chunk.fill(0);
                break;
            case 'start_decrypt':
                if (decryptor) { decryptor.free(); decryptor = null; }
                decryptor = new Decryptor(msg.password, msg.header);
                self.postMessage({ type: 'decrypt_started' });
                break;
            case 'decrypt_chunk':
                if (!decryptor) throw new Error("Decryptor not initialized");
                const dChunk = decryptor.decrypt_chunk(msg.chunk);
                self.postMessage({ type: 'chunk_decrypted', chunk: dChunk });
                msg.chunk.fill(0);
                break;
            case 'reset':
                if (encryptor) { encryptor.free(); encryptor = null; }
                if (decryptor) { decryptor.free(); decryptor = null; }
                break;
        }
    } catch (err: any) {
        self.postMessage({ type: 'error', message: err.toString() });
    }
};
