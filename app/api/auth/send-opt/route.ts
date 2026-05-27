// app/api/auth/send-otp/route.ts

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/libs/prisma"
import {
  generateOtpCode,
  sendOtpEmail,
  saveOtpCode,
} from "@/libs/otp"

// ─────────────────────────────────────
// SCHÉMA DE VALIDATION
// ─────────────────────────────────────

const sendOtpSchema = z.object({
  // L'email ou le téléphone du user
  userId: z.string().min(1, "UserId requis"),

  // Le type d'OTP
  // VERIFY_EMAIL → vérification compte
  // RESET_PASSWORD → mot de passe oublié
  type: z.enum(["VERIFY_EMAIL", "RESET_PASSWORD"]),
})

// ─────────────────────────────────────
// ROUTE POST — /api/auth/send-otp
// ─────────────────────────────────────

export async function POST(req: NextRequest) {

  try {

    // 1️⃣ Récupérer et valider les données
    const body       = await req.json()
    const validation = sendOtpSchema.safeParse(body)

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

    const { userId, type } = validation.data

    // 2️⃣ Récupérer l'utilisateur
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

    // 3️⃣ Vérifier que l'email existe
    //    On a besoin d'un email pour envoyer l'OTP
    if (!user.email) {
      return NextResponse.json(
        {
          success: false,
          message: "Aucun email associé à ce compte",
        },
        { status: 400 }
      )
    }

    // 4️⃣ Si c'est une vérification email
    //    et que le compte est déjà vérifié
    if (type === "VERIFY_EMAIL" && user.isVerified) {
      return NextResponse.json(
        {
          success: false,
          message: "Ce compte est déjà vérifié",
        },
        { status: 400 }
      )
    }

    // 5️⃣ Vérifier le cooldown
    //    On empêche d'envoyer plus d'un OTP
    //    toutes les 60 secondes
    const recentOtp = await prisma.otpCode.findFirst({
      where: {
        userId,
        type,
        createdAt: {
          // createdAt > maintenant - 60 secondes
          gt: new Date(Date.now() - 60 * 1000),
        },
      },
    })

    if (recentOtp) {
      return NextResponse.json(
        {
          success: false,
          message: "Veuillez attendre 60 secondes avant de renvoyer un code",
        },
        { status: 429 } // 429 = Too Many Requests
      )
    }

    // 6️⃣ Générer le code OTP
    const code = generateOtpCode()

    // 7️⃣ Sauvegarder en base
    await saveOtpCode(userId, code, type)

    // 8️⃣ Envoyer l'email
    const sent = await sendOtpEmail(
      user.email,
      code,
      user.prenom
    )

    if (!sent) {
      return NextResponse.json(
        {
          success: false,
          message: "Erreur lors de l'envoi de l'email. Réessayez.",
        },
        { status: 500 }
      )
    }

    // 9️⃣ Retourner la réponse
    //    On ne retourne JAMAIS le code dans la réponse
    return NextResponse.json(
      {
        success: true,
        message: `Code envoyé à ${user.email}`,
        data: {
          // On retourne l'email masqué
          // ex: g***@gmail.com
          email:     maskEmail(user.email),
          expiresIn: "10 minutes",
        },
      },
      { status: 200 }
    )

  } catch (error) {
    console.error("[SEND OTP ERROR]", error)

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
// HELPER — Masquer l'email
// ex: gamathodzidula@gmail.com
//   → g***@gmail.com
// ─────────────────────────────────────

function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  return `${local[0]}***@${domain}`
}