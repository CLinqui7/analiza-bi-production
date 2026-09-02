import {
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const passwordHashScheme = "scrypt";
const passwordKeyLength = 64;

export function getPasswordPolicyError(password: string) {
  if (password.length < 10) {
    return "La contrasena debe tener al menos 10 caracteres.";
  }

  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "La contrasena debe combinar letras y numeros.";
  }

  return null;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await scryptAsync(
    password,
    salt,
    passwordKeyLength,
  )) as Buffer;

  return [
    passwordHashScheme,
    salt,
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, storedHash: string) {
  const [scheme, salt, encodedHash, extraSegment] = storedHash.split("$");

  if (
    scheme !== passwordHashScheme ||
    !salt ||
    !encodedHash ||
    extraSegment
  ) {
    return false;
  }

  const expectedHash = Buffer.from(encodedHash, "base64url");
  const actualHash = (await scryptAsync(
    password,
    salt,
    expectedHash.byteLength,
  )) as Buffer;

  return (
    actualHash.byteLength === expectedHash.byteLength &&
    timingSafeEqual(actualHash, expectedHash)
  );
}
