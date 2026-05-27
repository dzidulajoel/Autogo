// app/api/auth/logout/route.ts

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/libs/prisma"

// ─────────────────────────────────────
// ROUTE POST — /api/auth/logout
// ─────────────────────────────────────

export async function POST(req: NextRequest) {

        try {

                // 1️⃣ Récupérer le refresh token depuis le cookie
                const refreshToken = req.cookies.get("refreshToken")?.value

                // 2️⃣ Si pas de token → déjà déconnecté
                if (!refreshToken) {
                        return NextResponse.json(
                                {
                                        success: true,
                                        message: "Déconnexion réussie",
                                },
                                { status: 200 }
                        )
                }

                // 3️⃣ Supprimer le refresh token de la base
                //    pour qu'il ne puisse plus être réutilisé
                await prisma.refreshToken.deleteMany({
                        where: { token: refreshToken },
                })

                // 4️⃣ Préparer la réponse
                const response = NextResponse.json(
                        {
                                success: true,
                                message: "Déconnexion réussie",
                        },
                        { status: 200 }
                )

                // 5️⃣ Supprimer le cookie côté client
                response.cookies.set("refreshToken", "", {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === "production",
                        sameSite: "lax",
                        maxAge: 0, // expire immédiatement
                        path: "/",
                })

                return response

        } catch (error) {
                console.error("[LOGOUT ERROR]", error)

                return NextResponse.json(
                        {
                                success: false,
                                message: "Une erreur est survenue",
                        },
                        { status: 500 }
                )
        }
}