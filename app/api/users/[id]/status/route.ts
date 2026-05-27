// app/api/users/[id]/status/route.ts

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/libs/prisma"
import { UserStatus } from "@prisma/client"

// ─────────────────────────────────────
// PATCH — /api/users/:id/status
// Admin active ou désactive un utilisateur
// ─────────────────────────────────────

export async function PATCH(
        req: NextRequest,
        { params }: { params: Promise<{ id: string }> }
) {

        try {

                // récupérer id async
                const { id } = await params

                // vérifier admin
                const userRole = req.headers.get("x-user-role")

                if (userRole !== "ADMIN") {
                        return NextResponse.json(
                                {
                                        success: false,
                                        message: "Accès refusé"
                                },
                                { status: 403 }
                        )
                }

                // récupérer user
                const user = await prisma.user.findUnique({
                        where: { id },
                        include: {
                                collector: true
                        }
                })

                // user introuvable
                if (!user) {
                        return NextResponse.json(
                                {
                                        success: false,
                                        message: "Utilisateur introuvable"
                                },
                                { status: 404 }
                        )
                }

                // impossible modifier admin
                if (user.role === "ADMIN") {
                        return NextResponse.json(
                                {
                                        success: false,
                                        message: "Impossible de modifier un administrateur"
                                },
                                { status: 400 }
                        )
                }

                // inverser statut
                const newStatus =
                        user.status === "ACTIVE"
                                ? UserStatus.INACTIVE
                                : UserStatus.ACTIVE

                const newActive = newStatus === UserStatus.ACTIVE

                // transaction
                await prisma.$transaction(async (tx) => {

                        // update user
                        await tx.user.update({
                                where: { id },
                                data: {
                                        status: newStatus
                                }
                        })

                        // update collector si existe
                        if (user.role === "COLLECTOR" && user.collector) {

                                await tx.collector.update({
                                        where: {
                                                id: user.collector.id
                                        },
                                        data: {
                                                isActive: newActive
                                        }
                                })
                        }
                })

                return NextResponse.json(
                        {
                                success: true,
                                message: newActive
                                        ? `Compte de ${user.prenom} ${user.nom} activé`
                                        : `Compte de ${user.prenom} ${user.nom} désactivé`,

                                data: {
                                        id: user.id,
                                        status: newStatus,
                                        isActive: newActive
                                }
                        },
                        { status: 200 }
                )

        } catch (error) {

                console.error("[STATUS ERROR]", error)

                return NextResponse.json(
                        {
                                success: false,
                                message: "Erreur serveur"
                        },
                        { status: 500 }
                )
        }
}