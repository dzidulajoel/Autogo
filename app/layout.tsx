import type { Metadata } from "next";
import {
    Google_Sans,
    Inter_Tight,
    Lexend_Deca,
    Hanken_Grotesk,
} from "next/font/google";

import "./globals.css";

// 🔤 Google Sans
const googleSans = Google_Sans({
    variable: "--font-google-sans",
    subsets: ["latin"],
    weight: ["400", "500", "700"],
});

// 🔤 Inter Tight
const interTight = Inter_Tight({
    variable: "--font-inter-tight",
    subsets: ["latin"],
});

// 🔤 Hanken Grotesk
const hankenGrotesk = Hanken_Grotesk({
    variable: "--font-hanken-grotesk",
    subsets: ["latin"],
});

// 🔤 Lexend Deca
const lexendDeca = Lexend_Deca({
    variable: "--font-lexend-deca",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Nkonye",
    description: "Modern mobile application",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="fr"
            className={`
                ${googleSans.variable}
                ${interTight.variable}
                ${hankenGrotesk.variable}
                ${lexendDeca.variable}
                h-full
                antialiased
            `}
        >
            <body className="min-h-full flex flex-col">
                {children}
            </body>
        </html>
    );
}