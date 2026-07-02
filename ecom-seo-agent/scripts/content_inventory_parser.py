#!/usr/bin/env python3
"""Build a structured content inventory (Markdown) from a crawled-site CSV export.

Supports both the minimal legacy format (url,page_type,title,meta_description,
h1,word_count,target_keyword) and the extended crawler export format documented
in docs/11_CRAWLER_EXPORT_GUIDE.md (adds status_code, indexability, canonical,
robots_meta, h1_count, title_length, meta_description_length, h2, inlinks,
outlinks). Technical columns are optional - if absent, the related checks are
simply skipped.
"""

import argparse
import csv
import sys
from collections import Counter

REQUIRED_COLUMNS = ["url", "title", "meta_description", "h1", "word_count"]
OPTIONAL_COLUMNS = [
    "page_type", "target_keyword", "search_intent", "internal_links_out",
    "status_code", "indexability", "canonical", "robots_meta", "h1_count",
    "title_length", "meta_description_length", "h2", "inlinks", "outlinks",
]

# Kept intentionally short here; the authoritative list lives in
# docs/02_SEO_RULES_AND_COMPLIANCE.md. This is only a fast local heuristic.
RED_FLAG_TERMS = ["מובטח", "הבטחה", "הבטחת עבודה", "הבטחת השמה", "שכר מובטח", "תעבדו בוודאות"]

THIN_CONTENT_WORD_THRESHOLD = 300
OK_STATUS_CODES = ("", "200")


def load_rows(path):
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        missing = [c for c in REQUIRED_COLUMNS if c not in reader.fieldnames]
        if missing:
            sys.exit(f"Missing required columns in {path}: {', '.join(missing)}")
        return list(reader), reader.fieldnames


def compliance_risk(row):
    text = " ".join([row.get("title", ""), row.get("meta_description", ""), row.get("h1", "")])
    hits = [term for term in RED_FLAG_TERMS if term in text]
    return "גבוה" if hits else "נמוך"


def is_ok_status(row):
    return row.get("status_code", "").strip() in OK_STATUS_CODES


def technical_issues(row, fieldnames, title_counts, meta_counts):
    issues = []
    status = row.get("status_code", "").strip()
    if status and status not in ("200",):
        if status.startswith("3"):
            issues.append(f"הפניה (status {status})")
        elif status == "404":
            issues.append("404 - עמוד לא נמצא")
        elif status.startswith("5"):
            issues.append(f"שגיאת שרת (status {status})")
        else:
            issues.append(f"status code לא סטנדרטי ({status})")

    indexability = row.get("indexability", "").strip().lower()
    robots_meta = row.get("robots_meta", "").strip().lower()
    if "non-indexable" in indexability or "noindex" in robots_meta:
        issues.append("לא ניתן לאינדוקס (noindex / non-indexable)")

    if is_ok_status(row):
        h1_count_raw = row.get("h1_count", "").strip()
        if h1_count_raw:
            try:
                h1_count = int(h1_count_raw)
                if h1_count == 0:
                    issues.append("H1 חסר")
                elif h1_count > 1:
                    issues.append("H1 כפול")
            except ValueError:
                pass
        elif not row.get("h1", "").strip():
            issues.append("H1 חסר")

        if "canonical" in fieldnames and not row.get("canonical", "").strip():
            issues.append("Canonical חסר")

    title = row.get("title", "").strip()
    if title and title_counts[title] > 1:
        issues.append("Title כפול")

    meta = row.get("meta_description", "").strip()
    if meta and meta_counts[meta] > 1:
        issues.append("Meta Description כפול")

    return issues


def quality_score(row, title_counts):
    score = 5
    try:
        word_count = int(row.get("word_count") or 0)
    except ValueError:
        word_count = 0
    if is_ok_status(row) and word_count < THIN_CONTENT_WORD_THRESHOLD:
        score -= 2
    if is_ok_status(row) and not row.get("meta_description", "").strip():
        score -= 1
    if is_ok_status(row) and not row.get("h1", "").strip():
        score -= 1
    title = row.get("title", "").strip()
    if title and title_counts[title] > 1:
        score -= 1
    return max(score, 1)


def recommended_action(row, title_counts, issues):
    if any(i.startswith("404") for i in issues):
        return "תקן קישורים / שקול הפניה 301"
    if any(i.startswith("הפניה") for i in issues):
        return "בדוק שרשרת הפניות"
    if any("noindex" in i or "non-indexable" in i for i in issues):
        return "ודא שה-noindex מכוון (אחרת תקן)"
    title = row.get("title", "").strip()
    if title and title_counts[title] > 1:
        return "מזג / הפנה (כותרת כפולה)"
    try:
        word_count = int(row.get("word_count") or 0)
    except ValueError:
        word_count = 0
    if is_ok_status(row) and word_count < THIN_CONTENT_WORD_THRESHOLD:
        return "הרחב (תוכן דל)"
    if is_ok_status(row) and (not row.get("meta_description", "").strip() or not row.get("h1", "").strip()):
        return "עדכן (שדות חסרים)"
    return "השאר"


def build_inventory(rows, fieldnames):
    title_counts = Counter(r.get("title", "").strip() for r in rows if r.get("title", "").strip())
    meta_counts = Counter(r.get("meta_description", "").strip() for r in rows if r.get("meta_description", "").strip())

    out = []
    for row in rows:
        issues = technical_issues(row, fieldnames, title_counts, meta_counts)
        out.append({
            "url": row.get("url", ""),
            "page_type": row.get("page_type", "") or "לא סווג",
            "target_keyword": row.get("target_keyword", "") or "לא הוגדר",
            "search_intent": row.get("search_intent", ""),
            "title": row.get("title", ""),
            "meta_description": row.get("meta_description", ""),
            "h1": row.get("h1", ""),
            "internal_links_out": row.get("internal_links_out", ""),
            "quality_score": quality_score(row, title_counts),
            "compliance_risk": compliance_risk(row),
            "technical_issues": "; ".join(issues) if issues else "-",
            "recommended_action": recommended_action(row, title_counts, issues),
        })
    return out


def escape_md_cell(value):
    return str(value).replace("|", "\\|").replace("\n", " ").strip()


def to_markdown(inventory):
    header = ("| URL | סוג עמוד | מילת מפתח יעד | כוונת חיפוש | כותרת | Meta Description | H1 | "
              "ציון איכות | סיכון ציות | בעיות טכניות | פעולה מומלצת |")
    sep = "|---|---|---|---|---|---|---|---|---|---|---|"
    lines = [header, sep]
    for r in inventory:
        cells = [
            r["url"], r["page_type"], r["target_keyword"], r["search_intent"],
            r["title"], r["meta_description"], r["h1"], r["quality_score"],
            r["compliance_risk"], r["technical_issues"], r["recommended_action"],
        ]
        lines.append("| " + " | ".join(escape_md_cell(c) for c in cells) + " |")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input", help="CSV export of crawled site pages")
    parser.add_argument("-o", "--output", help="Output Markdown file (default: stdout)")
    args = parser.parse_args()

    rows, fieldnames = load_rows(args.input)
    inventory = build_inventory(rows, fieldnames)
    markdown = to_markdown(inventory)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(markdown + "\n")
        print(f"Wrote inventory for {len(inventory)} pages to {args.output}")
    else:
        print(markdown)


if __name__ == "__main__":
    main()
