// app/api/auth/me/route.ts

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/libs/prisma"
import { verifyToken } from "@/libs/jwt"

// ─────────────────────────────────────
// ROUTE GET — /api/auth/me
// Retourne l'utilisateur connecté
// ─────────────────────────────────────

export async function GET(req: NextRequest) {

        try {

                // 1️⃣ Récupérer le token depuis le header
                //    Le frontend envoie : Authorization: Bearer <token>
                const authHeader = req.headers.get("authorization")

                if (!authHeader || !authHeader.startsWith("Bearer ")) {
                        return NextResponse.json(
                                {
                                        success: false,
                                        message: "Token manquant. Veuillez vous connecter.",
                                },
                                { status: 401 }
                        )
                }

                // 2️⃣ Extraire le token
                //    "Bearer eyJhbGc..." → "eyJhbGc..."
                const token = authHeader.split(" ")[1]

                // 3️⃣ Vérifier et décoder le token
                const payload = await verifyToken(token)

                if (!payload) {
                        return NextResponse.json(
                                {
                                        success: false,
                                        message: "Token invalide ou expiré",
                                },
                                { status: 401 }
                        )
                }

                // 4️⃣ Récupérer l'utilisateur en base
                //    avec son profil collecteur si existe
                const user = await prisma.user.findUnique({
                        where: { id: payload.id },
                        select: {
                                id: true,
                                nom: true,
                                prenom: true,
                                phone: true,
                                email: true,
                                role: true,
                                status: true,
                                avatar: true,
                                isVerified: true,
                                lastLoginAt: true,
                                createdAt: true,
                                collector: {
                                        select: {
                                                id: true,
                                                zone: true,
                                                commissionRate: true,
                                                isApproved: true,
                                                isActive: true,
                                                _count: {
                                                        select: {
                                                                members: true,
                                                                tontines: true,
                                                        },
                                                },
                                        },
                                },
                                // Notifications non lues
                                notifications: {
                                        where: { isRead: false },
                                        take: 5,
                                        orderBy: { createdAt: "desc" },
                                        select: {
                                                id: true,
                                                title: true,
                                                message: true,
                                                type: true,
                                                createdAt: true,
                                        },
                                },
                        },
                })

                // 5️⃣ Utilisateur introuvable en base
                if (!user) {
                        return NextResponse.json(
                                {
                                        success: false,
                                        message: "Utilisateur introuvable",
                                },
                                { status: 404 }
                        )
                }

                // 6️⃣ Vérifier que le compte est toujours actif
                if (user.status !== "ACTIVE") {
                        return NextResponse.json(
                                {
                                        success: false,
                                        message: "Votre compte est suspendu",
                                },
                                { status: 403 }
                        )
                }

                // 7️⃣ Retourner l'utilisateur
                return NextResponse.json(
                        {
                                success: true,
                                data: user,
                        },
                        { status: 200 }
                )

        } catch (error) {
                console.error("[ME ERROR]", error)

                return NextResponse.json(
                        {
                                success: false,
                                message: "Une erreur est survenue",
                        },
                        { status: 500 }
                )
        }
}