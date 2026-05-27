// app/api/users/[id]/promote/route.ts

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/libs/prisma"
import { Role } from "@prisma/client"

// ─────────────────────────────────────
// PATCH — /api/users/:id/promote
// Admin promeut un membre en collecteur
// ─────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {

  try {

    // récupérer id depuis params async
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

    // déjà collecteur
    if (user.role === "COLLECTOR") {
      return NextResponse.json(
        {
          success: false,
          message: "Utilisateur déjà collecteur"
        },
        { status: 400 }
      )
    }

    // impossible promouvoir admin
    if (user.role === "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Impossible de modifier un admin"
        },
        { status: 400 }
      )
    }

    // body optionnel
    const body = await req.json().catch(() => ({}))

    const zone = body.zone || null
    const commissionRate = body.commissionRate || 5.0

    // transaction
    const result = await prisma.$transaction(async (tx) => {

      // update role
      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          role: Role.COLLECTOR
        },
        select: {
          id: true,
          nom: true,
          prenom: true,
          phone: true,
          email: true,
          role: true,
          status: true,
        }
      })

      // create collector
      const collector = await tx.collector.create({
        data: {
          userId: id,
          zone,
          commissionRate,
          isActive: true,
          isApproved: true,
        }
      })

      return {
        updatedUser,
        collector
      }
    })

    return NextResponse.json(
      {
        success: true,
        message: `${result.updatedUser.prenom} ${result.updatedUser.nom} est maintenant collecteur`,
        data: result
      },
      { status: 200 }
    )

  } catch (error) {

    console.error("[PROMOTE ERROR]", error)

    return NextResponse.json(
      {
        success: false,
        message: "Erreur serveur"
      },
      { status: 500 }
    )
  }
}