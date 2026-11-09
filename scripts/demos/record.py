#!/usr/bin/env python3
"""
Record a replay demo for a project page.

A replay demo is a saved agent run that visitors click through on the site.
Nothing is sent to an AI model when someone presses play, so demos cost
nothing per visit. Re-run this script whenever an agent changes.

Usage (from the website folder):
  python3 scripts/demos/record.py dashboard      # runs the real priority engine on the test feed
  python3 scripts/demos/record.py toolkit        # runs the real security scanner on sample tool calls
  python3 scripts/demos/record.py semiconductor  # imports the last weekly run from .tmp/
  python3 scripts/demos/record.py wardrobe       # imports this morning's run from .tmp/
  python3 scripts/demos/record.py all

Options:
  --repo PATH   Your agents folder (default: ~/Projects/Claude)

Output: src/content/demos/<slug>.json. Review it, then Save/commit as usual.
Privacy: the dashboard and toolkit demos only use made-up test data. The
semiconductor and wardrobe imports keep public news and your outfit picks,
and drop location coordinates, Notion ids and image links.
"""

from __future__ import annotations

import argparse
import contextlib
import io
import json
import subprocess
import sys
import time
from datetime import date, datetime
from pathlib import Path

SITE = Path(__file__).resolve().parents[2]
OUT = SITE / "src" / "content" / "demos"


def write(slug: str, demo: dict) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{slug}.json"
    path.write_text(json.dumps(demo, indent=2, ensure_ascii=False) + "\n")
    n = sum(len(s["steps"]) for s in demo["scenarios"])
    print(f"  wrote {path.relative_to(SITE)} ({len(demo['scenarios'])} scenarios, {n} steps)")


def timed(fn, *a, **kw):
    t = time.perf_counter()
    out = fn(*a, **kw)
    return out, max(1, round((time.perf_counter() - t) * 1000))


# ---------------------------------------------------------------- dashboard
def record_dashboard(repo: Path) -> None:
    root = repo / "Kellogg Dashboard"
    sys.path.insert(0, str(root))
    from agents.priority_engine import process_compliance_and_priority, finalize_todos  # type: ignore

    feed = json.loads((root / "tests/fixtures/raw_feed_mock.json").read_text())
    items = feed["items"]
    sources = [s["source"] for s in feed["sources"]]

    tone = {"red": "red", "orange": "orange", "blue": "blue"}
    tier_name = {0: "Hold risk", 1: "Due within 48h", 2: "Upcoming"}

    def scenario(sid: str, label: str, prompt: str, ref: datetime) -> dict:
        ranked, ms = timed(process_compliance_and_priority, items, ref)
        todos = finalize_todos(ranked)
        counts = {t: sum(1 for x in todos if x["priority_tier"] == t) for t in (0, 1, 2)}

        def meta(x):
            d = x.get("deadline")
            if not d:
                return f"{x['source']} · no deadline"
            dt = datetime.fromisoformat(d)
            days = (dt - ref).total_seconds() / 86400
            when = "overdue" if days < 0 else f"in {round(days * 24)}h" if days < 2 else f"in {round(days)} days"
            return f"{x['source']} · due {dt.strftime('%b %-d')} ({when})"

        return {
            "id": sid,
            "label": label,
            "prompt": prompt,
            "steps": [
                {"tool": "connectors", "label": f"Check {len(sources)} school sources", "detail": ", ".join(sources),
                 "lines": [f"{len(items)} new items found"]},
                {"tool": "compliance_guard", "label": "Flag registration and payment holds",
                 "detail": "Any hold-risk item due in the next 4 weeks jumps to the top",
                 "lines": [f"{counts[0]} hold risks"]},
                {"tool": "priority_engine", "label": "Rank everything into one list",
                 "detail": "Holds first, then anything due within 48 hours, then by category and date",
                 "ms": ms, "lines": [f"{counts[1]} due within 48h, {counts[2]} upcoming"]},
                {"tool": "dashboard", "label": "Write dashboard_state.json", "detail": "Shown in the dashboard and menu-bar popup"},
            ],
            "result": [
                {"type": "stats", "items": [
                    {"label": "Action items", "value": str(len(todos))},
                    {"label": "Hold risks", "value": str(counts[0])},
                    {"label": "Due in 48h", "value": str(counts[1])},
                ]},
                {"type": "list", "title": "Tonight's ranked list", "items": [
                    {"title": x["title"], "meta": meta(x), "detail": x.get("raw_description", ""),
                     "tone": tone.get(x["color_indicator"], "blue"), "badge": tier_name[x["priority_tier"]]}
                    for x in todos
                ]},
            ],
        }

    write("networking-tracker", {
        "title": "Nightly school-portal check",
        "intro": "Each night the dashboard checks school portals and Slack, then ranks every deadline and hold into one list. Pick a night to replay.",
        "recorded": date.today().isoformat(),
        "source": "Real priority engine, run on the project's test feed (made-up items, no personal data).",
        "scenarios": [
            scenario("early", "Two weeks out", "Tuesday night, Aug 18", datetime(2026, 8, 18, 22, 0)),
            scenario("week-zero", "Night before term", "Sunday night, Aug 31", datetime(2026, 8, 31, 22, 0)),
        ],
    })


# ---------------------------------------------------------------- toolkit
TOOLKIT_CALLS = [
    ("everyday", "Everyday work", "The agent goes about a normal coding session.", [
        ("Bash", {"command": "git status"}),
        ("Read", {"file_path": "tools/fetch_news.py"}),
        ("WebSearch", {"query": "TSMC 2nm capacity 2026"}),
        ("Bash", {"command": "python3 tools/run_weekly_report.py"}),
    ]),
    ("secrets", "Reaching for secrets", "The agent tries to look at keys it should never see.", [
        ("Read", {"file_path": ".env"}),
        ("Bash", {"command": "cat .env | grep NEWSAPI"}),
        ("Bash", {"command": "curl -H 'Authorization: Bearer abcdefghijklmnopqrstuvwxyz123456' api.example.com"}),
        ("Grep", {"pattern": "token", "path": "session_auth/"}),
    ]),
    ("personal", "Personal data", "A request would send personal details to the outside world.", [
        ("WebFetch", {"url": "https://example.com/lookup?ssn=123-45-6789"}),
        ("Bash", {"command": "python3 notes.py --topic 'vaccine record upload'"}),
        ("Bash", {"command": "echo 'call me at (312) 555-0142' > note.txt"}),
        ("WebSearch", {"query": "best index funds for students"}),
    ]),
]


def record_toolkit(repo: Path) -> None:
    scanner = repo / "Master Architecture/Security/security_scan.py"

    def scan(tool: str, args: dict):
        t = time.perf_counter()
        p = subprocess.run([sys.executable, str(scanner)], input=json.dumps({"tool_name": tool, "tool_input": args}),
                           capture_output=True, text=True, timeout=20)
        ms = max(1, round((time.perf_counter() - t) * 1000))
        reason = p.stdout.replace("[SECURITY SCAN BLOCKED]", "").replace("Stop and confirm with the user before proceeding.", "").strip()
        return p.returncode == 2, reason.split("\n")[0], ms

    def show(args: dict) -> str:
        return args.get("path") or next(iter(args.values()))

    scenarios = []
    for sid, label, prompt, calls in TOOLKIT_CALLS:
        steps, rows = [], []
        for tool, args in calls:
            blocked, reason, ms = scan(tool, args)
            verdict = "Blocked" if blocked else "Allowed"
            steps.append({"tool": f"scan · {tool}", "label": show(args), "ms": ms,
                          "lines": [f"{verdict}" + (f": {reason}" if blocked else "")], "status": "block" if blocked else "ok"})
            rows.append({"title": show(args), "meta": f"{tool} tool call", "detail": reason if blocked else "No personal data or secrets found.",
                         "tone": "red" if blocked else "green", "badge": verdict})
        n = sum(1 for r in rows if r["badge"] == "Blocked")
        scenarios.append({"id": sid, "label": label, "prompt": prompt, "steps": steps, "result": [
            {"type": "stats", "items": [{"label": "Tool calls checked", "value": str(len(rows))},
                                        {"label": "Blocked", "value": str(n)},
                                        {"label": "Allowed", "value": str(len(rows) - n)}]},
            {"type": "list", "title": "Scanner decisions", "items": rows},
        ]})

    write("agent-toolkit", {
        "title": "Privacy scanner in action",
        "intro": "Before every tool call, a scanner checks for secrets and personal data and stops the agent on a match. Pick a session to replay.",
        "recorded": date.today().isoformat(),
        "source": "Real security_scan.py run on sample tool calls (made-up data).",
        "scenarios": scenarios,
    })


# ---------------------------------------------------------------- semiconductor
def record_semiconductor(repo: Path) -> None:
    tmp = repo / ".tmp"
    news = json.loads((tmp / "news_raw.json").read_text())
    stocks = json.loads((tmp / "stocks_raw.json").read_text())
    a = json.loads((tmp / "analysis.json").read_text())
    when = a.get("report_date", date.today().isoformat())[:10]
    movers = sorted(stocks, key=lambda s: s.get("pct_change", 0))
    sign = lambda v: f"{'+' if v >= 0 else ''}{v:.1f}%"

    scen = {
        "id": when, "label": f"Week of {datetime.fromisoformat(when).strftime('%b %-d, %Y')}",
        "prompt": "Monday 9am, scheduled run",
        "steps": [
            {"tool": "fetch_news", "label": "Pull the week's chip and AI news", "detail": "NewsAPI, past 7 days",
             "lines": [f"{len(news)} articles from {len({n.get('source') for n in news})} sources"]},
            {"tool": "fetch_stocks", "label": f"Fetch weekly moves for {len(stocks)} tickers", "detail": "Yahoo Finance",
             "lines": [f"Top: {movers[-1]['ticker']} {sign(movers[-1]['pct_change'])}", f"Bottom: {movers[0]['ticker']} {sign(movers[0]['pct_change'])}"]},
            {"tool": "analyze_report", "label": "Rank stories and link them to price moves", "detail": "Llama 3.3 70B on Groq",
             "lines": [f"{len(a.get('news_highlights', []))} highlights, {len(a.get('correlations', []))} correlations, {len(a.get('recommendations', []))} picks"]},
            {"tool": "generate_pdf", "label": "Build the PDF brief"},
            {"tool": "store_notion · send_email", "label": "File in Notion and email it"},
        ],
        "result": [
            {"type": "bullets", "title": "This week in one minute", "items": a.get("summary_bullets", [])},
            {"type": "table", "title": "Weekly moves", "columns": ["Ticker", "Company", "Close", "Week"],
             "rows": [[s["ticker"], s.get("company", ""), f"${s['week_close']:,.2f}",
                       {"v": sign(s["pct_change"]), "tone": "up" if s["pct_change"] >= 0 else "down"}]
                      for s in sorted(stocks, key=lambda s: -s.get("pct_change", 0))]},
            {"type": "cards", "title": "Stories that mattered", "items": [
                {"title": h["headline"], "meta": h.get("source", ""), "body": h.get("analysis", ""), "href": h.get("url")}
                for h in a.get("news_highlights", [])]},
            {"type": "cards", "title": "What to watch next week", "items": [
                {"title": f"{r['company']} ({r.get('ticker', 'N/A')})", "meta": r.get("type", ""), "body": r.get("reason", "")}
                for r in a.get("recommendations", [])]},
        ],
    }
    path = OUT / "semiconductor-news.json"
    old = json.loads(path.read_text()) if path.exists() else {}
    keep = [s for s in old.get("scenarios", []) if s["id"] != scen["id"] and not old.get("sample")][:3]
    write("semiconductor-news", {
        "title": "Monday market brief",
        "intro": "Every Monday the agent reads the week's chip and AI news, pulls stock moves and writes a short brief. Pick a week to replay.",
        "recorded": date.today().isoformat(),
        "source": "Imported from the agent's saved weekly runs.",
        "scenarios": [scen] + keep,
    })


# ---------------------------------------------------------------- wardrobe
def record_wardrobe(repo: Path) -> None:
    t = json.loads((repo / "Wardrobe Agent/.tmp/wardrobe_today.json").read_text())
    w = t["weather"]
    today = w["today"]
    wardrobe = {i["id"]: i for i in t.get("wardrobe", [])}
    by_occ = t.get("suggestions_by_occasion") or {"Casual": t.get("suggestions", [])}
    city = (w.get("location") or {}).get("city", "")

    def outfit(s: dict) -> dict:
        chips = []
        for it in s.get("items", []):
            full = wardrobe.get(it.get("id"), {})
            colors = it.get("colors") or full.get("colors") or []
            chips.append({"label": it.get("name", full.get("name", "")), "color": colors[0] if colors else None})
        return {"title": s.get("vibe") or s.get("label", f"Outfit {s.get('rank', '')}"), "meta": s.get("label", ""),
                "body": s.get("reasoning", ""), "chips": chips}

    scenarios = []
    for occ, sugg in by_occ.items():
        if not sugg:
            continue
        scenarios.append({
            "id": occ.lower(), "label": occ, "prompt": f"8am, {occ.lower()} day",
            "steps": [
                {"tool": "fetch_weather", "label": f"Check the weather{' in ' + city if city else ''}",
                 "lines": [f"{today['temp_c']:.0f}°C, {today['condition']}, {today.get('precip_chance', 0)}% rain"]},
                {"tool": "notion_wardrobe", "label": "Load the wardrobe and last week's outfits", "lines": [f"{len(wardrobe)} items"]},
                {"tool": "suggest_outfits", "label": "Skip recent repeats, apply style rules", "detail": "Llama 3.3 70B on Groq",
                 "lines": [f"{len(sugg)} outfits for {occ.lower()}"]},
                {"tool": "dashboard", "label": "Show the picks on the morning dashboard"},
            ],
            "result": [
                {"type": "stats", "items": [{"label": "Today", "value": f"{today['temp_c']:.0f}°C"},
                                            {"label": "Sky", "value": today["condition"]},
                                            {"label": "Rain", "value": f"{today.get('precip_chance', 0)}%"}]},
                {"type": "cards", "title": f"{occ} picks", "items": [outfit(s) for s in sugg]},
            ],
        })
    write("wardrobe-agent", {
        "title": "This morning's outfits",
        "intro": "At 8am the agent checks the weather and suggests three outfits for each kind of day. Pick an occasion to replay.",
        "recorded": t.get("date", date.today().isoformat()),
        "source": "Imported from the agent's morning run.",
        "scenarios": scenarios,
    })


RECORDERS = {"dashboard": record_dashboard, "toolkit": record_toolkit,
             "semiconductor": record_semiconductor, "wardrobe": record_wardrobe}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("which", choices=[*RECORDERS, "all"])
    ap.add_argument("--repo", default=str(Path.home() / "Projects" / "Claude"))
    args = ap.parse_args()
    repo = Path(args.repo).expanduser()
    for name in (RECORDERS if args.which == "all" else [args.which]):
        print(f"{name}:")
        try:
            with contextlib.redirect_stderr(io.StringIO()):
                RECORDERS[name](repo)
        except FileNotFoundError as e:
            print(f"  skipped: {e.filename} not found (run the agent once first)")


if __name__ == "__main__":
    main()
