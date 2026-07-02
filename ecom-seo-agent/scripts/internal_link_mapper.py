#!/usr/bin/env python3
"""Suggest internal links from blog/article pages toward priority pages (e.g. course pages)."""

import argparse
import csv
import sys
from collections import defaultdict

REQUIRED_COLUMNS = ["url", "page_type", "main_topic", "target_keyword"]
OPTIONAL_COLUMNS = ["current_internal_links"]  # semicolon-separated URLs
PRIORITY_PAGE_TYPES = {"course"}
MIN_INBOUND_LINKS = 3


def load_rows(path):
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        missing = [c for c in REQUIRED_COLUMNS if c not in reader.fieldnames]
        if missing:
            sys.exit(f"Missing required columns in {path}: {', '.join(missing)}")
        return list(reader)


def parse_links(row):
    raw = row.get("current_internal_links", "") or ""
    return {u.strip() for u in raw.split(";") if u.strip()}


def topic_overlap(a, b):
    words_a = set(a.strip().split())
    words_b = set(b.strip().split())
    return bool(words_a & words_b)


def suggest_links(rows):
    priority_pages = [r for r in rows if r.get("page_type", "").strip() in PRIORITY_PAGE_TYPES]
    other_pages = [r for r in rows if r.get("page_type", "").strip() not in PRIORITY_PAGE_TYPES]

    inbound_count = defaultdict(int)
    for row in rows:
        for link in parse_links(row):
            inbound_count[link] += 1

    suggestions = []
    for source in other_pages:
        source_links = parse_links(source)
        for target in priority_pages:
            if target["url"] in source_links:
                continue
            if topic_overlap(source.get("main_topic", ""), target.get("main_topic", "")) or \
               topic_overlap(source.get("target_keyword", ""), target.get("target_keyword", "")):
                suggestions.append({
                    "source": source["url"],
                    "target": target["url"],
                    "anchor_text": target.get("target_keyword", "").strip(),
                })

    underlinked = [
        {"url": p["url"], "inbound_links": inbound_count.get(p["url"], 0)}
        for p in priority_pages
        if inbound_count.get(p["url"], 0) < MIN_INBOUND_LINKS
    ]
    return suggestions, underlinked


def escape_md_cell(value):
    return str(value).replace("|", "\\|").replace("\n", " ").strip()


def to_markdown(suggestions, underlinked):
    lines = ["# הצעות קישור פנימי", ""]
    lines.append("## קישורים מוצעים")
    lines.append("| מ-URL | אל URL (עמוד עדיפות) | אנקור טקסט מוצע |")
    lines.append("|---|---|---|")
    for s in suggestions:
        cells = [s["source"], s["target"], s["anchor_text"]]
        lines.append("| " + " | ".join(escape_md_cell(c) for c in cells) + " |")

    lines.append("")
    lines.append("## עמודי עדיפות עם מעט קישורים נכנסים (מתחת לסף)")
    lines.append("| URL | קישורים נכנסים ידועים |")
    lines.append("|---|---|")
    for u in underlinked:
        cells = [u["url"], u["inbound_links"]]
        lines.append("| " + " | ".join(escape_md_cell(c) for c in cells) + " |")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", help="Content inventory CSV: url,page_type,main_topic,target_keyword[,current_internal_links]")
    parser.add_argument("-o", "--output", help="Output Markdown file (default: stdout)")
    args = parser.parse_args()

    rows = load_rows(args.input)
    suggestions, underlinked = suggest_links(rows)
    markdown = to_markdown(suggestions, underlinked)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(markdown + "\n")
        print(f"Wrote {len(suggestions)} link suggestions to {args.output}")
    else:
        print(markdown)


if __name__ == "__main__":
    main()
