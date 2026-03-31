#!/usr/bin/env node
/**
 * The Balanced Book — PDF Generator
 *
 * Assembles all page templates into a single print-ready A5 PDF.
 *
 * Book structure (70 sheets, double-sided = 140 PDF pages):
 *   Per month (×2):
 *     - 1 sheet: Monthly front + back
 *     - 4 weeks × (1 weekly sheet + 7 daily sheets)
 *   End matter:
 *     - 1 sheet: Congrats page (front) + blank (back)
 *     - 3 sheets: Blank lined pages (front + back)
 *
 * Usage: node generate-book.js
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// ── Quote vault (60 quotes, one per daily back page — 56 days use 56 of them) ──
const quoteVault = [
  { text: "Almost everything will work again if you unplug it for a few minutes, including you. Take the time to rest and recharge — it is not laziness, it is self-preservation.", author: "Anne Lamott" },
  { text: "The present moment is filled with joy and happiness. If you are attentive, you will see it. Do not chase after your thoughts — instead, learn to watch them come and go like clouds in the sky.", author: "Thich Nhat Hanh" },
  { text: "Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor. When the storm passes, you realize you were always the sky, not the weather.", author: "Thich Nhat Hanh" },
  { text: "Self-care is not self-indulgence, it is self-preservation. That is an act of political warfare. You cannot pour from an empty cup, so fill yours first.", author: "Audre Lorde" },
  { text: "The greatest weapon against stress is our ability to choose one thought over another. In the middle of difficulty lies opportunity, and in the middle of stillness lies strength.", author: "William James" },
  { text: "You don't have to control your thoughts. You just have to stop letting them control you. The mind is a wonderful servant but a terrible master.", author: "Dan Millman" },
  { text: "With the new day comes new strength and new thoughts. Let yourself rest when you are tired, and rise again when you are ready. Every morning is a fresh beginning.", author: "Eleanor Roosevelt" },
  { text: "Happiness is not something ready-made. It comes from your own actions. Small daily improvements over time lead to stunning results — begin where you are.", author: "Dalai Lama" },
  { text: "Be where you are, not where you think you should be. The present moment is the only moment available to us, and it is the door to all moments.", author: "Thich Nhat Hanh" },
  { text: "Calm mind brings inner strength and self-confidence, so that is very important for good health. The root of all health is in the brain, and the root of all healing is in the heart.", author: "Dalai Lama" },
  { text: "Rest when you are weary. Refresh and renew yourself, your body, your mind, your spirit. Then get back to work. The world needs what you have to offer.", author: "Ralph Marston" },
  { text: "Your calm mind is the ultimate weapon against your challenges. Do not underestimate the power of sitting quietly and letting the answers come to you in their own time.", author: "Bryant McGill" },
  { text: "In today's rush, we all think too much, seek too much, want too much, and forget about the joy of just being. Sometimes the most productive thing you can do is relax.", author: "Eckhart Tolle" },
  { text: "The soul always knows what to do to heal itself. The challenge is to silence the mind. Give yourself permission to slow down and listen to the wisdom within.", author: "Caroline Myss" },
  { text: "Breathe. Let go. And remind yourself that this very moment is the only one you know you have for sure. Make it count by being fully present in it.", author: "Oprah Winfrey" },
  { text: "It is not the critic who counts. The credit belongs to the person who is actually in the arena, whose face is marred by dust and sweat and blood, who strives valiantly.", author: "Theodore Roosevelt" },
  { text: "I have learned over the years that when one's mind is made up, this diminishes fear. Knowing what must be done does away with fear. Action is the antidote to despair.", author: "Rosa Parks" },
  { text: "The future belongs to those who believe in the beauty of their dreams. Do not wait for the perfect moment — take the moment and make it perfect.", author: "Eleanor Roosevelt" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts. Every setback is a setup for a comeback if you keep moving forward.", author: "Winston Churchill" },
  { text: "You are never too old to set another goal or to dream a new dream. The best time to plant a tree was twenty years ago. The second best time is now.", author: "C.S. Lewis" },
  { text: "It always seems impossible until it is done. Do not judge each day by the harvest you reap but by the seeds that you plant. Great things take time.", author: "Nelson Mandela" },
  { text: "I can be changed by what happens to me, but I refuse to be reduced by it. There is no greater agony than bearing an untold story inside you — so speak your truth.", author: "Maya Angelou" },
  { text: "We delight in the beauty of the butterfly, but rarely admit the changes it has gone through to achieve that beauty. Growth requires patience and faith in the process.", author: "Maya Angelou" },
  { text: "Do not wait to strike till the iron is hot, but make it hot by striking. The people who get on in this world are the people who look for the circumstances they want, and if they cannot find them, they make them.", author: "George Bernard Shaw" },
  { text: "The only impossible journey is the one you never begin. Have the courage to follow your heart and intuition — they somehow already know what you truly want to become.", author: "Tony Robbins" },
  { text: "You gain strength, courage, and confidence by every experience in which you really stop to look fear in the face. You must do the thing you think you cannot do.", author: "Eleanor Roosevelt" },
  { text: "What lies behind us and what lies before us are tiny matters compared to what lies within us. Trust yourself — you have survived a lot, and you will survive whatever is coming.", author: "Ralph Waldo Emerson" },
  { text: "Life is not about waiting for the storm to pass. It is about learning to dance in the rain. Embrace the challenges, for they are shaping you into who you are meant to be.", author: "Vivian Greene" },
  { text: "The question is not who is going to let me; it is who is going to stop me. Believe in yourself with such conviction that the world has no choice but to believe in you too.", author: "Ayn Rand" },
  { text: "I am not what happened to me. I am what I choose to become. Every morning we are born again — what we do today is what matters most.", author: "Carl Jung" },
  { text: "The only person you are destined to become is the person you decide to be. It is never too late to be what you might have been. Start where you are, use what you have.", author: "Ralph Waldo Emerson" },
  { text: "Do not be embarrassed by your failures. Learn from them and start again. Every expert was once a beginner, and every master was once a disaster. Keep going.", author: "Richard Branson" },
  { text: "The beautiful thing about learning is that nobody can take it away from you. Invest in yourself — it pays the best interest, and it compounds over a lifetime.", author: "B.B. King" },
  { text: "Challenges are what make life interesting, and overcoming them is what makes life meaningful. You were given this mountain to show others it can be moved.", author: "Joshua J. Marine" },
  { text: "Growth is painful. Change is painful. But nothing is as painful as staying stuck somewhere you do not belong. Have the courage to let go of what no longer serves you.", author: "Mandy Hale" },
  { text: "We cannot become what we want by remaining what we are. Progress is impossible without change, and those who cannot change their minds cannot change anything.", author: "Max De Pree" },
  { text: "You do not have to be great to start, but you have to start to be great. The secret of getting ahead is getting started — break it into small steps and begin.", author: "Zig Ziglar" },
  { text: "What you get by achieving your goals is not as important as what you become by achieving your goals. The journey shapes you far more than the destination ever will.", author: "Zig Ziglar" },
  { text: "Your time is limited, so do not waste it living someone else's life. Have the courage to follow your heart and intuition — everything else is secondary.", author: "Steve Jobs" },
  { text: "I have not failed. I have just found ten thousand ways that do not work. Our greatest weakness lies in giving up — the most certain way to succeed is always to try just one more time.", author: "Thomas Edison" },
  { text: "No one has ever become poor by giving. Kindness is a language which the deaf can hear and the blind can see. The smallest act of kindness is worth more than the grandest intention.", author: "Anne Frank" },
  { text: "Carry out a random act of kindness, with no expectation of reward, safe in the knowledge that one day someone might do the same for you. That is how we change the world.", author: "Princess Diana" },
  { text: "Be kind, for everyone you meet is fighting a hard battle. A warm smile is the universal language of kindness. It costs nothing but creates much.", author: "Ian Maclaren" },
  { text: "People will forget what you said, people will forget what you did, but people will never forget how you made them feel. Leave everyone a little better than you found them.", author: "Maya Angelou" },
  { text: "Too often we underestimate the power of a touch, a smile, a kind word, a listening ear, or the smallest act of caring — all of which have the potential to turn a life around.", author: "Leo Buscaglia" },
  { text: "When you arise in the morning, think of what a precious privilege it is to be alive — to breathe, to think, to enjoy, to love. Let gratitude be the first thing on your mind.", author: "Marcus Aurelius" },
  { text: "Gratitude turns what we have into enough, and more. It turns denial into acceptance, chaos into order, confusion into clarity. It makes sense of our past and brings peace for today.", author: "Melody Beattie" },
  { text: "Enjoy the little things, for one day you may look back and realize they were the big things. Life is not measured by the breaths we take, but by the moments that take our breath away.", author: "Robert Brault" },
  { text: "When I started counting my blessings, my whole life turned around. Gratitude is not only the greatest of virtues, but the parent of all the others. It changes everything.", author: "Willie Nelson" },
  { text: "The more you praise and celebrate your life, the more there is in life to celebrate. Wake up every morning and be thankful for what you have — not everyone was granted another day.", author: "Oprah Winfrey" },
  { text: "Courage does not always roar. Sometimes courage is the quiet voice at the end of the day saying, 'I will try again tomorrow.' That quiet determination is the most powerful force there is.", author: "Mary Anne Radmacher" },
  { text: "Fall seven times, stand up eight. The human spirit is stronger than anything that can happen to it. You are braver than you believe, stronger than you seem, and smarter than you think.", author: "Japanese Proverb" },
  { text: "Rock bottom became the solid foundation on which I rebuilt my life. It does not matter how slowly you go as long as you do not stop. Keep moving forward.", author: "J.K. Rowling" },
  { text: "You may encounter many defeats, but you must not be defeated. In fact, it may be necessary to encounter the defeats so you can know who you are and what you can rise from.", author: "Maya Angelou" },
  { text: "Strength does not come from what you can do. It comes from overcoming the things you once thought you could not. Believe in your resilience — it has never failed you yet.", author: "Rikki Rogers" },
  { text: "Balance is not something you find, it is something you create. Life is a series of tiny adjustments. Give yourself grace when things feel off — the act of noticing is the first step back.", author: "Jana Kingsford" },
  { text: "The most wasted of all days is one without laughter. Find joy in the ordinary, wonder in the mundane, and peace in the chaos. These small gifts are everywhere if you look.", author: "E.E. Cummings" },
  { text: "Dwell on the beauty of life. Watch the stars, and see yourself running with them. Think of all the beauty still left around you and be happy. It is always there, waiting.", author: "Marcus Aurelius" },
  { text: "You only live once, but if you do it right, once is enough. Fill your life with experiences, not things. Have stories to tell, not stuff to show.", author: "Mae West" },
  { text: "The purpose of life is not to be happy. It is to be useful, to be honorable, to be compassionate, to have it make some difference that you have lived and lived well.", author: "Ralph Waldo Emerson" },
];

// ── Page HTML builders ──

function monthlyFront() {
  return `<div class="page monthly" style="overflow: visible;">
    <div class="monthly-header">
      <span class="present-label">Present :</span>
      <div class="month-box"></div>
    </div>
    <div class="grid-wrapper">
      <table class="monthly-grid"><tbody>
        ${['Saturday','Friday','Thursday','Wednesday','Tuesday','Monday','Sunday'].map((day, i, arr) => `
        <tr>
          <th>${day}</th>
          ${[1,2,3,4,5].map((_, ci) => `<td><div class="cell-inner"><div class="cb-square"></div><div class="cb-rect"></div></div>${
            i === arr.length - 1 && ci === 4 ? '<span class="arrow-bottom-line"></span><span class="arrow-bottom-head"></span>' : ''
          }</td>`).join('')}
        </tr>`).join('')}
      </tbody></table>
    </div>
  </div>`;
}

function monthlyBack() {
  return `<div class="page monthly monthly-back" style="overflow: visible;">
    <div class="monthly-header">
      <span class="present-label">Present :</span>
      <div class="month-box"></div>
    </div>
    <div class="grid-wrapper">
      <table class="monthly-grid"><tbody>
        ${['Saturday','Friday','Thursday','Wednesday','Tuesday','Monday','Sunday'].map((day, i, arr) => `
        <tr>
          <th>${day}</th>
          ${[1,2,3,4,5].map((_, ci) => `<td><div class="cell-inner"><div class="cb-square"></div><div class="cb-rect"></div></div>${
            i === arr.length - 1 && ci === 4 ? '<span class="arrow-bottom-line"></span><span class="arrow-bottom-head"></span>' : ''
          }</td>`).join('')}
        </tr>`).join('')}
      </tbody></table>
    </div>
  </div>`;
}

function weeklyFront() {
  const habitRow = `<div class="habit-row">
    <div class="habit-label"><div class="cb-accent-sm"></div><div class="habit-line"></div></div>
    <div class="habit-days">
      ${[1,2,3,4,5,6,7].map(() => '<div class="day-cell"><div class="cb-black"></div></div>').join('')}
    </div>
  </div>`;

  return `<div class="page weekly-front">
    <div class="week-header">Week of:<span class="fill-line"></span></div>
    <div class="title-accent">Goals and Priorities</div>
    <div class="goals-box">
      ${[1,2,3,4,5].map(() => '<div class="bullet-row"><span class="bullet-dot"></span></div>').join('')}
    </div>
    <div class="habit-section">
      <div class="title-accent">Habit Tracker</div>
      <div class="habit-day-headers">
        <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
      </div>
      ${Array(7).fill(habitRow).join('')}
    </div>
    <div class="next-week">
      <div class="title-accent">Next Week's Goals and Priorities</div>
      <div class="goals-box">
        ${[1,2,3,4,5].map(() => '<div class="bullet-row"><span class="bullet-dot"></span></div>').join('')}
      </div>
    </div>
  </div>`;
}

function weeklyBack() {
  return `<div class="page weekly-back">
    <div class="kindness-wins-box">
      <div class="kindness-wins-title">Acts of Kindness &amp; Biggest Wins</div>
      <div class="kindness-wins-columns">
        <div class="divider divider-after"></div>
        <div class="col">
          ${[1,2,3,4,5].map(() => '<div class="dot-row"><span class="bullet-dot"></span></div>').join('')}
        </div>
        <div class="divider divider-after"></div>
        <div class="divider"></div>
        <div class="col">
          ${[1,2,3,4,5].map(() => '<div class="dot-row"><span class="bullet-dot"></span></div>').join('')}
        </div>
      </div>
    </div>
    <div class="reflections-section">
      <div class="title-accent">Self-Reflections:</div>
      <div class="reflections-prompt">
        <div class="cb-black"></div>
        <span class="prompt-text">Things that were Stressful or Hard? How did I overcome?</span>
      </div>
      <div class="write-line"></div>
      <div class="write-line"></div>
      <div class="write-line"></div>
      <div class="reflections-prompt">
        <div class="cb-black"></div>
        <span class="prompt-text">Things that were Fun and/or Relaxing? How to do more?</span>
      </div>
      <div class="write-line"></div>
      <div class="write-line"></div>
      <div class="write-line"></div>
    </div>
    <div class="open-notes">
      <div class="title-accent">Open Space</div>
      <div class="open-notes-area"></div>
    </div>
  </div>`;
}

function dailyFront() {
  return `<div class="page daily-front">
    <div class="daily-header">
      <div class="date-area">
        <span>Date</span>
        <span class="date-fill"></span><span>/</span>
        <span class="date-fill"></span><span>/</span>
        <span class="date-fill"></span>
      </div>
      <div class="day-letters">
        <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
      </div>
    </div>
    <div class="title-black" style="height: 5mm; line-height: 5mm;">Gratitude...</div>
    <div class="daily-box" style="height: 40mm;">
      ${Array(6).fill('<div class="write-line"></div>').join('')}
    </div>
    <div class="gap"></div>
    <div class="title-black" style="height: 5mm; line-height: 5mm;">Affirmations...</div>
    <div class="daily-box" style="height: 25mm;">
      ${Array(3).fill('<div class="bullet-row"><span class="bullet-dot"></span></div>').join('')}
    </div>
    <div class="gap"></div>
    <div class="title-black">Mode Tracker :</div>
    <div class="mode-area"></div>
    <div class="gap"></div>
    <div class="title-black">Today Main Tasks...</div>
    <div class="daily-box" style="height: 25mm;">
      ${Array(3).fill('<div class="bullet-row"><span class="bullet-dot"></span></div>').join('')}
    </div>
    <div class="gap"></div>
    <div class="title-black">Tomorrow's Excitements...</div>
    <div class="daily-box" style="height: 25mm;">
      ${Array(3).fill('<div class="bullet-row"><span class="bullet-dot"></span></div>').join('')}
    </div>
  </div>`;
}

function dailyBack(quoteIndex) {
  const quote = quoteVault[quoteIndex % quoteVault.length];
  return `<div class="page daily-back">
    <div class="quote-area">
      <div class="quote-marks">
        <div class="quote-mark">&ldquo;</div>
        <div class="quote-mark">&rdquo;</div>
      </div>
      <div class="quote-text">${quote.text}</div>
      <div class="quote-author">&mdash; ${quote.author}</div>
    </div>
    <div class="title-black">Reflections...</div>
    <div class="reflections-box">
      <div class="reflection-item">
        <div class="reflection-label"><div class="sq"></div><span>Good Things &amp; Highlights</span></div>
        <div class="reflection-lines">
          <div class="write-line"></div><div class="write-line"></div>
        </div>
      </div>
      <div class="reflection-item">
        <div class="reflection-label"><div class="sq"></div><span>Improvements</span></div>
        <div class="reflection-lines">
          <div class="write-line"></div><div class="write-line"></div>
        </div>
      </div>
      <div class="reflection-item" style="margin-bottom: 0;">
        <div class="reflection-label"><div class="sq"></div><span>Advice</span></div>
        <div class="reflection-lines">
          <div class="write-line" style="width: 50%;"></div>
          <div class="write-line" style="width: 50%;"></div>
          <div class="write-line" style="width: 50%;"></div>
          <div class="write-line" style="width: 50%;"></div>
        </div>
      </div>
      <div class="sare-wrapper">
        <div class="sare-labels">
          <span>S</span><span>A</span><span>R</span><span>E</span>
        </div>
        <div>
          <div class="sare-bars">
            ${Array(4).fill('<div class="sare-bar"></div>').join('')}
          </div>
          <div class="sare-numbers">
            ${[1,2,3,4,5,6,7,8,9,10].map(n => `<span>${n}</span>`).join('')}
          </div>
        </div>
      </div>
    </div>
    <div class="mind-clutter">
      <div class="title-black">Mind Clutter / Notes...</div>
      <div class="mind-clutter-lines"></div>
    </div>
  </div>`;
}

function welcomePage() {
  return `<div class="page" style="background-image: none; display: flex; align-items: center; justify-content: center; text-align: center; padding: 20mm;">
    <div>
      <div style="font-family: var(--font-heading); font-size: 28pt; color: var(--accent); font-style: italic; margin-bottom: 8mm;">
        Welcome!
      </div>
      <div style="font-family: var(--font-heading); font-size: 12pt; color: var(--black); font-style: italic; line-height: 2.2;">
        This is your space to grow, reflect, and thrive.<br>
        There are no rules — only your journey.<br><br>
        Write freely. Be honest. Be kind to yourself.<br>
        Every page is a fresh start.
      </div>
      <div style="margin-top: 15mm; font-family: var(--font-heading); font-size: 16pt; color: var(--accent); font-style: italic;">
        Let's get started &hearts;
      </div>
    </div>
  </div>`;
}

function belongsToPage() {
  const fieldLine = (label) => `
    <div style="display: flex; align-items: baseline; margin-bottom: 6mm;">
      <span style="font-family: var(--font-heading); font-style: italic; font-size: 10pt; color: var(--black); white-space: nowrap; min-width: 35mm;">${label}</span>
      <span style="flex: 1; border-bottom: 1px solid var(--black); height: 5mm;"></span>
    </div>`;

  return `<div class="page" style="background-image: none; padding: 20mm 15mm 20mm 15mm; display: flex; flex-direction: column; justify-content: center; align-items: center;">
    <div style="width: 100%;">
      <div style="margin-bottom: 8mm;">
        <div style="font-family: var(--font-heading); font-style: italic; font-size: 11pt; color: var(--black); margin-bottom: 3mm;">Dates:</div>
        <div style="border-bottom: 1px solid var(--black); width: 80mm; height: 5mm;"></div>
      </div>
      <div style="margin-bottom: 10mm;">
        <div style="font-family: var(--font-heading); font-style: italic; font-size: 18pt; color: var(--accent); margin-bottom: 5mm;">This Book Belongs To:</div>
        <div style="border-bottom: 1px solid var(--black); height: 5mm;"></div>
      </div>
      <div style="margin-bottom: 10mm;">
        <div style="font-family: var(--font-heading); font-style: italic; font-size: 11pt; color: var(--black); margin-bottom: 5mm;">Please return at:</div>
        ${fieldLine('Phone:')}
        ${fieldLine('Email:')}
        ${fieldLine('Insta / Facebook:')}
        ${fieldLine('LinkedIn:')}
      </div>
      <div style="margin-top: 10mm; text-align: center;">
        <div style="font-family: var(--font-heading); font-style: italic; font-size: 14pt; color: var(--accent); line-height: 1.8;">
          Thank you for your kindness,<br>you will be rewarded!
        </div>
      </div>
    </div>
  </div>`;
}

function congratsPage() {
  return `<div class="page" style="background-image: none; display: flex; align-items: center; justify-content: center; text-align: center; padding: 20mm;">
    <div>
      <div style="font-family: var(--font-heading); font-size: 24pt; color: var(--accent); font-style: italic; margin-bottom: 10mm;">
        Congratulations!
      </div>
      <div style="font-family: var(--font-heading); font-size: 12pt; color: var(--black); font-style: italic; line-height: 1.8;">
        You've completed two months of intentional living.<br>
        Every page you filled was an act of self-care.<br>
        Keep going — you're doing amazing.
      </div>
      <div style="margin-top: 15mm; font-family: var(--font-heading); font-size: 14pt; color: var(--accent); font-style: italic;">
        — The Balanced Book
      </div>
    </div>
  </div>`;
}

function blankPage() {
  return `<div class="page" style="background-image: none;">
  </div>`;
}

function linedPage(isBackPage) {
  // Lined page with writing lines, respecting spiral binding side
  const paddingStyle = isBackPage
    ? 'padding-left: 5mm; padding-right: 15mm;'
    : 'padding-left: 15mm;';
  return `<div class="page" style="background-image: none; ${paddingStyle}">
    <div class="title-accent" style="margin-bottom: 5mm;">Notes</div>
    ${Array(36).fill('<div class="write-line"></div>').join('\n    ')}
  </div>`;
}

// ── Assemble all pages ──

function buildAllPages() {
  const pages = [];
  let dayCounter = 0;

  // Front matter
  pages.push(welcomePage());
  pages.push(belongsToPage());

  for (let month = 0; month < 2; month++) {
    // Monthly spread (1 sheet = 2 PDF pages) — only for month 1
    if (month === 0) {
      pages.push(monthlyFront());
      pages.push(monthlyBack());
    }

    // 4 weeks per month
    for (let week = 0; week < 4; week++) {
      // Weekly spread (1 sheet = 2 PDF pages)
      pages.push(weeklyFront());
      pages.push(weeklyBack());

      // 7 daily spreads (7 sheets = 14 PDF pages)
      for (let day = 0; day < 7; day++) {
        pages.push(dailyFront());
        pages.push(dailyBack(dayCounter));
        dayCounter++;
      }
    }
  }

  // End matter: Congrats page (front) + blank (back) = 1 sheet
  pages.push(congratsPage());
  pages.push(blankPage());

  // 3 lined sheets = 6 PDF pages
  for (let i = 0; i < 3; i++) {
    pages.push(linedPage(false));  // front (right-hand page)
    pages.push(linedPage(true));   // back (left-hand page)
  }

  return pages;
}

// ── Read CSS ──

const sharedCSS = fs.readFileSync(path.join(__dirname, 'blueprints', 'styles.css'), 'utf8');

// Inline styles extracted from the template files (monthly, weekly, daily)
const templateCSS = `
/* ---- Monthly styles ---- */
.page.monthly { padding-top: 2.5mm; background-image: none; }
.monthly-header { height: 20mm; display: flex; align-items: center; gap: 5mm; margin-left: 20mm; }
.monthly-header .present-label { font-family: var(--font-heading); font-style: italic; font-size: 18pt; color: var(--black); white-space: nowrap; }
.monthly-header .month-box { border: 2px solid var(--accent); flex: 1; height: 10mm; }
.grid-wrapper { flex: 1; position: relative; margin-right: 18mm; }
.monthly-grid { width: 100%; height: 100%; border-collapse: collapse; border: 1.5px solid var(--black); border-left: none; border-top: none; border-bottom: none; table-layout: fixed; }
.monthly-grid tr:first-child td { border-top: 1.5px solid var(--black); }
.monthly-grid tr:last-child td { border-bottom: 1.5px solid var(--black); }
.monthly-grid th { font-family: var(--font-heading); font-style: italic; font-size: 14pt; font-weight: normal; color: var(--accent); text-align: center; padding: 0 10mm 0 0; border: none; border-right: 1px solid var(--black); width: 15mm; writing-mode: vertical-rl; transform: rotate(180deg); vertical-align: middle; background-image: linear-gradient(to right, var(--black) 50%, transparent 50%); background-size: 100% 1px; background-position: left top; background-repeat: no-repeat; }
.monthly-grid tr:first-child th { background-image: linear-gradient(to right, var(--black) 50%, transparent 50%), linear-gradient(to right, var(--black) 50%, transparent 50%); background-size: 100% 1px, 100% 1px; background-position: left top, left bottom; background-repeat: no-repeat, no-repeat; }
.monthly-grid td { border: 1px solid var(--black); padding: 0; vertical-align: middle; text-align: center; width: 20mm; height: 25mm; }
.cell-inner { position: relative; width: 100%; height: 100%; }
.cb-square { position: absolute; top: 0; left: 0; width: 5mm; height: 5mm; border: 2px solid var(--accent); }
.cb-rect { position: absolute; top: 7.5mm; right: 5mm; width: 7.5mm; height: 12.5mm; border: 2px solid var(--accent); }
.monthly-grid td:last-child { position: relative; }
.monthly-grid td:last-child::after { content: ''; position: absolute; top: -1px; left: 100%; width: 15mm; border-top: 1px solid var(--black); }
.monthly-grid td:last-child::before { content: ''; position: absolute; top: -4.5px; left: calc(100% + 15mm); width: 0; height: 0; border-top: 4px solid transparent; border-bottom: 4px solid transparent; border-left: 6px solid var(--black); }
.arrow-bottom-line { position: absolute; bottom: -1px; left: 100%; width: 15mm; border-top: 1px solid var(--black); }
.arrow-bottom-head { position: absolute; bottom: -4.5px; left: calc(100% + 15mm); width: 0; height: 0; border-top: 4px solid transparent; border-bottom: 4px solid transparent; border-left: 6px solid var(--black); }
.page.monthly-back { padding: 2.5mm 20mm 5mm 5mm; }
.monthly-back .monthly-header { margin-left: 0; margin-right: 10mm; }
.monthly-back .grid-wrapper { margin-right: 18mm; margin-left: -10mm; }

/* ---- Weekly styles ---- */
.weekly-front { padding-left: 15mm; background-image: none; }
.weekly-back { padding-left: 5mm; padding-right: 15mm; background-image: none; }
.week-header { font-family: var(--font-heading); font-style: italic; font-size: 10pt; color: var(--black); height: 10mm; line-height: 10mm; }
.week-header .fill-line { border-bottom: 1px solid var(--black); display: inline-block; width: 40mm; margin-left: 5mm; }
.goals-box { border: 1.5px solid var(--black); padding: 5mm; height: 35mm; }
.habit-section { margin-top: 5mm; }
.habit-day-headers { display: flex; justify-content: flex-end; height: 5mm; line-height: 5mm; }
.habit-day-headers span { width: 10mm; text-align: center; font-size: 8pt; font-weight: bold; color: var(--black); }
.habit-row { display: flex; align-items: center; height: 10mm; border-bottom: 0.5px solid var(--line-gray); }
.habit-label { display: flex; align-items: center; gap: 2.5mm; flex: 1; }
.habit-label .habit-line { flex: 1; border-bottom: 0.5px solid var(--line-gray); height: 5mm; }
.habit-days { display: flex; }
.habit-days .day-cell { width: 10mm; height: 10mm; display: flex; align-items: center; justify-content: center; }
.next-week { margin-top: 5mm; flex: 1; display: flex; flex-direction: column; }
.kindness-wins-box { border: 1.5px solid var(--black); padding: 0 5mm 5mm 5mm; height: 60mm; display: flex; flex-direction: column; }
.kindness-wins-title { font-family: var(--font-heading); font-style: italic; font-size: 14pt; color: var(--accent); height: 10mm; line-height: 10mm; margin: -1px -5mm 0 -5mm; padding-left: 5mm; border-bottom: 1.5px solid var(--black); }
.kindness-wins-columns { display: flex; flex: 1; gap: 0; }
.kindness-wins-columns .col { flex: 1; padding: 0; }
.kindness-wins-columns .divider { width: 1.5px; background: var(--black); flex-shrink: 0; margin-left: 5mm; }
.kindness-wins-columns .divider-after { margin-left: 0; }
.dot-row { height: 10mm; display: flex; align-items: center; }
.reflections-section { margin-top: 5mm; }
.reflections-prompt { display: flex; align-items: center; gap: 2.5mm; height: 10mm; }
.prompt-text { font-family: var(--font-heading); font-style: italic; font-size: 8pt; color: var(--accent); }
.open-notes { margin-top: 5mm; flex: 1; display: flex; flex-direction: column; }
.notes-lines { flex: 1; }
.open-notes-area { flex: 1; background-image: radial-gradient(circle, #888 0.6px, transparent 0.6px); background-size: 5mm 5mm; }

/* ---- Daily styles ---- */
.daily-front { padding-left: 15mm; background-image: none; }
.daily-header { display: flex; justify-content: space-between; align-items: center; height: 10mm; }
.date-area { font-family: var(--font-heading); font-style: italic; font-size: 10pt; color: var(--black); display: flex; align-items: baseline; gap: 2.5mm; }
.date-fill { border-bottom: 1px solid var(--black); width: 10mm; display: inline-block; }
.day-letters { display: flex; gap: 0; font-size: 9pt; font-weight: bold; color: var(--black); }
.day-letters span { width: 5mm; height: 5mm; display: flex; align-items: center; justify-content: center; }
.daily-box { border: 1.5px solid var(--black); padding: 5mm; }
.daily-box .title-black { margin-bottom: 0; }
.mode-area { height: 35mm; }
.gap { height: 5mm; flex-shrink: 0; }
.daily-back { padding-left: 5mm; padding-right: 15mm; background-image: none; }
.quote-area { height: 35mm; position: relative; padding: 0 5mm 0 5mm; display: flex; flex-direction: column; justify-content: center; }
.quote-marks { display: flex; justify-content: space-between; height: 7.5mm; }
.quote-mark { font-family: var(--font-heading); font-size: 28pt; color: var(--accent); line-height: 0.6; }
.quote-text { font-family: var(--font-heading); font-style: italic; font-size: 11pt; color: var(--accent); margin-left: 5mm; margin-right: 5mm; line-height: 1.4; }
.quote-author { font-family: var(--font-heading); font-size: 9pt; color: var(--accent); text-align: right; margin-right: 5mm; margin-top: 1.5mm; }
.reflections-box { border: 1.5px solid var(--black); padding: 5mm 5mm 5mm 2.5mm; position: relative; height: 80mm; }
.reflection-item { margin-bottom: 5mm; }
.reflection-label { display: flex; align-items: center; gap: 2.5mm; height: 5mm; }
.reflection-label .sq { width: 2.5mm; height: 2.5mm; border: 1px solid var(--accent); flex-shrink: 0; }
.reflection-label span { font-family: var(--font-heading); font-style: italic; font-size: 9pt; color: var(--accent); }
.reflection-lines { margin-left: 5mm; }
.sare-wrapper { position: absolute; bottom: 0; right: 5mm; display: flex; align-items: flex-start; }
.sare-labels { display: flex; flex-direction: column; margin-right: 2.5mm; width: 5mm; }
.sare-labels span { height: 5mm; display: flex; align-items: center; justify-content: flex-end; font-family: var(--font-heading); font-style: italic; font-size: 9pt; font-weight: bold; color: var(--accent); }
.sare-bars { display: flex; flex-direction: column; border: 1.5px solid var(--black); width: 50mm; }
.sare-bar { height: 5mm; border-bottom: 1px solid var(--black); }
.sare-bar:last-child { border-bottom: none; }
.sare-numbers { display: flex; width: 50mm; }
.sare-numbers span { width: 5mm; text-align: center; font-family: var(--font-heading); font-style: italic; font-size: 7pt; color: var(--accent); font-weight: bold; height: 5mm; line-height: 5mm; }
.mind-clutter { flex: 1; display: flex; flex-direction: column; margin-top: 5mm; }
.mind-clutter-lines { flex: 1; border-top: none; background-image: radial-gradient(circle, #888 0.6px, transparent 0.6px); background-size: 5mm 5mm; }
.page-number { position: absolute; bottom: 5mm; right: 5mm; font-size: 8pt; color: var(--accent); font-style: italic; font-family: var(--font-heading); }
`;

// ── Build final HTML ──

function buildHTML() {
  const pages = buildAllPages();

  console.log(`Total PDF pages: ${pages.length} (${pages.length / 2} sheets)`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>The Balanced Book — Print Ready</title>
  <style>
    ${sharedCSS}
    ${templateCSS}

    /* Print / PDF overrides */
    @page {
      size: 148mm 210mm;
      margin: 0;
    }
    body {
      margin: 0;
      padding: 0;
      background: white;
    }
    .page {
      margin: 0;
      border: none;
      page-break-after: always;
    }
    .page:last-child {
      page-break-after: auto;
    }
    .color-picker-bar, .page-label {
      display: none;
    }
  </style>
</head>
<body>
${pages.join('\n')}
</body>
</html>`;
}

// ── Generate PDF with Puppeteer ──

async function main() {
  const html = buildHTML();

  // Save HTML for debugging
  const htmlPath = path.join(__dirname, 'book-assembled.html');
  fs.writeFileSync(htmlPath, html);
  console.log(`Assembled HTML saved to: ${htmlPath}`);

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Load the HTML
  await page.setContent(html, { waitUntil: 'networkidle0' });

  // Generate PDF
  const pdfPath = path.join(__dirname, 'The-Balanced-Book.pdf');
  console.log('Generating PDF...');
  await page.pdf({
    path: pdfPath,
    width: '148mm',
    height: '210mm',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  console.log(`PDF saved to: ${pdfPath}`);
  console.log('Done!');

  await browser.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
