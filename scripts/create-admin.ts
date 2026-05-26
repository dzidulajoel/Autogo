// scripts/create-admin.ts
// Lance ce script UNE SEULE FOIS pour créer l'admin
// Commande : npx ts-node scripts/create-admin.ts

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {

  // 1️⃣ Vérifier si un admin existe déjà
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  })

  if (existingAdmin) {
    console.log("❌ Un admin existe déjà :", existingAdmin.email)
    return
  }

  // 2️⃣ Hasher le mot de passe admin
  const hashedPassword = await bcrypt.hash("AutoGo@Admin2025", 10)

  // 3️⃣ Créer l'admin
  const admin = await prisma.user.create({
    data: {
      nom: "Admin",
      prenom: "AutoGo",
      phone: "+22800000000",
      email: "admin@autogo.tg",
      password: hashedPassword,
      role: "ADMIN",
      isVerified: true,
      status: "ACTIVE",
    },
  })

  console.log("✅ Admin créé avec succès !")
  console.log("─────────────────────────────")
  console.log("📧 Email    :", admin.email)
  console.log("📱 Téléphone:", admin.phone)
  console.log("🔑 Password : AutoGo@Admin2025")
  console.log("─────────────────────────────")
  console.log("⚠️  Change le mot de passe après la première connexion !")
}

main()
  .catch((error) => {
    console.error("❌ Erreur :", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })