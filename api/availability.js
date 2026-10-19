// Vercel serverless function: GET /api/availability
// Counts open Calendly slots left this month and next month (Atlanta time),
// so the booking section can say "October's almost booked – 3 dates left."
//
// Setup (one time):
//   1. Calendly → Integrations → API & Webhooks → create a Personal Access Token.
//   2. Vercel → Project → Settings → Environment Variables → add CALENDLY_TOKEN.
//   3. Redeploy.
// The token stays on the server; visitors only ever see the counts.

const EVENT_TYPE = "https://api.calendly.com/event_types/c87beed9-36bf-4d22-805d-0727a0e2e634";
const TZ = "America/New_York";
const WEEK = 7 * 24 * 60 * 60 * 1000;

function nyParts(date) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "numeric" }).formatToParts(date);
  const get = t => Number(p.find(x => x.type === t).value);
  return { y: get("year"), m: get("month") }; // m is 1-12
}
const monthName = (y, m) => new Date(Date.UTC(y, m - 1, 15)).toLocaleString("en-US", { month: "long", timeZone: "UTC" });

async function fetchWindow(token, start, end) {
  const url = "https://api.calendly.com/event_type_available_times?" + new URLSearchParams({
    event_type: EVENT_TYPE,
    start_time: start.toISOString(),
    end_time: end.toISOString()
  });
  const r = await fetch(url, { headers: { Authorization: "Bearer " + token } });
  if (!r.ok) throw new Error("Calendly " + r.status);
  const body = await r.json();
  return (body.collection || []).filter(s => s.status === "available").map(s => s.start_time);
}

module.exports = async function handler(req, res) {
  const token = process.env.CALENDLY_TOKEN;
  if (!token) return res.status(503).json({ error: "CALENDLY_TOKEN not set" });

  const now = new Date();
  const cur = nyParts(now);
  const next = cur.m === 12 ? { y: cur.y + 1, m: 1 } : { y: cur.y, m: cur.m + 1 };
  // Look ~9 weeks ahead in 7-day windows (Calendly's max range per request),
  // then sort each slot into its Atlanta-time month.
  const start = new Date(now.getTime() + 60 * 1000);
  const windows = [];
  for (let i = 0; i < 9; i++) windows.push([new Date(start.getTime() + i * WEEK), new Date(start.getTime() + (i + 1) * WEEK)]);

  try {
    const lists = await Promise.all(windows.map(([a, b]) => fetchWindow(token, a, b)));
    let left = 0, nextLeft = 0;
    for (const iso of lists.flat()) {
      const p = nyParts(new Date(iso));
      if (p.y === cur.y && p.m === cur.m) left++;
      else if (p.y === next.y && p.m === next.m) nextLeft++;
    }
    res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=3600");
    return res.status(200).json({
      month: monthName(cur.y, cur.m),
      monthNum: cur.m,
      left,
      nextMonth: monthName(next.y, next.m),
      nextLeft,
      checkedAt: now.toISOString()
    });
  } catch (e) {
    res.setHeader("Cache-Control", "public, s-maxage=60");
    return res.status(502).json({ error: "availability unavailable" });
  }
}
