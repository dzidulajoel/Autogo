// app/api/auth/refresh/route.ts

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/libs/prisma"
import {
  verifyToken,
  generateAccessToken,
} from "@/libs/jwt"

// ─────────────────────────────────────
// ROUTE POST — /api/auth/refresh
// Renouvelle l'access token
// grâce au refresh token dans le cookie
// ─────────────────────────────────────

export async function POST(req: NextRequest) {

  try {

    // 1️⃣ Récupérer le refresh token depuis le cookie
    const refreshToken = req.cookies.get("refreshToken")?.value

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Refresh token manquant. Veuillez vous reconnecter.",
        },
        { status: 401 }
      )
    }

    // 2️⃣ Vérifier que le refresh token est valide
    const payload = await verifyToken(refreshToken)

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          message: "Session expirée. Veuillez vous reconnecter.",
        },
        { status: 401 }
      )
    }

    // 3️⃣ Vérifier que le refresh token existe en base
    //    et qu'il n'est pas expiré
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token:     refreshToken,
        userId:    payload.id,
        expiresAt: { gt: new Date() }, // gt = greater than = après maintenant
      },
    })

    if (!storedToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Session invalide. Veuillez vous reconnecter.",
        },
        { status: 401 }
      )
    }

    // 4️⃣ Vérifier que l'utilisateur existe toujours
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    })

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "Compte introuvable ou suspendu",
        },
        { status: 403 }
      )
    }

    // 5️⃣ Générer un nouvel access token
    const newAccessToken = await generateAccessToken({
      id:    user.id,
      role:  user.role,
      phone: user.phone,
    })

    // 6️⃣ Retourner le nouvel access token
    return NextResponse.json(
      {
        success:     true,
        message:     "Token renouvelé",
        data: {
          accessToken: newAccessToken,
          expiresIn:   "15m",
        },
      },
      { status: 200 }
    )

  } catch (error) {
    console.error("[REFRESH ERROR]", error)

    return NextResponse.json(
      {
        success: false,
        message: "Une erreur est survenue",
      },
      { status: 500 }
    )
  }
}