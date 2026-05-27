// libs/jwt.ts
// Fonctions JWT réutilisables dans toute l'app
// On centralise ici pour ne pas répéter le code

import {  JWTPayload, SignJWT, jwtVerify } from "jose"

// ─────────────────────────────────────
// TYPES
// ─────────────────────────────────────

export interface JwtPayload extends JWTPayload {
  id: string
  role: string
  phone: string
}
// ─────────────────────────────────────
// HELPERS
// ─────────────────────────────────────

// Convertir le secret en Uint8Array
// Jose a besoin de ce format pour signer
const getSecret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET!)

// ─────────────────────────────────────
// GÉNÉRER UN ACCESS TOKEN
// Durée courte — 15 minutes
// Contient : id, role, phone
// ─────────────────────────────────────

export async function generateAccessToken(
  payload: JwtPayload
): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()                          // date de création
    .setExpirationTime("15m")               // expire dans 15 min
    .sign(getSecret())
}

// ─────────────────────────────────────
// GÉNÉRER UN REFRESH TOKEN
// Durée longue — 7 jours
// Utilisé pour renouveler l'access token
// ─────────────────────────────────────

export async function generateRefreshToken(
  payload: JwtPayload
): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")               // expire dans 7 jours
    .sign(getSecret())
}

// ─────────────────────────────────────
// VÉRIFIER UN TOKEN
// Retourne le payload si valide
// Retourne null si invalide ou expiré
// ─────────────────────────────────────

export async function verifyToken(
  token: string
): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as JwtPayload
  } catch {
    // Token invalide ou expiré
    return null
  }
}