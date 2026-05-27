// app/api/auth/login/route.ts

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/libs/prisma"
import { generateAccessToken, generateRefreshToken } from "@/libs/jwt"

// ─────────────────────────────────────
// SCHÉMA DE VALIDATION
// ─────────────────────────────────────

const loginSchema = z.object({
        phone: z
                .string()
                .min(8, "Numéro de téléphone invalide"),

        password: z
                .string()
                .min(1, "Mot de passe requis"),
})

// ─────────────────────────────────────
// ROUTE POST — /api/auth/login
// ─────────────────────────────────────

export async function POST(req: NextRequest) {

        try {

                // 1️⃣ Récupérer les données
                const body = await req.json()

                // 2️⃣ Valider avec Zod
                const validation = loginSchema.safeParse(body)

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

                const { phone, password } = validation.data

                // 3️⃣ Chercher l'utilisateur par téléphone
                const user = await prisma.user.findUnique({
                        where: { phone },
                        include: {
                                // On inclut le profil collecteur
                                // pour savoir si c'est un collecteur approuvé
                                collector: {
                                        select: {
                                                id: true,
                                                isApproved: true,
                                                isActive: true,
                                                zone: true,
                                        },
                                },
                        },
                })

                // 4️⃣ Utilisateur introuvable
                //    Message volontairement vague
                //    pour ne pas révéler si le compte existe
                if (!user) {
                        return NextResponse.json(
                                {
                                        success: false,
                                        message: "Téléphone ou mot de passe incorrect",
                                },
                                { status: 401 } // 401 = Unauthorized
                        )
                }

                // 5️⃣ Vérifier que le compte est actif
                if (user.status !== "ACTIVE") {
                        return NextResponse.json(
                                {
                                        success: false,
                                        message: "Votre compte est suspendu. Contactez l'administrateur.",
                                },
                                { status: 403 } // 403 = Forbidden
                        )
                }

                // 6️⃣ Vérifier le mot de passe
                //    bcrypt.compare compare le mot de passe
                //    avec le hash stocké en base
                const isPasswordValid = await bcrypt.compare(
                        password,
                        user.password!
                )

                if (!isPasswordValid) {
                        return NextResponse.json(
                                {
                                        success: false,
                                        message: "Téléphone ou mot de passe incorrect",
                                },
                                { status: 401 }
                        )
                }

                // 7️⃣ Si c'est un collecteur
                //    vérifier qu'il est approuvé par l'admin
                if (user.role === "COLLECTOR" && !user.collector?.isApproved) {
                        return NextResponse.json(
                                {
                                        success: false,
                                        message: "Votre compte collecteur est en attente de validation.",
                                },
                                { status: 403 }
                        )
                }

                // 8️⃣ Générer les tokens
                const tokenPayload = {
                        id: user.id,
                        role: user.role,
                        phone: user.phone,
                }

                const accessToken = await generateAccessToken(tokenPayload)
                const refreshToken = await generateRefreshToken(tokenPayload)

                // 9️⃣ Sauvegarder le refresh token en base
                //    On calcule la date d'expiration : maintenant + 7 jours
                const expiresAt = new Date()
                expiresAt.setDate(expiresAt.getDate() + 7)

                await prisma.refreshToken.create({
                        data: {
                                userId: user.id,
                                token: refreshToken,
                                expiresAt,
                        },
                })

                // 🔟 Mettre à jour la date de dernière connexion
                await prisma.user.update({
                        where: { id: user.id },
                        data: { lastLoginAt: new Date() },
                })

                // 1️⃣1️⃣ Préparer la réponse
                //     On ne retourne jamais le password
                const response = NextResponse.json(
                        {
                                success: true,
                                message: "Connexion réussie",
                                data: {
                                        user: {
                                                id: user.id,
                                                nom: user.nom,
                                                prenom: user.prenom,
                                                phone: user.phone,
                                                email: user.email,
                                                role: user.role,
                                                avatar: user.avatar,
                                                collector: user.collector ?? null,
                                        },
                                        accessToken,
                                        expiresIn: "15m",
                                },
                        },
                        { status: 200 }
                )

                // 1️⃣2️⃣ Mettre le refresh token dans un cookie httpOnly
                //     httpOnly = inaccessible depuis JavaScript
                //     c'est plus sécurisé que le localStorage
                response.cookies.set("refreshToken", refreshToken, {
                        httpOnly: true,                        // inaccessible en JS
                        secure: process.env.NODE_ENV === "production", // HTTPS en prod
                        sameSite: "lax",                       // protection CSRF
                        maxAge: 60 * 60 * 24 * 7,           // 7 jours en secondes
                        path: "/",
                })

                return response

        } catch (error) {
                console.error("[LOGIN ERROR]", error)

                return NextResponse.json(
                        {
                                success: false,
                                message: "Une erreur est survenue. Réessayez plus tard.",
                        },
                        { status: 500 }
                )
        }
}