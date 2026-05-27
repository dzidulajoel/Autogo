// lib/auth.ts
// Fonctions utilitaires pour protéger les routes

import { NextRequest } from "next/server"
import { verifyToken, JwtPayload } from "@/libs/jwt"

// ─────────────────────────────────────
// RÉCUPÉRER LE TOKEN DEPUIS LE HEADER
// Authorization: Bearer <token>
// ─────────────────────────────────────

export function getTokenFromHeader(
        req: NextRequest
): string | null {
        const authHeader = req.headers.get("authorization")

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return null
        }

        return authHeader.split(" ")[1]
}

// ─────────────────────────────────────
// RÉCUPÉRER ET VÉRIFIER L'UTILISATEUR
// depuis le token JWT
// ─────────────────────────────────────

export async function getAuthUser(
        req: NextRequest
): Promise<JwtPayload | null> {
        const token = getTokenFromHeader(req)

        if (!token) return null

        return await verifyToken(token)
}