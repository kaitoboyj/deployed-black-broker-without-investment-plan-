import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Bookmark, Newspaper } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { NewsItem } from "@/lib/news";
import { articleCategory, articleSource, articleTickers, articleTime } from "@/lib/news-presentation";
import { cn } from "@/lib/utils";

export function NewsImage({ item, featured = false }: { item: NewsItem; featured?: boolean }) {
  const [failed, setFailed] = useState(false);
  return item.image && !failed ? <img src={item.image} alt="" onError={() => setFailed(true)} loading={featured ? "eager" : "lazy"} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" /> : <div className="grid h-full w-full place-items-center bg-surface-2"><Newspaper className="h-10 w-10 text-primary/60" /></div>;
}
export function SaveArticle({ saved, onSave, title }: { saved: boolean; onSave: () => void; title: string }) {
  return <Button size="icon" variant="ghost" onClick={onSave} aria-label={`${saved ? "Unsave" : "Save"} ${title}`} title={saved ? "Remove from saved" : "Save article"} aria-pressed={saved} className={cn("h-8 w-8 shrink-0", saved ? "text-primary" : "text-muted-foreground")}><Bookmark fill={saved ? "currentColor" : "none"} /></Button>;
}
export function NewsArticle({ item, saved, onSave, onOpen }: { item: NewsItem; saved: boolean; onSave: () => void; onOpen: () => void }) {
  return <article className="group grid grid-cols-[88px_minmax(0,1fr)] gap-4 border-b border-border py-5 sm:grid-cols-[168px_minmax(0,1fr)] sm:gap-5">
    <Button variant="ghost" onClick={onOpen} aria-label={`Read ${item.title}`} className="h-auto self-start overflow-hidden rounded-md p-0 aspect-[4/3]"><NewsImage item={item} /></Button>
    <div className="min-w-0"><div className="mb-2 flex items-center justify-between gap-2"><span className="text-[10px] font-semibold uppercase text-primary">{articleCategory(item)}</span><SaveArticle saved={saved} onSave={onSave} title={item.title} /></div>
      <h3 className="text-base font-semibold leading-snug sm:text-lg"><Button variant="link" onClick={onOpen} className="block h-auto w-full whitespace-normal p-0 text-left text-inherit leading-snug text-foreground hover:text-primary hover:no-underline">{item.title}</Button></h3>
      <p className="mt-2 hidden line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:block">{item.summary}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] text-muted-foreground"><span>{articleSource(item)}</span><time dateTime={item.publishedAt}>{articleTime(item.publishedAt)}</time>{articleTickers(item).map((coin) => <Button key={coin.id} asChild variant="ghost" size="sm" className="h-5 rounded-sm border border-border px-1.5 font-mono text-[9px]"><Link to="/coin/$coinId" params={{ coinId: coin.id }}>{coin.symbol}<ArrowUpRight className="size-2.5" /></Link></Button>)}</div>
    </div>
  </article>;
}