/* =====================================================
   RAIZEN V2 — APP LOGIC
   ===================================================== */

const STORAGE_KEY = "raizen_v3_save";
const OLD_STORAGE_KEY = "raizen_v2_save";

const DEFAULT_PLAYER = {
  name: "Sorcerer",
  level: 1,
  xp: 0,
  coins: 500,
  gems: 100,
  rank: "E",
  wins: 0,
  losses: 0,
  favorites: [],
  collection: {},          // id -> { level, xp, favorite }
  team: [null, null, null],
  inventory: { upgrade_stone: 5, energy_potion: 2, summon_ticket: 1, xp_boost: 0 },
  quests: {},
  pity: 0,
  summons: 0,
  trainsDone: 0,
  upgradesDone: 0,
  battlesWon: 0,
  storyProgress: 0,
  summonHistory: [],
  activity: [],
  settings: { sound: true, particles: true, music: false },
  achievements: []
};

let player = null;
let currentFilter = "ALL";
let selectedTrainChar = null;
let battle = null;

const RAIZEN = {
  featuredId: "gojo",
  charMap: {},
  init() {
    RAIZEN_DATA.characters.forEach(c => { this.charMap[c.id] = c; });
  }
};

/* ---------- SAVE / LOAD ---------- */
function load() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const old = localStorage.getItem(OLD_STORAGE_KEY);
      if (old) { raw = old; localStorage.setItem(STORAGE_KEY, old); }
    }
    if (raw) {
      player = { ...DEFAULT_PLAYER, ...JSON.parse(raw) };
      // ensure nested
      player.collection = player.collection || {};
      player.team = player.team || [null, null, null];
      player.inventory = { ...DEFAULT_PLAYER.inventory, ...(player.inventory || {}) };
      player.settings = { ...DEFAULT_PLAYER.settings, ...(player.settings || {}) };
    } else {
      player = JSON.parse(JSON.stringify(DEFAULT_PLAYER));
      // starter collection
      ["yuji", "megumi", "nobara"].forEach(id => {
        player.collection[id] = { level: 1, xp: 0, favorite: false };
      });
      player.team = ["yuji", "megumi", "nobara"];
      save();
    }
  } catch (e) {
    player = JSON.parse(JSON.stringify(DEFAULT_PLAYER));
    ["yuji", "megumi", "nobara"].forEach(id => {
      player.collection[id] = { level: 1, xp: 0, favorite: false };
    });
    player.team = ["yuji", "megumi", "nobara"];
  }
  // daily quest reset simple
  const today = new Date().toDateString();
  if (player.questDate !== today) {
    player.questDate = today;
    player.quests = {};
    RAIZEN_DATA.quests.forEach(q => { player.quests[q.id] = 0; });
    save();
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
}

function resetProgress() {
  if (!confirm("Reset all progress? This cannot be undone.")) return;
  localStorage.removeItem(STORAGE_KEY);
  load();
  toast("Progress reset");
  nav("home");
  updateAll();
}

/* ---------- UTILS ---------- */
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

function xpForLevel(lv) { return lv * 100; }

function addXp(amount) {
  player.xp += amount;
  let leveled = false;
  let newLevel = player.level;
  while (player.xp >= xpForLevel(player.level) && player.level < 100) {
    player.xp -= xpForLevel(player.level);
    player.level++;
    leveled = true;
    newLevel = player.level;
    if (player.level % 10 === 0) {
      const ranks = RAIZEN_DATA.ranks;
      const idx = Math.min(Math.floor(player.level / 10), ranks.length - 1);
      player.rank = ranks[idx];
    }
  }
  if (leveled) {
    showLevelUp(newLevel);
  }
  save();
}

/* ---------- V3 CINEMATIC HELPERS ---------- */
function screenShake() {
  if (window.RaizenFX) RaizenFX.shake();
  const app = document.querySelector(".app");
  if (!app) return;
  app.classList.remove("shake");
  void app.offsetWidth;
  app.classList.add("shake");
  setTimeout(() => app.classList.remove("shake"), 450);
}

function spawnDmg(x, y, amount, isCrit) {
  if (window.RaizenFX) {
    const xp = Math.round((x / window.innerWidth) * 100) || 70;
    const yp = Math.round((y / window.innerHeight) * 100) || 40;
    RaizenFX.damage(amount, xp, yp, !!isCrit);
  }
  const layer = document.getElementById("dmgLayer");
  if (!layer) return;
  const el = document.createElement("div");
  el.className = "dmg-num " + (isCrit ? "crit" : "normal");
  el.textContent = (isCrit ? "CRIT " : "") + amount;
  el.style.left = (x || window.innerWidth / 2) + "px";
  el.style.top = (y || window.innerHeight / 3) + "px";
  layer.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

function showLevelUp(lv) {
  if (window.RaizenFX) {
    RaizenFX.levelUp(lv);
    RaizenFX.cursedEnergy();
  }
  const ov = document.getElementById("levelUpOverlay");
  const num = document.getElementById("levelUpNum");
  if (ov && num) {
    num.textContent = "Lv." + lv;
    ov.classList.add("show");
    setTimeout(() => ov.classList.remove("show"), 1800);
  }
  toast("Level Up! Lv." + lv);
}

/* Real domain id → video file (assets/videos/) — series-accurate mapping */
const DOMAIN_VIDEO_MAP = {
  unlimitedvoid: { file: "unlimitedvoid.mp4", name: "Unlimited Void", user: "Satoru Gojo" },
  malevolent: { file: "malevolent.mp4", name: "Malevolent Shrine", user: "Ryomen Sukuna" },
  selfembodiment: { file: "selfembodiment.mp4", name: "Self-Embodiment of Perfection", user: "Mahito" },
  chimera: { file: "chimera.mp4", name: "Chimera Shadow Garden", user: "Megumi Fushiguro" },
  idlegamble: { file: "idlegamble.mp4", name: "Idle Death Gamble", user: "Kinji Hakari" },
  deadlysentence: { file: "deadlysentence.mp4", name: "Deadly Sentencing", user: "Hiromi Higuruma" },
  authenticlove: { file: "authenticlove.mp4", name: "Authentic Mutual Love", user: "Yuta Okkotsu" },
  horizon: { file: "horizon.mp4", name: "Horizon of the Captivating Skandha", user: "Dagon" },
  coffin: { file: "coffin.mp4", name: "Coffin of the Iron Mountain", user: "Jogo" },
  timecell: { file: "timecell.mp4", name: "Time Cell Moon Palace", user: "Naoya Zenin" },
  wombprofusion: { file: "wombprofusion.mp4", name: "Womb Profusion", user: "Kenjaku" }
};

let _domainVideoFallback = null;

function getDomainIdByName(domainName) {
  if (!domainName || !RAIZEN_DATA.domains) return null;
  const d = RAIZEN_DATA.domains.find(x => x.name === domainName || x.id === domainName);
  return d ? d.id : null;
}

function playDomainVideo(domainId) {
  const info = DOMAIN_VIDEO_MAP[domainId];
  const ov = document.getElementById("domainVideoOverlay");
  const player = document.getElementById("domainVideoPlayer");
  const title = document.getElementById("domainVideoTitle");
  const fallback = document.getElementById("domainVideoFallback");
  const pathEl = document.getElementById("domainVideoPath");
  if (!ov || !player) return;

  const file = info ? info.file : (domainId + ".mp4");
  const src = "assets/videos/" + file;
  const label = info ? (info.name + " — " + info.user) : domainId;

  if (title) title.textContent = label;
  if (fallback) fallback.style.display = "none";
  player.style.display = "block";
  player.removeAttribute("src");
  player.querySelectorAll("source").forEach(s => s.remove());

  // try mp4 then webm
  const s1 = document.createElement("source");
  s1.src = src;
  s1.type = "video/mp4";
  player.appendChild(s1);
  const s2 = document.createElement("source");
  s2.src = src.replace(/\.mp4$/i, ".webm");
  s2.type = "video/webm";
  player.appendChild(s2);
  player.src = src;
  player.load();

  _domainVideoFallback = {
    name: info ? info.name : domainId,
    user: info ? info.user : "",
    theme: (RAIZEN_DATA.domains.find(d => d.id === domainId) || {}).theme || "void"
  };

  player.onerror = function () {
    player.style.display = "none";
    if (fallback) fallback.style.display = "block";
    if (pathEl) pathEl.textContent = src;
  };
  player.onloadeddata = function () {
    if (fallback) fallback.style.display = "none";
    player.style.display = "block";
    player.play().catch(() => {});
  };

  ov.classList.add("show");
  // stop bg music slightly so video audio clear (optional)
  try {
    if (typeof _bgmAudio !== "undefined" && _bgmAudio && !_bgmAudio.paused) {
      _bgmAudio.volume = 0.15;
    }
  } catch (e) {}
}

function closeDomainVideo() {
  const ov = document.getElementById("domainVideoOverlay");
  const player = document.getElementById("domainVideoPlayer");
  if (player) {
    try { player.pause(); player.removeAttribute("src"); player.load(); } catch (e) {}
  }
  if (ov) ov.classList.remove("show");
  try {
    if (typeof _bgmAudio !== "undefined" && _bgmAudio) _bgmAudio.volume = 0.45;
  } catch (e) {}
}

function activateDomainFromVideoFallback() {
  if (!_domainVideoFallback) return;
  activateDomain(_domainVideoFallback.name, _domainVideoFallback.user, _domainVideoFallback.theme);
}

function activateDomain(domainName, userName, styleClass, domainId) {
  const theme = styleClass || "void";
  const id = domainId || getDomainIdByName(domainName);

  // Always show short CSS cinematic first, then offer / auto video button
  if (window.RaizenFX) {
    RaizenFX.domain(domainName);
    RaizenFX.shake();
    RaizenFX.particles(theme === "shrine" || theme === "volcano" ? 80 : 55, true);
    if (theme === "gamble") RaizenFX.flash();
  }
  const ov = document.getElementById("domainOverlay");
  if (ov) {
    ov.innerHTML = `
      <div class="domain-barrier"></div>
      <div class="domain-symbols"></div>
      <div class="domain-ring ring-1"></div>
      <div class="domain-ring ring-2"></div>
      <div class="domain-title" id="domainTitle"></div>
      <div class="domain-sub" id="domainSub"></div>
      <div class="domain-label">DOMAIN EXPANSION</div>
      <button type="button" class="domain-watch-video-btn" id="domainWatchBtn">▶ REAL ANIMATION (VIDEO)</button>
    `;
    ov.className = "domain-overlay show " + theme;
    const t = document.getElementById("domainTitle");
    const s = document.getElementById("domainSub");
    if (t) t.textContent = domainName;
    if (s) s.textContent = userName ? ("— " + userName + " —") : "";
    const watchBtn = document.getElementById("domainWatchBtn");
    if (watchBtn && id) {
      watchBtn.onclick = function (e) {
        e.stopPropagation();
        ov.classList.add("hide");
        setTimeout(() => { ov.className = "domain-overlay"; }, 400);
        playDomainVideo(id);
      };
    } else if (watchBtn) {
      watchBtn.style.display = "none";
    }
    setTimeout(() => {
      if (!ov.classList.contains("show")) return;
      ov.classList.add("hide");
      setTimeout(() => {
        if (ov.classList.contains("hide")) {
          ov.className = "domain-overlay";
          ov.innerHTML = `<div class="domain-barrier"></div><div class="domain-title" id="domainTitle"></div><div class="domain-sub" id="domainSub"></div>`;
        }
      }, 550);
    }, 3200);
  }
  screenShake();
}

function showSummonReveal(char, rarity) {
  if (window.RaizenFX) {
    RaizenFX.ring();
    RaizenFX.particles(45, rarity === "MYTHIC" || rarity === "LEGENDARY");
    RaizenFX.flash();
  }
  const ov = document.getElementById("summonReveal");
  const sil = document.getElementById("summonSil");
  const rar = document.getElementById("summonRarityText");
  const nam = document.getElementById("summonNameText");
  if (!ov) return;
  sil.className = "summon-card-sil";
  if (rarity === "MYTHIC") sil.classList.add("mythic");
  else if (rarity === "LEGENDARY") sil.classList.add("legendary");
  sil.textContent = char.name[0];
  sil.style.borderColor = rarityColor(rarity);
  rar.textContent = rarity;
  rar.style.color = rarityColor(rarity);
  nam.textContent = char.name;
  ov.classList.add("show");
  setTimeout(() => ov.classList.remove("show"), 2200);
}

function getCharStats(id) {
  const base = RAIZEN.charMap[id];
  if (!base) return null;
  const col = player.collection[id] || { level: 1 };
  const mult = 1 + (col.level - 1) * 0.08;
  return {
    hp: Math.floor(base.baseStats.hp * mult),
    atk: Math.floor(base.baseStats.atk * mult),
    def: Math.floor(base.baseStats.def * mult),
    spd: Math.floor(base.baseStats.spd * mult),
    energy: Math.floor(base.baseStats.energy * mult),
    level: col.level
  };
}

function rarityColor(r) {
  return (RAIZEN_DATA.rarities[r] || {}).color || "#9ca3af";
}

/* ---------- V3.1 PORTRAIT + MUSIC ---------- */
const CHAR_COLORS = {
  gojo: ["#6366f1", "#22d3ee"], yuji: ["#f43f5e", "#fb7185"], megumi: ["#1e3a5f", "#64748b"],
  nobara: ["#f59e0b", "#ea580c"], nanami: ["#eab308", "#a16207"], yuta: ["#0ea5e9", "#6366f1"],
  maki: ["#22c55e", "#14532d"], todo: ["#f97316", "#9a3412"], sukuna: ["#7f1d1d", "#ef4444"],
  geto: ["#4c1d95", "#a78bfa"], mahito: ["#6b21a8", "#e879f9"], choso: ["#991b1b", "#f87171"],
  toji: ["#334155", "#94a3b8"], hakari: ["#ca8a04", "#fde047"], higuruma: ["#1e293b", "#64748b"],
  yuki: ["#fbbf24", "#fef3c7"], kashimo: ["#06b6d4", "#e0f2fe"], panda: ["#292524", "#a8a29e"],
  inumaki: ["#67e8f9", "#0e7490"], shoko: ["#a3a3a3", "#525252"],
  jogo: ["#ea580c", "#7f1d1d"], hanami: ["#166534", "#4ade80"], dagon: ["#0e7490", "#22d3ee"],
  kenjaku: ["#581c87", "#c084fc"], naoya: ["#1e293b", "#94a3b8"], uraume: ["#e0f2fe", "#38bdf8"],
  ryu: ["#78716c", "#a8a29e"], uro: ["#7c3aed", "#c4b5fd"], meimei: ["#292524", "#fbbf24"],
  angel: ["#fef3c7", "#f59e0b"],
  mai: ["#9ca3af", "#e5e7eb"], miwa: ["#60a5fa", "#1e3a8a"],
  mechamaru: ["#57534e", "#a8a29e"], utahime: ["#c4b5fd", "#5b21b6"],
  takaba: ["#fde047", "#a3e635"], yorozu: ["#f9a8d4", "#be185d"],
  junpei: ["#86efac", "#166534"], uiui: ["#fbcfe8", "#9d174d"]
};

// Preferred enemy pool (curses / villains / antagonists)
const ENEMY_POOL_IDS = ["sukuna","mahito","jogo","hanami","dagon","kenjaku","naoya","uraume","geto","choso","toji","kashimo","ryu","uro","higuruma"];

function charImgPath(id, variant) {
  // User drops files here: assets/images/characters/{id}.png (or .jpg / .webp)
  const base = "assets/images/characters/" + id;
  if (variant === "card") return base + "-card.png";
  return base + ".png";
}

function portraitInner(char) {
  if (!char) return "?";
  const cols = CHAR_COLORS[char.id] || ["#4338ca", "#7c3aed"];
  const letter = (char.name || "?")[0];
  const src = charImgPath(char.id);
  // img tries user photo; onerror falls back to animated letter portrait
  return `<div class="portrait-anim" style="width:100%;height:100%;min-height:70px;background:linear-gradient(160deg,${cols[0]},#0a0a12 50%,${cols[1]});display:flex;align-items:center;justify-content:center;border-radius:inherit;overflow:hidden;position:relative">
    <img class="char-photo" src="${src}" alt="" loading="lazy"
      style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:2;display:block"
      onerror="this.style.display='none';this.nextElementSibling&&(this.nextElementSibling.style.display='flex')"/>
    <div class="portrait-fallback" style="display:none;width:100%;height:100%;align-items:center;justify-content:center;position:relative;z-index:1">
      <div class="p-glow" style="background:radial-gradient(circle,${cols[0]}aa,transparent 70%)"></div>
      <div class="p-ring" style="border-color:${cols[1]}66"></div>
      <span class="p-letter" style="font-size:1.6em">${letter}</span>
    </div>
    <div class="p-glow" style="background:radial-gradient(circle,${cols[0]}66,transparent 70%);z-index:3;pointer-events:none"></div>
  </div>`;
}

function portraitHTML(char, sizeClass) {
  if (!char) return "";
  const cols = CHAR_COLORS[char.id] || ["#4338ca", "#7c3aed"];
  const bg = `linear-gradient(160deg, ${cols[0]} 0%, #0f0f1a 55%, ${cols[1]} 100%)`;
  const letter = (char.name || "?")[0];
  const dots = [12, 28, 45, 62, 78].map((left, i) =>
    `<span class="p-dot" style="left:${left}%;bottom:${8 + (i % 3) * 6}%;animation-delay:${i * 0.35}s;background:${cols[1]}"></span>`
  ).join("");
  return `<div class="portrait-anim ${sizeClass || ""}" style="background:${bg}">
    <div class="p-glow" style="background:radial-gradient(circle, ${cols[0]}99, transparent 70%)"></div>
    <div class="p-ring" style="border-color:${cols[1]}55"></div>
    <span class="p-letter">${letter}</span>
    ${dots}
  </div>`;
}

/* ---------- MUSIC PLAYER (3 tracks) ---------- */
const MUSIC_TRACKS = [
  { id: "bgm",    file: "assets/audio/bgm.mp3",    label: "Home / Ambient", icon: "🏠" },
  { id: "battle", file: "assets/audio/battle.mp3", label: "Battle Theme",   icon: "⚔️" },
  { id: "summon", file: "assets/audio/summon.mp3", label: "Summon Theme",   icon: "✨" }
];

let _audioCtx = null, _musicNodes = null, _musicOn = false;
let _bgmAudio = null;
let _currentTrack = 0;
let _panelOpen = false;

function ensureAudio() {
  if (_audioCtx) return _audioCtx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  _audioCtx = new AC();
  return _audioCtx;
}

function toggleMusicPanel() {
  _panelOpen = !_panelOpen;
  const panel = document.getElementById("musicPanel");
  if (panel) panel.classList.toggle("open", _panelOpen);
  if (_panelOpen) renderMusicTracks();
}

function renderMusicTracks() {
  const list = document.getElementById("musicTrackList");
  if (!list) return;
  list.innerHTML = MUSIC_TRACKS.map((t, i) => `
    <div class="music-track ${i === _currentTrack && _musicOn ? "active" : ""}" onclick="playTrack(${i})">
      <span class="t-icon">${t.icon}</span>
      <span>${t.label}</span>
    </div>`).join("");
  updateMusicUI();
}

function updateMusicUI() {
  const fab = document.getElementById("musicFab");
  const playBtn = document.getElementById("musicPlayBtn");
  const nowLabel = document.getElementById("musicNowLabel");
  const track = MUSIC_TRACKS[_currentTrack];
  if (fab) {
    fab.classList.toggle("on", _musicOn);
    fab.classList.toggle("off", !_musicOn);
    fab.textContent = _musicOn ? "🎶" : "🎵";
  }
  if (playBtn) playBtn.textContent = _musicOn ? "⏸" : "▶";
  if (nowLabel) nowLabel.textContent = _musicOn ? (track.icon + " " + track.label) : "Off";
  // profile toggle
  const tog = document.getElementById("togMusic");
  if (tog) tog.classList.toggle("on", !!_musicOn);
}

function playTrack(idx) {
  if (idx < 0 || idx >= MUSIC_TRACKS.length) return;
  _currentTrack = idx;
  stopAmbientMusic();
  startAmbientMusic();
  if (player && player.settings) {
    player.settings.music = true;
    player.settings.track = idx;
    save();
  }
  renderMusicTracks();
  toast(MUSIC_TRACKS[idx].icon + " " + MUSIC_TRACKS[idx].label);
}

function prevTrack() {
  playTrack((_currentTrack - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length);
}

function nextTrack() {
  playTrack((_currentTrack + 1) % MUSIC_TRACKS.length);
}

function startAmbientMusic() {
  stopAmbientMusic();
  const track = MUSIC_TRACKS[_currentTrack];
  _bgmAudio = new Audio(track.file);
  _bgmAudio.loop = true;
  _bgmAudio.volume = 0.45;
  _bgmAudio.addEventListener("error", () => {
    // try next extension or fallback drone
    if (track.file.endsWith(".mp3")) {
      _bgmAudio = new Audio(track.file.replace(".mp3", ".ogg"));
      _bgmAudio.loop = true;
      _bgmAudio.volume = 0.45;
      _bgmAudio.play().catch(() => _startFallbackDrone());
    } else {
      _startFallbackDrone();
    }
  });
  const p = _bgmAudio.play();
  if (p && p.catch) p.catch(() => { _startFallbackDrone(); });
  _musicOn = true;
  updateMusicUI();
}

function _startFallbackDrone() {
  const ctx = ensureAudio();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();
  if (_musicNodes) return;
  const master = ctx.createGain();
  master.gain.value = 0.04;
  master.connect(ctx.destination);
  const freqs = [110, 164.81, 220];
  const oscs = freqs.map(f => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = f;
    g.gain.value = 0.12;
    o.connect(g); g.connect(master); o.start();
    return { o, g };
  });
  _musicNodes = { master, oscs };
  _musicOn = true;
  updateMusicUI();
}

function stopAmbientMusic() {
  if (_bgmAudio) {
    try { _bgmAudio.pause(); _bgmAudio.currentTime = 0; } catch (e) {}
    _bgmAudio = null;
  }
  if (_musicNodes) {
    try {
      _musicNodes.oscs.forEach(n => { try { n.o.stop(); } catch(e){} });
      _musicNodes.master.disconnect();
    } catch (e) {}
    _musicNodes = null;
  }
  _musicOn = false;
  updateMusicUI();
}

function toggleMusic() {
  if (!player.settings) player.settings = {};
  if (_musicOn) {
    stopAmbientMusic();
    player.settings.music = false;
    toast("Music off");
  } else {
    // restore saved track if any
    if (typeof player.settings.track === "number") _currentTrack = player.settings.track;
    startAmbientMusic();
    player.settings.music = true;
    toast(MUSIC_TRACKS[_currentTrack].icon + " " + MUSIC_TRACKS[_currentTrack].label);
  }
  save();
  renderMusicTracks();
}


/* ---------- NAV ---------- */
function nav(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const el = document.getElementById("page-" + page);
  if (el) el.classList.add("active");
  document.querySelectorAll(".nav-item").forEach(n => {
    n.classList.toggle("active", n.dataset.page === page);
  });
  // render page-specific
  if (page === "home") renderHome();
  if (page === "characters") renderCharacters();
  if (page === "collection") renderCollection();
  if (page === "battle") renderBattleSetup();
  if (page === "team") renderTeam();
  if (page === "summon") renderSummon();
  if (page === "training") renderTraining();
  if (page === "quests") renderQuests();
  if (page === "inventory") renderInventory();
  if (page === "profile") renderProfile();
  if (page === "techniques") renderTechniques();
  if (page === "domains") renderDomains();
  if (page === "story") renderStory();
  window.scrollTo(0, 0);
}

/* ---------- HEADER ---------- */
function updateHeader() {
  document.getElementById("hdrCoins").textContent = "🪙 " + player.coins;
  document.getElementById("hdrGems").textContent = "💎 " + player.gems;
}

/* ---------- HOME ---------- */
function renderHome() {
  updateHeader();
  document.getElementById("homeName").textContent = player.name;
  document.getElementById("homeLevel").textContent = "Lv." + player.level;
  document.getElementById("homeRank").textContent = "Rank " + player.rank;
  document.getElementById("homeRankBadge").textContent = player.rank;
  document.getElementById("homeAvatar").textContent = player.name[0].toUpperCase();
  const need = xpForLevel(player.level);
  document.getElementById("homeXp").style.width = Math.min(100, (player.xp / need) * 100) + "%";

  // featured
  const fc = RAIZEN.charMap[RAIZEN.featuredId];
  if (fc) {
    document.getElementById("featuredChar").innerHTML = `
      <div class="char-portrait" style="padding:0;overflow:hidden;position:relative">${portraitInner(fc)}<span class="rarity-dot" style="background:${rarityColor(fc.rarity)}"></span></div>
      <div>
        <div style="font-weight:700">${fc.name}</div>
        <div style="font-size:0.75rem;color:var(--muted)">${fc.alias} · ${fc.rarity}</div>
        <div style="font-size:0.75rem;margin-top:4px;color:var(--silver)">${fc.description.slice(0, 80)}...</div>
      </div>`;
  }

  // daily news (rotate by day)
  const newsBox = document.getElementById("homeNews");
  if (newsBox && RAIZEN_DATA.dailyNews) {
    const dayIdx = new Date().getDate() % RAIZEN_DATA.dailyNews.length;
    // show 3 news: today + next 2
    const newsItems = [];
    for (let i = 0; i < 3; i++) {
      newsItems.push(RAIZEN_DATA.dailyNews[(dayIdx + i) % RAIZEN_DATA.dailyNews.length]);
    }
    newsBox.innerHTML = newsItems.map(n => `
      <div class="news-card">
        <div class="news-icon">${n.icon}</div>
        <div class="news-body">
          <span class="news-tag ${n.tag}">${n.tag}</span>
          <div class="news-title">${n.title}</div>
          <div class="news-text">${n.body}</div>
        </div>
      </div>`).join("");
  }

  // missions preview
  const mBox = document.getElementById("homeMissions");
  mBox.innerHTML = RAIZEN_DATA.quests.slice(0, 3).map(q => {
    const prog = player.quests[q.id] || 0;
    const done = prog >= q.target;
    return `<div class="glass mission-item">
      <div><div style="font-weight:600;font-size:0.85rem">${q.title}</div>
      <div style="font-size:0.7rem;color:var(--muted)">${prog}/${q.target}</div></div>
      ${done ? `<button class="btn btn-sm btn-green claim-btn" onclick="claimQuest('${q.id}')">CLAIM</button>` : `<span style="font-size:0.7rem;color:var(--muted)">In progress</span>`}
    </div>`;
  }).join("");

  // activity
  const act = document.getElementById("homeActivity");
  const list = (player.activity || []).slice(-5).reverse();
  act.innerHTML = list.length ? list.map(a => `<div class="glass activity-item"><span>${a}</span></div>`).join("") : `<div class="glass activity-item" style="color:var(--muted)">No recent activity</div>`;
}

/* ---------- CHARACTERS ---------- */
function renderCharacters() {
  const filters = ["ALL", "MYTHIC", "LEGENDARY", "EPIC", "RARE", "Special Grade", "Grade 1"];
  document.getElementById("charFilters").innerHTML = filters.map(f =>
    `<div class="filter-chip ${currentFilter === f ? "active" : ""}" onclick="setFilter('${f}')">${f}</div>`
  ).join("");
  filterChars();
}

function setFilter(f) {
  currentFilter = f;
  renderCharacters();
}

function filterChars() {
  const q = (document.getElementById("charSearch")?.value || "").toLowerCase();
  let list = RAIZEN_DATA.characters;
  if (currentFilter !== "ALL") {
    list = list.filter(c => c.rarity === currentFilter || c.grade.includes(currentFilter));
  }
  if (q) list = list.filter(c => c.name.toLowerCase().includes(q) || c.alias.toLowerCase().includes(q));
  const grid = document.getElementById("charGrid");
  grid.innerHTML = list.map(c => {
    const owned = !!player.collection[c.id];
    const fav = player.favorites.includes(c.id);
    return `<div class="card char-card rarity-${c.rarity}" onclick="openCharDetail('${c.id}')" style="opacity:${owned ? 1 : 0.72}">
      <div class="card-art portrait" style="padding:0;overflow:hidden;height:115px">${portraitInner(c)}
        <span class="card-rarity" style="background:${rarityColor(c.rarity)}">${c.rarity}</span>
        <button class="fav-btn ${fav ? "on" : ""}" onclick="event.stopPropagation();toggleFav('${c.id}')">${fav ? "★" : "☆"}</button>
      </div>
      <div class="card-info">
        <div class="card-name">${c.name}</div>
        <div class="card-meta">${c.grade}</div>
        ${owned ? `<div class="card-owned">Owned · Lv.${player.collection[c.id].level}</div>` : `<div class="card-meta">Not owned</div>`}
      </div>
    </div>`;
  }).join("");
}

function toggleFav(id) {
  const i = player.favorites.indexOf(id);
  if (i >= 0) player.favorites.splice(i, 1);
  else player.favorites.push(id);
  save();
  filterChars();
  if (document.getElementById("page-collection").classList.contains("active")) renderCollection();
}

function openCharDetail(id) {
  const c = RAIZEN.charMap[id];
  if (!c) return;
  const stats = getCharStats(id) || c.baseStats;
  const owned = player.collection[id];
  const modal = document.getElementById("modal");
  const content = document.getElementById("modalContent");
  const techList = (c.abilities || []).map(a =>
    `<span style="display:inline-block;background:var(--bg3);padding:4px 10px;border-radius:8px;margin:3px;border:1px solid var(--border);font-size:0.78rem">${a}</span>`
  ).join("");
  const rel = (c.relationships || []).map(r =>
    `<span style="display:inline-block;color:var(--silver);font-size:0.8rem;margin-right:8px">· ${r}</span>`
  ).join("");
  const story = (c.story || []).map(s =>
    `<span style="display:inline-block;background:rgba(99,102,241,0.15);padding:3px 8px;border-radius:6px;margin:2px;font-size:0.72rem;color:var(--blue-light)">${s}</span>`
  ).join("");
  content.innerHTML = `
    <button class="modal-close" onclick="closeModal()">✕</button>
    <div style="text-align:center;margin-bottom:14px">
      <div class="big-portrait" style="padding:0;width:110px;height:130px">${portraitInner(c)}</div>
      <div style="font-size:1.25rem;font-weight:800;margin-top:8px">${c.name}</div>
      <div style="color:var(--muted);font-size:0.85rem">${c.alias || ""}</div>
      <div style="margin-top:6px">
        <span style="background:${rarityColor(c.rarity)};color:#000;padding:2px 8px;border-radius:4px;font-size:0.68rem;font-weight:800">${c.rarity}</span>
        <span style="font-size:0.75rem;color:var(--muted);margin-left:6px">${c.grade}</span>
        <span style="font-size:0.75rem;color:var(--cyan);margin-left:6px">${c.role || ""}</span>
      </div>
      <div style="font-size:0.75rem;color:var(--silver);margin-top:4px">${c.affiliation || ""}</div>
    </div>
    <div style="font-size:0.88rem;color:var(--silver);line-height:1.55;margin-bottom:12px">${c.description}</div>
    <div class="section-title" style="margin-top:0">Combat Stats ${owned ? `(Lv.${owned.level})` : ""}</div>
    ${["hp","atk","def","spd","energy"].map(s => {
      const val = stats[s] || c.baseStats[s];
      const max = 1500;
      const col = s==="hp"?"#22c55e":s==="atk"?"#ef4444":s==="def"?"#3b82f6":s==="spd"?"#22d3ee":"#a855f7";
      return `<div class="stat-row"><span style="text-transform:uppercase;font-size:0.72rem;color:var(--muted)">${s}</span><span style="font-weight:700">${val}</span></div>
      <div class="stat-bar"><div class="stat-bar-fill" style="width:${Math.min(100,val/max*100)}%;background:${col}"></div></div>`;
    }).join("")}
    <div class="section-title">Personality</div>
    <div style="font-size:0.85rem;color:var(--silver)">${c.personality || "—"}</div>
    <div class="section-title">Fighting Style</div>
    <div style="font-size:0.85rem;color:var(--silver)">${c.fightingStyle || "—"}</div>
    <div class="section-title">Abilities & Techniques</div>
    <div>${techList || "—"}</div>
    ${c.domain ? `<div class="section-title">Domain Expansion</div>
    <div style="font-size:0.9rem;color:var(--cyan);font-weight:700">${c.domain}</div>
    <button class="btn btn-sm btn-outline" style="margin-top:8px" onclick="activateDomain('${c.domain.replace(/'/g,"")}','${c.name}', '${({gojo:'void',sukuna:'shrine',megumi:'shadow',mahito:'perfection',hakari:'gamble',higuruma:'court',yuta:'love'})[c.id]||'void'}')">VIEW DOMAIN FX</button>` : ""}
    <div class="section-title">Strengths</div>
    <div style="font-size:0.8rem;color:var(--green)">${(c.strengths||[]).join(" · ") || "—"}</div>
    <div class="section-title">Limitations</div>
    <div style="font-size:0.8rem;color:var(--red)">${(c.limitations||[]).join(" · ") || "—"}</div>
    <div class="section-title">Relationships</div>
    <div>${rel || "—"}</div>
    <div class="section-title">Story Involvement</div>
    <div style="margin-bottom:8px">${story || "—"}</div>
    ${c.trivia ? `<div class="section-title">Trivia</div><div style="font-size:0.8rem;color:var(--muted)">${c.trivia}</div>` : ""}
    ${owned
      ? `<button class="btn btn-block" style="margin-top:16px" onclick="upgradeChar('${id}');closeModal()">UPGRADE (${50 * owned.level} 🪙)</button>`
      : `<div style="margin-top:16px;text-align:center;color:var(--muted);font-size:0.85rem">Summon to add to collection</div>`}
  `;
  modal.classList.add("show");
}


function closeModal() {
  document.getElementById("modal").classList.remove("show");
}

function upgradeChar(id) {
  const col = player.collection[id];
  if (!col) return;
  const cost = 50 * col.level;
  if (player.coins < cost) { toast("Not enough coins"); return; }
  player.coins -= cost;
  col.level++;
  player.upgradesDone = (player.upgradesDone || 0) + 1;
  progressQuest("upgradesDone");
  addActivity(`Upgraded ${RAIZEN.charMap[id].name} to Lv.${col.level}`);
  save();
  updateHeader();
  toast(`${RAIZEN.charMap[id].name} → Lv.${col.level}`);
  // V3: brief level-up style feedback for character
  const ov = document.getElementById("levelUpOverlay");
  if (ov) {
    document.getElementById("levelUpNum").textContent = RAIZEN.charMap[id].name + " Lv." + col.level;
    ov.classList.add("show");
    setTimeout(() => ov.classList.remove("show"), 1400);
  }
}

/* ---------- COLLECTION ---------- */
function renderCollection() {
  const q = (document.getElementById("colSearch")?.value || "").toLowerCase();
  const ids = Object.keys(player.collection);
  let list = ids.map(id => RAIZEN.charMap[id]).filter(Boolean);
  if (q) list = list.filter(c => c.name.toLowerCase().includes(q));
  // sort by rarity then level
  list.sort((a, b) => {
    const ro = rarityOrder(b.rarity) - rarityOrder(a.rarity);
    if (ro !== 0) return ro;
    return (player.collection[b.id]?.level || 1) - (player.collection[a.id]?.level || 1);
  });
  // filters
  const filters = ["ALL", "MYTHIC", "LEGENDARY", "EPIC", "RARE", "FAV"];
  const fBox = document.getElementById("colFilters");
  if (fBox) {
    fBox.innerHTML = filters.map(f =>
      `<div class="filter-chip ${window._colFilter === f ? "active" : ""}" onclick="window._colFilter='${f}';renderCollection()">${f}</div>`
    ).join("");
  }
  if (window._colFilter && window._colFilter !== "ALL") {
    if (window._colFilter === "FAV") list = list.filter(c => player.favorites.includes(c.id));
    else list = list.filter(c => c.rarity === window._colFilter);
  }
  const grid = document.getElementById("colGrid");
  if (!list.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:30px">No cards yet. Summon or start with the free team!</div>`;
    return;
  }
  grid.innerHTML = list.map(c => {
    const col = player.collection[c.id];
    const fav = player.favorites.includes(c.id);
    return `<div class="card char-card glow rarity-${c.rarity}" onclick="openCharDetail('${c.id}')">
      <div class="portrait" style="padding:0;overflow:hidden">${portraitInner(c)}
        <span class="rarity-tag" style="background:${rarityColor(c.rarity)}">${c.rarity}</span>
        <button class="fav-btn ${fav ? "on" : ""}" onclick="event.stopPropagation();toggleFav('${c.id}')">${fav ? "★" : "☆"}</button>
      </div>
      <div class="name">${c.name}</div>
      <div class="grade">Lv.${col.level}</div>
    </div>`;
  }).join("");
}

/* ---------- TEAM ---------- */
function renderTeam() {
  const slots = document.getElementById("teamBuilderSlots");
  slots.innerHTML = [0,1,2].map(i => {
    const id = player.team[i];
    if (!id) return `<div class="team-slot" onclick="toast('Select a character below')">+</div>`;
    const c = RAIZEN.charMap[id];
    return `<div class="team-slot filled" onclick="removeFromTeam(${i})">
      <div class="slot-portrait">${c.name[0]}</div>
      <div style="font-size:0.7rem;font-weight:600">${c.name.split(" ").pop()}</div>
    </div>`;
  }).join("");

  let power = 0;
  player.team.forEach(id => {
    if (id) {
      const s = getCharStats(id);
      if (s) power += s.hp + s.atk + s.def + s.spd;
    }
  });
  document.getElementById("teamPower").textContent = power;

  // simple synergy
  const names = player.team.filter(Boolean).map(id => RAIZEN.charMap[id]?.name);
  let syn = "None";
  if (names.includes("Yuji Itadori") && names.includes("Megumi Fushiguro")) syn = "Tokyo First Years (+5% ATK)";
  if (names.includes("Satoru Gojo") && names.includes("Suguru Geto")) syn = "Strongest Duo (+8% all)";
  if (names.filter(n => n && (n.includes("Gojo") || n.includes("Sukuna") || n.includes("Yuta"))).length >= 2) syn = "Special Grades (+10% HP)";
  document.getElementById("teamSynergy").textContent = "Synergy: " + syn;

  const owned = Object.keys(player.collection);
  document.getElementById("teamSelectGrid").innerHTML = owned.map(id => {
    const c = RAIZEN.charMap[id];
    const inTeam = player.team.includes(id);
    return `<div class="card char-card" style="opacity:${inTeam?0.5:1}" onclick="addToTeam('${id}')">
      <div class="portrait" style="padding:0;overflow:hidden">${portraitInner(c)}</div>
      <div class="name">${c.name}</div>
    </div>`;
  }).join("");
}

function addToTeam(id) {
  if (player.team.includes(id)) { toast("Already in team"); return; }
  const empty = player.team.findIndex(s => !s);
  if (empty < 0) { toast("Team full — remove one first"); return; }
  player.team[empty] = id;
  save();
  renderTeam();
  toast("Added to team");
}

function removeFromTeam(i) {
  player.team[i] = null;
  save();
  renderTeam();
}

/* ---------- BATTLE ---------- */
function renderBattleSetup() {
  const slots = document.getElementById("battleTeamSlots");
  slots.innerHTML = [0,1,2].map(i => {
    const id = player.team[i];
    if (!id) return `<div class="team-slot">Empty</div>`;
    const c = RAIZEN.charMap[id];
    return `<div class="team-slot filled"><div class="slot-portrait">${c.name[0]}</div><div style="font-size:0.7rem">${c.name.split(" ").pop()}</div></div>`;
  }).join("");
  document.getElementById("battleSetup").style.display = "block";
  document.getElementById("battleArena").style.display = "none";
}

function startBattle() {
  const team = player.team.filter(Boolean);
  if (team.length < 1) { toast("Add at least 1 character to team"); return; }

  // enemy: prefer real curses/villains, fill from rest if needed
  let pool = ENEMY_POOL_IDS.filter(id => RAIZEN.charMap[id] && !team.includes(id));
  if (pool.length < 3) {
    const extra = RAIZEN_DATA.characters.map(c => c.id).filter(id => !team.includes(id) && !pool.includes(id));
    pool = pool.concat(extra);
  }
  const enemyIds = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    enemyIds.push(pool.splice(idx, 1)[0]);
  }

  function makeFighter(id, isPlayer) {
    const c = RAIZEN.charMap[id];
    const stats = isPlayer ? getCharStats(id) : { ...c.baseStats, level: 1 + Math.floor(Math.random() * 3) };
    // Player full power; enemy slightly weaker for fun fair fights
    const mult = isPlayer ? 1 : 0.72 + (stats.level - 1) * 0.03;
    return {
      id, name: c.name, isPlayer,
      maxHp: Math.floor((stats.hp || c.baseStats.hp) * mult),
      hp: Math.floor((stats.hp || c.baseStats.hp) * mult),
      atk: Math.floor((stats.atk || c.baseStats.atk) * mult * (isPlayer ? 1 : 0.85)),
      def: Math.floor((stats.def || c.baseStats.def) * mult),
      spd: Math.floor((stats.spd || c.baseStats.spd) * mult),
      maxEnergy: Math.floor((stats.energy || c.baseStats.energy) * (isPlayer ? 1 : 0.9)),
      energy: Math.floor((stats.energy || c.baseStats.energy) * 0.45),
      skills: c.skills,
      alive: true,
      guard: false
    };
  }

  battle = {
    player: team.map(id => makeFighter(id, true)),
    enemy: enemyIds.map(id => makeFighter(id, false)),
    turnOrder: [],
    turnIdx: 0,
    log: [],
    over: false,
    selectedTarget: 0,
    combo: 0
  };

  // turn order by spd
  const all = [...battle.player, ...battle.enemy].filter(f => f.alive);
  all.sort((a, b) => b.spd - a.spd);
  battle.turnOrder = all;

  document.getElementById("battleSetup").style.display = "none";
  const arena = document.getElementById("battleArena");
  arena.style.display = "block";
  // atmospheric fog layer
  if (!arena.querySelector(".arena-fog")) {
    const fog = document.createElement("div");
    fog.className = "arena-fog";
    fog.innerHTML = "<span style=\"left:10%;top:20%;animation-delay:0s\"></span><span style=\"left:60%;top:50%;animation-delay:2s\"></span><span style=\"left:30%;top:70%;animation-delay:4s\"></span>";
    arena.insertBefore(fog, arena.firstChild);
  }
  battle._combo = 0;
  renderBattleUI();
  logBattle("Battle started! Cursed energy fills the air...");
  if (window.RaizenFX) { RaizenFX.particles(20); RaizenFX.ring(); }
  const lead = battle.player.find(f => f.alive);
  if (lead) showDialogue(lead.id, lead.name, "Lets finish this!");
  nextTurn();
}

function renderBattleUI() {
  const pBox = document.getElementById("playerBattleTeam");
  const eBox = document.getElementById("enemyBattleTeam");
  pBox.innerHTML = battle.player.map((f, i) => fighterCard(f, i, true)).join("");
  eBox.innerHTML = battle.enemy.map((f, i) => fighterCard(f, i, false)).join("");
}

function fighterCard(f, i, isP) {
  const hpPct = Math.max(0, (f.hp / f.maxHp) * 100);
  const enPct = Math.max(0, (f.energy / f.maxEnergy) * 100);
  const active = battle.turnOrder[battle.turnIdx] === f;
  const highCe = enPct >= 70;
  const letter = (f.name.split(" ").pop() || f.name)[0];
  const guardCls = f.guard ? "guarding" : "";
  const cols = (typeof CHAR_COLORS !== "undefined" && CHAR_COLORS[f.id]) || ["#4338ca", "#7c3aed"];
  const deadCls = !f.alive ? "dead" : "";
  const targetAttr = (!isP && f.alive) ? `onclick="selectBattleTarget(${i})" style="cursor:pointer"` : "";
  const selected = (!isP && battle.selectedTarget === i) ? "selected-target" : "";
  return `<div class="bchar ${active ? "active-turn" : ""} ${highCe ? "high-ce" : ""} ${guardCls} ${deadCls} ${selected}" id="fc-${isP?"p":"e"}-${i}" ${targetAttr}>
    <div class="aura"></div>
    ${f.guard ? '<div class="barrier-fx"></div>' : ""}
    <div class="portrait-mini" style="background:linear-gradient(135deg,${cols[0]},${cols[1]})">${letter}</div>
    <div class="bname">${f.name.split(" ").pop()} ${!f.alive ? "💀" : ""}</div>
    <div class="hp-bar"><div class="hp-fill ${hpPct < 30 ? "low" : ""}" style="width:${hpPct}%"></div></div>
    <div class="stat-row"><span>HP ${Math.max(0,Math.floor(f.hp))}</span><span class="ce-label">CE ${Math.floor(f.energy)}</span></div>
    <div class="energy-bar"><div class="energy-fill" style="width:${enPct}%"></div></div>
  </div>`;
}

function selectBattleTarget(idx) {
  if (!battle || battle.over) return;
  if (!battle.enemy[idx] || !battle.enemy[idx].alive) return;
  battle.selectedTarget = idx;
  renderBattleUI();
  toast("Target: " + battle.enemy[idx].name.split(" ").pop());
}

function showDialogue(charId, name, forcedText) {
  const box = document.getElementById("dialogueBubble");
  if (!box) return;
  let text = forcedText;
  if (!text) {
    const lines = (RAIZEN_DATA.battleDialogues && (RAIZEN_DATA.battleDialogues[charId] || RAIZEN_DATA.battleDialogues.default)) || ["!"];
    text = lines[Math.floor(Math.random() * lines.length)];
  }
  box.innerHTML = `<span class="dlg-name">${name}</span>${text}`;
  box.style.display = "block";
  clearTimeout(box._hideTimer);
  box._hideTimer = setTimeout(() => { box.style.display = "none"; }, 2200);
}

function logBattle(msg) {
  battle.log.push(msg);
  const box = document.getElementById("battleLog");
  box.innerHTML = battle.log.slice(-8).map(m => `<div>${m}</div>`).join("");
  box.scrollTop = box.scrollHeight;
}

function nextTurn() {
  if (battle.over) return;
  // check win/lose
  if (battle.enemy.every(f => !f.alive)) { endBattle(true); return; }
  if (battle.player.every(f => !f.alive)) { endBattle(false); return; }

  // advance to next alive
  let safety = 0;
  while (safety < 20) {
    const cur = battle.turnOrder[battle.turnIdx];
    if (cur && cur.alive) break;
    battle.turnIdx = (battle.turnIdx + 1) % battle.turnOrder.length;
    safety++;
  }
  const cur = battle.turnOrder[battle.turnIdx];
  if (!cur || !cur.alive) { endBattle(battle.player.some(f => f.alive)); return; }

  cur.energy = Math.min(cur.maxEnergy, cur.energy + 15);
  cur.guard = false;
  renderBattleUI();

  if (cur.isPlayer) {
    showPlayerActions(cur);
  } else {
    document.getElementById("battleActions").innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--muted);font-size:0.8rem">Enemy turn...</div>`;
    setTimeout(() => enemyAct(cur), 700);
  }
}

function showPlayerActions(f) {
  const skills = f.skills;
  const box = document.getElementById("battleActions");
  const banner = document.getElementById("turnBanner");
  if (banner) {
    banner.textContent = f.name.split(" ").pop().toUpperCase() + " — YOUR TURN";
    banner.style.animation = "none";
    void banner.offsetWidth;
    banner.style.animation = "turnFlash 0.5s ease";
  }
  const hasDomain = skills.ultimate && (skills.ultimate.effect === "domain" || /Shrine|Void|Embodiment|Garden|Gamble|Sentencing/i.test(skills.ultimate.name));
  box.innerHTML = `
    <button class="btn btn-sm" onclick="playerAct('basic')">Basic</button>
    <button class="btn btn-sm" onclick="playerAct('skill1')" ${f.energy < skills.skill1.energy ? "disabled" : ""}>${skills.skill1.name}<br><small>${skills.skill1.energy}⚡</small></button>
    <button class="btn btn-sm" onclick="playerAct('skill2')" ${f.energy < skills.skill2.energy ? "disabled" : ""}>${skills.skill2.name}<br><small>${skills.skill2.energy}⚡</small></button>
    <button class="btn btn-sm btn-gold" onclick="playerAct('ultimate')" ${f.energy < skills.ultimate.energy ? "disabled" : ""}>${skills.ultimate.name}<br><small>${skills.ultimate.energy}⚡</small></button>
    <button class="btn btn-sm btn-outline" onclick="playerAct('defense')">Defend</button>
    ${hasDomain ? `<button class="btn btn-sm btn-red" onclick="playerAct('domain')" ${f.energy < skills.ultimate.energy ? "disabled" : ""}>DOMAIN<br><small>${skills.ultimate.energy}⚡</small></button>` : `<button class="btn btn-sm btn-outline" onclick="playerAct('switch')">Switch</button>`}
  `;
}

function playerAct(type) {
  const f = battle.turnOrder[battle.turnIdx];
  if (!f || !f.isPlayer || !f.alive) return;
  const targets = battle.enemy.filter(e => e.alive);
  if (!targets.length) return;

  if (type === "defense") {
    f.guard = true;
    f.energy = Math.min(f.maxEnergy, f.energy + 10);
    logBattle(`${f.name} raises a cursed energy barrier!`);
    showDialogue(f.id, f.name, "Barrier up!");
    animAttacker(f, "defense");
    if (window.RaizenFX) { RaizenFX.ring(); RaizenFX.barrier && RaizenFX.barrier(); }
    endPlayerTurn();
    return;
  }
  if (type === "switch") {
    const others = battle.player.filter(p => p.alive && p !== f);
    if (others.length) logBattle(`${f.name} switches focus.`);
    else logBattle("No one to switch to.");
    endPlayerTurn();
    return;
  }

  // Domain cinematic
  if (type === "domain") {
    const skill = f.skills.ultimate;
    if (!skill || f.energy < skill.energy) { toast("Not enough energy"); return; }
    f.energy -= skill.energy;
    const domainMap = {
      "Hollow Purple": ["Unlimited Void", "void"],
      "Malevolent Shrine": ["Malevolent Shrine", "shrine"],
      "Mahoraga Potential": ["Chimera Shadow Garden", "shadow"],
      "Self-Embodiment": ["Self-Embodiment of Perfection", "perfection"],
      "Jackpot Immortality": ["Idle Death Gamble", "gamble"],
      "Death Penalty": ["Deadly Sentencing", "court"],
      "Unlimited Void": ["Unlimited Void", "void"],
      "Chimera Shadow Garden": ["Chimera Shadow Garden", "shadow"],
      "Idle Death Gamble": ["Idle Death Gamble", "gamble"],
      "Deadly Sentencing": ["Deadly Sentencing", "court"],
      "Authentic Mutual Love": ["Authentic Mutual Love", "love"],
      "Copy": ["Authentic Mutual Love", "love"]
    };
    const dInfo = domainMap[skill.name] || [skill.name, "void"];
    animAttacker(f, "domain");
    activateDomain(dInfo[0], f.name, dInfo[1]);
    if (window.RaizenFX) { RaizenFX.techName(dInfo[0]); RaizenFX.particles(60, true); }
    showDialogue(f.id, f.name, dInfo[0] + "!");
    // domain hits all enemies harder
    let totalLog = `${f.name} expands ${dInfo[0]}!`;
    targets.forEach(target => {
      let dmg = Math.floor(f.atk * skill.power * 1.15 * (0.9 + Math.random() * 0.2));
      dmg = Math.max(1, dmg - Math.floor(target.def * 0.2));
      target.hp -= dmg;
      totalLog += ` ${target.name.split(" ").pop()} -${dmg}`;
      if (target.hp <= 0) { target.hp = 0; target.alive = false; }
      flashHit(target);
      spawnDmg(window.innerWidth * 0.7, 180 + Math.random() * 40, dmg, true);
    });
    logBattle(totalLog);
    screenShake();
    setTimeout(() => { renderBattleUI(); endPlayerTurn(); }, 2400);
    return;
  }

  const skill = f.skills[type];
  if (!skill) return;
  if (f.energy < skill.energy) { toast("Not enough energy"); return; }
  f.energy -= skill.energy;

  // Prefer player-selected target, else lowest HP
  let target = null;
  if (typeof battle.selectedTarget === "number" && battle.enemy[battle.selectedTarget] && battle.enemy[battle.selectedTarget].alive) {
    target = battle.enemy[battle.selectedTarget];
  } else {
    targets.sort((a, b) => a.hp - b.hp);
    target = targets[0];
  }
  let dmg = Math.floor(f.atk * skill.power * (0.9 + Math.random() * 0.2));
  dmg = Math.max(1, dmg - Math.floor(target.def * 0.3));
  if (target.guard) dmg = Math.floor(dmg * 0.4);
  let isCrit = false;
  if ((skill.effect === "crit" && Math.random() < 0.35) || Math.random() < 0.12) {
    dmg = Math.floor(dmg * 1.5);
    isCrit = true;
    logBattle(`💥 Critical Hit!`);
  }
  target.hp -= dmg;
  logBattle(`${f.name} used ${skill.name} → ${target.name} took ${dmg} dmg`);
  showDialogue(f.id, f.name);
  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    logBattle(`${target.name} is defeated!`);
  }
  animAttacker(f, type);
  flashHit(target, isCrit);
  // V3 cinematic technique sequence
  if (window.RaizenFX) {
    RaizenFX.techName(skill.name);
    if (type === "basic") { RaizenFX.slash(window.innerWidth * 0.7, window.innerHeight * 0.35); }
    else if (type === "ultimate") { RaizenFX.cursedEnergy(); RaizenFX.shockwave(window.innerWidth * 0.72, window.innerHeight * 0.35); RaizenFX.particles(40, true); }
    else { RaizenFX.ring(); RaizenFX.shockwave(window.innerWidth * 0.7, window.innerHeight * 0.36); RaizenFX.particles(22); }
  }
  spawnDmg(window.innerWidth * 0.72, 200, dmg, isCrit);
  if (type === "ultimate" || isCrit) screenShake();
  // combo tracker
  battle._combo = (type !== "defense") ? ((battle._combo || 0) + 1) : 0;
  if (battle._combo >= 2 && window.RaizenFX) RaizenFX.combo(battle._combo);
  showDmg(target, dmg);
  endPlayerTurn();
}

function flashHit(target, isCrit) {
  // Hurt knock on target card
  let el = null;
  let isEnemy = true;
  let idx = battle.enemy.indexOf(target);
  if (idx >= 0) el = document.getElementById("fc-e-" + idx);
  else {
    idx = battle.player.indexOf(target);
    if (idx >= 0) { el = document.getElementById("fc-p-" + idx); isEnemy = false; }
  }
  if (el) {
    el.classList.remove("hit", "hit-left");
    void el.offsetWidth;
    el.classList.add("hit");
    if (!isEnemy) el.classList.add("hit-left");
    setTimeout(() => el.classList.remove("hit", "hit-left"), 500);
    // 3. Impact burst at card center
    const rect = el.getBoundingClientRect();
    spawnImpact(rect.left + rect.width / 2, rect.top + rect.height / 2, !!isCrit);
  }
}

function spawnImpact(x, y, isCrit) {
  const fx = document.createElement("div");
  fx.className = "impact-fx slash" + (isCrit ? " crit" : "");
  fx.style.left = x + "px";
  fx.style.top = y + "px";
  document.body.appendChild(fx);
  setTimeout(() => fx.remove(), 500);
}

function animAttacker(f, type) {
  const isP = f.isPlayer;
  const list = isP ? battle.player : battle.enemy;
  const idx = list.indexOf(f);
  if (idx < 0) return;
  const el = document.getElementById((isP ? "fc-p-" : "fc-e-") + idx);
  if (!el) return;
  el.classList.remove("attacking", "attacking-left", "casting", "ult-burst");
  void el.offsetWidth;
  if (type === "ultimate" || type === "domain") {
    el.classList.add("ult-burst", "casting");
  } else if (type === "defense") {
    el.classList.add("guarding");
  } else {
    el.classList.add(isP ? "attacking" : "attacking-left");
    if (type !== "basic") el.classList.add("casting");
  }
  setTimeout(() => {
    el.classList.remove("attacking", "attacking-left", "casting", "ult-burst");
  }, 550);
}

function enemyAct(f) {
  const targets = battle.player.filter(p => p.alive);
  if (!targets.length) { endBattle(false); return; }
  targets.sort((a, b) => a.hp - b.hp);
  const target = targets[0];
  // AI: use best affordable skill
  const skills = ["ultimate", "skill2", "skill1", "basic"];
  let chosen = "basic";
  for (const s of skills) {
    if (f.energy >= f.skills[s].energy) { chosen = s; break; }
  }
  const skill = f.skills[chosen];
  f.energy -= skill.energy;
  let dmg = Math.floor(f.atk * skill.power * (0.9 + Math.random() * 0.2));
  dmg = Math.max(1, dmg - Math.floor(target.def * 0.3));
  if (target.guard) dmg = Math.floor(dmg * 0.4);
  target.hp -= dmg;
  logBattle(`${f.name} used ${skill.name} → ${target.name} took ${dmg} dmg`);
  showDialogue(f.id, f.name);
  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    logBattle(`${target.name} is defeated!`);
  }
  animAttacker(f, chosen);
  flashHit(target, chosen === "ultimate");
  spawnDmg(window.innerWidth * 0.28, 200, dmg, chosen === "ultimate");
  if (chosen === "ultimate") screenShake();
  if (window.RaizenFX && chosen !== "basic") { RaizenFX.ring(); RaizenFX.particles(18); }
  showDmg(target, dmg);
  battle.turnIdx = (battle.turnIdx + 1) % battle.turnOrder.length;
  setTimeout(nextTurn, 600);
}

function endPlayerTurn() {
  battle.turnIdx = (battle.turnIdx + 1) % battle.turnOrder.length;
  setTimeout(nextTurn, 500);
}

function showDmg(target, dmg) {
  renderBattleUI();
}

function endBattle(win) {
  battle.over = true;
  document.getElementById("battleActions").innerHTML = "";
  const overlay = document.getElementById("resultOverlay");
  const title = document.getElementById("resultTitle");
  const rewards = document.getElementById("resultRewards");
  if (win) {
    title.textContent = "VICTORY";
    title.className = "result-title win";
    const xpGain = 80 + Math.floor(Math.random() * 40);
    const coinGain = 30 + Math.floor(Math.random() * 30);
    const gemGain = Math.random() < 0.3 ? 2 : 0;
    player.coins += coinGain;
    player.gems += gemGain;
    player.wins++;
    player.battlesWon = (player.battlesWon || 0) + 1;
    progressQuest("battlesWon");
    addXp(xpGain);
    addActivity(`Won a battle (+${xpGain} XP, +${coinGain} coins)`);
    rewards.innerHTML = `+${xpGain} XP · +${coinGain} 🪙 ${gemGain ? `· +${gemGain} 💎` : ""}`;
  } else {
    title.textContent = "DEFEAT";
    title.className = "result-title lose";
    player.losses++;
    const xpGain = 20;
    addXp(xpGain);
    addActivity(`Lost a battle`);
    rewards.innerHTML = `+${xpGain} XP · Better luck next time`;
  }
  save();
  updateHeader();
  overlay.classList.add("show");
  if (win && window.RaizenFX) { RaizenFX.particles(50, true); RaizenFX.flash(); RaizenFX.reward("VICTORY"); }
  else if (!win && window.RaizenFX) { RaizenFX.shake(); }
}

function closeResult() {
  document.getElementById("resultOverlay").classList.remove("show");
  renderBattleSetup();
}

/* ---------- SUMMON ---------- */
function renderSummon() {
  document.getElementById("pityCount").textContent = player.pity || 0;
  const hist = (player.summonHistory || []).slice(-10).reverse();
  document.getElementById("summonHistory").innerHTML = hist.length
    ? hist.map(h => `<div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05)"><span style="color:${rarityColor(h.rarity)}">${h.rarity}</span> ${h.name}</div>`).join("")
    : `<div style="color:var(--muted)">No summons yet</div>`;
}

function doSummon(count) {
  const cost = count === 10 ? 450 : 50;
  if (player.gems < cost) { toast("Not enough gems"); return; }
  player.gems -= cost;
  player.summons = (player.summons || 0) + count;
  progressQuest("summonsDone");

  const results = [];
  for (let i = 0; i < count; i++) {
    player.pity = (player.pity || 0) + 1;
    let rarity = rollRarity(player.pity >= 90);
    if (player.pity >= 90) player.pity = 0;
    if (rarity === "MYTHIC" || rarity === "LEGENDARY") player.pity = 0;

    const pool = RAIZEN_DATA.characters.filter(c => c.rarity === rarity);
    const fallback = RAIZEN_DATA.characters;
    const pick = (pool.length ? pool : fallback)[Math.floor(Math.random() * (pool.length || fallback.length))];
    results.push(pick);

    if (!player.collection[pick.id]) {
      player.collection[pick.id] = { level: 1, xp: 0, favorite: false };
    } else {
      player.coins += 20;
    }
    player.summonHistory = player.summonHistory || [];
    player.summonHistory.push({ name: pick.name, rarity: pick.rarity });
    if (player.summonHistory.length > 30) player.summonHistory.shift();
  }

  addActivity(`Summoned ${count}×`);
  save();
  updateHeader();
  renderSummon();

  // V3 cinematic reveal — show best pull
  const best = results.slice().sort((a, b) => rarityOrder(b.rarity) - rarityOrder(a.rarity))[0];
  const vis = document.getElementById("summonVisual");
  vis.style.animation = "none";
  vis.textContent = "⚡";
  vis.classList.add("charging");
  vis.style.boxShadow = "0 0 40px rgba(99,102,241,0.7)";
  if (window.RaizenFX) { RaizenFX.ring(); RaizenFX.particles(30, true); }
  setTimeout(() => {
    vis.classList.remove("charging");
    showSummonReveal(best, best.rarity);
    vis.textContent = best.name[0];
    vis.style.borderColor = rarityColor(best.rarity);
    toast(results.map(r => r.name).join(", "));
    setTimeout(() => {
      vis.textContent = "✨";
      vis.style.borderColor = "";
      vis.style.boxShadow = "";
    }, 2400);
  }, 500);
}

function rarityOrder(r) {
  const o = { COMMON: 1, UNCOMMON: 2, RARE: 3, EPIC: 4, LEGENDARY: 5, MYTHIC: 6, LIMITED: 7 };
  return o[r] || 0;
}

function rollRarity(forceHigh) {
  if (forceHigh) return Math.random() < 0.5 ? "MYTHIC" : "LEGENDARY";
  const r = Math.random() * 100;
  if (r < 1.3) return "MYTHIC";
  if (r < 5.8) return "LEGENDARY";
  if (r < 14.8) return "EPIC";
  if (r < 29.8) return "RARE";
  if (r < 54.8) return "UNCOMMON";
  return "COMMON";
}

/* ---------- TRAINING ---------- */
function renderTraining() {
  const owned = Object.keys(player.collection);
  document.getElementById("trainCharGrid").innerHTML = owned.map(id => {
    const c = RAIZEN.charMap[id];
    const sel = selectedTrainChar === id;
    return `<div class="card char-card ${sel ? "glow" : ""}" style="border-color:${sel ? "var(--cyan)" : ""}" onclick="selectedTrainChar='${id}';renderTraining()">
      <div class="portrait" style="padding:0;overflow:hidden">${portraitInner(c)}</div>
      <div class="name">${c.name}</div>
      <div class="grade">Lv.${player.collection[id].level}</div>
    </div>`;
  }).join("") || `<div style="grid-column:1/-1;color:var(--muted);text-align:center">No characters</div>`;

  document.getElementById("trainTypes").innerHTML = RAIZEN_DATA.trainingTypes.map(t =>
    `<div class="card train-card glow" onclick="doTrain('${t.id}')">
      <div class="t-icon">${t.icon}</div>
      <div style="font-weight:700;font-size:0.85rem">${t.name}</div>
      <div style="font-size:0.7rem;color:var(--muted)">20 🪙</div>
    </div>`
  ).join("");
}

function doTrain(typeId) {
  if (!selectedTrainChar) { toast("Select a character first"); return; }
  if (player.coins < 20) { toast("Not enough coins"); return; }
  player.coins -= 20;
  const col = player.collection[selectedTrainChar];
  const t = RAIZEN_DATA.trainingTypes.find(x => x.id === typeId);
  const xpGain = 30 + Math.floor(Math.random() * 20);
  col.xp = (col.xp || 0) + xpGain;
  // level char every 100 xp
  while (col.xp >= 100) {
    col.xp -= 100;
    col.level++;
    toast(`${RAIZEN.charMap[selectedTrainChar].name} leveled to ${col.level}!`);
  }
  player.trainsDone = (player.trainsDone || 0) + 1;
  progressQuest("trainsDone");
  addXp(15);
  addActivity(`Trained ${RAIZEN.charMap[selectedTrainChar].name} (${t.name})`);
  save();
  updateHeader();
  document.getElementById("trainResult").textContent = `+${xpGain} character XP · ${t.name} complete`;
  renderTraining();
}

/* ---------- QUESTS ---------- */
function renderQuests() {
  document.getElementById("questList").innerHTML = RAIZEN_DATA.quests.map(q => {
    const prog = player.quests[q.id] || 0;
    const done = prog >= q.target;
    const claimed = player.quests[q.id + "_claimed"];
    return `<div class="glass quest-card">
      <div class="quest-info">
        <div class="quest-title">${q.title}</div>
        <div class="quest-desc">${q.desc}</div>
        <div class="quest-progress">${Math.min(prog, q.target)}/${q.target}</div>
      </div>
      ${done && !claimed ? `<button class="btn btn-sm btn-green" onclick="claimQuest('${q.id}')">CLAIM</button>` :
        claimed ? `<span style="color:var(--muted);font-size:0.75rem">Claimed</span>` :
        `<span style="color:var(--muted);font-size:0.75rem">...</span>`}
    </div>`;
  }).join("");
}

function progressQuest(key) {
  RAIZEN_DATA.quests.forEach(q => {
    if (q.progress === key) {
      player.quests[q.id] = (player.quests[q.id] || 0) + 1;
    }
  });
  save();
}

function claimQuest(id) {
  const q = RAIZEN_DATA.quests.find(x => x.id === id);
  if (!q) return;
  if ((player.quests[id] || 0) < q.target) return;
  if (player.quests[id + "_claimed"]) return;
  player.quests[id + "_claimed"] = true;
  player.coins += q.rewards.coins;
  player.gems += q.rewards.gems;
  addXp(q.rewards.xp);
  addActivity(`Claimed quest: ${q.title}`);
  save();
  updateHeader();
  toast(`+${q.rewards.xp} XP · +${q.rewards.coins}🪙 · +${q.rewards.gems}💎`);
  renderQuests();
  if (document.getElementById("page-home").classList.contains("active")) renderHome();
}

/* ---------- INVENTORY ---------- */
function renderInventory() {
  const items = [
    { id: "coins", name: "Coins", val: player.coins, icon: "🪙" },
    { id: "gems", name: "Gems", val: player.gems, icon: "💎" },
    ...Object.entries(player.inventory || {}).map(([k, v]) => {
      const def = RAIZEN_DATA.items.find(i => i.id === k) || { name: k, desc: "" };
      return { id: k, name: def.name, val: v, icon: "📦", desc: def.desc };
    })
  ];
  document.getElementById("invList").innerHTML = items.map(i =>
    `<div class="glass" style="padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
      <div><span style="margin-right:8px">${i.icon || "📦"}</span><strong>${i.name}</strong>
      ${i.desc ? `<div style="font-size:0.75rem;color:var(--muted)">${i.desc}</div>` : ""}</div>
      <div style="font-weight:700;color:var(--cyan)">×${i.val}</div>
    </div>`
  ).join("");
}

/* ---------- PROFILE ---------- */
function renderProfile() {
  document.getElementById("profName").textContent = player.name;
  document.getElementById("profMeta").textContent = `Lv.${player.level} · Rank ${player.rank}`;
  document.getElementById("profAvatar").textContent = player.name[0].toUpperCase();
  const need = xpForLevel(player.level);
  document.getElementById("profXp").style.width = Math.min(100, (player.xp / need) * 100) + "%";
  document.getElementById("profWins").textContent = player.wins;
  document.getElementById("profLosses").textContent = player.losses;
  document.getElementById("profCards").textContent = Object.keys(player.collection).length;

  const achs = [];
  if (player.wins >= 1) achs.push("First Victory");
  if (player.wins >= 10) achs.push("Battle Hardened");
  if (Object.keys(player.collection).length >= 5) achs.push("Collector");
  if (Object.keys(player.collection).length >= 15) achs.push("Archivist");
  if (player.level >= 10) achs.push("Rising Sorcerer");
  if (player.summons >= 10) achs.push("Summoner");
  if (player.favorites.length >= 3) achs.push("Fan");
  document.getElementById("achievements").innerHTML = achs.length
    ? achs.map(a => `<div class="ach-badge">🏅 ${a}</div>`).join("")
    : `<div style="color:var(--muted);font-size:0.85rem">Win battles & collect to unlock</div>`;

  document.getElementById("togSound").classList.toggle("on", player.settings.sound);
  document.getElementById("togParticles").classList.toggle("on", player.settings.particles);
  if (typeof player.settings.track === "number") _currentTrack = player.settings.track;
  updateMusicUI();
}

function toggleSetting(key) {
  player.settings[key] = !player.settings[key];
  save();
  if (key === "particles") {
    document.getElementById("particles").style.display = player.settings.particles ? "block" : "none";
  }
  renderProfile();
}

/* ---------- TECHNIQUES / DOMAINS / STORY ---------- */
function renderTechniques() {
  document.getElementById("techList").innerHTML = RAIZEN_DATA.techniques.map(t =>
    `<div class="glass list-item" onclick="this.querySelector('.li-detail').style.display=this.querySelector('.li-detail').style.display==='block'?'none':'block'">
      <div class="li-title">${t.name}</div>
      <div class="li-sub">${t.type} · ${t.combatRole}</div>
      <div class="li-detail" style="display:none;margin-top:8px;font-size:0.85rem;color:var(--silver)">
        ${t.description}<br><br>
        <strong>Mechanics:</strong> ${t.mechanics}<br>
        <strong>Strengths:</strong> ${t.strengths.join(", ")}<br>
        <strong>Limitations:</strong> ${t.limitations.join(", ")}
      </div>
    </div>`
  ).join("");
}

function renderDomains() {
  document.getElementById("domainList").innerHTML = RAIZEN_DATA.domains.map(d => {
    const userName = RAIZEN.charMap[d.user]?.name || d.user;
    const cols = (typeof CHAR_COLORS !== "undefined" && CHAR_COLORS[d.user]) || ["#4338ca", "#7c3aed"];
    const theme = d.theme || "void";
    const letter = (userName.split(" ").pop() || userName)[0];
    return `<div class="domain-card glass theme-${theme}">
      <div class="domain-card-head" onclick="this.parentElement.classList.toggle('open')">
        <div class="domain-avatar" style="background:linear-gradient(135deg,${cols[0]},${cols[1]})">${letter}</div>
        <div class="domain-card-info">
          <div class="domain-card-name">${d.name}</div>
          <div class="domain-card-user">${userName} · ${d.grade || "Special Grade"}</div>
        </div>
        <div class="domain-card-arrow">›</div>
      </div>
      <div class="domain-card-body">
        <div class="domain-stat"><span>Concept</span><span>${d.concept}</span></div>
        <div class="domain-stat"><span>Effect</span><span>${d.effect}</span></div>
        <div class="domain-stat"><span>Combat</span><span>${d.combat}</span></div>
        <div class="domain-stat"><span>Mechanics</span><span>${d.mechanics}</span></div>
        <div class="domain-stat"><span>Technique</span><span>${d.relatedTech || "—"}</span></div>
        <button class="btn btn-block domain-play-btn" onclick="event.stopPropagation();activateDomain('${d.name.replace(/'/g,"")}', '${userName.replace(/'/g,"")}', '${theme}', '${d.id}')">
          ▶ DOMAIN EXPANSION
        </button>
        <button class="btn btn-block domain-video-btn" onclick="event.stopPropagation();playDomainVideo('${d.id}')">
          ▶ REAL ANIMATION (VIDEO)
        </button>
      </div>
    </div>`;
  }).join("");
}

function renderStory() {
  const seen = player.storySeen || {};
  document.getElementById("storyList").innerHTML = RAIZEN_DATA.storyArcs.map((s, i) => {
    const done = !!seen[s.id];
    return `<div class="glass list-item" style="border-left:3px solid ${done ? "var(--cyan)" : "var(--border)"}">
      <div onclick="advanceStory('${s.id}');const d=this.parentElement.querySelector('.li-detail');d.style.display=d.style.display==='block'?'none':'block'">
        <div class="li-title">${i + 1}. ${s.title} ${done ? "✓" : ""}</div>
        <div class="li-sub">${s.timeline} ${done ? "· Read" : "· Tap to read"}</div>
      </div>
      <div class="li-detail" style="display:none;margin-top:8px;font-size:0.85rem;color:var(--silver);line-height:1.5">
        ${s.summary}<br><br>
        <strong>Major events:</strong> ${(s.events || []).join(" · ") || "—"}<br>
        <strong>Key characters:</strong> ${(s.characters || []).map(id => RAIZEN.charMap[id]?.name || id).join(", ")}
      </div>
    </div>`;
  }).join("");
}

function advanceStory(id) {
  if (!player.storySeen) player.storySeen = {};
  if (!player.storySeen[id]) {
    player.storySeen[id] = true;
    player.storyProgress = (player.storyProgress || 0) + 1;
    progressQuest("storyProgress");
    addXp(25);
    addActivity(`Read story: ${RAIZEN_DATA.storyArcs.find(s => s.id === id)?.title}`);
    save();
  }
}

function addActivity(msg) {
  player.activity = player.activity || [];
  player.activity.push(msg);
  if (player.activity.length > 20) player.activity.shift();
}

function updateAll() {
  updateHeader();
  renderHome();
}

/* ---------- PARTICLES ---------- */
function initParticles() {
  const canvas = document.getElementById("particles");
  const ctx = canvas.getContext("2d");
  let w, h, particles = [];
  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);
  for (let i = 0; i < 40; i++) {
    particles.push({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      a: Math.random() * 0.4 + 0.1
    });
  }
  function draw() {
    if (!player?.settings?.particles) {
      ctx.clearRect(0, 0, w, h);
      requestAnimationFrame(draw);
      return;
    }
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0 || p.x > w) p.dx *= -1;
      if (p.y < 0 || p.y > h) p.dy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(99,102,241,${p.a})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ---------- INIT ---------- */
function init() {
  RAIZEN.init();
  load();
  updateAll();
  initParticles();
  if (typeof player.settings?.track === "number") _currentTrack = player.settings.track;
  updateMusicUI();
  // music starts on first user tap (browser autoplay rules)
  // PWA
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", init);

// close modal on overlay click
document.getElementById("modal")?.addEventListener("click", e => {
  if (e.target.id === "modal") closeModal();
});