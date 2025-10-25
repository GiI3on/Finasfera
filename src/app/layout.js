import "./globals.css";
import dynamic from "next/dynamic";

// ⬇⬇ KLUCZ: bierzemy default ALBO nazwany export
const AuthProvider = dynamic(
  () =>
    import("./components/AuthProvider").then(
      (m) => m.default ?? m.AuthProvider ?? ((p) => p.children) // ostatni fallback: „przepuść dzieci”
    ),
  { ssr: false }
);

const TopNav = dynamic(
  () => import("./components/TopNav").then((m) => m.default ?? m.TopNav),
  { ssr: false }
);

export const metadata = { /* ... zostaw jak masz ... */ };

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body className="min-h-screen bg-zinc-950 text-zinc-100">
        <AuthProvider>
          <TopNav />
          {children}
        </AuthProvider>

        {/* …Twoje skrypty schema.org – bez zmian… */}
      </body>
    </html>
  );
}
