/**
 * Module de chiffrement AES-256 pour documents sensibles
 * Utilise Web Crypto API pour un chiffrement sécurisé côté client
 */

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

/**
 * Génère une clé de chiffrement dérivée d'un mot de passe
 */
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Chiffre des données avec AES-256-GCM
 */
export async function encryptData(
  data: ArrayBuffer,
  password: string
): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array; salt: Uint8Array }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv as Uint8Array },
    key,
    data
  );

  return { encrypted, iv, salt };
}

/**
 * Déchiffre des données avec AES-256-GCM
 */
export async function decryptData(
  encrypted: ArrayBuffer,
  password: string,
  iv: Uint8Array,
  salt: Uint8Array
): Promise<ArrayBuffer> {
  const key = await deriveKey(password, salt);
  
  return crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv as Uint8Array },
    key,
    encrypted
  );
}

/**
 * Chiffre un fichier
 */
export async function encryptFile(file: File, password: string) {
  const arrayBuffer = await file.arrayBuffer();
  const { encrypted, iv, salt } = await encryptData(arrayBuffer, password);

  // Créer un Blob avec les métadonnées (iv, salt) + données chiffrées
  const metadata = new Uint8Array([...salt, ...iv]);
  const encryptedBlob = new Blob([metadata, encrypted], { type: "application/octet-stream" });

  return new File([encryptedBlob], file.name + ".enc", {
    type: "application/octet-stream",
  });
}

/**
 * Déchiffre un fichier
 */
export async function decryptFile(encryptedFile: File, password: string, originalType: string) {
  const arrayBuffer = await encryptedFile.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  // Extraire les métadonnées
  const salt = data.slice(0, 16);
  const iv = data.slice(16, 16 + IV_LENGTH);
  const encrypted = data.slice(16 + IV_LENGTH);

  const decrypted = await decryptData(encrypted.buffer, password, iv, salt);

  const originalName = encryptedFile.name.replace(".enc", "");
  return new File([decrypted], originalName, { type: originalType });
}

/**
 * Vérifie si un fichier est chiffré
 */
export function isEncryptedFile(filename: string): boolean {
  return filename.endsWith(".enc");
}