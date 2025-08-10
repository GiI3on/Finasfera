import "./globals.css";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Finasfera",
  description: "Kalkulator FIRE i Mój Portfel – wszystko w PLN",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body className="font-sans text-zinc-100 antialiased bg-gradient-to-b from-[#0b0b10] to-black">
        <TopNav />
        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
