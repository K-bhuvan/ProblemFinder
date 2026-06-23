# Legal & data use

This document summarizes how Problem Finder uses third-party data and services. It is not legal advice. If you deploy or redistribute this project, review it with your own counsel.

## What this tool does

Problem Finder reads **public** Hacker News discussions, uses OpenAI to classify and cluster pain points, and can email a daily digest. It does not log into Hacker News, post content, or scrape HTML behind authentication.

## Data sources

| Source | Endpoint | Purpose |
|--------|----------|---------|
| HN Search (Algolia) | `https://hn.algolia.com/api/v1/` | Full-text search, date filters |
| HN Firebase API | `https://hacker-news.firebaseio.com/v0/` | Story metadata and comments |

Both APIs are **public read-only** interfaces documented for third-party use:

- [HN Search API](https://hn.algolia.com/api)
- [Official HN API](https://github.com/HackerNews/API)

### Rate limits

Algolia HN Search limits a single IP to about **10,000 requests/hour**. This project defaults to conservative per-run caps (`HN_MAX_REQUESTS_PER_RUN`, request spacing) to stay well under that limit.

### Attribution

When you publish or share findings:

- Link back to the original thread using `https://news.ycombinator.com/item?id=...`
- Credit Hacker News / Y Combinator as the source of the underlying discussions
- Do not imply endorsement by Y Combinator or Hacker News

## User-generated content

HN posts and comments are user-submitted. Problem Finder may quote short snippets and link to originals. You are responsible for:

- Respecting copyright and fair-use norms in your jurisdiction
- Not republishing full comment threads without permission where required
- Following [Hacker News Guidelines](https://news.ycombinator.com/newsguidelines.html) in spirit

## OpenAI

Problem Finder sends post titles, URLs, and text snippets to OpenAI for classification and clustering. Review [OpenAI's terms](https://openai.com/policies/terms-of-use) and [usage policies](https://openai.com/policies/usage-policies). Do not send secrets or personal data you are not allowed to process.

## Email (Resend)

Outbound email is sent via [Resend](https://resend.com). You must:

- Only email recipients who have opted in (or yourself for personal digests)
- Comply with CAN-SPAM, GDPR, and other applicable anti-spam laws
- Use a verified domain for production (sandbox mode only delivers to your Resend signup address)

## Automated analysis disclaimer

LLM output can be wrong. The app includes a disclaimer that findings should be verified against linked sources. Do not treat generated clusters as factual research without human review.

## Privacy

This repository does not include user accounts. If you deploy it:

- Vercel and Resend may process request logs and email metadata under their policies
- Set environment variables in Vercel — never commit `.env.local`
- If you store analytics, disclose that in your own privacy policy

## Prohibited uses

Do not use this project to:

- Harass HN users or send unsolicited bulk email
- Circumvent API blocks or rate limits
- Scrape authenticated or non-public data
- Impersonate Hacker News or Y Combinator

## License

Application code is released under the [MIT License](./LICENSE). Third-party packages retain their own licenses in `node_modules`.
