// middleware.ts
// À la racine du projet — pas dans app/
// Next.js l'exécute avant chaque requête

import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/libs/jwt"

// ─────────────────────────────────────
// ROUTES PUBLIQUES
// Accessibles sans token
// ─────────────────────────────────────

const PUBLIC_ROUTES = [
        "/api/auth/register",
        "/api/auth/login",
        "/api/auth/send-otp",
        "/api/auth/verify-otp",
        "/api/auth/refresh",
        "/api/auth/forgot-password",
]

// ─────────────────────────────────────
// ROUTES PAR RÔLE
// ─────────────────────────────────────

const ADMIN_ROUTES = [
        "/api/admin",
        // "/api/users",
]

const COLLECTOR_ROUTES = [
        "/api/members",
        "/api/tontines",
        "/api/payments",
        "/api/dashboard/collector",
]

const MEMBER_ROUTES = [
        "/api/dashboard/member",
]

// ─────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────

export async function middleware(req: NextRequest) {

        const { pathname } = req.nextUrl

        // 1️⃣ Laisser passer les routes publiques
        //    sans vérification de token
        const isPublic = PUBLIC_ROUTES.some(route =>
                pathname.startsWith(route)
        )

        if (isPublic) {
                return NextResponse.next()
        }

        // 2️⃣ Récupérer le token depuis le header
        const authHeader = req.headers.get("authorization")
        const token = authHeader?.split(" ")[1]

        // 3️⃣ Pas de token → non autorisé
        if (!token) {
                return NextResponse.json(
                        {
                                success: false,
                                message: "Token manquant. Veuillez vous connecter.",
                        },
                        { status: 401 }
                )
        }

        // 4️⃣ Vérifier et décoder le token
        const payload = await verifyToken(token)

        // 5️⃣ Token invalide ou expiré
        if (!payload) {
                return NextResponse.json(
                        {
                                success: false,
                                message: "Session expirée. Veuillez vous reconnecter.",
                        },
                        { status: 401 }
                )
        }

        // 6️⃣ Vérifier les permissions par rôle

        // Routes ADMIN — uniquement l'admin
        const isAdminRoute = ADMIN_ROUTES.some(route =>
                pathname.startsWith(route)
        )

        if (isAdminRoute && payload.role !== "ADMIN") {
                return NextResponse.json(
                        {
                                success: false,
                                message: "Accès refusé. Droits administrateur requis.",
                        },
                        { status: 403 }
                )
        }

        // Routes COLLECTOR — admin ou collecteur
        const isCollectorRoute = COLLECTOR_ROUTES.some(route =>
                pathname.startsWith(route)
        )

        if (
                isCollectorRoute &&
                payload.role !== "COLLECTOR" &&
                payload.role !== "ADMIN"
        ) {
                return NextResponse.json(
                        {
                                success: false,
                                message: "Accès refusé. Droits collecteur requis.",
                        },
                        { status: 403 }
                )
        }

        // Routes MEMBER — tous les rôles connectés
        const isMemberRoute = MEMBER_ROUTES.some(route =>
                pathname.startsWith(route)
        )

        if (isMemberRoute && !payload.role) {
                return NextResponse.json(
                        {
                                success: false,
                                message: "Accès refusé.",
                        },
                        { status: 403 }
                )
        }

        // 7️⃣ Tout est bon
        //    On ajoute les infos user dans les headers
        //    pour les récupérer dans les routes API
        const requestHeaders = new Headers(req.headers)
        requestHeaders.set("x-user-id", payload.id)
        requestHeaders.set("x-user-role", payload.role)
        requestHeaders.set("x-user-phone", payload.phone)

        return NextResponse.next({
                request: { headers: requestHeaders },
        })
}

// ─────────────────────────────────────
// CONFIG — Quelles routes intercepter
// ─────────────────────────────────────

export const config = {
        matcher: [
                // Intercepter toutes les routes /api/
                // sauf les fichiers statiques Next.js
                "/api/:path*",
        ],
}