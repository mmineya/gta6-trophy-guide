# Leonida Atlas

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/mmineya/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/mmineya/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

An offline guide and checklist for the 55 GTA VI trophies on PS5, built for the [make.fun bounty](https://make.fun/bounty/gta6-trophy-guide-01). Track progress, hide story spoilers, and plan a route to platinum. The missable watchlist covers trophies whose replay or repeat availability is unverified.

Open `app/index.html` in Chrome, or run `node serve.ts` with Node 22.18+ and visit http://localhost:8080. Use Export progress to back up your checklist before moving devices.

After editing `app/data/trophies.json`, update the local browser copy with:

```sh
node -e "require('node:fs').writeFileSync('app/data/catalog.js', 'window.trophyCatalog = ' + JSON.stringify(require('./app/data/trophies.json')) + ';\n')"
```

Run `MAKEFUN_OUTPUT_DIR=out node main.ts` to build the submission dossier.
