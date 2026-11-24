---
cssclasses:
  - timegarden-reviews-home
  - timegarden-dashboard
tags:
  - reviews
---

# ◷ Reviews Hub

<small>Step back, notice your progress, and decide what deserves your attention next.</small>

> [!tg-grid] Current Review Periods
> > [!tg-weekly] Weekly Review
> > Reflect on the last seven days and prepare the next week.
> > `= link("Journal/02 Weekly/" + dateformat(date(today), "yyyy") + "/" + dateformat(date(today), "yyyy-'W'ww"), "Open this week →")`
>
> > [!tg-monthly] Monthly Review
> > Review your habits, highlights, and progress this month.
> > `= link("03 Monthly/" + dateformat(date(today), "yyyy") + "/" + dateformat(date(today), "yyyy-MM-MMMM"), "Open this month →")`
>
> > [!tg-quarterly] Quarterly Review
> > Evaluate bigger priorities and areas of life.
> > `= link("04 Quarterly/" + dateformat(date(today), "yyyy") + "/" + dateformat(date(today), "yyyy-'Q'Q"), "Open this quarter →")`
>
> > [!tg-yearly] Yearly Review
> > Capture the year's story and lessons.
> > `= link("05 Yearly/" + dateformat(date(today), "yyyy"), "Open this year →")`

## Latest Weekly Reviews

```dataview
TABLE WITHOUT ID file.link AS "Week", date AS "Start", alias AS "Title"
FROM "Journal/02 Weekly"
SORT date DESC
LIMIT 6
```

## Latest Monthly Reviews

```dataview
TABLE WITHOUT ID file.link AS "Month", date AS "Start", alias AS "Title"
FROM "03 Monthly"
SORT date DESC
LIMIT 6
```

> [!info] Existing review system
> The original Journals workflows, templates, AI components, and review notes are preserved. This hub provides navigation and a recent-review overview.
