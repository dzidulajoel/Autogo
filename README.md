## AutoGo

Application Fintech de Gestion de Tontines Africaines

## Cahier des Charges Technique Complet

- Version : 1.0 - Initial
- Date : 24 mai 2026
- Statut  : Portoflio - Usage commercial
- Public cible : Equipe de developpement / Investisseurs / Structure financiere
- Technologies Next.js - PostgreSQL - PWA
- Marche cible Togo, Benin, Cote d'Ivoire (UEMOA)

## TABLE DES MATIERES

## 1. INTRODUCTION & PRESENTATION DU PROJET

AutoGo est une application fintech full-stack concue pour digitaliser et moderniser les tontines africaines traditionnelles dites Yes-Yes. Ce systeme d'epargne collectif, tres repandu au Togo et dans toute l'Afrique de l'Ouest, repose historiquement sur des carnets papier, la memoire du collecteur et une confiance fragile. AutoGo vise a transformer cette pratique en un service financier numerique transparent, securise et accessible.

## 1.1 Contexte et Problematique

Probleme  |================== | Impact
- Carnets papier perdus ou abimes  |================== | Perte irreversible des donnees, litiges non resolubles
- Calculs manuels errones  |================== | Erreurs de commission, de montant net du
- Aucun suivi en temps reel-> Le membre ne sait pas combien il a cotise
- Absence de tracabilite  |================== | Impossible de prouver un paiement sans le carnet
- Litiges collecteur / client->    Desaccords frequents sur les montants et dates
- Dependance totale au collecteur  |================== | Si le collecteur disparait, la comptabilite s'effondre

## 1.2 Vision et Proposition de Valeur

AutoGo remplace le carnet papier par un carnet numerique securise, accessible en temps reel par le membre, le collecteur et l'administrateur. La proposition de valeur se decline en cinq axes :

- Transparence totale des transactions
- Tracabilite horodatee de chaque paiement
- Automatisation des calculs (total, commission, net du)
- Notifications temps reel pour membres et collecteurs
- Rapports PDF exportables pour chaque partie

## 1.3 Objectifs Metier

Objectif-> Indicateur de succes
- Digitaliser 100% des carnets Yes-Yes  |================== | 0 carnet papier chez les collecteurs partenaires
- Reduire les litiges de 80%  |================== |   Taux de litiges < 5% apres 6 mois
- Ameliorer la confiance membre  |================== |  NPS > 60 apres 3 mois
- Generer des revenus via commissions SaaS  |================== |     Modele freemium : collecteur gratuit / Pro payant
- Preparer l'integration Mobile Money  |================== |  API Wave/Moov Money operationnelle en v2

## 2. ACTEURS DU SYSTEME

AutoGo distingue trois roles principaux, chacun avec des permissions strictement delimitees.

## ADMINISTRATEUR (Societe proprietaire)

Supervise l'ensemble de la plateforme. Gere les collecteurs, consulte les statistiques globales, configure les commissions et les parametres systeme, accede aux logs d'activite et aux rapports financiers.

- Gestion des collecteurs (CRUD complet)
- Supervision de toutes les transactions
- Configuration des taux de commission
- Rapports globaux et exports Excel/PDF
- Gestion des parametres systeme
- Acces aux logs d'activite
- Centre de support et gestion des tickets

## COLLECTEUR / AGENT (Tontinier)

Cree les comptes membres, gere les tontines et les carnets numeriques, enregistre les cotisations journalieres, suit les retards et genere ses propres rapports.

- Creation et gestion des membres
- Creation et gestion des tontines
- Enregistrement des paiements journaliers
- Generation de carnets numeriques PDF
- Consultation de ses commissions
- Rapports et historiques personnels

## MEMBRE / CLIENT FINAL

Consulte son carnet numerique, suit l'avancement de ses paiements, recoit des notifications et telecharge ses recus. Role en lecture seule sur les donnees financieres.

- Consultation du carnet numerique
- Historique des paiements
- Telechargement des recus PDF
- Reception des notifications SMS et push
- Consultation du solde et progression
- Gestion du profil personnel

## 3. FONCTIONNALITES DETAILLEES

## 3.1 Authentification & Securite

Fonctionnalite   |================== | Description
Inscription collecteur   |================== |  Formulaire avec verification telephone OTP + validation admin
Inscription membre   |================== |  Cree par le collecteur - pas d'auto-inscription
Connexion   |================== |  Telephone/email + mot de passe  |================== | JWT access + refresh token
OTP SMS   |================== |  Code 6 chiffres, validite 10 min, 3 tentatives max
Mot de passe oublie   |================== |  OTP envoye par SMS  |================== | reinitialisation
Deconnexion   |================== |  Revocation du refresh token cote serveur
Protection des routes   |================== | Middleware JWT verifiant role et token expire

## 3.2 Gestion des Membres

Le collecteur est responsable de la creation et de la gestion de ses membres. Chaque membre est rattache a un collecteur unique.
- Champ Type Requis Validation
- Nom & Prenom Texte Oui Min 2 car., Max 100 car.
- Telephone Texte Oui Format +228XXXXXXXX
- Adresse Texte Non Quartier / ville
- Montant journalier (XOF) Nombre Oui Entre 100 et 500 000 XOF
- Duree tontine (jours) Entier Oui Entre 10 et 365 jours
- Date de debut Date Oui >= aujourd'hui
- Photo profil Image Non JPEG/PNG, max 2 Mo
- Numero piece identite Texte Recommande CNI, passeport
- Notes collecteur Texte libre Non Max 500 car.

## 3.3 Carnet Numerique Yes-Yes (Coeur du Projet)

Le carnet numerique est la fonctionnalite centrale d'AutoGo. Il reproduit fidelement le carnet papier traditionnel en y ajoutant horodatage, 
- tracabilite et calcul automatique.
- Element du carnet Description
- Case N Numero du jour (J1 a Jn)
- Date theorique Date attendue pour ce paiement
- Montant attendu Montant journalier defini a la creation
- Statut PAYE / NON_PAYE / PARTIEL / AVANCE
- Date paiement reel Horodatage du paiement enregistre
- Montant paye Peut etre partiel ou avec avance
- Collecteur Nom du collecteur ayant encaisse
- Remarques Notes optionnelles sur le paiement

## Regles metier du carnet

- Un membre peut payer plusieurs jours en avance
- Un paiement partiel laisse la case en statut PARTIEL
- Le solde restant d'un paiement partiel est memorise
- Chaque case modifiee est auditee (qui, quand, quoi)
- Le carnet est accessible en lecture par le membre
- Le carnet PDF est genere a la demande
- Les cases impayees au-dela de J+2 generent une alerte retard

## 3.4 Calculs Automatiques

- Calcul Formule
- Total attendu Montant/jour x Nombre de jours
- Total collecte Somme de tous les paiements valides
- Commission collecteur Total attendu x taux_commission (ex: 5%)
- Montant net du au membre Total attendu - commission
- Reste a payer Total attendu - Total collecte
- Taux de completion (%) (Total collecte / Total attendu) x 100
- Nombre de jours en retard Jours dont date theorique < aujourd'hui et statut != PAYE

## 3.5 Notifications

- Notification Destinataire Declencheur Canal
- Confirmation paiement Membre Immediate SMS + Push
- Rappel retard Membre J+1 si impaye SMS + Push
- Tontine terminee Membre + Collecteur Dernier jour SMS + Push + Email
- Nouveau membre cree Collecteur Creation Push
- Commission disponible Collecteur Fin tontine Push + Email
- Alerte retard global Admin Hebdomadaire Email
- OTP verification Tous Inscription/Connexion SMS


# 📦 Autogo - Librairies utilisées

##  Framework
- Next.js → framework fullstack React
- TypeScript → typage statique
- TailwindCSS → styling CSS utility-first

## Base de données
- prisma → ORM (modélisation + requêtes DB)
- @prisma/client → client Prisma généré
- @neondatabase/serverless → PostgreSQL serverless (Neon)

##  Auth / Sécurité
- bcryptjs → hash des mots de passe
- jose → gestion JWT (tokens)
- zod → validation des données

##  Email / OTP
- resend → envoi d’emails (OTP, verification, reset password)

##  API / HTTP
- axios → requêtes HTTP
- @tanstack/react-query → gestion cache & data server

##  State management
- zustand → state global léger

##  Forms
- react-hook-form → gestion formulaires
- @hookform/resolvers → intégration validation (Zod)

##  UI
- @radix-ui/react-dialog → modales
- @radix-ui/react-toast → notifications
- lucide-react → icônes

##  Utils
- clsx → gestion classes CSS conditionnelles
- tailwind-merge → fusion classes Tailwind
- date-fns → gestion des dates

##  PDF / Charts
- jspdf → génération PDF
- jspdf-autotable → tables dans PDF
- recharts → graphiques


# 🚀 Flux Backend Global

- Client (Mobile/Web)
-        ↓
- Frontend Next.js
-        ↓
- API Route / Server Action
-        ↓
- Validation données (zod)
-        ↓
- Auth / Vérification JWT (jose)
-        ↓
- Hash / Compare password (bcryptjs)
-        ↓
- Business Logic
-        ↓
- Prisma ORM
-        ↓
- Neon PostgreSQL Database

----------------------------------------

# 🔐 Flux Auth Register

- User crée compte
-        ↓
- zod valide données
-        ↓
- bcryptjs hash password
-        ↓
- Prisma crée user DB
-        ↓
- Resend envoie email OTP
-        ↓
- User vérifie OTP
-        ↓
- Compte activé

----------------------------------------

# 🔐 Flux Login

- User entre email/password
-        ↓
- zod valide données
-        ↓
- Prisma cherche user
-        ↓
- bcrypt compare password
-        ↓
- jose génère JWT
-        ↓
- Token envoyé au client

----------------------------------------

# 🔐 Flux Route Protégée

- Client envoie JWT
-        ↓
- Backend vérifie token (jose)
-        ↓
- Token valide ?
       ↙              ↘
- Oui                Non
-   ↓                                     ↓
- Accès autorisé     401 Unauthorized

----------------------------------------

# 📧 Flux Reset Password

- User demande reset
-        ↓
- Backend génère OTP/token
-        ↓
- Resend envoie email
-        ↓
- User clique lien / entre code
-        ↓
- Backend vérifie token
-        ↓
- bcrypt hash nouveau password
-        ↓
- Prisma update password


# Auth
- → Users
- → Roles
- → Members
- → Tontines
- → Carnets
- → Payments
- → Reports
- → Notifications

## c 2025 AutoGo Digital - Tous droits reserves