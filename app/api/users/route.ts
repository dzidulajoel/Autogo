// app/api/users/route.ts

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/libs/prisma"
import { Role, UserStatus } from "@prisma/client"
// ─────────────────────────────────────
// GET — /api/users
// Récupère tous les utilisateurs
// Accessible uniquement par l'admin
// ─────────────────────────────────────

export async function GET(req: NextRequest) {

    try {

        // 1️⃣ Récupérer les paramètres de recherche
        //    depuis l'URL ex: /api/users?role=MEMBER&page=1
        const { searchParams } = new URL(req.url)

        const role = searchParams.get("role")   // filtrer par rôle
        const status = searchParams.get("status") // filtrer par statut
        const page = parseInt(searchParams.get("page") || "1")
        const limit = parseInt(searchParams.get("limit") || "10")

        // 2️⃣ Calculer l'offset pour la pagination
        //    page 1 → skip 0
        //    page 2 → skip 10
        //    page 3 → skip 20
        const skip = (page - 1) * limit

        // 3️⃣ Construire les filtres dynamiquement
        //    Si role est fourni → filtrer par role
        //    Sinon → retourner tous les users
        const where = {
            ...(role && { role: role as Role }),
            ...(status && { status: status as UserStatus }),
        }

        // 4️⃣ Récupérer les users ET le total
        //    en une seule requête (plus performant)
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" }, // les plus récents en premier
                select: {
                    id: true,
                    nom: true,
                    prenom: true,
                    phone: true,
                    email: true,
                    role: true,
                    status: true,
                    isVerified: true,
                    createdAt: true,
                    // On inclut le profil collecteur si existe
                    collector: {
                        select: {
                            id: true,
                            zone: true,
                            isActive: true,
                            isApproved: true,
                        },
                    },
                },
            }),
            // Compter le total pour la pagination
            prisma.user.count({ where }),
        ])

        // 5️⃣ Retourner les users avec les infos de pagination
        return NextResponse.json(
            {
                success: true,
                data: users,
                pagination: {
                    total,           // total d'utilisateurs
                    page,            // page actuelle
                    limit,           // nombre par page
                    totalPages: Math.ceil(total / limit),
                },
            },
            { status: 200 }
        )

    } catch (error) {
        console.error("[GET USERS ERROR]", error)

        return NextResponse.json(
            {
                success: false,
                message: "Une erreur est survenue",
            },
            { status: 500 }
        )
    }
}