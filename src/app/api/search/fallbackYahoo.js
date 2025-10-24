const Y_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  "Accept": "application/json,text/plain,*/*",
  "Referer": "https://finance.yahoo.com/",
};

export async function yahooMultipass(query) {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      query
    )}&quotesCount=5&newsCount=0`;
    const j = await fetch(url, { cache: "no-store", headers: Y_HEADERS }).then(
      (r) => r.json()
    );

    const items = j?.quotes || [];
    return items.map((it) => ({
      yahoo: it.symbol,
      name: it.shortname || it.longname || it.symbol,
      exch: it.exchange,
    }));
  } catch (e) {
    console.error("Yahoo search fail", e);
    return [];
  }
}
