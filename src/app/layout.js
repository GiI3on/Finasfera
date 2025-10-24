import "./globals.css";
import TopNav from "./components/TopNav";
import AuthProvider from "./components/AuthProvider";

export const metadata = {
  title: "Finasfera",
  description: "Kalkulator FIRE i portfel inwestycyjny",
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
