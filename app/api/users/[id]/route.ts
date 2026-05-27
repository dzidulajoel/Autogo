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


// ─────────────────────────────────────
// PATCH — /api/users/:id
// Mise à jour profil
// ─────────────────────────────────────

export async function PATCH(
        req: NextRequest,
        { params }: { params: { id: string } }
) {
        try {

                const userId = req.headers.get("x-user-id")
                const userRole = req.headers.get("x-user-role")

                // 1️⃣ Vérifier les permissions
                //    Un user peut modifier seulement son profil
                //    L'admin peut modifier n'importe qui
                if (userId !== params.id && userRole !== "ADMIN") {
                        return NextResponse.json(
                                {
                                        success: false,
                                        message: "Vous ne pouvez modifier que votre propre profil",
                                },
                                { status: 403 }
                        )
                }

                // 2️⃣ Récupérer les données à modifier
                const body = await req.json()

                // 3️⃣ Champs autorisés à modifier
                //    On ne laisse jamais modifier role ou password ici
                const {
                        nom,
                        prenom,
                        email,
                        avatar,
                        // Champs collecteur
                        zone,
                        commissionRate,
                } = body

                // 4️⃣ Vérifier que le user existe
                const user = await prisma.user.findUnique({
                        where: { id: params.id },
                        include: { collector: true },
                })

                if (!user) {
                        return NextResponse.json(
                                {
                                        success: false,
                                        message: "Utilisateur introuvable",
                                },
                                { status: 404 }
                        )
                }

                // 5️⃣ Mettre à jour en transaction
                const result = await prisma.$transaction(async (tx) => {

                        // Mettre à jour le user
                        const updatedUser = await tx.user.update({
                                where: { id: params.id },
                                data: {
                                        ...(nom && { nom }),
                                        ...(prenom && { prenom }),
                                        ...(email && { email }),
                                        ...(avatar && { avatar }),
                                },
                                select: {
                                        id: true,
                                        nom: true,
                                        prenom: true,
                                        phone: true,
                                        email: true,
                                        role: true,
                                        avatar: true,
                                },
                        })

                        // Si c'est un collecteur
                        // mettre à jour son profil aussi
                        if (user.role === "COLLECTOR" && user.collector) {
                                await tx.collector.update({
                                        where: { id: user.collector.id },
                                        data: {
                                                ...(zone && { zone }),
                                                ...(commissionRate && { commissionRate }),
                                        },
                                })
                        }

                        return updatedUser
                })

                return NextResponse.json(
                        {
                                success: true,
                                message: "Profil mis à jour avec succès",
                                data: result,
                        },
                        { status: 200 }
                )

        } catch (error) {
                console.error("[UPDATE USER ERROR]", error)

                return NextResponse.json(
                        {
                                success: false,
                                message: "Une erreur est survenue",
                        },
                        { status: 500 }
                )
        }
}

// ─────────────────────────────────────
// DELETE — /api/users/:id
// Admin supprime un utilisateur
// ─────────────────────────────────────

export async function DELETE(
        req: NextRequest,
        { params }: { params: { id: string } }
) {
        try {

                // 1️⃣ Admin seulement
                const userRole = req.headers.get("x-user-role")

                if (userRole !== "ADMIN") {
                        return NextResponse.json(
                                {
                                        success: false,
                                        message: "Accès refusé. Droits administrateur requis.",
                                },
                                { status: 403 }
                        )
                }

                // 2️⃣ Vérifier que le user existe
                const user = await prisma.user.findUnique({
                        where: { id: params.id },
                })

                if (!user) {
                        return NextResponse.json(
                                {
                                        success: false,
                                        message: "Utilisateur introuvable",
                                },
                                { status: 404 }
                        )
                }

                // 3️⃣ Ne peut pas supprimer un admin
                if (user.role === "ADMIN") {
                        return NextResponse.json(
                                {
                                        success: false,
                                        message: "Impossible de supprimer un administrateur",
                                },
                                { status: 400 }
                        )
                }

                // 4️⃣ Supprimer le user
                //    Prisma supprime automatiquement
                //    les données liées (cascade)
                await prisma.user.delete({
                        where: { id: params.id },
                })

                return NextResponse.json(
                        {
                                success: true,
                                message: "Utilisateur supprimé avec succès",
                        },
                        { status: 200 }
                )

        } catch (error) {
                console.error("[DELETE USER ERROR]", error)

                return NextResponse.json(
                        {
                                success: false,
                                message: "Une erreur est survenue",
                        },
                        { status: 500 }
                )
        }
}