const IMAGE_SRCS = [
  "assets/hero-main.webp",
  "assets/hero-main.webp",
  "assets/hero-main.webp",
  "assets/hero-main.webp",
  "assets/hero-main.webp",
  "assets/hero-main.webp"
];

const IMAGE_ASPECTS = [1, 1, 1, 1, 1, 1];

const FACE_NAMES = [
  "JOYFRUITS",
  "PASSION FRUIT",
  "MANGO",
  "HERBAL MANGO",
  "THE CRAFT",
  "RESERVE"
];

const SWAP_RADIUS = 3;

const N = IMAGE_SRCS.length;
const STOPS = buildStops(N);

const stopIndex = (s) => Math.min(N - 1, Math.floor(s * (N - 1)));

function faceAtStop(i) {
  if (i < 6) return i;
  return 1 + ((i - 2) % 4);
}

function buildStops(n) {
  const base = [
    { rx: 90, ry: 0 },
    { rx: 0, ry: 0 },
    { rx: 0, ry: -90 },
    { rx: 0, ry: -180 },
    { rx: 0, ry: -270 },
    { rx: -90, ry: -360 }
  ];
  const out = base.slice(0, Math.min(n, 6));
  for (let i = 6; i < n; i++) {
    out.push({ rx: 0, ry: -360 - (i - 6) * 90 });
  }
  return out;
}

const dom = {
  cube: document.getElementById("cube"),
  faces: [...document.querySelectorAll(".face")],
  scrollEl: document.getElementById("scroll_container"),
  strip: document.getElementById("scene_strip"),
  hudPct: document.getElementById("hud_pct"),
  progFill: document.getElementById("prog_fill"),
  sceneName: document.getElementById("scene_name"),
  captionNum: document.getElementById("face_caption_num"),
  captionName: document.getElementById("face_caption_name"),
  themeToggle: document.getElementById("theme_toggle")
};

for (let i = dom.scrollEl.querySelectorAll("section").length; i < N; i++) {
  const sec = document.createElement("section");
  sec.id = `s${i}`;
  dom.scrollEl.appendChild(sec);
}

dom.strip.innerHTML = "";
for (let i = 0; i < N; i++) {
  const a = document.createElement("a");
  a.href = `#s${i}`;
  a.className = "scene-dot" + (i === 0 ? " active" : "");
  dom.strip.appendChild(a);
}

const sceneDots = [...document.querySelectorAll(".scene-dot")];
const sections = [...document.querySelectorAll("#scroll_container section")];

const faceImgIdx = new Array(6).fill(-1);
let currentStop = -1;

const imagePromises = new Map();

const getActiveSrc = (imgIdx) => IMAGE_SRCS[imgIdx];

const preloadImage = (src) => {
  if (imagePromises.has(src)) return imagePromises.get(src);
  const p = (async () => {
    const img = new Image();
    img.src = src;
    await img.decode().catch(() => {});
    return img;
  })();
  imagePromises.set(src, p);
  return p;
};

IMAGE_SRCS.forEach((src) => {
  preloadImage(src);
});

async function setFaceImage(faceIdx, imgIdx, force = false) {
  if (!force && faceIdx === faceAtStop(currentStop)) return;
  if (!force && faceImgIdx[faceIdx] === imgIdx) return;
  faceImgIdx[faceIdx] = imgIdx;

  const src = getActiveSrc(imgIdx);
  const face = dom.faces[faceIdx];

  await preloadImage(src);

  if (faceImgIdx[faceIdx] !== imgIdx) return;

  let img = face.querySelector("img");
  if (!img) {
    img = new Image();
    face.appendChild(img);
  }
  img.alt = FACE_NAMES[imgIdx] ?? "";
  img.src = src;
  img.style.objectFit = (IMAGE_ASPECTS[imgIdx] ?? 1) !== 1 ? "contain" : "";
}

for (let i = 0; i < Math.min(N, 6); i++) {
  if (IMAGE_SRCS[i]) setFaceImage(i, i, true);
}

function checkImageSwaps(smooth) {
  const base = stopIndex(smooth);
  for (let offset = -SWAP_RADIUS; offset <= SWAP_RADIUS; offset++) {
    if (offset === 0) continue;
    const si = base + offset;
    if (si < 0 || si >= N) continue;
    setFaceImage(faceAtStop(si), si);
  }
}

let lastFaceIdx = -1;

const updateHUD = (s) => {
  const p = Math.round(s * 100);
  const si = sectionIndexFromScroll(scrollY);
  currentStop = si;
  dom.hudPct.textContent = String(p).padStart(3, "0") + "%";
  dom.progFill.style.width = `${p}%`;
  if (si !== lastFaceIdx) {
    lastFaceIdx = si;
    const name = FACE_NAMES[si] ?? "";
    dom.sceneName.textContent = name;
    dom.captionNum.textContent = String(si + 1).padStart(2, "0");
    dom.captionName.textContent = name;
    sceneDots.forEach((d, i) => d.classList.toggle("active", i === si));
  }
};

const easeIO = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

const setCubeTransform = (s) => {
  if (N < 2 || STOPS.length < 2) return;
  const t = s * (N - 1);
  const i = Math.min(Math.floor(t), N - 2);
  const f = easeIO(t - i);
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const rx = a.rx + (b.rx - a.rx) * f;
  const ry = a.ry + (b.ry - a.ry) * f;
  dom.cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
};

let sectionTops = [];

const buildSectionTops = () => {
  sectionTops = sections.map(
    (s) => s.getBoundingClientRect().top + window.scrollY
  );
};

const sectionIndexFromScroll = (y) => {
  const mid = y + innerHeight * 0.5;
  let idx = 0;
  for (let i = 0; i < sectionTops.length; i++) {
    if (mid >= sectionTops[i]) idx = i;
  }
  return Math.min(idx, N - 1);
};

const mq = window.matchMedia("(prefers-color-scheme: dark)");
const getSystemTheme = () => (mq.matches ? "dark" : "light");

const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
};

applyTheme(getSystemTheme());
mq.addEventListener("change", (e) => applyTheme(e.matches ? "dark" : "light"));

dom.themeToggle.addEventListener("click", () => {
  const cur =
    document.documentElement.getAttribute("data-theme") || getSystemTheme();
  applyTheme(cur === "dark" ? "light" : "dark");
});

const mqSmall = window.matchMedia("(max-width: 56.25em)");

let maxScroll = 1;
let lastScrollHeight = 0;
let lastInnerHeight = 0;

const resize = () => {
  const h = document.documentElement.scrollHeight;
  const vh = innerHeight;
  if (h === lastScrollHeight && vh === lastInnerHeight) return;
  lastScrollHeight = h;
  lastInnerHeight = vh;
  maxScroll = Math.max(1, h - vh);
  buildSectionTops();
};

resize();

let tgt = 0;
let smooth = 0;
let velocity = 0;

const ease = 0.1;
const dynamicFriction = (v) => (Math.abs(v) > 200 ? 0.8 : 0.9);

window.addEventListener("resize", () => {
  resize();
  tgt = maxScroll > 0 ? scrollY / maxScroll : 0;
  smooth = tgt;
});

let resizePending = false;
const ro = new ResizeObserver(() => {
  if (resizePending) return;
  resizePending = true;
  requestAnimationFrame(() => {
    resize();
    tgt = maxScroll > 0 ? scrollY / maxScroll : 0;
    smooth = tgt;
    resizePending = false;
  });
});
ro.observe(document.documentElement);

window.addEventListener(
  "scroll",
  () => {
    tgt = maxScroll > 0 ? scrollY / maxScroll : 0;
    tgt = Math.max(0, Math.min(1, tgt));
  },
  { passive: true }
);

window.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const linePx = 16;
    const pagePx = innerHeight * 0.9;
    const delta =
      e.deltaMode === 1
        ? e.deltaY * linePx
        : e.deltaMode === 2
        ? e.deltaY * pagePx
        : e.deltaY;
    if (Math.abs(delta) < 5) return;
    stopAnchorAnim();
    velocity += delta;
    velocity = Math.max(-600, Math.min(600, velocity));
  },
  { passive: false }
);

const revealEls = [
  ...document.querySelectorAll(
    ".tag, h1, h2, .body-text, .stat-row, .cta, .cta-back, .h-line"
  )
];

const io = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        io.unobserve(e.target);
      }
    }),
  { threshold: 0.1 }
);
revealEls.forEach((el) => io.observe(el));

let lastNow = performance.now();

const frame = (now) => {
  requestAnimationFrame(frame);

  if (document.hidden) {
    lastNow = now;
    return;
  }

  const dt = Math.min((now - lastNow) / 1000, 0.05);
  lastNow = now;

  velocity *= Math.pow(dynamicFriction(velocity), dt * 60);
  if (Math.abs(velocity) < 0.01) velocity = 0;

  if (Math.abs(velocity) > 0.2) {
    const next = Math.max(0, Math.min(scrollY + velocity * ease, maxScroll));
    window.scrollTo(0, next);
    tgt = next / maxScroll;
  }

  smooth += (tgt - smooth) * (1 - Math.exp(-dt * 8));
  smooth = Math.max(0, Math.min(1, smooth));

  updateHUD(smooth);
  checkImageSwaps(smooth);
  setCubeTransform(smooth);
};

requestAnimationFrame(frame);

let anchorAnim = null;
let isAnchorScrolling = false;

const stopAnchorAnim = () => {
  if (anchorAnim) {
    cancelAnimationFrame(anchorAnim);
    anchorAnim = null;
  }
  isAnchorScrolling = false;
};

const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const smoothScrollToY = (targetY, duration = 900) => {
  stopAnchorAnim();
  velocity = 0;
  isAnchorScrolling = true;
  const startY = window.scrollY;
  const diff = targetY - startY;
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const y = startY + diff * easeInOutCubic(p);
    window.scrollTo(0, y);
    tgt = y / maxScroll;
    smooth = tgt;
    if (p < 1) {
      anchorAnim = requestAnimationFrame(tick);
    } else {
      anchorAnim = null;
      isAnchorScrolling = false;
    }
  };
  anchorAnim = requestAnimationFrame(tick);
};

window.addEventListener("touchstart", stopAnchorAnim, { passive: true });
window.addEventListener("mousedown", stopAnchorAnim, { passive: true });
window.addEventListener("keydown", stopAnchorAnim);

document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#s"]');
  if (!a) return;
  const target = document.querySelector(a.getAttribute("href"));
  if (!target) return;
  e.preventDefault();
  const isHero = a.getAttribute("href") === "#s0";
  const idx = sections.indexOf(target);
  const baseY =
    idx >= 0
      ? sectionTops[idx]
      : target.getBoundingClientRect().top + window.scrollY;
  const extraOffset =
    mqSmall.matches && !isHero
      ? Math.max(0, target.offsetHeight - innerHeight)
      : 0;
  smoothScrollToY(Math.max(0, baseY + extraOffset));
});

/* ── Cart ── */

const cart = {};
const cartBtn = document.getElementById("cart_btn");
const cartCount = document.getElementById("cart_count");

function updateCartCount() {
  const count = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
  cartCount.textContent = count;
  cartCount.setAttribute("data-empty", count === 0 ? "true" : "false");
}

document.addEventListener("click", (e) => {
  const buyBtn = e.target.closest(".buy-btn");
  if (!buyBtn) return;

  const id = buyBtn.dataset.product;
  const name = buyBtn.dataset.name;
  const price = parseInt(buyBtn.dataset.price, 10);

  if (cart[id]) {
    cart[id].qty++;
  } else {
    cart[id] = { name, price, qty: 1 };
  }

  updateCartCount();
  cartCount.classList.add("bump");
  setTimeout(() => cartCount.classList.remove("bump"), 300);

  const orig = buyBtn.textContent;
  buyBtn.textContent = "Added!";
  buyBtn.disabled = true;
  setTimeout(() => {
    buyBtn.textContent = orig;
    buyBtn.disabled = false;
  }, 800);
});

const cartDrawer = document.getElementById("cart_drawer");
const cartOverlay = document.getElementById("cart_overlay");
const cartClose = document.getElementById("cart_close");
const cartItemsEl = document.getElementById("cart_items");
const cartEmptyEl = document.getElementById("cart_empty");
const cartFooterEl = document.getElementById("cart_footer");
const cartTotalEl = document.getElementById("cart_total");

function openCart() {
  renderCart();
  cartDrawer.classList.add("open");
  cartOverlay.classList.add("open");
}

function closeCart() {
  cartDrawer.classList.remove("open");
  cartOverlay.classList.remove("open");
}

function renderCart() {
  const items = Object.entries(cart);
  const hasItems = items.length > 0;

  cartEmptyEl.hidden = hasItems;
  cartFooterEl.hidden = !hasItems;
  cartItemsEl.innerHTML = "";

  if (!hasItems) return;

  items.forEach(([id, item]) => {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <span class="cart-item-name">${item.name}</span>
      <span class="cart-item-price">€${item.price * item.qty}</span>
      <span class="cart-item-meta">€${item.price} each</span>
      <div class="cart-item-controls">
        <button class="cart-qty-btn" data-action="minus" data-id="${id}">−</button>
        <span class="cart-qty-num">${item.qty}</span>
        <button class="cart-qty-btn" data-action="plus" data-id="${id}">+</button>
      </div>
    `;
    cartItemsEl.appendChild(row);
  });

  const total = items.reduce((s, [, i]) => s + i.price * i.qty, 0);
  cartTotalEl.textContent = `€${total}`;
}

cartBtn.addEventListener("click", openCart);
cartClose.addEventListener("click", closeCart);
cartOverlay.addEventListener("click", closeCart);

cartItemsEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".cart-qty-btn");
  if (!btn) return;

  const id = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === "plus") {
    cart[id].qty++;
  } else if (action === "minus") {
    cart[id].qty--;
    if (cart[id].qty <= 0) delete cart[id];
  }

  updateCartCount();
  renderCart();
});

/* ── Checkout ── */

const checkoutOverlay = document.getElementById("checkout_overlay");
const checkoutClose = document.getElementById("checkout_close");
const checkoutSummary = document.getElementById("checkout_summary");
const checkoutTotal = document.getElementById("checkout_total");
const checkoutForm = document.getElementById("checkout_form");
const cardFieldset = document.getElementById("card_fieldset");
let paymentMethod = "cod";

function openCheckout() {
  const items = Object.entries(cart);
  if (items.length === 0) return;

  checkoutSummary.innerHTML = items
    .map(
      ([, item]) =>
        `<div class="checkout-summary-item">
          <span class="checkout-summary-name">${item.name} × ${item.qty}</span>
          <span class="checkout-summary-detail">€${item.price * item.qty}</span>
        </div>`
    )
    .join("");

  const total = items.reduce((s, [, i]) => s + i.price * i.qty, 0);
  checkoutTotal.textContent = `€${total}`;

  cardFieldset.hidden = paymentMethod !== "card";
  cardFieldset.querySelectorAll("input").forEach((inp) => {
    inp.required = paymentMethod === "card";
  });

  closeCart();
  checkoutOverlay.classList.add("open");
  checkoutOverlay.scrollTop = 0;
}

function closeCheckout() {
  checkoutOverlay.classList.remove("open");
}

document.getElementById("cart_checkout").addEventListener("click", openCheckout);
checkoutClose.addEventListener("click", closeCheckout);

document.querySelectorAll(".method-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".method-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    paymentMethod = btn.dataset.method;

    const isCard = paymentMethod === "card";
    cardFieldset.hidden = !isCard;
    cardFieldset.querySelectorAll("input").forEach((inp) => {
      inp.required = isCard;
    });
  });
});

checkoutForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const submitBtn = document.getElementById("checkout_submit");
  submitBtn.textContent = "Processing…";
  submitBtn.disabled = true;

  setTimeout(() => {
    closeCheckout();
    Object.keys(cart).forEach((k) => delete cart[k]);
    updateCartCount();
    checkoutForm.reset();
    submitBtn.textContent = "Confirm Order";
    submitBtn.disabled = false;

    const toast = document.createElement("div");
    toast.className = "order-toast";
    toast.textContent = "Order confirmed! Thank you.";
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }, 1200);
});
