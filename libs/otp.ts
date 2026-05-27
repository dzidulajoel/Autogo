// lib/otp.ts
// Fonctions OTP réutilisables dans toute l'app

import { prisma } from "@/libs/prisma"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

// ─────────────────────────────────────
// GÉNÉRER UN CODE OTP
// 6 chiffres aléatoires
// ─────────────────────────────────────

export function generateOtpCode(): string {
  // Génère un nombre entre 100000 et 999999
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// ─────────────────────────────────────
// ENVOYER L'EMAIL OTP VIA RESEND
// ─────────────────────────────────────

export async function sendOtpEmail(
  email: string,
  code: string,
  nom: string
): Promise<boolean> {
  try {
    await resend.emails.send({
      from: "AutoGo <onboarding@resend.dev>",
      to: email,
      subject: `${code} — Votre code de vérification AutoGo`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">

          <div style="background: #0F4C81; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">AutoGo</h1>
            <p style="color: #BEE3F8; margin: 4px 0 0; font-size: 13px;">Tontine Digitale</p>
          </div>

          <div style="background: #f9f9f9; padding: 32px 24px; border-radius: 0 0 12px 12px;">
            <p style="color: #1A202C; font-size: 15px;">
              Bonjour <strong>${nom}</strong>,
            </p>
            <p style="color: #4A5568; font-size: 14px;">
              Voici votre code de vérification :
            </p>

            <!-- CODE OTP -->
            <div style="background: white; border: 2px solid #10B981; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
              <span style="font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #0F4C81; font-family: monospace;">
                ${code}
              </span>
            </div>

            <p style="color: #718096; font-size: 13px; text-align: center;">
              ⏱️ Ce code expire dans <strong>10 minutes</strong>
            </p>
            <p style="color: #718096; font-size: 13px; text-align: center;">
              ⚠️ Ne partagez jamais ce code avec quelqu'un
            </p>

            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;"/>

            <p style="color: #A0AEC0; font-size: 12px; text-align: center;">
              Si vous n'avez pas créé de compte AutoGo, ignorez cet email.
            </p>
          </div>

        </div>
      `,
    })

    return true

  } catch (error) {
    console.error("[SEND OTP EMAIL ERROR]", error)
    return false
  }
}

// ─────────────────────────────────────
// SAUVEGARDER L'OTP EN BASE
// Supprime les anciens OTP du user
// avant d'en créer un nouveau
// ─────────────────────────────────────

export async function saveOtpCode(
  userId: string,
  code: string,
  type: string
): Promise<void> {

  // Supprimer les anciens OTP du même type
  // pour ce user — évite les doublons
  await prisma.otpCode.deleteMany({
    where: { userId, type },
  })

  // Calculer la date d'expiration
  // maintenant + 10 minutes
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + 10)

  // Créer le nouvel OTP
  await prisma.otpCode.create({
    data: {
      userId,
      code,
      type,
      expiresAt,
      attempts: 0,
    },
  })
}