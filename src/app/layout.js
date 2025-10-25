// src/app/layout.js
import "./globals.css";
import TopNav from "./components/TopNav";
import AuthProvider from "./components/AuthProvider";

export const metadata = {
  title: "Finasfera",
  description: "Kalkulator FIRE i portfel inwestycyjny",
  verification: {
    google: "Lo2tpbGKiA4R2gW4N_UEpuhTurpkbyVfDiPQbfIEuUo", // Google Search Console
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body className="min-h-screen">
        <AuthProvider>
          <TopNav />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
