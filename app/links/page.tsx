import { LINKS } from "@/lib/site";

export const metadata = { title: "友链" };

export default function LinksPage() {
  return (
    <div className="page-stack">
      <div className="page-head">
        <h1>{LINKS.title}</h1>
        <p>{LINKS.intro}</p>
      </div>

      {LINKS.links.length === 0 ? (
        <p className="empty">{LINKS.empty}</p>
      ) : (
        <div className="links-grid">
          {LINKS.links.map((l) => (
            <a
              key={l.name}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="link-card"
            >
              <strong className="link-card__name">{l.name}</strong>
              <span className="link-card__desc">{l.desc}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
