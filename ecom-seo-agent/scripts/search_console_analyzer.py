#!/usr/bin/env python3
"""Analyze Google Search Console CSV exports (Queries or Pages tabs, or a
query+page dimensioned export) into actionable SEO reports.

Expected CSV headers (as exported by the GSC UI):
    Query or Page columns, plus: Clicks, Impressions, CTR, Position
A combined export (query,page,clicks,impressions,ctr,position) is required
for the cannibalization report.
"""

import argparse
import csv
import sys

CLICKS_KEYS = ["Clicks", "clicks"]
IMPRESSIONS_KEYS = ["Impressions", "impressions"]
CTR_KEYS = ["CTR", "ctr"]
POSITION_KEYS = ["Position", "position"]
QUERY_KEYS = ["Top queries", "Query", "query"]
PAGE_KEYS = ["Top pages", "Page", "page"]


def first_present(row, keys):
    for k in keys:
        if k in row:
            return row[k]
    return None


def parse_number(value):
    if value is None:
        return 0.0
    value = value.strip().replace(",", "")
    if value.endswith("%"):
        return float(value[:-1]) / 100.0
    try:
        return float(value)
    except ValueError:
        return 0.0


def load_gsc_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = []
        for raw in reader:
            rows.append({
                "query": first_present(raw, QUERY_KEYS) or "",
                "page": first_present(raw, PAGE_KEYS) or "",
                "clicks": parse_number(first_present(raw, CLICKS_KEYS)),
                "impressions": parse_number(first_present(raw, IMPRESSIONS_KEYS)),
                "ctr": parse_number(first_present(raw, CTR_KEYS)),
                "position": parse_number(first_present(raw, POSITION_KEYS)),
            })
        return rows


def report_high_impressions_low_ctr(rows, min_impressions=500, max_ctr=0.02):
    hits = [r for r in rows if r["impressions"] >= min_impressions and r["ctr"] <= max_ctr]
    return sorted(hits, key=lambda r: -r["impressions"])


def report_near_page_one(rows, min_pos=11, max_pos=20):
    hits = [r for r in rows if min_pos <= r["position"] <= max_pos]
    return sorted(hits, key=lambda r: r["position"])


def report_losing_traffic(current_rows, previous_rows, key="page"):
    prev_by_key = {}
    for r in previous_rows:
        prev_by_key[r[key]] = prev_by_key.get(r[key], 0) + r["clicks"]

    curr_by_key = {}
    for r in current_rows:
        curr_by_key[r[key]] = curr_by_key.get(r[key], 0) + r["clicks"]

    losses = []
    for k, prev_clicks in prev_by_key.items():
        curr_clicks = curr_by_key.get(k, 0)
        if prev_clicks > 0 and curr_clicks < prev_clicks:
            change_pct = ((curr_clicks - prev_clicks) / prev_clicks) * 100
            losses.append({key: k, "prev_clicks": prev_clicks, "curr_clicks": curr_clicks, "change_pct": change_pct})
    return sorted(losses, key=lambda r: r["change_pct"])


def report_cannibalization(rows, min_impressions=10):
    by_query = {}
    for r in rows:
        if not r["query"] or not r["page"]:
            continue
        by_query.setdefault(r["query"], set()).add(r["page"])

    return {
        q: sorted(pages)
        for q, pages in by_query.items()
        if len(pages) > 1
    }


def print_table(rows, columns):
    if not rows:
        print("(אין ממצאים)")
        return
    header = " | ".join(columns)
    print(header)
    print("-" * len(header))
    for r in rows:
        print(" | ".join(str(r.get(c, "")) for c in columns))


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input", help="GSC CSV export (current period)")
    parser.add_argument("--previous", help="GSC CSV export (previous period), required for --mode losing-traffic")
    parser.add_argument("--mode", required=True,
                         choices=["low-ctr", "near-page-one", "losing-traffic", "cannibalization"])
    parser.add_argument("--min-impressions", type=int, default=500)
    parser.add_argument("--max-ctr", type=float, default=0.02)
    parser.add_argument("--min-pos", type=float, default=11)
    parser.add_argument("--max-pos", type=float, default=20)
    args = parser.parse_args()

    rows = load_gsc_csv(args.input)

    if args.mode == "low-ctr":
        hits = report_high_impressions_low_ctr(rows, args.min_impressions, args.max_ctr)
        print_table(hits, ["query", "page", "impressions", "ctr", "position"])
    elif args.mode == "near-page-one":
        hits = report_near_page_one(rows, args.min_pos, args.max_pos)
        print_table(hits, ["query", "page", "position", "clicks", "impressions"])
    elif args.mode == "losing-traffic":
        if not args.previous:
            sys.exit("--previous is required for --mode losing-traffic")
        previous_rows = load_gsc_csv(args.previous)
        key = "page" if any(r["page"] for r in rows) else "query"
        hits = report_losing_traffic(rows, previous_rows, key=key)
        print_table(hits, [key, "prev_clicks", "curr_clicks", "change_pct"])
    elif args.mode == "cannibalization":
        alerts = report_cannibalization(rows)
        if not alerts:
            print("(לא נמצאה קניבליזציה - ודאו שהקובץ כולל גם עמודת query וגם עמודת page)")
        for query, pages in alerts.items():
            print(f"'{query}': {len(pages)} עמודים מתחרים -> {', '.join(pages)}")


if __name__ == "__main__":
    main()
