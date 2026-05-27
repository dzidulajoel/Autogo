// app/api/auth/forgot-password/route.ts

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

const forgotPasswordSchema = z.object({
  // On accepte téléphone ou email
  phone: z.string().min(8).optional(),
  email: z.string().email().optional(),
}).refine(
  // Au moins un des deux doit être fourni
  (data) => data.phone || data.email,
  { message: "Téléphone ou email requis" }
)

// ─────────────────────────────────────
// ROUTE POST — /api/auth/forgot-password
// ─────────────────────────────────────

export async function POST(req: NextRequest) {

  try {

    // 1️⃣ Récupérer et valider les données
    const body       = await req.json()
    const validation = forgotPasswordSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Téléphone ou email requis",
          errors:  validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { phone, email } = validation.data

    // 2️⃣ Chercher le user par téléphone ou email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(phone ? [{ phone }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
    })

    // 3️⃣ User introuvable
    //    Message vague pour ne pas révéler
    //    si le compte existe ou non
    if (!user) {
      return NextResponse.json(
        {
          success: true,
          message: "Si ce compte existe, un email a été envoyé",
        },
        { status: 200 }
      )
    }

    // 4️⃣ Vérifier que le compte est actif
    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "Ce compte est suspendu. Contactez l'administrateur.",
        },
        { status: 403 }
      )
    }

    // 5️⃣ Vérifier que le user a un email
    if (!user.email) {
      return NextResponse.json(
        {
          success: false,
          message: "Aucun email associé à ce compte. Contactez l'administrateur.",
        },
        { status: 400 }
      )
    }

    // 6️⃣ Vérifier le cooldown de 60 secondes
    const recentOtp = await prisma.otpCode.findFirst({
      where: {
        userId: user.id,
        type:   "RESET_PASSWORD",
        createdAt: {
          gt: new Date(Date.now() - 60 * 1000),
        },
      },
    })

    if (recentOtp) {
      return NextResponse.json(
        {
          success: false,
          message: "Veuillez attendre 60 secondes avant de réessayer",
        },
        { status: 429 }
      )
    }

    // 7️⃣ Générer et sauvegarder l'OTP
    const code = generateOtpCode()
    await saveOtpCode(user.id, code, "RESET_PASSWORD")

    // 8️⃣ Envoyer l'email
    await sendOtpEmail(user.email, code, user.prenom)

    // 9️⃣ Retourner la réponse
    //    On retourne le userId masqué
    //    pour que le frontend puisse
    //    appeler verify-otp puis reset-password
    return NextResponse.json(
      {
        success: true,
        message: "Un code de vérification a été envoyé à votre email",
        data: {
          userId:    user.id,
          email:     maskEmail(user.email),
          expiresIn: "10 minutes",
        },
      },
      { status: 200 }
    )

  } catch (error) {
    console.error("[FORGOT PASSWORD ERROR]", error)

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
// ─────────────────────────────────────

function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  return `${local[0]}***@${domain}`
}

