// app/api/auth/reset-password/route.ts

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/libs/prisma"

// ─────────────────────────────────────
// SCHÉMA DE VALIDATION
// ─────────────────────────────────────

const resetPasswordSchema = z.object({
  // userId retourné par forgot-password
  userId: z
    .string()
    .min(1, "UserId requis"),

  // Nouveau mot de passe
  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères"),

  // Confirmation mot de passe
  confirmPassword: z
    .string()
    .min(6, "La confirmation est requise"),

}).refine(
  // Les deux mots de passe doivent correspondre
  (data) => data.password === data.confirmPassword,
  {
    message: "Les mots de passe ne correspondent pas",
    path:    ["confirmPassword"],
  }
)

// ─────────────────────────────────────
// ROUTE POST — /api/auth/reset-password
// ─────────────────────────────────────

export async function POST(req: NextRequest) {

  try {

    // 1️⃣ Récupérer et valider les données
    const body       = await req.json()
    const validation = resetPasswordSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Données invalides",
          errors:  validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { userId, password } = validation.data

    // 2️⃣ Vérifier que le user existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    // 3️⃣ Vérifier que l'OTP a bien été validé
    //    Après verify-otp il ne reste plus d'OTP
    //    de type RESET_PASSWORD en base
    //    S'il en reste un c'est que verify-otp
    //    n'a pas encore été appelé
    const pendingOtp = await prisma.otpCode.findFirst({
      where: {
        userId,
        type: "RESET_PASSWORD",
      },
    })

    if (pendingOtp) {
      return NextResponse.json(
        {
          success: false,
          message: "Veuillez d'abord valider votre code OTP",
          data: {
            action: "VERIFY_OTP",
            userId,
          },
        },
        { status: 403 }
      )
    }

    // 4️⃣ Vérifier que le nouveau mot de passe
    //    est différent de l'ancien
    const isSamePassword = await bcrypt.compare(
      password,
      user.password!
    )

    if (isSamePassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Le nouveau mot de passe doit être différent de l'ancien",
        },
        { status: 400 }
      )
    }

    // 5️⃣ Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(password, 10)

    // 6️⃣ Mettre à jour le mot de passe
    //    et révoquer tous les refresh tokens
    //    pour forcer une reconnexion
    await prisma.$transaction(async (tx) => {

      // Mettre à jour le mot de passe
      await tx.user.update({
        where: { id: userId },
        data:  { password: hashedPassword },
      })

      // Supprimer tous les refresh tokens
      // Le user devra se reconnecter
      await tx.refreshToken.deleteMany({
        where: { userId },
      })

      // Supprimer toutes les sessions
      await tx.session.deleteMany({
        where: { userId },
      })
    })

    return NextResponse.json(
      {
        success: true,
        message: "Mot de passe réinitialisé avec succès. Veuillez vous reconnecter.",
      },
      { status: 200 }
    )

  } catch (error) {
    console.error("[RESET PASSWORD ERROR]", error)

    return NextResponse.json(
      {
        success: false,
        message: "Une erreur est survenue",
      },
      { status: 500 }
    )
  }
}