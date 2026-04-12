import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

export const metadata = {
  title: "Blog o FIRE i Inwestowaniu — Finasfera",
  description: "Praktyczne poradniki o wolności finansowej (FIRE), inwestowaniu w Polsce i optymalizacji podatkowej.",
  // DODANE SEO - Strona Kanoniczna
  alternates: {
    canonical: 'https://finasfera.pl/blog',
  },
};

// Tablica ze wszystkimi artykułami
const articles = [
  {
    slug: "limit-wplat-ike-2026",
    title: "Limit wpłat na IKE w 2026 roku – co oznaczają liczby dla młodego inwestora?",
    excerpt: "Limit na IKE w 2026 roku to ponad 28 tys. zł. To jednak sufit, a nie podłoga! Przeczytaj, dlaczego wpłacając nawet 500 zł miesięcznie, możesz oszczędzić ponad 260 000 zł na podatku Belki.",
    date: "14 Kwietnia 2026",
    readTime: "7 min czytania",
  },
  {
    slug: "symulacja-monte-carlo-emerytura", 
    title: "Symulacja Monte Carlo dla emerytury: dlaczego zwykły kalkulator kłamie?",
    excerpt: "Zwykły kalkulator zakłada stały zwrot 7% rocznie. Rynek tak nie działa. Poznaj ryzyko sekwencji stóp zwrotu (SoRR) i sprawdź, dlaczego do planowania wczesnej emerytury (FIRE) w Polsce potrzebujesz symulacji Monte Carlo.",
    date: "7 Kwietnia 2026",
    readTime: "6 min czytania",
  },
  {
    slug: "jak-zaczac-inwestowac",
    title: "Jak zacząć inwestować w Polsce: Przewodnik z kapitałem od 500 zł",
    excerpt: "Prawda jest taka, że dzisiaj próg wejścia w świat finansów jest najniższy w historii. Dowiedz się, jak wykorzystać procent składany, ETF-y i konta IKE/IKZE do budowania kapitału.",
    date: "Kwiecień 2026",
    readTime: "8 min czytania",
  },
  {
    slug: "emerytura-w-polsce", 
    title: "Ile musisz mieć na koncie żeby przejść na emeryturę w Polsce w 2026?",
    excerpt: "Poznaj regułę 4% dostosowaną do polskich realiów. Dowiedz się, jak obliczyć swój FIRE number i zaplanować wcześniejszą emeryturę krok po kroku.",
    date: "29 Marca 2026",
    readTime: "7 min czytania",
  },
];

export default function BlogIndex() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-zinc-100 mb-4 flex items-center gap-3">
          <BookOpen className="text-yellow-500 w-8 h-8" />
          Edukacja i FIRE
        </h1>
        <p className="text-zinc-400 text-lg">
          Zrozum finansową niezależność. Oparte na liczbach, dostosowane do polskich realiów.
        </p>
      </div>

      <div className="grid gap-6">
        {articles.map((article) => (
          <Link href={`/blog/${article.slug}`} key={article.slug}>
            <article className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-yellow-500/50 transition-colors group cursor-pointer">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-medium text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
                  Przewodnik
                </span>
                <span className="text-sm text-zinc-500">
                  {article.date} • {article.readTime}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-zinc-100 mb-3 group-hover:text-yellow-400 transition-colors">
                {article.title}
              </h2>
              <p className="text-zinc-400 mb-4 line-clamp-2">
                {article.excerpt}
              </p>
              <div className="flex items-center text-sm font-medium text-yellow-500 group-hover:text-yellow-400">
                Czytaj dalej <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </article>
          </Link>
        ))}
      </div>
    </main>
  );
}