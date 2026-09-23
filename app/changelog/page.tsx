import Link from "next/link";
import { getChangelogEntries } from "@/lib/changelog";
import { CHANGELOG } from "@/lib/site";

export const metadata = { title: CHANGELOG.title };

export default function ChangelogPage() {
  const entries = getChangelogEntries();

  return (
    <div className="page-stack">
      <div className="page-head">
        <h1>{CHANGELOG.title}</h1>
        <p>{CHANGELOG.intro}</p>
      </div>

      {entries.length > 0 ? (
        <div className="quest-board">
          {entries.map((entry) => (
            <Link
              key={entry.slug}
              href={`/changelog/${entry.slug}`}
              className="quest-card"
            >
              <div className="quest-card__head">
                <h3 className="quest-card__title">{entry.title}</h3>
                <time className="quest-card__date" dateTime={entry.date}>
                  {entry.date}
                </time>
              </div>
              <p className="quest-card__excerpt">{entry.excerpt}</p>
              <span className="quest-card__go">查看详情 →</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="empty">{CHANGELOG.empty}</p>
      )}
    </div>
  );
}
