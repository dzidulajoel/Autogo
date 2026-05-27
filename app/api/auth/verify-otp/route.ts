// app/api/auth/verify-otp/route.ts

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/libs/prisma"

// ─────────────────────────────────────
// SCHÉMA DE VALIDATION
// ─────────────────────────────────────

const verifyOtpSchema = z.object({
  userId: z.string().min(1, "UserId requis"),
  code:   z.string().length(6, "Le code doit contenir 6 chiffres"),
  type:   z.enum(["VERIFY_EMAIL", "RESET_PASSWORD"]),
})

// ─────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────

// Nombre maximum de tentatives
// avant de bloquer l'OTP
const MAX_ATTEMPTS = 3

// ─────────────────────────────────────
// ROUTE POST — /api/auth/verify-otp
// ─────────────────────────────────────

export async function POST(req: NextRequest) {

  try {

    // 1️⃣ Récupérer et valider les données
    const body       = await req.json()
    const validation = verifyOtpSchema.safeParse(body)

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

    const { userId, code, type } = validation.data

    // 2️⃣ Chercher l'OTP en base
    const otpRecord = await prisma.otpCode.findFirst({
      where: { userId, type },
      orderBy: { createdAt: "desc" }, // le plus récent
    })

    // 3️⃣ OTP introuvable
    if (!otpRecord) {
      return NextResponse.json(
        {
          success: false,
          message: "Aucun code trouvé. Demandez un nouveau code.",
        },
        { status: 404 }
      )
    }

    // 4️⃣ Vérifier le nombre de tentatives
    //    Si trop de tentatives → bloquer
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      // Supprimer l'OTP bloqué
      await prisma.otpCode.delete({
        where: { id: otpRecord.id },
      })

      return NextResponse.json(
        {
          success: false,
          message: "Trop de tentatives. Demandez un nouveau code.",
        },
        { status: 429 }
      )
    }

    // 5️⃣ Vérifier l'expiration
    if (new Date() > otpRecord.expiresAt) {
      // Supprimer l'OTP expiré
      await prisma.otpCode.delete({
        where: { id: otpRecord.id },
      })

      return NextResponse.json(
        {
          success: false,
          message: "Code expiré. Demandez un nouveau code.",
        },
        { status: 400 }
      )
    }

    // 6️⃣ Vérifier le code
    if (otpRecord.code !== code) {
      // Incrémenter le nombre de tentatives
      await prisma.otpCode.update({
        where: { id: otpRecord.id },
        data:  { attempts: { increment: 1 } },
      })

      // Calculer les tentatives restantes
      const remaining = MAX_ATTEMPTS - (otpRecord.attempts + 1)

      return NextResponse.json(
        {
          success: false,
          message: `Code incorrect. ${remaining} tentative(s) restante(s).`,
        },
        { status: 400 }
      )
    }

    // 7️⃣ Code correct ✅
    //    Supprimer l'OTP utilisé
    await prisma.otpCode.delete({
      where: { id: otpRecord.id },
    })

    // 8️⃣ Actions selon le type d'OTP
    if (type === "VERIFY_EMAIL") {

      // Marquer le compte comme vérifié
      await prisma.user.update({
        where: { id: userId },
        data:  { isVerified: true },
      })

      return NextResponse.json(
        {
          success: true,
          message: "Compte vérifié avec succès. Vous pouvez vous connecter.",
        },
        { status: 200 }
      )
    }

    if (type === "RESET_PASSWORD") {

      // On retourne un token temporaire
      // pour autoriser le changement de mot de passe
      // Ce token sera utilisé dans /api/auth/forgot-password
      return NextResponse.json(
        {
          success: true,
          message: "Code vérifié. Vous pouvez réinitialiser votre mot de passe.",
          data: {
            userId,
            // Token simple pour autoriser le reset
            resetAllowed: true,
          },
        },
        { status: 200 }
      )
    }

  } catch (error) {
    console.error("[VERIFY OTP ERROR]", error)

    return NextResponse.json(
      {
        success: false,
        message: "Une erreur est survenue",
      },
      { status: 500 }
    )
  }
}