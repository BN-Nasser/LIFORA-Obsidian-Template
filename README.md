# LIFORA Obsidian Template

> A premium, visual productivity vault template for Obsidian.

![LIFORA dashboard](06%20Templates/Images/DashboardBanner.gif)

LIFORA turns Obsidian into a calm personal operating system for planning, learning, reflection, and long-term progress. It combines a polished workspace, reusable templates, rich daily covers, optional course tracking, goals, books, Quran, languages, and a focused writing studio.

## What You Get

- A premium LIFORA home dashboard with daily visual identity.
- Daily, weekly, monthly, quarterly, and yearly planning templates.
- Optional course progress tracking with topics and subtopics.
- Goals and milestones with target-based or milestone-based progress.
- Books, Quran, language learning, notes, and daily planner workspaces.
- Appearance Studio with light and dark premium themes.
- Writing Studio tools for tables, links, code, templates, Canvas, and drawings.
- Responsive folder and file explorers with search, sorting, and visual cards.
- Portable template structure that keeps user data separate from the shipped experience.

![Weekday visual identity](06%20Templates/Images/Daily%20Notes/MondayBanner.avif)

## Requirements

- [Obsidian](https://obsidian.md/) desktop or mobile.
- Community Plugins enabled in Obsidian.
- Recommended: Templater, Dataview, Meta Bind, TaskNotes, QuickAdd, Tasks, Metadata Menu, and Omnisearch.

LIFORA does not include third-party plugin source code. Install community plugins from Obsidian or use the included setup scripts.

## Installation

1. Download or clone this repository.
2. Open the repository folder as a new Obsidian vault.
3. Open **Settings → Community plugins** and enable the plugins requested by the vault.
4. Enable the included CSS snippets in **Settings → Appearance → CSS snippets**.
5. Run **Reload app without saving** from the command palette.
6. Open **LIFORA Home** from the `00 Dashboard` folder.

For Windows, the repository includes `LIFORA Plugins Setup.cmd` and `Tools/LIFORA-Install-Plugins.ps1`. Review scripts before running them and install only the plugins you want.

## First Steps

- Open **Appearance Studio** and choose a visual theme.
- Use **New Course** to create a course. Progress tracking is opt-in.
- Open **Goals & Milestones** and create a goal with milestones or a target.
- Use the daily template to start a journal entry with the weekday cover.
- Keep your personal notes and attachments in your own vault folders.

## Privacy By Design

This public template contains no personal journal, course, book, goal, attachment, or portable `data` directory. New user data is ignored by `.gitignore` so it is not accidentally committed to GitHub.

## Visual Assets

The included banners are part of the template's visual system. Review `06 Templates/Images/Image Credits.md` for asset attribution and licensing notes before redistributing media separately from this repository.

## Project Structure

```text
00 Dashboard/       LIFORA home and section entry points
06 Templates/       Daily, review, course, goal, and writing templates
07 Notes/           Knowledge workspace entry point
08 Courses/         Course workspace entry point
09 Books/           Books workspace entry point
10 Quran/           Quran workspace entry point
11 Languages/       Language workspace entry point
12 Goals/           Goals workspace entry point
13 Daily Planner/   Planning workspace entry point
.obsidian/          LIFORA plugin, CSS, theme, and vault configuration
```

## License

LIFORA template code and configuration are released under the MIT License. Third-party plugins, fonts, and media retain their respective licenses. See `LICENSE` and `06 Templates/Images/Image Credits.md`.

## Credits

Built for Obsidian users who want a beautiful workspace without giving up plain Markdown ownership. Inspired by visual journaling, thoughtful planning, and quiet interfaces.
