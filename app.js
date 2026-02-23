// app.js
// Plain global JS, no modules.

// -------------------
// Data generator
// -------------------
const TAGS = [
  "Coffee","Hiking","Movies","Live Music","Board Games","Cats","Dogs","Traveler",
  "Foodie","Tech","Art","Runner","Climbing","Books","Yoga","Photography"
];
const FIRST_NAMES = [
  "Alex","Sam","Jordan","Taylor","Casey","Avery","Riley","Morgan","Quinn","Cameron",
  "Jamie","Drew","Parker","Reese","Emerson","Rowan","Shawn","Harper","Skyler","Devon"
];
const CITIES = [
  "Brooklyn","Manhattan","Queens","Jersey City","Hoboken","Astoria",
  "Williamsburg","Bushwick","Harlem","Lower East Side"
];
const JOBS = [
  "Product Designer","Software Engineer","Data Analyst","Barista","Teacher",
  "Photographer","Architect","Chef","Nurse","Marketing Manager","UX Researcher"
];
const BIOS = [
  "Weekend hikes and weekday lattes.",
  "Dog parent. Amateur chef. Karaoke enthusiast.",
  "Trying every taco in the city — for science.",
  "Bookstore browser and movie quote machine.",
  "Gym sometimes, Netflix always.",
  "Looking for the best slice in town.",
  "Will beat you at Mario Kart.",
  "Currently planning the next trip."
];

const UNSPLASH_SEEDS = [
  "1515462277126-2b47b9fa09e6",
  "1520975916090-3105956dac38",
  "1519340241574-2cec6aef0c01",
  "1554151228-14d9def656e4",
  "1548142813-c348350df52b",
  "1517841905240-472988babdf9",
  "1535713875002-d1d0cf377fde",
  "1545996124-0501ebae84d0",
  "1524504388940-b1c1722653e1",
  "1531123897727-8f129e1688ce",
];

function sample(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickTags() { return Array.from(new Set(Array.from({length:4}, ()=>sample(TAGS)))); }
function imgFor(seed) {
  return `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=1200&q=80`;
}
// Pick `count` unique images for one profile
function pickImgs(count = 3) {
  const pool = [...UNSPLASH_SEEDS];
  const result = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(imgFor(pool.splice(idx, 1)[0]));
  }
  return result;
}

function generateProfiles(count = 12) {
  const profiles = [];
  for (let i = 0; i < count; i++) {
    const imgs = pickImgs(3);
    profiles.push({
      id: `p_${i}_${Date.now().toString(36)}`,
      name: sample(FIRST_NAMES),
      age: 18 + Math.floor(Math.random() * 22),
      city: sample(CITIES),
      title: sample(JOBS),
      bio: sample(BIOS),
      tags: pickTags(),
      imgs,              // all photos for this profile
      img: imgs[0],      // current display photo (kept for compatibility)
    });
  }
  return profiles;
}

// -------------------
// UI rendering
// -------------------
const deckEl = document.getElementById("deck");
const shuffleBtn = document.getElementById("shuffleBtn");
const likeBtn = document.getElementById("likeBtn");
const nopeBtn = document.getElementById("nopeBtn");
const superLikeBtn = document.getElementById("superLikeBtn");
const noteEl = document.querySelector(".note");

let profiles = [];

function renderDeck() {
  deckEl.setAttribute("aria-busy", "true");
  deckEl.innerHTML = "";

  profiles.forEach((p) => {
    const card = document.createElement("article");
    card.className = "card";
    card.setAttribute("data-id", p.id);

    const img = document.createElement("img");
    img.className = "card__media";
    img.src = p.imgs[0];
    img.alt = `${p.name} — profile photo 1 of ${p.imgs.length}`;
    img.draggable = false; // prevent browser native image drag

    // Photo progress dots (one per image in this profile)
    const dots = document.createElement("div");
    dots.className = "card__dots";
    p.imgs.forEach((_, i) => {
      const dot = document.createElement("span");
      dot.className = "card__dot" + (i === 0 ? " card__dot--active" : "");
      dots.appendChild(dot);
    });

    // --- Finding 4: stamp overlays for drag feedback ---
    // These are invisible by default (opacity:0) and fade in during drag.
    const stampLike = document.createElement("div");
    stampLike.className = "card__stamp card__stamp--like";
    stampLike.textContent = "LIKE";

    const stampNope = document.createElement("div");
    stampNope.className = "card__stamp card__stamp--nope";
    stampNope.textContent = "NOPE";

    const stampSuper = document.createElement("div");
    stampSuper.className = "card__stamp card__stamp--super";
    stampSuper.textContent = "SUPER";

    const body = document.createElement("div");
    body.className = "card__body";

    const titleRow = document.createElement("div");
    titleRow.className = "title-row";
    titleRow.innerHTML = `
      <h2 class="card__title">${p.name}</h2>
      <span class="card__age">${p.age}</span>
    `;

    const meta = document.createElement("div");
    meta.className = "card__meta";
    meta.textContent = `${p.title} • ${p.city}`;

    const chips = document.createElement("div");
    chips.className = "card__chips";
    p.tags.forEach((t) => {
      const c = document.createElement("span");
      c.className = "chip";
      c.textContent = t;
      chips.appendChild(c);
    });

    body.appendChild(titleRow);
    body.appendChild(meta);
    body.appendChild(chips);

    card.appendChild(img);
    card.appendChild(dots);
    card.appendChild(stampLike);
    card.appendChild(stampNope);
    card.appendChild(stampSuper);
    card.appendChild(body);

    deckEl.appendChild(card);
  });

  deckEl.removeAttribute("aria-busy");

  // Finding 8: update note to a usage tip now that the deck is populated
  updateEmptyState();
  // Finding 2 & 5: attach swipe + double-tap to the current top card
  attachTopCardHandlers();
}

// Finding 8: drive the note paragraph from JS instead of hardcoding it
function updateEmptyState() {
  if (profiles.length === 0) {
    noteEl.innerHTML = "<strong>No more profiles!</strong> Hit Shuffle to reload.";
  } else {
    noteEl.innerHTML =
      "<strong>Tip:</strong> Swipe right to like · left to pass · up to super like · double-tap for more photos.";
  }
}

function resetDeck() {
  profiles = generateProfiles(12);
  renderDeck();
}

// -------------------
// Finding 1 & 2 & 3: card dismissal with fly-off animation
// -------------------

// Distance (px) the user must drag before a swipe is committed on release
const SWIPE_THRESHOLD = 80;

function getTopCard() {
  // With z-index:3 on :nth-child(1), the first DOM child is always the front card
  return deckEl.querySelector(".card");
}

function dismissTopCard(direction) {
  const card = getTopCard();
  if (!card) return;

  let tx = "0%", ty = "0%", rot = 0;

  if (direction === "like") {
    tx = "150%";
    rot = 30;
    console.log(`Liked: ${profiles[0]?.name}`);
  } else if (direction === "nope") {
    tx = "-150%";
    rot = -30;
    console.log(`Noped: ${profiles[0]?.name}`);
  } else if (direction === "super") {
    ty = "-150%";
    console.log(`Super liked: ${profiles[0]?.name}`);
  }

  // Fly the card off screen, then remove it from DOM
  card.style.transition = "transform 380ms cubic-bezier(.5,0,.8,.5), opacity 380ms ease";
  card.style.transform = `translateX(${tx}) translateY(${ty}) rotate(${rot}deg)`;
  card.style.opacity = "0";
  card.style.pointerEvents = "none"; // prevent re-triggering during animation

  card.addEventListener("transitionend", () => {
    card.remove();
    profiles.shift();
    updateEmptyState();
    // Attach handlers to the new top card after the old one is gone
    attachTopCardHandlers();
  }, { once: true });
}

// -------------------
// Finding 2 & 3: swipe gesture (Pointer Events — works for mouse AND touch)
// -------------------

function attachTopCardHandlers() {
  const card = getTopCard();
  if (!card) return;
  addSwipeHandler(card);   // Finding 2, 3 & 5 (double-tap is inside addSwipeHandler)
}

function addSwipeHandler(card) {
  let startX = 0, startY = 0;
  let dx = 0, dy = 0;
  let active = false;
  let lastTapTime = 0; // for double-tap detection
  let photoIdx = 0;    // which image is currently shown

  function onDown(e) {
    // Only respond when this card is still the top card
    if (card !== getTopCard()) return;
    // Ignore right-click / middle-click
    if (e.button !== undefined && e.button !== 0) return;

    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;
    dx = 0;
    dy = 0;
    active = true;

    // Capture keeps move/up firing on this element even outside its bounds
    card.setPointerCapture(e.pointerId);
    card.style.transition = "none";
    card.style.cursor = "grabbing";
  }

  function onMove(e) {
    if (!active) return;
    dx = e.clientX - startX;
    dy = e.clientY - startY;

    // Rotate card slightly in the direction of horizontal drag
    const rot = dx * 0.07;
    card.style.transform = `translateX(${dx}px) translateY(${dy}px) rotate(${rot}deg)`;

    // Finding 4: reveal the appropriate stamp as the user drags
    updateDragOverlay(card, dx, dy);
  }

  function onUp() {
    if (!active) return;
    active = false;
    card.style.cursor = "grab";

    if (dx > SWIPE_THRESHOLD) {
      dismissTopCard("like");
    } else if (dx < -SWIPE_THRESHOLD) {
      dismissTopCard("nope");
    } else if (dy < -SWIPE_THRESHOLD) {
      // Finding 3: upward drag triggers super like
      dismissTopCard("super");
    } else {
      // Not far enough — spring the card back to centre
      card.style.transition = "transform 300ms cubic-bezier(.3,1.4,.6,1)";
      card.style.transform = "";
      clearDragOverlay(card);

      // Double-tap: pointer barely moved (real tap, not a cancelled swipe)
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        const now = Date.now();
        if (now - lastTapTime < 300) {
          // Advance to next photo and update the card visually
          const profile = profiles[0];
          if (profile?.imgs?.length > 1) {
            photoIdx = (photoIdx + 1) % profile.imgs.length;
            card.querySelector(".card__media").src = profile.imgs[photoIdx];
            // Update dot indicators
            card.querySelectorAll(".card__dot").forEach((d, i) => {
              d.classList.toggle("card__dot--active", i === photoIdx);
            });
          }
          lastTapTime = 0; // reset so a third tap starts a new sequence
        } else {
          lastTapTime = now;
        }
      }
    }

    dx = 0;
    dy = 0;
  }

  card.addEventListener("pointerdown", onDown);
  card.addEventListener("pointermove", onMove);
  card.addEventListener("pointerup", onUp);
  card.addEventListener("pointercancel", onUp); // e.g. phone call interrupts touch
}

// Finding 4: fade stamps in/out proportionally to drag distance
function updateDragOverlay(card, dx, dy) {
  const likeStamp  = card.querySelector(".card__stamp--like");
  const nopeStamp  = card.querySelector(".card__stamp--nope");
  const superStamp = card.querySelector(".card__stamp--super");

  // Reach full opacity at 2× threshold
  likeStamp.style.opacity  = Math.min(1, Math.max(0,  dx / (SWIPE_THRESHOLD * 2)));
  nopeStamp.style.opacity  = Math.min(1, Math.max(0, -dx / (SWIPE_THRESHOLD * 2)));
  superStamp.style.opacity = Math.min(1, Math.max(0, -dy / (SWIPE_THRESHOLD * 2)));
}

function clearDragOverlay(card) {
  card.querySelectorAll(".card__stamp").forEach((s) => { s.style.opacity = "0"; });
}

// -------------------
// Finding 1: button controls — now call dismissTopCard instead of console.log
// -------------------
likeBtn.addEventListener("click", () => dismissTopCard("like"));
nopeBtn.addEventListener("click", () => dismissTopCard("nope"));
superLikeBtn.addEventListener("click", () => dismissTopCard("super"));
shuffleBtn.addEventListener("click", resetDeck);

// Boot
resetDeck();
