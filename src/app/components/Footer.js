export default function Footer() {
  return (
    <footer className="mt-12 border-t border-zinc-800">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 text-sm text-zinc-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          © {new Date().getFullYear()} <span className="text-zinc-200">Finasfera</span>. Wszystko w PLN.  
          Edukacja, nie porada inwestycyjna.
        </div>
        <div className="flex gap-4">
          <a className="hover:text-zinc-200" href="#">Polityka prywatności</a>
          <a className="hover:text-zinc-200" href="#">Kontakt</a>
        </div>
      </div>
    </footer>
  );
}
