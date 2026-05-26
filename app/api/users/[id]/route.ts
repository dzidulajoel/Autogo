// app/api/users/[id]/route.ts

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/libs/prisma"

// ─────────────────────────────────────
// GET — /api/users/[id]
// Récupère un utilisateur par son id
// ─────────────────────────────────────

export async function GET(
        req: NextRequest,
        { params }: { params: { id: string } }
) {

        try {

                // 1️⃣ Récupérer l'id depuis l'URL
                const { id } = await params

                // 2️⃣ Chercher l'utilisateur en base
                const user = await prisma.user.findUnique({
                        where: { id },
                        select: {
                                id: true,
                                nom: true,
                                prenom: true,
                                phone: true,
                                email: true,
                                role: true,
                                status: true,
                                isVerified: true,
                                avatar: true,
                                createdAt: true,
                                updatedAt: true,
                                // Profil collecteur si existe
                                collector: {
                                        select: {
                                                id: true,
                                                zone: true,
                                                commissionRate: true,
                                                isActive: true,
                                                isApproved: true,
                                                // Nombre de membres du collecteur
                                                _count: {
                                                        select: { members: true }
                                                },
                                        },
                                },
                                // Dernières notifications
                                notifications: {
                                        take: 5,
                                        orderBy: { createdAt: "desc" },
                                        select: {
                                                id: true,
                                                title: true,
                                                message: true,
                                                isRead: true,
                                                createdAt: true,
                                        },
                                },
                        },
                })

                // 3️⃣ Si l'utilisateur n'existe pas
                if (!user) {
                        return NextResponse.json(
                                {
                                        success: false,
                                        message: "Utilisateur introuvable",
                                },
                                { status: 404 }
                        )
                }

                // 4️⃣ Retourner l'utilisateur
                return NextResponse.json(
                        {
                                success: true,
                                data: user,
                        },
                        { status: 200 }
                )

        } catch (error) {
                console.error("[GET USER BY ID ERROR]", error)

                return NextResponse.json(
                        {
                                success: false,
                                message: "Une erreur est survenue",
                        },
                        { status: 500 }
                )
        }
}