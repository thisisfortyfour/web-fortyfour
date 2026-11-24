// Gives each project link (/proyectos/name) its own title, description and image when it is shared,
// reading the project from the site's content in Supabase. The page itself is the normal home, which opens the project.
const SB_URL = "https://cqiewdjrgcwiewiibioh.supabase.co";
const SB_KEY = "sb_publishable_wza7DW4CeKrhq-9SpmGgxg_OjIMiqob";
const SITE = "https://thisisfortyfour.com";

const slug = (s: string) =>
  String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "proyecto";
const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export default async (req: Request, context: { next: () => Promise<Response> }) => {
  const res = await context.next();
  try {
    const m = new URL(req.url).pathname.match(/^\/proyectos\/([^/?#]+)/);
    if (!m || !(res.headers.get("content-type") || "").includes("text/html")) return res;
    const want = decodeURIComponent(m[1]).toLowerCase();
    const r = await fetch(`${SB_URL}/rest/v1/web_content?id=eq.site&select=data`, { headers: { apikey: SB_KEY } });
    const rows = await r.json();
    const projects = (rows && rows[0] && rows[0].data && rows[0].data.projects) || [];
    const p = projects.find((x: { name?: string }) => slug(x.name || "") === want);
    if (!p) return res;
    const title = `${p.name} — FORTYFOUR`;
    const desc = [p.cat, String(p.desc || "").replace(/\s+/g, " ")].filter(Boolean).join(". ").slice(0, 160);
    const media = (p.media || []).find((x: { src?: string }) => x && x.src);
    const url = `${SITE}/proyectos/${want}`;
    let html = await res.text();
    html = html
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
      .replace(/(<meta name="description" content=")[^"]*/, `$1${esc(desc)}`)
      .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(title)}`)
      .replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(desc)}`)
      .replace(/(<meta property="og:url" content=")[^"]*/, `$1${esc(url)}`)
      .replace(/(<link rel="canonical" href=")[^"]*/, `$1${esc(url)}`);
    if (media) html = html.replace(/(<meta property="og:image" content=")[^"]*/, `$1${esc(media.src)}`);
    const headers = new Headers(res.headers);
    headers.delete("content-length");
    return new Response(html, { status: 200, headers });
  } catch (_e) {
    return res;
  }
};

export const config = { path: "/proyectos/*" };
