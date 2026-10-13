# Performance budget (mobile, low-end Android, unstable network)

These numbers are enforced by lighthouserc.json in CI, once client exists.

| Measure | Budget | Gate |
|---|---|---|
| Largest Contentful Paint | under 2.5 s | error |
| Cumulative Layout Shift | under 0.1 | error |
| Total Blocking Time (lab proxy for responsiveness) | under 300 ms | error |
| First Contentful Paint | under 1.8 s | warning |
| Performance score | 80 or more | error |
| Accessibility score (WCAG 2.2 AA checks) | 90 or more | error |
| SEO score | 90 or more | error |
| First-load JavaScript (gzip) | under 170 KB | set when client exists |

Notes
- Interaction to Next Paint is a field measure. Total Blocking Time is the lab proxy. Check real INP in Search Console and the field data after launch.
- The bundle budget is set once the web app has real code. A number chosen now would be guesswork.
- Lab tests use a simulated mid-range phone and slow 4G. Real devices will differ. Test on at least one real low-end Android before launch.
