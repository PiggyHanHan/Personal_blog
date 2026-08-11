import { getLinks } from "@/lib/content";

export const metadata = { title: "友链" };

export default function LinksPage() {
  const links = getLinks();

  return (
    <div className="page-stack">
      <div className="page-head">
        <h1>{links.title}</h1>
        <p>{links.intro}</p>
      </div>

      {links.links.length === 0 ? (
        <p className="empty">{links.empty}</p>
      ) : (
        <div className="friend-list">
          {links.links.map((l) => (
            <a
              key={l.name}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="friend-card"
            >
              <div className="friend-card__avatar">
                {l.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.avatar} alt={`${l.name} 的头像`} />
                ) : (
                  <span className="friend-card__initial">
                    {l.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="friend-card__body">
                <strong className="friend-card__name">{l.name}</strong>
                <span className="friend-card__url">{l.url}</span>
              </div>
              <span className="friend-card__note">（{l.note}）</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
