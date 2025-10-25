// src/app/layout.js
export const metadata = {
  title: "Finasfera – inwestowanie, forum, FIRE",
  description:
    "Polska społeczność inwestorów. Forum o inwestowaniu, FIRE, finansach i niezależności finansowej.",
  verification: {
    google: "Lo2tpbGKiA4R2gW4N_UEpuhTurpkbyVfDiPQbfIEuUo", // kod z Google Search Console
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
