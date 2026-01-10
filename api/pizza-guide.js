/**
 * North Beach Pizza Guide for Stan
 * Static HTML served as API route
 */

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stan's North Beach Pizza Guide</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            line-height: 1.6;
            padding: 20px;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
        }

        h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            color: #ff6b6b;
        }

        .subtitle {
            color: #888;
            font-size: 1.1rem;
            margin-bottom: 2rem;
        }

        .intro {
            background: #1a1a1a;
            padding: 1.5rem;
            border-radius: 8px;
            border-left: 4px solid #ff6b6b;
            margin-bottom: 2rem;
        }

        .place {
            background: #1a1a1a;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            border-radius: 8px;
            border-left: 4px solid #6b8fff;
        }

        .place h2 {
            color: #6b8fff;
            margin-bottom: 0.5rem;
            font-size: 1.5rem;
        }

        .place .type {
            color: #ff6b6b;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 0.5rem;
        }

        .place .address {
            color: #888;
            font-size: 0.9rem;
            margin-bottom: 1rem;
        }

        .place .vibe {
            background: #0a0a0a;
            padding: 0.75rem;
            border-radius: 4px;
            margin-top: 1rem;
            font-style: italic;
            color: #aaa;
        }

        .tip {
            background: #1a1a1a;
            padding: 1rem;
            border-radius: 8px;
            border-left: 4px solid #4ecdc4;
            margin-bottom: 1rem;
        }

        .tip strong {
            color: #4ecdc4;
        }

        .footer {
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid #333;
            color: #666;
            text-align: center;
            font-size: 0.9rem;
        }

        a {
            color: #6b8fff;
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        .emoji {
            font-size: 1.2em;
            margin-right: 0.25rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🍕 Stan's North Beach Guide</h1>
        <p class="subtitle">March 2026 • SF's Little Italy • Made for @wanderingstan</p>

        <div class="intro">
            <p><strong>North Beach</strong> is SF's Italian neighborhood and pizza pilgrimage site. Here's where the locals actually go, not just where tourists line up. You're visiting in March—perfect weather for walking around after a heavy pizza dinner.</p>
        </div>

        <h2 style="color: #ff6b6b; margin-bottom: 1rem; margin-top: 2rem;">🍕 THE PIZZA SPOTS</h2>

        <div class="place">
            <div class="type">🏆 THE CLASSIC</div>
            <h2>Tony's Pizza Napoletana</h2>
            <p class="address">1570 Stockton St</p>
            <p>Tony Gemignani has more pizza accolades than anyone in America. Get the Margherita DOC (cal 3 certified Neapolitan oven, 900°F, 2 minutes). Yes there's a line. Yes it's worth it. Make a reservation or go at 4pm when they open.</p>
            <div class="vibe">Vibe: Serious pizza temple. You're here for the craft.</div>
        </div>

        <div class="place">
            <div class="type">💎 THE HIDDEN GEM</div>
            <h2>Golden Boy Pizza</h2>
            <p class="address">542 Green St</p>
            <p>Square slices, thick crust, sold by the slice. This is what locals grab. The clam and garlic is legendary. Standing room only, cash only, open till 2am on weekends. Peak North Beach chaos energy.</p>
            <div class="vibe">Vibe: No frills, all vibes. Grab a slice and eat it on the street.</div>
        </div>

        <div class="place">
            <div class="type">🎯 THE SLEEPER</div>
            <h2>Flour + Water Pizzeria</h2>
            <p class="address">532 Columbus Ave</p>
            <p>From the Flour + Water pasta empire. Neo-Neapolitan with California ingredients. The fried pizza (pizza fritta) is insane. More upscale but not pretentious. They take reservations.</p>
            <div class="vibe">Vibe: Date night worthy but still casual. Great wine list.</div>
        </div>

        <div class="place">
            <div class="type">🌙 THE LATE NIGHT</div>
            <h2>Sotto Mare</h2>
            <p class="address">552 Green St</p>
            <p>Wait—not pizza, but if you're in North Beach and want seafood: get the cioppino. It's the move. Huge portions, family style, messy and perfect.</p>
            <div class="vibe">Vibe: Old school Italian-American. Wear a bib, they're serious.</div>
        </div>

        <h2 style="color: #4ecdc4; margin-bottom: 1rem; margin-top: 2rem;">💡 NORTH BEACH SURVIVAL TIPS</h2>

        <div class="tip">
            <strong>☕ Pre-pizza ritual:</strong> Grab espresso at Caffe Trieste (601 Vallejo). Beat generation haunt, been there since 1956, still family owned. Opera on Saturdays.
        </div>

        <div class="tip">
            <strong>🚶 Best walk:</strong> Start at Washington Square Park, wind through the alleys (Fresno St, Romolo Pl), end at Coit Tower for the view. Burn off the pizza calories.
        </div>

        <div class="tip">
            <strong>🍸 Post-dinner drinks:</strong> Specs' Twelve Adler Museum Cafe (12 William Saroyan Pl) — weird dive bar covered in sailor memorabilia. Or Vesuvio Cafe next to City Lights Books for the literary vibe.
        </div>

        <div class="tip">
            <strong>📚 Between slices:</strong> City Lights Bookstore (261 Columbus) is the legendary Beat poetry publisher. Upstairs poetry room is worth the visit.
        </div>

        <div class="tip">
            <strong>🎭 Nightcap:</strong> Beach Blanket Babylon at Club Fugazi (678 Green St) if you want the full touristy SF experience. It's actually fun. Huge hats, musical revue, very San Francisco.
        </div>

        <h2 style="color: #ff6b6b; margin-bottom: 1rem; margin-top: 2rem;">⚠️ WHAT TO SKIP</h2>

        <div class="tip">
            <strong>Fisherman's Wharf:</strong> You'll see it. Keep walking. Unless you want overpriced clam chowder bread bowls, in which case, live your truth.
        </div>

        <div class="tip">
            <strong>Lombard Street:</strong> The "crooked street" is nearby but it's literally just tourists taking Instagram photos. You can see it from afar and call it good.
        </div>

        <h2 style="color: #6b8fff; margin-bottom: 1rem; margin-top: 2rem;">🗺️ THE ROUTE</h2>

        <div class="intro">
            <p><strong>Perfect North Beach Evening:</strong></p>
            <p>4:00pm — Coffee at Caffe Trieste<br>
            4:30pm — Browse City Lights Bookstore<br>
            5:00pm — Early pizza at Tony's (beat the dinner rush)<br>
            6:30pm — Walk to Coit Tower for sunset<br>
            7:30pm — Drinks at Vesuvio or Specs'<br>
            9:00pm — Late night slice at Golden Boy if still hungry (you will be)</p>
        </div>

        <div class="footer">
            <p>Made for @wanderingstan by @seth via /vibe</p>
            <p style="margin-top: 0.5rem; color: #444;">🍕 Enjoy SF in March! DM me how the pizza was.</p>
        </div>
    </div>
</body>
</html>`);
};
