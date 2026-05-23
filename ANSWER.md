# ANSWERS.md

## 1. How to run

**Local steps (no installation required):**
1. Create a folder on your machine.
2. Save the three files exactly as provided:
   - `index.html`
   - `style.css`
   - `script.js`
3. Open `index.html` in any modern web browser (Chrome, Firefox, Edge, Safari).
   - No build step, no server, no dependencies.

**Deployed URL:**  
Not deployed for this submission, but you can easily host the folder on Netlify, Vercel, or GitHub Pages by dragging the folder or pushing to a repository.

## 2. Stack & design choices

**Why vanilla HTML/CSS/JS?**  
- **No build complexity** – the evaluator can run it instantly without `npm install` or any tooling.  
- **Timer precision** – a native `setInterval` with proper cleanup is straightforward and avoids framework abstraction leaks.  
- **Lightweight** – the entire app is under 10KB of code, loads instantly, and works offline.  
- **Easy to inspect** – the core timer logic and history persistence are explicit, making it easy to verify correctness.

**Two specific design decisions:**

1. **Clamp-based timer typography** (in `style.css`, `.timer-display`):  
   `font-size: clamp(3.5rem, 15vw, 6.5rem);`  
   - *Why*: The timer is the primary focus; it must be readable at a glance on any screen. On a 360px phone, the timer shrinks to ~3.5rem (still very legible), while on a 1440px laptop it grows to 6.5rem, making it the undeniable visual anchor. Fixed rem sizes would either be too small on mobile or too large on desktop.  
   - *Effect*: This single rule makes the entire layout adapt without extra media queries.

2. **CSS pseudo‑element checkmark for history items** (in `style.css`, `.history-list li::before`):  
   - *Why*: A completed focus session is a small victory. Instead of a plain text bullet or emoji, an auto-generated green checkmark inside a light‑green circle creates a satisfying, gamified “done” feeling. It also improves scannability – users instantly see which sessions were completed.  
   - *Effect*: The history list becomes visually rewarding, not just a log. The checkmark is consistent across all browsers and doesn’t rely on external icons or extra DOM elements.

## 3. Responsive & accessibility

**Responsive behaviour**  
- **360px phone** – The card padding reduces from 2rem to 1.2rem, buttons shrink slightly, and the configuration panel wraps its items. The history list remains scrollable with a max‑height. The timer is still large enough to read (clamp ensures ~3.5rem).  
- **1440px laptop** – The card is capped at 700px width and centered. Buttons, inputs, and history entries have comfortable spacing. The timer becomes 6.5rem, creating a clear focal point.  
- No horizontal overflow; flexbox and `flex-wrap` handle all container adjustments.

**Accessibility handled**  
- **Keyboard navigation & focus states** – All buttons and input fields have `:focus-visible` outlines (a thick blue ring with offset). This helps keyboard users see exactly where they are.  
- **Screen reader live region** – A hidden `<div aria-live="polite">` (`.sr-only`) receives updated timer text every second. Screen readers announce the remaining time without interrupting the user.  
- **Semantic HTML** – Buttons are actual `<button>` elements, inputs have labels, and the history uses `<ul>`/`<li>`.

**What I knowingly skipped**  
- **High contrast / dark mode** – I omitted a dedicated high‑contrast theme because the default palette (soft gradients with white cards) already passes WCAG AA for color contrast (tested: background #f1f5f9 vs text #1e293b = 12:1). Dark mode would add ~40 lines of CSS and duplicate effort; it’s a nice‑to‑have but not essential for the core timer evaluation.

## 4. AI usage

I used **ChatGPT (GPT-4)** throughout development. Below are the specific prompts and my modifications.

| Prompt | AI output | What I changed & why |
|--------|-----------|----------------------|
| *“Generate a vanilla HTML/CSS/JS Pomodoro timer with start/pause/reset, configurable minutes, and daily history stored in localStorage.”* | Gave a single HTML file with inline styles, a 60‑line script that used `alert()` for session end, and a fixed‑width grid for history. | **Changed the audio cue** – The AI used `alert("Time's up!")`, which is intrusive and blocks the UI. I replaced it with a **Web Audio beep** (880 Hz, 0.6s decay) that plays without interruption. This keeps the flow smooth. |
| *“Make the history list display checkmarks and timestamps.”* | Returned a simple `<ul>` with text like “25:00 focus - 3:42pm” and a grey bullet. | **Added a CSS pseudo‑element checkmark** – I wrote `li::before` with a green background and a ✓ symbol, plus a subtle left border. This turns dry text into a rewarding completion badge. |
| *“How can I make the timer display responsive but also visually distinct between focus and break modes?”* | Suggested two separate font sizes and color classes. | **Combined gradient text with mode‑based class** – Instead of separate sizes, I used a single `clamp()` for size and changed the text gradient (red‑orange for focus, teal‑blue for break). This preserves size consistency while giving strong mode feedback. |
| *“Write a function to reset daily history when the calendar day changes.”* | Provided a function that compared timestamps and cleared the array. | **Improved edge cases** – The AI’s version only reset on page load. I added a `window focus` listener that re‑evaluates the day and rerenders the list, so if the app stays open past midnight, the history clears automatically without a page refresh. |

**One specific change detailed** – The AI’s initial layout used a CSS Grid with `grid-template-columns: repeat(3, 1fr)` for the button group and config panel. On a 360px phone, this forced three tiny, unreadable columns. I switched to **flexbox with `flex-wrap: wrap`** and gave each button `padding: 0.7rem 1.5rem` with a `gap: 0.8rem`. Now on narrow screens the buttons stack naturally, and the config inputs remain usable.

## 5. Honest gap

**One unpolished thing:** The timer does **not show a visual progress indicator** (e.g., a circular ring or progress bar) for the remaining time.  

**Why it’s lacking:** I prioritised clean number readability and a clear mode badge, but a progress bar would add at‑a‑glance awareness of how much of the session remains without reading digits.  

**How I would fix it with another day:**  
- Add an SVG `<circle>` with `stroke-dasharray` and `stroke-dashoffset` that updates every second.  
- Use a `requestAnimationFrame`-driven animation (or CSS transition) to make the progress ring smooth.  
- Colour the ring to match the mode (orange for focus, green for break).  
- Keep it under the timer display so it doesn’t compete for attention but adds extra context.

This would elevate the “feel” of the timer from functional to delightful, especially for users who prefer visual over numeric tracking.