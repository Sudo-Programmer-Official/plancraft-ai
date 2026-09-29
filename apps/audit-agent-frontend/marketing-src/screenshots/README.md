# Landing page screenshots

Drop real product screenshots here, named exactly as below, then run:

    npm run marketing:images

That writes `public/marketing/screenshots/<name>-640|1080.avif|webp`. Until a
file exists, the landing page shows a neutral placeholder in that slot.

| File                | Where it appears          | Capture                                             |
| ------------------- | ------------------------- | --------------------------------------------------- |
| `today.png`         | Hero phone                | Today screen with a few real tasks                  |
| `voice-capture.png` | How it works, step 1      | Voice recorder while listening                      |
| `task-created.png`  | How it works, step 2      | Task created from speech (title, date, time)        |
| `reminder.png`      | How it works, step 3      | Reminder notification (lock screen or banner)       |
| `focus.png`         | Focus Mode band           | Running focus session with the countdown            |
| `ai-action.png`     | AI assistance section     | "Help me" panel on a task (once the feature ships)  |

Portrait phone screenshots at native resolution (for example 1179×2556 from an
iPhone 6.1") work best. How-it-works cards crop to the top 4:3 of the image, so
keep the important UI near the top of those three.
