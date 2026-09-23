"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import QuestCard from "@/components/home/QuestCard";
import { POSTS } from "@/lib/site";
import {
  rawTokens,
  searchDocs,
  type SearchDoc,
  type SearchHit,
  type SearchReason,
  type SearchResult,
} from "@/lib/search";

// 文章页搜索：输入即在下拉里预览（只显示文章名），回车后在整页显示完整结果。
//
// 匹配逻辑在 lib/search.ts（同构），检索索引由 app/posts/page.tsx 在构建时
// 用 lib/searchIndex.ts 生成后作为 docs 传入——所以本组件不依赖任何拼音库。
//
// 键盘：↑/↓ 在下拉里移动，回车提交搜索，Esc 关下拉 / 清空。
// 中文输入法组合期间（isComposing）的回车交给输入法，不触发提交。

/** 下拉里最多预览多少条 */
const PREVIEW_LIMIT = 10;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 标题里的原文命中高亮；拼音命中没有字面位置，自然不高亮 */
function highlight(text: string, tokens: string[]): ReactNode {
  const valid = tokens.filter((token) => token.length > 0);
  if (valid.length === 0) return text;
  const pattern = new RegExp(`(${valid.map(escapeRegExp).join("|")})`, "gi");
  return text
    .split(pattern)
    .map((part, i) =>
      i % 2 === 1 ? (
        <mark key={`${i}-${part}`} className="post-search__mark">
          {part}
        </mark>
      ) : (
        part
      )
    );
}

/** 命中原因文案：标题 / 分类 / 链接 / 标签 / 摘要（拼音命中额外标注） */
function reasonLabel(reason: SearchReason): string {
  const field = POSTS.search.fields[reason.field];
  return reason.kind === "text" ? field : `${field}·${POSTS.search.pinyin}`;
}

export default function PostSearch({
  docs,
  children,
}: {
  docs: SearchDoc[];
  children: ReactNode;
}) {
  const [input, setInput] = useState("");
  /** 已提交（回车）的搜索词；null 表示显示分类 tab */
  const [committed, setCommitted] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);

  const preview = useMemo<SearchResult>(
    () => (input.trim() ? searchDocs(docs, input) : { hits: [] }),
    [docs, input]
  );
  const results = useMemo<SearchResult | null>(
    () => (committed ? searchDocs(docs, committed) : null),
    [docs, committed]
  );
  const tokens = useMemo(
    () => rawTokens(committed ?? input),
    [committed, input]
  );

  const dropdownOpen = open && input.trim().length > 0;
  const shown: SearchHit[] = preview.hits.slice(0, PREVIEW_LIMIT);

  // 点击组件外部收起下拉
  useEffect(() => {
    if (!dropdownOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [dropdownOpen]);

  function commit(value: string) {
    const text = value.trim();
    setCommitted(text || null);
    setOpen(false);
    setActive(-1);
  }

  function reset() {
    setInput("");
    setCommitted(null);
    setOpen(false);
    setActive(-1);
    inputRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // 中文输入法组合期间不处理回车/方向键
    if (composingRef.current || event.nativeEvent.isComposing) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (shown.length === 0) return;
      event.preventDefault();
      setOpen(true);
      setActive((current) => {
        if (event.key === "ArrowDown") {
          return current + 1 >= shown.length ? 0 : current + 1;
        }
        return current <= 0 ? shown.length - 1 : current - 1;
      });
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      commit(input);
      return;
    }

    if (event.key === "Escape") {
      if (dropdownOpen) setOpen(false);
      else if (input || committed) reset();
    }
  }

  return (
    <div className="post-search" ref={rootRef}>
      {/* 下拉条要相对"搜索框"这一层定位（.post-search__field 是 position: relative）。
          如果直接放在 .post-search 下，top:100% 会按"搜索框 + 下方整列卡片"算高度，
          下拉条会被推到所有卡片下面（屏幕外），看起来就是"打字没反应"。 */}
      <div className="post-search__field">
        <div className="post-search__bar">
          <span className="post-search__icon" aria-hidden="true">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.6-3.6" />
            </svg>
          </span>
          <input
            ref={inputRef}
            className="post-search__input"
            type="text"
            value={input}
            placeholder={POSTS.search.placeholder}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            role="combobox"
            aria-expanded={dropdownOpen}
            aria-controls="post-search-listbox"
            aria-autocomplete="list"
            aria-activedescendant={
              active >= 0 ? `post-search-option-${active}` : undefined
            }
            onChange={(event) => {
              setInput(event.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={(event) => {
              composingRef.current = false;
              setInput(event.currentTarget.value);
              setOpen(true);
            }}
          />
          {input || committed ? (
            <button
              type="button"
              className="post-search__clear"
              onClick={reset}
            >
              {POSTS.search.clear}
            </button>
          ) : null}
        </div>

        {dropdownOpen ? (
          <div className="post-search__dropdown">
            {shown.length === 0 ? (
              <p className="post-search__dropdown-empty">
                {POSTS.search.dropdownEmpty}
              </p>
            ) : (
              <>
                <ul
                  className="post-search__list"
                  id="post-search-listbox"
                  role="listbox"
                  aria-label={POSTS.search.placeholder}
                >
                  {shown.map((hit, i) => (
                    <li
                      key={hit.doc.slug}
                      id={`post-search-option-${i}`}
                      role="option"
                      aria-selected={i === active}
                    >
                      {/* 一行一条：只显示文章名，命中原因放到原生 tooltip 里 */}
                      <Link
                        href={`/posts/${hit.doc.slug}`}
                        className={`post-search__item${
                          i === active ? " post-search__item--active" : ""
                        }`}
                        title={reasonLabel(hit.reason)}
                        onMouseEnter={() => setActive(i)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setOpen(false)}
                      >
                        <span className="post-search__item-title">
                          {highlight(hit.doc.title, tokens)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="post-search__foot">
                  {POSTS.search.footer}（{preview.hits.length}
                  {POSTS.search.countUnit}）
                </p>
              </>
            )}
          </div>
        ) : null}
      </div>

      {results ? (
        <section className="post-search__results">
          <div className="post-search__results-head">
            <p>
              {POSTS.search.resultHead}「{committed}」· {results.hits.length}
              {POSTS.search.countUnit}
              {results.category
                ? ` · ${POSTS.search.category}「${results.category}」`
                : ""}
            </p>
            <button
              type="button"
              className="post-search__back"
              onClick={reset}
            >
              {POSTS.search.back}
            </button>
          </div>
          {results.hits.length > 0 ? (
            <div className="quest-board">
              {results.hits.map((hit) => (
                <QuestCard key={hit.doc.slug} post={hit.doc} />
              ))}
            </div>
          ) : (
            <p className="empty">{POSTS.search.empty}</p>
          )}
        </section>
      ) : (
        children
      )}
    </div>
  );
}
