// app/api/auth/register/route.ts

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/libs/prisma"

// ─────────────────────────────────────
// SCHÉMA DE VALIDATION
// Uniquement MEMBER via le register public
// ADMIN et COLLECTOR sont créés autrement
// ─────────────────────────────────────

const registerSchema = z.object({
  nom: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères"),

  prenom: z
    .string()
    .min(2, "Le prénom doit contenir au moins 2 caractères"),

  phone: z
    .string()
    .min(8, "Numéro de téléphone invalide"),

  email: z
    .string()
    .email("Email invalide")
    .optional(),

  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères"),

  // On accepte uniquement MEMBER
  // ADMIN → script
  // COLLECTOR → promu par l'admin
  role: z.literal("MEMBER"),
})

// ─────────────────────────────────────
// ROUTE POST — /api/auth/register
// ─────────────────────────────────────

export async function POST(req: NextRequest) {

  try {

    // 1️⃣ Récupérer les données du formulaire
    const body = await req.json()

    // 2️⃣ Valider avec Zod
    const validation = registerSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Données invalides",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { nom, prenom, phone, email, password } = validation.data

    // 3️⃣ Vérifier que le téléphone n'existe pas déjà
    const existingPhone = await prisma.user.findUnique({
      where: { phone },
    })

    if (existingPhone) {
      return NextResponse.json(
        {
          success: false,
          message: "Ce numéro de téléphone est déjà utilisé",
        },
        { status: 409 }
      )
    }

    // 4️⃣ Vérifier que l'email n'existe pas déjà
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      })

      if (existingEmail) {
        return NextResponse.json(
          {
            success: false,
            message: "Cet email est déjà utilisé",
          },
          { status: 409 }
        )
      }
    }

    // 5️⃣ Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10)

    // 6️⃣ Créer l'utilisateur en base
    //    Role forcé à MEMBER — pas de choix possible
    const user = await prisma.user.create({
      data: {
        nom,
        prenom,
        phone,
        email,
        password: hashedPassword,
        role: "MEMBER", // forcé — jamais modifiable ici
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        phone: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    })

    // 7️⃣ Retourner la réponse de succès
    return NextResponse.json(
      {
        success: true,
        message: "Compte créé avec succès",
        data: user,
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("[REGISTER ERROR]", error)

    return NextResponse.json(
      {
        success: false,
        message: "Une erreur est survenue. Réessayez plus tard.",
      },
      { status: 500 }
    )
  }
}

