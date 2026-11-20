# AI Translation Setup – Gemini Free Tier

## 1. Get a Gemini API Key

1. Go to https://aistudio.google.com
2. Sign in with your Google account
3. Click **Get API Key**
4. Create an API key (free tier is automatic)
5. Copy the key to `GEMINI_API_KEY` in backend env

## 2. Model Selection

Use `gemini-1.5-flash` (free tier):
- Fast inference
- Large context window
- Free within daily limits (1,500 requests/day, 15 RPM)

Do NOT use `gemini-1.5-pro` or `gemini-2.0` on free tier without verifying pricing.

## 3. Translation Request Design

Each translation request sends only:
- The selected English word or phrase
- The sentence containing it
- Up to 2 surrounding sentences for context
- Target language: Vietnamese

**Never send the entire PDF or book to Gemini.**

## 4. Rate Limit Handling

Backend catches HTTP 429 from Gemini and returns:

```json
{ "error": "quota_exceeded", "message": "Translation quota reached. Please try again later." }
```

Frontend shows a non-blocking toast. Original text is preserved.

## 5. Privacy Notice

The UI displays a notice: *"The selected text and surrounding context are sent to Google Gemini AI for translation."*

This notice is shown:
- On first use (acknowledgement stored locally)
- In the translation popup on each use
