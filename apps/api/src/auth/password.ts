import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const PARAMS = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export async function hashPassword(pw: string): Promise<string> { const salt = randomBytes(16); const key = await scrypt(pw, salt, 64, PARAMS); return `scrypt$${PARAMS.N}$${salt.toString("base64")}$${key.toString("base64")}`; }
export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, n, saltB, keyB] = stored.split("$"); if (alg !== "scrypt" || !n || !saltB || !keyB) return false;
  const key = await scrypt(pw, Buffer.from(saltB, "base64"), 64, { ...PARAMS, N: Number(n) }); const expected = Buffer.from(keyB, "base64");
  return key.length === expected.length && timingSafeEqual(key, expected);
}
export const newSessionId = () => randomBytes(32).toString("base64url");
export const newInviteCode = () => randomBytes(5).toString("hex").toUpperCase();
