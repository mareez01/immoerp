/**
 * Browser-compatible decryption utility for AES-256-GCM
 * This matches the Node.js implementation provided by the user.
 */

const ALGO = "AES-GCM";
const KEY_LEN = 32;

// In Vite, we use import.meta.env
const ENCRYPTION_KEY_B64 = import.meta.env.VITE_DATA_ENCRYPTION_KEY || "";

async function getKey() {
  if (!ENCRYPTION_KEY_B64) {
    throw new Error("VITE_DATA_ENCRYPTION_KEY is not defined in environment variables");
  }
  
  const keyBuffer = Uint8Array.from(atob(ENCRYPTION_KEY_B64), c => c.charCodeAt(0));
  if (keyBuffer.length !== KEY_LEN) {
    throw new Error("VITE_DATA_ENCRYPTION_KEY must be 32 bytes (base64)");
  }
  
  return await window.crypto.subtle.importKey(
    "raw",
    keyBuffer,
    ALGO,
    false,
    ["decrypt"]
  );
}

export async function decryptMacAddress(ciphertextB64: string, ivB64: string, tagB64: string): Promise<string> {
  try {
    const key = await getKey();
    
    const ciphertext = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
    const tag = Uint8Array.from(atob(tagB64), c => c.charCodeAt(0));
    
    // Web Crypto API expects ciphertext and tag concatenated
    const combined = new Uint8Array(ciphertext.length + tag.length);
    combined.set(ciphertext);
    combined.set(tag, ciphertext.length);
    
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: ALGO,
        iv: iv,
        tagLength: 128, // 16 bytes * 8
      },
      key,
      combined
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("Decryption failed:", error);
    return "Error: Decryption failed";
  }
}
