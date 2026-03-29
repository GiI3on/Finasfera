import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

export const metadata = {
  title: "Blog o FIRE i Inwestowaniu — Finasfera",
  description: "Praktyczne poradniki o wolności finansowej (FIRE), inwestowaniu w Polsce i optymalizacji podatkowej.",
};

// Tutaj będziemy dodawać kolejne artykuły w przyszłości
const articles = [
  {
    slug: "emerytura-w-polsce", // <--- TUTAJ KRÓTSZA NAZWA
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