const {
  Plugin,
  Notice,
  TFile,
  TFolder,
  Modal,
  setIcon,
  requestUrl,
  requireApiVersion,
  Platform
} = require("obsidian");

const JOURNAL_ROOT = "Journal";
const DAILY_ROOT = `${JOURNAL_ROOT}/01 Daily`;
const WEEKLY_ROOT = `${JOURNAL_ROOT}/02 Weekly`;
const DAILY_TEMPLATE_PATH = "06 Templates/Parents/Daily.md";
const WEEKLY_TEMPLATE_PATH = "06 Templates/Parents/Weekly.md";

const PATHS = {
  home: "00 Dashboard/LIFORA Home.md",
  hub: "00 Dashboard/Garden Center.md",
  daily: `${DAILY_ROOT}/Daily Journal Home.md`,
  weekly: `${WEEKLY_ROOT}/Weekly Home.md`,
  courses: "08 Courses/Courses Home.md",
  books: "09 Books/Books Home.md",
  quran: "10 Quran/Quran Home.md",
  languages: "11 Languages/Languages Home.md",
  goals: "12 Goals/Goals & Milestones.md",
  planner: "13 Daily Planner/Daily Planner.md",
  reviews: "00 Dashboard/Reviews Home.md",
  knowledge: "07 Notes/Knowledge Home.md",
  templates: "06 Templates/Templates Home.md"
};


const SECTION_CONFIG = [
  { folder: DAILY_ROOT, title: "Daily Journal", icon: "sun", color: "#d3ad59", description: "Your days, moments, reflections, and daily rhythm.", dashboard: PATHS.daily, processor: "time-garden-section-overview", banner: "06 Templates/Images/Weekly Notes/WeeklyBanner1.gif" },
  { folder: WEEKLY_ROOT, title: "Weekly Planning", icon: "calendar-range", color: "#65a8dc", description: "Plan your weeks, review priorities, and see the bigger picture.", dashboard: PATHS.weekly, processor: "time-garden-section-overview", banner: "06 Templates/Images/Weekly Notes/WeeklyBanner2.gif" },
  { folder: "07 Notes", title: "Knowledge Library", icon: "notebook", color: "#55aaa3", description: "Capture, connect, and revisit what you learn.", dashboard: PATHS.knowledge, processor: "time-garden-section-overview", banner: "06 Templates/Images/Weekly Notes/WeeklyBanner1.gif" },
  { folder: "08 Courses", title: "Courses", icon: "graduation-cap", color: "#65a8dc", description: "Your courses, personal topics, and continuous learning.", dashboard: PATHS.courses, processor: "time-garden-courses-overview", banner: "06 Templates/Images/Weekly Notes/WeeklyBanner2.gif" },
  { folder: "09 Books", title: "Books Library", icon: "book-open", color: "#55aa83", description: "Organize your library and follow your reading progress.", dashboard: PATHS.books, processor: "time-garden-books-overview", banner: "06 Templates/Images/Monthly Notes/MonthlyBanner2.gif" },
  { folder: "10 Quran", title: "Quran Journey", icon: "book-heart", color: "#55aa83", description: "Memorization, reading, revision, and your daily wird.", dashboard: PATHS.quran, processor: "time-garden-quran-overview", banner: "06 Templates/Images/Quarterly Notes/QuarterlyBanner1.gif" },
  { folder: "11 Languages", title: "Language Studio", icon: "languages", color: "#a78bd2", description: "Your personal language academy and CEFR learning paths.", dashboard: PATHS.languages, processor: "time-garden-languages-overview", banner: "06 Templates/Images/Quarterly Notes/QuarterlyBanner3.gif" },
  { folder: "12 Goals", title: "Goals & Milestones", icon: "target", color: "#d3ad59", description: "Set meaningful goals, build your own milestones, and track progress.", dashboard: PATHS.goals, processor: "lifora-goals", banner: "06 Templates/Images/Weekly Notes/WeeklyBanner4.gif" },
  { folder: "13 Daily Planner", title: "Daily Planner", icon: "calendar-check", color: "#d3ad59", description: "Plan your day, schedule course topics and reading sessions, and keep every task connected to its source.", dashboard: PATHS.planner, processor: "time-garden-section-overview", banner: "06 Templates/Images/Monthly Notes/MonthlyBanner4.gif" }
];

const HOME_SECTION_CONFIG = [
  {
    folder: JOURNAL_ROOT,
    title: "Journal",
    icon: "book-heart",
    color: "#d3ad59",
    description: "Daily journal entries and weekly planning in one organized space.",
    dashboard: `${JOURNAL_ROOT}/Folder Dashboard.md`
  },
  ...SECTION_CONFIG.filter(section => section.folder !== DAILY_ROOT && section.folder !== WEEKLY_ROOT)
];

const BACKUP_ROOT = "data/backups";
const LEGACY_BACKUP_ROOT = "00 Dashboard/LIFORA Backups";
const PORTABLE_BACKUP_RETENTION = 3;
const PORTABLE_SAFETY_RETENTION = 3;
const PORTABLE_BACKUP_MIGRATION_MARKER = ".lifora-migrated.json";

// Portable user content is mirrored into a hidden /data folder. The working
// folders keep their established paths so existing links and workflows stay intact.
const PORTABLE_DATA_ROOT = "data";
const PORTABLE_DATA_MANIFEST = "data/.lifora-portable-data.json";
const PORTABLE_PLUGIN_STATE = "data/.lifora-plugin-state.json";
const PORTABLE_PLUGIN_STATE_TARGET = ".obsidian/plugins/time-garden-navigator/data.json";
const PORTABLE_SETTINGS_ROOT = "data/.lifora-settings";
const PORTABLE_SETTINGS_MANIFEST = "data/.lifora-settings/manifest.json";
const PORTABLE_SETTINGS_FIXED_PATHS = [
  ".obsidian/app.json",
  ".obsidian/appearance.json",
  ".obsidian/hotkeys.json",
  ".obsidian/core-plugins.json",
  ".obsidian/community-plugins.json",
  ".obsidian/core-plugins-migration.json",
  ".obsidian/workspace.json",
  ".obsidian/workspace-mobile.json",
  ".obsidian/graph.json",
  ".obsidian/templates.json"
];
const PORTABLE_RECOVERY_ROOT = "data/.lifora-recovery";
const PORTABLE_INTEGRITY_ALGORITHM = "fnv1a32";
const BACKUP_INTEGRITY_FILE = "_lifora-backup-manifest.json";

const PORTABLE_DATA_VERSION = "2.10.0";
// Independent contract: a UI/plugin update does not silently change the DATA format.
const PORTABLE_FORMAT_VERSION = 1;
// The marker stays OUTSIDE DATA and identifies this installation, not user content.
// Its absence or mismatch means DATA was copied from another vault, even when the
// plugin version is identical. Never populate imported DATA from template files.
const PORTABLE_INSTALL_MARKER = ".obsidian/.lifora-vault-install.json";
// Shipped only in the full release, never in the update patch. It allows
// first-launch imports to be distinguished from updating an existing v2.9.6 vault.
const PORTABLE_FRESH_TEMPLATE_MARKER = ".obsidian/.lifora-new-vault-template";

const LIFORA_THEME_PRESETS = [
  {
    "id": "system",
    "name": "Obsidian Original",
    "mode": "native",
    "bg": null,
    "surface": null,
    "card": null,
    "text": null,
    "muted": null,
    "accent": null,
    "description": "Keeps Obsidian appearance untouched"
  },
  {
    "id": "ivory-atelier",
    "name": "Ivory Atelier",
    "mode": "light",
    "bg": "#F8F6F0",
    "surface": "#EEE9E1",
    "card": "#FFFFFF",
    "text": "#292D35",
    "muted": "#727783",
    "accent": "#C09A55",
    "description": "Clarity with subtle gold"
  },
  {
    "id": "champagne-silk",
    "name": "Champagne Silk",
    "mode": "light",
    "bg": "#F8F1E7",
    "surface": "#F0E5D5",
    "card": "#FFF9F2",
    "text": "#352E2B",
    "muted": "#786D67",
    "accent": "#B38455",
    "description": "Warm and sophisticated"
  },
  {
    "id": "pearl-platinum",
    "name": "Pearl Platinum",
    "mode": "light",
    "bg": "#F5F7FA",
    "surface": "#E9EDF3",
    "card": "#FFFFFF",
    "text": "#273348",
    "muted": "#718092",
    "accent": "#6688A5",
    "description": "Minimal, elegant and airy"
  },
  {
    "id": "sakura-mist",
    "name": "Sakura Mist",
    "mode": "light",
    "bg": "#FBF4F6",
    "surface": "#F3E7EB",
    "card": "#FFFBFC",
    "text": "#432F3E",
    "muted": "#856E7B",
    "accent": "#B87895",
    "description": "Soft rose accents"
  },
  {
    "id": "sage-linen",
    "name": "Sage Linen",
    "mode": "light",
    "bg": "#F3F6EF",
    "surface": "#E5EBDD",
    "card": "#FCFDF9",
    "text": "#293930",
    "muted": "#6C7D70",
    "accent": "#728F73",
    "description": "Calm and focused"
  },
  {
    "id": "obsidian-gold",
    "name": "Obsidian Gold",
    "mode": "dark",
    "bg": "#151719",
    "surface": "#202327",
    "card": "#282C32",
    "text": "#F3F0E7",
    "muted": "#AEB1B5",
    "accent": "#D5AE65",
    "description": "Signature black and gold"
  },
  {
    "id": "midnight-navy",
    "name": "Midnight Navy",
    "mode": "dark",
    "bg": "#101A2C",
    "surface": "#192740",
    "card": "#233653",
    "text": "#ECF2FC",
    "muted": "#9AACC4",
    "accent": "#7EAEEB",
    "description": "Deep blue studio"
  },
  {
    "id": "emerald-noir",
    "name": "Emerald Noir",
    "mode": "dark",
    "bg": "#111E1A",
    "surface": "#1B2E27",
    "card": "#254038",
    "text": "#E9F4EE",
    "muted": "#A0C1B2",
    "accent": "#67C7A0",
    "description": "Rich forest green"
  },
  {
    "id": "royal-amethyst",
    "name": "Royal Amethyst",
    "mode": "dark",
    "bg": "#1B1627",
    "surface": "#292137",
    "card": "#392D4C",
    "text": "#F4EFFC",
    "muted": "#B9A9C9",
    "accent": "#B9A0F5",
    "description": "Deep violet luxury"
  },
  {
    "id": "carbon-copper",
    "name": "Carbon Copper",
    "mode": "dark",
    "bg": "#1B1A19",
    "surface": "#2B2927",
    "card": "#35312E",
    "text": "#F4EDE5",
    "muted": "#BDB0A1",
    "accent": "#D99D70",
    "description": "Warm graphite and copper"
  },
{
    "id": "nocturne-ink",
    "name": "Nocturne Ink",
    "mode": "dark",
    "bg": "#11151F",
    "surface": "#1C2331",
    "card": "#273247",
    "text": "#F2F5FF",
    "muted": "#A6B2C9",
    "accent": "#91B4FF",
    "description": "Velvet charcoal and blue glass",
    "new": true
},
{
    "id": "arctic-slate",
    "name": "Arctic Slate",
    "mode": "dark",
    "bg": "#101E27",
    "surface": "#1B303B",
    "card": "#28414E",
    "text": "#F0F8FC",
    "muted": "#A6C2CD",
    "accent": "#8CD4E0",
    "description": "Cold slate and glacial cyan",
    "new": true
},
{
    "id": "bordeaux-velvet",
    "name": "Bordeaux Velvet",
    "mode": "dark",
    "bg": "#24171E",
    "surface": "#35222D",
    "card": "#462D3A",
    "text": "#FFF1F3",
    "muted": "#D3AAB9",
    "accent": "#E6A0B6",
    "description": "Burgundy and rose-gold elegance",
    "new": true
},
{
    "id": "deep-teal",
    "name": "Deep Teal",
    "mode": "dark",
    "bg": "#102422",
    "surface": "#1A3633",
    "card": "#274943",
    "text": "#EAF9F5",
    "muted": "#A8CDC5",
    "accent": "#6CD4BD",
    "description": "Calm ocean-depth focus",
    "new": true
},
{
    "id": "graphite-mint",
    "name": "Graphite Mint",
    "mode": "dark",
    "bg": "#161D1A",
    "surface": "#25332D",
    "card": "#31463B",
    "text": "#F0FBF4",
    "muted": "#A7BFB0",
    "accent": "#9EDEAC",
    "description": "Graphite and fresh jade highlights",
    "new": true
},
{
    "id": "astral-indigo",
    "name": "Astral Indigo",
    "mode": "dark",
    "bg": "#16192C",
    "surface": "#232943",
    "card": "#343B5B",
    "text": "#F2F1FF",
    "muted": "#ADB5D1",
    "accent": "#A9A8F7",
    "description": "Midnight indigo with soft starlight",
    "new": true
  },
  {
    "id": "midnight-orchid",
    "name": "Midnight Orchid",
    "mode": "dark",
    "bg": "#17151F",
    "surface": "#262131",
    "card": "#393145",
    "text": "#F8F2FA",
    "muted": "#C1B5C5",
    "accent": "#CDA1DC",
    "description": "Charcoal elegance with orchid accents",
    "new": true
  },
  {
    "id": "obsidian-crimson",
    "name": "Obsidian Crimson",
    "mode": "dark",
    "bg": "#1D1718",
    "surface": "#302326",
    "card": "#463235",
    "text": "#FFF3F0",
    "muted": "#CBB1AC",
    "accent": "#E7A08F",
    "description": "Noir graphite with refined crimson",
    "new": true
  },
  {
    "id": "cyber-carbon",
    "name": "Cyber Carbon",
    "mode": "dark",
    "bg": "#11171C",
    "surface": "#1C2730",
    "card": "#293945",
    "text": "#F1F8FB",
    "muted": "#AABBC5",
    "accent": "#76C8E5",
    "description": "Technical black with electric cyan",
    "new": true
  },
  {
    "id": "alpine-onyx",
    "name": "Alpine Onyx",
    "mode": "dark",
    "bg": "#171A18",
    "surface": "#262B28",
    "card": "#343C38",
    "text": "#F3F7F4",
    "muted": "#B3BFB7",
    "accent": "#BAD7C1",
    "description": "Quiet alpine luxury in onyx",
    "new": true
  },
  {
    "id": "royal-bronze",
    "name": "Royal Bronze",
    "mode": "dark",
    "bg": "#1E1B17",
    "surface": "#302B25",
    "card": "#443C32",
    "text": "#FBF5EB",
    "muted": "#C4B7A5",
    "accent": "#E1B873",
    "description": "Executive charcoal and polished bronze",
    "new": true
  },
  {
    "id": "polar-obsidian",
    "name": "Polar Obsidian",
    "mode": "dark",
    "bg": "#13171D",
    "surface": "#202630",
    "card": "#303946",
    "text": "#F4F7FB",
    "muted": "#AEB9C8",
    "accent": "#C7D5EE",
    "description": "Clean polar light over deep obsidian",
    "new": true
  },
  {
    "id": "focus-flow",
    "name": "Focus Flow",
    "mode": "dark",
    "bg": "#151719",
    "surface": "#202327",
    "card": "#2B3036",
    "text": "#F5F7F9",
    "muted": "#A7AFB8",
    "accent": "#5ED6A5",
    "description": "Calm task focus with vivid completion green",
    "new": true
  },
  {
    "id": "night-task",
    "name": "Night Task",
    "mode": "dark",
    "bg": "#12151B",
    "surface": "#1D222B",
    "card": "#29313D",
    "text": "#F1F5FC",
    "muted": "#A5B0C0",
    "accent": "#78A9FF",
    "description": "Clear priorities in a focused midnight workspace",
    "new": true
  },
  {
    "id": "deep-work",
    "name": "Deep Work",
    "mode": "dark",
    "bg": "#161616",
    "surface": "#242424",
    "card": "#333333",
    "text": "#F6F1E8",
    "muted": "#B7AEA2",
    "accent": "#F0A35B",
    "description": "Warm amber signals for deliberate work",
    "new": true
  },
  {
    "id": "moonlit-planner",
    "name": "Moonlit Planner",
    "mode": "dark",
    "bg": "#141722",
    "surface": "#20263A",
    "card": "#2D3550",
    "text": "#F4F5FF",
    "muted": "#AEB6D0",
    "accent": "#C4A7FF",
    "description": "Soft violet planning with a quiet night palette",
    "new": true
}
];

const PORTABLE_DATA_ROOTS = [
  "07 Notes",
  "08 Courses",
  "09 Books",
  "10 Quran",
  "11 Languages",
  "12 Goals",
  "13 Daily Planner",
  "Journal",
  "00 Dashboard/Attachments",
  "00 Dashboard",
  "06 Templates"
];
const PORTABLE_DATA_EXCLUDED_FILES = new Set([
  "07 Notes/Knowledge Home.md",
  "08 Courses/Courses Home.md",
  "09 Books/Books Home.md",
  "10 Quran/Quran Home.md",
  "11 Languages/Languages Home.md",
  "13 Daily Planner/Daily Planner.md",
  "12 Goals/Goals & Milestones.md",
  "12 Goals/README.md",
  "Journal/01 Daily/Daily Journal Home.md",
  "Journal/02 Weekly/Weekly Home.md",
  "Journal/Folder Dashboard.md",
  "00 Dashboard/LIFORA Home.md",
  "00 Dashboard/Garden Center.md",
  "00 Dashboard/LIFORA Hub.md",
  "00 Dashboard/LIFORA Home.md",
  "00 Dashboard/Reviews Home.md",
  "00 Dashboard/Welcome.md",
  "00 Dashboard/LIFORA Complete Feature Guide.md",
  "00 Dashboard/LIFORA Brand Guide.md",
  "00 Dashboard/Question ideas for Q&A.md",
  "00 Dashboard/Attachments/README.md",
  "00 Dashboard/LIFORA Premium v1.2.0 - Release Notes.md",
  "00 Dashboard/LIFORA Premium v1.2.1 - Release Notes.md",
  "00 Dashboard/LIFORA Premium v1.2.2 - Release Notes.md"
]);

const SYSTEM_DASHBOARD_FILENAMES = new Set([
  "welcome.md", "lifora home.md", "lifora home.md", "lifora hub.md", "reviews home.md",
  "daily journal home.md", "weekly home.md", "templates home.md",
  "knowledge home.md", "courses home.md", "books home.md",
  "quran home.md", "languages home.md", "daily planner.md",
  "course dashboard.md", "book dashboard.md", "language dashboard.md",
  "section dashboard.md", "folder dashboard.md", "folder notes.md"
]);

const COURSE_STATUSES = [
  { value: "in-progress", label: "In Progress" },
  { value: "planned", label: "Planned" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" }
];

const COURSE_COLORS = [
  { value: "#65a8dc", label: "Ocean Blue" },
  { value: "#55aa83", label: "Garden Green" },
  { value: "#d3ad59", label: "Warm Gold" },
  { value: "#a78bd2", label: "Soft Violet" },
  { value: "#55aaa3", label: "Teal" },
  { value: "#d58fa2", label: "Rose" },
  { value: "#9aa3ad", label: "Slate" }
];


const QURAN_SURAHS = [
  [1, "الفاتحة", "Al-Fatihah", 7], [2, "البقرة", "Al-Baqarah", 286],
  [3, "آل عمران", "Ali 'Imran", 200], [4, "النساء", "An-Nisa", 176],
  [5, "المائدة", "Al-Ma'idah", 120], [6, "الأنعام", "Al-An'am", 165],
  [7, "الأعراف", "Al-A'raf", 206], [8, "الأنفال", "Al-Anfal", 75],
  [9, "التوبة", "At-Tawbah", 129], [10, "يونس", "Yunus", 109],
  [11, "هود", "Hud", 123], [12, "يوسف", "Yusuf", 111],
  [13, "الرعد", "Ar-Ra'd", 43], [14, "إبراهيم", "Ibrahim", 52],
  [15, "الحجر", "Al-Hijr", 99], [16, "النحل", "An-Nahl", 128],
  [17, "الإسراء", "Al-Isra", 111], [18, "الكهف", "Al-Kahf", 110],
  [19, "مريم", "Maryam", 98], [20, "طه", "Ta-Ha", 135],
  [21, "الأنبياء", "Al-Anbiya", 112], [22, "الحج", "Al-Hajj", 78],
  [23, "المؤمنون", "Al-Mu'minun", 118], [24, "النور", "An-Nur", 64],
  [25, "الفرقان", "Al-Furqan", 77], [26, "الشعراء", "Ash-Shu'ara", 227],
  [27, "النمل", "An-Naml", 93], [28, "القصص", "Al-Qasas", 88],
  [29, "العنكبوت", "Al-'Ankabut", 69], [30, "الروم", "Ar-Rum", 60],
  [31, "لقمان", "Luqman", 34], [32, "السجدة", "As-Sajdah", 30],
  [33, "الأحزاب", "Al-Ahzab", 73], [34, "سبأ", "Saba", 54],
  [35, "فاطر", "Fatir", 45], [36, "يس", "Ya-Sin", 83],
  [37, "الصافات", "As-Saffat", 182], [38, "ص", "Sad", 88],
  [39, "الزمر", "Az-Zumar", 75], [40, "غافر", "Ghafir", 85],
  [41, "فصلت", "Fussilat", 54], [42, "الشورى", "Ash-Shura", 53],
  [43, "الزخرف", "Az-Zukhruf", 89], [44, "الدخان", "Ad-Dukhan", 59],
  [45, "الجاثية", "Al-Jathiyah", 37], [46, "الأحقاف", "Al-Ahqaf", 35],
  [47, "محمد", "Muhammad", 38], [48, "الفتح", "Al-Fath", 29],
  [49, "الحجرات", "Al-Hujurat", 18], [50, "ق", "Qaf", 45],
  [51, "الذاريات", "Adh-Dhariyat", 60], [52, "الطور", "At-Tur", 49],
  [53, "النجم", "An-Najm", 62], [54, "القمر", "Al-Qamar", 55],
  [55, "الرحمن", "Ar-Rahman", 78], [56, "الواقعة", "Al-Waqi'ah", 96],
  [57, "الحديد", "Al-Hadid", 29], [58, "المجادلة", "Al-Mujadilah", 22],
  [59, "الحشر", "Al-Hashr", 24], [60, "الممتحنة", "Al-Mumtahanah", 13],
  [61, "الصف", "As-Saff", 14], [62, "الجمعة", "Al-Jumu'ah", 11],
  [63, "المنافقون", "Al-Munafiqun", 11], [64, "التغابن", "At-Taghabun", 18],
  [65, "الطلاق", "At-Talaq", 12], [66, "التحريم", "At-Tahrim", 12],
  [67, "الملك", "Al-Mulk", 30], [68, "القلم", "Al-Qalam", 52],
  [69, "الحاقة", "Al-Haqqah", 52], [70, "المعارج", "Al-Ma'arij", 44],
  [71, "نوح", "Nuh", 28], [72, "الجن", "Al-Jinn", 28],
  [73, "المزمل", "Al-Muzzammil", 20], [74, "المدثر", "Al-Muddaththir", 56],
  [75, "القيامة", "Al-Qiyamah", 40], [76, "الإنسان", "Al-Insan", 31],
  [77, "المرسلات", "Al-Mursalat", 50], [78, "النبأ", "An-Naba", 40],
  [79, "النازعات", "An-Nazi'at", 46], [80, "عبس", "Abasa", 42],
  [81, "التكوير", "At-Takwir", 29], [82, "الانفطار", "Al-Infitar", 19],
  [83, "المطففين", "Al-Mutaffifin", 36], [84, "الانشقاق", "Al-Inshiqaq", 25],
  [85, "البروج", "Al-Buruj", 22], [86, "الطارق", "At-Tariq", 17],
  [87, "الأعلى", "Al-A'la", 19], [88, "الغاشية", "Al-Ghashiyah", 26],
  [89, "الفجر", "Al-Fajr", 30], [90, "البلد", "Al-Balad", 20],
  [91, "الشمس", "Ash-Shams", 15], [92, "الليل", "Al-Layl", 21],
  [93, "الضحى", "Ad-Duha", 11], [94, "الشرح", "Ash-Sharh", 8],
  [95, "التين", "At-Tin", 8], [96, "العلق", "Al-'Alaq", 19],
  [97, "القدر", "Al-Qadr", 5], [98, "البينة", "Al-Bayyinah", 8],
  [99, "الزلزلة", "Az-Zalzalah", 8], [100, "العاديات", "Al-Adiyat", 11],
  [101, "القارعة", "Al-Qari'ah", 11], [102, "التكاثر", "At-Takathur", 8],
  [103, "العصر", "Al-Asr", 3], [104, "الهمزة", "Al-Humazah", 9],
  [105, "الفيل", "Al-Fil", 5], [106, "قريش", "Quraysh", 4],
  [107, "الماعون", "Al-Ma'un", 7], [108, "الكوثر", "Al-Kawthar", 3],
  [109, "الكافرون", "Al-Kafirun", 6], [110, "النصر", "An-Nasr", 3],
  [111, "المسد", "Al-Masad", 5], [112, "الإخلاص", "Al-Ikhlas", 4],
  [113, "الفلق", "Al-Falaq", 5], [114, "الناس", "An-Nas", 6]
].map(([number, name, transliteration, ayahs]) => ({ number, name, transliteration, ayahs }));

const QURAN_TRACKS = [
  { key: "hifz", label: "Memorization", color: "#55aa83", type: "memorization" },
  { key: "reading", label: "Reading", color: "#65a8dc", type: "reading" },
  { key: "review", label: "Revision", color: "#a78bd2", type: "review" }
];
const QURAN_WIRD_TYPES = [
  { value: "memorization", label: "Memorization Wird", key: "hifz", color: "#55aa83" },
  { value: "reading", label: "Reading Wird", key: "reading", color: "#65a8dc" },
  { value: "review", label: "Revision Wird", key: "review", color: "#a78bd2" }
];
const QURAN_UNITS = ["Ayahs", "Pages", "Juz", "Hizb", "Surahs", "Minutes"];
const QURAN_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function localISODate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function quranTrackCount(ranges, totalAyahs) {
  const covered = new Set();
  for (const range of (Array.isArray(ranges) ? ranges : [])) {
    const from = Math.max(1, Math.floor(Number(range.from) || 1));
    const to = Math.min(totalAyahs, Math.floor(Number(range.to) || 0));
    for (let ayah = from; ayah <= to; ayah++) covered.add(ayah);
  }
  return covered.size;
}

function quranTrackPercent(ranges, totalAyahs) {
  return totalAyahs ? Math.round(quranTrackCount(ranges, totalAyahs) / totalAyahs * 100) : 0;
}

const BOOK_STATUSES = [
  { value: "currently-reading", label: "Currently Reading" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" }
];

const BOOK_STATUS_LABELS = {
  "currently-reading": "Currently Reading",
  "unread": "Unread",
  "read": "Read"
};

const BOOK_STATUS_COLORS = {
  "currently-reading": "#55aaa3",
  "unread": "#d3ad59",
  "read": "#65a8dc"
};

function safeName(value) {
  return String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|#^[\]]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "");
}

function yamlString(value) {
  return JSON.stringify(String(value ?? ""));
}

function clampProgress(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function statusLabel(value) {
  return COURSE_STATUSES.find(x => x.value === value)?.label || "Planned";
}

function colorForStatus(status) {
  if (status === "completed") return "#55aa83";
  if (status === "in-progress") return "#65a8dc";
  if (status === "paused") return "#d3ad59";
  return "#a78bd2";
}

class CourseFormModal extends Modal {
  constructor(app, defaults, isNew, onSave, folderOptions = []) {
    super(app);
    this.defaults = defaults || {};
    this.isNew = isNew;
    this.onSave = onSave;
    this.folderOptions = folderOptions || [];
    this.fields = {};
  }

  addField(parent, label, key, type = "text", placeholder = "") {
    const wrap = parent.createDiv({ cls: "tg-course-field" });
    wrap.createEl("label", { text: label });
    const input = wrap.createEl("input", { type, placeholder });
    input.value = this.defaults[key] ?? "";
    this.fields[key] = input;
    return input;
  }

  addSelect(parent, label, key, options) {
    const wrap = parent.createDiv({ cls: "tg-course-field" });
    wrap.createEl("label", { text: label });
    const select = wrap.createEl("select");
    for (const option of options) {
      const el = select.createEl("option", { value: option.value, text: option.label });
      if (String(this.defaults[key] ?? "") === option.value) el.selected = true;
    }
    this.fields[key] = select;
    return select;
  }


  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-course-modal");
    contentEl.createEl("h2", { text: this.isNew ? "Create a New Course" : "Edit Course Details" });
    contentEl.createEl("p", {
      text: this.isNew
        ? "Create one course folder and one continuous study dashboard inside the parent folder you choose."
        : "Update the course information. The course folder and its notes will be preserved.",
      cls: "tg-course-modal-description"
    });

    const form = contentEl.createEl("form", { cls: "tg-course-form" });
    this.addField(form, "Course name", "name", "text", "e.g. SQL Advanced");
    this.addField(form, "Platform", "platform", "text", "e.g. Coursera, Udemy, YouTube");
    this.addField(form, "Instructor", "instructor", "text", "Instructor or course provider");

    if (this.isNew) {
      const folders = [...new Set(["08 Courses", ...this.folderOptions])].sort((a, b) => a.localeCompare(b));
      this.addSelect(form, "Create inside folder", "parent_folder", folders.map(path => ({ value: path, label: path })));
    }

    this.addSelect(form, "Status", "status", COURSE_STATUSES);
    this.addField(form, "Start date", "start_date", "date");
    this.addField(form, "Target date", "target_date", "date");
    this.addField(form, "Course URL", "course_url", "url", "https://");
    this.addSelect(form, "Course color", "course_color", COURSE_COLORS);

    const trackingWrap = form.createDiv({ cls: "tg-course-field tg-course-toggle-field" });
    const trackingLabel = trackingWrap.createEl("label", { cls: "tg-course-toggle-label" });
    const tracking = trackingLabel.createEl("input", { type: "checkbox" });
    tracking.checked = Boolean(this.defaults.progress_tracking ?? this.defaults.progressTracking);
    trackingLabel.createSpan({ text: "Enable progress tracking for this course" });
    trackingWrap.createEl("small", { text: "Progress is calculated only from your completed topics and subtopics." });
    this.fields.progress_tracking = tracking;

    const actions = form.createDiv({ cls: "tg-course-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel", type: "button", cls: "tg-course-btn tg-course-btn-muted" });
    cancel.addEventListener("click", () => this.close());
    const save = actions.createEl("button", {
      text: this.isNew ? "Create Course" : "Save Changes",
      type: "submit",
      cls: "tg-course-btn tg-course-btn-primary"
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = {};
      for (const [key, input] of Object.entries(this.fields)) {
        data[key] = input.type === "checkbox" ? input.checked : input.value.trim();
      }
      data.name = safeName(data.name);
      if (!data.name) {
        new Notice("Enter a course name first.");
        this.fields.name.focus();
        return;
      }
      if (!data.course_color) data.course_color = "#65a8dc";
      try {
        await this.onSave(data);
        this.close();
      } catch (error) {
        console.error("LIFORA course save failed", error);
        new Notice(`Could not save course: ${error.message || error}`);
      }
    });
    this.fields.name.focus();
  }

  onClose() {
    this.contentEl.empty();
  }
}

class ProgressModal extends Modal {
  constructor(app, current, onSave) {
    super(app);
    this.current = current;
    this.onSave = onSave;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-course-modal");
    contentEl.createEl("h2", { text: "Update Course Progress" });
    const wrap = contentEl.createDiv({ cls: "tg-course-field" });
    wrap.createEl("label", { text: "Completion (0–100%)" });
    const input = wrap.createEl("input", { type: "number", attr: { min: "0", max: "100", step: "1" } });
    input.value = String(this.current);
    const actions = contentEl.createDiv({ cls: "tg-course-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel", cls: "tg-course-btn tg-course-btn-muted" });
    cancel.addEventListener("click", () => this.close());
    const save = actions.createEl("button", { text: "Save Progress", cls: "tg-course-btn tg-course-btn-primary" });
    save.addEventListener("click", async () => {
      const value = Number(input.value);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        new Notice("Progress must be between 0 and 100.");
        return;
      }
      await this.onSave(Math.round(value));
      this.close();
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

class CourseProgressModal extends Modal {
  constructor(app, plugin, file) {
    super(app);
    this.plugin = plugin;
    this.file = file;
  }

  onOpen() {
    this.render();
  }

  async render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-course-progress-modal");
    const course = this.plugin.getCourseData(this.file);
    contentEl.createEl("h2", { text: `${course.name} progress` });
    contentEl.createEl("p", {
      text: "Enable tracking only when you want progress calculated from your own topics and subtopics.",
      cls: "tg-course-modal-description"
    });

    const setting = contentEl.createDiv({ cls: "tg-course-progress-setting" });
    const label = setting.createEl("label", { cls: "tg-course-toggle-label" });
    const toggle = label.createEl("input", { type: "checkbox" });
    toggle.checked = course.progressTracking;
    label.createSpan({ text: "Enable progress tracking" });
    toggle.addEventListener("change", async () => {
      await this.plugin.app.fileManager.processFrontMatter(this.file, frontmatter => {
        frontmatter.progress_tracking = toggle.checked;
      });
      new Notice(toggle.checked ? "Progress tracking enabled." : "Progress tracking disabled.");
      this.render();
    });

    if (!toggle.checked) {
      const empty = contentEl.createDiv({ cls: "tg-course-progress-off" });
      this.plugin.createPremiumIcon(empty, "chart-no-axes-combined", "tg-premium-svg-icon", "Progress tracking");
      empty.createEl("strong", { text: "Progress is off" });
      empty.createEl("p", { text: "Enable it above to build a topic tree and calculate completion from checked subtopics." });
      return;
    }

    this.plugin.renderCourseTopics(contentEl, this.file, this.plugin.getCourseData(this.file));
  }

  onClose() {
    this.contentEl.empty();
  }
}

class GoalFormModal extends Modal {
  constructor(app, defaults, isNew, onSave) {
    super(app);
    this.defaults = defaults || {};
    this.isNew = isNew;
    this.onSave = onSave;
    this.fields = {};
  }

  field(form, label, key, type = "text", placeholder = "") {
    const wrap = form.createDiv({ cls: "tg-course-field" });
    wrap.createEl("label", { text: label });
    const input = wrap.createEl("input", { type, placeholder });
    input.value = this.defaults[key] ?? "";
    this.fields[key] = input;
    return input;
  }

  select(form, label, key, options) {
    const wrap = form.createDiv({ cls: "tg-course-field" });
    wrap.createEl("label", { text: label });
    const input = wrap.createEl("select");
    options.forEach(([value, text]) => input.createEl("option", { value, text }));
    input.value = this.defaults[key] || options[0][0];
    this.fields[key] = input;
    return input;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-goal-form-modal", "tg-course-modal");
    contentEl.createEl("h2", { text: this.isNew ? "Create a new goal" : "Edit goal" });
    contentEl.createEl("p", {
      text: "Shape the goal once, then update milestones as your work moves forward.",
      cls: "tg-course-modal-description"
    });
    const form = contentEl.createEl("form", { cls: "tg-course-form" });
    this.field(form, "Goal name", "title", "text", "e.g. Build a portfolio");
    const description = form.createDiv({ cls: "tg-course-field tg-topic-full" });
    description.createEl("label", { text: "Description" });
    const descriptionInput = description.createEl("textarea", { attr: { rows: "3", placeholder: "What would make this goal meaningful?" } });
    descriptionInput.value = this.defaults.description || "";
    this.fields.description = descriptionInput;
    this.select(form, "Goal type", "goal_type", [["milestone", "Milestone-based"], ["target", "Target-based"]]);
    this.select(form, "Status", "status", [["planned", "Planned"], ["active", "Active"], ["paused", "Paused"], ["completed", "Completed"], ["archived", "Archived"]]);
    this.select(form, "Priority", "priority", [["low", "Low"], ["medium", "Medium"], ["high", "High"]]);
    this.field(form, "Due date", "due_date", "date");
    this.field(form, "Target value", "target_value", "number", "Optional for target goals");
    this.field(form, "Unit", "unit", "text", "books, lessons, hours...");
    this.field(form, "Linked sections", "linked_sections", "text", "Courses, Books, Notes");
    const actions = form.createDiv({ cls: "tg-course-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel", type: "button", cls: "tg-goals-secondary" });
    cancel.addEventListener("click", () => this.close());
    const save = actions.createEl("button", { text: this.isNew ? "Create goal" : "Save changes", type: "submit", cls: "tg-goals-primary" });
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const data = Object.fromEntries(Object.entries(this.fields).map(([key, input]) => [key, input.value.trim()]));
      if (!data.title) {
        new Notice("Enter a goal name first.");
        this.fields.title.focus();
        return;
      }
      data.linked_sections = data.linked_sections.split(",").map(item => item.trim()).filter(Boolean);
      data.target_value = Number(data.target_value || 0);
      try {
        save.disabled = true;
        await this.onSave(data);
        this.close();
      } catch (error) {
        save.disabled = false;
        new Notice(`Could not save goal: ${error.message || error}`);
      }
    });
    this.fields.title.focus();
  }

  onClose() {
    this.contentEl.empty();
  }
}



class TopicFormModal extends Modal {
  constructor(app, defaults, onSave, isSubtopic = false) {
    super(app);
    this.defaults = defaults || {};
    this.onSave = onSave;
    this.isSubtopic = Boolean(isSubtopic);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-course-modal");
    const isEdit = Boolean(this.defaults.id);
    const noun = this.isSubtopic ? "Subtopic" : "Topic";
    contentEl.createEl("h2", { text: isEdit ? `Edit ${noun}` : `Add ${noun}` });
    const form = contentEl.createEl("form", { cls: "tg-course-form tg-topic-form" });

    const titleWrap = form.createDiv({ cls: "tg-course-field tg-topic-full" });
    titleWrap.createEl("label", { text: `${noun} name` });
    const title = titleWrap.createEl("input", {
      type: "text",
      placeholder: this.isSubtopic ? "Enter a subtopic name" : "Enter the topic you want to study",
      attr: { maxlength: "180", autocomplete: "off" }
    });
    title.value = this.defaults.title || "";

    const descriptionWrap = form.createDiv({ cls: "tg-course-field tg-topic-full" });
    descriptionWrap.createEl("label", { text: "Short description (optional)" });
    const description = descriptionWrap.createEl("textarea", { attr: { rows: "3" } });
    description.value = this.defaults.description || "";

    const actions = form.createDiv({ cls: "tg-course-modal-actions" });
    const cancel = actions.createEl("button", {
      text: "Cancel", type: "button", cls: "tg-course-btn tg-course-btn-muted"
    });
    cancel.addEventListener("click", () => this.close());
    actions.createEl("button", {
      text: isEdit ? `Save ${noun}` : `Add ${noun}`,
      type: "submit",
      cls: "tg-course-btn tg-course-btn-primary"
    });

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const cleanTitle = String(title.value || "").trim().replace(/\s+/g, " ");
      const data = {
        id: this.defaults.id || `topic-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        title: safeName(cleanTitle),
        description: description.value.trim(),
        completed: Boolean(this.defaults.completed),
        created: this.defaults.created || new Date().toISOString().slice(0, 10),
        completed_at: this.defaults.completed_at || "",
        subtopics: Array.isArray(this.defaults.subtopics) ? this.defaults.subtopics : []
      };
      if (!data.title) {
        new Notice(`Enter a ${noun.toLowerCase()} name first.`);
        title.focus();
        return;
      }
      const submit = form.querySelector('button[type="submit"]');
      if (submit) submit.disabled = true;
      try {
        await this.onSave(data);
        this.close();
      } catch (error) {
        console.error("LIFORA could not save this course topic.", error);
        new Notice(`Could not save ${noun.toLowerCase()}: ${error?.message || "Please try again."}`);
        if (submit) submit.disabled = false;
      }
    });
    title.focus();
  }

  onClose() {
    this.contentEl.empty();
  }
}

class BookFormModal extends Modal {
  constructor(app, defaults, genres, isNew, onSave) {
    super(app);
    this.defaults = defaults || {};
    this.genres = genres || [];
    this.isNew = isNew;
    this.onSave = onSave;
    this.fields = {};
  }

  addField(parent, label, key, type = "text", placeholder = "") {
    const wrap = parent.createDiv({ cls: "tg-course-field" });
    wrap.createEl("label", { text: label });
    const input = wrap.createEl("input", { type, placeholder });
    input.value = this.defaults[key] ?? "";
    this.fields[key] = input;
    return input;
  }

  addSelect(parent, label, key, options) {
    const wrap = parent.createDiv({ cls: "tg-course-field" });
    wrap.createEl("label", { text: label });
    const select = wrap.createEl("select");
    for (const option of options) {
      const el = select.createEl("option", { value: option.value, text: option.label });
      if (String(this.defaults[key] ?? "") === option.value) el.selected = true;
    }
    this.fields[key] = select;
    return select;
  }

  addCategoryInput(parent, key, categories) {
    const wrap = parent.createDiv({ cls: "tg-course-field tg-book-category-field" });
    wrap.createEl("label", { text: "Book category" });
    const listId = `tg-book-category-list-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const input = wrap.createEl("input", {
      type: "text",
      placeholder: "Choose a category or type a new one",
      attr: { list: listId, autocomplete: "off" }
    });
    input.value = String(this.defaults[key] ?? "").replace(/^09 Books\//, "");
    const list = wrap.createEl("datalist", { attr: { id: listId } });
    for (const path of categories || []) {
      list.createEl("option", { attr: { value: path.replace(/^09 Books\//, "") } });
    }
    wrap.createEl("small", {
      text: "Select an existing category or type a new one. New categories are saved automatically.",
      cls: "tg-course-field-hint"
    });
    this.fields[key] = input;
    return input;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-course-modal");
    contentEl.createEl("h2", { text: this.isNew ? "Add a Book" : "Edit Book Details" });
    contentEl.createEl("p", {
      text: this.isNew
        ? "Add the book details, then upload the book file and cover from its own page."
        : "Update the book information. Your reading notes and uploaded files will stay in place.",
      cls: "tg-course-modal-description"
    });

    const form = contentEl.createEl("form", { cls: "tg-course-form" });
    this.addField(form, "Book title", "title", "text", "Enter the book title");
    this.addField(form, "Author", "author", "text", "Author name");
    this.addField(form, "Total pages", "total_pages", "number", "e.g. 320");
    this.addSelect(form, "Reading status", "status", BOOK_STATUSES);
    this.addCategoryInput(form, "genre", this.genres);

    const actions = form.createDiv({ cls: "tg-course-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel", type: "button", cls: "tg-course-btn tg-course-btn-muted" });
    cancel.addEventListener("click", () => this.close());
    actions.createEl("button", {
      text: this.isNew ? "Create Book" : "Save Changes",
      type: "submit",
      cls: "tg-course-btn tg-course-btn-primary"
    });

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const data = {};
      for (const [key, input] of Object.entries(this.fields)) data[key] = input.value.trim();
      data.title = safeName(data.title);
      data.total_pages = Math.max(0, Math.floor(Number(data.total_pages) || 0));
      if (!data.title) {
        new Notice("Enter the book title first.");
        this.fields.title.focus();
        return;
      }
      if (data.total_pages < 1) {
        new Notice("Enter the total number of pages.");
        this.fields.total_pages.focus();
        return;
      }
      try {
        await this.onSave(data);
        this.close();
      } catch (error) {
        console.error("LIFORA book save failed", error);
        new Notice(`Could not save book: ${error.message || error}`);
      }
    });
    this.fields.title.focus();
  }

  onClose() {
    this.contentEl.empty();
  }
}

class BookGenreModal extends Modal {
  constructor(app, genres, onSave) {
    super(app);
    this.genres = genres || [];
    this.onSave = onSave;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-course-modal");
    contentEl.createEl("h2", { text: "Create Book Category Folder" });
    contentEl.createEl("p", {
      text: "Create your own category, such as Science, History, Novels, or any structure you prefer.",
      cls: "tg-course-modal-description"
    });

    const form = contentEl.createEl("form", { cls: "tg-course-form" });
    const nameWrap = form.createDiv({ cls: "tg-course-field" });
    nameWrap.createEl("label", { text: "Folder name" });
    const name = nameWrap.createEl("input", { type: "text", placeholder: "e.g. Science" });

    const parentWrap = form.createDiv({ cls: "tg-course-field" });
    parentWrap.createEl("label", { text: "Inside another category (optional)" });
    const parent = parentWrap.createEl("select");
    parent.createEl("option", { value: "", text: "Main Books folder" });
    for (const path of this.genres) {
      parent.createEl("option", { value: path, text: path.replace(/^09 Books\//, "") });
    }

    const actions = form.createDiv({ cls: "tg-course-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel", type: "button", cls: "tg-course-btn tg-course-btn-muted" });
    cancel.addEventListener("click", () => this.close());
    actions.createEl("button", { text: "Create Folder", type: "submit", cls: "tg-course-btn tg-course-btn-primary" });

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const folderName = safeName(name.value);
      if (!folderName) {
        new Notice("Enter a category folder name.");
        name.focus();
        return;
      }
      try {
        await this.onSave({ name: folderName, parent: parent.value });
        this.close();
      } catch (error) {
        console.error("LIFORA book category creation failed", error);
        new Notice(`Could not create category: ${error.message || error}`);
      }
    });
    name.focus();
  }

  onClose() {
    this.contentEl.empty();
  }
}

class BookCategoryDeleteConfirmModal extends Modal {
  constructor(app, path, stats, onDelete) {
    super(app);
    this.path = path;
    this.stats = stats || { books: 0, subcategories: 0 };
    this.onDelete = onDelete;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-course-modal", "tg-book-category-delete-modal");
    contentEl.createEl("h2", { text: "Delete this category?" });
    const details = this.stats.books > 0 || this.stats.subcategories > 0
      ? `This will delete the category folder from this vault, including ${this.stats.books} book(s) and ${this.stats.subcategories} nested categor${this.stats.subcategories === 1 ? "y" : "ies"}.`
      : "This category folder is empty and will be removed from the saved category list.";
    contentEl.createEl("p", { text: details, cls: "tg-course-modal-description" });
    contentEl.createEl("p", { text: this.path.replace(/^09 Books\//, ""), cls: "tg-book-category-delete-path" });
    const actions = contentEl.createDiv({ cls: "tg-course-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel", type: "button", cls: "tg-course-btn tg-course-btn-muted" });
    cancel.addEventListener("click", () => this.close());
    const remove = actions.createEl("button", { text: "Delete Category & Contents", type: "button", cls: "tg-course-btn tg-course-btn-danger" });
    remove.addEventListener("click", async () => {
      remove.disabled = true;
      try {
        await this.onDelete(this.path);
        this.close();
      } catch (error) {
        remove.disabled = false;
        console.error("LIFORA category deletion failed", error);
        new Notice(`Could not delete category: ${error.message || error}`);
      }
    });
  }

  onClose() { this.contentEl.empty(); }
}

class BookCategoryManagerModal extends Modal {
  constructor(app, getCategories, getStats, onDelete) {
    super(app);
    this.getCategories = getCategories;
    this.getStats = getStats;
    this.onDelete = onDelete;
  }

  onOpen() { this.render(); }

  render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-course-modal", "tg-book-category-manager-modal");
    contentEl.createEl("h2", { text: "Manage Book Categories" });
    contentEl.createEl("p", {
      text: "Categories are real folders. Deleting a category also deletes the books and nested categories inside it, after confirmation.",
      cls: "tg-course-modal-description"
    });
    const categories = this.getCategories() || [];
    const list = contentEl.createDiv({ cls: "tg-book-category-manager-list" });
    if (!categories.length) {
      const empty = list.createDiv({ cls: "tg-book-category-manager-empty" });
      setIcon(empty.createSpan(), "folder-open");
      empty.createEl("strong", { text: "No saved categories" });
      empty.createEl("span", { text: "Create a category when adding a book or use New Category." });
    } else {
      for (const path of categories) {
        const stats = this.getStats(path);
        const row = list.createDiv({ cls: "tg-book-category-manager-row" });
        const icon = row.createDiv({ cls: "tg-book-category-manager-icon" });
        setIcon(icon, "folder");
        const copy = row.createDiv({ cls: "tg-book-category-manager-copy" });
        copy.createEl("strong", { text: path.replace(/^09 Books\//, "") });
        copy.createSpan({ text: `${stats.books} books · ${stats.subcategories} nested categories` });
        const remove = row.createEl("button", {
          text: "Delete",
          cls: "tg-course-btn tg-course-btn-danger tg-book-category-manager-delete",
          attr: { type: "button" }
        });
        remove.addEventListener("click", () => {
          new BookCategoryDeleteConfirmModal(this.app, path, stats, async target => {
            await this.onDelete(target);
            this.render();
          }).open();
        });
      }
    }
    const actions = contentEl.createDiv({ cls: "tg-course-modal-actions" });
    const close = actions.createEl("button", { text: "Close", type: "button", cls: "tg-course-btn tg-course-btn-muted" });
    close.addEventListener("click", () => this.close());
  }

  onClose() { this.contentEl.empty(); }
}

class BookPageModal extends Modal {
  constructor(app, currentPage, totalPages, onSave) {
    super(app);
    this.currentPage = currentPage;
    this.totalPages = totalPages;
    this.onSave = onSave;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-course-modal");
    contentEl.createEl("h2", { text: "Update Reading Position" });
    contentEl.createEl("p", {
      text: `Enter the last page you reached (out of ${this.totalPages}).`,
      cls: "tg-course-modal-description"
    });
    const wrap = contentEl.createDiv({ cls: "tg-course-field" });
    wrap.createEl("label", { text: "I have reached page" });
    const input = wrap.createEl("input", {
      type: "number",
      attr: { min: "0", max: String(this.totalPages), step: "1" }
    });
    input.value = String(this.currentPage);
    const actions = contentEl.createDiv({ cls: "tg-course-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel", cls: "tg-course-btn tg-course-btn-muted" });
    cancel.addEventListener("click", () => this.close());
    const save = actions.createEl("button", { text: "Save Page", cls: "tg-course-btn tg-course-btn-primary" });
    save.addEventListener("click", async () => {
      const page = Math.floor(Number(input.value));
      if (!Number.isFinite(page) || page < 0 || page > this.totalPages) {
        new Notice(`Page must be between 0 and ${this.totalPages}.`);
        return;
      }
      await this.onSave(page);
      this.close();
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}


class BookCompletionModal extends Modal {
  constructor(app, bookTitle, currentPage, totalPages, onConfirm, message = "You have reached the end of this book. Would you like to move it to your Read list?") {
    super(app);
    this.bookTitle = bookTitle;
    this.currentPage = currentPage;
    this.totalPages = totalPages;
    this.onConfirm = onConfirm;
    this.message = message;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-course-modal", "tg-book-completion-modal");
    const icon = contentEl.createDiv({ cls: "tg-book-completion-icon" });
    setIcon(icon, "book-check");
    contentEl.createEl("h2", { text: "Finished reading?" });
    contentEl.createEl("p", {
      text: this.message,
      cls: "tg-course-modal-description"
    });
    if (this.totalPages) {
      contentEl.createEl("div", {
        text: `${this.bookTitle} · Page ${this.currentPage} of ${this.totalPages}`,
        cls: "tg-book-completion-meta"
      });
    }
    const actions = contentEl.createDiv({ cls: "tg-course-modal-actions" });
    const cancel = actions.createEl("button", {
      text: "Keep Reading",
      type: "button",
      cls: "tg-course-btn tg-course-btn-muted"
    });
    cancel.addEventListener("click", () => this.close());
    const confirm = actions.createEl("button", {
      text: "Move to Read",
      type: "button",
      cls: "tg-course-btn tg-course-btn-success"
    });
    confirm.addEventListener("click", async () => {
      confirm.disabled = true;
      try {
        await this.onConfirm();
        this.close();
      } catch (error) {
        confirm.disabled = false;
        console.error("LIFORA book completion failed", error);
        new Notice(`Could not update reading status: ${error.message || error}`);
      }
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

class QuranRangeModal extends Modal {
  constructor(app, surah, track, onSave) {
    super(app);
    this.surah = surah;
    this.track = track;
    this.onSave = onSave;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-quran-modal");
    const track = QURAN_TRACKS.find(item => item.key === this.track);
    contentEl.createEl("h2", { text: `Log ${track.label} — ${this.surah.transliteration} (${this.surah.name})` });
    contentEl.createEl("p", { text: `Enter the ayah range you completed. This Surah contains ${this.surah.ayahs} ayahs.`, cls: "tg-course-modal-description" });
    const form = contentEl.createEl("form", { cls: "tg-quran-form" });
    const makeField = (label, type, value, min, max) => {
      const wrap = form.createDiv({ cls: "tg-course-field" });
      wrap.createEl("label", { text: label });
      const input = wrap.createEl("input", { type, attr: { min: String(min), max: String(max), step: "1" } });
      input.value = String(value);
      return input;
    };
    const from = makeField("From ayah", "number", 1, 1, this.surah.ayahs);
    const to = makeField("To ayah", "number", this.surah.ayahs, 1, this.surah.ayahs);
    const noteWrap = form.createDiv({ cls: "tg-course-field tg-quran-full" });
    noteWrap.createEl("label", { text: "Note (optional)" });
    const note = noteWrap.createEl("textarea", { attr: { rows: "2", placeholder: "e.g. Recited without mistakes" } });
    const actions = form.createDiv({ cls: "tg-course-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel", type: "button", cls: "tg-course-btn tg-course-btn-muted" });
    cancel.addEventListener("click", () => this.close());
    actions.createEl("button", { text: "Save progress", type: "submit", cls: "tg-course-btn tg-course-btn-primary" });
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const start = Math.floor(Number(from.value));
      const end = Math.floor(Number(to.value));
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 1 || end < start || end > this.surah.ayahs) {
        new Notice(`The range must be between 1 and ${this.surah.ayahs}, and the ending ayah must not precede the starting ayah.`);
        return;
      }
      await this.onSave({ from: start, to: end, note: note.value.trim(), date: localISODate() });
      this.close();
    });
  }
  onClose() { this.contentEl.empty(); }
}

class QuranWirdModal extends Modal {
  constructor(app, defaults, onSave) {
    super(app);
    this.defaults = defaults || {};
    this.onSave = onSave;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-quran-modal");
    contentEl.createEl("h2", { text: this.defaults.id ? "Edit Wird" : "Add a New Wird" });
    contentEl.createEl("p", { text: "Customize the wird type, target, time, and repeat days. You can create multiple wirds for each type.", cls: "tg-course-modal-description" });
    const form = contentEl.createEl("form", { cls: "tg-quran-form" });
    const field = (label, key, type = "text", placeholder = "") => {
      const wrap = form.createDiv({ cls: "tg-course-field" });
      wrap.createEl("label", { text: label });
      const input = wrap.createEl("input", { type, placeholder });
      input.value = this.defaults[key] ?? "";
      return input;
    };
    const select = (label, key, options) => {
      const wrap = form.createDiv({ cls: "tg-course-field" });
      wrap.createEl("label", { text: label });
      const el = wrap.createEl("select");
      for (const option of options) {
        const value = typeof option === "string" ? option : option.value;
        const text = typeof option === "string" ? option : option.label;
        const opt = el.createEl("option", { value, text });
        if (String(this.defaults[key] ?? "") === String(value)) opt.selected = true;
      }
      return el;
    };
    const full = (label, placeholder = "") => {
      const wrap = form.createDiv({ cls: "tg-course-field tg-quran-full" });
      wrap.createEl("label", { text: label });
      const area = wrap.createEl("textarea", { attr: { rows: "2", placeholder } });
      area.value = this.defaults.notes || "";
      return area;
    };
    const title = field("Wird name", "title", "text", "e.g. Memorize a new page");
    const type = select("Wird type", "type", QURAN_WIRD_TYPES.map(x => ({ value: x.value, label: x.label })));
    const surahOptions = [{ value: "", label: "Not linked to a specific Surah" }, ...QURAN_SURAHS.map(x => ({ value: String(x.number), label: `${x.number}. ${x.transliteration} (${x.name}) — ${x.ayahs} ayahs` }))];
    const surah = select("Surah (optional)", "surah", surahOptions);
    const from = field("From ayah (optional)", "from", "number", "1");
    const to = field("To ayah (optional)", "to", "number", "10");
    from.min = "1";
    to.min = "1";
    const amount = field("Target amount", "amount", "number", "e.g. 5");
    amount.min = "1";
    const unit = select("Unit", "unit", QURAN_UNITS);
    const time = field("Wird time / period", "time", "text", "e.g. After Fajr");
    const repeat = select("Repeat", "repeat", [
      { value: "daily", label: "Daily" },
      { value: "selected-days", label: "Selected weekdays" },
      { value: "once", label: "Once on a specific date" }
    ]);
    const onceDate = field("Scheduled date", "onceDate", "date");
    const daysWrap = form.createDiv({ cls: "tg-course-field tg-quran-full tg-quran-days-wrap" });
    daysWrap.createEl("label", { text: "Repeat days" });
    const daysGrid = daysWrap.createDiv({ cls: "tg-quran-days" });
    const defaultDays = Array.isArray(this.defaults.days) ? this.defaults.days : [0,1,2,3,4,5,6];
    const dayInputs = [];
    QURAN_WEEKDAYS.forEach((day, index) => {
      const label = daysGrid.createEl("label", { cls: "tg-quran-day-option" });
      const checkbox = label.createEl("input", { type: "checkbox" });
      checkbox.checked = defaultDays.includes(index);
      label.createSpan({ text: day });
      dayInputs.push(checkbox);
    });
    const startDate = field("Start date (optional)", "startDate", "date");
    const endDate = field("End date (optional)", "endDate", "date");
    const notes = full("Notes (optional)", "Add any details that help you stay consistent.");
    const enabledWrap = form.createDiv({ cls: "tg-course-field tg-quran-full" });
    const enabledLabel = enabledWrap.createEl("label", { cls: "tg-quran-enabled-label" });
    const enabled = enabledLabel.createEl("input", { type: "checkbox" });
    enabled.checked = this.defaults.enabled !== false;
    enabledLabel.createSpan({ text: "Enable this wird" });

    const updateScheduleFields = () => {
      daysWrap.toggleClass("is-hidden", repeat.value !== "selected-days");
      onceDate.parentElement.toggleClass("is-hidden", repeat.value !== "once");
    };
    repeat.addEventListener("change", updateScheduleFields);
    updateScheduleFields();
    const updateAyahBounds = () => {
      const selected = QURAN_SURAHS.find(x => x.number === Number(surah.value));
      const hasSurah = Boolean(selected);
      from.disabled = !hasSurah;
      to.disabled = !hasSurah;
      from.max = hasSurah ? String(selected.ayahs) : "";
      to.max = hasSurah ? String(selected.ayahs) : "";
      if (!hasSurah) { from.value = ""; to.value = ""; }
      else {
        if (!from.value) from.value = "1";
        if (!to.value) to.value = String(Math.min(selected.ayahs, Number(from.value) || 1));
      }
    };
    surah.addEventListener("change", updateAyahBounds);
    updateAyahBounds();

    const actions = form.createDiv({ cls: "tg-course-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel", type: "button", cls: "tg-course-btn tg-course-btn-muted" });
    cancel.addEventListener("click", () => this.close());
    actions.createEl("button", { text: this.defaults.id ? "Save changes" : "Add Wird", type: "submit", cls: "tg-course-btn tg-course-btn-primary" });

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const cleanTitle = title.value.trim();
      if (!cleanTitle) { new Notice("Enter a name for this wird first."); title.focus(); return; }
      const selectedSurah = surah.value ? Number(surah.value) : null;
      const start = from.value.trim() ? Math.floor(Number(from.value)) : null;
      const end = to.value.trim() ? Math.floor(Number(to.value)) : null;
      if ((start !== null || end !== null) && (!selectedSurah || start === null || end === null)) {
        new Notice("Choose a Surah and enter both the starting and ending ayahs, or leave the ayah range empty."); return;
      }
      const surahMeta = QURAN_SURAHS.find(x => x.number === selectedSurah);
      if (selectedSurah && start !== null && (start < 1 || end < start || end > surahMeta.ayahs)) {
        new Notice(`Invalid ayah range. ${surahMeta.transliteration} contains ${surahMeta.ayahs} ayahs.`); return;
      }
      const target = Math.floor(Number(amount.value));
      if (!Number.isFinite(target) || target < 1) { new Notice("Enter a target amount greater than zero."); amount.focus(); return; }
      const days = dayInputs.map((input, index) => input.checked ? index : -1).filter(index => index >= 0);
      if (repeat.value === "selected-days" && !days.length) { new Notice("Select at least one weekday."); return; }
      if (repeat.value === "once" && !onceDate.value) { new Notice("Choose a date for this wird."); onceDate.focus(); return; }
      if (startDate.value && endDate.value && endDate.value < startDate.value) { new Notice("The end date cannot be earlier than the start date."); return; }
      await this.onSave({
        id: this.defaults.id || `wird-${Date.now()}`,
        title: cleanTitle,
        type: type.value,
        surah: selectedSurah,
        from: start,
        to: end,
        amount: target,
        unit: unit.value,
        time: time.value.trim(),
        repeat: repeat.value,
        onceDate: onceDate.value,
        days,
        startDate: startDate.value,
        endDate: endDate.value,
        notes: notes.value.trim(),
        enabled: enabled.checked,
        created: this.defaults.created || localISODate()
      });
      this.close();
    });
  }
  onClose() { this.contentEl.empty(); }
}

class QuranSurahModal extends Modal {
  constructor(app, surah, progress, onAddRange, onDeleteRange) {
    super(app);
    this.surah = surah;
    this.progress = progress;
    this.reloadProgress = progress._reload;
    this.onAddRange = onAddRange;
    this.onDeleteRange = onDeleteRange;
  }
  onOpen() { this.render(); }
  render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-quran-modal tg-quran-surah-modal");
    const header = contentEl.createDiv({ cls: "tg-quran-surah-modal-head" });
    header.createDiv({ cls: "tg-quran-surah-number", text: String(this.surah.number).padStart(3, "0") });
    const heading = header.createDiv();
    heading.createEl("h2", { text: `Surah ${this.surah.transliteration} (${this.surah.name})` });
    heading.createEl("p", { text: `${this.surah.ayahs} ayahs` });
    for (const track of QURAN_TRACKS) {
      const ranges = this.progress[`${track.key}Ranges`] || [];
      const count = quranTrackCount(ranges, this.surah.ayahs);
      const percent = quranTrackPercent(ranges, this.surah.ayahs);
      const section = contentEl.createDiv({ cls: "tg-quran-track-section" });
      const line = section.createDiv({ cls: "tg-quran-track-heading" });
      line.createEl("strong", { text: track.label });
      line.createEl("span", { text: `${count} / ${this.surah.ayahs} ayahs · ${percent}%` });
      const bar = section.createDiv({ cls: "tg-quran-track-bar" });
      const fill = bar.createDiv({ cls: "tg-quran-track-fill" });
      fill.style.width = `${percent}%`;
      fill.style.background = track.color;
      const add = this.iconButton(section, `Log ${track.label} progress`, "plus", "tg-course-btn tg-course-btn-muted tg-quran-add-range");
      add.addEventListener("click", () => {
        new QuranRangeModal(this.app, this.surah, track.key, async range => {
          await this.onAddRange(track.key, range);
          this.progress = await this.reloadProgress();
          this.render();
        }).open();
      });
      if (ranges.length) {
        const history = section.createDiv({ cls: "tg-quran-range-history" });
        [...ranges].sort((a,b) => String(b.date || "").localeCompare(String(a.date || ""))).forEach(range => {
          const row = history.createDiv({ cls: "tg-quran-range-row" });
          row.createSpan({ text: `Ayahs ${range.from}–${range.to}${range.date ? ` · ${range.date}` : ""}` });
          if (range.note) row.createSpan({ text: range.note, cls: "tg-quran-range-note" });
          const remove = row.createEl("button", { text: "Delete", cls: "tg-topic-action tg-topic-delete" });
          remove.addEventListener("click", async () => {
            if (!window.confirm("Delete this recorded ayah range?")) return;
            await this.onDeleteRange(track.key, range.id);
            this.progress = await this.reloadProgress();
            this.render();
          });
        });
      } else {
        section.createEl("p", { text: "No progress has been recorded in this track yet.", cls: "tg-quran-empty-hint" });
      }
    }
    const close = contentEl.createEl("button", { text: "Close", cls: "tg-course-btn tg-course-btn-muted tg-quran-close" });
    close.addEventListener("click", () => this.close());
  }
  onClose() { this.contentEl.empty(); }
}


const LANGUAGE_LEVELS = [
  { value: "A1", label: "A1 · Beginner" },
  { value: "A2", label: "A2 · Elementary" },
  { value: "B1", label: "B1 · Intermediate" },
  { value: "B2", label: "B2 · Upper Intermediate" },
  { value: "C1", label: "C1 · Advanced" },
  { value: "C2", label: "C2 · Proficient" }
];

const LANGUAGE_SKILLS = [
  { value: "vocabulary", label: "Vocabulary" },
  { value: "grammar", label: "Grammar" },
  { value: "listening", label: "Listening" },
  { value: "speaking", label: "Speaking" },
  { value: "reading", label: "Reading" },
  { value: "writing", label: "Writing" },
  { value: "pronunciation", label: "Pronunciation" },
  { value: "general", label: "General" }
];

const LANGUAGE_ACTIVITIES = [
  { value: "vocabulary", label: "Vocabulary" },
  { value: "grammar", label: "Grammar" },
  { value: "listening", label: "Listening" },
  { value: "speaking", label: "Speaking" },
  { value: "reading", label: "Reading" },
  { value: "writing", label: "Writing" },
  { value: "pronunciation", label: "Pronunciation" },
  { value: "review", label: "Revision" }
];

class LanguageFormModal extends Modal {
  constructor(app, defaults, isNew, onSave) {
    super(app);
    this.defaults = defaults || {};
    this.isNew = isNew;
    this.onSave = onSave;
    this.fields = {};
  }

  addField(parent, label, key, type = "text", placeholder = "") {
    const wrap = parent.createDiv({ cls: "tg-course-field" });
    wrap.createEl("label", { text: label });
    const input = wrap.createEl("input", { type, placeholder });
    input.value = this.defaults[key] ?? "";
    this.fields[key] = input;
    return input;
  }

  addSelect(parent, label, key, options) {
    const wrap = parent.createDiv({ cls: "tg-course-field" });
    wrap.createEl("label", { text: label });
    const select = wrap.createEl("select");
    for (const option of options) {
      const item = select.createEl("option", { value: option.value, text: option.label });
      if (String(this.defaults[key] ?? "") === option.value) item.selected = true;
    }
    this.fields[key] = select;
    return select;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-course-modal");
    contentEl.createEl("h2", { text: this.isNew ? "Add a Language" : "Language Settings" });
    contentEl.createEl("p", {
      text: this.isNew
        ? "Start at A1 by default, or choose any level you already know. No placement test is required."
        : "Change your learning level and daily goal whenever you need.",
      cls: "tg-course-modal-description"
    });

    const form = contentEl.createEl("form", { cls: "tg-course-form" });
    this.addField(form, "Language name", "name", "text", "e.g. German");
    this.addField(form, "Native name (optional)", "native_name", "text", "e.g. Deutsch");
    this.addField(form, "Language / region code (optional)", "flag", "text", "e.g. DE");
    this.addSelect(form, "Your starting / current level", "current_level", LANGUAGE_LEVELS);
    this.addSelect(form, "Target level (optional)", "target_level", [
      { value: "", label: "No target yet" }, ...LANGUAGE_LEVELS
    ]);
    this.addField(form, "Daily study goal (minutes)", "daily_goal_minutes", "number", "e.g. 20");

    const hint = form.createDiv({ cls: "tg-language-form-hint" });
    hint.createEl("strong", { text: "Your choice, your pace." });
    hint.createEl("span", { text: "You can start at A1 or jump directly to A2, B1, B2, C1, or C2. Nothing is locked." });

    const actions = form.createDiv({ cls: "tg-course-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel", type: "button", cls: "tg-course-btn tg-course-btn-muted" });
    cancel.addEventListener("click", () => this.close());
    actions.createEl("button", {
      text: this.isNew ? "Create Language Space" : "Save Settings",
      type: "submit",
      cls: "tg-course-btn tg-course-btn-primary"
    });

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const data = {};
      for (const [key, input] of Object.entries(this.fields)) data[key] = input.value.trim();
      data.name = safeName(data.name);
      data.daily_goal_minutes = Math.max(0, Math.floor(Number(data.daily_goal_minutes) || 0));
      if (!data.name) {
        new Notice("Enter a language name first.");
        this.fields.name.focus();
        return;
      }
      if (!data.current_level) data.current_level = "A1";
      try {
        await this.onSave(data);
        this.close();
      } catch (error) {
        console.error("LIFORA language save failed", error);
        new Notice(`Could not save language: ${error.message || error}`);
      }
    });
    this.fields.name.focus();
  }

  onClose() {
    this.contentEl.empty();
  }
}

class LanguageTopicModal extends Modal {
  constructor(app, defaults, currentLevel, onSave) {
    super(app);
    this.defaults = defaults || {};
    this.currentLevel = currentLevel || "A1";
    this.onSave = onSave;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-course-modal");
    contentEl.createEl("h2", { text: this.defaults.id ? "Edit Learning Item" : "Add Learning Item" });
    contentEl.createEl("p", {
      text: "Add any topic, exercise, lesson, or skill you want to work on. Nothing is pre-filled or mandatory.",
      cls: "tg-course-modal-description"
    });
    const form = contentEl.createEl("form", { cls: "tg-course-form" });

    const titleWrap = form.createDiv({ cls: "tg-course-field" });
    titleWrap.createEl("label", { text: "Topic / activity" });
    const title = titleWrap.createEl("input", { type: "text", placeholder: "e.g. Past tense, ordering food, listening practice" });
    title.value = this.defaults.title || "";

    const skillWrap = form.createDiv({ cls: "tg-course-field" });
    skillWrap.createEl("label", { text: "Learning skill" });
    const skill = skillWrap.createEl("select");
    for (const option of LANGUAGE_SKILLS) {
      const item = skill.createEl("option", { value: option.value, text: option.label });
      if ((this.defaults.skill || "general") === option.value) item.selected = true;
    }

    const levelWrap = form.createDiv({ cls: "tg-course-field" });
    levelWrap.createEl("label", { text: "CEFR level" });
    const level = levelWrap.createEl("select");
    for (const option of LANGUAGE_LEVELS) {
      const item = level.createEl("option", { value: option.value, text: option.label });
      if ((this.defaults.level || this.currentLevel) === option.value) item.selected = true;
    }

    const descWrap = form.createDiv({ cls: "tg-course-field" });
    descWrap.createEl("label", { text: "Notes / description (optional)" });
    const description = descWrap.createEl("textarea", { attr: { rows: "3" } });
    description.value = this.defaults.description || "";

    const actions = form.createDiv({ cls: "tg-course-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel", type: "button", cls: "tg-course-btn tg-course-btn-muted" });
    cancel.addEventListener("click", () => this.close());
    actions.createEl("button", { text: this.defaults.id ? "Save Changes" : "Add to My Learning", type: "submit", cls: "tg-course-btn tg-course-btn-primary" });

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const data = {
        id: this.defaults.id || `language-topic-${Date.now()}`,
        title: safeName(title.value),
        skill: skill.value,
        level: level.value,
        description: description.value.trim(),
        completed: Boolean(this.defaults.completed),
        created: this.defaults.created || localISODate(),
        completed_at: this.defaults.completed_at || ""
      };
      if (!data.title) {
        new Notice("Enter a topic or activity name.");
        title.focus();
        return;
      }
      await this.onSave(data);
      this.close();
    });
    title.focus();
  }

  onClose() {
    this.contentEl.empty();
  }
}

class LanguageWordModal extends Modal {
  constructor(app, defaults, onSave) {
    super(app);
    this.defaults = defaults || {};
    this.onSave = onSave;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-course-modal");
    contentEl.createEl("h2", { text: this.defaults.id ? "Edit Vocabulary" : "Add Vocabulary" });
    const form = contentEl.createEl("form", { cls: "tg-course-form" });

    const addInput = (label, key, placeholder) => {
      const wrap = form.createDiv({ cls: "tg-course-field" });
      wrap.createEl("label", { text: label });
      const input = wrap.createEl("input", { type: "text", placeholder });
      input.value = this.defaults[key] || "";
      return input;
    };
    const term = addInput("Word / phrase", "term", "Enter a word or useful phrase");
    const meaning = addInput("Meaning / translation", "meaning", "Meaning in your language");
    const example = addInput("Example sentence (optional)", "example", "Use it in a sentence");

    const statusWrap = form.createDiv({ cls: "tg-course-field" });
    statusWrap.createEl("label", { text: "Learning status" });
    const status = statusWrap.createEl("select");
    [
      ["new", "New"],
      ["learning", "Learning"],
      ["mastered", "Mastered"]
    ].forEach(([value, label]) => {
      const option = status.createEl("option", { value, text: label });
      if ((this.defaults.status || "new") === value) option.selected = true;
    });

    const actions = form.createDiv({ cls: "tg-course-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel", type: "button", cls: "tg-course-btn tg-course-btn-muted" });
    cancel.addEventListener("click", () => this.close());
    actions.createEl("button", { text: this.defaults.id ? "Save Word" : "Add Word", type: "submit", cls: "tg-course-btn tg-course-btn-primary" });
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const data = {
        id: this.defaults.id || `language-word-${Date.now()}`,
        term: term.value.trim(),
        meaning: meaning.value.trim(),
        example: example.value.trim(),
        status: status.value,
        created: this.defaults.created || localISODate(),
        last_reviewed: this.defaults.last_reviewed || ""
      };
      if (!data.term || !data.meaning) {
        new Notice("Enter the word and its meaning.");
        return;
      }
      await this.onSave(data);
      this.close();
    });
    term.focus();
  }

  onClose() {
    this.contentEl.empty();
  }
}

class LanguageSessionModal extends Modal {
  constructor(app, defaults, onSave) {
    super(app);
    this.defaults = defaults || {};
    this.onSave = onSave;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-course-modal");
    contentEl.createEl("h2", { text: "Log a Study Session" });
    contentEl.createEl("p", { text: "Record what you practiced and how long you spent. This is optional — study without pressure.", cls: "tg-course-modal-description" });
    const form = contentEl.createEl("form", { cls: "tg-course-form" });

    const activityWrap = form.createDiv({ cls: "tg-course-field" });
    activityWrap.createEl("label", { text: "Activity" });
    const activity = activityWrap.createEl("select");
    for (const item of LANGUAGE_ACTIVITIES) {
      activity.createEl("option", { value: item.value, text: item.label });
    }

    const minutesWrap = form.createDiv({ cls: "tg-course-field" });
    minutesWrap.createEl("label", { text: "Minutes studied" });
    const minutes = minutesWrap.createEl("input", { type: "number", attr: { min: "1", max: "1440" } });
    minutes.value = String(this.defaults.minutes || 20);

    const dateWrap = form.createDiv({ cls: "tg-course-field" });
    dateWrap.createEl("label", { text: "Study date" });
    const date = dateWrap.createEl("input", { type: "date" });
    date.value = this.defaults.date || localISODate();

    const notesWrap = form.createDiv({ cls: "tg-course-field" });
    notesWrap.createEl("label", { text: "What did you practice? (optional)" });
    const notes = notesWrap.createEl("textarea", { attr: { rows: "3" } });
    notes.value = this.defaults.notes || "";

    const actions = form.createDiv({ cls: "tg-course-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel", type: "button", cls: "tg-course-btn tg-course-btn-muted" });
    cancel.addEventListener("click", () => this.close());
    actions.createEl("button", { text: "Save Session", type: "submit", cls: "tg-course-btn tg-course-btn-primary" });
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const data = {
        id: `language-session-${Date.now()}`,
        activity: activity.value,
        minutes: Math.max(1, Math.min(1440, Math.floor(Number(minutes.value) || 0))),
        date: date.value || localISODate(),
        notes: notes.value.trim()
      };
      if (!minutes.value || Number(minutes.value) < 1) {
        new Notice("Enter a valid number of study minutes.");
        return;
      }
      await this.onSave(data);
      this.close();
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}






// Dedicated action menu: unlike a nested toolbar popover, this remains visible on
// Android and desktops even when the CodeMirror host clips overflow.
class TimeGardenDrawingActionsModal extends Modal {
  constructor(app, plugin, view) {
    super(app);
    this.plugin = plugin;
    this.view = view;
  }
  onOpen() {
    const root = this.contentEl;
    root.empty();
    root.addClass("tg-lifora-drawing-action-modal");
    this.modalEl?.addClass?.("tg-lifora-drawing-action-dialog");
    root.createDiv({ cls: "tg-courses-eyebrow", text: "LIFORA / WRITING STUDIO" });
    root.createEl("h2", { text: "Drawing tools" });
    root.createEl("p", { cls: "tg-lifora-drawing-intro", text: "Sketch, annotate, or embed a drawing in this note." });
    const grid = root.createDiv({ cls: "tg-lifora-drawing-action-grid" });
    const section = text => grid.createDiv({ cls: "tg-lifora-drawing-menu-section", text });
    const item = (icon, title, subtitle, callback) => {
      const btn = grid.createEl("button", { cls: "tg-lifora-drawing-action", attr: { type: "button" } });
      setIcon(btn.createSpan({ cls: "tg-lifora-drawing-action-icon" }), icon);
      const words = btn.createSpan({ cls: "tg-lifora-drawing-action-text" });
      words.createEl("strong", { text: title });
      words.createSpan({ text: subtitle });
      setIcon(btn.createSpan({ cls: "tg-lifora-drawing-action-chevron" }), "chevron-right");
      btn.addEventListener("click", () => {
        this.close();
        try { Promise.resolve(callback()).catch(error => {
          console.error("LIFORA drawing action failed", error);
          new Notice("Drawing action failed. Your note was not changed.");
        }); }
        catch (error) {
          console.error("LIFORA drawing action failed", error);
          new Notice("Could not open the drawing tool.");
        }
      });
    };
    section("DRAW INSIDE THIS NOTE");
    item("pencil", "Pen & freehand", "Sketch with a mouse or stylus", () => this.plugin.openLiforaInlineSketch(this.view, "pen"));
    item("highlighter", "Highlighter", "Add translucent highlights", () => this.plugin.openLiforaInlineSketch(this.view, "highlighter"));
    item("shapes", "Shapes & arrows", "Draw shapes, lines, and arrows", () => this.plugin.openLiforaInlineSketch(this.view, "rectangle"));
    item("type", "Text & labels", "Place labels on the sketch", () => this.plugin.openLiforaInlineSketch(this.view, "text"));
    section("FULL EXCALIDRAW EDITOR");
    item("pencil-ruler", "Draw & Embed", "Create and embed an Excalidraw file", () => this.plugin.createAndEmbedLiforaExcalidraw(this.view));
    item("workflow", "Flowcharts & mind maps", "Build diagrams in Excalidraw", () => this.plugin.createAndEmbedLiforaExcalidraw(this.view));
    item("images", "Insert existing drawing", "Open a saved Excalidraw drawing", () => this.plugin.insertExistingLiforaExcalidraw(this.view?.editor, this.view));
    item("file-image", "Insert drawing as IMAGE", "Insert an exported SVG image", () => this.plugin.insertExistingLiforaExcalidraw(this.view?.editor, this.view, true));
    const nativeCommands = this.plugin.getLiforaExcalidrawCommands();
    if (this.plugin.getLiforaExcalidrawPlugin() && nativeCommands.length) {
      const advancedToggle = root.createEl("button", { cls: "tg-lifora-advanced-toggle", attr: { type: "button", "aria-expanded": "false" } });
      setIcon(advancedToggle.createSpan(), "settings-2");
      advancedToggle.createSpan({ text: "Show advanced Excalidraw commands" });
      const search = root.createEl("input", { cls:"tg-lifora-native-command-search", attr:{type:"search",placeholder:"Search Excalidraw tools", "aria-label":"Search Excalidraw plugin commands"} });
      const entries = root.createDiv({ cls:"tg-lifora-native-command-list" });
      search.hidden = true;
      entries.hidden = true;
      advancedToggle.addEventListener("click", () => {
        const expanded = advancedToggle.getAttribute("aria-expanded") === "true";
        advancedToggle.setAttribute("aria-expanded", String(!expanded));
        advancedToggle.querySelector("span:last-child").setText(expanded ? "Show advanced Excalidraw commands" : "Hide advanced Excalidraw commands");
        search.hidden = expanded;
        entries.hidden = expanded;
        if (!expanded) search.focus();
      });
      const redraw = () => {
        entries.empty();
        const query = search.value.trim().toLowerCase();
        for (const command of nativeCommands.filter(c => !query || (c.name || c.id).toLowerCase().includes(query))) {
          const button = entries.createEl("button", { cls:"tg-lifora-plugin-command", attr:{type:"button"} });
          setIcon(button.createSpan({ cls:"tg-lifora-plugin-command-icon" }), command.icon || "play");
          button.createSpan({ text: command.name || command.id });
          button.addEventListener("click", () => {
            this.close();
            try {
              const ok = this.app.commands?.executeCommandById?.(command.id);
              if (ok === false) new Notice("Command is not available in the current note.");
            } catch (error) { console.error("Excalidraw command error", error); new Notice("Could not run Excalidraw command."); }
          });
        }
      };
      search.addEventListener("input", redraw);
      redraw();
    }
    if (!this.plugin.getLiforaExcalidrawPlugin()) root.createDiv({
      cls: "tg-lifora-drawing-info",
      text: "Draw in Note works without extra plugins. Draw & Embed and Insert Existing require the Excalidraw Community Plugin."
    });
  }
  onClose() { this.contentEl.empty(); }
}

// LIFORA-native inline sketch, saved as ordinary SVG vault file then embedded
// into the Markdown note. Independent of Excalidraw, works with mouse and touch.
class TimeGardenInlineSketch {
  constructor(app, plugin, view, file, initialTool = "pen") {
    this.app = app;
    this.plugin = plugin;
    this.view = view;
    this.file = file;
    this.tool = initialTool;
    this.color = "#d3ad59";
    this.weight = 3;
    this.text = "";
    this.objects = [];
    this.redoStack = [];
    this.undoStack = [];
    this.draft = null;
    this.pointer = null;
    this.busy = false;
    this.width = 960;
    this.height = 420;
  }

  build() {
    const panel = document.createElement("section");
    panel.className = "tg-lifora-inline-sketch";
    panel.dataset.notePath = this.file.path;
    panel.setAttribute("aria-label", "Draw inside this note");
    this.el = panel;
    const title = panel.createDiv({ cls: "tg-lifora-inline-sketch-header" });
    const heading = title.createDiv({ cls: "tg-lifora-inline-sketch-heading" });
    setIcon(heading.createSpan(), "paintbrush");
    heading.createEl("strong", { text: "Draw in Note" });
    heading.createSpan({ text: "Save as SVG embedded in this note" });
    const close = title.createEl("button", { cls: "tg-lifora-sketch-close", attr: { type: "button", title: "Close without saving", "aria-label": "Close without saving" } });
    setIcon(close, "x");
    close.addEventListener("click", () => this.requestClose());
    const bar = panel.createDiv({ cls: "tg-lifora-sketch-tools", attr: { role: "toolbar", "aria-label": "Sketch tools" } });
    const addTool = (name, icon, text) => {
      const button = bar.createEl("button", { cls: "tg-lifora-sketch-tool", attr: { type: "button", title: text, "aria-label": text } });
      setIcon(button, icon);
      button.dataset.tool = name;
      button.addEventListener("click", () => {
        this.tool = name;
        for (const sibling of bar.querySelectorAll("[data-tool]")) {
          sibling.classList.toggle("is-active", sibling.dataset.tool === name);
          sibling.setAttribute("aria-pressed", sibling.dataset.tool === name ? "true" : "false");
        }
        this.textInput.style.display = name === "text" ? "" : "none";
        this.svg.style.cursor = name === "text" ? "text" : name === "eraser" ? "crosshair" : "crosshair";
      });
      return button;
    };
    addTool("pen", "pencil", "Pen");
    addTool("highlighter", "highlighter", "Highlighter");
    addTool("eraser", "eraser", "Erase a shape or stroke");
    addTool("line", "minus", "Line");
    addTool("arrow", "arrow-up-right", "Arrow");
    addTool("rectangle", "square", "Rectangle");
    addTool("ellipse", "circle", "Ellipse");
    addTool("text", "type", "Text");
    this.textInput = null;
    const selectedButton = bar.querySelector(`[data-tool="${this.tool}"]`) || bar.querySelector('[data-tool="pen"]');
    selectedButton?.classList.add("is-active");
    selectedButton?.setAttribute("aria-pressed", "true");
    const colorInput = bar.createEl("input", { cls: "tg-lifora-sketch-color", attr: { type: "color", title: "Ink color", "aria-label": "Ink color" } });
    colorInput.value = this.color;
    colorInput.addEventListener("change", () => { this.color = colorInput.value; });
    const thickness = bar.createEl("select", { cls: "tg-lifora-sketch-weight", attr: { title: "Stroke thickness", "aria-label": "Stroke thickness" } });
    for (const [val, label] of [["2", "Fine"], ["3", "Normal"], ["6", "Bold"], ["10", "Thick"]]) {
      thickness.createEl("option", { value: val, text: label });
    }
    thickness.value = "3";
    thickness.addEventListener("change", () => { this.weight = Number(thickness.value) || 3; });
    this.textInput = bar.createEl("input", { cls: "tg-lifora-sketch-text", attr: { type: "text", maxlength: "150", placeholder: "Write text, then tap canvas", "aria-label": "Drawing text" } });
    this.textInput.style.display = this.tool === "text" ? "" : "none";
    const undo = bar.createEl("button", { cls: "tg-lifora-sketch-tool", attr: { type: "button", title: "Undo", "aria-label": "Undo" } });
    setIcon(undo, "undo-2");
    undo.addEventListener("click", () => { if (this.undoStack.length) { this.redoStack.push(this.objects.slice()); this.objects = this.undoStack.pop(); this.draw(); } });
    const redo = bar.createEl("button", { cls: "tg-lifora-sketch-tool", attr: { type: "button", title: "Redo", "aria-label": "Redo" } });
    setIcon(redo, "redo-2");
    redo.addEventListener("click", () => { if (this.redoStack.length) { this.undoStack.push(this.objects.slice()); this.objects = this.redoStack.pop(); this.draw(); } });
    const canvas = panel.createDiv({ cls: "tg-lifora-sketch-canvas" });
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.setAttribute("viewBox", `0 0 ${this.width} ${this.height}`);
    this.svg.setAttribute("aria-label", "Drawing canvas, use mouse or touch to draw");
    this.svg.setAttribute("role", "img");
    canvas.appendChild(this.svg);
    this.svg.addEventListener("pointerdown", event => this.onDown(event));
    this.svg.addEventListener("pointermove", event => this.onMove(event));
    this.svg.addEventListener("pointerup", event => this.onUp(event));
    this.svg.addEventListener("pointercancel", event => this.onUp(event));
    const bottom = panel.createDiv({ cls: "tg-lifora-sketch-footer" });
    bottom.createSpan({ cls: "tg-lifora-sketch-footnote", text: "Mouse, stylus or touch · SVG file syncs with your Vault" });
    const clear = bottom.createEl("button", { cls: "tg-lifora-sketch-secondary", attr: { type: "button" }, text: "Clear" });
    clear.addEventListener("click", () => {
      if (!this.objects.length) return;
      if (window.confirm("Clear this drawing? Unsaved strokes will be lost.")) {
        this.remember(); this.objects = []; this.draw();
      }
    });
    const save = bottom.createEl("button", { cls: "tg-lifora-sketch-save", attr: { type: "button" }, text: "Save & Insert into Note" });
    save.addEventListener("click", () => this.save());
    this.draw();
    return panel;
  }

  getPoint(event) {
    const rect = this.svg.getBoundingClientRect();
    const x = (event.clientX - rect.left) * this.width / Math.max(1, rect.width);
    const y = (event.clientY - rect.top) * this.height / Math.max(1, rect.height);
    return [Math.max(0, Math.min(this.width, Math.round(x * 10) / 10)), Math.max(0, Math.min(this.height, Math.round(y * 10) / 10))];
  }
  onDown(event) {
    if (event.button !== undefined && event.button !== 0 && event.pointerType === "mouse") return;
    event.preventDefault();
    const p = this.getPoint(event);
    if (this.tool === "eraser") {
      for (let i = this.objects.length - 1; i >= 0; i--) {
        if (this.hit(this.objects[i], p)) {
          this.remember();
          this.objects.splice(i, 1);
          this.draw();
          break;
        }
      }
      return;
    }
    if (this.tool === "text") {
      const value = this.textInput.value.trim();
      if (!value) { new Notice("Enter text in the text field before placing it."); return; }
      this.remember();
      this.objects.push({ kind: "text", at: p, value, color: this.color, width: this.weight });
      this.draw();
      return;
    }
    this.pointer = event.pointerId;
    this.draft = { kind: this.tool, points: [p], color: this.color, width: this.weight };
    try { this.svg.setPointerCapture?.(event.pointerId); } catch (_) {}
    this.draw();
  }
  onMove(event) {
    if (this.pointer !== event.pointerId || !this.draft) return;
    event.preventDefault();
    const p = this.getPoint(event);
    if (this.draft.kind === "pen" || this.draft.kind === "highlighter") {
      const prev = this.draft.points[this.draft.points.length-1];
      if (Math.abs(p[0] - prev[0]) + Math.abs(p[1] - prev[1]) > 1) this.draft.points.push(p);
    } else this.draft.points[1] = p;
    this.draw();
  }
  onUp(event) {
    if (this.pointer !== event.pointerId || !this.draft) return;
    event.preventDefault();
    const p = this.getPoint(event);
    if (["pen", "highlighter"].includes(this.draft.kind)) this.draft.points.push(p);
    else this.draft.points[1] = p;
    this.remember();
    this.objects.push(this.draft);
    this.draft = null;
    this.pointer = null;
    this.draw();
  }
  remember() {
    this.undoStack.push(this.objects.slice());
    if (this.undoStack.length > 100) this.undoStack.shift();
    this.redoStack = [];
  }
  hit(item, p) {
    const pts = item.kind === "text" ? [item.at] : (item.points || []);
    return pts.some(pt => Math.hypot(pt[0] - p[0], pt[1] - p[1]) < 22) ||
      (pts.length > 1 && p[0] >= Math.min(...pts.map(v=>v[0]))-12 && p[0] <= Math.max(...pts.map(v=>v[0]))+12 &&
       p[1] >= Math.min(...pts.map(v=>v[1]))-12 && p[1] <= Math.max(...pts.map(v=>v[1]))+12);
  }
  createMarkup(objects = this.objects) {
    const escape = value => String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
    const n = v => Math.round(Number(v) * 10) / 10;
    const body = objects.map(obj => {
      const pts = obj.points || [];
      const a = pts[0] || [0,0], b = pts[pts.length-1] || a;
      const stroke = escape(obj.color || "#000000");
      const weight = n(obj.width || 3);
      const common = `stroke="${stroke}" stroke-width="${weight}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
      if (obj.kind === "text") {
        return `<text x="${n(obj.at[0])}" y="${n(obj.at[1])}" font-family="Arial,sans-serif" font-size="${Math.max(20,weight*6)}" fill="${stroke}">${escape(obj.value)}</text>`;
      }
      if (obj.kind === "pen" || obj.kind === "highlighter") {
        const opacity = obj.kind === "highlighter" ? " opacity=\"0.36\"" : "";
        const w = obj.kind === "highlighter" ? weight * 5 : weight;
        const d = pts.map((p,i)=>`${i ? "L" : "M"}${n(p[0])} ${n(p[1])}`).join(" ");
        return `<path d="${d}" ${common.replace(`stroke-width="${weight}"`, `stroke-width="${w}"`)}${opacity}/>`;
      }
      if (obj.kind === "line" || obj.kind === "arrow") {
        const line = `<line x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(b[0])}" y2="${n(b[1])}" ${common}/>`;
        if (obj.kind === "line") return line;
        const angle=Math.atan2(b[1]-a[1],b[0]-a[0]), size=Math.max(12,weight*4);
        const p1=[b[0]-size*Math.cos(angle-.55),b[1]-size*Math.sin(angle-.55)];
        const p2=[b[0]-size*Math.cos(angle+.55),b[1]-size*Math.sin(angle+.55)];
        return line+`<polyline points="${n(p1[0])},${n(p1[1])} ${n(b[0])},${n(b[1])} ${n(p2[0])},${n(p2[1])}" ${common}/>`;
      }
      if (obj.kind === "rectangle") return `<rect x="${n(Math.min(a[0],b[0]))}" y="${n(Math.min(a[1],b[1]))}" width="${n(Math.abs(b[0]-a[0]))}" height="${n(Math.abs(b[1]-a[1]))}" ${common}/>`;
      if (obj.kind === "ellipse") return `<ellipse cx="${n((a[0]+b[0])/2)}" cy="${n((a[1]+b[1])/2)}" rx="${n(Math.abs(b[0]-a[0])/2)}" ry="${n(Math.abs(b[1]-a[1])/2)}" ${common}/>`;
      return "";
    }).join("\n");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}">\n${body}\n</svg>`;
  }
  draw() {
    if (!this.svg) return;
    // Only markup generated from numeric geometry and escaped user text.
    this.svg.innerHTML = this.createMarkup([...this.objects, ...(this.draft ? [this.draft] : [])]).replace(/^<svg[^>]*>\n?/,"").replace(/\n?<\/svg>$/, "");
  }
  requestClose() {
    if (this.objects.length && !window.confirm("Discard this unsaved drawing?")) return;
    this.el.remove();
  }
  async save() {
    if (this.busy) return;
    if (!this.objects.length) { new Notice("Draw something before saving."); return; }
    if (this.view.file?.path !== this.file.path || !(this.app.vault.getAbstractFileByPath(this.file.path) instanceof TFile)) {
      new Notice("The original note changed. Reopen it before saving this sketch.");
      return;
    }
    this.busy = true;
    try {
      const saved = await this.plugin.saveLiforaInlineSvg(this.file, this.createMarkup());
      if (this.view.file?.path !== this.file.path) {
        new Notice("Sketch saved in Attachments, but the note changed before embedding. Insert it manually.");
        return;
      }
      const link = this.app.metadataCache.fileToLinktext(saved, this.file.path, true);
      this.view.editor.replaceSelection(`\n![[${link}|560]]\n`);
      this.view.editor.focus();
      this.el.remove();
      new Notice("Image inserted. Drag the corner in the size dialog to adjust it.");
      new TimeGardenImageResizeModal(this.app, this.view.editor, this.file, saved).open();
    } catch (error) {
      console.error("LIFORA could not save inline sketch", error);
      new Notice("Could not save the sketch. The drawing editor is still open.");
    } finally { this.busy = false; }
  }
}

// LIFORA Writing Studio: find and embed existing Excalidraw drawings.
class TimeGardenExcalidrawPickerModal extends Modal {
  constructor(app, plugin, editor, sourceFile, preferImage = false) {
    super(app);
    this.plugin = plugin;
    this.editor = editor;
    this.sourceFile = sourceFile;
    this.preferImage = preferImage;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-lifora-excalidraw-picker");
    contentEl.createDiv({ cls: "tg-courses-eyebrow", text: "WRITING STUDIO / EXCALIDRAW" });
    contentEl.createEl("h2", { text: "Insert existing drawing" });
    contentEl.createEl("p", {
      cls: "tg-excalidraw-picker-description",
      text: this.preferImage
        ? "Choose a drawing and click As image. Its editable original remains untouched."
        : "Embed an editable drawing, export it as a resizable SVG image, or open its full editor."
    });
    const query = contentEl.createEl("input", {
      cls: "tg-excalidraw-picker-search",
      attr: { type: "search", placeholder: "Search drawings by name or folder", "aria-label": "Search Excalidraw drawings" }
    });
    const listing = contentEl.createDiv({ cls: "tg-excalidraw-picker-results" });
    const drawings = this.plugin.findLiforaExcalidrawDrawings();
    const render = () => {
      listing.empty();
      const term = query.value.trim().toLowerCase();
      const filtered = drawings.filter(file => file.path.toLowerCase().includes(term));
      if (!filtered.length) {
        listing.createEl("p", {
          cls: "tg-excalidraw-picker-empty",
          text: "No drawings found. Create a drawing first from the Excalidraw toolbar."
        });
        return;
      }
      for (const file of filtered.slice(0, 60)) {
        const row = listing.createDiv({ cls: "tg-excalidraw-picker-item" });
        const info = row.createDiv({ cls: "tg-excalidraw-picker-item-info" });
        info.createEl("strong", { text: file.basename.replace(/\.excalidraw$/i, "") });
        info.createEl("span", { text: file.path });
        const insert = row.createEl("button", {
          cls: "tg-excalidraw-picker-insert",
          attr: { type: "button", title: "Embed this drawing in the note" },
          text: "Insert"
        });
        insert.addEventListener("click", () => {
          try {
            if (!this.editor || !this.sourceFile ||
                !(this.app.vault.getAbstractFileByPath(this.sourceFile.path) instanceof TFile)) {
              new Notice("The original note is no longer available. Open the note and try again.");
              return;
            }
            // Obsidian's embedded wikilink keeps the drawing as a normal vault file,
            // making it portable and compatible with folder syncing.
            const path = this.app.metadataCache.fileToLinktext(file, this.sourceFile.path, true);
            this.editor.replaceSelection(`\n![[${path}]]\n`);
            this.editor.focus();
            this.close();
            new Notice("Excalidraw drawing embedded in this note.");
          } catch (error) {
            console.error("LIFORA could not embed Excalidraw drawing", error);
            new Notice("Could not insert this drawing. The source file was not changed.");
          }
        });
        const asImage = row.createEl("button", {
          cls: "tg-excalidraw-picker-open",
          attr: { type: "button", title: "Export an SVG image and insert it into this note" },
          text: "As image"
        });
        if (this.preferImage) asImage.classList.add("tg-excalidraw-picker-insert");
        asImage.addEventListener("click", async () => {
          asImage.disabled = true;
          try {
            const target = this.sourceFile;
            if (!(this.app.vault.getAbstractFileByPath(target?.path) instanceof TFile)) throw new Error("Source note no longer exists");
            const image = await this.plugin.exportExcalidrawAsImage(file, target);
            if (!(this.app.vault.getAbstractFileByPath(target.path) instanceof TFile)) {
              new Notice("Image exported, but note changed; image remains in Attachments.");
              return;
            }
            const link = this.app.metadataCache.fileToLinktext(image, target.path, true);
            this.editor.replaceSelection(`\n![[${link}|560]]\n`);
            this.close();
            new TimeGardenImageResizeModal(this.app, this.editor, target, image).open();
          } catch (error) {
            console.error("LIFORA Excalidraw SVG export failed", error);
            new Notice(`Could not export this drawing as an image: ${error?.message || "unknown error"}`);
            asImage.disabled = false;
          }
        });
        const open = row.createEl("button", {
          cls: "tg-excalidraw-picker-open",
          attr: { type: "button", title: "Open in Excalidraw editor" },
          text: "Open"
        });
        open.addEventListener("click", async () => {
          this.close();
          await this.plugin.openLiforaExcalidrawFile(file);
        });
      }
      if (filtered.length > 60) {
        listing.createEl("p", { cls: "tg-excalidraw-picker-empty", text: "Showing the first 60 drawings. Refine your search to see more." });
      }
    };
    query.addEventListener("input", render);
    render();
    query.focus();
  }

  onClose() { this.contentEl.empty(); }
}

// Reliable details entry from Books Library on desktop and mobile.
// This modal renders the actual book metadata even if Obsidian is in source mode.
class TimeGardenBookDetailsModal extends Modal {
  constructor(app, plugin, bookPath) {
    super(app);
    this.plugin = plugin;
    this.bookPath = bookPath;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-lifora-book-details-modal");
    const file = this.app.vault.getAbstractFileByPath(this.bookPath);
    if (!(file instanceof TFile)) {
      contentEl.createEl("h2", { text: "Book unavailable" });
      contentEl.createEl("p", { text: "The original book dashboard could not be found. No book data was modified." });
      return;
    }
    const book = this.plugin.getBookData(file);
    const assets = this.plugin.getBookAssets(book);
    const top = contentEl.createDiv({ cls: "tg-book-details-top" });
    const cover = top.createDiv({ cls: "tg-book-details-cover" });
    try { this.plugin.renderBookCover(cover, book, assets, "hero"); }
    catch (error) {
      console.warn("LIFORA book cover unavailable in details.", error);
      this.plugin.setButtonIcon(cover, "book-open");
    }
    const heading = top.createDiv({ cls: "tg-book-details-heading" });
    heading.createEl("div", { text: "LIFORA / BOOK DETAILS", cls: "tg-courses-eyebrow" });
    heading.createEl("h2", { text: book.title });
    heading.createEl("p", { text: book.author || "Author not added" });
    heading.createSpan({
      cls: `tg-book-status tg-book-status-${book.status}`,
      text: BOOK_STATUS_LABELS[book.status] || book.status
    });

    const percent = Math.max(0, Math.min(100,
      Math.round((book.status === "read" ? book.total_pages : book.current_page) / book.total_pages * 100)));
    const progress = contentEl.createDiv({ cls: "tg-book-details-progress" });
    const line = progress.createDiv({ cls: "tg-book-details-progress-line" });
    line.createEl("strong", { text: "Reading progress" });
    line.createSpan({ text: `${percent}%` });
    const track = progress.createDiv({ cls: "tg-book-progress-track" });
    track.createDiv({ cls: "tg-book-progress-fill" }).style.width = `${percent}%`;

    const info = contentEl.createDiv({ cls: "tg-book-details-info" });
    for (const [label, value] of [
      ["Pages", book.total_pages],
      ["Current page", book.current_page],
      ["Category", book.genre ? book.genre.replace(/^09 Books\//, "") : "Uncategorized"],
      ["Added", book.created || "—"],
      ["Last read", book.last_read || "—"],
      ["Book file", assets.bookFile?.name || "Not uploaded"]
    ]) {
      const item = info.createDiv({ cls: "tg-book-details-info-item" });
      item.createSpan({ text: label });
      item.createEl("strong", { text: String(value) });
    }

    const actions = contentEl.createDiv({ cls: "tg-book-details-modal-actions" });
    this.plugin.iconButton(actions, "Open Book Page", "book-open", "tg-course-btn tg-course-btn-primary", async () => {
      this.close();
      try { await this.plugin.openDashboardNote(file.path); }
      catch (error) { console.error(error); new Notice("Could not open the book page."); }
    });
    this.plugin.iconButton(actions, "Edit Book", "pencil", "tg-course-btn tg-course-btn-muted", () => {
      this.close();
      this.plugin.editBook(file);
    });
    this.plugin.iconButton(actions, "Plan Reading", "calendar-plus", "tg-course-btn tg-course-btn-muted", () => {
      this.close();
      this.plugin.openPlannerScheduleBook(file);
    });
    if (assets.bookFile) {
      this.plugin.iconButton(actions, "Read Book", "play", "tg-course-btn tg-course-btn-muted", async () => {
        this.close();
        try { await this.plugin.openBookAtLastPage(book); }
        catch (error) { console.error(error); new Notice("Could not open the uploaded book."); }
      });
    }
    this.plugin.iconButton(actions, "Close", "x", "tg-course-btn tg-course-btn-muted", () => this.close());
  }

  onClose() { this.contentEl.empty(); }
}

// Live-preview palette. Nothing is saved until Apply is pressed.
class TimeGardenThemeGalleryModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.originalThemeId = "system";
    this.previewThemeId = "system";
    this.filter = "all";
    this.committed = false;
  }

  async onOpen() {
    this.originalThemeId = await this.plugin.getUiThemePreference();
    this.previewThemeId = this.originalThemeId;
    this.render();
  }

  render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-theme-gallery-modal");
    const header = contentEl.createDiv({ cls: "tg-theme-gallery-header" });
    const brand = header.createDiv();
    brand.createDiv({ text: "LIFORA  /  STUDIO", cls: "tg-theme-eyebrow" });
    brand.createEl("h2", { text: "Appearance Studio" });
    const themeCount = LIFORA_THEME_PRESETS.filter(t => t.mode !== "native").length;
    const newDarkCount = LIFORA_THEME_PRESETS.filter(t => t.mode === "dark" && t.new).length;
    brand.createEl("p", {
      text: `${themeCount} premium looks, including ${newDarkCount} new dark themes. Your weekday covers remain unchanged as you switch palettes.`,
      cls: "tg-theme-lead"
    });
    const emblem = header.createDiv({ cls: "tg-theme-emblem" });
    this.plugin.setButtonIcon(emblem, "palette");

    const filters = contentEl.createDiv({ cls: "tg-theme-filters" });
    [["all", "All themes"], ["light", "Light"], ["dark", "Dark"]].forEach(([id, label]) => {
      const button = filters.createEl("button", { text: label, cls: `tg-theme-filter${this.filter === id ? " is-active" : ""}` });
      button.type = "button";
      button.setAttribute("aria-pressed", String(this.filter === id));
      button.addEventListener("click", () => { this.filter = id; this.render(); });
    });

    const gallery = contentEl.createDiv({ cls: "tg-theme-gallery-grid" });
    for (const theme of LIFORA_THEME_PRESETS.filter(t => this.filter === "all" || t.mode === this.filter || t.mode === "native")) {
      const selected = theme.id === this.previewThemeId;
      const card = gallery.createDiv({ cls: `tg-theme-choice${selected ? " is-selected" : ""}` });
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `Preview ${theme.name} theme`);
      card.setAttribute("aria-pressed", String(selected));
      const tile = card.createDiv({ cls: "tg-theme-swatch" });
      const colors = theme.mode === "native"
        ? { bg: "#242936", surface: "#343D4C", card: "#EDECE8", accent: "#C3A35B", text: "#F6F6F6" }
        : theme;
      tile.style.setProperty("--theme-bg", colors.bg);
      tile.style.setProperty("--theme-surface", colors.surface);
      tile.style.setProperty("--theme-card", colors.card);
      tile.style.setProperty("--theme-accent", colors.accent);
      tile.style.setProperty("--theme-text", colors.text);
      const rail = tile.createDiv({ cls: "tg-theme-swatch-rail" });
      for (let i = 0; i < 3; i++) rail.createDiv({ cls: "tg-theme-swatch-rail-dot" });
      const mock = tile.createDiv({ cls: "tg-theme-swatch-main" });
      mock.createDiv({ cls: "tg-theme-swatch-title" });
      mock.createDiv({ cls: "tg-theme-swatch-subtitle" });
      const panels = mock.createDiv({ cls: "tg-theme-swatch-panels" });
      panels.createDiv({ cls: "tg-theme-swatch-panel" });
      panels.createDiv({ cls: "tg-theme-swatch-panel" });
      const bar = mock.createDiv({ cls: "tg-theme-swatch-progress" });
      bar.createDiv();
      const labelRow = card.createDiv({ cls: "tg-theme-choice-info" });
      const nameGroup = labelRow.createDiv();
      const themeName = nameGroup.createDiv({ cls: "tg-theme-name-row" });
      themeName.createEl("strong", { text: theme.name });
      if (theme.new) themeName.createSpan({ cls: "tg-theme-new-label", text: "NEW" });
      nameGroup.createEl("small", { text: theme.description });
      const status = labelRow.createDiv({ cls: `tg-theme-choice-state${selected ? " is-selected" : ""}` });
      this.plugin.setButtonIcon(status, selected ? "check-circle-2" : "circle");
      const selectTheme = () => {
        this.previewThemeId = theme.id;
        this.plugin.applyUiTheme(theme.id);
        this.render();
      };
      card.addEventListener("click", selectTheme);
      card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectTheme();
        }
      });
    }

    const footer = contentEl.createDiv({ cls: "tg-theme-gallery-footer" });
    footer.createDiv({ text: "Live preview only — changes are saved to Portable DATA when applied.", cls: "tg-theme-gallery-hint" });
    const actions = footer.createDiv({ cls: "tg-theme-gallery-actions" });
    const cancel = actions.createEl("button", { text: "Cancel", cls: "tg-course-btn tg-course-btn-muted" });
    cancel.addEventListener("click", () => this.close());
    const apply = actions.createEl("button", { text: "Apply theme", cls: "tg-course-btn tg-course-btn-primary" });
    apply.addEventListener("click", async () => {
      apply.disabled = true;
      try {
        await this.plugin.saveUiTheme(this.previewThemeId);
        this.committed = true;
        new Notice("LIFORA appearance saved in Portable DATA.");
        this.close();
      } catch (error) {
        apply.disabled = false;
        new Notice(`Could not save LIFORA appearance: ${error.message}`);
      }
    });
  }

  onClose() {
    if (!this.committed) this.plugin.applyUiTheme(this.originalThemeId);
    this.contentEl.empty();
  }
}

class TimeGardenPersonalizationModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.settings = null;
  }

  async onOpen() {
    this.settings = await this.plugin.getWorkspacePreferences();
    this.render();
  }

  render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-course-modal");
    contentEl.createEl("h2", { text: "Personalization Center" });
    contentEl.createEl("p", { text: "Choose which Home widgets appear, control section visibility, colors, and navigation order. Your real folders and files are never renamed." , cls: "tg-course-modal-description" });

    const themesLink = contentEl.createDiv({ cls: "tg-theme-personalization-entry" });
    const themesText = themesLink.createDiv();
    themesText.createEl("strong", { text: "Premium appearance themes" });
    themesText.createEl("small", {
      text: `${LIFORA_THEME_PRESETS.filter(t => t.mode !== "native").length} premium styles, including ${LIFORA_THEME_PRESETS.filter(t => t.mode === "dark" && t.new).length} new dark themes. Saved with your LIFORA settings.`
    });
    const themesButton = themesLink.createEl("button", { text: "Browse themes", cls: "tg-course-btn tg-course-btn-primary" });
    themesButton.addEventListener("click", () => this.plugin.openThemeGallery());

    const widgetGroup = contentEl.createDiv({ cls: "tg-personalization-group" });
    widgetGroup.createEl("h3", { text: "Home widgets" });
    const widgetLabels = {
      daily: "Today's Daily Journal",
      stats: "Workspace statistics",
      sections: "Section cards",
      recent: "Recent activity",
      quickActions: "Quick actions"
    };
    const widgetList = widgetGroup.createDiv({ cls: "tg-personalization-widget-list" });
    const orderedWidgets = this.settings.widgetOrder.map(key => [key, widgetLabels[key]]).filter(item => item[1]);
    orderedWidgets.forEach(([key, label], index) => {
      const row = widgetList.createDiv({ cls: "tg-personalization-widget-row" });
      const checkbox = row.createEl("input", { type: "checkbox" });
      checkbox.checked = this.settings.homeWidgets[key] !== false;
      checkbox.addEventListener("change", () => { this.settings.homeWidgets[key] = checkbox.checked; });
      row.createEl("span", { text: label });
      const controls = row.createDiv({ cls: "tg-personalization-order" });
      const up = controls.createEl("button", { attr: { "aria-label": `Move ${label} up` } });
      this.plugin.setButtonIcon(up, "chevron-up");
      up.disabled = index === 0;
      up.addEventListener("click", () => {
        const order = this.settings.widgetOrder;
        [order[index - 1], order[index]] = [order[index], order[index - 1]];
        this.render();
      });
      const down = controls.createEl("button", { attr: { "aria-label": `Move ${label} down` } });
      this.plugin.setButtonIcon(down, "chevron-down");
      down.disabled = index === orderedWidgets.length - 1;
      down.addEventListener("click", () => {
        const order = this.settings.widgetOrder;
        [order[index + 1], order[index]] = [order[index], order[index + 1]];
        this.render();
      });
    });

    const sectionGroup = contentEl.createDiv({ cls: "tg-personalization-group" });
    sectionGroup.createEl("h3", { text: "Sections · Visibility, colors & order" });
    sectionGroup.createEl("p", { text: "Use the arrows to reorder sections. The same order is applied to the Home cards and the native sidebar." , cls: "tg-course-modal-description" });
    this.sectionList = sectionGroup.createDiv({ cls: "tg-personalization-section-list" });
    this.renderSections();

    const bannerGroup = contentEl.createDiv({ cls: "tg-personalization-group tg-section-banner-group" });
    bannerGroup.createEl("h3", { text: "Section banners" });
    bannerGroup.createEl("p", {
      text: "Choose a fixed banner or rotate several images. Put one vault image path per line.",
      cls: "tg-course-modal-description"
    });

    const bannerList = bannerGroup.createDiv({ cls: "tg-personalization-banner-list" });
    const orderedSections = this.settings.sectionOrder
      .map(path => HOME_SECTION_CONFIG.find(item => item.folder === path))
      .filter(Boolean);

    orderedSections.forEach(section => {
      const saved = this.settings.sectionBanners[section.folder] || {};
      const row = bannerList.createDiv({ cls: "tg-personalization-banner-row" });
      row.createEl("strong", { text: section.title });

      const mode = row.createEl("select", { cls: "tg-personalization-banner-mode" });
      [["static", "Fixed image"], ["daily", "Change every day"], ["weekly", "Change every week"], ["interval", "Custom interval"]]
        .forEach(([value, label]) => mode.createEl("option", { text: label, attr: { value } }));
      mode.value = ["static", "daily", "weekly", "interval"].includes(saved.mode) ? saved.mode : "daily";

      const images = row.createEl("textarea", {
        cls: "tg-personalization-banner-images",
        attr: { rows: "3", placeholder: "06 Templates/Images/Weekly Notes/WeeklyBanner1.gif\n06 Templates/Images/Weekly Notes/WeeklyBanner2.gif" }
      });
      images.value = (Array.isArray(saved.images) ? saved.images : []).join("\n");

      const interval = row.createEl("input", {
        cls: "tg-personalization-banner-interval",
        type: "number",
        attr: { min: "1", max: "8760", title: "Change interval in hours" }
      });
      interval.value = String(Math.max(1, Number(saved.intervalHours) || 24));
      interval.disabled = mode.value !== "interval";

      const updateSaved = () => {
        this.settings.sectionBanners[section.folder] = {
          mode: mode.value,
          intervalHours: Math.max(1, Number(interval.value) || 24),
          anchor: Number(saved.anchor) || Date.UTC(2026, 0, 1),
          images: images.value.split(/\r?\n/).map(path => path.trim()).filter(Boolean)
        };
      };
      mode.addEventListener("change", () => {
        interval.disabled = mode.value !== "interval";
        updateSaved();
      });
      interval.addEventListener("input", updateSaved);
      images.addEventListener("input", updateSaved);
      updateSaved();
    });

    const footer = contentEl.createDiv({ cls: "tg-course-modal-actions" });
    const cancel = footer.createEl("button", { text: "Cancel", cls: "tg-course-btn tg-course-btn-muted" });
    cancel.addEventListener("click", () => this.close());
    const save = footer.createEl("button", { text: "Save Preferences", cls: "tg-course-btn tg-course-btn-primary" });
    save.addEventListener("click", async () => {
      save.disabled = true;
      try {
        await this.plugin.saveWorkspacePreferences(this.settings);
        new Notice("LIFORA preferences saved.");
        this.close();
      } catch (error) {
        save.disabled = false;
        new Notice(`Could not save preferences: ${error.message}`);
      }
    });
  }

  renderSections() {
    this.sectionList.empty();
    const ordered = this.settings.sectionOrder
      .map(path => HOME_SECTION_CONFIG.find(item => item.folder === path))
      .filter(Boolean);
    ordered.forEach((section, index) => {
      const row = this.sectionList.createDiv({ cls: "tg-personalization-section-row" });
      const visibility = row.createEl("input", { type: "checkbox" });
      visibility.checked = this.settings.visibleSections.includes(section.folder);
      visibility.setAttribute("aria-label", `Show ${section.title} on Home`);
      visibility.addEventListener("change", () => {
        if (visibility.checked && !this.settings.visibleSections.includes(section.folder)) this.settings.visibleSections.push(section.folder);
        if (!visibility.checked) this.settings.visibleSections = this.settings.visibleSections.filter(path => path !== section.folder);
      });

      const label = row.createDiv({ cls: "tg-personalization-section-label" });
      this.plugin.createPremiumIcon(label, section.icon, "tg-personalization-section-icon tg-premium-svg-icon", section.title);
      label.createEl("strong", { text: section.title });

      const color = row.createEl("input", { type: "color", cls: "tg-personalization-color" });
      color.value = this.settings.sectionColors[section.folder] || section.color;
      color.addEventListener("input", () => { this.settings.sectionColors[section.folder] = color.value; });

      const controls = row.createDiv({ cls: "tg-personalization-order" });
      const up = controls.createEl("button", { attr: { "aria-label": `Move ${section.title} up` } });
      this.plugin.setButtonIcon(up, "chevron-up");
      up.disabled = index === 0;
      up.addEventListener("click", () => {
        const order = this.settings.sectionOrder;
        [order[index - 1], order[index]] = [order[index], order[index - 1]];
        this.renderSections();
      });
      const down = controls.createEl("button", { attr: { "aria-label": `Move ${section.title} down` } });
      this.plugin.setButtonIcon(down, "chevron-down");
      down.disabled = index === ordered.length - 1;
      down.addEventListener("click", () => {
        const order = this.settings.sectionOrder;
        [order[index + 1], order[index]] = [order[index], order[index + 1]];
        this.renderSections();
      });
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

class TimeGardenGlobalSearchModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.searchToken = 0;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-course-modal");
    contentEl.createEl("h2", { text: "Search LIFORA" });
    contentEl.createEl("p", { text: "Search Markdown note titles and content across your vault. Files are searched locally." , cls: "tg-course-modal-description" });
    const input = contentEl.createEl("input", { type: "search", placeholder: "Search courses, books, notes, languages…" , cls: "tg-global-search-input" });
    this.resultsEl = contentEl.createDiv({ cls: "tg-global-search-results" });
    this.resultsEl.createDiv({ cls: "tg-home-recent-empty", text: "Start typing to search your notes." });
    input.focus();

    input.addEventListener("input", () => {
      const token = ++this.searchToken;
      const query = input.value.trim();
      if (!query) {
        this.resultsEl.empty();
        this.resultsEl.createDiv({ cls: "tg-home-recent-empty", text: "Start typing to search your notes." });
        return;
      }
      this.resultsEl.empty();
      this.resultsEl.createDiv({ cls: "tg-home-recent-empty", text: "Searching your vault…" });
      window.setTimeout(async () => {
        if (token !== this.searchToken || !this.resultsEl.isConnected) return;
        const results = await this.plugin.searchVault(query, 30);
        if (token !== this.searchToken || !this.resultsEl.isConnected) return;
        this.resultsEl.empty();
        if (!results.length) {
          this.resultsEl.createDiv({ cls: "tg-home-recent-empty", text: "No matching notes found." });
          return;
        }
        for (const result of results) {
          const button = this.resultsEl.createEl("button", { cls: "tg-global-search-result" });
          button.createEl("strong", { text: result.file.basename });
          button.createSpan({ text: result.file.path });
          button.createEl("p", { text: result.snippet });
          button.addEventListener("click", async () => {
            this.close();
            await this.plugin.openNote(result.file.path);
          });
        }
      }, 220);
    });
  }

  onClose() {
    this.searchToken += 1;
    this.contentEl.empty();
  }
}

class TimeGardenBackupModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.selectedBackup = "";
  }
  onOpen() { void this.render(); }
  async render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-course-modal", "tg-full-backup-center");
    const title = contentEl.createDiv({cls:"tg-full-backup-title"});
    this.plugin.setButtonIcon(title, "shield-check");
    title.createEl("h2", {text:"LIFORA Backup & Recovery"});
    contentEl.createEl("p", {text:"Complete, verified snapshots of the entire Vault — courses, books, PDFs, notes, attachments, themes, plugins and settings. Backups are stored on this computer outside the Syncthing Vault.",cls:"tg-course-modal-description"});
    if (!this.plugin.canUseFullVaultBackups()) {
      contentEl.createDiv({cls:"tg-home-recent-empty",text:"Full backups are managed on Obsidian Desktop. Mobile keeps saving and syncing normal course files; it does not write computer backup snapshots."});
      return;
    }
    const saved = (await this.plugin.loadData()) || {};
    const destinationPanel = contentEl.createDiv({cls:"tg-personalization-group"});
    destinationPanel.createEl("h3", {text:"Backup Destination"});
    const folderInput = destinationPanel.createEl("input", {type:"text",cls:"tg-full-backup-path",placeholder:"D:\\LIFORA Backups",value:saved.fullBackupFolder || ""});
    folderInput.setAttribute("aria-label","Absolute path outside the Vault");
    const folderActions = destinationPanel.createDiv({cls:"tg-backup-actions"});
    const browse = this.plugin.iconButton(folderActions,"Browse Folder","folder-open","tg-course-btn tg-course-btn-muted");
    browse.addEventListener("click", async () => {
      try { const selected = await this.plugin.pickFullBackupDirectory(); if (selected) folderInput.value = selected; }
      catch (error) { new Notice(`Folder picker unavailable: ${error.message}. Type the folder path manually.`); }
    });
    const save = this.plugin.iconButton(folderActions,"Save Destination","check","tg-course-btn tg-course-btn-primary");
    save.addEventListener("click", async () => {
      try { await this.plugin.saveFullBackupFolder(folderInput.value.trim()); await this.render(); new Notice("Backup destination saved."); }
      catch (error) { new Notice(`Invalid destination: ${error.message}`); }
    });
    const activeFolder = saved.fullBackupFolder || "";
    if (!activeFolder) destinationPanel.createEl("p",{text:"Choose and save a computer folder before creating a backup. Automatic backups remain off until you enable them.",cls:"tg-course-modal-description"});
    const auto = contentEl.createDiv({cls:"tg-personalization-group tg-backup-auto-panel"});
    const row = auto.createDiv({cls:"tg-backup-auto-row"});
    const copy = row.createDiv({cls:"tg-backup-auto-copy"});
    copy.createEl("strong",{text:"Automatic Daily Backup"});
    copy.createEl("span",{text:saved.automaticBackupEnabled === true ? "On · saves a complete snapshot daily while Obsidian Desktop is open" : "Off · enable when you have chosen a destination",cls:"tg-course-modal-description"});
    const toggle = this.plugin.iconButton(row,saved.automaticBackupEnabled === true ? "Turn Off" : "Turn On","clock","tg-course-btn tg-course-btn-muted");
    toggle.disabled = !activeFolder;
    toggle.addEventListener("click",async()=>{
      const latest=(await this.plugin.loadData()) || {};
      await this.plugin.saveData({...latest,automaticBackupEnabled:latest.automaticBackupEnabled !== true});
      await this.render();
    });
    const actions=contentEl.createDiv({cls:"tg-backup-actions"});
    const create=this.plugin.iconButton(actions,"Create Full Backup","database-backup","tg-course-btn tg-course-btn-primary");
    create.disabled=!activeFolder;
    create.addEventListener("click",async()=>{
      create.disabled=true;
      create.empty();this.plugin.setButtonIcon(create,"loader-circle");create.createSpan({text:"Backing up & verifying…"});
      try { await this.plugin.createVaultBackup(true); await this.render(); }
      catch(error){new Notice(`Full backup failed: ${error.message}`);create.disabled=false;create.empty();this.plugin.setButtonIcon(create,"database-backup");create.createSpan({text:"Try Backup Again"});}
    });
    const section=contentEl.createDiv({cls:"tg-personalization-group"});
    section.createEl("h3",{text:"Verified Backup History · Max 3"});
    section.createEl("p",{text:"The 3 newest successfully verified full snapshots are retained. Every file, including hidden .obsidian settings and themes, is checked using SHA-256 before a backup becomes available.",cls:"tg-course-modal-description"});
    let backups=[];
    try { backups=await this.plugin.getVaultBackups(); }
    catch(error){section.createEl("p",{text:`Cannot read backup folder: ${error.message}`});}
    if(!backups.length){section.createDiv({cls:"tg-home-recent-empty",text:"No full backups yet. Save a destination and create the first one."});}
    else {
      const select=section.createEl("select",{cls:"tg-backup-select"});
      for(const backup of backups){
        const size=(backup.totalBytes / (1024*1024)).toFixed(1);
        const option=select.createEl("option",{value:backup.id,text:`${new Date(backup.createdAt).toLocaleString()}  ·  ${backup.fileCount} files  ·  ${size} MB`});
        if(backup.id===this.selectedBackup)option.selected=true;
      }
      this.selectedBackup=select.value;
      select.addEventListener("change",()=>{this.selectedBackup=select.value;});
      const verify=this.plugin.iconButton(section,"Verify Selected","shield-check","tg-course-btn tg-course-btn-muted");
      verify.addEventListener("click",async()=>{
        verify.disabled=true;
        try {const checked=await this.plugin.verifyVaultBackup(this.selectedBackup);new Notice(`Verified ${checked.checked} files (SHA-256).`);}
        catch(error){new Notice(`Backup verification failed: ${error.message}`);}
        finally{verify.disabled=false;}
      });
      const restore=this.plugin.iconButton(section,"Prepare Exact Restore","rotate-ccw","tg-course-btn tg-course-btn-primary");
      restore.addEventListener("click",async()=>{
        if(!window.confirm("Prepare a FULL restore of this snapshot? This replaces the entire Vault (including .obsidian, settings and themes). You must CLOSE Obsidian and PAUSE Syncthing before running the restore launcher."))return;
        restore.disabled=true;
        try {
          const result=await this.plugin.restoreVaultBackup(this.selectedBackup);
          new Notice("Restore launcher prepared. CLOSE Obsidian, PAUSE Syncthing, then run LIFORA-RESTORE.cmd in your backup folder.",12000);
          this.close();
          window.alert(`Restore verified and prepared.\n\n1. Pause Syncthing.\n2. Close ALL Obsidian windows.\n3. Open ${result.folder}\n4. Run LIFORA-RESTORE.cmd.\n5. Reopen Obsidian when it reports success.\n\nThe old Vault is not changed until you run the offline launcher.`);
        } catch(error){restore.disabled=false;new Notice(`Cannot prepare restore: ${error.message}`);}
      });
    }
    const footer=contentEl.createDiv({cls:"tg-course-modal-actions"});
    const close=footer.createEl("button",{text:"Close",cls:"tg-course-btn tg-course-btn-muted"});
    close.addEventListener("click",()=>this.close());
  }
  onClose(){this.contentEl.empty();}
}

class TimeGardenTableInsertModal extends Modal {
  constructor(app, editor) {
    super(app);
    this.editor = editor;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-editor-modal");
    contentEl.createEl("h2", { text: "Insert a table" });
    contentEl.createEl("p", { text: "Choose the number of rows and columns. The first row can be used as headings." });
    const grid = contentEl.createDiv({ cls: "tg-editor-modal-grid" });
    const rowsWrap = grid.createDiv();
    rowsWrap.createEl("label", { text: "Rows" });
    const rows = rowsWrap.createEl("input", { type: "number", value: "3", attr: { min: "2", max: "20" } });
    const colsWrap = grid.createDiv();
    colsWrap.createEl("label", { text: "Columns" });
    const cols = colsWrap.createEl("input", { type: "number", value: "3", attr: { min: "2", max: "12" } });
    const headerWrap = contentEl.createDiv({ cls: "tg-editor-modal-check" });
    const header = headerWrap.createEl("input", { type: "checkbox" });
    header.checked = true;
    headerWrap.createEl("label", { text: "Use first row as table headings" });
    const actions = contentEl.createDiv({ cls: "tg-editor-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel", cls: "tg-course-btn tg-course-btn-muted" });
    cancel.addEventListener("click", () => this.close());
    const insert = actions.createEl("button", { text: "Insert table", cls: "tg-course-btn tg-course-btn-primary" });
    insert.addEventListener("click", () => {
      const rowCount = Math.max(2, Math.min(20, Number(rows.value) || 3));
      const colCount = Math.max(2, Math.min(12, Number(cols.value) || 3));
      const cells = count => Array.from({ length: count }, (_, index) => `Column ${index + 1}`);
      const lines = [];
      if (header.checked) {
        lines.push(`| ${cells(colCount).join(" | ")} |`);
        lines.push(`| ${Array.from({ length: colCount }, () => "---").join(" | ")} |`);
        for (let row = 1; row < rowCount; row++) lines.push(`| ${Array.from({ length: colCount }, () => " ").join(" | ")} |`);
      } else {
        for (let row = 0; row < rowCount; row++) lines.push(`| ${Array.from({ length: colCount }, () => " ").join(" | ")} |`);
      }
      this.editor.replaceSelection(`\n${lines.join("\n")}\n`);
      this.editor.focus();
      this.close();
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

class TimeGardenLinkInsertModal extends Modal {
  constructor(app, editor) {
    super(app);
    this.editor = editor;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-editor-modal");
    contentEl.createEl("h2", { text: "Insert a link" });
    const labelWrap = contentEl.createDiv({ cls: "tg-editor-modal-field" });
    labelWrap.createEl("label", { text: "Link text" });
    const label = labelWrap.createEl("input", { type: "text", value: this.editor.getSelection() || "Open link" });
    const urlWrap = contentEl.createDiv({ cls: "tg-editor-modal-field" });
    urlWrap.createEl("label", { text: "URL" });
    const url = urlWrap.createEl("input", { type: "url", placeholder: "https://example.com" });
    const actions = contentEl.createDiv({ cls: "tg-editor-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel", cls: "tg-course-btn tg-course-btn-muted" });
    cancel.addEventListener("click", () => this.close());
    const insert = actions.createEl("button", { text: "Insert link", cls: "tg-course-btn tg-course-btn-primary" });
    insert.addEventListener("click", () => {
      let target = url.value.trim();
      if (!target) {
        new Notice("Enter a URL first.");
        url.focus();
        return;
      }
      if (!/^(https?:\/\/|mailto:)/i.test(target)) target = `https://${target}`;
      let parsed;
      try {
        parsed = new URL(target);
      } catch {
        new Notice("Enter a valid web or email link.");
        url.focus();
        return;
      }
      if (!["http:", "https:", "mailto:"].includes(parsed.protocol)) {
        new Notice("Only HTTP, HTTPS, and mail links are supported.");
        url.focus();
        return;
      }
      const safeTarget = parsed.href.replace(/[()]/g, "%28");
      const text = label.value.trim() || target;
      this.editor.replaceSelection(`[${text.replace(/[\[\]]/g, "")}](${safeTarget})`);
      this.editor.focus();
      this.close();
    });
    label.focus();
  }

  onClose() {
    this.contentEl.empty();
  }
}

class TimeGardenImageInsertModal extends Modal {
  constructor(app, plugin, editor, files) {
    super(app);
    this.plugin = plugin;
    this.editor = editor;
    this.files = files;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-editor-modal");
    contentEl.createEl("h2", { text: "Insert images" });
    contentEl.createEl("p", { text: `${this.files.length} image(s) selected. Choose how they should appear in your note.` });
    const widthWrap = contentEl.createDiv({ cls: "tg-editor-modal-field" });
    widthWrap.createEl("label", { text: "Display width" });
    const width = widthWrap.createEl("select");
    [
      ["auto", "Original / automatic"],
      ["320", "Small · 320 px"],
      ["480", "Medium · 480 px"],
      ["640", "Large · 640 px"],
      ["800", "Extra large · 800 px"],
      ["1024", "Full detail · 1024 px"]
    ].forEach(([value, label]) => width.createEl("option", { value, text: label }));
    width.value = "640";
    const captionWrap = contentEl.createDiv({ cls: "tg-editor-modal-field" });
    captionWrap.createEl("label", { text: "Caption (optional)" });
    const caption = captionWrap.createEl("input", { type: "text", placeholder: "Add a short caption below the image" });
    const actions = contentEl.createDiv({ cls: "tg-editor-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel", cls: "tg-course-btn tg-course-btn-muted" });
    cancel.addEventListener("click", () => this.close());
    const insert = actions.createEl("button", { text: "Upload and insert", cls: "tg-course-btn tg-course-btn-primary" });
    insert.addEventListener("click", async () => {
      insert.disabled = true;
      try {
        await this.plugin.insertEditorImages(this.editor, this.files, { width: width.value, caption: caption.value });
        this.close();
      } catch (error) {
        insert.disabled = false;
        new Notice(`Could not insert image: ${error.message || error}`);
      }
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

class TimeGardenVoiceRecorderModal extends Modal {
  constructor(app, plugin, editor) {
    super(app);
    this.plugin = plugin;
    this.editor = editor;
    this.chunks = [];
    this.stream = null;
    this.recorder = null;
    this.isSaving = false;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-editor-modal", "tg-voice-recorder-modal");
    contentEl.createEl("h2", { text: "Voice note recorder" });
    contentEl.createEl("p", { text: "Record a short voice note. It will be saved inside your LIFORA workspace and inserted into the current page." });
    this.status = contentEl.createDiv({ cls: "tg-voice-recorder-status", text: "Microphone is ready when you are." });
    const actions = contentEl.createDiv({ cls: "tg-editor-modal-actions" });
    this.startButton = this.plugin.iconButton(actions, "Start recording", "mic", "tg-course-btn tg-course-btn-primary");
    this.pauseButton = this.plugin.iconButton(actions, "Pause", "pause", "tg-course-btn tg-course-btn-muted");
    this.stopButton = this.plugin.iconButton(actions, "Stop and save", "square", "tg-course-btn tg-course-btn-muted");
    this.pauseButton.disabled = true;
    this.stopButton.disabled = true;
    this.startButton.addEventListener("click", () => this.startRecording());
    this.pauseButton.addEventListener("click", () => this.togglePause());
    this.stopButton.addEventListener("click", () => this.stopRecording());
    const hint = contentEl.createDiv({ cls: "tg-editor-modal-hint", text: "Your browser or operating system may ask for microphone permission. Audio is stored locally in your vault." });
  }

  async startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      new Notice("Audio recording is not supported in this Obsidian environment.");
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mimeType = mimeCandidates.find(type => MediaRecorder.isTypeSupported?.(type));
      this.recorder = mimeType ? new MediaRecorder(this.stream, { mimeType }) : new MediaRecorder(this.stream);
      this.chunks = [];
      this.recorder.addEventListener("dataavailable", event => {
        if (event.data?.size) this.chunks.push(event.data);
      });
      this.recorder.addEventListener("stop", () => this.saveRecording());
      this.recorder.start();
      this.recordingStartedAt = Date.now();
      this.status.setText("Recording · 00:00 — speak naturally.");
      this.recordingTimer = window.setInterval(() => {
        if (!this.recordingStartedAt || !this.status) return;
        const seconds = Math.floor((Date.now() - this.recordingStartedAt) / 1000);
        const label = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
        this.status.setText(`${this.recorder?.state === "paused" ? "Paused" : "Recording"} · ${label}`);
      }, 1000);
      this.startButton.disabled = true;
      this.pauseButton.disabled = false;
      this.stopButton.disabled = false;
      this.startButton.empty(); this.plugin.setButtonIcon(this.startButton, "audio-lines"); this.startButton.createSpan({ text: "Recording" });
    } catch (error) {
      console.error("LIFORA microphone permission failed", error);
      new Notice(`Could not access the microphone: ${error.message || error}`);
      this.status.setText("Microphone access was not granted.");
    }
  }

  togglePause() {
    if (!this.recorder) return;
    if (this.recorder.state === "recording") {
      this.recorder.pause();
      this.pauseButton.setText("▶ Resume");
      this.status.setText("Recording paused. Resume when you are ready.");
    } else if (this.recorder.state === "paused") {
      this.recorder.resume();
      this.pauseButton.empty(); this.plugin.setButtonIcon(this.pauseButton, "pause"); this.pauseButton.createSpan({ text: "Pause" });
      this.status.setText("Recording resumed.");
    }
  }

  stopRecording() {
    if (this.recorder && this.recorder.state !== "inactive") {
      this.stopButton.disabled = true;
      this.pauseButton.disabled = true;
      this.status.setText("Saving your voice note…");
      if (this.recordingTimer) window.clearInterval(this.recordingTimer);
      this.recordingTimer = null;
      this.recorder.stop();
    }
  }

  async saveRecording() {
    if (this.isSaving) return;
    this.isSaving = true;
    try {
      const type = this.recorder?.mimeType || this.chunks[0]?.type || "audio/webm";
      const blob = new Blob(this.chunks, { type });
      if (!blob.size) throw new Error("The recording is empty.");
      const extension = type.includes("mp4") ? "m4a" : "webm";
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const path = await this.plugin.saveEditorAttachment(blob, `Voice Note ${stamp}`, "Audio", extension);
      this.editor.replaceSelection(`\n![[${path}]]\n`);
      this.editor.focus();
      new Notice("Voice note saved and inserted into your page.");
      this.close();
    } catch (error) {
      console.error("LIFORA voice note save failed", error);
      new Notice(`Could not save voice note: ${error.message || error}`);
      this.status?.setText("Could not save the recording. You can try again.");
      this.isSaving = false;
    } finally {
      this.stream?.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  onClose() {
    if (this.recordingTimer) window.clearInterval(this.recordingTimer);
    this.recordingTimer = null;
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.stop();
    } else {
      this.stream?.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.contentEl.empty();
  }
}

class TimeGardenImageResizeModal extends Modal {
  constructor(app, editor, sourceFile = null, specificImage = null) {
    super(app);
    this.editor = editor;
    this.sourceFile = sourceFile;
    this.specificImage = specificImage;
  }

  onOpen() {
    const root = this.contentEl;
    root.empty();
    root.addClass("tg-editor-modal", "tg-lifora-resize-modal");
    root.createEl("h2", { text: "Resize image · drag to scale" });
    root.createEl("p", { text: "Drag the image's bottom-right handle, choose a width, then Save. The new size is saved into the note, not just the display." });
    const cursor = this.editor.getCursor();
    const expected = this.specificImage?.path || null;
    const findInLine = (lineNo) => {
      const text = this.editor.getLine(lineNo);
      const links = [...text.matchAll(/!\[\[([^\]]+)\]\]/g)];
      return links.find(m => !expected || (this.app.metadataCache.getFirstLinkpathDest?.(m[1].split("|")[0],this.sourceFile?.path || "")?.path === expected) || m[1].split("|")[0] === expected || m[1].split("|")[0] === this.specificImage?.basename) || null;
    };
    let targetLine = cursor.line;
    let match = findInLine(cursor.line);
    if (!match) for (let offset = 1; offset <= 12 && !match; offset++) {
      for (const lineNo of [cursor.line - offset, cursor.line + offset]) {
        if (lineNo < 0 || lineNo >= this.editor.lineCount()) continue;
        match = findInLine(lineNo);
        if (match) { targetLine = lineNo; break; }
      }
    }
    if (!match) {
      root.createEl("p", { text: "Put the cursor beside an image embed like ![[image.png|560]], then reopen Resize. Nothing was changed." });
      return;
    }
    const inner = match[1];
    const path = inner.split("|")[0];
    const maybeFile = this.app.metadataCache.getFirstLinkpathDest?.(path, this.sourceFile?.path || "") || this.specificImage || this.app.vault.getAbstractFileByPath(path);
    const numeric = Number(inner.split("|").pop());
    const startingWidth = inner.includes("|") && Number.isFinite(numeric) && numeric > 0 ? numeric : 560;
    const frame = root.createDiv({ cls: "tg-lifora-drag-preview" });
    const preview = frame.createDiv({ cls: "tg-lifora-drag-image-wrap" });
    if (maybeFile instanceof TFile && /^(png|jpe?g|webp|svg|gif|avif)$/i.test(maybeFile.extension)) {
      const picture = preview.createEl("img", { cls: "tg-lifora-drag-preview-img", attr: { alt: maybeFile.basename } });
      picture.src = this.app.vault.getResourcePath(maybeFile);
    } else preview.createDiv({ text: path, cls: "tg-lifora-drag-fallback" });
    const handle = preview.createEl("button", { cls: "tg-lifora-drag-handle", attr: { type: "button", title: "Drag to resize", "aria-label": "Drag right to enlarge, left to shrink" } });
    setIcon(handle, "move-diagonal-2");
    const inputBox = root.createDiv({ cls: "tg-editor-modal-field" });
    inputBox.createEl("label", { text: "Image width (px)" });
    const input = inputBox.createEl("input", { type: "number", attr: { min: "140", max: "1600", step: "10" } });
    const normalize = v => Math.max(140, Math.min(1600, Math.round(Number(v) || 560)));
    const setWidth = v => {
      const width = normalize(v);
      preview.style.width = `${width}px`;
      input.value = String(width);
    };
    input.addEventListener("input", () => setWidth(input.value));
    setWidth(startingWidth);
    handle.addEventListener("pointerdown", event => {
      event.preventDefault(); event.stopPropagation();
      const x0 = event.clientX, w0 = Number(input.value) || 560;
      handle.setPointerCapture?.(event.pointerId);
      const move = e => { if (e.pointerId !== event.pointerId) return; setWidth(w0 + (e.clientX - x0)); };
      const finish = e => {
        if (e.pointerId !== event.pointerId) return;
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", finish);
        handle.removeEventListener("pointercancel", finish);
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", finish);
      handle.addEventListener("pointercancel", finish);
    });
    const actions = root.createDiv({ cls: "tg-editor-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel", cls: "tg-course-btn tg-course-btn-muted" });
    cancel.addEventListener("click", () => this.close());
    const save = actions.createEl("button", { text: "Save image size", cls: "tg-course-btn tg-course-btn-primary" });
    save.addEventListener("click", () => {
      const current = this.editor.getLine(targetLine);
      // Never overwrite a different link if the note was edited while the modal was open.
      if (!current.includes(match[0])) { new Notice("The note changed. Reopen Resize to avoid touching the wrong image."); return; }
      const revised = current.replace(match[0], `![[${path}|${normalize(input.value)}]]`);
      this.editor.replaceRange(revised, { line: targetLine, ch: 0 }, { line: targetLine, ch: current.length });
      this.close();
      new Notice("Image size saved in your Markdown note.");
    });
  }
  onClose() { this.contentEl.empty(); }
}

class TimeGardenCalloutInsertModal extends Modal {
  constructor(app, editor) {
    super(app);
    this.editor = editor;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-editor-modal");
    contentEl.createEl("h2", { text: "Insert a colored title box" });
    const typeWrap = contentEl.createDiv({ cls: "tg-editor-modal-field" });
    typeWrap.createEl("label", { text: "Callout type" });
    const type = typeWrap.createEl("select");
    [
      ["tg-box-blue", "Blue title box"],
      ["tg-box-purple", "Purple title box"],
      ["tg-box-green", "Green title box"],
      ["tg-box-gold", "Gold title box"],
      ["tg-box-orange", "Orange title box"],
      ["tg-box-pink", "Pink title box"],
      ["tg-box-red", "Red title box"],
      ["note", "Note callout"],
      ["info", "Information callout"],
      ["tip", "Tip callout"],
      ["success", "Success callout"],
      ["question", "Question callout"],
      ["warning", "Warning callout"],
      ["danger", "Important / Danger callout"],
      ["example", "Example callout"],
      ["quote", "Quote callout"]
    ].forEach(([value, label]) => type.createEl("option", { value, text: label }));
    const titleWrap = contentEl.createDiv({ cls: "tg-editor-modal-field" });
    titleWrap.createEl("label", { text: "Title" });
    const title = titleWrap.createEl("input", { type: "text", value: "A useful note" });
    const bodyWrap = contentEl.createDiv({ cls: "tg-editor-modal-field" });
    bodyWrap.createEl("label", { text: "Content" });
    const body = bodyWrap.createEl("textarea", { attr: { rows: "4" } });
    body.value = "Write your content here.";
    const actions = contentEl.createDiv({ cls: "tg-editor-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel", cls: "tg-course-btn tg-course-btn-muted" });
    cancel.addEventListener("click", () => this.close());
    const insert = actions.createEl("button", { text: "Insert box", cls: "tg-course-btn tg-course-btn-primary" });
    insert.addEventListener("click", () => {
      const heading = title.value.trim();
      const lines = body.value.trim().split(/\r?\n/).map(line => `> ${line}`).join("\n");
      this.editor.replaceSelection(`\n> [!${type.value}]${heading ? ` ${heading}` : ""}\n${lines || "> "}\n`);
      this.editor.focus();
      this.close();
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}


class TimeGardenFolderAppearanceModal extends Modal {
  constructor(app, plugin, folderPath) {
    super(app);
    this.plugin = plugin;
    this.folderPath = folderPath;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-editor-modal", "tg-folder-appearance-modal");
    contentEl.createEl("h2", { text: "Customize folder appearance" });
    contentEl.createEl("p", { text: this.folderPath, cls: "tg-editor-modal-description" });

    const existing = (await this.plugin.getFolderAppearances())[this.folderPath] || {};
    const makeColorRow = (label, key, fallback) => {
      const row = contentEl.createDiv({ cls: "tg-folder-color-row" });
      const labelEl = row.createEl("label", { text: label });
      const enabled = row.createEl("input", { type: "checkbox" });
      enabled.checked = Boolean(existing[key]);
      const input = row.createEl("input", { type: "color" });
      input.value = existing[key] || fallback;
      input.disabled = !enabled.checked;
      enabled.addEventListener("change", () => { input.disabled = !enabled.checked; });
      return { enabled, input };
    };

    this.background = makeColorRow("Folder background", "backgroundColor", "#4f46e5");
    this.text = makeColorRow("Folder name / text", "textColor", "#f8fafc");
    this.accent = makeColorRow("Folder accent", "accentColor", "#c4a35a");

    const preview = contentEl.createDiv({ cls: "tg-folder-color-preview" });
    preview.createSpan({ text: "▣  " });
    preview.createSpan({ text: this.folderPath.split("/").pop() || this.folderPath });
    const updatePreview = () => {
      preview.style.backgroundColor = this.background.enabled.checked ? this.background.input.value : "var(--background-secondary)";
      preview.style.color = this.text.enabled.checked ? this.text.input.value : "var(--text-normal)";
      preview.style.borderInlineStart = `4px solid ${this.accent.enabled.checked ? this.accent.input.value : "transparent"}`;
    };
    [this.background, this.text, this.accent].forEach(pair => {
      pair.enabled.addEventListener("change", updatePreview);
      pair.input.addEventListener("input", updatePreview);
    });
    updatePreview();

    const actions = contentEl.createDiv({ cls: "tg-editor-modal-actions" });
    const reset = actions.createEl("button", { text: "Reset to default", cls: "tg-course-btn tg-course-btn-muted" });
    reset.addEventListener("click", async () => {
      await this.plugin.saveFolderAppearance(this.folderPath, null);
      this.close();
      new Notice("Folder appearance reset.");
    });
    const cancel = actions.createEl("button", { text: "Cancel", cls: "tg-course-btn tg-course-btn-muted" });
    cancel.addEventListener("click", () => this.close());
    const save = actions.createEl("button", { text: "Save appearance", cls: "tg-course-btn tg-course-btn-primary" });
    save.addEventListener("click", async () => {
      const appearance = {
        backgroundColor: this.background.enabled.checked ? this.background.input.value : "",
        textColor: this.text.enabled.checked ? this.text.input.value : "",
        accentColor: this.accent.enabled.checked ? this.accent.input.value : ""
      };
      await this.plugin.saveFolderAppearance(this.folderPath, appearance);
      this.close();
      new Notice("Folder appearance saved.");
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

class TimeGardenTemplateCreateModal extends Modal {
  constructor(app, plugin, initialContent = "", onSaved = null) {
    super(app);
    this.plugin = plugin;
    this.initialContent = initialContent;
    this.onSaved = onSaved;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-editor-modal", "tg-template-create-modal");
    contentEl.createEl("h2", { text: "Create a writing template" });
    const nameWrap = contentEl.createDiv({ cls: "tg-editor-modal-field" });
    nameWrap.createEl("label", { text: "Template name" });
    const name = nameWrap.createEl("input", { type: "text", placeholder: "e.g. Research Note" });
    const bodyWrap = contentEl.createDiv({ cls: "tg-editor-modal-field" });
    bodyWrap.createEl("label", { text: "Template content (Markdown)" });
    const body = bodyWrap.createEl("textarea", { attr: { rows: "13" } });
    body.value = this.initialContent || "# {{title}}\n\n**Date:** {{date}}\n\n## Notes\n\n";
    const actions = contentEl.createDiv({ cls: "tg-editor-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel", cls: "tg-course-btn tg-course-btn-muted" });
    cancel.addEventListener("click", () => this.close());
    const save = actions.createEl("button", { text: "Save template", cls: "tg-course-btn tg-course-btn-primary" });
    save.addEventListener("click", async () => {
      const title = name.value.trim();
      if (!title) {
        new Notice("Enter a template name.");
        name.focus();
        return;
      }
      try {
        await this.plugin.saveWritingTemplate(title, body.value);
        new Notice(`Template "${title}" saved.`);
        this.onSaved?.();
        this.close();
      } catch (error) {
        new Notice(`Could not save template: ${error.message || error}`);
      }
    });
    name.focus();
  }

  onClose() {
    this.contentEl.empty();
  }
}

class TimeGardenTemplateModal extends Modal {
  constructor(app, plugin, editor) {
    super(app);
    this.plugin = plugin;
    this.editor = editor;
    this.templates = [];
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-editor-modal", "tg-template-picker-modal");
    contentEl.createEl("h2", { text: "Writing templates" });
    contentEl.createEl("p", { text: "Choose a ready-made structure or create and save your own reusable template." });
    this.select = contentEl.createEl("select", { cls: "tg-template-select" });
    this.preview = contentEl.createEl("pre", { cls: "tg-template-preview" });
    const actions = contentEl.createDiv({ cls: "tg-editor-modal-actions tg-template-actions" });
    const create = actions.createEl("button", { text: "New template", cls: "tg-course-btn tg-course-btn-muted" });
    create.addEventListener("click", () => {
      const selected = this.editor.getSelection();
      new TimeGardenTemplateCreateModal(this.app, this.plugin, selected, () => this.refreshTemplates()).open();
    });
    const saveCurrent = actions.createEl("button", { text: "Save current text", cls: "tg-course-btn tg-course-btn-muted" });
    saveCurrent.addEventListener("click", () => {
      const selected = this.editor.getSelection();
      const content = selected || this.editor.getValue();
      new TimeGardenTemplateCreateModal(this.app, this.plugin, content, () => this.refreshTemplates()).open();
    });
    const cancel = actions.createEl("button", { text: "Close", cls: "tg-course-btn tg-course-btn-muted" });
    cancel.addEventListener("click", () => this.close());
    const insert = actions.createEl("button", { text: "Insert template", cls: "tg-course-btn tg-course-btn-primary" });
    insert.addEventListener("click", () => {
      const template = this.templates[this.select.selectedIndex];
      if (!template) return;
      this.editor.replaceSelection(this.plugin.renderWritingTemplate(template.content, this.editor));
      this.editor.focus();
      this.close();
    });
    this.select.addEventListener("change", () => this.updatePreview());
    await this.refreshTemplates();
  }

  async refreshTemplates() {
    this.templates = await this.plugin.getWritingTemplates();
    this.select.empty();
    this.templates.forEach(template => {
      const option = this.select.createEl("option", {
        value: template.id,
        text: `${template.custom ? "Custom · " : ""}${template.name}`
      });
    });
    this.updatePreview();
  }

  updatePreview() {
    const template = this.templates[this.select.selectedIndex];
    this.preview.textContent = template?.content || "No template selected.";
  }

  onClose() {
    this.contentEl.empty();
  }
}

class TimeGardenTextStyleModal extends Modal {
  constructor(app, editor, mode) {
    super(app);
    this.editor = editor;
    this.mode = mode;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-editor-modal");
    const config = {
      size: { title: "Change text size", label: "Font size" },
      color: { title: "Change text color", label: "Text color" },
      background: { title: "Highlight text background", label: "Background color" }
    }[this.mode];
    contentEl.createEl("h2", { text: config.title });
    const wrap = contentEl.createDiv({ cls: "tg-editor-modal-field" });
    wrap.createEl("label", { text: config.label });
    let value;
    if (this.mode === "size") {
      value = wrap.createEl("select");
      [12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 42, 48].forEach(size => {
        value.createEl("option", { value: `${size}px`, text: `${size} px` });
      });
      value.value = "20px";
    } else {
      value = wrap.createEl("input", { type: "color" });
      value.value = this.mode === "color" ? "#d7b45a" : "#fff0a8";
    }
    const preview = contentEl.createDiv({ cls: "tg-text-style-preview", text: "Preview · Your selected text" });
    const update = () => {
      if (this.mode === "size") preview.style.fontSize = value.value;
      if (this.mode === "color") preview.style.color = value.value;
      if (this.mode === "background") preview.style.backgroundColor = value.value;
    };
    value.addEventListener("input", update);
    update();
    const actions = contentEl.createDiv({ cls: "tg-editor-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel", cls: "tg-course-btn tg-course-btn-muted" });
    cancel.addEventListener("click", () => this.close());
    const apply = actions.createEl("button", { text: "Apply to selection", cls: "tg-course-btn tg-course-btn-primary" });
    apply.addEventListener("click", () => {
      const css = this.mode === "size"
        ? `font-size:${value.value}`
        : this.mode === "color"
          ? `color:${value.value}`
          : `background-color:${value.value};padding:0 3px;border-radius:3px`;
      const selected = this.editor.getSelection();
      const placeholder = this.mode === "size" ? "Text in this size" : "Colored text";
      const text = selected || placeholder;
      this.editor.replaceSelection(`<span style="${css};">${text}</span>`);
      if (!selected) {
        const cursor = this.editor.getCursor();
        const end = { line: cursor.line, ch: Math.max(0, cursor.ch - 7) };
        const start = { line: end.line, ch: Math.max(0, end.ch - placeholder.length) };
        this.editor.setSelection(start, end);
      }
      this.editor.focus();
      this.close();
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

class TimeGardenCodeBlockModal extends Modal {
  constructor(app, editor, plugin) {
    super(app);
    this.editor = editor;
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tg-editor-modal", "tg-code-block-modal");
    contentEl.createEl("h2", { text: "Insert a code block" });
    contentEl.createEl("p", { text: "Choose the language to enable syntax highlighting in Obsidian. You can paste code copied from ChatGPT into the editor below." });
    const langWrap = contentEl.createDiv({ cls: "tg-editor-modal-field" });
    langWrap.createEl("label", { text: "Programming language" });
    const language = langWrap.createEl("select");
    const languages = [
      ["auto", "Auto detect"], ["text", "Plain text"], ["python", "Python"], ["sql", "SQL"],
      ["javascript", "JavaScript"], ["typescript", "TypeScript"], ["html", "HTML"], ["css", "CSS"],
      ["json", "JSON"], ["yaml", "YAML"], ["bash", "Bash"], ["powershell", "PowerShell"],
      ["go", "Go"], ["rust", "Rust"], ["java", "Java"], ["csharp", "C#"], ["cpp", "C++"],
      ["c", "C"], ["php", "PHP"], ["ruby", "Ruby"], ["r", "R"], ["matlab", "MATLAB"],
      ["xml", "XML"], ["markdown", "Markdown"], ["dockerfile", "Dockerfile"]
    ];
    languages.forEach(([value, label]) => language.createEl("option", { value, text: label }));
    const codeWrap = contentEl.createDiv({ cls: "tg-editor-modal-field" });
    codeWrap.createEl("label", { text: "Code" });
    const code = codeWrap.createEl("textarea", { attr: { rows: "12", spellcheck: "false" } });
    code.value = this.editor.getSelection() || "";
    code.placeholder = "Paste your code here…";
    const actions = contentEl.createDiv({ cls: "tg-editor-modal-actions" });
    const paste = actions.createEl("button", { text: "Paste from clipboard", cls: "tg-course-btn tg-course-btn-muted" });
    paste.addEventListener("click", async () => {
      try {
        code.value = await navigator.clipboard.readText();
        code.focus();
      } catch {
        new Notice("Clipboard access was blocked. Click inside the code box and press Ctrl+V.");
        code.focus();
      }
    });
    const cancel = actions.createEl("button", { text: "Cancel", cls: "tg-course-btn tg-course-btn-muted" });
    cancel.addEventListener("click", () => this.close());
    const insert = actions.createEl("button", { text: "Insert code", cls: "tg-course-btn tg-course-btn-primary" });
    insert.addEventListener("click", () => {
      const source = code.value.replace(/\s+$/, "");
      if (!source) {
        new Notice("Paste or enter code first.");
        code.focus();
        return;
      }
      const lang = language.value === "auto" ? this.plugin.detectCodeLanguage(source) : language.value;
      this.editor.replaceSelection(`\n\`\`\`${lang}\n${source}\n\`\`\`\n`);
      this.editor.focus();
      this.close();
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}



// Native Canvas and optional integrations, accessible even when third-party plugins
// have not been installed. No fake plugin controls: only commands actually exposed
// by the installed plugin are offered.
class TimeGardenWritingIntegrationsModal extends Modal {
  constructor(app, plugin, view, kind) {
    super(app); this.plugin = plugin; this.view = view; this.kind = kind;
  }
  onOpen() {
    const root = this.contentEl;
    root.empty(); root.addClass("tg-lifora-integration-modal");
    this.modalEl?.addClass?.("tg-lifora-integration-dialog");
    const names = { canvas: "Canvas · Visual Workspace", tasknotes: "TaskNotes · Tasks", toolbar: "Editing Toolbar · Tools" };
    root.createDiv({ cls: "tg-courses-eyebrow", text: "LIFORA / NOTE INTEGRATIONS" });
    root.createEl("h2", { text: names[this.kind] || "Integration" });
    const actions = root.createDiv({ cls: "tg-lifora-drawing-action-grid" });
    const add = (icon, label, note, fn) => {
      const button = actions.createEl("button", { cls: "tg-lifora-drawing-action", attr: { type: "button" } });
      setIcon(button.createSpan({ cls: "tg-lifora-drawing-action-icon" }), icon);
      const words = button.createSpan({ cls: "tg-lifora-drawing-action-text" });
      words.createEl("strong", { text: label }); words.createSpan({ text: note });
      button.addEventListener("click", () => {
        this.close();
        Promise.resolve().then(fn).catch(error => {
          console.error("LIFORA integration action failed", error);
          new Notice(`Could not complete action: ${error?.message || "unknown error"}`);
        });
      });
    };
    const editor = this.view?.editor;
    if (this.kind === "canvas") {
      add("plus", "New Canvas", "Create a native Obsidian .canvas file and open the full Canvas editor", () => this.plugin.createLiforaCanvas(this.view));
      add("folder-open", "Open existing Canvas", "Select an existing .canvas file from the Vault", () => this.plugin.openLiforaCanvasPicker(this.view, false));
      add("file-plus", "Embed Canvas in note", "Insert a link to the actual interactive .canvas file", () => this.plugin.openLiforaCanvasPicker(this.view, true));
      add("image-plus", "Insert Canvas as IMAGE", "Export a Canvas to PNG on desktop, then choose that image for your note", () => {
        new Notice("In Canvas: More options → Export as image → PNG. Then select the exported PNG here.", 8500);
        this.plugin.openEditorImagePicker(editor);
      });
      const loaded=Boolean(this.app.plugins?.plugins?.["advanced-canvas"]);
      if(loaded) add("workflow","Advanced Canvas features","Open actions and every available native Advanced Canvas command",()=>this.plugin.openLiforaPluginCommands(this.view,"advanced-canvas"));
      else root.createEl("p",{cls:"tg-lifora-drawing-info",text:"Canvas works without extra plugins. Advanced Canvas tools appear after its plugin is installed and enabled."});
    } else {
      const id = this.kind === "tasknotes" ? "tasknotes" : "editing-toolbar";
      const loaded = Boolean(this.app.plugins?.plugins?.[id]);
      if (loaded) {
        const available = this.app.commands?.listCommands?.().filter(c => String(c.id || "").startsWith(`${id}:`)) || [];
        if (available.length) for (const command of available.slice(0, 24))
          add("play", command.name || command.id, "Run the installed plugin's own command", () => this.app.commands.executeCommandById(command.id));
        else root.createEl("p", { cls: "tg-lifora-drawing-info", text: "The plugin is enabled, but it has no public commands. Open its own settings or native toolbar." });
      } else root.createEl("p", { cls: "tg-lifora-drawing-info", text: `${id} is not enabled on this device. LIFORA will not show non-working tools.` });
      add("plug-zap", "Plugin Setup", "See installation and activation status without changing your note", () => this.plugin.openLiforaPluginSetup());
    }
  }
  onClose() { this.contentEl.empty(); }
}

class TimeGardenCanvasPickerModal extends Modal {
  constructor(app, plugin, view, embed) { super(app); this.plugin=plugin; this.view=view; this.embed=embed; }
  onOpen() {
    const root=this.contentEl; root.empty(); root.addClass("tg-lifora-integration-modal", "tg-canvas-picker-modal");
    this.modalEl?.addClass?.("tg-canvas-picker-dialog");
    root.createDiv({ cls: "tg-courses-eyebrow", text: "LIFORA / CANVAS LIBRARY" });
    root.createEl("h2", { text: this.embed ? "Embed a Canvas" : "Open a Canvas" });
    root.createEl("p", { cls: "tg-canvas-picker-intro", text: "Choose a Canvas from your Vault." });
    const searchWrap = root.createDiv({ cls: "tg-canvas-picker-search" });
    setIcon(searchWrap.createSpan(), "search");
    const filter=searchWrap.createEl("input", { attr:{ type:"search",placeholder:"Search Canvas files", "aria-label": "Search Canvas files" } });
    const list=root.createDiv({ cls:"tg-canvas-picker-list" });
    const render=()=>{
      list.empty();
      const files=this.app.vault.getFiles().filter(f=>f.extension?.toLowerCase()==="canvas" && f.path.toLowerCase().includes(filter.value.toLowerCase()));
      if(!files.length) {
        const empty = list.createDiv({ cls: "tg-canvas-picker-empty" });
        setIcon(empty.createSpan(), "layout-dashboard");
        empty.createEl("strong", { text: "No Canvas files found" });
        empty.createSpan({ text: "Create a Canvas first, then it will appear here." });
      }
      for(const file of files.slice(0,80)){
        const button=list.createEl("button", { cls:"tg-lifora-canvas-choice", attr:{type:"button", "aria-label": `Open ${file.basename}`} });
        const icon = button.createSpan({ cls: "tg-canvas-picker-icon" });
        setIcon(icon, "layout-dashboard");
        const copy = button.createSpan({ cls: "tg-canvas-picker-copy" });
        copy.createEl("strong", { text: file.basename });
        copy.createSpan({ text: file.parent?.path ? file.parent.path : "Vault root" });
        const arrow = button.createSpan({ cls: "tg-canvas-picker-arrow" });
        setIcon(arrow, "arrow-up-right");
        button.addEventListener("click",()=>{
          this.close();
          if(this.embed){
            const note=this.view?.file;
            if(!(note instanceof TFile) || !this.view.editor){new Notice("Open a Markdown note in Edit mode first."); return;}
            const link=this.app.metadataCache.fileToLinktext(file,note.path,true);
            this.view.editor.replaceSelection(`\n![[${link}]]\n`);
            new Notice("Canvas embedded. For a still PNG image use the Canvas export option.");
          }else this.app.workspace.openLinkText(file.path,"",true);
        });
      }
    };
    filter.addEventListener("input", render);render();
  }
  onClose(){ this.contentEl.empty(); }
}

// v2.10.5: one shortcut per installed community plugin, all publicly registered commands.
// Dedicated icons retain stable meaning even when a plugin has no icon in its manifest.
const LIFORA_PLUGIN_TOOL_ICONS = Object.freeze({
  "obsidian-excalidraw-plugin": "pencil-ruler", "advanced-canvas": "workflow",
  "tasknotes": "list-todo", "editing-toolbar": "panels-top-left",
  "iconic": "shapes", "obsidian-charts": "chart-column", "obsidian-contextual-typography": "type",
  "dataview": "database", "oz-image-plugin": "image", "journals": "calendar-days",
  "obsidian-meta-bind-plugin": "sliders-horizontal", "url-into-selection": "link",
  "obsidian-smart-typography": "text-cursor-input", "obsidian-style-settings": "palette",
  "obsidian-tracker": "chart-no-axes-combined", "cmdr": "command",
  "pexels-banner": "image", "templater-obsidian": "file-code-2",
  "obsidian42-brat": "package-plus", "callout-manager": "message-square-text",
  "time-garden-plugin": "flower-2"
});
function liforaGetRegisteredCommands(app, pluginId) {
  const commands = typeof app.commands?.listCommands === "function"
    ? app.commands.listCommands() : Object.values(app.commands?.commands || {});
  const prefix = String(pluginId || "") + ":";
  return (Array.isArray(commands) ? commands : []).filter(command =>
    command && typeof command.id === "string" && command.id.startsWith(prefix))
    .sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
}
function liforaGetCommunityPluginItems(app) {
  const manifests = app.plugins?.manifests || {};
  const running = app.plugins?.plugins || {};
  const featured = new Set(["obsidian-excalidraw-plugin", "advanced-canvas", "tasknotes", "editing-toolbar", "time-garden-navigator"]);
  const ids = new Set([...Object.keys(manifests), ...Object.keys(running)]);
  return [...ids].filter(id => !featured.has(id))
    .map(id => ({ id, name: String(manifests[id]?.name || id),
      icon: LIFORA_PLUGIN_TOOL_ICONS[id] || "blocks", installed: Boolean(manifests[id] || running[id]),
      active: Boolean(running[id]), commands: liforaGetRegisteredCommands(app, id) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// v2.10.8: these *note-useful* plugins can surface their registered commands
// during Markdown editing. All other Community Plugins remain in Plugin Setup.
const LIFORA_NOTE_PLUGIN_IDS = Object.freeze([
  "templater-obsidian", "obsidian-charts", "obsidian-meta-bind-plugin",
  "url-into-selection", "callout-manager", "oz-image-plugin", "dataview"
]);
function liforaGetNotePluginShortcuts(app) {
  const manifests = app.plugins?.manifests || {};
  const active = app.plugins?.plugins || {};
  return LIFORA_NOTE_PLUGIN_IDS.filter(id => Boolean(active[id]) && Boolean(manifests[id] || active[id]))
    .map(id => ({ id, name: String(manifests[id]?.name || id),
      icon: LIFORA_PLUGIN_TOOL_ICONS[id] || "wrench",
      commands: liforaGetRegisteredCommands(app,id) }))
    .filter(item => item.commands.length > 0); // never create an empty or misleading icon
}

class TimeGardenPluginCommandsModal extends Modal {
  constructor(app, plugin, view, pluginId) {
    super(app); this.lifora=plugin; this.view=view; this.pluginId=pluginId;
  }
  onOpen() {
    const root=this.contentEl;
    root.empty();root.addClass("tg-lifora-plugin-commands-modal", "tg-lifora-feature-hub");
    this.modalEl?.addClass?.("tg-lifora-plugin-commands-dialog");
    const manifest=this.app.plugins?.manifests?.[this.pluginId];
    const active=Boolean(this.app.plugins?.plugins?.[this.pluginId]);
    const name=manifest?.name || ({"advanced-canvas":"Advanced Canvas","tasknotes":"TaskNotes","editing-toolbar":"Editing Toolbar"}[this.pluginId] || this.pluginId);
    root.createDiv({cls:"tg-courses-eyebrow",text:"LIFORA / NOTE PLUGIN FEATURES"});
    const head=root.createDiv({cls:"tg-lifora-plugin-commands-head"});
    setIcon(head.createSpan({cls:"tg-lifora-plugin-commands-icon"}),LIFORA_PLUGIN_TOOL_ICONS[this.pluginId]||"wrench");
    head.createEl("h2",{text:name});
    const commands=active?liforaGetRegisteredCommands(this.app,this.pluginId):[];
    const launch=fn=>{this.close();Promise.resolve().then(fn).catch(err=>{console.error("LIFORA plugin feature failed",err);new Notice(`Could not perform action: ${err?.message || "unknown error"}`);});};
    const actions=root.createDiv({cls:"tg-lifora-drawing-action-grid tg-lifora-note-feature-grid"});
    const add=(icon,title,desc,fn)=>{
      const btn=actions.createEl("button",{cls:"tg-lifora-drawing-action",attr:{type:"button",title}});
      setIcon(btn.createSpan({cls:"tg-lifora-drawing-action-icon"}),icon);
      const words=btn.createSpan({cls:"tg-lifora-drawing-action-text"});
      words.createEl("strong",{text:title});words.createSpan({text:desc});
      btn.addEventListener("click",()=>launch(fn));
    };
    // Advanced Canvas is mainly an editor enhancement: opening an actual Canvas
    // is more useful than presenting an empty list of public commands.
    if(this.pluginId==="advanced-canvas") {
      add("plus","New Canvas","Create a native Canvas file",()=>this.lifora.createLiforaCanvas(this.view));
      add("folder-open","Open Canvas","Open an existing .canvas file",()=>this.lifora.openLiforaCanvasPicker(this.view,false));
      add("file-plus","Embed Canvas in note","Add a live Canvas link",()=>this.lifora.openLiforaCanvasPicker(this.view,true));
      add("image-plus","Insert Canvas image","Add a Canvas PNG to this note",()=>this.lifora.openEditorImagePicker(this.view?.editor));
    }
    if(this.pluginId==="tasknotes") {
      // TaskNotes exposes its own actions through registered commands when enabled.
      // The native checkbox fallback is explicitly labeled, never disguised as a TaskNotes API.
      const editor=this.view?.editor;
      if(editor) add("list-checks","Insert checklist task","Add a Markdown checklist task",()=>{
        const line=editor.getLine?.(editor.getCursor?.()?.line || 0)||"";
        editor.replaceSelection(line.trim()?"\n- [ ] ":"- [ ] ");editor.focus?.();
      });
    }
    if(this.pluginId==="editing-toolbar") {
      const editor=this.view?.editor;
      if(editor) {
        add("bold","Bold","Format selected note text",()=>{this.lifora.editorWrapSelection(editor,"**","**","bold text");editor.focus?.();});
        add("highlighter","Highlight","Highlight selected note text",()=>{this.lifora.editorWrapSelection(editor,"==","==","highlighted text");editor.focus?.();});
        add("palette","Text color","Open Writing Studio's text color controls",()=>new TimeGardenTextStyleModal(this.app,editor,"color").open());
        add("table","Insert table","Open the editable table insertion tool",()=>new TimeGardenTableInsertModal(this.app,editor).open());
      }
    }
    if(!actions.children.length) actions.remove();
    if(!active) {
      root.createEl("p",{cls:"tg-lifora-drawing-info",text: !manifest
        ? `${name} is not installed yet. Install / enable it to use its native features.`
        : `${name} is currently disabled. Enable it to use its native features.`});
    }
    if(active&&commands.length) {
      root.createEl("h3",{cls:"tg-lifora-feature-subhead",text:`Plugin commands (${commands.length})`});
      const box=root.createDiv({cls:"tg-lifora-plugin-command-search"});setIcon(box.createSpan(),"search");
      const input=box.createEl("input",{attr:{type:"search",placeholder:"Find a plugin feature", "aria-label":"Search plugin features"}});
      const results=root.createDiv({cls:"tg-lifora-plugin-commands-list"});
      const render=()=>{
        results.empty();const query=input.value.trim().toLowerCase();
        const items=commands.filter(c=>!query||(c.name||c.id).toLowerCase().includes(query)||c.id.toLowerCase().includes(query));
        if(!items.length)results.createEl("p",{cls:"tg-lifora-drawing-info",text:"No matching plugin commands."});
        for(const command of items) {
          const btn=results.createEl("button",{cls:"tg-lifora-plugin-command",attr:{type:"button",title:command.name||command.id}});
          setIcon(btn.createSpan({cls:"tg-lifora-plugin-command-icon"}),command.icon||"play");
          const words=btn.createDiv();words.createEl("strong",{text:command.name||command.id});
          btn.addEventListener("click",()=>launch(()=>{
            const ok=this.app.commands?.executeCommandById?.(command.id);
            if(ok===false) new Notice(`This command is not available for the current note: ${command.name||command.id}`);
          }));
        }
      };
      input.addEventListener("input",render);render();
    }else if(active && this.pluginId!=="advanced-canvas" && this.pluginId!=="tasknotes" && this.pluginId!=="editing-toolbar"){
      root.createEl("p",{cls:"tg-lifora-drawing-info",text:"This plugin does not expose note commands in this Obsidian session. Its private editor controls cannot be invoked externally."});
    }else if(active && !commands.length){
      root.createEl("p",{cls:"tg-lifora-drawing-info",text:"More controls are available in the Canvas editor."});
    }
    const footer=root.createDiv({cls:"tg-editor-modal-actions"});
    const setup=footer.createEl("button",{cls:"tg-course-btn tg-course-btn-muted",text:!active?"Install / Enable":"Plugin Settings"});
    setup.addEventListener("click",()=>launch(()=>{
      if(active&&typeof this.app.setting?.openTabById==="function"){
        try {this.app.setting.open();this.app.setting.openTabById(this.pluginId);return;}catch{}
      }this.lifora.openLiforaPluginSetup();
    }));
    const close=footer.createEl("button",{cls:"tg-course-btn tg-course-btn-primary",text:"Done"});
    close.addEventListener("click",()=>this.close());
  }
  onClose(){this.contentEl.empty();}
}

// v2.10.6: The user opted into auto-installing these four allowlisted Community
// Plugins. Installed plugins, their data.json and their enabled/disabled state
// are NEVER changed on startup. No arbitrary plugin ID or remote URL is read
// from note contents, the Vault, settings or plugin metadata.
const LIFORA_RECOMMENDED_PLUGINS = Object.freeze([
  { id: "obsidian-excalidraw-plugin", name: "Excalidraw", repo: "zsviczian/obsidian-excalidraw-plugin", reason: "Editable drawings and Draw & Embed", essential: true, autoEnable: true },
  { id: "advanced-canvas", name: "Advanced Canvas", repo: "Developer-Mike/obsidian-advanced-canvas", reason: "Advanced Obsidian Canvas tools", essential: false, autoEnable: true },
  { id: "tasknotes", name: "TaskNotes", repo: "callumalpass/tasknotes", reason: "Task and calendar integration", essential: false, autoEnable: true },
  { id: "editing-toolbar", name: "Editing Toolbar", repo: "PKM-er/obsidian-editing-toolbar", reason: "Optional Word-style toolbar; LIFORA already includes its own", essential: false, autoEnable: false }
]);

function liforaVerifyInstallerManifest(item, release, manifest, onMobile, checkAppVersion) {
  if (!manifest || typeof manifest !== "object" || manifest.id !== item.id)
    throw new Error(`Unexpected plugin manifest identity for ${item.id}`);
  if (!/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/.test(String(manifest.version || "")))
    throw new Error(`Missing or invalid release version for ${item.id}`);
  if (typeof manifest.minAppVersion !== "string" || !manifest.minAppVersion)
    throw new Error(`Missing Obsidian compatibility requirement for ${item.id}`);
  const tag = String(release?.tag_name || "");
  if (tag !== manifest.version && tag !== `v${manifest.version}`)
    throw new Error(`Release tag / manifest version mismatch for ${item.id}`);
  if (release?.draft || release?.prerelease) throw new Error("Only stable GitHub releases are supported");
  if (onMobile && manifest.isDesktopOnly) return { supported:false, reason:"desktop-only on this device" };
  if (typeof checkAppVersion === "function" && !checkAppVersion(manifest.minAppVersion))
    return { supported:false, reason:`requires Obsidian ${manifest.minAppVersion} or newer` };
  const files = new Set((release?.assets || []).map(asset => asset?.name));
  if (!files.has("main.js") || !files.has("manifest.json"))
    throw new Error("GitHub release lacks the separate main.js and manifest.json assets required by Obsidian");
  return { supported:true };
}

class LiforaAutoPluginInstaller {
  constructor(app, opts = {}) {
    this.app = app;
    this.requestJson = opts.requestJson || (async url => {
      if (typeof requestUrl !== "function") throw new Error("Obsidian network API unavailable");
      const response = await requestUrl({url, method:"GET", headers:{"Accept":"application/vnd.github+json"}});
      if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}`);
      return response.json;
    });
    this.mobile = opts.mobile === undefined ? Boolean(Platform?.isMobile) : opts.mobile;
    this.checkAppVersion = opts.checkAppVersion || requireApiVersion;
  }
  async installOne(item) {
    const app = this.app;
    if (app.plugins?.manifests?.[item.id] || app.plugins?.plugins?.[item.id])
      return {id:item.id, status:"present"};
    // Syncthing might have transferred plugin files since Obsidian enumerated
    // the installed set. Never overwrite partial or unregistered directories.
    const folder = `.obsidian/plugins/${item.id}`;
    if (await app.vault.adapter.exists(folder))
      return {id:item.id, status:"existing-files", reason:"Files exist but Obsidian has not loaded them yet; restart or check Community Plugins"};
    if (typeof app.plugins?.installPlugin !== "function")
      return {id:item.id, status:"unsupported", reason:"Obsidian does not expose the plugin installation method on this device"};
    const url = `https://api.github.com/repos/${item.repo}/releases/latest`;
    const release = await this.requestJson(url);
    if (!release || typeof release.tag_name !== "string" || !/^v?\d+\.\d+\.\d+/.test(release.tag_name))
      throw new Error(`Could not find a stable release for ${item.id}`);
    const manifestAsset = (release.assets || []).find(a => a.name === "manifest.json" &&
      typeof a.browser_download_url === "string" &&
      a.browser_download_url.startsWith(`https://github.com/${item.repo}/releases/download/`));
    const manifestUrl = manifestAsset ? manifestAsset.browser_download_url
      : `https://raw.githubusercontent.com/${item.repo}/${encodeURIComponent(release.tag_name)}/manifest.json`;
    const manifest = await this.requestJson(manifestUrl);
    const support = liforaVerifyInstallerManifest(item, release, manifest, this.mobile, this.checkAppVersion);
    if (!support.supported) return {id:item.id, status:"unsupported", reason:support.reason};
    // Obsidian's own installer handles release assets; no manual manipulation
    // of .obsidian/community-plugins.json or remote scripts takes place here.
    await app.plugins.installPlugin(item.repo, manifest.version, manifest);
    const installed = Boolean(app.plugins?.manifests?.[item.id]) ||
      (await app.vault.adapter.exists(`${folder}/main.js`) &&
       await app.vault.adapter.exists(`${folder}/manifest.json`));
    if (!installed) throw new Error(`Obsidian did not confirm installation for ${item.id}`);
    if (!item.autoEnable) return {id:item.id, status:"installed-disabled", version:manifest.version};
    if (typeof app.plugins.enablePluginAndSave !== "function")
      return {id:item.id, status:"installed-manual-enable", version:manifest.version,
        reason:"Enable this plugin in Community Plugins; this Obsidian version cannot enable it programmatically"};
    try {
      await app.plugins.enablePluginAndSave(item.id);
      return {id:item.id, status:"installed-enabled", version:manifest.version};
    } catch (error) {
      return {id:item.id, status:"installed-manual-enable", version:manifest.version,
        reason:String(error?.message || error)};
    }
  }
  async run(items = LIFORA_RECOMMENDED_PLUGINS) {
    const report = [];
    for (const item of items) {
      try { report.push(await this.installOne(item)); }
      catch (error) {
        console.warn(`LIFORA could not install ${item.name}; original plugin files unchanged.`, error);
        report.push({id:item.id, status:"failed", reason:String(error?.message || error)});
      }
    }
    return report;
  }
}

class TimeGardenPluginSetupModal extends Modal {
  constructor(app, plugin) { super(app); this.lifora = plugin; }
  onOpen() {
    const root = this.contentEl;
    root.empty();
    root.addClass("tg-lifora-plugin-setup");
    root.createEl("h2", { text: "LIFORA · Plugin Setup" });
    root.createEl("p", {
      cls: "tg-lifora-plugin-setup-desc",
      text: "Check optional dependencies. Drawing directly inside a note works without Excalidraw; native Excalidraw drawing commands require its Community Plugin."
    });
    const statuses = root.createDiv({ cls: "tg-lifora-plugin-setup-items" });
    const installed = this.app.plugins?.manifests || {};
    const loaded = this.app.plugins?.plugins || {};
    for (const item of LIFORA_RECOMMENDED_PLUGINS) {
      const card = statuses.createDiv({ cls: "tg-lifora-plugin-setup-item" });
      const words = card.createDiv({ cls: "tg-lifora-plugin-setup-copy" });
      const header = words.createDiv({ cls: "tg-lifora-plugin-setup-head" });
      header.createEl("strong", { text: item.name });
      const state = loaded[item.id] ? "Enabled" : installed[item.id] ? "Installed · disabled" : "Not installed";
      header.createEl("span", { cls: "tg-lifora-plugin-setup-status", text: state });
      words.createEl("span", { text: item.reason });
      const link = card.createEl("a", {
        cls: "tg-course-btn tg-course-btn-muted tg-lifora-plugin-setup-link",
        text: installed[item.id] ? "Manage" : "Install",
        href: `obsidian://show-plugin?id=${encodeURIComponent(item.id)}`
      });
      link.setAttribute("aria-label", `${installed[item.id] ? "Manage" : "Install"} ${item.name} in Obsidian`);
      link.setAttribute("rel", "noopener noreferrer");
    }
    const extra = liforaGetCommunityPluginItems(this.app);
    if (extra.length) {
      root.createEl("h3", { text:"Other installed plugins" });
      const group = root.createDiv({ cls:"tg-lifora-plugin-setup-others" });
      for (const item of extra) {
        const line = group.createDiv({ cls:"tg-lifora-plugin-setup-other" });
        setIcon(line.createSpan(), item.icon);
        line.createSpan({ text:item.name });
        line.createEl("small", { text:item.active ? `${item.commands.length} commands` : "Disabled" });
      }
    }
    const policy = root.createDiv({cls:"tg-lifora-plugin-setup-policy"});
    const toggle = policy.createEl("label", {cls:"tg-lifora-auto-install-toggle"});
    const input = toggle.createEl("input", {attr:{type:"checkbox", "aria-label":"Automatically install missing plugins when LIFORA starts"}});
    input.checked = this.lifora.liforaAutoInstallEnabled !== false;
    toggle.createSpan({text:"Automatically install missing plugins on startup"});
    input.addEventListener("change", async () => {
      try { await this.lifora.setLiforaAutoInstallEnabled(input.checked); }
      catch (error) { new Notice(`Could not save auto-install preference: ${error?.message || error}`); input.checked = !input.checked; }
    });
    policy.createEl("p", {cls:"tg-lifora-plugin-setup-desc",
      text:"LIFORA installs only missing Excalidraw, Advanced Canvas, TaskNotes and Editing Toolbar from their trusted GitHub releases. Requires internet. Existing plugin folders and preferences are never replaced. Editing Toolbar stays disabled to avoid a second writing toolbar. Desktop-only plugins are skipped on mobile."});
    const last = this.lifora.liforaLastPluginInstallReport || [];
    if (last.length) {
      const results = policy.createDiv({cls:"tg-lifora-auto-install-results"});
      for (const result of last) {
        const name = LIFORA_RECOMMENDED_PLUGINS.find(item=>item.id===result.id)?.name || result.id;
        results.createDiv({text:`${name}: ${result.status}${result.reason ? ` — ${result.reason}` : ""}`});
      }
    }
    const foot = root.createDiv({ cls: "tg-editor-modal-actions" });
    const install = foot.createEl("button", { cls:"tg-course-btn tg-course-btn-primary", text:"Install Missing Now" });
    install.addEventListener("click", async () => {
      install.disabled=true;install.setText("Checking plugins…");
      try { await this.lifora.liforaInstallMissingPlugins({manual:true}); }
      catch(error) { new Notice(`Plugin check failed: ${error?.message || error}`); }
      this.onOpen();
    });
    const refresh = foot.createEl("button", { cls: "tg-course-btn tg-course-btn-muted", text: "Refresh status" });
    refresh.addEventListener("click", () => this.onOpen());
    const done = foot.createEl("button", { cls: "tg-course-btn tg-course-btn-muted", text: "Close" });
    done.addEventListener("click", () => this.close());
  }
  onClose() { this.contentEl.empty(); }
}

module.exports = class TimeGardenNavigator extends Plugin {

  async getFolderAppearances() {
    const stored = (await this.loadData()) || {};
    return stored.folderAppearances && typeof stored.folderAppearances === "object"
      ? stored.folderAppearances
      : {};
  }

  async saveFolderAppearance(folderPath, appearance) {
    const data = (await this.loadData()) || {};
    const map = data.folderAppearances && typeof data.folderAppearances === "object"
      ? { ...data.folderAppearances }
      : {};
    if (!appearance || !Object.values(appearance).some(Boolean)) delete map[folderPath];
    else map[folderPath] = appearance;
    data.folderAppearances = map;
    await this.saveData(data);
    this.folderAppearancesCache = map;
    this.applyExplorerPresentation();
  }

  installFolderAppearanceControls() {
    this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => {
      if (!(file instanceof TFolder)) return;
      menu.addItem(item => item
        .setTitle("Customize folder colors")
        .setIcon("palette")
        .onClick(() => new TimeGardenFolderAppearanceModal(this.app, this, file.path).open()));
    }));

    this.addCommand({
      id: "customize-folder-appearance",
      name: "LIFORA: Customize selected folder colors",
      icon: "palette",
      callback: () => {
        const file = this.app.workspace.getActiveFile();
        const folder = file instanceof TFolder ? file : file?.parent;
        if (!(folder instanceof TFolder)) {
          new Notice("Open a note inside the folder, or right-click a folder in the File Explorer.");
          return;
        }
        new TimeGardenFolderAppearanceModal(this.app, this, folder.path).open();
      }
    });

    this.registerEvent(this.app.vault.on("rename", async (file, oldPath) => {
      if (!(file instanceof TFolder) || !oldPath) return;
      const map = { ...(this.folderAppearancesCache || await this.getFolderAppearances()) };
      const next = {};
      for (const [path, value] of Object.entries(map)) {
        if (path === oldPath) next[file.path] = value;
        else if (path.startsWith(`${oldPath}/`)) next[`${file.path}${path.slice(oldPath.length)}`] = value;
        else next[path] = value;
      }
      const data = (await this.loadData()) || {};
      data.folderAppearances = next;
      await this.saveData(data);
      this.folderAppearancesCache = next;
      this.applyExplorerPresentation();
    }));

    this.registerEvent(this.app.vault.on("delete", async file => {
      if (!(file instanceof TFolder)) return;
      const map = { ...(this.folderAppearancesCache || await this.getFolderAppearances()) };
      for (const path of Object.keys(map)) {
        if (path === file.path || path.startsWith(`${file.path}/`)) delete map[path];
      }
      const data = (await this.loadData()) || {};
      data.folderAppearances = map;
      await this.saveData(data);
      this.folderAppearancesCache = map;
    }));
  }

  applyFolderAppearances(root = this.app.workspace.containerEl || document) {
    const map = this.folderAppearancesCache || {};
    for (const folder of root.querySelectorAll(".nav-folder")) {
      const titleNode = folder.querySelector(".nav-folder-title");
      const path = this.getExplorerItemPath(folder) || this.getExplorerItemPath(titleNode);
      if (!path) continue;
      const appearance = map[path];
      const titleContent = titleNode?.querySelector(".nav-folder-title-content");
      const children = Array.from(folder.children).find(child => child.classList?.contains("nav-folder-children"));

      if (!appearance) {
        titleNode?.style.removeProperty("background-color");
        titleNode?.style.removeProperty("border-radius");
        titleNode?.style.removeProperty("border-inline-start");
        titleContent?.style.removeProperty("color");
        children?.style.removeProperty("background-color");
        folder.classList.remove("tg-folder-has-custom-appearance");
        continue;
      }

      folder.classList.add("tg-folder-has-custom-appearance");
      if (appearance.backgroundColor) {
        titleNode?.style.setProperty("background-color", appearance.backgroundColor, "important");
        children?.style.setProperty(
          "background-color",
          `color-mix(in srgb, ${appearance.backgroundColor} 9%, transparent)`,
          "important"
        );
      } else {
        titleNode?.style.removeProperty("background-color");
        children?.style.removeProperty("background-color");
      }
      if (appearance.textColor) titleContent?.style.setProperty("color", appearance.textColor, "important");
      else titleContent?.style.removeProperty("color");
      if (appearance.accentColor) titleNode?.style.setProperty("border-inline-start", `3px solid ${appearance.accentColor}`);
      else titleNode?.style.removeProperty("border-inline-start");
      titleNode?.style.setProperty("border-radius", "8px");
    }
  }

  getBuiltInWritingTemplates() {
    return [
      {
        id: "builtin-study",
        name: "Study Notes",
        custom: false,
        content: "# {{title}}\n\n**Date:** {{date}}\n\n## Learning objectives\n- \n\n## Main concepts\n\n## Explanation\n\n## Examples\n\n## Questions to revisit\n- [ ] \n\n## Summary\n"
      },
      {
        id: "builtin-research",
        name: "Research Note",
        custom: false,
        content: "# {{title}}\n\n**Date:** {{date}}\n**Source:** \n\n## Research question\n\n## Key findings\n\n## Evidence and quotations\n\n## My analysis\n\n## Limitations / open questions\n\n## References\n"
      },
      {
        id: "builtin-meeting",
        name: "Meeting Notes",
        custom: false,
        content: "# {{title}}\n\n**Date:** {{date}} · **Time:** {{time}}\n**Attendees:** \n\n## Agenda\n1. \n\n## Discussion\n\n## Decisions\n- \n\n## Action items\n- [ ] Task — Owner — Due date\n"
      },
      {
        id: "builtin-project",
        name: "Project Brief",
        custom: false,
        content: "# {{title}}\n\n**Created:** {{date}}\n**Status:** Planning\n\n## Objective\n\n## Scope\n\n## Requirements\n- \n\n## Milestones\n- [ ] \n\n## Risks and assumptions\n\n## Next actions\n- [ ] \n"
      },
      {
        id: "builtin-reading",
        name: "Reading Notes",
        custom: false,
        content: "# {{title}}\n\n**Date:** {{date}}\n**Book / source:** \n**Pages:** \n\n## Main idea\n\n## Important passages\n\n## Concepts to remember\n\n## My reflections\n\n## Questions\n"
      },
      {
        id: "builtin-idea",
        name: "Idea Capture",
        custom: false,
        content: "# {{title}}\n\n**Captured:** {{date}} · {{time}}\n\n## The idea\n\n## Why it matters\n\n## Possible applications\n\n## First small step\n- [ ] \n"
      },
      {
        id: "builtin-language",
        name: "Language Practice",
        custom: false,
        content: "# {{title}}\n\n**Date:** {{date}}\n**Language / Level:** \n\n## New vocabulary\n| Word | Meaning | Example |\n|---|---|---|\n| | | |\n\n## Grammar point\n\n## Writing practice\n\n## Speaking prompts\n\n## Review\n- [ ] \n"
      },
      {
        id: "builtin-daily",
        name: "Reflection",
        custom: false,
        content: "# {{title}}\n\n**Date:** {{date}}\n\n## What happened today?\n\n## What went well?\n\n## What could improve?\n\n## What I learned\n\n## Gratitude\n- \n\n## Tomorrow's priority\n- [ ] \n"
      }
    ];
  }

  async getWritingTemplates() {
    const root = "06 Templates/Writing Studio";
    const builtIns = this.getBuiltInWritingTemplates();
    const files = this.app.vault.getMarkdownFiles()
      .filter(file => file.path.startsWith(`${root}/`))
      .sort((a, b) => a.basename.localeCompare(b.basename));
    const custom = [];
    for (const file of files) {
      custom.push({
        id: file.path,
        name: file.basename,
        custom: true,
        path: file.path,
        content: await this.app.vault.cachedRead(file)
      });
    }
    return [...builtIns, ...custom];
  }

  async saveWritingTemplate(name, content) {
    const root = "06 Templates/Writing Studio";
    await this.ensureFolder(root);
    const safe = String(name).trim().replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ");
    if (!safe) throw new Error("Template name is empty.");
    let path = `${root}/${safe}.md`;
    let suffix = 2;
    while (this.app.vault.getAbstractFileByPath(path)) path = `${root}/${safe} (${suffix++}).md`;
    await this.app.vault.create(path, String(content || ""));
    return path;
  }

  renderWritingTemplate(content, editor) {
    const file = this.app.workspace.getActiveFile();
    const now = new Date();
    return String(content || "")
      .replace(/\{\{title\}\}/g, file?.basename || "New Note")
      .replace(/\{\{date\}\}/g, now.toLocaleDateString("en-GB"))
      .replace(/\{\{time\}\}/g, now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  }

  detectCodeLanguage(source) {
    const code = String(source || "").trim();
    if (!code) return "text";
    if (/^\s*#!/.test(code) && /bash|sh/.test(code.slice(0, 100))) return "bash";
    if (/^\s*(SELECT|WITH|INSERT\s+INTO|UPDATE\s+\w+\s+SET|CREATE\s+TABLE)\b/i.test(code)) return "sql";
    if (/^\s*(import\s+\w+|from\s+\w+\s+import|def\s+\w+\s*\(|class\s+\w+\s*[:(]|print\s*\()/m.test(code)) return "python";
    if (/<!doctype\s+html|<html[\s>]|<body[\s>]/i.test(code)) return "html";
    if (/^\s*\{[\s\S]*\}\s*$/.test(code) && /"\w+"\s*:/.test(code)) return "json";
    if (/\b(const|let|var)\s+\w+|=>|console\.log\s*\(/.test(code)) return "javascript";
    if (/\binterface\s+\w+|\btype\s+\w+\s*=|:\s*(string|number|boolean)\b/.test(code)) return "typescript";
    if (/^\s*package\s+main\b|\bfunc\s+\w+\s*\(/m.test(code)) return "go";
    if (/^\s*using\s+System;|\bnamespace\s+\w+/m.test(code)) return "csharp";
    if (/^\s*<\?php/m.test(code)) return "php";
    if (/^\s*\$[\w_]+\s*=|^\s*(Get|Set|New|Write|Import|Export)-[A-Z]/m.test(code)) return "powershell";
    if (/^\s*function\s+\w+\s*\(/m.test(code)) return "javascript";
    if (/^\s*FROM\s+\w+|^\s*RUN\s+|^\s*WORKDIR\s+/m.test(code)) return "dockerfile";
    if (/^\s*<\?xml|<svg[\s>]/i.test(code)) return "xml";
    if (/^\s*\.[\w-]+\s*\{|#[\w-]+\s*\{/m.test(code)) return "css";
    return "text";
  }

  attachRichPasteHandler(view) {
    const content = view?.contentEl?.querySelector(".cm-content");
    if (!content || content.dataset.tgRichPaste === "true") return;
    const handler = event => {
      const html = event.clipboardData?.getData("text/html");
      const plain = event.clipboardData?.getData("text/plain") || "";
      if (!html || !plain) return;
      const markdown = this.htmlClipboardToMarkdown(html);
      if (!markdown || markdown.trim() === plain.trim()) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      view.editor?.replaceSelection(markdown);
      view.editor?.focus();
    };
    content.dataset.tgRichPaste = "true";
    content.addEventListener("paste", handler, true);
    this.register(() => {
      content.removeEventListener("paste", handler, true);
      delete content.dataset.tgRichPaste;
    });
  }

  htmlClipboardToMarkdown(html) {
    if (typeof DOMParser === "undefined") return "";
    const documentCopy = new DOMParser().parseFromString(html, "text/html");
    const root = documentCopy.body;
    const languageFrom = node => {
      const codeNode = node.querySelector?.("code") || node;
      const classText = `${node.className || ""} ${codeNode.className || ""}`;
      const dataLanguage = codeNode.getAttribute?.("data-language") ||
        codeNode.getAttribute?.("data-lang") ||
        node.getAttribute?.("data-language") ||
        node.getAttribute?.("data-lang") || "";
      const match = `${classText} ${dataLanguage}`.match(/(?:language-|lang[-=])([a-z0-9+#-]+)/i);
      return match?.[1]?.toLowerCase() || "";
    };
    const inline = node => {
      if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      const tag = node.tagName.toLowerCase();
      if (tag === "br") return "\n";
      if (tag === "img") {
        const src = node.getAttribute("src") || "";
        const alt = node.getAttribute("alt") || "Image";
        return src ? `![${alt}](${src})` : "";
      }
      const content = Array.from(node.childNodes).map(inline).join("");
      if (tag === "strong" || tag === "b") return `**${content}**`;
      if (tag === "em" || tag === "i") return `*${content}*`;
      if (tag === "s" || tag === "strike" || tag === "del") return `~~${content}~~`;
      if (tag === "u") return `<u>${content}</u>`;
      if (tag === "code") return `\`${content.replace(/`/g, "\\`")}\``;
      if (tag === "a") {
        const href = node.getAttribute("href") || "";
        return href ? `[${content || href}](${href})` : content;
      }
      if (tag === "span") {
        const style = node.style;
        const allowed = [];
        if (style.color && /^(#[0-9a-f]{3,8}|rgb|hsl|[a-z]+)/i.test(style.color)) allowed.push(`color:${style.color}`);
        if (style.backgroundColor && /^(#[0-9a-f]{3,8}|rgb|hsl|[a-z]+)/i.test(style.backgroundColor)) allowed.push(`background-color:${style.backgroundColor}`);
        if (style.fontSize && /^[0-9.]+(px|pt|em|rem|%)$/.test(style.fontSize)) allowed.push(`font-size:${style.fontSize}`);
        return allowed.length ? `<span style="${allowed.join(";")}">${content}</span>` : content;
      }
      return content;
    };
    const block = node => {
      if (node.nodeType === Node.TEXT_NODE) return node.nodeValue?.trim() || "";
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      const tag = node.tagName.toLowerCase();
      if (tag === "pre") {
        const codeNode = node.querySelector("code") || node;
        const source = codeNode.textContent.replace(/\n+$/, "");
        const language = languageFrom(node) || this.detectCodeLanguage(source);
        return `\`\`\`${language}\n${source}\n\`\`\``;
      }
      if (/^h[1-6]$/.test(tag)) return `${"#".repeat(Number(tag[1]))} ${inline(node).trim()}`;
      if (tag === "blockquote") {
        return inline(node).split(/\r?\n/).map(line => `> ${line}`).join("\n");
      }
      if (tag === "ul" || tag === "ol") {
        const items = Array.from(node.children).filter(child => child.tagName?.toLowerCase() === "li");
        return items.map((item, index) => {
          const content = Array.from(item.childNodes).map(child => {
            if (child.nodeType === Node.ELEMENT_NODE && ["ul", "ol"].includes(child.tagName.toLowerCase())) return "";
            return inline(child);
          }).join("").trim();
          const prefix = tag === "ol" ? `${index + 1}. ` : "- ";
          const nested = Array.from(item.children)
            .filter(child => ["ul", "ol"].includes(child.tagName.toLowerCase()))
            .map(block).join("\n");
          return `${prefix}${content}${nested ? `\n${nested.split("\n").map(line => `  ${line}`).join("\n")}` : ""}`;
        }).join("\n");
      }
      if (tag === "table") {
        const rows = Array.from(node.querySelectorAll("tr")).map(row =>
          Array.from(row.children).map(cell => inline(cell).replace(/\|/g, "\\|").trim())
        );
        if (!rows.length) return "";
        const width = Math.max(...rows.map(row => row.length));
        const normalized = rows.map(row => Array.from({ length: width }, (_, i) => row[i] || ""));
        const header = normalized[0];
        const separator = Array.from({ length: width }, () => "---");
        return [header, separator, ...normalized.slice(1)]
          .map(row => `| ${row.join(" | ")} |`).join("\n");
      }
      if (tag === "hr") return "---";
      if (tag === "p") return inline(node).trim();
      if (tag === "div" || tag === "section" || tag === "article" || tag === "main" || tag === "body") {
        const children = Array.from(node.childNodes);
        const hasBlocks = children.some(child => child.nodeType === Node.ELEMENT_NODE &&
          /^(p|div|h[1-6]|pre|ul|ol|blockquote|table|hr|section|article)$/.test(child.tagName.toLowerCase()));
        return hasBlocks ? children.map(block).filter(Boolean).join("\n\n") : inline(node).trim();
      }
      return inline(node).trim();
    };
    return Array.from(root.childNodes).map(block).filter(Boolean).join("\n\n").trim();
  }

  getActiveMarkdownEditor() {
    const leaf = this.app.workspace.activeLeaf;
    const view = leaf?.view;
    if (!view || view.getViewType?.() !== "markdown") return null;
    return view.editor || null;
  }

  // Click an embedded image in a note to reveal a bottom-right drag handle.
  // On release, update the actual Markdown image width; never just modify CSS.
  // If a note contains duplicate embeds of the same file, refuse an ambiguous
  // update rather than change the wrong image: use the precise Resize modal.
  installLiforaLiveImageResize() {
    if (typeof document === "undefined") return;
    let grip = null;
    const clear = () => { grip?.remove(); grip = null; };
    const imageSource = img => {
      let node = img;
      for (let depth = 0; node && depth < 6; depth++, node = node.parentElement) {
        for (const attr of ["data-src", "data-href", "data-path"]) {
          const value = node.getAttribute?.(attr);
          if (value && /\.(png|jpe?g|webp|gif|svg|avif)(?:\||$)/i.test(value)) return value.split("|")[0];
        }
      }
      const alt = img.getAttribute("alt") || "";
      if (/\.(png|jpe?g|webp|gif|svg|avif)$/i.test(alt)) return alt;
      // File app:// URLs are not consistent across platforms; only use them
      // as a last resort and require a unique matching embed in the note.
      try { return decodeURIComponent(img.getAttribute("src") || ""); } catch (_) { return ""; }
    };
    const bestMatch = (view, img) => {
      const source = imageSource(img);
      if (!source || !view?.editor || !view?.file) return null;
      const content = view.editor.getValue();
      const list = [];
      const regex = /!\[\[([^\]]+)\]\]/g;
      let result;
      while ((result = regex.exec(content))) {
        const link = result[1].split("|")[0];
        if (!/\.(png|jpe?g|webp|gif|svg|avif)$/i.test(link)) continue;
        const dest = this.app.metadataCache?.getFirstLinkpathDest?.(link, view.file.path);
        const same = dest?.path === source ||
          source.endsWith("/" + (dest?.path || link)) ||
          source.includes(encodeURIComponent((dest?.path || link).split("/").pop())) ||
          (source === link || source.endsWith("/" + link));
        if (same) list.push({ text: result[0], inner: result[1], offset: result.index });
      }
      return list.length === 1 ? list[0] : null;
    };
    const toPos = (content, offset) => {
      const pre = content.slice(0, offset);
      const line = (pre.match(/\n/g) || []).length;
      const lastNewline = pre.lastIndexOf("\n");
      return { line, ch: offset - lastNewline - 1 };
    };
    const click = event => {
      if (grip && (event.target === grip || grip.contains(event.target))) return;
      clear();
      const img = event.target?.closest?.("img");
      if (!img || img.closest(".tg-lifora-inline-sketch, .modal, .tg-editor-toolbar")) return;
      const leaf = (this.app.workspace?.getLeavesOfType?.("markdown") || []).find(l =>
        l.view?.contentEl?.contains(img));
      const view = leaf?.view;
      if (!view || this.isPresentationDashboardPath(view.file?.path)) return;
      if (!img.closest(".markdown-source-view, .markdown-preview-view")) return;
      const match = bestMatch(view, img);
      if (!match) return; // ambiguous images are handled in the Resize modal
      const box = img.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const element = document.createElement("button");
      element.type = "button";
      element.className = "tg-lifora-image-drag-grip";
      element.setAttribute("title", "Drag to resize this image in the note");
      element.setAttribute("aria-label", "Drag right or left to change image width");
      setIcon(element, "move-diagonal-2");
      document.body.appendChild(element);
      grip = element;
      const reposition = () => {
        if (!element.isConnected || !img.isConnected) { clear(); return; }
        const rect = img.getBoundingClientRect();
        element.style.left = `${Math.round(rect.right - 15)}px`;
        element.style.top = `${Math.round(rect.bottom - 15)}px`;
      };
      reposition();
      element.addEventListener("pointerdown", event => {
        event.preventDefault(); event.stopPropagation();
        const x0 = event.clientX;
        const w0 = Math.round(img.getBoundingClientRect().width);
        const maxWidth = Math.max(240, Math.min(1600, view.contentEl.clientWidth - 36));
        let nextWidth = w0;
        element.setPointerCapture?.(event.pointerId);
        const move = e => {
          if (e.pointerId !== event.pointerId) return;
          nextWidth = Math.max(140, Math.min(maxWidth, Math.round(w0 + (e.clientX - x0))));
          img.style.width = `${nextWidth}px`;
          img.style.maxWidth = "none";
          reposition();
        };
        const finish = e => {
          if (e.pointerId !== event.pointerId) return;
          element.removeEventListener("pointermove", move);
          element.removeEventListener("pointerup", finish);
          element.removeEventListener("pointercancel", finish);
          if (e.type === "pointercancel") { clear(); return; }
          const current = view.editor?.getValue?.() || "";
          const loc = current.indexOf(match.text, match.offset);
          if (loc < 0 || current.indexOf(match.text, loc + match.text.length) >= 0) {
            new Notice("The image reference changed. Use Resize image from the toolbar to avoid editing another image.");
            clear(); return;
          }
          const next = `![[${match.inner.split("|")[0]}|${nextWidth}]]`;
          view.editor.replaceRange(next, toPos(current, loc), toPos(current, loc + match.text.length));
          clear();
          new Notice(`Image width saved: ${nextWidth}px`);
        };
        element.addEventListener("pointermove", move);
        element.addEventListener("pointerup", finish);
        element.addEventListener("pointercancel", finish);
      });
      element.addEventListener("dblclick", () => {
        clear();
        new TimeGardenImageResizeModal(this.app, view.editor, view.file).open();
      });
    };
    this.registerDomEvent(document, "click", click, true);
    this.registerEvent(this.app.workspace.on("layout-change", clear));
    this.register(clear);
  }

  installEditorToolbar() {
    this.installLiforaLiveImageResize();
    this.attachAllEditorToolbars();
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.attachAllEditorToolbars()));
    this.registerEvent(this.app.workspace.on("layout-change", () => this.attachAllEditorToolbars()));
    this.registerEvent(this.app.workspace.on("editor-change", (editor, view) => {
      if (view?.contentEl) {
        const toolbar = view.contentEl.querySelector(".tg-editor-toolbar");
        if (toolbar) this.updateEditorToolbarMeta(toolbar, editor || view.editor);
      }
    }));

    if (typeof MutationObserver !== "undefined" && document.body) {
      this.editorToolbarObserver = new MutationObserver(records => {
        const relevant = records.some(record => {
          const nodes = [...record.addedNodes, ...record.removedNodes];
          return nodes.some(node => node.nodeType === 1 && (
            node.matches?.(".markdown-source-view, .cm-editor, .markdown-preview-view") ||
            node.querySelector?.(".markdown-source-view .cm-editor")
          ));
        });
        if (!relevant || this.editorToolbarQueued) return;
        this.editorToolbarQueued = true;
        window.requestAnimationFrame(() => {
          this.editorToolbarQueued = false;
          this.attachAllEditorToolbars();
        });
      });
      this.editorToolbarObserver.observe(document.body, { childList: true, subtree: true });
      this.register(() => this.editorToolbarObserver?.disconnect());
    }
    this.register(() => {
      document.querySelectorAll(".tg-editor-toolbar").forEach(toolbar => toolbar.remove());
    });
    this.register(() => {
      if (this.editorWordCountItem) this.editorWordCountItem.remove();
    });

    this.editorWordCountItem = this.addStatusBarItem();
    this.editorWordCountItem.addClass("tg-editor-status-count");
    this.editorWordCountItem.setText("Words 0 · 0 chars");
    this.registerEvent(this.app.workspace.on("editor-change", (editor, view) => {
      if (view?.getViewType?.() !== "markdown" || !editor) return;
      const value = editor.getValue();
      const words = (value.match(/[\p{L}\p{N}]+/gu) || []).length;
      this.editorWordCountItem?.setText(`Words ${words.toLocaleString()} · ${value.length.toLocaleString()} chars`);
    }));

    this.addCommand({
      id: "writing-inline-draw-in-note",
      name: "Writing Studio: Draw directly in this note",
      icon: "paintbrush",
      editorCallback: (_editor, view) => this.openLiforaInlineSketch(view)
    });
    this.addCommand({
      id: "writing-excalidraw-create-embed",
      name: "Writing Studio: Create Excalidraw drawing and embed",
      icon: "pencil-ruler",
      editorCallback: (_editor, view) => this.createAndEmbedLiforaExcalidraw(view)
    });
    this.addCommand({
      id: "writing-excalidraw-insert-existing",
      name: "Writing Studio: Insert existing Excalidraw drawing",
      icon: "shapes",
      editorCallback: (editor, view) => this.insertExistingLiforaExcalidraw(editor, view)
    });
    this.addCommand({
      id: "writing-insert-image",
      name: "Writing Studio: Insert image",
      icon: "image-plus",
      editorCallback: editor => this.openEditorImagePicker(editor)
    });
    this.addCommand({
      id: "writing-insert-voice",
      name: "Writing Studio: Record voice note",
      icon: "mic",
      editorCallback: editor => new TimeGardenVoiceRecorderModal(this.app, this, editor).open()
    });
    this.addCommand({
      id: "writing-insert-table",
      name: "Writing Studio: Insert table",
      icon: "table",
      editorCallback: editor => new TimeGardenTableInsertModal(this.app, editor).open()
    });
    this.addCommand({
      id: "writing-insert-template",
      name: "Writing Studio: Insert template",
      icon: "files",
      editorCallback: editor => new TimeGardenTemplateModal(this.app, this, editor).open()
    });
    this.addCommand({
      id: "writing-insert-code-block",
      name: "Writing Studio: Insert highlighted code block",
      icon: "code-xml",
      editorCallback: editor => new TimeGardenCodeBlockModal(this.app, editor, this).open()
    });
    this.addCommand({
      id: "writing-text-size",
      name: "Writing Studio: Change text size",
      icon: "type",
      editorCallback: editor => new TimeGardenTextStyleModal(this.app, editor, "size").open()
    });
    this.addCommand({
      id: "writing-text-color",
      name: "Writing Studio: Change text color",
      icon: "palette",
      editorCallback: editor => new TimeGardenTextStyleModal(this.app, editor, "color").open()
    });
    this.addCommand({
      id: "writing-text-background",
      name: "Writing Studio: Change text background color",
      icon: "paint-bucket",
      editorCallback: editor => new TimeGardenTextStyleModal(this.app, editor, "background").open()
    });
    this.addCommand({
      id: "writing-insert-attachment",
      name: "Writing Studio: Attach a file",
      icon: "paperclip",
      editorCallback: editor => this.openEditorAttachmentPicker(editor)
    });
    this.addCommand({
      id: "writing-resize-image",
      name: "Writing Studio: Resize image at cursor",
      icon: "scaling",
      editorCallback: editor => new TimeGardenImageResizeModal(this.app, editor).open()
    });
    this.addCommand({
      id: "writing-insert-date",
      name: "Writing Studio: Insert current date",
      icon: "calendar-days",
      editorCallback: editor => editor.replaceSelection(new Date().toLocaleDateString("en-GB"))
    });
  }

  async runDashboardRender(host, renderer) {
    if (!host || typeof renderer !== "function") return;
    this.dashboardRenderLocks = this.dashboardRenderLocks || new WeakMap();
    const active = this.dashboardRenderLocks.get(host);
    if (active) {
      try { await active; } catch (_) {}
      return this.runDashboardRender(host, renderer);
    }
    const task = Promise.resolve().then(renderer);
    this.dashboardRenderLocks.set(host, task);
    try {
      return await task;
    } finally {
      if (this.dashboardRenderLocks.get(host) === task) this.dashboardRenderLocks.delete(host);
    }
  }

  clearDashboardRepairTimers() {
    if (typeof window !== "undefined") {
      for (const timer of this.homeRepairTimers || []) window.clearTimeout(timer);
      for (const timer of this.dashboardRepairTimers || []) window.clearTimeout(timer);
    }
    this.homeRepairTimers?.clear();
    this.dashboardRepairTimers?.clear();
  }

  isPresentationDashboardPath(path) {
    if (!path) return false;
    const filename = String(path).split("/").pop().toLowerCase();
    // These are navigation surfaces only. Course / Book / Language dashboards
    // intentionally remain editable because users write directly in those files.
    const presentationPages = new Set([
      "welcome.md", "lifora home.md", "lifora home.md", "lifora hub.md", "reviews home.md",
      "daily journal home.md", "weekly home.md", "templates home.md",
      "knowledge home.md", "courses home.md", "books home.md",
      "quran home.md", "languages home.md",
      "section dashboard.md", "folder dashboard.md"
    ]);
    return presentationPages.has(filename);
  }

  normalizeDashboardView(view) {
    if (!view || view.getViewType?.() !== "markdown" || !view.contentEl) return false;
    if (!this.isPresentationDashboardPath(view.file?.path)) {
      view.contentEl.removeClass?.("tg-system-dashboard-view");
      return false;
    }

    view.contentEl.addClass?.("tg-system-dashboard-view");
    view.contentEl.querySelectorAll(".tg-editor-toolbar").forEach(toolbar => toolbar.remove());

    // Do not call MarkdownView.setMode() here. On some supported Obsidian
    // builds it reaches an internal currentMode.setEphemeralState method that
    // is not available, throwing during Journal -> Home navigation. The file
    // is opened through Obsidian's normal Markdown pipeline; this method only
    // applies presentation styling and never changes the editor mode.
    return true;
  }

  attachAllEditorToolbars() {
    if (!this.app?.workspace) return;
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      if (this.normalizeDashboardView(leaf.view)) continue;
      this.attachEditorToolbar(leaf.view);
    }
  }

  attachEditorToolbar(view) {
    if (!view || view.getViewType?.() !== "markdown" || !view.contentEl) return;
    if (this.normalizeDashboardView(view)) return;
    const sourceView = view.contentEl.querySelector(".markdown-source-view");
    const cmEditor = sourceView?.querySelector(".cm-editor");
    if (!sourceView || !cmEditor || !cmEditor.parentElement) return;
    let toolbar = sourceView.querySelector(".tg-editor-toolbar");
    if (!toolbar) {
      toolbar = this.buildEditorToolbar(view);
    }
    const host = cmEditor.parentElement;
    const activeSketch = host.querySelector(":scope > .tg-lifora-inline-sketch");
    if (activeSketch && activeSketch.dataset.notePath !== view.file?.path) activeSketch.remove();
    if (toolbar.parentElement !== host || (toolbar.nextElementSibling !== cmEditor && toolbar.nextElementSibling !== activeSketch)) {
      host.insertBefore(toolbar, cmEditor);
    }
    this.updateEditorToolbarMeta(toolbar, view.editor);
    this.attachRichPasteHandler(view);
  }

  buildEditorToolbar(view) {
    const toolbar = document.createElement("div");
    toolbar.className = "tg-editor-toolbar";
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "LIFORA Writing Studio");

    const main = toolbar.createDiv({ cls: "tg-editor-toolbar-main" });
    const makeGroup = () => main.createDiv({ cls: "tg-editor-tool-group" });
    const addButton = (group, icon, label, callback) => {
      const button = group.createEl("button", {
        cls: "tg-editor-tool-button",
        attr: { type: "button", title: label, "aria-label": label }
      });
      setIcon(button, icon);
      button.addEventListener("mousedown", event => event.preventDefault());
      button.addEventListener("click", event => {
        event.preventDefault();
        const editor = view.editor;
        if (!editor) return;
        callback(editor);
        this.updateEditorToolbarMeta(toolbar, editor);
      });
      return button;
    };
    const addSeparator = () => main.createDiv({ cls: "tg-editor-toolbar-separator" });

    const textGroup = makeGroup();
    const heading = textGroup.createEl("select", {
      cls: "tg-editor-heading-select",
      attr: { title: "Heading style", "aria-label": "Heading style" }
    });
    [
      ["normal", "Text"],
      ["h1", "H1"],
      ["h2", "H2"],
      ["h3", "H3"]
    ].forEach(([value, label]) => heading.createEl("option", { value, text: label }));
    heading.addEventListener("change", () => {
      if (view.editor) this.editorApplyHeading(view.editor, heading.value);
      view.editor?.focus();
    });
    addButton(textGroup, "bold", "Bold", editor => this.editorWrapSelection(editor, "**", "**", "bold text"));
    addButton(textGroup, "italic", "Italic", editor => this.editorWrapSelection(editor, "*", "*", "italic text"));
    addButton(textGroup, "underline", "Underline", editor => this.editorWrapSelection(editor, "<u>", "</u>", "underlined text"));
    addButton(textGroup, "strikethrough", "Strikethrough", editor => this.editorWrapSelection(editor, "~~", "~~", "text"));
    addButton(textGroup, "highlighter", "Highlight", editor => this.editorWrapSelection(editor, "==", "==", "highlighted text"));
    addButton(textGroup, "type", "Text size", editor => new TimeGardenTextStyleModal(this.app, editor, "size").open());
    addButton(textGroup, "palette", "Text color", editor => new TimeGardenTextStyleModal(this.app, editor, "color").open());
    addButton(textGroup, "paint-bucket", "Text background color", editor => new TimeGardenTextStyleModal(this.app, editor, "background").open());
    addButton(textGroup, "code", "Inline code", editor => this.editorWrapSelection(editor, "`", "`", "code"));
    addButton(textGroup, "sigma", "Inline LaTeX math", editor => this.editorWrapSelection(editor, "$", "$", "x^2 + y^2 = z^2"));

    addSeparator();
    const listGroup = makeGroup();
    addButton(listGroup, "list", "Bulleted list", editor => this.editorToggleLinePrefix(editor, "- "));
    addButton(listGroup, "list-ordered", "Numbered list", editor => this.editorToggleLinePrefix(editor, "1. ", /^\d+\.\s?/));
    addButton(listGroup, "list-checks", "Checklist", editor => this.editorToggleLinePrefix(editor, "- [ ] ", /^[-*+]\s+\[[ xX]\]\s?/));
    addButton(listGroup, "quote", "Block quote", editor => this.editorToggleLinePrefix(editor, "> ", /^>\s?/));
    addButton(listGroup, "square", "Colored title box", editor => new TimeGardenCalloutInsertModal(this.app, editor).open());
    addButton(listGroup, "table", "Insert table", editor => new TimeGardenTableInsertModal(this.app, editor).open());
    addButton(listGroup, "minus", "Horizontal divider", editor => editor.replaceSelection("\n\n---\n\n"));
    addButton(listGroup, "file-code", "Code block with syntax highlighting", editor => new TimeGardenCodeBlockModal(this.app, editor, this).open());
    addButton(listGroup, "sigma", "Insert LaTeX math block", editor => this.editorInsertMathBlock(editor));

    addSeparator();
    const insertGroup = makeGroup();
    addButton(insertGroup, "files", "Insert template", editor => new TimeGardenTemplateModal(this.app, this, editor).open());
    addButton(insertGroup, "link", "Insert link", editor => new TimeGardenLinkInsertModal(this.app, editor).open());
    addButton(insertGroup, "image-plus", "Insert image", editor => this.openEditorImagePicker(editor));
    const drawingButton = addButton(insertGroup, "pencil-ruler", "Excalidraw drawing tools", () => {
      this.toggleLiforaExcalidrawPanel(toolbar, view, drawingButton);
    });
    drawingButton.classList.add("tg-editor-excalidraw-trigger");
    drawingButton.setAttribute("aria-haspopup", "dialog");
    // v2.10.8: one icon per genuinely useful note integration; clicking any icon
    // opens ACTIONS, not an empty diagnostic menu. Never enumerate unrelated plugins.
    const canvasButton=addButton(insertGroup,"layout-dashboard","Canvas tools for this note",()=>this.openLiforaIntegration(view,"canvas"));
    canvasButton.classList.add("tg-editor-plugin-shortcut");
    const adv=addButton(insertGroup,"workflow","Advanced Canvas features",()=>this.openLiforaPluginCommands(view,"advanced-canvas"));
    adv.classList.add("tg-editor-plugin-shortcut");
    const task=addButton(insertGroup,"list-todo","TaskNotes features",()=>this.openLiforaPluginCommands(view,"tasknotes"));
    task.classList.add("tg-editor-plugin-shortcut");
    const format=addButton(insertGroup,"panels-top-left","Editing Toolbar features",()=>this.openLiforaPluginCommands(view,"editing-toolbar"));
    format.classList.add("tg-editor-plugin-shortcut");
    // Contextual plugins are shown only when installed, active and publishing
    // at least one callable Obsidian command. No useless icons for background plugins.
    for(const item of liforaGetNotePluginShortcuts(this.app)) {
      const button=addButton(insertGroup,item.icon,`${item.name} features`,()=>this.openLiforaPluginCommands(view,item.id));
      button.classList.add("tg-editor-plugin-shortcut","tg-editor-note-plugin");
      button.dataset.liforaPluginId=item.id;
    }
    addButton(insertGroup, "scaling", "Resize selected image", editor => new TimeGardenImageResizeModal(this.app, editor).open());
    addButton(insertGroup, "paperclip", "Attach file", editor => this.openEditorAttachmentPicker(editor));
    addButton(insertGroup, "mic", "Record voice note", editor => new TimeGardenVoiceRecorderModal(this.app, this, editor).open());
    addButton(insertGroup, "calendar-days", "Insert date", editor => editor.replaceSelection(new Date().toLocaleDateString("en-GB")));
    addButton(insertGroup, "clock-3", "Insert time", editor => editor.replaceSelection(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })));

    addSeparator();
    const historyGroup = makeGroup();
    addButton(historyGroup, "undo-2", "Undo", () => this.app.commands.executeCommandById("editor:undo"));
    addButton(historyGroup, "redo-2", "Redo", () => this.app.commands.executeCommandById("editor:redo"));

    const spacer = toolbar.createDiv({ cls: "tg-editor-toolbar-spacer" });
    const meta = toolbar.createDiv({ cls: "tg-editor-toolbar-meta" });
    meta.textContent = "Words 0 · 0 chars";
    const collapse = toolbar.createEl("button", {
      cls: "tg-editor-tool-button tg-editor-toolbar-collapse",
      attr: { type: "button", title: "Collapse writing toolbar", "aria-label": "Collapse writing toolbar" }
    });
    setIcon(collapse, "chevron-up");
    collapse.addEventListener("mousedown", event => event.preventDefault());
    collapse.addEventListener("click", () => {
      toolbar.classList.toggle("is-collapsed");
      collapse.setAttribute("aria-label", toolbar.classList.contains("is-collapsed") ? "Expand writing toolbar" : "Collapse writing toolbar");
      collapse.setAttribute("title", toolbar.classList.contains("is-collapsed") ? "Expand writing toolbar" : "Collapse writing toolbar");
      setIcon(collapse, toolbar.classList.contains("is-collapsed") ? "chevron-down" : "chevron-up");
    });
    toolbar.dataset.tgWritingStudio = "true";
    toolbar.dataset.tgToolsCount = String(main.querySelectorAll("button").length);
    toolbar.setAttribute("aria-label", "LIFORA Writing Studio · writing and useful plugin feature menus");
    this.updateEditorToolbarMeta(toolbar, view.editor);
    return toolbar;
  }

  async setLiforaAutoInstallEnabled(enabled) {
    const saved = (await this.loadData()) || {};
    await this.saveData({...saved, liforaAutoInstallPlugins: Boolean(enabled)});
    this.liforaAutoInstallEnabled = Boolean(enabled);
  }

  async liforaInstallMissingPlugins({manual=false}={}) {
    if (this.liforaPluginInstallPromise) return this.liforaPluginInstallPromise;
    const start = async () => {
      if (!manual) {
        const data = (await this.loadData()) || {};
        this.liforaAutoInstallEnabled = data.liforaAutoInstallPlugins !== false;
        if (!this.liforaAutoInstallEnabled) return [];
      }
      const installer = new LiforaAutoPluginInstaller(this.app);
      const report = await installer.run();
      this.liforaLastPluginInstallReport = report;
      const added = report.filter(r=>r.status.startsWith("installed-"));
      const failed = report.filter(r=>r.status === "failed" || r.status === "unsupported" || r.status === "existing-files");
      if (added.length || failed.length) {
        const note = `${added.length} plugin(s) installed${failed.length ? `; ${failed.length} require attention in Plugin Setup` : ""}.`;
        new Notice(`LIFORA Plugin Setup: ${note}`, 8500);
      }
      return report;
    };
    const promise = start();
    this.liforaPluginInstallPromise = promise;
    try { return await promise; }
    finally { this.liforaPluginInstallPromise = null; }
  }

  openLiforaPluginSetup() { new TimeGardenPluginSetupModal(this.app, this).open(); }
  openLiforaPluginCommands(view, pluginId) { new TimeGardenPluginCommandsModal(this.app, this, view, pluginId).open(); }
  openLiforaIntegration(view, kind) {
    if (kind === "tasknotes" || kind === "toolbar") {
      const id = kind === "tasknotes" ? "tasknotes" : "editing-toolbar";
      return this.openLiforaPluginCommands(view, id);
    }
    new TimeGardenWritingIntegrationsModal(this.app, this, view, kind).open();
  }
  openLiforaCanvasPicker(view, embed = false) { new TimeGardenCanvasPickerModal(this.app, this, view, embed).open(); }
  async createLiforaCanvas(view) {
    const folder = "Attachments/LIFORA Canvas";
    await this.ensureLiforaDrawingFolder(folder);
    const name = (view?.file?.basename || "Untitled").replace(/[\\/:*?"<>|#^\[\]]/g,"-").slice(0, 38);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    for (let n = 0; n < 50; n++) {
      const path = `${folder}/${name} Canvas ${stamp}${n ? `-${n}` : ""}.canvas`;
      if (this.app.vault.getAbstractFileByPath(path)) continue;
      await this.app.vault.create(path, JSON.stringify({ nodes: [], edges: [] }, null, 2));
      await this.app.workspace.openLinkText(path, "", true);
      return;
    }
    throw new Error("Could not find an available Canvas filename");
  }

  getLiforaExcalidrawPlugin() {
    const plugin = this.app.plugins?.plugins?.["obsidian-excalidraw-plugin"];
    return plugin && plugin._loaded !== false ? plugin : null;
  }

  getLiforaExcalidrawCommands() {
    const commands = this.app.commands?.listCommands?.() || [];
    return commands.filter(command => command.id?.startsWith("obsidian-excalidraw-plugin:") ||
      (command.name || "").toLowerCase().startsWith("excalidraw:"));
  }

  findLiforaExcalidrawDrawings() {
    return this.app.vault.getFiles().filter(file => {
      if (file.extension?.toLowerCase() === "excalidraw" || /\.excalidraw\.md$/i.test(file.name)) return true;
      if (file.extension?.toLowerCase() !== "md") return false;
      const frontmatter = this.app.metadataCache?.getFileCache(file)?.frontmatter;
      return frontmatter && Object.prototype.hasOwnProperty.call(frontmatter, "excalidraw-plugin");
    }).sort((a, b) => a.path.localeCompare(b.path));
  }

  insertExistingLiforaExcalidraw(editor, view, asImage = false) {
    if (!this.getLiforaExcalidrawPlugin()) {
      new Notice("Install and enable the Excalidraw Community Plugin on this device first.", 8000);
      return;
    }
    const note = view?.file || this.app.workspace.getActiveFile();
    if (!(note instanceof TFile) || !editor) {
      new Notice("Open a Markdown note in Edit mode to insert a drawing.");
      return;
    }
    new TimeGardenExcalidrawPickerModal(this.app, this, editor, note, asImage).open();
  }

  async openLiforaExcalidrawFile(file) {
    if (!(file instanceof TFile)) return;
    if (!this.getLiforaExcalidrawPlugin()) {
      new Notice("Enable the Excalidraw Community Plugin to edit this drawing.");
      return;
    }
    try {
      await this.app.workspace.openLinkText(file.path, "", true);
    } catch (error) {
      console.error("LIFORA could not open Excalidraw drawing", error);
      new Notice("Could not open the drawing. Check the Excalidraw plugin.");
    }
  }

  async createAndEmbedLiforaExcalidraw(view) {
    if (!this.getLiforaExcalidrawPlugin()) {
      new Notice("Excalidraw is required. Install and enable it from Obsidian Settings → Community plugins on this device.", 9000);
      return;
    }
    const note = view?.file || this.app.workspace.getActiveFile();
    if (!(note instanceof TFile) || view?.getViewType?.() !== "markdown" || !view.editor) {
      new Notice("Open a regular Markdown note in Edit mode before creating a drawing.");
      return;
    }
    // Prefer the official command. It both creates a native Excalidraw canvas
    // (with all its real pen/shapes/arrow/eraser tools) and inserts the embed.
    const commands = this.getLiforaExcalidrawCommands();
    const embed = commands.filter(command => {
      const label = (command.name || "").toLowerCase();
      return /creat(e|ing).*draw/.test(label) && /embed/.test(label) && /activ(e|ely).*document/.test(label);
    });
    const preferred = embed.find(command => /adjacent|new pane|new window|popup|pop-up/.test(command.name?.toLowerCase() || "")) || embed[0];
    if (preferred) {
      try {
        const done = this.app.commands.executeCommandById(preferred.id);
        if (done !== false) return;
      } catch (error) {
        console.warn("LIFORA Excalidraw built-in embed command did not run", error);
      }
    }
    // Supported alternative from Excalidraw Automate when the command is renamed.
    // Never create an unrecognized file or insert a dangling link on failure.
    const ea = typeof window !== "undefined" ? window.ExcalidrawAutomate : null;
    if (!ea || typeof ea.create !== "function") {
      new Notice("The installed Excalidraw version does not expose its Create & Embed command. Update Excalidraw and try again.", 9500);
      return;
    }
    try {
      const folder = note.parent?.path || "";
      const title = `${note.basename.replace(/[\\/:*?"<>|]/g, "-").slice(0, 50)} Drawing ${new Date().toISOString().replace(/[:.]/g, "-")}`;
      const result = await ea.create({ filename: title, foldername: folder, onNewPane: true });
      const path = typeof result === "string" ? result : "";
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile)) {
        new Notice("Drawing was not verified. Check Excalidraw before inserting a link.");
        return;
      }
      const link = this.app.metadataCache.fileToLinktext(file, note.path, true);
      view.editor.replaceSelection(`\n![[${link}]]\n`);
      new Notice("Drawing created and embedded into your note.");
    } catch (error) {
      console.error("LIFORA could not create Excalidraw drawing", error);
      new Notice("Could not create drawing. The original note was not changed.");
    }
  }

  toggleLiforaExcalidrawPanel(_toolbar, view, _trigger) {
    // Modal is intentionally portaled outside the editor so the menu can never
    // be clipped by CM6 / mobile editor overflow or the horizontal toolbar.
    new TimeGardenDrawingActionsModal(this.app, this, view).open();
  }

  async exportExcalidrawAsImage(drawingFile, noteFile) {
    const ea = typeof window !== "undefined" ? window.ExcalidrawAutomate : null;
    if (!this.getLiforaExcalidrawPlugin() || !ea || typeof ea.createSVG !== "function") {
      throw new Error("Install and enable Excalidraw with ExcalidrawAutomate support");
    }
    if (!(drawingFile instanceof TFile) || !(noteFile instanceof TFile)) throw new Error("Invalid drawing or note");
    // Official ExcalidrawAutomate export API. Do not replace original editable drawing.
    const svg = await ea.createSVG(drawingFile.path, false);
    if (!svg || svg.nodeName?.toLowerCase() !== "svg") throw new Error("Excalidraw returned no SVG image");
    const markup = new XMLSerializer().serializeToString(svg);
    if (!markup.startsWith("<svg") && !markup.startsWith("<?xml")) throw new Error("SVG export invalid");
    const folder = "Attachments/LIFORA Drawings";
    await this.ensureLiforaDrawingFolder(folder);
    const base = drawingFile.basename.replace(/[\\/:*?"<>|#^\[\]]/g, "-").slice(0, 48) || "Drawing";
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    for (let n = 0; n < 50; n++) {
      const path = `${folder}/${base} - Snapshot ${stamp}${n ? `-${n}` : ""}.svg`;
      if (this.app.vault.getAbstractFileByPath(path)) continue;
      return await this.app.vault.create(path, markup);
    }
    throw new Error("Could not allocate a free snapshot name");
  }

  async ensureLiforaDrawingFolder(path) {
    let current = "";
    for (const part of path.split("/")) {
      current = current ? `${current}/${part}` : part;
      if (!this.app.vault.getAbstractFileByPath(current)) {
        try { await this.app.vault.createFolder(current); }
        catch (error) { if (!this.app.vault.getAbstractFileByPath(current)) throw error; }
      }
    }
  }

  openLiforaInlineSketch(view, initialTool = "pen") {
    const note = view?.file;
    if (!(note instanceof TFile) || view?.getViewType?.() !== "markdown" || !view.editor) {
      new Notice("Open a Markdown note in Edit mode before drawing.");
      return;
    }
    const source = view.contentEl?.querySelector(".markdown-source-view");
    const cmEditor = source?.querySelector(".cm-editor");
    if (!cmEditor?.parentElement) {
      new Notice("Switch this note to Edit mode to draw inside it.");
      return;
    }
    const host = cmEditor.parentElement;
    let panel = host.querySelector(":scope > .tg-lifora-inline-sketch");
    if (panel?.dataset.notePath === note.path) {
      panel.remove();
      return;
    }
    panel?.remove();
    panel = new TimeGardenInlineSketch(this.app, this, view, note, initialTool).build();
    host.insertBefore(panel, cmEditor);
    panel.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }

  async saveLiforaInlineSvg(sourceFile, svgText) {
    const root = "Attachments/LIFORA Drawings";
    const dirParts = root.split("/");
    let current = "";
    for (const component of dirParts) {
      current = current ? `${current}/${component}` : component;
      if (!this.app.vault.getAbstractFileByPath(current)) {
        try { await this.app.vault.createFolder(current); }
        catch (error) {
          if (!this.app.vault.getAbstractFileByPath(current)) throw error;
        }
      }
    }
    // Use a unique vault path; never overwrite another drawing.
    const clean = (sourceFile.basename || "Note").replace(/[\\/:*?"<>|#^\[\]]/g, "-").slice(0, 46) || "Note";
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    for (let i = 0; i < 100; i++) {
      const name = `${clean} - Sketch ${stamp}${i ? `-${i}` : ""}.svg`;
      const path = `${root}/${name}`;
      if (this.app.vault.getAbstractFileByPath(path)) continue;
      return await this.app.vault.create(path, svgText);
    }
    throw new Error("Could not allocate unique drawing filename");
  }

  updateEditorToolbarMeta(toolbar, editor) {
    if (!toolbar || !editor) return;
    const meta = toolbar.querySelector(".tg-editor-toolbar-meta");
    if (!meta) return;
    const value = editor.getValue();
    const words = (value.match(/[\p{L}\p{N}]+/gu) || []).length;
    const label = `Words ${words.toLocaleString()} · ${value.length.toLocaleString()} chars`;
    if (meta.textContent !== label) meta.textContent = label;
  }

  editorInsertMathBlock(editor) {
    const cursor = editor.getCursor();
    const block = "$$\n\\frac{a}{b}\n$$";
    editor.replaceSelection(block);
    editor.setCursor({ line: cursor.line + 1, ch: 8 });
    editor.focus();
  }

  editorWrapSelection(editor, before, after, placeholder) {
    const selected = editor.getSelection();
    if (selected) {
      editor.replaceSelection(`${before}${selected}${after}`);
      return;
    }
    editor.replaceSelection(`${before}${placeholder}${after}`);
    const cursor = editor.getCursor();
    const end = { line: cursor.line, ch: cursor.ch - after.length };
    const start = { line: end.line, ch: Math.max(0, end.ch - placeholder.length) };
    editor.setSelection(start, end);
  }

  editorToggleLinePrefix(editor, prefix, removePattern = null) {
    const from = editor.getCursor("from");
    const to = editor.getCursor("to");
    const startLine = Math.min(from.line, to.line);
    const endLine = Math.max(from.line, to.line);
    for (let lineNumber = endLine; lineNumber >= startLine; lineNumber--) {
      const line = editor.getLine(lineNumber);
      const indent = line.match(/^\s*/)?.[0] || "";
      const body = line.slice(indent.length);
      const pattern = removePattern || /^[-*+]\s?/;
      const next = pattern.test(body) ? indent + body.replace(pattern, "") : indent + prefix + body;
      editor.replaceRange(next, { line: lineNumber, ch: 0 }, { line: lineNumber, ch: line.length });
    }
  }

  editorApplyHeading(editor, value) {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    const clean = line.replace(/^\s{0,3}#{1,6}\s+/, "");
    const prefix = value === "normal" ? "" : `${"#".repeat(Number(value.slice(1)))} `;
    editor.replaceRange(`${prefix}${clean}`, { line: cursor.line, ch: 0 }, { line: cursor.line, ch: line.length });
  }

  editorInsertCodeBlock(editor) {
    const selected = editor.getSelection();
    if (selected) {
      editor.replaceSelection("\n```\n" + selected + "\n```\n");
      return;
    }
    editor.replaceSelection("\n```\n\n```\n");
    const cursor = editor.getCursor();
    editor.setCursor({ line: Math.max(0, cursor.line - 2), ch: 0 });
  }

  openEditorImagePicker(editor) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml";
    input.multiple = true;
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener("cancel", () => input.remove(), { once: true });
    input.addEventListener("change", () => {
      const files = Array.from(input.files || []);
      input.remove();
      if (files.length) new TimeGardenImageInsertModal(this.app, this, editor, files).open();
    }, { once: true });
    input.click();
  }

  openEditorAttachmentPicker(editor) {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener("cancel", () => input.remove(), { once: true });
    input.addEventListener("change", async () => {
      const files = Array.from(input.files || []);
      input.remove();
      if (!files.length) return;
      try {
        const links = [];
        for (const file of files) {
          const ext = (file.name.split(".").pop() || "bin").toLowerCase();
          const path = await this.saveEditorAttachment(file, file.name, "Files", ext);
          const embed = ["pdf", "mp3", "m4a", "wav", "ogg", "webm", "mp4"].includes(ext);
          links.push(embed ? `![[${path}]]` : `[[${path}]]`);
        }
        editor.replaceSelection(`\n${links.join("\n")}\n`);
        editor.focus();
        new Notice(`${files.length} file(s) attached to this note.`);
      } catch (error) {
        console.error("LIFORA attachment upload failed", error);
        new Notice(`Could not attach file: ${error.message || error}`);
      }
    }, { once: true });
    input.click();
  }

  async saveEditorAttachment(fileOrBlob, originalName, folderName, extension) {
    const folder = `00 Dashboard/LIFORA Attachments/${folderName}`;
    await this.ensureFolder(folder);
    const originalBase = String(originalName || "Attachment").replace(/\.[^.]+$/, "");
    const base = safeName(originalBase) || "Attachment";
    const ext = String(extension || "bin").replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
    let path = `${folder}/${base}.${ext}`;
    let counter = 2;
    while (this.app.vault.getAbstractFileByPath(path)) {
      path = `${folder}/${base} (${counter++}).${ext}`;
    }
    const buffer = await fileOrBlob.arrayBuffer();
    await this.app.vault.createBinary(path, buffer);
    return path;
  }

  async insertEditorImages(editor, files, options) {
    const embeds = [];
    for (const file of files) {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = await this.saveEditorAttachment(file, file.name, "Images", ext);
      const width = options.width === "auto" ? "" : `|${options.width}`;
      let embed = `![[${path}${width}]]`;
      const caption = String(options.caption || "").trim();
      if (caption) embed += `\n*${caption}*`;
      embeds.push(embed);
    }
    editor.replaceSelection(`\n${embeds.join("\n\n")}\n`);
    editor.focus();
    new Notice(`${files.length} image(s) added. You can change the displayed width from the image embed.`);
  }


  disableCompetingDailyStartup() {
    // Journals is configured to open the Daily note on vault startup. LIFORA
    // owns the landing page, so disable only that one startup preference.
    // The Journals plugin exposes an openOnStartup setter and persists changes.
    try {
      const journals = this.app?.plugins?.plugins?.journals;
      if (journals && journals.openOnStartup === "daily") {
        journals.openOnStartup = "";
        console.info("LIFORA: disabled Journals auto-open so Home can be the startup page.");
      }
    } catch (error) {
      console.warn("LIFORA could not update the Journals startup preference.", error);
    }
  }

  async ensureDashboardPreview(view) {
    if (!view || view.getViewType?.() !== "markdown" || !view.contentEl) return;

    // Obsidian owns Markdown mode selection and rendering. This helper only
    // waits for its native DOM update; it must not call view.setMode(), which
    // is incompatible with some Obsidian currentMode implementations.
    await new Promise(resolve => {
      if (typeof window !== "undefined" && window.requestAnimationFrame) {
        window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
      } else {
        setTimeout(resolve, 80);
      }
    });
  }

  findDashboardProcessorHost(view, processor) {
    if (!view?.contentEl || view.getViewType?.() !== "markdown") return null;
    const viewRoot = view.contentEl.querySelector(".markdown-preview-view, .markdown-reading-view") || view.contentEl;
    let host = viewRoot.querySelector(`.block-language-${processor}`);
    if (!host) {
      const code = viewRoot.querySelector(`pre code.language-${processor}, pre code[class*="${processor}"]`);
      host = code?.closest?.(".el-pre") || code?.parentElement?.parentElement || null;
    }
    return host ? { viewRoot, host } : null;
  }

  async waitForDashboardProcessorHost(view, processor, timeoutMs = 1600) {
    const find = () => this.findDashboardProcessorHost(view, processor);
    const immediate = find();
    if (immediate) return immediate;
    if (!view?.contentEl || typeof MutationObserver === "undefined") return null;

    return new Promise(resolve => {
      let settled = false;
      let timer = null;
      const observer = new MutationObserver(() => {
        const found = find();
        if (found) finish(found);
      });
      const finish = value => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        if (timer !== null) window.clearTimeout(timer);
        resolve(value || null);
      };
      observer.observe(view.contentEl, { childList: true, subtree: true });
      timer = window.setTimeout(() => finish(find()), timeoutMs);
      const afterFrame = () => {
        const found = find();
        if (found) finish(found);
      };
      if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(afterFrame);
    });
  }

  async forceRenderHomeDashboard(leaf) {
    const view = leaf?.view;
    if (view?.getViewType?.() !== "markdown" || view.file?.path !== PATHS.home || !view.contentEl) return false;

    await this.ensureDashboardPreview(view);
    if (leaf.view?.file?.path !== PATHS.home) return false;

    // Always prefer Obsidian's real Markdown processor host. Creating a second,
    // synthetic host before Obsidian finishes rendering can leave a blank Home
    // pane after navigating here from Journal. Wait for the real host first.
    const located = await this.waitForDashboardProcessorHost(view, "time-garden-home-overview", 1800);
    if (leaf.view?.file?.path !== PATHS.home) return false;

    let viewRoot = located?.viewRoot ||
      view.contentEl.querySelector(".markdown-preview-view, .markdown-reading-view") || view.contentEl;
    let host = located?.host || null;

    // Last-resort recovery only: create a host after the normal processor had a
    // chance to mount. This is deliberately not done during the initial transition.
    if (!host) {
      const section = viewRoot.querySelector(".markdown-preview-section") ||
        viewRoot.querySelector(".markdown-preview-sizer") || viewRoot;
      host = document.createElement("div");
      host.className = "block-language-time-garden-home-overview tg-home-repair-host";
      section.prepend(host);
    }

    const isReady = () => host.classList.contains("tg-home-app") &&
      Boolean(host.querySelector(".tg-global-day-header")) &&
      Boolean(host.querySelector(".tg-home-toolbar")) &&
      Boolean(host.querySelector(".tg-home-fab-host"));

    if (!isReady()) {
      await this.runDashboardRender(host, async () => {
        if (isReady() || leaf.view?.file?.path !== PATHS.home || !host.isConnected) return;
        host.dataset.tgHomeRepairing = "true";
        viewRoot.classList.remove("tg-home-live-ready");
        try {
          await this.renderHomeOverview(host);
        } catch (error) {
          console.error("LIFORA Home direct renderer failed; showing recovery view.", error);
          try {
            this.renderHomeFallback(host, error);
          } catch (fallbackError) {
            console.error("LIFORA Home recovery view failed.", fallbackError);
            host.replaceChildren();
            const recovery = document.createElement("section");
            recovery.className = "tg-home-hard-recovery";
            recovery.innerHTML = "<h1>LIFORA</h1><p>Your Home dashboard is available. Use the section links below while the dashboard is recovering.</p><ul><li><a href='obsidian://open?vault=" + encodeURIComponent(this.app.vault.getName()) + "&file=" + encodeURIComponent("Journal/01 Daily/Daily Journal Home") + "'>Daily Journal</a></li><li><a href='obsidian://open?vault=" + encodeURIComponent(this.app.vault.getName()) + "&file=" + encodeURIComponent("08 Courses/Courses Home") + "'>Courses</a></li><li><a href='obsidian://open?vault=" + encodeURIComponent(this.app.vault.getName()) + "&file=" + encodeURIComponent("09 Books/Books Home") + "'>Books</a></li></ul>";
            host.appendChild(recovery);
          }
        } finally {
          delete host.dataset.tgHomeRepairing;
        }
      });
    }

    return isReady() || host.classList.contains("tg-home-recovery") || Boolean(host.querySelector(".tg-home-hard-recovery"));
  }

  isPortableDataPath(path) {
    const value = String(path || "").replace(/^\/+/, "");
    return value === PORTABLE_DATA_ROOT || value.startsWith(`${PORTABLE_DATA_ROOT}/`);
  }

  getPortableManagedRoots() {
    const roots = new Set([...PORTABLE_DATA_ROOTS, ...(this.portableKnownRoots || [])]);
    // User-created top-level folders are also data, including sections added
    // in later versions, not only the original fixed section list.
    const root = this.app.vault.getRoot?.();
    for (const node of root?.children || []) {
      if (!(node instanceof TFolder)) continue;
      if (["data", ".obsidian", ".trash", ".git"].includes(node.path)) continue;
      if (node.name.startsWith(".")) continue;
      roots.add(node.path);
    }
    return [...roots];
  }

  isPortableManagedPath(path) {
    const value = String(path || "").replace(/^\/+/, "");
    return !this.isPortableDataPath(value) &&
      this.getPortableManagedRoots().some(root => value === root || value.startsWith(`${root}/`));
  }

  shouldMirrorPortablePath(path) {
    const value = String(path || "").replace(/^\/+/, "");
    if (!this.isPortableManagedPath(value)) return false;
    if (value === BACKUP_ROOT || value.startsWith(`${BACKUP_ROOT}/`) ||
        value === LEGACY_BACKUP_ROOT || value.startsWith(`${LEGACY_BACKUP_ROOT}/`)) return false;
    if (PORTABLE_DATA_EXCLUDED_FILES.has(value)) return false;
    const name = value.split("/").pop() || "";
    if ([".DS_Store", "Thumbs.db", "desktop.ini"].includes(name)) return false;
    if (name.startsWith("._")) return false;
    return true;
  }

  async ensurePortableIgnoreFilter() {
    const adapter = this.app.vault.adapter;
    const configPath = ".obsidian/app.json";
    try {
      let config = {};
      if (await adapter.exists(configPath)) {
        const raw = await adapter.read(configPath);
        config = JSON.parse(raw || "{}");
      }
      const filters = Array.isArray(config.userIgnoreFilters) ? [...config.userIgnoreFilters] : [];
      if (!filters.some(value => String(value).replace(/\/$/, "") === PORTABLE_DATA_ROOT)) {
        filters.push(PORTABLE_DATA_ROOT);
        config.userIgnoreFilters = filters;
        await adapter.write(configPath, `${JSON.stringify(config, null, 2)}\n`);
      }
    } catch (error) {
      console.warn("LIFORA could not add the portable data folder to Obsidian's ignore filters; the built-in visual hide rule remains active.", error);
    }
  }

  installPortableDataVisibility() {
    if (typeof document === "undefined" || document.getElementById("lifora-hide-portable-data")) return;
    const style = document.createElement("style");
    style.id = "lifora-hide-portable-data";
    style.textContent = `
      .nav-folder:has(> .nav-folder-title[data-path="data"]),
      .nav-folder-title[data-path="data"] { display: none !important; }
    `;
    document.head.appendChild(style);
    this.register(() => style.remove());
  }

  async copyVaultNodeToPortable(path) {
    if (!this.shouldMirrorPortablePath(path)) return;
    const adapter = this.app.vault.adapter;
    // Obsidian may omit an ignored folder from the Vault cache. Always use
    // adapter APIs for the hidden DATA side of a copy.
    if (!(await adapter.exists(path))) return;
    const target = `${PORTABLE_DATA_ROOT}/${path}`;
    const listing = await adapter.list(path).catch(() => null);
    if (listing) {
      await this.ensureAdapterDirectory(target);
      for (const child of [...(listing.folders || []), ...(listing.files || [])]) {
        if (this.shouldMirrorPortablePath(child)) await this.copyVaultNodeToPortable(child);
      }
      return;
    }
    await this.ensureAdapterDirectory(target.slice(0, target.lastIndexOf("/")));
    await adapter.writeBinary(target, await adapter.readBinary(path));
  }

  async copyPortableNodeToVault(sourcePath, destinationPath) {
    if (!this.shouldMirrorPortablePath(destinationPath)) return 0;
    const adapter = this.app.vault.adapter;
    if (!(await adapter.exists(sourcePath))) return 0;
    const listing = await adapter.list(sourcePath).catch(() => null);
    if (listing) {
      await this.ensureAdapterDirectory(destinationPath);
      let count = 0;
      for (const child of [...(listing.folders || []), ...(listing.files || [])]) {
        const relative = child.slice(`${PORTABLE_DATA_ROOT}/`.length);
        if (this.shouldMirrorPortablePath(relative)) {
          count += await this.copyPortableNodeToVault(child, relative);
        }
      }
      return count;
    }
    // Keep newer built-in template files. Custom templates that don't yet
    // exist in the new version are restored normally.
    if (destinationPath.startsWith("06 Templates/") && await adapter.exists(destinationPath)) return 0;
    const parent = destinationPath.includes("/") ? destinationPath.slice(0, destinationPath.lastIndexOf("/")) : "";
    if (parent) await this.ensureAdapterDirectory(parent);
    const binary = await adapter.readBinary(sourcePath);
    const current = this.app.vault.getAbstractFileByPath(destinationPath);
    if (current instanceof TFile) await this.app.vault.modifyBinary(current, binary);
    else if (!current && !(await adapter.exists(destinationPath))) {
      try { await this.app.vault.createBinary(destinationPath, binary); }
      catch (error) {
        if (!(await adapter.exists(destinationPath))) await adapter.writeBinary(destinationPath, binary);
        else throw error;
      }
    } else if (await adapter.exists(destinationPath)) await adapter.writeBinary(destinationPath, binary);
    else throw new Error(`Restore destination is not a file: ${destinationPath}`);
    return 1;
  }

  async snapshotPortableData() {
    for (const path of this.getPortableManagedRoots()) {
      if (this.shouldMirrorPortablePath(path) && await this.app.vault.adapter.exists(path)) {
        await this.copyVaultNodeToPortable(path);
      }
    }
  }

  async restorePortableData() {
    const adapter = this.app.vault.adapter;
    let restoredRoots = 0;
    for (const path of this.getPortableManagedRoots()) {
      const source = `${PORTABLE_DATA_ROOT}/${path}`;
      if (!(await adapter.exists(source))) continue;
      await this.copyPortableNodeToVault(source, path);
      restoredRoots += 1;
    }
    return restoredRoots;
  }

  portableChecksum(binary) {
    const bytes = binary instanceof ArrayBuffer
      ? new Uint8Array(binary)
      : ArrayBuffer.isView(binary)
        ? new Uint8Array(binary.buffer, binary.byteOffset, binary.byteLength)
        : new Uint8Array(binary || []);
    let hash = 0x811c9dc5;
    for (let index = 0; index < bytes.length; index += 1) {
      hash ^= bytes[index];
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  async ensureAdapterDirectory(path) {
    const adapter = this.app.vault.adapter;
    if (!path || await adapter.exists(path)) return;
    const parent = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
    if (parent) await this.ensureAdapterDirectory(parent);
    try { await adapter.mkdir(path); }
    catch (error) {
      if (!(await adapter.exists(path))) throw error;
    }
  }

  isSafePortableSettingPath(path) {
    const value = String(path || "").replace(/^\/+/, "");
    if (PORTABLE_SETTINGS_FIXED_PATHS.includes(value)) return true;
    return /^\.obsidian\/plugins\/[^/]+\/data\.json$/.test(value);
  }

  async getPortableSettingsPaths() {
    const adapter = this.app.vault.adapter;
    const paths = [...PORTABLE_SETTINGS_FIXED_PATHS];
    try {
      if (await adapter.exists(".obsidian/plugins")) {
        const listing = await adapter.list(".obsidian/plugins");
        for (const folder of listing.folders || []) {
          const pluginData = `${folder}/data.json`;
          if (await adapter.exists(pluginData)) paths.push(pluginData);
        }
      }
    } catch (error) {
      console.warn("LIFORA could not enumerate plugin preference files; fixed Obsidian settings will still be saved.", error);
    }
    const unique = [...new Set(paths)];
    const existing = [];
    for (const path of unique) {
      if (this.isSafePortableSettingPath(path) && await adapter.exists(path)) existing.push(path);
    }
    return existing;
  }

  async snapshotPortableSettings() {
    const adapter = this.app.vault.adapter;
    await this.ensureAdapterDirectory(PORTABLE_SETTINGS_ROOT);
    const paths = await this.getPortableSettingsPaths();
    const saved = [];
    for (const path of paths) {
      const destination = `${PORTABLE_SETTINGS_ROOT}/${path}`;
      const parent = destination.slice(0, destination.lastIndexOf("/"));
      await this.ensureAdapterDirectory(parent);
      const binary = await adapter.readBinary(path);
      await adapter.writeBinary(destination, binary);
      saved.push({ path, size: binary.byteLength, checksum: this.portableChecksum(binary) });
    }
    const settingsManifest = {
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      policy: "Obsidian user preferences and community-plugin data.json only; plugin code and workspace layout are excluded.",
      files: saved
    };
    await adapter.write(PORTABLE_SETTINGS_MANIFEST, `${JSON.stringify(settingsManifest, null, 2)}\n`);
    return saved.length;
  }

  async verifyPortableSettingsBeforeRestore() {
    const adapter = this.app.vault.adapter;
    if (!(await adapter.exists(PORTABLE_SETTINGS_MANIFEST))) return 0;
    let settings;
    try { settings = JSON.parse(await adapter.read(PORTABLE_SETTINGS_MANIFEST)); }
    catch (error) { throw new Error(`Portable preferences manifest could not be parsed: ${error.message}`); }
    if (!Array.isArray(settings.files)) throw new Error("Portable preferences manifest is invalid.");
    let verified = 0;
    for (const entry of settings.files) {
      const relative = String(entry?.path || "");
      if (!this.isSafePortableSettingPath(relative)) throw new Error(`Unsafe preference path: ${relative}`);
      const source = `${PORTABLE_SETTINGS_ROOT}/${relative}`;
      if (!(await adapter.exists(source))) throw new Error(`Missing portable preference: ${relative}`);
      const content = await adapter.readBinary(source);
      if (Number.isFinite(entry.size) && content.byteLength !== entry.size) throw new Error(`Incorrect preference size: ${relative}`);
      if (entry.checksum && this.portableChecksum(content) !== entry.checksum) throw new Error(`Corrupt portable preference: ${relative}`);
      verified += 1;
    }
    return verified;
  }

  async restorePortableSettings() {
    const adapter = this.app.vault.adapter;
    if (!(await adapter.exists(PORTABLE_SETTINGS_MANIFEST))) return 0;
    let manifest;
    try { manifest = JSON.parse(await adapter.read(PORTABLE_SETTINGS_MANIFEST)); }
    catch (error) { throw new Error(`Portable settings manifest is unreadable: ${error.message}`); }
    if (!Array.isArray(manifest.files)) throw new Error("Portable settings manifest has no file list.");
    let restored = 0;
    for (const entry of manifest.files) {
      const path = String(entry?.path || "");
      if (!this.isSafePortableSettingPath(path)) continue;
      const source = `${PORTABLE_SETTINGS_ROOT}/${path}`;
      if (!(await adapter.exists(source))) throw new Error(`Portable settings file is missing: ${path}`);
      const binary = await adapter.readBinary(source);
      if (Number.isFinite(entry.size) && binary.byteLength !== entry.size) {
        throw new Error(`Portable settings size check failed: ${path}`);
      }
      if (entry.checksum && this.portableChecksum(binary) !== entry.checksum) {
        throw new Error(`Portable settings integrity check failed: ${path}`);
      }
      const parent = path.slice(0, path.lastIndexOf("/"));
      await this.ensureAdapterDirectory(parent);
      await adapter.writeBinary(path, binary);
      restored += 1;
    }
    // Re-apply the hidden DATA folder exclusion after restoring app.json.
    await this.ensurePortableIgnoreFilter();
    return restored;
  }

  async listPortableDataFiles(path = PORTABLE_DATA_ROOT) {
    const adapter = this.app.vault.adapter;
    const listing = await adapter.list(path).catch(() => null);
    if (!listing) return [];
    const output = [];
    for (const file of listing.files || []) {
      if (file === PORTABLE_DATA_MANIFEST || file.startsWith(`${PORTABLE_SETTINGS_ROOT}/`) ||
          file.startsWith(`${PORTABLE_RECOVERY_ROOT}/`) ||
          file === BACKUP_ROOT || file.startsWith(`${BACKUP_ROOT}/`)) continue;
      output.push(file);
    }
    for (const folder of listing.folders || []) {
      if (folder === PORTABLE_SETTINGS_ROOT || folder === PORTABLE_RECOVERY_ROOT || folder === BACKUP_ROOT) continue;
      output.push(...await this.listPortableDataFiles(folder));
    }
    return output;
  }

  async getPortableDataIntegrityEntries() {
    const adapter = this.app.vault.adapter;
    const entries = [];
    for (const path of await this.listPortableDataFiles()) {
      const binary = await adapter.readBinary(path);
      entries.push({ path, size: binary.byteLength, checksum: this.portableChecksum(binary) });
    }
    entries.sort((a, b) => a.path.localeCompare(b.path));
    return entries;
  }

  async writePortableDataManifest() {
    const previous = this.portableManifestLock || Promise.resolve();
    const current = previous.catch(() => {}).then(() => this.writePortableDataManifestUnlocked());
    this.portableManifestLock = current;
    return current;
  }

  async writePortableDataManifestUnlocked() {
    const entries = await this.getPortableDataIntegrityEntries();
    const roots = [];
    for (const root of this.getPortableManagedRoots()) {
      if (await this.app.vault.adapter.exists(`${PORTABLE_DATA_ROOT}/${root}`)) roots.push(root);
    }
    const manifest = {
      schemaVersion: 3,
      dataFormatVersion: PORTABLE_FORMAT_VERSION,
      pluginVersion: PORTABLE_DATA_VERSION,
      vaultInstanceId: this.portableVaultInstanceId || null,
      updatedAt: new Date().toISOString(),
      roots,
      settingsPolicy: "Settings and workspace are backed up; executable plugin code is supplied by the newer version. Existing built-in templates are kept.",
      integrity: { algorithm: PORTABLE_INTEGRITY_ALGORITHM, fileCount: entries.length, entries }
    };
    // Atomic replacement prevents interrupted writes leaving a half-written manifest.
    const adapter = this.app.vault.adapter;
    const temp = `${PORTABLE_DATA_MANIFEST}.tmp`;
    await adapter.write(temp, `${JSON.stringify(manifest, null, 2)}\n`);
    try {
      if (await adapter.exists(PORTABLE_DATA_MANIFEST)) await adapter.remove(PORTABLE_DATA_MANIFEST);
      await adapter.rename(temp, PORTABLE_DATA_MANIFEST);
    } catch (error) {
      // Not every adapter supports rename; leave a readable manifest rather
      // than treating an unsupported atomic rename as total failure.
      await adapter.write(PORTABLE_DATA_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
      if (await adapter.exists(temp)) await adapter.remove(temp);
    }
    return manifest;
  }

  async verifyPortableDataManifest(manifest) {
    if (!manifest?.integrity || !Array.isArray(manifest.integrity.entries)) {
      return { verified: false, legacy: true, checked: 0, errors: [] };
    }
    const adapter = this.app.vault.adapter;
    const errors = [];
    let checked = 0;
    for (const entry of manifest.integrity.entries) {
      const path = String(entry?.path || "");
      if (!path.startsWith(`${PORTABLE_DATA_ROOT}/`) || path === PORTABLE_DATA_MANIFEST ||
          path.split("/").includes("..")) {
        errors.push(`Invalid manifest path: ${path}`);
        continue;
      }
      if (!(await adapter.exists(path))) { errors.push(`Missing file: ${path}`); continue; }
      const binary = await adapter.readBinary(path);
      if (binary.byteLength !== entry.size || this.portableChecksum(binary) !== entry.checksum) {
        errors.push(`Integrity mismatch: ${path}`);
      }
      checked += 1;
    }
    const actualCount = (await this.listPortableDataFiles()).length;
    if (Number.isFinite(manifest.integrity.fileCount) && actualCount !== manifest.integrity.fileCount) {
      errors.push(`File count mismatch: expected ${manifest.integrity.fileCount}, found ${actualCount}`);
    }
    // Before v2.9.7, the manifest was not refreshed after every user edit,
    // and ignored DATA files could be omitted from the indexed-file count.
    // These historical checksums cannot reliably authorize or reject a
    // migration: treat the old manifest as unverified legacy data, and make a
    // safety copy of live files before any import. New v3 manifests remain strict.
    if (Number(manifest.schemaVersion || 0) < 3) {
      return { verified: errors.length === 0, legacy: true, checked, errors };
    }
    return { verified: errors.length === 0, legacy: false, checked, errors };
  }

  async snapshotLiveDataForRecovery() {
    const liveFiles = this.app.vault.getFiles().filter(file => this.shouldMirrorPortablePath(file.path));
    if (!liveFiles.length) return 0;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const recoveryRoot = `${PORTABLE_RECOVERY_ROOT}/${stamp}`;
    const adapter = this.app.vault.adapter;
    await this.ensureAdapterDirectory(recoveryRoot);
    let copied = 0;
    for (const file of liveFiles) {
      const destination = `${recoveryRoot}/${file.path}`;
      await this.ensureAdapterDirectory(destination.slice(0, destination.lastIndexOf("/")));
      await adapter.writeBinary(destination, await adapter.readBinary(file.path));
      copied += 1;
    }
    return copied;
  }

  isSafeBackupRelativePath(path) {
    const value = String(path || "");
    return Boolean(value) && !value.startsWith("/") && !value.includes("\\") &&
      !value.split("/").some(part => !part || part === "." || part === "..");
  }

  async listBackupAdapterFiles(directory, exclude = null) {
    const adapter = this.app.vault.adapter;
    if (!(await adapter.exists(directory))) return [];
    const output = [];
    const visit = async folder => {
      const listing = await adapter.list(folder);
      for (const file of listing.files || []) {
        if (exclude && exclude(file)) continue;
        output.push(file);
      }
      for (const child of listing.folders || []) {
        if (exclude && exclude(child)) continue;
        await visit(child);
      }
    };
    await visit(directory);
    return output.sort((a, b) => a.localeCompare(b));
  }

  async copyBackupAdapterTree(source, target) {
    const adapter = this.app.vault.adapter;
    await this.ensureAdapterDirectory(target);
    const files = await this.listBackupAdapterFiles(source);
    let copied = 0;
    for (const file of files) {
      const relative = file.slice(source.length + 1);
      if (!this.isSafeBackupRelativePath(relative)) throw new Error(`Invalid legacy backup path: ${relative}`);
      const destination = `${target}/${relative}`;
      await this.ensureAdapterDirectory(destination.slice(0, destination.lastIndexOf("/")));
      const binary = await adapter.readBinary(file);
      await adapter.writeBinary(destination, binary);
      const check = await adapter.readBinary(destination);
      if (binary.byteLength !== check.byteLength || this.portableChecksum(binary) !== this.portableChecksum(check)) {
        throw new Error(`Legacy backup copy verification failed for ${relative}`);
      }
      copied += 1;
    }
    return copied;
  }

  async migrateLegacyBackupsToData() {
    const adapter = this.app.vault.adapter;
    if (!(await adapter.exists(LEGACY_BACKUP_ROOT))) return 0;
    await this.ensureAdapterDirectory(BACKUP_ROOT);
    const legacy = await adapter.list(LEGACY_BACKUP_ROOT);
    let migrated = 0;
    for (const oldPath of legacy.folders || []) {
      const name = oldPath.slice(LEGACY_BACKUP_ROOT.length + 1);
      if (!/^Backup-[A-Za-z0-9_-]+$/.test(name)) continue;
      const destination = `${BACKUP_ROOT}/Legacy-${name}`;
      const doneMarker = `${destination}/${PORTABLE_BACKUP_MIGRATION_MARKER}`;
      try {
        if (await adapter.exists(doneMarker)) continue;
        const copied = await this.copyBackupAdapterTree(oldPath, destination);
        if (!copied) throw new Error("Original backup was empty.");
        // Do not delete original backups, even after a successful verified copy.
        await adapter.write(doneMarker, JSON.stringify({
          schemaVersion: 1,
          migratedAt: new Date().toISOString(),
          from: oldPath,
          filesCopied: copied,
          originalRetained: true
        }, null, 2));
        migrated += 1;
      } catch (error) {
        console.error(`LIFORA could not migrate old backup ${name}. The original was preserved.`, error);
        new Notice(`Could not migrate backup ${name}. Its original copy is still safe.`);
      }
    }
    if (migrated) new Notice(`${migrated} older LIFORA backup(s) copied into data/backups. Originals were kept.`);
    return migrated;
  }

  async verifyVaultBackup(backupPath) {
    const adapter = this.app.vault.adapter;
    if (!backupPath.startsWith(`${BACKUP_ROOT}/`) ||
        !this.isSafeBackupRelativePath(backupPath.slice(BACKUP_ROOT.length + 1)) ||
        backupPath.slice(BACKUP_ROOT.length + 1).includes("/")) {
      throw new Error("Invalid backup selection path.");
    }
    if (!(await adapter.exists(backupPath))) throw new Error("Backup folder does not exist.");
    const manifestPath = `${backupPath}/${BACKUP_INTEGRITY_FILE}`;
    if (!(await adapter.exists(manifestPath))) {
      if (backupPath.startsWith(`${BACKUP_ROOT}/Legacy-`)) {
        if (!(await adapter.exists(`${backupPath}/${PORTABLE_BACKUP_MIGRATION_MARKER}`))) {
          throw new Error("The legacy backup migration is incomplete. The original was preserved.");
        }
        return { verified: false, legacy: true, checked: 0, errors: [] };
      }
      throw new Error("Backup is incomplete: integrity manifest is missing.");
    }
    let manifest;
    try { manifest = JSON.parse(await adapter.read(manifestPath)); }
    catch (error) { throw new Error(`Invalid backup manifest: ${error.message}`); }
    if (!Array.isArray(manifest.entries) || manifest.algorithm !== PORTABLE_INTEGRITY_ALGORITHM) {
      throw new Error("Unsupported backup manifest or checksum format.");
    }
    const newFormat = manifest.schemaVersion === 2 && manifest.snapshotType === "portable-data";
    const oldFormat = manifest.schemaVersion === 1 && backupPath.startsWith(`${BACKUP_ROOT}/Legacy-`);
    if (!newFormat && !oldFormat) throw new Error("Backup format is not supported.");
    const prefix = newFormat ? `${backupPath}/content/` : `${backupPath}/`;
    const files = await this.listBackupAdapterFiles(newFormat ? `${backupPath}/content` : backupPath,
      newFormat ? null : path => path === manifestPath || path === `${backupPath}/${PORTABLE_BACKUP_MIGRATION_MARKER}`);
    const expected = new Set();
    for (const entry of manifest.entries) {
      const relative = String(entry.path || "");
      if (!this.isSafeBackupRelativePath(relative) || expected.has(relative)) {
        throw new Error(`Unsafe or duplicate backup path: ${relative}`);
      }
      expected.add(relative);
      const path = `${prefix}${relative}`;
      if (!(await adapter.exists(path))) throw new Error(`Backup file missing: ${relative}`);
      const binary = await adapter.readBinary(path);
      if (!Number.isSafeInteger(entry.size) || binary.byteLength !== entry.size ||
          this.portableChecksum(binary) !== entry.checksum) {
        throw new Error(`Backup integrity mismatch: ${relative}`);
      }
    }
    if (manifest.fileCount !== expected.size || files.length !== expected.size ||
        files.some(path => !expected.has(path.slice(prefix.length)))) {
      throw new Error("Backup file inventory changed. No files were restored.");
    }
    return { verified: true, legacy: oldFormat, checked: expected.size, errors: [], manifest };
  }

  async prunePortableBackups(prefix, limit) {
    const adapter = this.app.vault.adapter;
    const backups = (await this.getVaultBackups()).filter(item => item.name.startsWith(prefix));
    for (const item of backups.slice(limit)) {
      await adapter.rmdir(item.path, true);
    }
  }

  async runAutomaticBackupIfDue() {
    try {
      // Never run automatic backups on a mobile Syncthing replica or before
      // a destination has been selected explicitly on the desktop.
      if (!this.canUseFullVaultBackups() || !this.portableDataReady || this.portableBackupInProgress || this.portableRestoreInProgress) return;
      const data=(await this.loadData()) || {};
      if (data.automaticBackupEnabled !== true || !data.fullBackupFolder) return;
      const last=Date.parse(data.lastAutomaticBackupAt || "");
      if (Number.isFinite(last) && Date.now()-last<24*60*60*1000) return;
      const location=await this.createVaultBackup(false,true);
      const latest=(await this.loadData()) || {};
      await this.saveData({...latest,lastAutomaticBackupAt:new Date().toISOString(),lastAutomaticBackupPath:location});
      new Notice("LIFORA full daily backup completed on this computer.");
    } catch (error) {
      console.error("LIFORA automatic full backup failed",error);
      new Notice(`Full automatic backup failed: ${error.message}`);
    }
  }

  async initializePortableDataStore() {
    await this.ensureAdapterDirectory(PORTABLE_DATA_ROOT);
    const adapter = this.app.vault.adapter;
    let manifest = null;
    if (await adapter.exists(PORTABLE_DATA_MANIFEST)) {
      try { manifest = JSON.parse(await adapter.read(PORTABLE_DATA_MANIFEST)); }
      catch (error) {
        throw new Error(`The portable data manifest is unreadable. No files were overwritten: ${error.message}`);
      }
    }
    let marker = null;
    if (await adapter.exists(PORTABLE_INSTALL_MARKER)) {
      try { marker = JSON.parse(await adapter.read(PORTABLE_INSTALL_MARKER)); }
      catch (error) { throw new Error(`Vault installation marker is unreadable: ${error.message}`); }
    }
    // Never alter DATA created by a format this installation cannot read.
    // Keep the filesystem contract independent from UI release numbers.
    if (manifest && (Number(manifest.schemaVersion || 0) > 3 ||
      Number(manifest.dataFormatVersion || 1) > PORTABLE_FORMAT_VERSION)) {
      throw new Error(`This DATA requires a newer LIFORA data reader (format ${manifest.dataFormatVersion || manifest.schemaVersion}). No files were changed.`);
    }
    if (manifest?.integrity?.algorithm && manifest.integrity.algorithm !== PORTABLE_INTEGRITY_ALGORITHM) {
      throw new Error(`Unsupported DATA checksum algorithm: ${manifest.integrity.algorithm}. No files were changed.`);
    }
    await this.ensurePortableIgnoreFilter();
    this.installPortableDataVisibility();
    this.portableKnownRoots = [...new Set([...(manifest?.roots || []), ...PORTABLE_DATA_ROOTS])];
    const payloadRoots = this.getPortableManagedRoots();
    let hasPayload = false;
    for (const path of payloadRoots) {
      if (await adapter.exists(`${PORTABLE_DATA_ROOT}/${path}`)) { hasPayload = true; break; }
    }
    if (!hasPayload) hasPayload = await adapter.exists(PORTABLE_SETTINGS_MANIFEST) ||
      await adapter.exists(PORTABLE_PLUGIN_STATE);
    const liveFiles = this.app.vault.getFiles().filter(file => this.shouldMirrorPortablePath(file.path));
    const hasLivePayload = liveFiles.length > 0;
    const freshTemplate = await adapter.exists(PORTABLE_FRESH_TEMPLATE_MARKER);
    const legacyInPlaceUpgrade = !!manifest && Number(manifest.schemaVersion || 0) < 3 &&
      !marker && !freshTemplate && hasLivePayload;
    const importedData = !!manifest && !legacyInPlaceUpgrade && (!marker?.vaultInstanceId ||
      !manifest.vaultInstanceId || marker.vaultInstanceId !== manifest.vaultInstanceId);
    const legacyImport = !manifest && hasPayload && !marker;
    // A normal app update is not a DATA import. Do not overwrite live user files
    // solely because the installed plugin version number changed.
    const shouldRestore = hasPayload && !legacyInPlaceUpgrade &&
      (importedData || legacyImport || !hasLivePayload);
    let restoredRoots = 0;
    if (shouldRestore) {
      // Verify the imported content BEFORE any write can replace it.
      const integrity = await this.verifyPortableDataManifest(manifest);
      if (!integrity.verified && !integrity.legacy) {
        throw new Error(`DATA integrity check failed; nothing was restored or re-synchronized. ${integrity.errors[0] || ""}`);
      }
      if (integrity.legacy) new Notice("LIFORA found older DATA with incomplete or outdated checksums. Existing files will be backed up before restoration; verify restored content before deleting the old vault.");
      await this.verifyPortableSettingsBeforeRestore();
      if (await adapter.exists(PORTABLE_PLUGIN_STATE)) {
        try { JSON.parse(await adapter.read(PORTABLE_PLUGIN_STATE)); }
        catch (error) { throw new Error(`Portable plugin state is invalid. No restore was started: ${error.message}`); }
      }
      if (hasLivePayload) await this.snapshotLiveDataForRecovery();
      restoredRoots = await this.restorePortableData();
      const restoredSettings = await this.restorePortableSettings();
      const hasPluginState = await adapter.exists(PORTABLE_PLUGIN_STATE);
      if (restoredRoots === 0 && restoredSettings === 0 && !hasPluginState) {
        throw new Error("DATA has no restorable content. Its manifest was not changed.");
      }
      if (hasPluginState) {
        const state = await adapter.read(PORTABLE_PLUGIN_STATE);
        JSON.parse(state); // prevent replacing working plugin state with invalid JSON
        await this.ensureAdapterDirectory(PORTABLE_PLUGIN_STATE_TARGET.slice(0, PORTABLE_PLUGIN_STATE_TARGET.lastIndexOf("/")));
        await adapter.write(PORTABLE_PLUGIN_STATE_TARGET, state);
      }
      await this.ensurePortableIgnoreFilter();
    } else if (!hasPayload) {
      // Fresh install from template: populate DATA with current user content.
      await this.snapshotPortableData();
      await this.snapshotPortableSettings();
      if (await adapter.exists(PORTABLE_PLUGIN_STATE_TARGET)) {
        await adapter.write(PORTABLE_PLUGIN_STATE, await adapter.read(PORTABLE_PLUGIN_STATE_TARGET));
      }
    }

    this.portableVaultInstanceId = marker?.vaultInstanceId ||
      `vault-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    if (importedData || legacyImport) {
      this.portableVaultInstanceId = `vault-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    }
    // Install marker is not user data; only DATA needs moving between versions.
    await adapter.write(PORTABLE_INSTALL_MARKER, JSON.stringify({
      vaultInstanceId: this.portableVaultInstanceId,
      installedAt: new Date().toISOString()
    }, null, 2));
    if (shouldRestore || hasPayload) {
      // Only now is it safe to synchronize template/live folders back into DATA.
      await this.snapshotPortableData();
      await this.snapshotPortableSettings();
    }
    if (legacyInPlaceUpgrade && await adapter.exists(PORTABLE_PLUGIN_STATE_TARGET)) {
      // For an in-place update, live progress is authoritative. v2.9.6 may
      // have an older plugin-state mirror due to its asynchronous saving.
      await adapter.write(PORTABLE_PLUGIN_STATE, await adapter.read(PORTABLE_PLUGIN_STATE_TARGET));
    }
    await this.writePortableDataManifest();
    if (freshTemplate && await adapter.exists(PORTABLE_FRESH_TEMPLATE_MARKER)) {
      await adapter.remove(PORTABLE_FRESH_TEMPLATE_MARKER);
    }
    this.portableDataReady = true;
    // Historical data/backups and legacy snapshots remain untouched for safety.
    // New complete backups are created ONLY at the user-selected desktop location.
    if (shouldRestore) new Notice(`LIFORA restored ${restoredRoots} data sections and preferences from DATA. Restart Obsidian to apply the restored workspace layout.`);
  }

  async removePortableMirrorPath(path) {
    if (!this.isPortableManagedPath(path)) return;
    const mirror = `${PORTABLE_DATA_ROOT}/${path}`;
    const adapter = this.app.vault.adapter;
    if (!(await adapter.exists(mirror))) return;
    const listing = await adapter.list(mirror).catch(() => null);
    if (!listing) return adapter.remove(mirror);
    for (const child of [...(listing.files || []), ...(listing.folders || [])]) {
      const relative = child.slice(`${PORTABLE_DATA_ROOT}/`.length);
      await this.removePortableMirrorPath(relative);
    }
    await adapter.rmdir(mirror, false);
  }

  queuePortableDataAction(action, path) {
    if (!this.portableDataReady || !this.isPortableManagedPath(path)) return;
    if (!this.portableDataQueue) this.portableDataQueue = new Map();
    this.portableDataQueue.set(path, action);
    if (this.portableDataTimer) clearTimeout(this.portableDataTimer);
    this.portableDataTimer = setTimeout(() => {
      this.portableDataTimer = null;
      void this.flushPortableDataQueue();
    }, 450);
  }

  async flushPortableDataQueue() {
    if (!this.portableDataReady || !this.portableDataQueue?.size) return;
    const actions = [...this.portableDataQueue.entries()].map(([path, action]) => ({ path, action }));
    this.portableDataQueue.clear();
    const deletes = actions.filter(item => item.action === "delete").sort((a, b) => a.path.length - b.path.length);
    const upserts = actions.filter(item => item.action === "upsert").sort((a, b) => a.path.length - b.path.length);
    for (const item of deletes) {
      try { await this.removePortableMirrorPath(item.path); }
      catch (error) { console.error(`LIFORA could not remove deleted portable data: ${item.path}`, error); }
    }
    for (const item of upserts) {
      try { await this.copyVaultNodeToPortable(item.path); }
      catch (error) { console.error(`LIFORA could not sync portable data: ${item.path}`, error); }
    }
    try { await this.writePortableDataManifest(); }
    catch (error) { console.error("LIFORA DATA manifest could not be refreshed after file synchronization.", error); }
    if (this.portableDataQueue.size && !this.portableDataTimer) {
      this.portableDataTimer = setTimeout(() => {
        this.portableDataTimer = null;
        void this.flushPortableDataQueue();
      }, 150);
    }
  }

  installPortablePluginStateSync() {
    if (this.portablePluginStateWrapped) return;
    const originalSaveData = this.saveData.bind(this);
    this.saveData = async data => {
      const result = await originalSaveData(data);
      if (this.portableDataReady) {
        try {
          await this.app.vault.adapter.write(PORTABLE_PLUGIN_STATE, `${JSON.stringify(data || {}, null, 2)}\n`);
          await this.writePortableDataManifest();
        } catch (error) {
          console.warn("LIFORA could not mirror its workspace preferences into the portable data folder.", error);
        }
      }
      return result;
    };
    this.portablePluginStateWrapped = true;
  }

  installPortableDataSync() {
    const vault = this.app.vault;
    this.registerEvent(vault.on("create", file => {
      if (this.isPortableManagedPath(file.path)) this.queuePortableDataAction("upsert", file.path);
      if (file.path === "09 Books" || file.path.startsWith("09 Books/")) this.scheduleBooksDashboardRefresh();
    }));
    this.registerEvent(vault.on("modify", file => {
      if (this.isPortableManagedPath(file.path)) this.queuePortableDataAction("upsert", file.path);
      if (file.path.startsWith("09 Books/") && file.basename.toLowerCase() === "book dashboard") {
        this.scheduleBooksDashboardRefresh();
      }
    }));
    this.registerEvent(vault.on("delete", file => {
      if (this.isPortableManagedPath(file.path)) this.queuePortableDataAction("delete", file.path);
      if (file.path === "09 Books" || file.path.startsWith("09 Books/")) this.scheduleBooksDashboardRefresh();
    }));
    this.registerEvent(vault.on("rename", (file, oldPath) => {
      if (oldPath && this.isPortableManagedPath(oldPath)) this.queuePortableDataAction("delete", oldPath);
      if (this.isPortableManagedPath(file.path)) this.queuePortableDataAction("upsert", file.path);
      if ((oldPath && oldPath.startsWith("09 Books/")) || file.path.startsWith("09 Books/")) {
        this.scheduleBooksDashboardRefresh();
      }
    }));
    this.register(() => {
      if (this.portableDataTimer) clearTimeout(this.portableDataTimer);
      this.portableDataTimer = null;
      void this.flushPortableDataQueue();
    });
  }

  scheduleBooksDashboardRefresh() {
    if (this.booksDashboardRefreshTimer) clearTimeout(this.booksDashboardRefreshTimer);
    this.booksDashboardRefreshTimer = setTimeout(() => {
      this.booksDashboardRefreshTimer = null;
      void this.refreshBooksDashboardViews();
    }, 180);
  }

  async refreshBooksDashboardViews() {
    const leaves = this.app.workspace.getLeavesOfType("markdown") || [];
    for (const leaf of leaves) {
      const view = leaf.view;
      if (view?.file?.path !== PATHS.books || !view.contentEl) continue;
      const host = view.contentEl.querySelector(".block-language-time-garden-books-overview");
      if (!host || !host.isConnected) continue;
      try {
        await this.runDashboardRender(host, () => this.renderBooksOverview(host));
      } catch (error) {
        console.warn("LIFORA could not refresh the Books Library after a folder change.", error);
      }
    }
  }

  scheduleCoursesDashboardRefresh() {
    if (this.coursesDashboardRefreshTimer) clearTimeout(this.coursesDashboardRefreshTimer);
    this.coursesDashboardRefreshTimer=setTimeout(()=>{
      this.coursesDashboardRefreshTimer=null;
      void this.refreshCoursesDashboardViews();
    },350);
  }

  async refreshCoursesDashboardViews() {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown") || []) {
      const view=leaf.view;
      if (view?.file?.path !== PATHS.courses || !view.contentEl) continue;
      const host=view.contentEl.querySelector(".block-language-time-garden-courses-overview");
      if (!host || !host.isConnected) continue;
      try { await this.runDashboardRender(host,()=>this.renderCoursesOverview(host)); }
      catch(error) { console.warn("LIFORA course refresh after sync failed.",error); }
    }
  }

  installCoursesLibraryEvents() {
    const changed=path=>{
      if (String(path||"").toLowerCase().endsWith("/course dashboard.md") ||
          path === "08 Courses" || String(path||"").startsWith("08 Courses/")) this.scheduleCoursesDashboardRefresh();
    };
    const vault=this.app.vault;
    this.registerEvent(vault.on("create",file=>changed(file.path)));
    this.registerEvent(vault.on("delete",file=>changed(file.path)));
    this.registerEvent(vault.on("modify",file=>changed(file.path)));
    this.registerEvent(vault.on("rename",(file,oldPath)=>{changed(oldPath);changed(file.path);}));
    this.registerEvent(this.app.metadataCache.on("changed",file=>changed(file.path)));
    this.register(()=>{
      if(this.coursesDashboardRefreshTimer)clearTimeout(this.coursesDashboardRefreshTimer);
      this.coursesDashboardRefreshTimer=null;
    });
  }

  installBooksLibraryEvents() {
    // The category list and Recently Read shelf are always derived from real
    // folders/files. Re-render the visible library after external file changes.
    const refreshIfBooks = path => {
      if (path === "09 Books" || String(path || "").startsWith("09 Books/")) this.scheduleBooksDashboardRefresh();
    };
    this.registerEvent(this.app.vault.on("create", file => refreshIfBooks(file.path)));
    this.registerEvent(this.app.vault.on("delete", file => refreshIfBooks(file.path)));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      refreshIfBooks(oldPath);
      refreshIfBooks(file.path);
    }));
    this.registerEvent(this.app.vault.on("modify", file => {
      if (file.path.startsWith("09 Books/") && file.basename.toLowerCase() === "book dashboard") {
        this.scheduleBooksDashboardRefresh();
      }
    }));
    this.register(() => {
      if (this.booksDashboardRefreshTimer) clearTimeout(this.booksDashboardRefreshTimer);
      this.booksDashboardRefreshTimer = null;
    });
  }

  async onload() {
    try {
      await this.initializePortableDataStore();
    } catch (error) {
      console.error("LIFORA portable data initialization failed. Existing live folders were left in place.", error);
      new Notice("LIFORA could not initialize the portable data folder. Your current files remain available; check the console before replacing this vault.");
    }
    this.installPortablePluginStateSync();
    try { this.applyUiTheme(await this.getUiThemePreference()); }
    catch (error) { console.warn("LIFORA could not apply the saved appearance.", error); }
    this.register(() => this.applyUiTheme("system"));
    this.installPortableDataSync();
    this.installBooksLibraryEvents();
    this.installCoursesLibraryEvents();
    this.installDailyPlannerEvents();
    const automaticBackupTimer = window.setTimeout(() => {
      this.automaticBackupStartupCheckDone = true;
      void this.runAutomaticBackupIfDue();
    }, 12000);
    this.register(() => window.clearTimeout(automaticBackupTimer));
    this.registerInterval(window.setInterval(() => {
      if (!this.portableDataReady) return;
      void this.snapshotPortableSettings().catch(error =>
        console.warn("LIFORA could not refresh portable Obsidian/plugin preferences.", error)
      );
    }, 5 * 60 * 1000));
    this.registerInterval(window.setInterval(() => {
      void this.runAutomaticBackupIfDue();
    }, 60 * 60 * 1000));
    this.disableCompetingDailyStartup();
    // Register Home before optional ribbon/theme setup so a cosmetic error can never blank the dashboard.
    this.registerMarkdownCodeBlockProcessor("time-garden-home-overview", async (_source, el) => {
      await this.runDashboardRender(el, async () => {
        const alreadyReady = el.classList.contains("tg-home-app") &&
          Boolean(el.querySelector(".tg-global-day-header")) &&
          Boolean(el.querySelector(".tg-home-toolbar")) &&
          Boolean(el.querySelector(".tg-home-fab-host"));
        if (alreadyReady) return;
        el.dataset.tgHomeProcessorRunning = "true";
        try {
          await this.renderHomeOverview(el);
        } catch (error) {
          console.error("LIFORA Home renderer failed; showing recovery dashboard.", error);
          this.renderHomeFallback(el, error);
        } finally {
          delete el.dataset.tgHomeProcessorRunning;
        }
      });
    });

    try {
      this.courseColorStyle = document.createElement("style");
      this.courseColorStyle.id = "time-garden-course-folder-colors";
      document.head.appendChild(this.courseColorStyle);
      this.register(() => this.courseColorStyle?.remove());
      this.folderAppearancesCache = await this.getFolderAppearances();
      void this.removeDailyNavigationButtonsOnce().catch(error =>
        console.warn("LIFORA could not clean up legacy daily navigation buttons.", error)
      );
      this.installFolderAppearanceControls();
    } catch (setupError) {
      console.warn("LIFORA optional folder appearance setup was skipped; Home remains available.", setupError);
      this.folderAppearancesCache = this.folderAppearancesCache || {};
    }

    this.registerMarkdownCodeBlockProcessor("lifora-goals", async (_source, el) => {
      await this.runDashboardRender(el, async () => this.renderGoalsDashboard(el));
    });

    try {
      const homeButton = this.addRibbonIcon("house", "LIFORA Home", () => {
        void this.openDashboardNote(PATHS.home).catch(error => {
          console.error("LIFORA Home navigation failed from the ribbon icon.", error);
          new Notice(`LIFORA Home could not open: ${error?.message || "unknown error"}. Your Journal and files are safe.`);
        });
      });
      try {
        homeButton.replaceChildren();
        this.createLiforaSymbol(homeButton, "tg-lifora-ribbon-symbol");
      } catch (iconError) {
        console.warn("LIFORA symbol could not be mounted; using the standard home icon.", iconError);
        setIcon(homeButton, "house");
      }
      homeButton.setAttribute("aria-label", "LIFORA Home");
      homeButton.classList.add("time-garden-home-ribbon", "tg-lifora-home-ribbon");
      const themeButton = this.addRibbonIcon("palette", "LIFORA Appearance Studio", () => this.openThemeGallery());
      themeButton.classList.add("time-garden-theme-ribbon");
    } catch (ribbonError) {
      console.warn("LIFORA Home ribbon icon could not be created; the dashboard command remains available.", ribbonError);
    }
    this.addCommand({ id: "open-home", name: "LIFORA: Open Home Dashboard", icon: "house", callback: () => {
      void this.openDashboardNote(PATHS.home).catch(error => {
        console.error("LIFORA Home command failed.", error);
        new Notice(`LIFORA Home could not open: ${error?.message || "unknown error"}. Your files are safe.`);
      });
    } });
    this.addCommand({ id: "global-search", name: "LIFORA: Search All Notes", icon: "search", callback: () => this.openGlobalSearch() });
    this.addCommand({ id: "personalization-center", name: "LIFORA: Open Personalization Center", icon: "palette", callback: () => this.openPersonalizationCenter() });
    this.addCommand({ id: "appearance-studio", name: "LIFORA: Open Appearance Studio", icon: "palette", callback: () => this.openThemeGallery() });
    this.addCommand({ id: "backup-center", name: "LIFORA: Open Backup Center", icon: "database-backup", callback: () => this.openBackupCenter() });
    this.addCommand({ id: "check-community-plugins", name: "LIFORA: Open Plugin Setup", icon: "plug-zap", callback: () => this.openLiforaPluginSetup() });
    this.addCommand({ id: "create-backup", name: "LIFORA: Create a Vault Backup", icon: "archive", callback: () => this.createVaultBackup() });
    this.addCommand({ id: "open-workspace-center", name: "LIFORA: Open LIFORA Center", icon: "layout-dashboard", callback: () => this.openNote(PATHS.hub) });
    this.addCommand({ id: "open-daily-journal", name: "LIFORA: Open Daily Journal", icon: "book-open", callback: () => this.openNote(PATHS.daily) });
    this.addCommand({ id: "open-daily-planner", name: "LIFORA: Open Daily Planner", icon: "calendar-check", callback: () => this.openDashboardNote(PATHS.planner) });
    this.addCommand({ id: "open-courses", name: "LIFORA: Open Courses Library", icon: "graduation-cap", callback: () => this.openNote(PATHS.courses) });
    this.addCommand({ id: "open-books", name: "LIFORA: Open Books Library", icon: "book-open", callback: () => this.openNote(PATHS.books) });
    this.addCommand({ id: "create-book", name: "LIFORA: Add a Book", icon: "book-plus", callback: () => this.createBookDialog() });
    this.addCommand({ id: "create-book-category", name: "LIFORA: Create Book Category Folder", icon: "folder-plus", callback: () => this.createBookGenreDialog() });
    this.addCommand({ id: "manage-book-categories", name: "LIFORA: Manage Book Categories", icon: "folder-cog", callback: () => this.manageBookCategoriesDialog() });
    this.addCommand({ id: "open-quran", name: "LIFORA: Open Quran Journey", icon: "book-heart", callback: () => this.openNote(PATHS.quran) });
    this.addCommand({ id: "open-languages", name: "LIFORA: Open Language Learning Studio", icon: "languages", callback: () => this.openNote(PATHS.languages) });
    this.addCommand({ id: "create-language", name: "LIFORA: Add a Language", icon: "languages", callback: () => this.createLanguageDialog() });
    this.addCommand({ id: "create-quran-wird", name: "LIFORA: Add a Quran Wird", icon: "calendar-plus", callback: () => this.openQuranWirdDialog() });
    this.addCommand({ id: "open-reviews", name: "LIFORA: Open Reviews Hub", icon: "calendar-check", callback: () => this.openNote(PATHS.reviews) });
    this.addCommand({ id: "open-knowledge", name: "LIFORA: Open Knowledge Library", icon: "library", callback: () => this.openNote(PATHS.knowledge) });
    this.addCommand({ id: "open-templates", name: "LIFORA: Open Templates Library", icon: "files", callback: () => this.openNote(PATHS.templates) });
    this.addCommand({ id: "open-calendar", name: "LIFORA: Open Journals Calendar", icon: "calendar-days", callback: () => this.openCalendar() });

    this.addCommand({
      id: "create-course",
      name: "LIFORA: Create a New Course",
      icon: "graduation-cap",
      callback: () => this.createCourseDialog()
    });
    this.addCommand({
      id: "update-course-progress",
      name: "LIFORA: Update Current Course Progress",
      icon: "chart-no-axes-combined",
      callback: () => this.updateCurrentCourseProgress()
    });
    this.addCommand({
      id: "complete-current-course",
      name: "LIFORA: Mark Current Course Completed",
      icon: "check-circle",
      callback: () => this.completeCurrentCourse()
    });

    this.addCommand({ id: "open-ai-settings", name: "LIFORA: Open AI & Plugin Settings", icon: "settings", callback: () => this.runCommand("time-garden-plugin:open-plugin-settings", "LIFORA settings") });
    this.addCommand({ id: "insert-template", name: "LIFORA: Insert a Template", icon: "file-plus", callback: () => this.runCommand("templater-obsidian:insert-templater", "Templater") });
    this.addCommand({ id: "refresh-dataview", name: "LIFORA: Refresh Dashboards", icon: "refresh-cw", callback: () => this.runCommand("dataview:dataview-force-refresh-views", "Dataview") });

    this.registerMarkdownCodeBlockProcessor("time-garden-section-overview", async (source, el) => {
      const folderPath = String(source || "").trim();
      await this.runDashboardRender(el, async () => {
        const alreadyReady = el.classList.contains("tg-section-dashboard") &&
          Boolean(el.querySelector(".tg-explorer-heading"));
        if (alreadyReady) return;
        try {
          await this.renderSectionOverview(el, folderPath);
        } catch (error) {
          console.error(`LIFORA section renderer failed for ${folderPath}; showing folder recovery view.`, error);
          this.renderSectionFallback(el, folderPath, error);
        }
      });
    });
    this.registerMarkdownCodeBlockProcessor("time-garden-courses-overview", async (_source, el) => {
      try { await this.renderCoursesOverview(el); }
      catch (error) { console.error("LIFORA Courses renderer failed.", error); this.renderSectionFallback(el, "08 Courses", error); }
    });
    this.registerMarkdownCodeBlockProcessor("time-garden-course-panel", async (_source, el, ctx) => {
      await this.renderCoursePanel(el, ctx.sourcePath);
    });
    this.registerMarkdownCodeBlockProcessor("time-garden-folder-notes", async (source, el) => {
      try {
        await this.renderPlainFolderNotes(el, String(source || "").trim());
      } catch (error) {
        console.error("LIFORA folder notes renderer failed.", error);
        el.empty();
        el.createEl("p", { text: "The notes list could not be loaded. Your folder and notes are safe." });
      }
    });
    this.registerMarkdownCodeBlockProcessor("time-garden-books-overview", async (_source, el) => {
      try { await this.renderBooksOverview(el); }
      catch (error) { console.error("LIFORA Books renderer failed.", error); this.renderSectionFallback(el, "09 Books", error); }
    });
    this.registerMarkdownCodeBlockProcessor("time-garden-book-panel", async (_source, el, ctx) => {
      await this.renderBookPanel(el, ctx.sourcePath);
    });
    this.registerMarkdownCodeBlockProcessor("time-garden-quran-overview", async (_source, el) => {
      try { await this.renderQuranOverview(el); }
      catch (error) { console.error("LIFORA Quran renderer failed.", error); this.renderSectionFallback(el, "10 Quran", error); }
    });
    this.registerMarkdownCodeBlockProcessor("time-garden-languages-overview", async (_source, el) => {
      try {
        await this.renderLanguagesOverview(el);
      } catch (error) {
        console.error("LIFORA Languages renderer failed.", error);
        try {
          this.renderSectionFallback(el, "11 Languages", error);
        } catch (fallbackError) {
          console.error("LIFORA Languages recovery renderer failed.", fallbackError);
          el.empty();
          const recovery = el.createDiv({ cls: "tg-section-dashboard tg-section-recovery" });
          recovery.createEl("h2", { text: "Language Studio" });
          recovery.createEl("p", { text: "The enhanced view could not load. Your language files are safe and remain available in the File Explorer." });
        }
      }
    });
    this.registerMarkdownCodeBlockProcessor("time-garden-language-panel", async (_source, el, ctx) => {
      await this.renderLanguagePanel(el, ctx.sourcePath);
    });

    this.registerEvent(this.app.workspace.on("layout-change", () => {
      this.applyCourseFolderColors();
      this.applyExplorerPresentation();
    }));
    this.registerEvent(this.app.metadataCache.on("changed", () => {
      this.applyCourseFolderColors();
      this.applyExplorerPresentation();
      this.refreshGlobalDailyHeaders(true);
    }));

    this.lastGlobalHeaderDate = localISODate(new Date());
    if (typeof window !== "undefined") {
      this.globalDayRefreshInterval = window.setInterval(() => {
        const currentDate = localISODate(new Date());
        if (currentDate !== this.lastGlobalHeaderDate) {
          this.lastGlobalHeaderDate = currentDate;
          this.refreshGlobalDailyHeaders(true);
        }
      }, 30000);
      this.register(() => window.clearInterval(this.globalDayRefreshInterval));
    }

    this.installFolderNavigation();
    this.installExplorerObserver();
    this.installEditorToolbar();
    this.register(() => {
      for (const timer of this.homeRepairTimers || []) window.clearTimeout(timer);
      this.homeRepairTimers?.clear();
      for (const timer of this.dashboardRepairTimers || []) window.clearTimeout(timer);
      this.dashboardRepairTimers?.clear();
    });
    this.registerEvent(this.app.workspace.on("active-leaf-change", leaf => {
      if (leaf?.view?.getViewType?.() === "markdown") {
        // Keep the navigation target synchronized with the actual active tab.
        // A stale-but-attached leaf must never override the user's current tab.
        this.navigationLeaf = leaf;
      }
      // Cancel repairs that belonged to the previous tab. Each dashboard's own
      // open/processor path now performs its single serialized render pass; the
      // old active-leaf listener used to schedule a second renderer for Journal
      // just as the Home ribbon was switching the same Markdown leaf.
      this.clearDashboardRepairTimers();
    }));

    this.disableCompetingDailyStartup();
    this.app.workspace.onLayoutReady(async () => {
      this.disableCompetingDailyStartup();
      try {
        this.workspacePrefsCache = await this.getWorkspacePreferences();
      } catch (error) {
        console.error("LIFORA could not load workspace preferences; using defaults.", error);
        this.workspacePrefsCache = null;
      }

      // Establish the landing page first. Do not wait for optional library
      // migrations while Journals' restored Daily note remains on screen.
      try {
        await this.ensureHomeDashboard();
      } catch (error) {
        console.error("LIFORA could not prepare the Home dashboard.", error);
      }
      try {
        await this.openDashboardNote(PATHS.home, { startup: true });
      } catch (error) {
        console.error("LIFORA could not open Home automatically at startup.", error);
      }

      // Secondary work continues only after the Home landing page is visible.
      const startupTasks = [
        ["Core section dashboards", () => this.ensureCoreSectionDashboards()],
        ["Books dashboard", () => this.ensureBooksHome()],
        ["Quran dashboard", () => this.ensureQuranHome()],
        ["Languages dashboard", () => this.ensureLanguagesHome()],
        ["Daily Planner dashboard", () => this.ensureDailyPlannerHome()],
        ["Course migration", () => this.migrateCourseDashboards()]
      ];
      for (const [label, task] of startupTasks) {
        try {
          await task();
        } catch (error) {
          console.error(`LIFORA startup task failed: ${label}.`, error);
        }
      }

      try { this.applyCourseFolderColors(); } catch (error) {
        console.warn("LIFORA folder colors could not be refreshed during startup.", error);
      }
      try { this.applyExplorerPresentation(); } catch (error) {
        console.warn("LIFORA explorer presentation could not be refreshed during startup.", error);
      }
      try { this.attachAllEditorToolbars(); } catch (error) {
        console.warn("LIFORA editor toolbars could not be attached during startup.", error);
      }

      // Downloading missing third-party code must never delay Home or the
      // Markdown processors. Always defer and handle failures independently.
      const pluginInstallTimer = window.setTimeout(() => {
        void this.liforaInstallMissingPlugins().catch(error =>
          console.warn("LIFORA startup plugin setup was unavailable; the Vault remains intact.", error));
      }, 1500);
      this.register(() => window.clearTimeout(pluginInstallTimer));

      // Home is rendered once by Obsidian's native Markdown code-block
      // processor. Do not force a second render after startup migrations.
    });

  }


  async getWorkspacePreferences() {
    const stored = (await this.loadData()) || {};
    const saved = stored.workspacePreferences || {};
    const migrateSectionPath = path => {
      if (path === "01 Daily" || path === "02 Weekly" || path === DAILY_ROOT || path === WEEKLY_ROOT) return JOURNAL_ROOT;
      if (path === "06 Templates") return null;
      return path;
    };
    const savedOrder = Array.isArray(saved.sectionOrder)
      ? saved.sectionOrder.map(migrateSectionPath).filter(Boolean)
      : [];
    const savedVisible = Array.isArray(saved.visibleSections)
      ? saved.visibleSections.map(migrateSectionPath).filter(Boolean)
      : null;
    if (savedVisible && !stored.dailyPlannerVisibilityMigrated) {
      if (!savedVisible.includes("13 Daily Planner")) savedVisible.push("13 Daily Planner");
      stored.workspacePreferences = {
        ...saved,
        visibleSections: savedVisible
      };
      stored.dailyPlannerVisibilityMigrated = true;
      await this.saveData(stored);
    }
    const savedColors = {};
    if (saved.sectionColors && typeof saved.sectionColors === "object") {
      for (const [path, color] of Object.entries(saved.sectionColors)) {
        const migratedPath = migrateSectionPath(path);
        if (migratedPath) savedColors[migratedPath] = color;
      }
    }
    const defaults = {
      homeWidgets: { daily: true, stats: true, sections: true, recent: true, quickActions: true },
      widgetOrder: ["daily", "stats", "sections", "recent", "quickActions"],
      sectionOrder: HOME_SECTION_CONFIG.map(section => section.folder),
      visibleSections: HOME_SECTION_CONFIG.map(section => section.folder),
      sectionColors: {},
      sectionBanners: {
        "07 Notes": { mode: "daily", intervalHours: 24, anchor: Date.UTC(2026, 0, 1), images: ["06 Templates/Images/Weekly Notes/WeeklyBanner1.gif", "06 Templates/Images/Weekly Notes/WeeklyBanner2.gif", "06 Templates/Images/Weekly Notes/WeeklyBanner3.gif", "06 Templates/Images/Weekly Notes/WeeklyBanner4.gif"] },
        "08 Courses": { mode: "daily", intervalHours: 24, anchor: Date.UTC(2026, 0, 1), images: ["06 Templates/Images/Monthly Notes/MonthlyBanner1.gif", "06 Templates/Images/Monthly Notes/MonthlyBanner2.gif", "06 Templates/Images/Monthly Notes/MonthlyBanner3.gif", "06 Templates/Images/Monthly Notes/MonthlyBanner4.gif"] },
        "09 Books": { mode: "daily", intervalHours: 24, anchor: Date.UTC(2026, 0, 1), images: ["06 Templates/Images/Monthly Notes/MonthlyBanner2.gif", "06 Templates/Images/Monthly Notes/MonthlyBanner3.gif", "06 Templates/Images/Monthly Notes/MonthlyBanner1.gif", "06 Templates/Images/Monthly Notes/MonthlyBanner4.gif"] },
        "10 Quran": { mode: "daily", intervalHours: 24, anchor: Date.UTC(2026, 0, 1), images: ["06 Templates/Images/Quarterly Notes/QuarterlyBanner1.gif", "06 Templates/Images/Quarterly Notes/QuarterlyBanner2.gif", "06 Templates/Images/Quarterly Notes/QuarterlyBanner3.gif", "06 Templates/Images/Quarterly Notes/QuarterlyBanner4.gif"] },
        "11 Languages": { mode: "daily", intervalHours: 24, anchor: Date.UTC(2026, 0, 1), images: ["06 Templates/Images/Quarterly Notes/QuarterlyBanner3.gif", "06 Templates/Images/Quarterly Notes/QuarterlyBanner4.gif", "06 Templates/Images/Quarterly Notes/QuarterlyBanner1.gif", "06 Templates/Images/Quarterly Notes/QuarterlyBanner2.gif"] },
        "12 Goals": { mode: "daily", intervalHours: 24, anchor: Date.UTC(2026, 0, 1), images: ["06 Templates/Images/Weekly Notes/WeeklyBanner4.gif", "06 Templates/Images/Weekly Notes/WeeklyBanner3.gif", "06 Templates/Images/Weekly Notes/WeeklyBanner2.gif", "06 Templates/Images/Weekly Notes/WeeklyBanner1.gif"] },
        "13 Daily Planner": { mode: "daily", intervalHours: 24, anchor: Date.UTC(2026, 0, 1), images: ["06 Templates/Images/Monthly Notes/MonthlyBanner4.gif", "06 Templates/Images/Monthly Notes/MonthlyBanner3.gif", "06 Templates/Images/Monthly Notes/MonthlyBanner2.gif", "06 Templates/Images/Monthly Notes/MonthlyBanner1.gif"] }
      }
    };
    const validFolders = new Set(HOME_SECTION_CONFIG.map(section => section.folder));
    return {
      homeWidgets: { ...defaults.homeWidgets, ...(saved.homeWidgets || {}) },
      widgetOrder: [...new Set([
        ...(Array.isArray(saved.widgetOrder) ? saved.widgetOrder.filter(key => Object.prototype.hasOwnProperty.call(defaults.homeWidgets, key)) : []),
        ...Object.keys(defaults.homeWidgets)
      ])],
      sectionOrder: [...new Set([
        JOURNAL_ROOT,
        ...savedOrder.filter(path => validFolders.has(path) && path !== JOURNAL_ROOT),
        ...defaults.sectionOrder.filter(path => path !== JOURNAL_ROOT)
      ])],
      visibleSections: savedVisible
        ? savedVisible.filter(path => validFolders.has(path))
        : defaults.visibleSections,
      sectionColors: savedColors,
      sectionBanners: saved.sectionBanners && typeof saved.sectionBanners === "object"
        ? { ...defaults.sectionBanners, ...saved.sectionBanners }
        : defaults.sectionBanners
    };
  }

  async saveWorkspacePreferences(preferences) {
    const data = (await this.loadData()) || {};
    data.workspacePreferences = {
      homeWidgets: { daily: true, stats: true, sections: true, recent: true, quickActions: true, ...(preferences.homeWidgets || {}) },
      widgetOrder: Array.isArray(preferences.widgetOrder) ? preferences.widgetOrder : ["daily", "stats", "sections", "recent", "quickActions"],
      sectionOrder: Array.isArray(preferences.sectionOrder) ? preferences.sectionOrder : HOME_SECTION_CONFIG.map(section => section.folder),
      visibleSections: Array.isArray(preferences.visibleSections) ? preferences.visibleSections : HOME_SECTION_CONFIG.map(section => section.folder),
      sectionColors: preferences.sectionColors && typeof preferences.sectionColors === "object" ? preferences.sectionColors : {},
      sectionBanners: preferences.sectionBanners && typeof preferences.sectionBanners === "object" ? preferences.sectionBanners : {}
    };
    await this.saveData(data);
    this.workspacePrefsCache = await this.getWorkspacePreferences();
    this.applyExplorerPresentation();
    this.refreshGlobalDailyHeaders(true);
    await this.refreshHomeDashboard();
  }

  async refreshHomeDashboard() {
    const host = this.homeDashboardContainer;
    if (host?.isConnected) {
      await this.runDashboardRender(host, async () => {
        await this.renderHomeOverview(host);
      });
    }
  }

  scheduleHomeDashboardRepair(targetLeaf = null) {
    if (typeof window === "undefined") return;
    this.homeRepairTimers = this.homeRepairTimers || new Set();
    // One deferred repair is enough. forceRenderHomeDashboard now waits for
    // Obsidian's real processor host and serializes with the code-block processor.
    const timer = window.setTimeout(async () => {
      this.homeRepairTimers?.delete(timer);
      const leaves = targetLeaf ? [targetLeaf] : this.app.workspace.getLeavesOfType("markdown");
      for (const leaf of leaves) {
        if (leaf?.view?.getViewType?.() !== "markdown" || leaf.view.file?.path !== PATHS.home) continue;
        try {
          await this.forceRenderHomeDashboard(leaf);
        } catch (error) {
          console.warn("LIFORA deferred Home dashboard recovery did not complete.", error);
        }
      }
    }, 420);
    this.homeRepairTimers.add(timer);
  }

  scheduleSectionDashboardRepair(path, targetLeaf = null) {
    const section = SECTION_CONFIG.find(item => item.dashboard === path);
    const baseName = String(path || "").split("/").pop()?.toLowerCase() || "";
    let processor = section?.processor || "";
    let folderPath = section?.folder || "";

    if (!processor && (baseName === "folder dashboard.md" || baseName === "section dashboard.md")) {
      processor = "time-garden-section-overview";
      folderPath = String(path).slice(0, String(path).lastIndexOf("/"));
    }
    if (!processor) return;

    const expectedClass = {
      "time-garden-section-overview": "tg-section-dashboard",
      "time-garden-courses-overview": "tg-courses-app",
      "time-garden-books-overview": "tg-books-app",
      "time-garden-quran-overview": "tg-quran-app",
      "time-garden-languages-overview": "tg-languages-app"
    }[processor];
    if (!expectedClass) return;

    this.dashboardRepairTimers = this.dashboardRepairTimers || new Set();
    for (const delay of [180, 650, 1400]) {
      const timer = window.setTimeout(async () => {
        this.dashboardRepairTimers?.delete(timer);
        const leaves = targetLeaf ? [targetLeaf] : this.app.workspace.getLeavesOfType("markdown");
        for (const leaf of leaves) {
          const view = leaf?.view;
          if (view?.getViewType?.() !== "markdown" || view.file?.path !== path || !view.contentEl) continue;
          const viewRoot = view.contentEl.querySelector(".markdown-preview-view, .markdown-reading-view") || view.contentEl;
          let host = viewRoot.querySelector(`.block-language-${processor}`);
          if (!host) {
            const code = viewRoot.querySelector(`pre code.language-${processor}, pre code[class*="${processor}"]`);
            host = code?.closest?.(".el-pre") || code?.parentElement?.parentElement || null;
          }
          if (!host) {
            const sectionNode = viewRoot.querySelector(".markdown-preview-section") || viewRoot.querySelector(".markdown-preview-sizer") || viewRoot;
            host = document.createElement("div");
            host.className = `block-language-${processor} tg-dashboard-repair-host`;
            sectionNode.prepend(host);
          }

          await this.runDashboardRender(host, async () => {
            if (view.file?.path !== path) return;
            const rendered = host.classList.contains(expectedClass) &&
              (processor === "time-garden-section-overview"
                ? Boolean(host.querySelector(".tg-explorer-heading"))
                : Boolean(host.querySelector(".tg-global-day-header")));
            if (rendered) return;

            host.dataset.tgDashboardRepairing = "true";
            try {
              if (processor === "time-garden-section-overview") await this.renderSectionOverview(host, folderPath);
              else if (processor === "time-garden-courses-overview") await this.renderCoursesOverview(host);
              else if (processor === "time-garden-books-overview") await this.renderBooksOverview(host);
              else if (processor === "time-garden-quran-overview") await this.renderQuranOverview(host);
              else if (processor === "time-garden-languages-overview") await this.renderLanguagesOverview(host);
            } catch (error) {
              console.error(`LIFORA could not repair the ${path} dashboard; showing its folder contents.`, error);
              this.renderSectionFallback(host, folderPath, error);
            } finally {
              delete host.dataset.tgDashboardRepairing;
            }
          });
        }
      }, delay);
      this.dashboardRepairTimers.add(timer);
    }
  }

  async ensureSectionDashboardRendered(path, targetLeaf = null) {
    const section = SECTION_CONFIG.find(item => item.dashboard === path);
    const baseName = String(path || "").split("/").pop()?.toLowerCase() || "";
    let processor = section?.processor || "";
    let folderPath = section?.folder || "";

    if (!processor && (baseName === "folder dashboard.md" || baseName === "section dashboard.md")) {
      processor = "time-garden-section-overview";
      folderPath = String(path).slice(0, String(path).lastIndexOf("/"));
    }
    if (!processor) return;

    const expectedClass = {
      "time-garden-section-overview": "tg-section-dashboard",
      "time-garden-courses-overview": "tg-courses-app",
      "time-garden-books-overview": "tg-books-app",
      "time-garden-quran-overview": "tg-quran-app",
      "time-garden-languages-overview": "tg-languages-app"
    }[processor];
    if (!expectedClass) return;

    let leaf = targetLeaf;
    if (!leaf || leaf.view?.file?.path !== path) {
      leaf = this.app.workspace.getLeavesOfType("markdown")
        .find(candidate => candidate.view?.file?.path === path);
    }
    if (!leaf) return;

    await this.ensureDashboardPreview(leaf.view);
    await new Promise(resolve => {
      if (typeof window !== "undefined" && window.requestAnimationFrame) {
        window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
      } else setTimeout(resolve, 80);
    });

    const view = leaf.view;
    if (view?.getViewType?.() !== "markdown" || view.file?.path !== path || !view.contentEl) return;
    const viewRoot = view.contentEl.querySelector(".markdown-preview-view, .markdown-reading-view") || view.contentEl;
    let host = viewRoot.querySelector(`.block-language-${processor}`);
    if (!host) {
      const code = viewRoot.querySelector(`pre code.language-${processor}, pre code[class*=\"${processor}\"]`);
      host = code?.closest?.(".el-pre") || code?.parentElement?.parentElement || null;
    }
    if (!host) {
      const sectionNode = viewRoot.querySelector(".markdown-preview-section") ||
        viewRoot.querySelector(".markdown-preview-sizer") || viewRoot;
      host = document.createElement("div");
      host.className = `block-language-${processor} tg-dashboard-repair-host`;
      sectionNode.prepend(host);
    }

    await this.runDashboardRender(host, async () => {
      const currentView = leaf.view;
      if (currentView?.getViewType?.() !== "markdown" || currentView.file?.path !== path || !currentView.contentEl) return;
      const hasHeader = Boolean(host.querySelector(".tg-global-day-header"));
      const hasWorkspace = host.children.length > 1;
      if (host.classList.contains(expectedClass) && hasHeader && hasWorkspace) return;

      host.dataset.tgDashboardRepairing = "true";
      try {
        host.replaceChildren();
        if (processor === "time-garden-section-overview") await this.renderSectionOverview(host, folderPath);
        else if (processor === "time-garden-courses-overview") await this.renderCoursesOverview(host);
        else if (processor === "time-garden-books-overview") await this.renderBooksOverview(host);
        else if (processor === "time-garden-quran-overview") await this.renderQuranOverview(host);
        else if (processor === "time-garden-languages-overview") await this.renderLanguagesOverview(host);
      } catch (renderError) {
        console.error(`LIFORA direct dashboard recovery failed for ${path}.`, renderError);
        try {
          this.renderSectionFallback(host, folderPath, renderError);
        } catch (fallbackError) {
          console.error(`LIFORA fallback dashboard failed for ${path}.`, fallbackError);
          host.replaceChildren();
          const recovery = document.createElement("section");
          recovery.className = "tg-section-dashboard tg-section-recovery";
          const title = document.createElement("h2");
          title.textContent = section?.title || "Workspace";
          const message = document.createElement("p");
          message.textContent = "The enhanced workspace could not load. Your original files are safe; use the File Explorer to open them.";
          recovery.append(title, message);
          host.appendChild(recovery);
        }
      } finally {
        delete host.dataset.tgDashboardRepairing;
      }
    });
  }

  async ensureSectionDashboardRenderedSafely(path, targetLeaf = null) {
    try {
      await this.ensureSectionDashboardRendered(path, targetLeaf);
      return true;
    } catch (error) {
      console.error(`LIFORA could not mount the ${path} dashboard; rendering a minimal recovery surface.`, error);
      try {
        const leaf = targetLeaf || this.app.workspace.getLeavesOfType("markdown")
          .find(candidate => candidate.view?.file?.path === path);
        const view = leaf?.view;
        if (!view?.contentEl || view.file?.path !== path) return false;
        const root = view.contentEl.querySelector(".markdown-preview-view, .markdown-reading-view") || view.contentEl;
        const processor = SECTION_CONFIG.find(item => item.dashboard === path)?.processor ||
          (path.toLowerCase().endsWith("/folder dashboard.md") || path.toLowerCase().endsWith("/section dashboard.md")
            ? "time-garden-section-overview" : "");
        let host = processor ? root.querySelector(`.block-language-${processor}`) : null;
        if (!host) host = root.querySelector(".markdown-preview-section") || root.querySelector(".markdown-preview-sizer") || root;
        host.replaceChildren();
        const recovery = document.createElement("section");
        recovery.className = "tg-section-dashboard tg-section-recovery";
        const section = SECTION_CONFIG.find(item => item.dashboard === path);
        const heading = document.createElement("h2");
        heading.textContent = section?.title || path.split("/").pop()?.replace(/\.md$/i, "") || "Workspace";
        const message = document.createElement("p");
        message.textContent = "The enhanced workspace could not load. Your original folders and files are safe and remain available in the File Explorer.";
        recovery.append(heading, message);
        host.appendChild(recovery);
        return false;
      } catch (fallbackError) {
        console.error(`LIFORA minimal recovery surface failed for ${path}.`, fallbackError);
        return false;
      }
    }
  }

  async recordRecentActivity(path) {
    if (!path || path === PATHS.home || this.isPortableDataPath(path) ||
        path.startsWith(`${LEGACY_BACKUP_ROOT}/`) || path.startsWith("06 Templates/")) return;
    try {
      const file = this.app.vault.getAbstractFileByPath(path);
      const title = file instanceof TFile ? file.basename : path.split("/").pop();
      const data = (await this.loadData()) || {};
      const previous = Array.isArray(data.recentActivity) ? data.recentActivity : [];
      const next = [
        { path, title, openedAt: Date.now() },
        ...previous.filter(item => item && item.path !== path)
      ].slice(0, 12);
      data.recentActivity = next;
      await this.saveData(data);
    } catch (error) {
      console.warn("LIFORA could not update recent activity", error);
    }
  }

  async getRecentActivity(limit = 6) {
    const data = (await this.loadData()) || {};
    const items = Array.isArray(data.recentActivity) ? data.recentActivity : [];
    return items.filter(item => item && typeof item.path === "string" &&
      !item.path.startsWith("06 Templates/") &&
      !this.isPortableDataPath(item.path) &&
      this.app.vault.getAbstractFileByPath(item.path) instanceof TFile).slice(0, limit);
  }

  async removeDailyNavigationButtonsOnce() {
    try {
      const data = (await this.loadData()) || {};
      data.migrations = data.migrations && typeof data.migrations === "object" ? data.migrations : {};
      if (data.migrations.dailyNavigationButtonsRemovedV154) return;

      const dailyFiles = this.app.vault.getMarkdownFiles().filter(file =>
        file.path.startsWith("Journal/01 Daily/") &&
        /^\d{4}-\d{2}-\d{2}/.test(file.basename) &&
        !this.isSystemDashboardPath(file.path)
      );
      const invocation = /^`BUTTON\[prev-day,\s*current-week,\s*next-day\]`[ \t]*\r?\n?/gm;
      const buttonBlocks = /```meta-bind-button\s*\nid:\s*(?:prev-day|current-week|next-day)\s*\n[\s\S]*?```[ \t]*\r?\n?/gi;

      for (const file of dailyFiles) {
        const original = await this.app.vault.cachedRead(file);
        let cleaned = original.replace(invocation, "").replace(buttonBlocks, "");
        const exactReplacements = [
          ["# ✧ ", '# <span class="tg-inline-svg-icon tg-icon-sparkles" aria-hidden="true"></span> '],
          ["### 📁 Pictures", '### <span class="tg-inline-svg-icon tg-icon-folder" aria-hidden="true"></span> Pictures'],
          ["### ⚡︎ Quick Notes", '### <span class="tg-inline-svg-icon tg-icon-zap" aria-hidden="true"></span> Quick Notes'],
          ["### 🎯 Today's Focus", '### <span class="tg-inline-svg-icon tg-icon-target" aria-hidden="true"></span> Today\'s Focus'],
          ["### 🗓 Daily Schedule", '### <span class="tg-inline-svg-icon tg-icon-calendar" aria-hidden="true"></span> Daily Schedule'],
          ["### 🌿 Daily Reflection", '### <span class="tg-inline-svg-icon tg-icon-leaf" aria-hidden="true"></span> Daily Reflection'],
          ["label: ⚡ AI Rating + Alias", "label: AI Rating + Alias\nicon: sparkles"],
          ["label: ⭐ AI Rating", "label: AI Rating\nicon: star"],
          ["label: 🏷️ AI Alias", "label: AI Alias\nicon: tag"],
          ["label: 🎯 Progress", "label: Progress\nicon: target"],
          ["label: ✨ Highlight", "label: Highlight\nicon: highlighter"],
          ["label: 💡 Idea", "label: Idea\nicon: lightbulb"],
          ['label: 🔎 Ask your Day\nicon: ""', "label: Ask your Day\nicon: search"],
          ["title(⭐Rating)", "title(Rating)"]
        ];
        for (const [from, to] of exactReplacements) cleaned = cleaned.split(from).join(to);
        if (cleaned !== original) await this.app.vault.modify(file, cleaned);
      }

      data.migrations.dailyNavigationButtonsRemovedV154 = true;
      await this.saveData(data);
    } catch (error) {
      console.warn("LIFORA could not remove legacy daily navigation controls", error);
    }
  }

  getDailyNoteForDate(date = new Date()) {
    const dateKey = localISODate(date);
    return this.app.vault.getMarkdownFiles().find(file =>
      file.path.startsWith("Journal/01 Daily/") &&
      file.basename.startsWith(dateKey) &&
      !this.isSystemDashboardPath(file.path)
    ) || null;
  }


  collectBannerReferences(value, output = []) {
    if (Array.isArray(value)) {
      for (const item of value) this.collectBannerReferences(item, output);
    } else if (typeof value === "string" && value.trim()) {
      output.push(value.trim());
    } else if (value && typeof value === "object") {
      for (const key of ["path", "url", "src", "value"]) {
        if (typeof value[key] === "string" && value[key].trim()) output.push(value[key].trim());
      }
    }
    return output;
  }

  resolveBannerSource(value, sourcePath = "") {
    const references = this.collectBannerReferences(value);
    for (const rawValue of references) {
      const raw = String(rawValue).trim();
      const cleaned = raw
        .replace(/^!?\[\[/, "")
        .replace(/\]\]$/, "")
        .replace(/^!?\[/, "")
        .replace(/\]\([^)]*\)$/, "")
        .split("|")[0]
        .trim();

      if (/^https?:\/\//i.test(cleaned)) return { url: cleaned, file: null };

      const candidates = [cleaned];
      const basename = cleaned.split("/").pop();
      if (basename && basename !== cleaned) candidates.push(basename);
      if (basename) candidates.push(`06 Templates/Images/Daily Notes/${basename}`);

      for (const candidate of candidates) {
        const direct = this.app.vault.getAbstractFileByPath(candidate);
        if (direct instanceof TFile && /\.(png|jpe?g|webp|gif|avif|svg|mp4|mov)$/i.test(direct.extension || "")) {
          return { file: direct, url: "" };
        }
        if (sourcePath) {
          const resolved = this.app.metadataCache.getFirstLinkpathDest(candidate, sourcePath);
          if (resolved instanceof TFile && /\.(png|jpe?g|webp|gif|avif|svg|mp4|mov)$/i.test(resolved.extension || "")) {
            return { file: resolved, url: "" };
          }
        }
      }

      if (basename) {
        const match = this.app.vault.getFiles().find(file =>
          !this.isPortableDataPath(file.path) &&
          file.name.toLowerCase() === basename.toLowerCase() &&
          /\.(png|jpe?g|webp|gif|avif|svg|mp4|mov)$/i.test(file.extension || "")
        );
        if (match) return { file: match, url: "" };
      }
    }
    return null;
  }

  getBannerPosition(frontmatter = {}) {
    const parse = (value, fallback) => {
      const number = Number(value);
      return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : fallback;
    };
    return {
      x: parse(frontmatter["banner-x"] ?? frontmatter.banner_x, 50),
      y: parse(frontmatter["banner-y"] ?? frontmatter.banner_y, 50)
    };
  }

  getDailyCoverFile(dailyNote) {
    if (!(dailyNote instanceof TFile)) return null;
    const frontmatter = this.app.metadataCache.getFileCache(dailyNote)?.frontmatter || {};
    const banner = this.resolveBannerSource(frontmatter.banner, dailyNote.path);
    if (banner) return banner.file || banner.url;
    const candidates = [frontmatter.cover, frontmatter.cover_image, frontmatter.image];
    for (const value of candidates) {
      const resolved = this.resolveBannerSource(value, dailyNote.path);
      if (resolved) return resolved.file || resolved.url;
    }
    const cache = this.app.metadataCache.getFileCache(dailyNote);
    for (const embed of (cache?.embeds || [])) {
      const resolved = this.resolveBannerSource(embed.link, dailyNote.path);
      if (resolved) return resolved.file || resolved.url;
    }
    return null;
  }

  getDailyIdentityCover(date = new Date()) {
    const note = this.getDailyIdentityNote(date);
    const noteCover = note ? this.getDailyCoverFile(note) : null;
    if (noteCover) {
      const frontmatter = this.app.metadataCache.getFileCache(note)?.frontmatter || {};
      return { note, cover: noteCover, frontmatter };
    }

    // The original daily system stores one Pixel Banner image per weekday.
    // Resolve it directly so the shared header still works before today's note exists.
    const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
    const folder = "06 Templates/Images/Daily Notes";
    for (const extension of ["avif", "webp", "png", "jpg", "jpeg", "gif", "svg"]) {
      const file = this.app.vault.getAbstractFileByPath(`${folder}/${weekday}Banner.${extension}`);
      if (file instanceof TFile) return { note: note || null, cover: file, frontmatter: {} };
    }
    return { note: note || null, cover: null, frontmatter: {} };
  }

  getSectionBannerSource(sectionPath = "", bannerSourcePath = "", date = new Date()) {
    if (sectionPath) {
      const bannerPrefs = this.workspacePrefsCache?.sectionBanners?.[sectionPath] || {};
      const selectedImages = Array.isArray(bannerPrefs.images) ? bannerPrefs.images.filter(Boolean) : [];
      if (selectedImages.length) {
        let selected = selectedImages[0];
        if (bannerPrefs.mode !== "static") {
          const intervalHours = bannerPrefs.mode === "daily"
            ? 24
            : bannerPrefs.mode === "weekly"
              ? 168
              : Math.max(1, Number(bannerPrefs.intervalHours) || 24);
          const anchor = Number(bannerPrefs.anchor) || Date.UTC(2026, 0, 1);
          const elapsed = Math.max(0, date.getTime() - anchor);
          const position = Math.floor(elapsed / (intervalHours * 60 * 60 * 1000));
          selected = selectedImages[position % selectedImages.length];
        }
        const source = this.resolveBannerSource(selected, bannerSourcePath);
        if (source) return { ...source, frontmatter: {}, file: source.file };
      }
      const config = SECTION_CONFIG.find(item => item.folder === sectionPath);
      const weeklyBanners = [
        "06 Templates/Images/Weekly Notes/WeeklyBanner1.gif",
        "06 Templates/Images/Weekly Notes/WeeklyBanner2.gif",
        "06 Templates/Images/Weekly Notes/WeeklyBanner3.gif",
        "06 Templates/Images/Weekly Notes/WeeklyBanner4.gif"
      ];
      const monthlyBanners = [
        "06 Templates/Images/Monthly Notes/MonthlyBanner1.gif",
        "06 Templates/Images/Monthly Notes/MonthlyBanner2.gif",
        "06 Templates/Images/Monthly Notes/MonthlyBanner3.gif",
        "06 Templates/Images/Monthly Notes/MonthlyBanner4.gif"
      ];
      const quarterlyBanners = [
        "06 Templates/Images/Quarterly Notes/QuarterlyBanner1.gif",
        "06 Templates/Images/Quarterly Notes/QuarterlyBanner2.gif",
        "06 Templates/Images/Quarterly Notes/QuarterlyBanner3.gif",
        "06 Templates/Images/Quarterly Notes/QuarterlyBanner4.gif"
      ];
      const families = {
        "07 Notes": weeklyBanners,
        "08 Courses": monthlyBanners,
        "09 Books": quarterlyBanners,
        "10 Quran": quarterlyBanners,
        "11 Languages": weeklyBanners,
        "12 Goals": weeklyBanners,
        "13 Daily Planner": monthlyBanners,
        [DAILY_ROOT]: weeklyBanners,
        [WEEKLY_ROOT]: monthlyBanners
      };
      const family = families[sectionPath] || weeklyBanners;
      const offset = { "07 Notes": 0, "08 Courses": 1, "09 Books": 2, "10 Quran": 3, "11 Languages": 1, "12 Goals": 3, "13 Daily Planner": 2, [DAILY_ROOT]: 0, [WEEKLY_ROOT]: 1 }[sectionPath] || 0;
      const selected = family[(date.getDay() + offset) % family.length];
      const source = this.resolveBannerSource(selected, config?.dashboard || bannerSourcePath);
      if (source) return { ...source, frontmatter: {}, file: source.file };
    }

    const candidates = [];
    if (bannerSourcePath) candidates.push(bannerSourcePath);
    if (sectionPath) {
      const dashboardPath = this.getFolderDashboardPath(sectionPath);
      if (dashboardPath) candidates.push(dashboardPath);
      const config = SECTION_CONFIG.find(item => item.folder === sectionPath);
      if (config?.dashboard) candidates.push(config.dashboard);
    }
    if (!sectionPath && PATHS.home) candidates.push(PATHS.home);

    for (const path of [...new Set(candidates)]) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile)) continue;
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
      const source = this.resolveBannerSource(frontmatter.banner, file.path);
      if (source) return { ...source, frontmatter, file };
    }

    if (sectionPath) {
      const config = SECTION_CONFIG.find(item => item.folder === sectionPath);
      if (config?.banner) {
        const source = this.resolveBannerSource(config.banner, config.dashboard);
        if (source) return { ...source, frontmatter: {}, file: source.file };
      }
    }
    return null;
  }

  getDailyIdentityNote(date = new Date()) {
    const exact = this.getDailyNoteForDate(date);
    if (exact && this.getDailyCoverFile(exact)) return exact;
    const weekday = date.getDay();
    const matchingWeekday = this.getLatestDailyNotes(90).filter(file => {
      const match = file.basename.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!match) return false;
      const candidate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      return candidate.getDay() === weekday;
    });
    return matchingWeekday.find(file => this.getDailyCoverFile(file)) || exact || matchingWeekday[0] || null;
  }

  createLiforaSymbol(parent, className = "tg-lifora-symbol") {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", className);
    svg.setAttribute("viewBox", "0 0 48 48");
    svg.setAttribute("fill", "none");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "LIFORA symbol");
    svg.setAttribute("focusable", "false");

    const orbit = document.createElementNS(ns, "path");
    orbit.setAttribute("d", "M37.7 17.1a16.2 16.2 0 1 0 2.1 9.4");
    orbit.setAttribute("stroke", "#C5A66A");
    orbit.setAttribute("stroke-width", "2.2");
    orbit.setAttribute("stroke-linecap", "round");
    svg.appendChild(orbit);

    const letter = document.createElementNS(ns, "path");
    letter.setAttribute("d", "M17.2 11.8v24.4h16.1");
    letter.setAttribute("stroke", "#E9D9B8");
    letter.setAttribute("stroke-width", "3.2");
    letter.setAttribute("stroke-linecap", "round");
    letter.setAttribute("stroke-linejoin", "round");
    svg.appendChild(letter);

    const spark = document.createElementNS(ns, "path");
    spark.setAttribute("d", "M36.8 7.8v6.4M33.6 11h6.4");
    spark.setAttribute("stroke", "#E9D9B8");
    spark.setAttribute("stroke-width", "1.8");
    spark.setAttribute("stroke-linecap", "round");
    svg.appendChild(spark);

    parent.appendChild(svg);
    return svg;
  }

  

  updateGlobalDailyHeader(header, date = new Date(), force = false, sectionPath = "", bannerSourcePath = "") {
    if (!(header instanceof HTMLElement)) return;
    sectionPath = sectionPath || header.dataset.tgSection || "";
    bannerSourcePath = bannerSourcePath || header.dataset.tgBannerSourcePath || "";
    const dateKey = localISODate(date);
    if (!force && header.dataset.tgDate === dateKey && header.dataset.tgSection === sectionPath) return;

    header.empty();
    header.setAttribute("class", "tg-global-day-header");
    header.dataset.tgDate = dateKey;
    header.dataset.tgSection = sectionPath;
    header.dataset.tgBannerSourcePath = bannerSourcePath;

    const weekdayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const weekday = weekdayNames[date.getDay()];
    header.classList.add(`tg-global-day-${weekday}`);

    const identity = this.getDailyIdentityCover(date);
    const dailyNote = identity.note;
    const dailyFrontmatter = identity.frontmatter || {};
    const sectionBanner = this.getSectionBannerSource(sectionPath, bannerSourcePath, date);
    const selectedBanner = sectionBanner || {
      file: identity.cover instanceof TFile ? identity.cover : null,
      url: typeof identity.cover === "string" && /^https?:\/\//i.test(identity.cover) ? identity.cover : "",
      frontmatter: dailyFrontmatter
    };
    const frontmatter = selectedBanner.frontmatter || dailyFrontmatter;

    const palette = {
      sunday: "#a78bd2",
      monday: "#65a8dc",
      tuesday: "#55aa83",
      wednesday: "#d3ad59",
      thursday: "#55aaa3",
      friday: "#d58fa2",
      saturday: "#c78b59"
    };
    let accent = palette[weekday];
    const candidateAccent = frontmatter.day_color || frontmatter.accent_color || frontmatter.title_color;
    if (typeof candidateAccent === "string" && candidateAccent.trim()) {
      const value = candidateAccent.trim();
      const valid = /^#[0-9a-f]{3,8}$/i.test(value) ||
        /^(rgb|rgba|hsl|hsla)\(/i.test(value) ||
        (typeof CSS !== "undefined" && CSS.supports?.("color", value));
      if (valid) accent = value;
    }
    header.style.setProperty("--tg-global-day-accent", accent);

    const section = SECTION_CONFIG.find(item => item.folder === sectionPath);
    let sectionTitle = section?.title || "";
    let sectionIcon = section?.icon || "";
    if (!sectionTitle && sectionPath) {
      const folder = this.app.vault.getAbstractFileByPath(sectionPath);
      if (folder instanceof TFolder) sectionTitle = folder.name.replace(/^\d+\s*/, "");
      sectionIcon = this.getSectionIconName(sectionPath);
    }
    header.style.setProperty("--tg-section-accent", section?.color || accent);

    if (selectedBanner?.file instanceof TFile) {
      const imageUrl = this.app.vault.getResourcePath(selectedBanner.file);
      header.style.backgroundImage =
        `linear-gradient(180deg, rgba(12, 16, 18, .10) 0%, rgba(12, 16, 18, .64) 100%), url("${imageUrl}")`;
      header.classList.add(sectionBanner ? "has-section-cover" : "has-daily-cover");
      header.dataset.tgCoverPath = selectedBanner.file.path;
    } else if (selectedBanner?.url) {
      header.style.backgroundImage =
        `linear-gradient(180deg, rgba(12, 16, 18, .10) 0%, rgba(12, 16, 18, .64) 100%), url("${selectedBanner.url}")`;
      header.classList.add(sectionBanner ? "has-section-cover" : "has-daily-cover");
      header.dataset.tgCoverPath = selectedBanner.url;
    } else {
      header.style.backgroundImage =
        `linear-gradient(135deg, color-mix(in srgb, ${accent} 22%, var(--background-secondary)), var(--background-primary))`;
      header.classList.add("no-daily-cover");
      header.dataset.tgCoverPath = "";
    }

    const position = this.getBannerPosition(frontmatter);
    header.style.setProperty("background-position", `${position.x}% ${position.y}%`, "important");
    const requestedHeight = Number(frontmatter["banner-height"]);
    if (Number.isFinite(requestedHeight) && requestedHeight > 0) {
      const height = Math.max(220, Math.min(340, requestedHeight));
      header.style.setProperty("min-height", `${height}px`, "important");
      header.style.setProperty("max-height", `${height}px`, "important");
    }
    const requestedRadius = Number(frontmatter["banner-radius"]);
    if (Number.isFinite(requestedRadius) && requestedRadius > 0) {
      header.style.setProperty("border-radius", `${Math.max(12, Math.min(36, requestedRadius))}px`, "important");
    }
    header.style.setProperty("background-size", String(frontmatter["banner-display"] || "cover").toLowerCase() === "contain" ? "contain" : "cover", "important");
    header.style.setProperty("background-repeat", "no-repeat", "important");

    const content = header.createDiv({ cls: "tg-global-day-header-content" });

    if (sectionPath) {
      content.style.setProperty("display", "none", "important");
    } else {
      const context = content.createDiv({ cls: "tg-global-day-header-context" });
      this.createLiforaSymbol(context, "tg-lifora-context-symbol");
      const contextLabel = context.createSpan({ cls: "tg-global-day-header-context-label" });
      contextLabel.setText("LIFORA");

      const title = content.createDiv({ cls: "tg-global-day-header-title" });
    const mark = title.createSpan({ cls: "tg-global-day-header-mark tg-premium-svg-icon" });
    setIcon(mark, "sparkles");
    if (!mark.querySelector("svg")) setIcon(mark, "calendar-days");
      title.createSpan({
        cls: "tg-global-day-header-date",
        text: date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "2-digit",
          year: "numeric"
        })
      });
    }
    header.setAttribute("aria-label", sectionPath ? `${sectionTitle || "LIFORA"} section banner` : `LIFORA home daily identity: ${dateKey}`);
  }

  renderGlobalDailyHeader(parent, sectionPath = "", bannerSourcePath = "") {
    parent.querySelectorAll?.(":scope > .tg-global-day-header").forEach(existing => existing.remove());
    const viewRoot = parent.closest?.(".markdown-preview-view, .markdown-source-view, .markdown-reading-view");
    if (viewRoot) {
      viewRoot.classList.add("tg-dashboard-wide-view");
      viewRoot.style.setProperty("--file-line-width", "100%", "important");
      viewRoot.style.setProperty("--line-width", "100%", "important");
      viewRoot.style.setProperty("max-width", "none", "important");
    }
    parent.classList.add("tg-dashboard-wide-content");
    const host = parent.closest?.(
      ".block-language-time-garden-home-overview, .block-language-time-garden-section-overview, " +
      ".block-language-time-garden-courses-overview, .block-language-time-garden-books-overview, " +
      ".block-language-time-garden-quran-overview, .block-language-time-garden-languages-overview"
    );
    if (host) host.classList.add("tg-dashboard-wide-host");

    // Obsidian may wrap a dashboard in extra reading-width containers.
    // Expand the complete path from the code block to the active note view.
    let ancestor = parent;
    while (ancestor && ancestor !== viewRoot) {
      if (ancestor instanceof HTMLElement) {
        ancestor.classList.add("tg-dashboard-wide-parent");
        ancestor.style.setProperty("width", "100%", "important");
        ancestor.style.setProperty("max-width", "none", "important");
        ancestor.style.setProperty("min-width", "0", "important");
        ancestor.style.setProperty("margin-inline", "0", "important");
        ancestor.style.setProperty("box-sizing", "border-box", "important");
      }
      ancestor = ancestor.parentElement;
    }

    if (viewRoot) {
      for (const selector of [".markdown-preview-sizer", ".markdown-preview-section", ".cm-sizer", ".cm-contentContainer", ".cm-content"]) {
        const container = viewRoot.querySelector(selector);
        if (container) {
          container.style.setProperty("width", "100%", "important");
          container.style.setProperty("max-width", "none", "important");
          container.style.setProperty("min-width", "0", "important");
          container.style.setProperty("margin-inline", "0", "important");
          container.style.setProperty("box-sizing", "border-box", "important");
        }
      }
    }
    const header = parent.createDiv({ cls: "tg-global-day-header" });
    header.dataset.tgSection = sectionPath || "";
    header.dataset.tgBannerSourcePath = bannerSourcePath || "";
    this.updateGlobalDailyHeader(header, new Date(), true, sectionPath, bannerSourcePath);
    return header;
  }

  refreshGlobalDailyHeaders(force = false) {
    const root = this.app.workspace.containerEl || document;
    for (const header of root.querySelectorAll(".tg-global-day-header")) {
      this.updateGlobalDailyHeader(
        header,
        new Date(),
        force,
        header.dataset.tgSection || "",
        header.dataset.tgBannerSourcePath || ""
      );
    }
  }

  getLatestDailyNotes(limit = 7) {
    return this.app.vault.getMarkdownFiles()
      .filter(file => file.path.startsWith("Journal/01 Daily/") &&
        /^\d{4}-\d{2}-\d{2}/.test(file.basename) &&
        !this.isSystemDashboardPath(file.path))
      .sort((a, b) => b.basename.localeCompare(a.basename))
      .slice(0, limit);
  }

  getISOWeekInfo(date = new Date()) {
    const value = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const weekday = value.getUTCDay() || 7;
    value.setUTCDate(value.getUTCDate() + 4 - weekday);
    const year = value.getUTCFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const week = Math.ceil((((value - yearStart) / 86400000) + 1) / 7);
    return { year, week, label: `${year}-W${String(week).padStart(2, "0")}` };
  }

  async createTemplatedJournalNote(templatePath, folderPath, title) {
    await this.ensureFolder(folderPath);
    const targetPath = `${folderPath}/${title}.md`;
    const existing = this.app.vault.getAbstractFileByPath(targetPath);
    if (existing instanceof TFile) {
      await this.openNote(existing.path);
      return existing;
    }

    const template = this.app.vault.getAbstractFileByPath(templatePath);
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    const templaterPlugin = this.app.plugins?.plugins?.["templater-obsidian"];
    const templater = templaterPlugin?.templater;
    if (!(template instanceof TFile) || !(folder instanceof TFolder) ||
        typeof templater?.create_new_note_from_template !== "function") {
      new Notice("The journal template service is unavailable. Check that Templater is enabled.");
      return null;
    }

    const created = await templater.create_new_note_from_template(template, folder, title, true);
    if (created instanceof TFile) {
      void this.recordRecentActivity(created.path);
      return created;
    }

    const resolved = this.app.vault.getAbstractFileByPath(targetPath);
    if (resolved instanceof TFile) {
      void this.recordRecentActivity(resolved.path);
      return resolved;
    }
    return null;
  }

  async createDailyJournal(date = new Date()) {
    const existing = this.getDailyNoteForDate(date);
    if (existing) {
      await this.openNote(existing.path);
      return existing;
    }
    const dateKey = localISODate(date);
    const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const monthName = date.toLocaleDateString("en-US", { month: "long" });
    const folderPath = `${DAILY_ROOT}/${year}/${month}-${monthName}`;
    return this.createTemplatedJournalNote(DAILY_TEMPLATE_PATH, folderPath, `${dateKey}-${weekday}`);
  }

  async createWeeklyPlan(date = new Date()) {
    const { year, label } = this.getISOWeekInfo(date);
    const folderPath = `${WEEKLY_ROOT}/${year}`;
    return this.createTemplatedJournalNote(WEEKLY_TEMPLATE_PATH, folderPath, label);
  }

  getLatestWeeklyPlans(limit = 5) {
    return this.app.vault.getMarkdownFiles()
      .filter(file => file.path.startsWith(`${WEEKLY_ROOT}/`) && /^\d{4}-W\d{2}$/i.test(file.basename))
      .sort((a, b) => b.basename.localeCompare(a.basename))
      .slice(0, limit);
  }

  async openTodayJournal() {
    return this.createDailyJournal(new Date());
  }

  openGlobalSearch() {
    new TimeGardenGlobalSearchModal(this.app, this).open();
  }

  getValidUiTheme(id) {
    return LIFORA_THEME_PRESETS.find(theme => theme.id === id) || LIFORA_THEME_PRESETS[0];
  }

  async getUiThemePreference() {
    const state = (await this.loadData()) || {};
    return this.getValidUiTheme(state.uiThemeId).id;
  }

  applyUiTheme(id) {
    const theme = this.getValidUiTheme(id);
    if (typeof document === "undefined" || !document.body) return theme.id;
    if (theme.mode === "native") {
      document.body.removeAttribute("data-lifora-theme");
      document.body.removeAttribute("data-lifora-mode");
    } else {
      document.body.setAttribute("data-lifora-theme", theme.id);
      document.body.setAttribute("data-lifora-mode", theme.mode);
    }
    return theme.id;
  }

  async saveUiTheme(id) {
    const theme = this.getValidUiTheme(id);
    const state = (await this.loadData()) || {};
    await this.saveData({ ...state, uiThemeId: theme.id });
    this.applyUiTheme(theme.id);
    return theme.id;
  }

  openThemeGallery() {
    new TimeGardenThemeGalleryModal(this.app, this).open();
  }

  openPersonalizationCenter() {
    new TimeGardenPersonalizationModal(this.app, this).open();
  }

  openBackupCenter() {
    new TimeGardenBackupModal(this.app, this).open();
  }

  canUseFullVaultBackups() {
    // Desktop Electron supplies Node's filesystem APIs; mobile Android does not.
    try { return !require("obsidian").Platform.isMobile && typeof this.app.vault.adapter.getBasePath === "function" && Boolean(require("fs").promises); }
    catch (error) { return false; }
  }

  fullBackupEngine() {
    if (!this.canUseFullVaultBackups()) throw new Error("Full Vault Backup is available in Obsidian Desktop only.");
    const nodePath = require("path");
    const pluginPath = nodePath.join(this.app.vault.adapter.getBasePath(), ".obsidian", "plugins", "time-garden-navigator", "lifora-full-backup.js");
    return require(pluginPath);
  }

  async pickFullBackupDirectory() {
    if (!this.canUseFullVaultBackups()) throw new Error("This device cannot select a computer folder.");
    let dialog=null;
    try { dialog=require("@electron/remote").dialog; } catch (error) { /* fall back */ }
    if (!dialog) { try { dialog=require("electron").remote?.dialog; } catch (error) { /* manual path still works */ } }
    if (!dialog) throw new Error("System folder picker is not exposed by this Obsidian version");
    const options={properties:["openDirectory","createDirectory"],title:"Choose LIFORA Full Backup Folder"};
    const result=await dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths?.length) return "";
    return result.filePaths[0];
  }

  async saveFullBackupFolder(folder) {
    const engine=this.fullBackupEngine();
    const vault=this.app.vault.adapter.getBasePath();
    const {root}=engine.validateDestination(vault,folder);
    const fs=require("fs").promises;
    await fs.mkdir(root,{recursive:true});
    if (!(await fs.stat(root)).isDirectory()) throw new Error("Backup destination is not a folder.");
    const latest=(await this.loadData()) || {};
    await this.saveData({...latest,fullBackupFolder:root});
  }

  async getVaultBackups() {
    if (!this.canUseFullVaultBackups()) return [];
    const settings=(await this.loadData()) || {};
    if (!settings.fullBackupFolder) return [];
    return this.fullBackupEngine().listBackups(this.app.vault.adapter.getBasePath(),settings.fullBackupFolder);
  }

  async verifyVaultBackup(id) {
    const settings=(await this.loadData()) || {};
    if (!settings.fullBackupFolder) throw new Error("Backup destination was not selected.");
    return this.fullBackupEngine().verifyBackup(this.app.vault.adapter.getBasePath(),settings.fullBackupFolder,id);
  }

  async createVaultBackup(showNotice=true, rotate=true, kind="Backup") {
    if (this.portableBackupInProgress || this.portableRestoreInProgress) throw new Error("Another backup/restore operation is running.");
    if (!this.canUseFullVaultBackups()) throw new Error("A desktop computer is required to create a full Vault backup.");
    const settings=(await this.loadData()) || {};
    if (!settings.fullBackupFolder) throw new Error("Choose a destination in Backup Center first.");
    this.portableBackupInProgress=true;
    try {
      // The working Vault files are authoritative. Allow queued portable mirrors to finish
      // so DATA and plugin preferences are included alongside ordinary course files.
      if (this.portableDataReady) {
        await this.flushPortableDataQueue();
        await this.snapshotPortableData();
        await this.snapshotPortableSettings();
        await this.writePortableDataManifest();
      }
      const result=await this.fullBackupEngine().createBackup(this.app.vault.adapter.getBasePath(),settings.fullBackupFolder,3);
      if(showNotice)new Notice(`Full Vault backup verified: ${result.fileCount} files. 3 most recent backups retained.`,7000);
      return result.path;
    } finally {this.portableBackupInProgress=false;}
  }

  async restoreVaultBackup(id) {
    // A byte-for-byte, exact restore including plugin JS, themes, and deleted files
    // is unsafe while Obsidian is running. Verify and produce an offline launcher.
    const engine=this.fullBackupEngine();
    const settings=(await this.loadData()) || {};
    if(!settings.fullBackupFolder)throw new Error("Choose a backup destination first.");
    await engine.verifyBackup(this.app.vault.adapter.getBasePath(),settings.fullBackupFolder,id);
    const fs=require("fs").promises;
    const path=require("path");
    const root=settings.fullBackupFolder;
    const source=path.join(this.app.vault.adapter.getBasePath(),".obsidian","plugins","time-garden-navigator","LIFORA-Restore.ps1");
    const target=path.join(root,"LIFORA-Restore.ps1");
    await fs.copyFile(source,target);
    await fs.writeFile(path.join(root,"LIFORA-restore-plan.json"),JSON.stringify({
      planVersion:1,vaultPath:this.app.vault.adapter.getBasePath(),backupRoot:root,backupId:id
    },null,2),"utf8");
    const launcher='@echo off\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0LIFORA-Restore.ps1" -PlanPath "%~dp0LIFORA-restore-plan.json"\r\necho.\r\npause\r\n';
    await fs.writeFile(path.join(root,"LIFORA-RESTORE.cmd"),launcher,"utf8");
    return {folder:root,id};
  }

  async openReviewNote(type = "weekly") {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    let path = "";
    let content = "";
    if (type === "monthly") {
      const monthName = now.toLocaleDateString(undefined, { month: "long" });
      path = `Journal/02 Weekly/Reviews/${year}-${month}-Monthly Review.md`;
      content = `---\ntype: monthly-review\nyear: ${year}\nmonth: ${month}\ncreated: ${localISODate(now)}\ntags:\n  - time-garden-review\n  - monthly-review\n---\n\n# Monthly Review — ${monthName} ${year}\n\n## Highlights\n- \n\n## What moved forward?\n- \n\n## Learning, books, and personal growth\n- \n\n## What needs to change?\n- \n\n## Lessons worth keeping\n- \n\n## Next month's focus\n- \n`;
    } else {
      const weekDate = new Date(Date.UTC(year, now.getMonth(), now.getDate()));
      const day = weekDate.getUTCDay() || 7;
      weekDate.setUTCDate(weekDate.getUTCDate() + 4 - day);
      const isoYear = weekDate.getUTCFullYear();
      const yearStart = new Date(Date.UTC(isoYear, 0, 1));
      const week = Math.ceil((((weekDate - yearStart) / 86400000) + 1) / 7);
      const weekLabel = `W${String(week).padStart(2, "0")}`;
      path = `Journal/02 Weekly/Reviews/${isoYear}-${weekLabel}-Weekly Review.md`;
      content = `---\ntype: weekly-review\nyear: ${isoYear}\nweek: ${week}\ncreated: ${localISODate(now)}\ntags:\n  - time-garden-review\n  - weekly-review\n---\n\n# Weekly Review — ${isoYear} · ${weekLabel}\n\n## What went well this week?\n- \n\n## What did I complete?\n- \n\n## What remains unfinished, and why?\n- \n\n## What did I learn?\n- \n\n## What needs my attention?\n- \n\n## Three priorities for next week\n1. \n2. \n3. \n`;
    }
    await this.ensureFolder(path.slice(0, path.lastIndexOf("/")));
    let file = this.app.vault.getAbstractFileByPath(path);
    if (!file) file = await this.app.vault.create(path, content);
    if (file instanceof TFile) await this.openNote(file.path);
  }

  renderReviewHighlights(parent) {
    const now = new Date();
    const weekInfo = this.getISOWeekInfo(now);
    const currentPath = `${WEEKLY_ROOT}/${weekInfo.year}/${weekInfo.label}.md`;
    const currentPlan = this.app.vault.getAbstractFileByPath(currentPath);
    const plans = this.getLatestWeeklyPlans(5);

    const panel = parent.createDiv({ cls: "tg-weekly-workspace-panel" });
    const head = panel.createDiv({ cls: "tg-weekly-workspace-top" });
    const copy = head.createDiv({ cls: "tg-weekly-workspace-copy" });
    copy.createDiv({ cls: "tg-home-eyebrow", text: "PLAN • REFLECT • RESET" });
    copy.createEl("h3", { text: "Your weekly workspace" });
    copy.createEl("p", { text: "Create this week's plan, write your priorities, and review your progress when you are ready." });

    const actions = head.createDiv({ cls: "tg-weekly-workspace-actions" });
    const planButton = actions.createEl("button", { cls: "tg-course-btn tg-course-btn-primary", attr: { type: "button" } });
    this.setButtonIcon(planButton, currentPlan instanceof TFile ? "book-open" : "plus");
    planButton.createSpan({ text: currentPlan instanceof TFile ? "Open this week's plan" : "Create this week's plan" });
    planButton.addEventListener("click", () => this.createWeeklyPlan(now));

    const weeklyReview = this.iconButton(actions, "Weekly review", "calendar-check", "tg-course-btn tg-course-btn-muted");
    weeklyReview.addEventListener("click", () => this.openReviewNote("weekly"));
    const monthlyReview = this.iconButton(actions, "Monthly review", "calendar-days", "tg-course-btn tg-course-btn-muted");
    monthlyReview.addEventListener("click", () => this.openReviewNote("monthly"));

    const recentSection = panel.createDiv({ cls: "tg-weekly-recent-section" });
    const recentHeader = recentSection.createDiv({ cls: "tg-weekly-recent-heading" });
    recentHeader.createEl("strong", { text: "Recent weekly plans" });
    recentHeader.createSpan({ text: `${plans.length} shown` });
    const list = recentSection.createDiv({ cls: "tg-weekly-recent-list" });
    if (!plans.length) {
      list.createDiv({ cls: "tg-home-recent-empty", text: "Your weekly plans will appear here after you create the first one." });
    } else {
      for (const file of plans) {
        const button = list.createEl("button", { cls: "tg-weekly-recent-item", attr: { type: "button" } });
        const body = button.createDiv({ cls: "tg-weekly-recent-copy" });
        body.createEl("strong", { text: file.basename });
        body.createSpan({ text: file.path });
        this.createPremiumIcon(button, "arrow-up-right", "tg-weekly-recent-arrow tg-premium-svg-icon", "Open weekly plan");
        button.addEventListener("click", () => this.openNote(file.path));
      }
    }
  }

  async searchVault(query, limit = 30) {
    const needle = String(query || "").trim().toLowerCase();
    if (!needle) return [];
    const files = this.app.vault.getMarkdownFiles().filter(file =>
      !file.path.startsWith(`${LEGACY_BACKUP_ROOT}/`) &&
      !file.path.startsWith("06 Templates/") &&
      !this.isPortableDataPath(file.path)
    );
    const results = [];
    for (const file of files) {
      if (results.length >= limit) break;
      const title = file.basename.toLowerCase();
      if (title.includes(needle)) {
        results.push({ file, snippet: "Title match" });
        continue;
      }
      try {
        const content = (await this.app.vault.cachedRead(file)).toLowerCase();
        const index = content.indexOf(needle);
        if (index >= 0) {
          const start = Math.max(0, index - 65);
          const end = Math.min(content.length, index + needle.length + 95);
          results.push({ file, snippet: content.slice(start, end).replace(/\s+/g, " ") });
        }
      } catch (error) {
        console.warn(`Could not search ${file.path}`, error);
      }
    }
    return results;
  }

  async ensureFolder(path) {
    const parts = path.split("/");
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!this.app.vault.getAbstractFileByPath(current)) {
        await this.app.vault.createFolder(current);
      }
    }
  }

  getCourseFiles() {
    return this.app.vault.getMarkdownFiles().filter(file => {
      if (file.basename.toLowerCase() !== "course dashboard") return false;
      if (this.isPortableDataPath(file.path) || file.path.startsWith(`${LEGACY_BACKUP_ROOT}/`) ||
          file.path.startsWith("06 Templates/")) return false;
      // Trust the real Markdown file rather than waiting for YAML metadata indexing.
      // New and Syncthing-imported courses show immediately, including custom folders.
      return true;
    });
  }

  getAllFolderPaths() {
    return this.app.vault.getAllLoadedFiles()
      .filter(item => item instanceof TFolder)
      .map(folder => folder.path)
      .filter(path => path && path !== "/" && !this.isPortableDataPath(path))
      .sort((a, b) => a.localeCompare(b));
  }

  getCourseData(file) {
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
    const folderPath = file.path.slice(0, file.path.lastIndexOf("/"));
    const inferredName = folderPath.split("/").pop() || file.basename;
    const name = (!fm.course || fm.course === "New Course") ? inferredName : fm.course;
    const topics = Array.isArray(fm.topics) ? fm.topics : [];
    const progressTracking = fm.progress_tracking === true || fm.progress_tracking === "true";
    const topicStats = progressTracking && topics.length ? this.getCourseTopicStats(topics) : null;
    const topicProgress = topicStats ? topicStats.percent : null;
    return {
      file,
      folderPath,
      name,
      platform: fm.platform || "",
      instructor: fm.instructor || "",
      status: fm.status || "planned",
      progress: topicProgress === null ? clampProgress(fm.progress) : topicProgress,
      progressTracking,
      topics,
      start_date: fm.start_date || "",
      target_date: fm.target_date || "",
      course_url: fm.course_url || "",
      course_color: fm.course_color || colorForStatus(fm.status || "planned")
    };
  }

  async migrateCourseDashboards() {
    for (const file of this.getCourseFiles()) {
      const data = this.getCourseData(file);
      const category = data.folderPath.split("/")[1] || "";
      const fm = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
      const needsName = !fm.course || fm.course === "New Course";
      const needsStatus = fm.status === "planned" && category === "01 In Progress";
      const needsColor = !fm.course_color;

      if (needsName || needsStatus || needsColor) {
        await this.app.fileManager.processFrontMatter(file, frontmatter => {
          if (needsName) frontmatter.course = data.name;
          if (needsStatus) frontmatter.status = "in-progress";
          if (needsColor) frontmatter.course_color = colorForStatus(needsStatus ? "in-progress" : data.status);
        });
      }

      // Add the live dashboard panel without replacing the user's study notes.
      const currentContent = await this.app.vault.read(file);
      if (!currentContent.includes("```time-garden-course-panel")) {
        const frontmatterMatch = currentContent.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
        const frontmatterEnd = frontmatterMatch ? frontmatterMatch[0].length : 0;
        const rest = currentContent.slice(frontmatterEnd);
        const headingMatch = rest.match(/^(# .+\r?\n)/);
        const insertion = "\n```time-garden-course-panel\n```\n";
        let upgraded;
        if (headingMatch) {
          const point = frontmatterEnd + headingMatch[0].length;
          upgraded = currentContent.slice(0, point) + insertion + currentContent.slice(point);
        } else {
          upgraded = currentContent.slice(0, frontmatterEnd) + insertion + currentContent.slice(frontmatterEnd);
        }
        await this.app.vault.modify(file, upgraded);
      }
    }
  }

  applyCourseFolderColors() {
    if (!this.courseColorStyle) return;
    const rules = [];
    for (const file of this.getCourseFiles()) {
      const data = this.getCourseData(file);
      const path = data.folderPath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const color = /^#[0-9a-f]{6}$/i.test(data.course_color) ? data.course_color : "#65a8dc";
      rules.push(`
        .nav-folder-title[data-path="${path}"] .nav-folder-title-content,
        .nav-folder-title[data-path^="${path}/"] .nav-folder-title-content {
          color: ${color} !important;
        }
        .nav-folder-title[data-path="${path}"] .nav-folder-title-content::before {
          content: "";
          display: inline-block;
          width: 7px;
          height: 7px;
          margin-inline-end: 7px;
          border-radius: 50%;
          background: ${color};
          vertical-align: middle;
        }
      `);
    }
    this.courseColorStyle.textContent = rules.join("\n");
  }


  async ensureDashboardNote(path, title, processor, source = "", cssClass = "timegarden-section-dashboard", description = "") {
    const parent = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
    if (parent) await this.ensureFolder(parent);
    let file = this.app.vault.getAbstractFileByPath(path);
    if (!file) {
      const block = `\`\`\`${processor}\n${source}\n\`\`\``;
      const content = [
        "---",
        "cssclasses:",
        `  - ${cssClass}`,
        "  - timegarden-dashboard",
        "tags:",
        "  - time-garden-system-dashboard",
        "---",
        "",
        `# ${title}`,
        "",
        description,
        "",
        block,
        ""
      ].filter((line, index, array) => !(line === "" && array[index - 1] === "")).join("\n");
      file = await this.app.vault.create(path, content);
    } else if (!(file instanceof TFile)) {
      throw new Error(`Dashboard path is not a file: ${path}`);
    } else {
      let content = await this.app.vault.read(file);
      const marker = `\`\`\`${processor}`;
      if (!content.includes(marker)) {
        const block = `\`\`\`${processor}\n${source}\n\`\`\``;
        const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/);
        if (match) {
          content = `${match[0]}\n${block}\n\n${content.slice(match[0].length)}`;
        } else {
          content = `---\ncssclasses:\n  - ${cssClass}\n  - timegarden-dashboard\ntags:\n  - time-garden-system-dashboard\n---\n\n${block}\n\n${content}`;
        }
        await this.app.vault.modify(file, content);
      }
      await this.app.fileManager.processFrontMatter(file, fm => {
        const classes = Array.isArray(fm.cssclasses) ? fm.cssclasses : (fm.cssclasses ? [fm.cssclasses] : []);
        if (!classes.includes(cssClass)) classes.push(cssClass);
        if (!classes.includes("timegarden-dashboard")) classes.push("timegarden-dashboard");
        fm.cssclasses = classes;
        const tags = Array.isArray(fm.tags) ? fm.tags : (fm.tags ? [fm.tags] : []);
        if (!tags.includes("time-garden-system-dashboard")) tags.push("time-garden-system-dashboard");
        fm.tags = tags;
      });
    }
    if (file instanceof TFile && (
      path === PATHS.home || SECTION_CONFIG.some(section => section.dashboard === path)
    )) {
      let dashboardContent = await this.app.vault.read(file);
      const processorMarker = `\`\`\`${processor}`;
      const markerIndex = dashboardContent.indexOf(processorMarker);
      if (markerIndex >= 0) {
        const prefix = dashboardContent.slice(0, markerIndex);
        const frontmatter = prefix.match(/^---\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/);
        const frontmatterLength = frontmatter ? frontmatter[0].length : 0;
        const beforeBlock = dashboardContent.slice(frontmatterLength, markerIndex);
        const lines = beforeBlock.split(/\r?\n/);
        const headingIndex = lines.findIndex(line => /^\s*#\s+/.test(line));
        if (headingIndex >= 0) {
          lines.splice(headingIndex, 1);
          if (lines[headingIndex] !== undefined && !lines[headingIndex].trim()) lines.splice(headingIndex, 1);
          if (description && lines[headingIndex]?.trim() === description.trim()) {
            lines.splice(headingIndex, 1);
            if (lines[headingIndex] !== undefined && !lines[headingIndex].trim()) lines.splice(headingIndex, 1);
          }
          const cleanPrefix = dashboardContent.slice(0, frontmatterLength) + lines.join("\n");
          dashboardContent = cleanPrefix.replace(/\n+$/, "\n\n") + dashboardContent.slice(markerIndex);
          await this.app.vault.modify(file, dashboardContent);
        }
      }
    }
    return file;
  }

  async ensureHomeDashboard() {
    await this.ensureDashboardNote(
      PATHS.home,
      "LIFORA",
      "time-garden-home-overview",
      "",
      "timegarden-home",
      "Your personal space to organize, learn, read, reflect, and grow."
    );
  }

  async ensureCoreSectionDashboards() {
    const core = SECTION_CONFIG.filter(section =>
      ["Journal/01 Daily", "Journal/02 Weekly", "06 Templates", "07 Notes", "08 Courses"].includes(section.folder)
    );
    for (const section of core) {
      await this.ensureFolder(section.folder);
      await this.ensureDashboardNote(
        section.dashboard,
        section.title,
        section.processor,
        section.processor === "time-garden-section-overview" ? section.folder : "",
        "timegarden-section-dashboard",
        section.description
      );
    }
  }

  getExplorerItemPath(node) {
    let current = node;
    while (current && current !== document.body) {
      const path = current.getAttribute?.("data-path") || current.dataset?.path;
      if (path) return String(path);
      current = current.parentElement;
    }
    return "";
  }

  getFolderDashboardPath(folderPath) {
    if (!folderPath || folderPath === "00 Dashboard" || folderPath.startsWith(".obsidian")) return "";
    const section = SECTION_CONFIG.find(item => item.folder === folderPath);
    if (section) return section.dashboard;

    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof TFolder)) return "";
    const candidates = [
      "Course Dashboard.md",
      "Book Dashboard.md",
      "Language Dashboard.md",
      "Folder Dashboard.md",
      "Section Dashboard.md"
    ];
    for (const name of candidates) {
      const child = folder.children.find(item => item instanceof TFile && item.name.toLowerCase() === name.toLowerCase());
      if (child) return child.path;
    }

    // A real folder always gets a small, hidden dashboard note when opened by its title.
    return `${folderPath}/${folderPath.includes("/") ? "Folder Dashboard.md" : "Section Dashboard.md"}`;
  }


  getPlainFolderNotesPath(folderPath) {
    if (!folderPath) return "";
    return `${folderPath}/Folder Notes.md`;
  }

  async ensurePlainFolderNotesNote(folderPath) {
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof TFolder)) throw new Error("Folder not found.");
    const path = this.getPlainFolderNotesPath(folderPath);
    const parent = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
    if (parent) await this.ensureFolder(parent);

    let file = this.app.vault.getAbstractFileByPath(path);
    const block = `\`\`\`time-garden-folder-notes
${folderPath}
\`\`\``;
    const content = [
      "---",
      "cssclasses:",
      "  - timegarden-plain-folder-notes",
      "tags:",
      "  - time-garden-system-dashboard",
      "---",
      "",
      block,
      ""
    ].join("\n");

    if (!file) {
      file = await this.app.vault.create(path, content);
    } else if (!(file instanceof TFile)) {
      throw new Error(`Notes view path is not a file: ${path}`);
    } else {
      let current = await this.app.vault.read(file);
      if (!current.includes("```time-garden-folder-notes")) {
        await this.app.vault.modify(file, content);
      } else {
        const updated = current.replace(/```time-garden-folder-notes[\s\S]*?```/, block);
        if (updated !== current) await this.app.vault.modify(file, updated);
      }
      await this.app.fileManager.processFrontMatter(file, fm => {
        const classes = Array.isArray(fm.cssclasses) ? fm.cssclasses : (fm.cssclasses ? [fm.cssclasses] : []);
        if (!classes.includes("timegarden-plain-folder-notes")) classes.push("timegarden-plain-folder-notes");
        fm.cssclasses = classes;
        const tags = Array.isArray(fm.tags) ? fm.tags : (fm.tags ? [fm.tags] : []);
        if (!tags.includes("time-garden-system-dashboard")) tags.push("time-garden-system-dashboard");
        fm.tags = tags;
      });
    }
    return file;
  }

  async openFolderNotesView(folderPath) {
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof TFolder)) {
      new Notice("This folder no longer exists in the vault.");
      return;
    }
    try {
      const noteFile = await this.ensurePlainFolderNotesNote(folderPath);
      let leaf = this.app.workspace.getLeavesOfType("markdown")
        .find(candidate => candidate.view?.file?.path === noteFile.path);
      if (!leaf) leaf = this.getUsableNavigationLeaf();
      await leaf.openFile(noteFile);
      this.navigationLeaf = leaf;
      await this.app.workspace.revealLeaf(leaf);
    } catch (error) {
      console.error(`LIFORA could not open the notes list for ${folderPath}.`, error);
      new Notice(`Could not open the notes list for ${folder.name}. Your notes are safe.`);
    }
  }

  async renderPlainFolderNotes(el, folderPath) {
    el.empty();
    el.addClass("tg-plain-folder-notes");

    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof TFolder)) {
      el.createEl("p", { text: "This folder no longer exists." });
      return;
    }

    const notes = folder.children
      .filter(item =>
        item instanceof TFile &&
        item.extension === "md" &&
        !this.isSystemDashboardPath(item.path)
      )
      .sort((a, b) => a.basename.localeCompare(b.basename));

    const meta = el.createDiv({ cls: "tg-plain-folder-notes-meta" });
    meta.createEl("span", { text: folder.name });
    meta.createEl("strong", { text: `${notes.length} note${notes.length === 1 ? "" : "s"}` });

    if (!notes.length) {
      el.createDiv({
        cls: "tg-plain-folder-notes-empty",
        text: "No notes are inside this folder yet."
      });
      return;
    }

    const list = el.createDiv({ cls: "tg-plain-folder-notes-list" });
    for (const note of notes) {
      const row = list.createEl("button", { cls: "tg-plain-folder-note-row" });
      const left = row.createDiv({ cls: "tg-plain-folder-note-left" });
      this.createPremiumIcon(left, "file-text", "tg-plain-folder-note-icon tg-premium-svg-icon", note.basename);
      const copy = row.createDiv({ cls: "tg-plain-folder-note-copy" });
      copy.createEl("strong", { text: note.basename });
      const details = [];
      if (note.stat?.mtime) details.push(new Date(note.stat.mtime).toLocaleDateString());
      details.push("Markdown note");
      copy.createEl("span", { text: details.join(" · ") });
      row.addEventListener("click", () => this.openNote(note.path));
    }
  }

  async openFolderDashboard(folderPath) {
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof TFolder)) {
      new Notice("This folder no longer exists in the vault.");
      return;
    }
    const dashboardPath = this.getFolderDashboardPath(folderPath);
    if (!dashboardPath) return;

    try {
      const section = SECTION_CONFIG.find(item => item.folder === folderPath);
      if (section) {
        if (section.folder === "09 Books") await this.ensureBooksHome();
        else if (section.folder === "10 Quran") await this.ensureQuranHome();
        else if (section.folder === "11 Languages") await this.ensureLanguagesHome();
        else await this.ensureDashboardNote(
          section.dashboard,
          section.title,
          section.processor,
          section.processor === "time-garden-section-overview" ? section.folder : "",
          section.folder === "11 Languages" ? "timegarden-languages" : "timegarden-section-dashboard",
          section.description
        );
      } else if (!(this.app.vault.getAbstractFileByPath(dashboardPath) instanceof TFile)) {
        const rootLevel = !folderPath.includes("/");
        const title = folder.name.replace(/^\d+\s*/, "");
        await this.ensureDashboardNote(
          dashboardPath,
          title || "Folder",
          "time-garden-section-overview",
          folderPath,
          rootLevel ? "timegarden-section-dashboard" : "timegarden-folder-dashboard",
          "Browse the folders and files in this space."
        );
      }

      const dashboardFile = this.app.vault.getAbstractFileByPath(dashboardPath);
      if (!(dashboardFile instanceof TFile)) {
        throw new Error(`The dashboard note was not created: ${dashboardPath}`);
      }

      // openDashboardNote owns the single serialized render/recovery pass. Do not
      // start a second renderer here: concurrent passes used to empty the same
      // Journal host and could leave the next Home navigation visually broken.
      await this.openDashboardNote(dashboardPath);
    } catch (error) {
      console.error(`LIFORA failed to open folder workspace ${folderPath}.`, error);

      // Recovery path: a failed dashboard enhancement must never leave the
      // main pane blank when the underlying Markdown note is still available.
      try {
        const dashboardFile = this.app.vault.getAbstractFileByPath(dashboardPath);
        if (!(dashboardFile instanceof TFile)) throw new Error(`Dashboard note is unavailable: ${dashboardPath}`);

        let leaf = this.app.workspace.getLeavesOfType("markdown")
          .find(candidate => candidate.view?.file?.path === dashboardPath);
        if (!leaf) {
          leaf = this.app.workspace.getLeaf("tab");
          await leaf.openFile(dashboardFile);
        }
        await this.app.workspace.revealLeaf(leaf);
        this.navigationLeaf = leaf;
        await this.ensureDashboardPreview(leaf.view);
        this.normalizeDashboardView(leaf.view);
        await this.ensureSectionDashboardRenderedSafely(dashboardPath, leaf);
        new Notice(`${folder.name} opened in recovery mode. Your files are safe.`);
        return;
      } catch (recoveryError) {
        console.error(`LIFORA recovery navigation failed for ${folderPath}.`, recoveryError);
      }

      const detail = error?.message ? ` (${error.message})` : "";
      new Notice(`Could not open ${folder.name}${detail}. Your folder and files are safe.`);
    }
  }

  installFolderNavigation() {
    this.folderClickHandler = event => {
      if (event.defaultPrevented || event.button !== 0) return;
      const target = event.target instanceof Element ? event.target : event.target?.parentElement;
      if (!target) return;

      const title = target.closest(".nav-folder-title");
      if (!title) return;

      // Keep Obsidian's chevron / collapse control native. A click on the
      // folder label itself opens the LIFORA workspace in the main pane.
      const collapseControl = target.closest(".nav-folder-collapse-indicator, .collapse-icon");
      if (collapseControl && title.contains(collapseControl)) return;

      const folderNode = title.closest(".nav-folder");
      const folderPath = title.getAttribute("data-path") || title.dataset?.path ||
        folderNode?.getAttribute?.("data-path") || folderNode?.dataset?.path ||
        this.getExplorerItemPath(title);
      if (!folderPath) return;
      const folder = this.app.vault.getAbstractFileByPath(folderPath);
      if (!(folder instanceof TFolder)) return;
      const dashboardPath = this.getFolderDashboardPath(folderPath);
      if (!dashboardPath) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      void this.openFolderDashboard(folderPath).catch(error => {
        console.error(`LIFORA could not open the ${folderPath} workspace.`, error);
        new Notice(`Could not open ${folder.name}. Check the LIFORA console for details.`);
      });
    };
    document.addEventListener("click", this.folderClickHandler, true);
    this.register(() => document.removeEventListener("click", this.folderClickHandler, true));
  }

  installExplorerObserver() {
    const root = this.app.workspace.containerEl;
    if (!root || typeof MutationObserver === "undefined") return;
    this.explorerObserver = new MutationObserver(() => this.applyExplorerPresentation());
    this.explorerObserver.observe(root, { childList: true, subtree: true });
    this.register(() => this.explorerObserver?.disconnect());
  }

  applyExplorerPresentation() {
    const root = this.app.workspace.containerEl || document;
    const prefs = this.workspacePrefsCache || {
      sectionOrder: HOME_SECTION_CONFIG.map(section => section.folder),
      sectionColors: {}
    };
    const folders = root.querySelectorAll(".nav-folder");
    for (const folder of folders) {
      const titleNode = folder.querySelector(".nav-folder-title");
      const path = this.getExplorerItemPath(folder) || this.getExplorerItemPath(titleNode);
      const hidden = path === "00 Dashboard" || path === LEGACY_BACKUP_ROOT ||
        this.isPortableDataPath(path) || path === "06 Templates";
      folder.classList.toggle("tg-hidden-system-folder", hidden);
      const title = folder.querySelector(".nav-folder-title-content");
      if (title) {
        const openable = Boolean(this.getFolderDashboardPath(path));
        title.setAttribute("data-tg-openable", openable ? "true" : "false");
        if (openable) title.setAttribute("title", "Open dashboard · Use the arrow to expand or collapse");
        const section = SECTION_CONFIG.find(item => item.folder === path) || HOME_SECTION_CONFIG.find(item => item.folder === path);
        if (section) {
          const color = prefs.sectionColors?.[path] || section?.color || "#d3ad59";
          title.style.setProperty("--tg-section-color", color);
          title.style.color = color;
          title.dataset.tgSection = path;
        }
      }
    }

    // Reorder only the actual root-level folder rows; the folder tree itself stays native.
    const rootTree = root.querySelector(".nav-folder.mod-root > .nav-folder-children") ||
      root.querySelector(".nav-folder.mod-root .nav-folder-children");
    if (rootTree) {
      rootTree.classList.add("tg-root-folder-order");
      const order = new Map((prefs.sectionOrder || HOME_SECTION_CONFIG.map(item => item.folder)).map((path, index) => [path, index]));
      for (const item of Array.from(rootTree.children)) {
        const title = item.querySelector?.(".nav-folder-title");
        const path = this.getExplorerItemPath(item) || this.getExplorerItemPath(title);
        if (path && order.has(path)) item.style.order = String(order.get(path));
        else item.style.order = "999";
      }
    }

    this.applyFolderAppearances(root);

    const files = root.querySelectorAll(".nav-file-title");
    for (const title of files) {
      const path = this.getExplorerItemPath(title);
      if (!path) continue;
      const filename = path.split("/").pop().toLowerCase();
      const hidden = path.startsWith("00 Dashboard/") ||
        path.startsWith(`${LEGACY_BACKUP_ROOT}/`) || this.isPortableDataPath(path) ||
        SYSTEM_DASHBOARD_FILENAMES.has(filename) ||
        (!path.includes("/") && filename.endsWith(".md"));
      const item = title.closest(".nav-file") || title.closest(".tree-item") || title;
      item.classList.toggle("tg-hidden-dashboard-file", hidden);
    }
  }

  isSystemDashboardPath(path) {
    if (!path) return false;
    const filename = path.split("/").pop().toLowerCase();
    return path.startsWith("00 Dashboard/") || SYSTEM_DASHBOARD_FILENAMES.has(filename);
  }

  async closeStartupDailyTabs(homeLeaf) {
    // On startup, Home is the landing page. Close restored Daily Journal tabs
    // only; the underlying daily Markdown files and all their contents remain untouched.
    const leaves = [...this.app.workspace.getLeavesOfType("markdown")];
    for (const leaf of leaves) {
      if (!leaf || leaf === homeLeaf) continue;
      const path = leaf.view?.file?.path || "";
      if (!path.startsWith("Journal/01 Daily/")) continue;
      try {
        await leaf.view?.save?.();
      } catch (error) {
        console.warn(`LIFORA could not save the restored daily tab before closing: ${path}`, error);
      }
      try {
        leaf.detach();
      } catch (error) {
        console.warn(`LIFORA could not close the restored daily tab: ${path}`, error);
      }
    }
  }

  getUsableNavigationLeaf() {
    const workspace = this.app.workspace;
    const activeLeaf = workspace.activeLeaf;

    // The active Markdown leaf is the user's current workspace. Prefer it over
    // a remembered leaf: that reference can still be valid while pointing to an
    // older Home/Journal tab, which caused Home clicks to reveal stale content.
    if (activeLeaf?.view?.getViewType?.() === "markdown") return activeLeaf;

    const markdownLeaves = workspace.getLeavesOfType("markdown");
    if (this.navigationLeaf && markdownLeaves.includes(this.navigationLeaf)) {
      return this.navigationLeaf;
    }

    // If the active pane is a Bases / Calendar / other non-Markdown view,
    // create a real tab rather than trying to open a Markdown file in it.
    return workspace.getLeaf("tab");
  }

  async openHomeDashboardNative(options = {}) {
    // Serialize Home requests. A rapid second click must not create another tab
    // while the first Home tab is still being opened by Obsidian.
    if (this.homeNavigationPromise) return this.homeNavigationPromise;
    const task = this.performHomeDashboardNavigation(options);
    this.homeNavigationPromise = task;
    try {
      return await task;
    } finally {
      if (this.homeNavigationPromise === task) this.homeNavigationPromise = null;
    }
  }

  async performHomeDashboardNavigation(options = {}) {
    const navigationToken = (this.dashboardNavigationToken || 0) + 1;
    this.dashboardNavigationToken = navigationToken;
    this.clearDashboardRepairTimers();
    void this.recordRecentActivity(PATHS.home);

    const file = this.app.vault.getAbstractFileByPath(PATHS.home);
    if (!(file instanceof TFile)) {
      throw new Error(`LIFORA Home page not found: ${PATHS.home}`);
    }

    const workspace = this.app.workspace;
    const markdownLeaves = workspace.getLeavesOfType("markdown");
    const homeLeaves = markdownLeaves.filter(candidate => candidate?.view?.file?.path === PATHS.home);
    const isReadyHomeLeaf = candidate => {
      const view = candidate?.view;
      if (view?.getViewType?.() !== "markdown" || view.file?.path !== PATHS.home) return false;
      const host = this.findDashboardProcessorHost(view, "time-garden-home-overview")?.host;
      return Boolean(
        host?.classList?.contains("tg-home-app") &&
        host.querySelector(".tg-global-day-header") &&
        host.querySelector(".tg-home-toolbar") &&
        host.querySelector(".tg-home-fab-host")
      );
    };

    // Prefer the active Home tab, then the remembered Home tab, then any
    // existing Home tab (even if its previous render failed). This prevents
    // one new tab being created on every click after a render error.
    const activeLeaf = workspace.activeLeaf;
    let leaf = null;
    if (activeLeaf?.view?.file?.path === PATHS.home && markdownLeaves.includes(activeLeaf)) {
      leaf = activeLeaf;
    } else if (this.homeNavigationLeaf && homeLeaves.includes(this.homeNavigationLeaf)) {
      leaf = this.homeNavigationLeaf;
    } else {
      leaf = homeLeaves.find(isReadyHomeLeaf) || homeLeaves[0] || null;
    }

    const createdFreshLeaf = !leaf;
    try {
      if (!leaf) {
        // Create exactly one Home tab when none exists. Opening the Markdown
        // file normally lets Obsidian run its own processor and view lifecycle.
        leaf = workspace.getLeaf("tab");
        this.homeNavigationLeaf = leaf;
        await leaf.openFile(file);
      } else if (!isReadyHomeLeaf(leaf)) {
        // Recover the existing failed/blank Home tab in place rather than
        // creating another duplicate tab.
        await leaf.openFile(file);
      }

      if (this.dashboardNavigationToken !== navigationToken) return;
      if (leaf?.view?.file?.path !== PATHS.home) {
        throw new Error("Obsidian did not finish opening the LIFORA Home note.");
      }

      await workspace.revealLeaf(leaf);
      if (this.dashboardNavigationToken !== navigationToken) return;

      this.navigationLeaf = leaf;
      this.homeNavigationLeaf = leaf;

      const view = leaf.view;
      if (view?.getViewType?.() === "markdown" && view.contentEl) {
        view.contentEl.addClass?.("tg-system-dashboard-view");
        view.contentEl.querySelectorAll(".tg-editor-toolbar").forEach(toolbar => toolbar.remove());
        // Wait for Obsidian's native Markdown processor. Do not call setMode()
        // or a second manual renderer during this transition.
        await this.waitForDashboardProcessorHost(view, "time-garden-home-overview", 2400);
      }

      if (this.dashboardNavigationToken !== navigationToken) return;

      // Clean up duplicate Home tabs left by earlier failed navigation builds.
      // Only close non-active Reading/Preview copies; preserve Source-mode tabs
      // because they could contain user edits that must not be discarded.
      for (const duplicate of workspace.getLeavesOfType("markdown")) {
        if (duplicate === leaf || duplicate?.view?.file?.path !== PATHS.home) continue;
        try {
          if (duplicate.view?.getMode?.() === "preview") duplicate.detach();
        } catch (cleanupError) {
          console.warn("LIFORA could not close a duplicate Home preview tab.", cleanupError);
        }
      }

      if (options.startup === true) await this.closeStartupDailyTabs(leaf);
      return leaf;
    } catch (error) {
      if (this.homeNavigationLeaf === leaf && createdFreshLeaf) this.homeNavigationLeaf = null;
      throw error;
    }
  }

  async openDashboardNote(path, options = {}) {
    // Home uses Obsidian's native Markdown rendering path in a dedicated tab.
    // All other section dashboards continue through the standard navigator.
    if (path === PATHS.home) return this.openHomeDashboardNative(options);

    const navigationToken = (this.dashboardNavigationToken || 0) + 1;
    this.dashboardNavigationToken = navigationToken;
    this.clearDashboardRepairTimers();
    void this.recordRecentActivity(path);
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      new Notice(`LIFORA page not found: ${path}`);
      return;
    }

    const workspace = this.app.workspace;
    let leaf = workspace.getLeavesOfType("markdown")
      .find(candidate => candidate.view?.file?.path === path) || null;
    if (!leaf) leaf = this.getUsableNavigationLeaf();

    if (leaf.view?.file?.path !== path) {
      await leaf.openFile(file);
      if (this.dashboardNavigationToken !== navigationToken || leaf.view?.file?.path !== path) return;
    }
    await workspace.revealLeaf(leaf);

    const isCurrentNavigation = () =>
      this.dashboardNavigationToken === navigationToken && leaf?.view?.file?.path === path;
    if (!isCurrentNavigation()) return;

    this.navigationLeaf = leaf;
    this.normalizeDashboardView(leaf.view);
    if (this.isPresentationDashboardPath(path)) {
      await this.ensureDashboardPreview(leaf.view);
      if (!isCurrentNavigation()) return;
    }

    this.scheduleSectionDashboardRepair(path, leaf);
    await this.ensureSectionDashboardRenderedSafely(path, leaf);
    if (!isCurrentNavigation()) return;
  }

  renderHomeFallback(el, error) {
    el.empty();
    const homeView = el.closest?.(".markdown-preview-view, .markdown-reading-view");
    homeView?.classList.remove("tg-home-live-ready");
    el.addClass("tg-home-app", "tg-home-recovery");
    this.homeDashboardContainer = el;

    try {
      this.renderGlobalDailyHeader(el);
    } catch (headerError) {
      console.warn("LIFORA daily cover could not be rendered in recovery mode.", headerError);
      const hero = el.createDiv({ cls: "tg-global-day-header tg-home-recovery-hero" });
      const content = hero.createDiv({ cls: "tg-global-day-header-content" });
      content.createEl("div", { cls: "tg-global-day-header-context-label", text: "LIFORA" });
      content.createEl("h1", {
        cls: "tg-global-day-header-title",
        text: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
      });
    }

    const toolbar = el.createDiv({ cls: "tg-home-toolbar" });
    const safeButton = (parent, label, callback, className = "tg-home-hero-action") => {
      const button = parent.createEl("button", { cls: className, text: label, attr: { type: "button" } });
      button.addEventListener("click", callback);
      return button;
    };
    safeButton(toolbar, "Themes", () => this.openThemeGallery());
    safeButton(toolbar, "Personalize", () => this.openPersonalizationCenter());
    safeButton(toolbar, "Search", () => this.openGlobalSearch());
    safeButton(toolbar, "Backup", () => this.openBackupCenter());
    safeButton(toolbar, "Plugins", () => this.openLiforaPluginSetup());

    const dailyActions = el.createDiv({ cls: "tg-home-daily-actions" });
    safeButton(dailyActions, "Create / Open Today's Journal", () => this.openTodayJournal(), "tg-course-btn tg-course-btn-primary");
    safeButton(dailyActions, "Calendar", () => this.openCalendar(), "tg-course-btn tg-course-btn-muted");

    const stats = el.createDiv({ cls: "tg-home-stats" });
    const statData = [
      ["COURSES", () => this.getCourseFiles().length],
      ["BOOKS", () => this.getBookFiles().length],
      ["LANGUAGES", () => this.getLanguageFiles().length],
      ["KNOWLEDGE NOTES", () => this.app.vault.getMarkdownFiles().filter(file =>
        file.path.startsWith("07 Notes/") && !this.isSystemDashboardPath(file.path)).length]
    ];
    for (const [label, getValue] of statData) {
      let value = 0;
      try { value = getValue(); } catch (_) {}
      const card = stats.createDiv({ cls: "tg-home-stat" });
      card.createEl("strong", { text: String(value) });
      card.createEl("span", { text: label });
    }

    const heading = el.createDiv({ cls: "tg-home-section-heading" });
    heading.createDiv({ cls: "tg-home-eyebrow", text: "YOUR WORKSPACE" });
    heading.createEl("h2", { text: "Explore your sections" });
    heading.createEl("p", { text: "Choose a section to open its dedicated workspace." });

    const grid = el.createDiv({ cls: "tg-home-section-grid" });
    const folders = (this.app.vault.getRoot()?.children || [])
      .filter(item => item instanceof TFolder && item.path !== "00 Dashboard" &&
        item.path !== LEGACY_BACKUP_ROOT && !this.isPortableDataPath(item.path) &&
        item.path !== "06 Templates" && !item.path.startsWith(".") &&
        !["Attachments", "Tools", "_mdbase", "Views"].includes(item.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));

    for (const folder of folders) {
      const config = HOME_SECTION_CONFIG.find(item => item.folder === folder.path);
      const card = grid.createEl("button", { cls: "tg-home-section-card", attr: { type: "button" } });
      card.style.setProperty("--tg-home-accent", config?.color || "#C5A66A");
      const iconBox = card.createDiv({ cls: "tg-home-section-icon" });
      try { this.createPremiumIcon(iconBox, this.getSectionIconName(folder.path), "tg-premium-svg-icon tg-home-section-svg"); } catch (_) {}
      const body = card.createDiv({ cls: "tg-home-section-body" });
      body.createEl("strong", { text: config?.title || folder.name.replace(/^\d+\s*/, "") });
      body.createEl("span", { text: config?.description || "Open this folder to browse its files and subfolders." });
      card.addEventListener("click", () => this.openFolderDashboard(folder.path));
    }

    if (!folders.length) {
      grid.createDiv({ cls: "tg-explorer-empty-inline", text: "No folders were found in this vault." });
    }

    try { this.renderHomeFloatingActions(el); } catch (fabError) {
      console.warn("LIFORA floating Create could not be rendered in recovery mode.", fabError);
    }
    homeView?.querySelector?.('.callout[data-callout="lifora-home-fallback"]')?.remove();
    homeView?.classList.add("tg-home-live-ready");
  }

  async renderHomeOverview(el) {
    el.empty();
    const homeView = el.closest?.(".markdown-preview-view, .markdown-reading-view");
    homeView?.classList.remove("tg-home-live-ready");
    this.renderGlobalDailyHeader(el);
    await this.renderDailyPlanner(el, { compact: true });
    el.addClass("tg-home-app");
    this.homeDashboardContainer = el;
    const prefs = this.workspacePrefsCache || await this.getWorkspacePreferences();
    this.workspacePrefsCache = prefs;
    const widgets = prefs.homeWidgets || {};
    const now = new Date();
    const root = this.app.vault.getRoot();
    const orderMap = new Map((prefs.sectionOrder || []).map((path, index) => [path, index]));
    const folders = (root?.children || [])
      .filter(item => item instanceof TFolder && item.path !== "00 Dashboard" &&
        item.path !== LEGACY_BACKUP_ROOT && item.path !== "06 Templates" &&
        !this.isPortableDataPath(item.path) && !item.path.startsWith(".") &&
        !["Attachments", "Tools", "_mdbase", "Views"].includes(item.name))
      .sort((a, b) => {
        const ai = orderMap.has(a.path) ? orderMap.get(a.path) : 999;
        const bi = orderMap.has(b.path) ? orderMap.get(b.path) : 999;
        return ai - bi || a.name.localeCompare(b.name);
      });

    const toolbar = el.createDiv({ cls: "tg-home-toolbar" });
    this.iconButton(toolbar, "Themes", "palette", "tg-home-hero-action", () => this.openThemeGallery());
    this.iconButton(toolbar, "Personalize", "sliders-horizontal", "tg-home-hero-action", () => this.openPersonalizationCenter());
    this.iconButton(toolbar, "Search", "search", "tg-home-hero-action", () => this.openGlobalSearch());
    this.iconButton(toolbar, "Backup", "database-backup", "tg-home-hero-action", () => this.openBackupCenter());
    this.iconButton(toolbar, "Plugins", "plug-zap", "tg-home-hero-action", () => this.openLiforaPluginSetup());

    const renderers = {
      daily: async () => {
        const actions = el.createDiv({ cls: "tg-home-daily-actions" });
        this.iconButton(actions, "Create / Open Today's Journal", "sun", "tg-course-btn tg-course-btn-primary", () => this.openTodayJournal());
        this.iconButton(actions, "Calendar", "calendar-days", "tg-course-btn tg-course-btn-muted", () => this.openCalendar());
      },
      stats: async () => {
        const courses = this.getCourseFiles().length;
        const books = this.getBookFiles().length;
        const languages = this.getLanguageFiles().length;
        const goalsCount = this.app.vault.getMarkdownFiles().filter(file => file.path.startsWith("12 Goals/Goals/")).length;
        const notesFolder = this.app.vault.getAbstractFileByPath("07 Notes");
        const notesCount = notesFolder instanceof TFolder
          ? this.app.vault.getMarkdownFiles().filter(file => file.path.startsWith("07 Notes/") && !this.isSystemDashboardPath(file.path)).length
          : 0;
        const stats = el.createDiv({ cls: "tg-home-stats" });
        this.homeStat(stats, "COURSES", courses, "#65a8dc", "graduation");
        this.homeStat(stats, "BOOKS", books, "#55aa83", "books");
        this.homeStat(stats, "LANGUAGES", languages, "#a78bd2", "languages");
        this.homeStat(stats, "GOALS", goalsCount, "#d3ad59", "target");
        this.homeStat(stats, "KNOWLEDGE NOTES", notesCount, "#d3ad59", "notes");
      },
      sections: async () => {
        const sectionHeader = el.createDiv({ cls: "tg-home-section-heading" });
        const sectionTitle = sectionHeader.createDiv();
        sectionTitle.createDiv({ cls: "tg-home-eyebrow", text: "YOUR WORKSPACE" });
        sectionTitle.createEl("h2", { text: "Explore your sections" });
        sectionTitle.createEl("p", { text: "Choose a section to open its dedicated workspace." });
        const grid = el.createDiv({ cls: "tg-home-section-grid" });
        const courses = this.getCourseFiles().length;
        const books = this.getBookFiles().length;
        const languages = this.getLanguageFiles().length;
        for (const folder of folders) {
          const config = HOME_SECTION_CONFIG.find(item => item.folder === folder.path);
          if (config && !prefs.visibleSections.includes(folder.path)) continue;
          const title = config?.title || folder.name.replace(/^\d+\s*/, "");
          const card = grid.createEl("button", { cls: "tg-home-section-card" });
          card.style.setProperty("--tg-home-accent", prefs.sectionColors?.[folder.path] || config?.color || "#65a8dc");
          const iconBox = card.createDiv({ cls: "tg-home-section-icon" });
          this.createPremiumIcon(iconBox, this.getSectionIconName(folder.path), "tg-premium-svg-icon tg-home-section-svg", title);
          const body = card.createDiv({ cls: "tg-home-section-body" });
          body.createEl("strong", { text: title });
          body.createEl("span", { text: config?.description || "Open this section to browse its folders and files." });
          const meta = card.createDiv({ cls: "tg-home-section-meta" });
          const subfolders = folder.children.filter(item => item instanceof TFolder).length;
          const visibleFiles = folder.children.filter(item => item instanceof TFile && !this.isSystemDashboardPath(item.path)).length;
          let metric = `${subfolders} folders · ${visibleFiles} files`;
          if (folder.path === "08 Courses") metric = `${courses} courses`;
          else if (folder.path === "09 Books") metric = `${books} books`;
          else if (folder.path === "10 Quran") metric = "114 Surahs";
          else if (folder.path === "11 Languages") metric = `${languages} languages`;
          meta.createSpan({ text: metric });
          meta.createSpan({ text: "Open section", cls: "tg-home-open-label" });
          card.addEventListener("click", () => this.openFolderDashboard(folder.path));
        }
      },
      recent: async () => {
        const recent = await this.getRecentActivity(6);
        const recentSection = el.createDiv({ cls: "tg-home-recent-section" });
        const recentHead = recentSection.createDiv({ cls: "tg-home-recent-heading" });
        const headingCopy = recentHead.createDiv({ cls: "tg-home-recent-heading-copy" });
        headingCopy.createDiv({ cls: "tg-home-eyebrow", text: "PICK UP WHERE YOU LEFT OFF" });
        headingCopy.createEl("h2", { text: "Recent activity" });
        headingCopy.createEl("p", { text: "Your latest workspaces and notes, ready to continue." });
        const count = recentHead.createDiv({ cls: "tg-home-recent-count" });
        this.createPremiumIcon(count, "clock-3", "tg-premium-svg-icon");
        count.createSpan({ text: `${String(recent.length).padStart(2, "0")} RECENT` });

        if (!recent.length) {
          const empty = recentSection.createDiv({ cls: "tg-home-recent-empty" });
          const emptyIcon = empty.createDiv({ cls: "tg-home-recent-empty-icon" });
          this.createPremiumIcon(emptyIcon, "history", "tg-premium-svg-icon");
          empty.createEl("strong", { text: "Your next step starts here" });
          empty.createSpan({ text: "Open a note or workspace and it will appear here for quick access." });
        } else {
          const list = recentSection.createDiv({ cls: "tg-home-recent-list" });
          for (const item of recent) {
            const path = String(item.path || "");
            const parentPath = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "Vault root";
            const parentLabel = parentPath.split("/").map(part => part.replace(/^\d+\s*/, "")).join("  /  ");
            const button = list.createEl("button", { cls: "tg-home-recent-item", attr: { type: "button" } });
            const iconBox = button.createDiv({ cls: "tg-home-recent-symbol" });
            const iconName = this.getSectionIconName(parentPath);
            this.createPremiumIcon(iconBox, iconName, "tg-home-recent-icon tg-premium-svg-icon", "Open recent item");

            const body = button.createDiv({ cls: "tg-home-recent-copy" });
            const meta = body.createDiv({ cls: "tg-home-recent-meta" });
            meta.createSpan({ cls: "tg-home-recent-location", text: parentLabel || "Vault" });
            const openedAt = Number(item.openedAt) ? new Date(Number(item.openedAt)) : null;
            let timeLabel = "Recently opened";
            if (openedAt && !Number.isNaN(openedAt.getTime())) {
              const now = new Date();
              const sameDay = openedAt.getFullYear() === now.getFullYear() && openedAt.getMonth() === now.getMonth() && openedAt.getDate() === now.getDate();
              const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
              const isYesterday = openedAt.getFullYear() === yesterday.getFullYear() && openedAt.getMonth() === yesterday.getMonth() && openedAt.getDate() === yesterday.getDate();
              const time = openedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
              timeLabel = sameDay ? `Today · ${time}` : isYesterday ? `Yesterday · ${time}` : `${openedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${time}`;
            }
            meta.createSpan({ cls: "tg-home-recent-time", text: timeLabel });
            body.createEl("strong", { text: item.title || path.split("/").pop() });
            body.createSpan({ cls: "tg-home-recent-path", text: path.replace(/\.md$/i, "") });

            const arrow = button.createDiv({ cls: "tg-home-recent-arrow" });
            this.createPremiumIcon(arrow, "arrow-up-right", "tg-premium-svg-icon");
            button.addEventListener("click", () => this.openNote(path));
          }
        }
      },
      quickActions: async () => {
        const quick = el.createDiv({ cls: "tg-home-quick-section" });
        const quickHead = quick.createDiv({ cls: "tg-home-quick-head" });
        quickHead.createDiv({ cls: "tg-home-eyebrow", text: "QUICK ACTIONS" });
        quickHead.createEl("h2", { text: "Start something new" });
        const actions = quick.createDiv({ cls: "tg-home-quick-actions" });
        const actionDefs = [
          ["Daily Planner", "calendar-check", () => this.openDashboardNote(PATHS.planner)],
          ["New Course", "graduation-cap", () => this.createCourseDialog()],
          ["Add Book", "book-plus", () => this.createBookDialog()],
          ["Add Language", "languages", () => this.createLanguageDialog()],
          ["Quran Wird", "book-heart", () => this.openQuranWirdDialog()],
          ["Weekly Review", "calendar-check", () => this.openReviewNote("weekly")],
          ["Monthly Review", "calendar-days", () => this.openReviewNote("monthly")],
          ["Search Notes", "search", () => this.openGlobalSearch()],
          ["Backup Center", "database-backup", () => this.openBackupCenter()]
        ];
        for (const [label, iconName, callback] of actionDefs) {
          this.iconButton(actions, label, iconName, "tg-course-btn tg-course-btn-muted", callback);
        }
      }
    };

    const widgetOrder = Array.isArray(prefs.widgetOrder) ? prefs.widgetOrder : ["daily", "stats", "sections", "recent", "quickActions"];
    for (const key of widgetOrder) {
      if (widgets[key] !== false && renderers[key]) await renderers[key]();
    }
  
    // Keep the requested global Create action while preserving the original Home layout.
    this.renderHomeFloatingActions(el);

    // Remove the Markdown safety callout from this rendered view only after
    // the complete live dashboard exists. If rendering fails, the callout stays visible.
    homeView?.querySelector?.('.callout[data-callout="lifora-home-fallback"]')?.remove();
    homeView?.classList.add("tg-home-live-ready");
  }


  shiftPlannerDate(dateKey, offset = 1) {
    const base = new Date(`${dateKey}T12:00:00`);
    if (Number.isNaN(base.getTime())) return localISODate(new Date());
    base.setDate(base.getDate() + Number(offset || 0));
    return localISODate(base);
  }

  formatPlannerDate(dateKey, options = {}) {
    const date = new Date(`${dateKey}T12:00:00`);
    if (Number.isNaN(date.getTime())) return String(dateKey || "");
    return date.toLocaleDateString(undefined, {
      weekday: options.long ? "long" : "short",
      month: "short",
      day: "numeric",
      year: options.year ? "numeric" : undefined
    });
  }

  async getDailyPlannerTasks() {
    const data = (await this.loadData()) || {};
    const tasks = Array.isArray(data.dailyPlannerTasks) ? data.dailyPlannerTasks : [];
    this.dailyPlannerCache = tasks;
    return tasks;
  }

  async saveDailyPlannerTasks(tasks, refresh = true) {
    const data = (await this.loadData()) || {};
    const safeTasks = JSON.parse(JSON.stringify(Array.isArray(tasks) ? tasks : []));
    data.dailyPlannerTasks = safeTasks;
    await this.saveData(data);
    this.dailyPlannerCache = safeTasks;
    if (refresh) await this.refreshDailyPlannerViews();
  }

  installDailyPlannerEvents() {
    this.registerEvent(this.app.vault.on("rename", async (file, oldPath) => {
      if (!oldPath) return;
      const data = (await this.loadData()) || {};
      const tasks = Array.isArray(data.dailyPlannerTasks) ? data.dailyPlannerTasks : [];
      let changed = false;
      const next = tasks.map(task => {
        const sourcePath = String(task.sourcePath || "");
        if (sourcePath === oldPath || sourcePath.startsWith(`${oldPath}/`)) {
          changed = true;
          return { ...task, sourcePath: `${file.path}${sourcePath.slice(oldPath.length)}` };
        }
        return task;
      });
      if (changed) await this.saveDailyPlannerTasks(next, true);
    }));

    this.registerEvent(this.app.vault.on("delete", async file => {
      const deletedPath = String(file?.path || "");
      if (!deletedPath) return;
      const data = (await this.loadData()) || {};
      const tasks = Array.isArray(data.dailyPlannerTasks) ? data.dailyPlannerTasks : [];
      const next = tasks.filter(task => {
        const sourcePath = String(task.sourcePath || "");
        return sourcePath !== deletedPath && !sourcePath.startsWith(`${deletedPath}/`);
      });
      if (next.length !== tasks.length) {
        await this.saveDailyPlannerTasks(next, true);
        new Notice("Tasks linked to a deleted source were removed from Daily Planner. The planner never deletes the original course or book.");
      }
    }));
  }

  async refreshDailyPlannerViews() {
    await this.refreshHomeDashboard();
    const plannerLeaf = this.app.workspace.getLeavesOfType("markdown")
      .find(leaf => leaf.view?.file?.path === PATHS.planner);
    if (!plannerLeaf?.view?.contentEl) return;
    const view = plannerLeaf.view;
    await this.ensureDashboardPreview(view);
    const host = view.contentEl.querySelector(".block-language-time-garden-section-overview");
    if (host) {
      await this.runDashboardRender(host, async () => {
        await this.renderSectionOverview(host, "13 Daily Planner");
      });
    }
  }

  findCourseTopicById(topics, topicId) {
    for (const topic of Array.isArray(topics) ? topics : []) {
      if (topic?.id === topicId) return topic;
      const found = this.findCourseTopicById(topic?.subtopics, topicId);
      if (found) return found;
    }
    return null;
  }

  resolveDailyPlannerTask(task) {
    const file = this.app.vault.getAbstractFileByPath(task?.sourcePath || "");
    if (!(file instanceof TFile)) return null;
    if (task.kind === "topic") {
      const course = this.getCourseData(file);
      const topic = this.findCourseTopicById(course.topics, task.topicId);
      if (!topic) return null;
      return { file, course, topic, state: this.getCourseTopicState(topic) };
    }
    if (task.kind === "book") {
      const book = this.getBookData(file);
      const startPage = Math.min(book.total_pages, Math.max(1, Math.floor(Number(task.startPage) || 1)));
      const endPage = Math.max(startPage, Math.min(book.total_pages, Math.floor(Number(task.endPage) || startPage)));
      return { file, book, startPage, endPage, completed: book.status === "read" || book.current_page >= endPage };
    }
    return null;
  }

  async addDailyPlannerTask(task) {
    const tasks = await this.getDailyPlannerTasks();
    const duplicate = tasks.some(existing =>
      existing.kind === task.kind &&
      existing.sourcePath === task.sourcePath &&
      existing.date === task.date &&
      (task.kind === "topic"
        ? existing.topicId === task.topicId
        : Number(existing.startPage) === Number(task.startPage) && Number(existing.endPage) === Number(task.endPage))
    );
    if (duplicate) {
      new Notice("This item is already scheduled for that day.");
      return;
    }
    const id = `planner-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    tasks.push({ ...task, id, createdAt: new Date().toISOString() });
    await this.saveDailyPlannerTasks(tasks);
    new Notice("Added to Daily Planner.");
  }

  async moveDailyPlannerTask(taskId, date) {
    const tasks = await this.getDailyPlannerTasks();
    const task = tasks.find(item => item.id === taskId);
    if (!task) return;
    const duplicate = tasks.some(item =>
      item.id !== taskId &&
      item.kind === task.kind &&
      item.sourcePath === task.sourcePath &&
      item.date === date &&
      (task.kind === "topic"
        ? item.topicId === task.topicId
        : Number(item.startPage) === Number(task.startPage) && Number(item.endPage) === Number(task.endPage))
    );
    if (duplicate) {
      new Notice("This item is already scheduled on the selected date.");
      return;
    }
    task.date = date;
    await this.saveDailyPlannerTasks(tasks);
    new Notice(`Task moved to ${this.formatPlannerDate(date)}.`);
  }

  async removeDailyPlannerTask(taskId) {
    const tasks = await this.getDailyPlannerTasks();
    await this.saveDailyPlannerTasks(tasks.filter(task => task.id !== taskId));
    new Notice("Removed from Daily Planner. The original item is unchanged.");
  }

  openPlannerTaskModal(options, onSave) {
    const modal = new Modal(this.app);
    modal.onOpen = () => {
      const { contentEl } = modal;
      contentEl.empty();
      contentEl.addClass("tg-course-modal", "tg-planner-modal");
      const header = contentEl.createDiv({ cls: "tg-planner-modal-heading" });
      header.createDiv({ cls: "tg-courses-eyebrow", text: "LIFORA DAILY PLANNER" });
      header.createEl("h2", { text: options.title || "Schedule task" });
      if (options.description) {
        contentEl.createEl("p", { text: options.description, cls: "tg-course-modal-description" });
      }

      const form = contentEl.createEl("form", { cls: "tg-course-form tg-planner-form" });
      const dateField = form.createDiv({ cls: "tg-course-field tg-topic-full" });
      dateField.createEl("label", { text: "Schedule for" });
      const dateInput = dateField.createEl("input", { type: "date" });
      dateInput.value = options.initialDate || this.shiftPlannerDate(localISODate(new Date()), 1);
      dateInput.required = true;

      let startInput = null;
      let endInput = null;
      if (options.book) {
        const range = form.createDiv({ cls: "tg-planner-page-range" });
        const startField = range.createDiv({ cls: "tg-course-field" });
        startField.createEl("label", { text: "From page" });
        startInput = startField.createEl("input", { type: "number" });
        startInput.min = "1";
        startInput.max = String(options.book.total_pages);
        startInput.step = "1";
        startInput.required = true;
        startInput.value = String(options.startPage || 1);

        const endField = range.createDiv({ cls: "tg-course-field" });
        endField.createEl("label", { text: "To page" });
        endInput = endField.createEl("input", { type: "number" });
        endInput.min = "1";
        endInput.max = String(options.book.total_pages);
        endInput.step = "1";
        endInput.required = true;
        endInput.value = String(options.endPage || options.book.total_pages);
        const hint = form.createDiv({ cls: "tg-planner-modal-hint" });
        hint.setText(`This book has ${options.book.total_pages} pages. Completing the reading task updates the book's saved reading position.`);
      }

      const actions = form.createDiv({ cls: "tg-course-modal-actions" });
      const cancel = actions.createEl("button", {
        text: "Cancel", cls: "tg-course-btn tg-course-btn-muted", attr: { type: "button" }
      });
      cancel.addEventListener("click", () => modal.close());
      const submit = actions.createEl("button", {
        text: options.submitLabel || "Add to planner",
        cls: "tg-course-btn tg-course-btn-primary",
        attr: { type: "submit" }
      });

      form.addEventListener("submit", async event => {
        event.preventDefault();
        const date = String(dateInput.value || "").trim();
        const parsedDate = new Date(`${date}T12:00:00`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
            Number.isNaN(parsedDate.getTime()) || localISODate(parsedDate) !== date) {
          new Notice("Choose a valid date.");
          dateInput.focus();
          return;
        }
        const payload = { date };
        if (options.book) {
          const startPage = Math.floor(Number(startInput.value));
          const endPage = Math.floor(Number(endInput.value));
          if (!Number.isFinite(startPage) || !Number.isFinite(endPage) ||
              startPage < 1 || endPage < startPage || endPage > options.book.total_pages) {
            new Notice("Enter a valid page range within this book.");
            startInput.focus();
            return;
          }
          payload.startPage = startPage;
          payload.endPage = endPage;
        }
        submit.disabled = true;
        try {
          await onSave(payload);
          modal.close();
        } catch (error) {
          console.error("LIFORA Daily Planner could not save this task.", error);
          new Notice(`Could not save task: ${error?.message || "Please try again."}`);
          submit.disabled = false;
        }
      });
    };
    modal.onClose = () => modal.contentEl.empty();
    modal.open();
  }

  openPlannerScheduleTopic(file, topic) {
    this.openPlannerTaskModal({
      title: "Add topic to a day",
      description: `Schedule “${topic.title || "Untitled topic"}” with all of its nested subtopics. You can also schedule any subtopic on its own.`,
      initialDate: this.shiftPlannerDate(localISODate(new Date()), 1),
      submitLabel: "Add topic"
    }, async ({ date }) => {
      await this.addDailyPlannerTask({
        kind: "topic",
        sourcePath: file.path,
        topicId: topic.id,
        date
      });
    });
  }

  openPlannerScheduleBook(file) {
    const book = this.getBookData(file);
    const startPage = Math.min(book.total_pages, Math.max(1, book.current_page + 1));
    const endPage = Math.min(book.total_pages, startPage + 9);
    this.openPlannerTaskModal({
      title: "Plan a reading session",
      description: `Choose the pages you want to read from “${book.title}” and assign them to a day.`,
      initialDate: this.shiftPlannerDate(localISODate(new Date()), 1),
      submitLabel: "Add reading task",
      book,
      startPage,
      endPage
    }, async ({ date, startPage: from, endPage: to }) => {
      await this.addDailyPlannerTask({
        kind: "book",
        sourcePath: file.path,
        startPage: from,
        endPage: to,
        date
      });
    });
  }

  openPlannerMoveModal(task) {
    this.openPlannerTaskModal({
      title: "Move scheduled task",
      description: "Choose the new date. The original course topic or book remains in its section.",
      initialDate: task.date,
      submitLabel: "Move task"
    }, async ({ date }) => this.moveDailyPlannerTask(task.id, date));
  }

  async setPlannerBookTaskCompletion(task, completed) {
    const file = this.app.vault.getAbstractFileByPath(task.sourcePath);
    if (!(file instanceof TFile)) return;
    const book = this.getBookData(file);
    const startPage = Math.min(book.total_pages, Math.max(1, Number(task.startPage) || 1));
    const endPage = Math.max(startPage, Math.min(book.total_pages, Number(task.endPage) || startPage));
    if (completed) {
      if (book.status === "read" || book.current_page >= endPage) {
        await this.refreshDailyPlannerViews();
        return;
      }
      const now = new Date();
      await this.app.fileManager.processFrontMatter(file, fm => {
        fm.current_page = endPage;
        fm.status = endPage >= book.total_pages ? "read" : "currently-reading";
        fm.started_reading = fm.started_reading || localISODate(now);
        fm.last_read = localISODate(now);
        fm.last_read_at = now.toISOString();
        if (endPage >= book.total_pages) fm.completed_date = localISODate(now);
      });
      new Notice(`Reading task completed: pages ${startPage}–${endPage}.`);
    } else {
      // Never erase later reading progress. Undo is allowed only while the saved
      // position is exactly the end of this scheduled range and the book is not finished.
      if (book.status === "read" || book.current_page !== endPage) {
        new Notice("This reading progress has moved beyond the scheduled range. It was kept to protect your saved position.");
        await this.refreshDailyPlannerViews();
        return;
      }
      const now = new Date();
      await this.app.fileManager.processFrontMatter(file, fm => {
        fm.current_page = Math.max(0, startPage - 1);
        fm.status = "currently-reading";
        fm.completed_date = "";
        fm.last_read = localISODate(now);
        fm.last_read_at = now.toISOString();
      });
      new Notice("Reading task unchecked. The saved position was returned to the page before this range.");
    }
    await this.refreshBooksDashboardViews();
    await this.refreshDailyPlannerViews();
  }

  async openBookAtPlannerTask(task, book) {
    const assets = this.getBookAssets(book);
    if (!(assets.bookFile instanceof TFile)) {
      await this.openNote(book.file.path);
      new Notice("Upload the book file to open the planned pages directly.");
      return;
    }
    if (assets.bookFile.extension.toLowerCase() === "pdf") {
      const page = Math.min(book.total_pages, Math.max(1, Number(task.startPage) || 1));
      await this.app.workspace.openLinkText(`${assets.bookFile.path}#page=${page}`, book.file.path, true);
    } else {
      await this.openUploadedBook(assets.bookFile);
      new Notice("This file format opens at its default position. Planned page ranges are tracked in LIFORA.");
    }
  }

  getDailyPlannerTaskProgress(task) {
    const info = this.resolveDailyPlannerTask(task);
    if (!info) return { completed: 0, total: 0 };
    if (task.kind === "topic") {
      const stats = this.getCourseTopicStats([info.topic]);
      return { completed: stats.completed, total: stats.total };
    }
    return { completed: info.completed ? 1 : 0, total: 1 };
  }

  async renderDailyPlanner(parent, options = {}) {
    const tasks = await this.getDailyPlannerTasks();
    const today = localISODate(new Date());
    const tomorrow = this.shiftPlannerDate(today, 1);
    const todayTasks = tasks.filter(task => task.date === today);
    const tomorrowTasks = tasks.filter(task => task.date === tomorrow);
    const overdueTasks = tasks.filter(task => task.date < today);
    const upcomingTasks = tasks.filter(task => task.date > tomorrow).sort((a, b) => a.date.localeCompare(b.date));

    const section = parent.createDiv({
      cls: `tg-daily-planner${options.compact ? " is-home-planner" : ""}${options.standalone ? " is-standalone-planner" : ""}`
    });
    const heading = section.createDiv({ cls: "tg-daily-planner-heading" });
    const headingCopy = heading.createDiv({ cls: "tg-daily-planner-heading-copy" });
    headingCopy.createDiv({ cls: "tg-courses-eyebrow", text: "PLAN WITH PURPOSE" });
    headingCopy.createEl("h2", { text: options.compact ? "Your Daily Planner" : "Daily Planner" });
    headingCopy.createEl("p", {
      text: options.compact
        ? "Today's priorities, tomorrow's plan, and every task linked to its original section."
        : "A single place for your learning and reading plans. Complete an item here or in its original section."
    });
    const plannerProgress = tasks.reduce((sum, task) => {
      const progress = this.getDailyPlannerTaskProgress(task);
      sum.completed += progress.completed;
      sum.total += progress.total;
      return sum;
    }, { completed: 0, total: 0 });
    const headingActions = heading.createDiv({ cls: "tg-daily-planner-heading-actions" });
    const summary = headingActions.createDiv({ cls: "tg-daily-planner-summary" });
    summary.createDiv({
      cls: "tg-daily-planner-summary-value",
      text: `${plannerProgress.completed}/${plannerProgress.total}`
    });
    summary.createDiv({ cls: "tg-daily-planner-summary-label", text: "ITEMS DONE" });
    const openButton = this.iconButton(
      headingActions,
      options.compact ? "Open planner" : "Home",
      options.compact ? "arrow-up-right" : "house",
      "tg-course-btn tg-course-btn-muted",
      () => options.compact ? this.openDashboardNote(PATHS.planner) : this.openDashboardNote(PATHS.home)
    );

    const columns = section.createDiv({ cls: "tg-daily-planner-columns" });
    this.renderDailyPlannerDay(columns, today, "Today", todayTasks, "sun");
    this.renderDailyPlannerDay(columns, tomorrow, "Tomorrow", tomorrowTasks, "sunrise");

    if (overdueTasks.length) {
      this.renderDailyPlannerTaskGroup(section, "Overdue", "Needs rescheduling", overdueTasks, "alert-circle", true);
    }
    if (upcomingTasks.length) {
      this.renderDailyPlannerTaskGroup(section, "Upcoming", "Your next planned sessions", upcomingTasks, "calendar-days", false);
    }
    if (!tasks.length) {
      const empty = section.createDiv({ cls: "tg-daily-planner-empty-state" });
      const icon = empty.createDiv({ cls: "tg-daily-planner-empty-icon" });
      this.createPremiumIcon(icon, "calendar-check", "tg-premium-svg-icon");
      empty.createEl("strong", { text: "Make tomorrow easier" });
      empty.createEl("p", { text: "Open any course and add a topic, or open a book and plan the pages you want to read. They will appear here automatically." });
      const emptyActions = empty.createDiv({ cls: "tg-daily-planner-empty-actions" });
      this.iconButton(emptyActions, "Open Courses", "graduation-cap", "tg-course-btn tg-course-btn-primary", () => this.openNote(PATHS.courses));
      this.iconButton(emptyActions, "Open Books", "book-open", "tg-course-btn tg-course-btn-muted", () => this.openNote(PATHS.books));
    }
  }

  renderDailyPlannerDay(parent, date, title, tasks, iconName) {
    const card = parent.createDiv({ cls: `tg-daily-planner-day tg-daily-planner-${title.toLowerCase()}` });
    const header = card.createDiv({ cls: "tg-daily-planner-day-header" });
    const icon = header.createDiv({ cls: "tg-daily-planner-day-icon" });
    this.createPremiumIcon(icon, iconName, "tg-premium-svg-icon");
    const copy = header.createDiv({ cls: "tg-daily-planner-day-copy" });
    copy.createEl("strong", { text: title });
    copy.createSpan({ text: this.formatPlannerDate(date, { long: true }) });
    const dayProgress = tasks.reduce((sum, task) => {
      const progress = this.getDailyPlannerTaskProgress(task);
      sum.completed += progress.completed;
      sum.total += progress.total;
      return sum;
    }, { completed: 0, total: 0 });
    const count = header.createDiv({ cls: "tg-daily-planner-day-count" });
    count.createEl("strong", { text: `${dayProgress.completed}/${dayProgress.total}` });
    count.createSpan({ text: "ITEMS" });
    const progress = card.createDiv({ cls: "tg-daily-planner-day-progress" });
    const fill = progress.createDiv();
    fill.style.width = `${dayProgress.total ? Math.round(dayProgress.completed / dayProgress.total * 100) : 0}%`;

    const list = card.createDiv({ cls: "tg-daily-planner-task-list" });
    if (!tasks.length) {
      const empty = list.createDiv({ cls: "tg-daily-planner-day-empty" });
      empty.createSpan({ text: title === "Today" ? "No tasks planned for today." : "Nothing scheduled for tomorrow yet." });
      empty.createSpan({ text: title === "Today" ? "Add a topic or reading session from its section." : "Plan a topic or reading session to get ahead." });
      return;
    }
    for (const task of tasks) this.renderDailyPlannerTask(list, task);
  }

  renderDailyPlannerTaskGroup(parent, title, subtitle, tasks, iconName, isOverdue) {
    const group = parent.createDiv({ cls: `tg-daily-planner-group${isOverdue ? " is-overdue" : ""}` });
    const header = group.createDiv({ cls: "tg-daily-planner-group-header" });
    this.createPremiumIcon(header, iconName, "tg-premium-svg-icon");
    const copy = header.createDiv();
    copy.createEl("strong", { text: title });
    copy.createSpan({ text: subtitle });
    const list = group.createDiv({ cls: "tg-daily-planner-group-list" });
    for (const task of tasks) this.renderDailyPlannerTask(list, task);
  }

  renderDailyPlannerTask(parent, task) {
    const info = this.resolveDailyPlannerTask(task);
    if (!info) {
      const orphan = parent.createDiv({ cls: "tg-planner-task tg-planner-task-orphan" });
      const copy = orphan.createDiv({ cls: "tg-planner-task-copy" });
      copy.createEl("strong", { text: "Source item unavailable" });
      copy.createSpan({ text: "This course topic or book may have been renamed or deleted." });
      this.iconButton(orphan, "Remove", "trash-2", "tg-course-btn tg-course-btn-muted", () => this.removeDailyPlannerTask(task.id));
      return;
    }
    if (task.kind === "topic") {
      this.renderDailyPlannerTopicNode(parent, info.file, info.course, info.topic, task, 0, true);
      return;
    }

    const card = parent.createDiv({ cls: "tg-planner-task tg-planner-book-task" });
    const row = card.createDiv({ cls: "tg-planner-task-row" });
    const checkbox = row.createEl("input", {
      cls: "tg-planner-task-checkbox",
      attr: { type: "checkbox", "aria-label": `Mark pages ${info.startPage} to ${info.endPage} completed` }
    });
    checkbox.checked = info.completed;
    checkbox.addEventListener("change", () => this.setPlannerBookTaskCompletion(task, checkbox.checked));

    const copy = row.createDiv({ cls: "tg-planner-task-copy" });
    const title = copy.createEl("button", { cls: "tg-planner-task-title", attr: { type: "button" } });
    title.createSpan({ text: info.book.title });
    title.addEventListener("click", () => this.openBookAtPlannerTask(task, info.book));
    const currentToday = localISODate(new Date());
    const currentTomorrow = this.shiftPlannerDate(currentToday, 1);
    const bookDateMeta = task.date !== currentToday && task.date !== currentTomorrow
      ? ` · ${this.formatPlannerDate(task.date)}`
      : "";
    copy.createSpan({
      cls: "tg-planner-task-meta",
      text: `BOOKS · Pages ${info.startPage}–${info.endPage} · ${info.book.current_page}/${info.book.total_pages} read${bookDateMeta}`
    });
    if (info.completed) copy.createSpan({ cls: "tg-planner-task-complete-label", text: "Reading target completed" });

    const actions = card.createDiv({ cls: "tg-planner-task-actions" });
    this.iconButton(actions, "Move", "calendar-clock", "tg-planner-task-action", () => this.openPlannerMoveModal(task));
    this.iconButton(actions, "Remove", "x", "tg-planner-task-action", () => this.removeDailyPlannerTask(task.id));
  }

  renderDailyPlannerTopicNode(parent, file, course, topic, task, depth = 0, isTaskRoot = false) {
    const children = Array.isArray(topic.subtopics) ? topic.subtopics : [];
    const state = this.getCourseTopicState(topic);
    const node = parent.createDiv({
      cls: `tg-planner-topic-node${isTaskRoot ? " is-task-root" : ""}${state.completed ? " is-complete" : ""}${state.partial ? " is-partial" : ""}`
    });
    node.style.setProperty("--tg-planner-depth", String(depth));

    const row = node.createDiv({ cls: "tg-planner-topic-row" });
    if (children.length) {
      const collapse = row.createEl("button", {
        cls: "tg-planner-topic-collapse",
        attr: { type: "button", "aria-expanded": "true", "aria-label": "Collapse subtopics" }
      });
      this.createPremiumIcon(collapse, "chevron-down", "tg-premium-svg-icon");
      collapse.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        node.classList.toggle("is-collapsed");
        const collapsed = node.classList.contains("is-collapsed");
        collapse.empty();
        this.createPremiumIcon(collapse, collapsed ? "chevron-right" : "chevron-down", "tg-premium-svg-icon");
        collapse.setAttribute("aria-expanded", collapsed ? "false" : "true");
        collapse.setAttribute("aria-label", collapsed ? "Expand subtopics" : "Collapse subtopics");
      });
    } else {
      row.createDiv({ cls: "tg-planner-topic-collapse-placeholder" });
    }

    const checkbox = row.createEl("input", {
      cls: "tg-planner-task-checkbox",
      attr: { type: "checkbox", "aria-label": `Mark ${topic.title || "topic"} completed` }
    });
    checkbox.checked = state.completed;
    checkbox.indeterminate = state.partial;
    checkbox.addEventListener("change", () => this.toggleCourseTopic(file, topic.id, checkbox.checked));

    const copy = row.createDiv({ cls: "tg-planner-task-copy" });
    const title = copy.createEl("button", { cls: "tg-planner-task-title", attr: { type: "button" } });
    title.createSpan({ text: topic.title || "Untitled topic" });
    title.addEventListener("click", () => this.openNote(file.path));
    const currentToday = localISODate(new Date());
    const currentTomorrow = this.shiftPlannerDate(currentToday, 1);
    const topicDateMeta = task.date !== currentToday && task.date !== currentTomorrow
      ? ` · ${this.formatPlannerDate(task.date)}`
      : "";
    copy.createSpan({
      cls: "tg-planner-task-meta",
      text: isTaskRoot ? `COURSE · ${course.name}${topicDateMeta}` : "SUBTOPIC"
    });
    if (state.completed) copy.createSpan({ cls: "tg-planner-task-complete-label", text: "Completed" });
    else if (state.partial) copy.createSpan({ cls: "tg-planner-task-partial-label", text: "Partially completed" });

    if (isTaskRoot) {
      const actions = node.createDiv({ cls: "tg-planner-task-actions" });
      this.iconButton(actions, "Move", "calendar-clock", "tg-planner-task-action", () => this.openPlannerMoveModal(task));
      this.iconButton(actions, "Remove", "x", "tg-planner-task-action", () => this.removeDailyPlannerTask(task.id));
    }

    if (children.length) {
      const childList = node.createDiv({ cls: "tg-planner-topic-children" });
      for (const child of children) {
        this.renderDailyPlannerTopicNode(childList, file, course, child, task, depth + 1, false);
      }
    }
  }


  renderHomeFloatingActions(el) {
    const host = el.createDiv({ cls: "tg-explorer-fab-host tg-home-fab-host" });
    const menu = host.createDiv({
      cls: "tg-explorer-fab-menu tg-home-fab-menu",
      attr: { role: "menu", "aria-label": "Create in LIFORA", hidden: "" }
    });
    let fab = null;

    const closeMenu = () => {
      menu.hidden = true;
      menu.classList.remove("is-open");
      fab?.classList.remove("is-open");
      fab?.setAttribute("aria-expanded", "false");
      document.removeEventListener("pointerdown", closeOnOutside, true);
    };
    const closeOnOutside = event => {
      if (!host.contains(event.target)) closeMenu();
    };

    const addItem = (label, description, iconName, className, callback) => {
      const item = menu.createEl("button", {
        cls: `tg-explorer-fab-item ${className || ""}`.trim(),
        attr: { type: "button", role: "menuitem" }
      });
      const icon = item.createDiv({ cls: "tg-explorer-fab-item-icon" });
      this.createPremiumIcon(icon, iconName, "tg-premium-svg-icon");
      const copy = item.createDiv({ cls: "tg-explorer-fab-item-copy" });
      copy.createEl("strong", { text: label });
      copy.createSpan({ text: description });
      const arrow = item.createDiv({ cls: "tg-explorer-fab-item-arrow" });
      this.createPremiumIcon(arrow, "arrow-up-right", "tg-premium-svg-icon");
      item.addEventListener("click", () => {
        closeMenu();
        callback();
      });
    };

    addItem("New folder", "Choose where to create a real folder", "folder-plus", "is-folder",
      () => this.openHomeCreateLocationPicker("folder"));
    addItem("New note", "Choose a folder and create a Markdown note", "file-plus-2", "is-note",
      () => this.openHomeCreateLocationPicker("note"));
    addItem("New course", "Create a course and its study space", "graduation-cap", "is-course",
      () => this.createCourseDialog());
    addItem("Add book", "Add a book to your personal library", "book-plus", "is-book",
      () => this.createBookDialog());
    addItem("Add language", "Create a language learning space", "languages", "is-language",
      () => this.createLanguageDialog());
    addItem("Quran wird", "Create a memorization, reading, or revision wird", "book-heart", "is-quran",
      () => this.openQuranWirdDialog());
    addItem("Today's journal", "Open today's daily page", "calendar-days", "is-daily",
      () => this.openTodayJournal());

    fab = host.createEl("button", {
      cls: "tg-explorer-fab-button tg-home-fab-button",
      attr: {
        type: "button",
        title: "Create in LIFORA",
        "aria-label": "Create in LIFORA",
        "aria-haspopup": "menu",
        "aria-expanded": "false"
      }
    });
    this.createPremiumIcon(fab, "plus", "tg-premium-svg-icon tg-explorer-fab-plus");
    fab.createSpan({ cls: "tg-explorer-fab-label", text: "Create" });

    fab.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const willOpen = menu.hidden;
      if (willOpen) {
        menu.hidden = false;
        menu.classList.add("is-open");
        fab.classList.add("is-open");
        fab.setAttribute("aria-expanded", "true");
        document.addEventListener("pointerdown", closeOnOutside, true);
      } else {
        closeMenu();
      }
    });

    host.addEventListener("keydown", event => {
      if (event.key === "Escape" && !menu.hidden) {
        closeMenu();
        fab.focus();
      }
    });
  }

  openHomeCreateLocationPicker(kind = "folder") {
    const modal = new Modal(this.app);
    modal.onOpen = () => {
      const { contentEl } = modal;
      contentEl.empty();
      contentEl.addClass("tg-course-modal", "tg-explorer-create-modal", "tg-home-create-location-modal");
      contentEl.createEl("h2", { text: kind === "folder" ? "Create a folder" : "Create a note" });
      contentEl.createEl("p", {
        text: "Choose the destination folder in your vault. The new item will be created inside that real folder.",
        cls: "tg-course-modal-description"
      });

      const form = contentEl.createEl("form", { cls: "tg-course-form" });
      const field = form.createDiv({ cls: "tg-course-field" });
      field.createEl("label", { text: "Destination folder" });
      const select = field.createEl("select", { attr: { required: "true" } });

      const folders = this.getAllFolderPaths().filter(path =>
        path && !path.startsWith(".") &&
        path !== "00 Dashboard" && !path.startsWith("00 Dashboard/") &&
        path !== LEGACY_BACKUP_ROOT &&
        !path.startsWith(`${LEGACY_BACKUP_ROOT}/`) && !this.isPortableDataPath(path)
      );
      folders.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
      for (const path of folders) {
        const label = path.split("/").map(part => part.replace(/^\d+\s*/, "")).join("  /  ");
        select.createEl("option", { value: path, text: label });
      }
      const preferred = folders.includes("07 Notes") ? "07 Notes" : folders[0];
      if (preferred) select.value = preferred;

      const actions = form.createDiv({ cls: "tg-course-modal-actions" });
      const cancel = actions.createEl("button", { type: "button", text: "Cancel", cls: "tg-course-btn tg-course-btn-muted" });
      cancel.addEventListener("click", () => modal.close());
      const submit = actions.createEl("button", {
        type: "submit",
        text: kind === "folder" ? "Continue to folder name" : "Continue to note name",
        cls: "tg-course-btn tg-course-btn-primary"
      });
      form.addEventListener("submit", event => {
        event.preventDefault();
        const destination = select.value;
        if (!destination) return;
        modal.close();
        this.openExplorerCreateModal(destination, kind, async (createdPath, isFolder) => {
          if (isFolder) {
            await this.refreshHomeDashboard();
          } else {
            await this.openNote(createdPath);
          }
        });
      });
    };
    modal.open();
  }

  createPremiumIcon(parent, iconName, className = "tg-premium-svg-icon", label = "") {
    const holder = parent.createSpan({ cls: className });
    setIcon(holder, iconName || "circle-help");
    if (!holder.querySelector("svg")) setIcon(holder, "circle-help");
    if (label) holder.setAttribute("aria-label", label);
    return holder;
  }

  setButtonIcon(button, iconName, className = "tg-premium-button-icon") {
    const icon = button.createSpan({ cls: className });
    setIcon(icon, iconName || "circle-help");
    if (!icon.querySelector("svg")) setIcon(icon, "circle-help");
    return icon;
  }

  iconButton(parent, label, iconName, cls = "tg-course-btn tg-course-btn-muted", callback = null) {
    const button = parent.createEl("button", { cls });
    this.setButtonIcon(button, iconName || "circle-help");
    button.createSpan({ text: label });
    if (callback) button.addEventListener("click", callback);
    return button;
  }

  getSectionIconName(folderPath) {
    return {
      "Journal": "book-heart",
      "Journal/01 Daily": "sun",
      "Journal/02 Weekly": "calendar-range",
      "07 Notes": "notebook",
      "08 Courses": "graduation-cap",
      "09 Books": "book-open",
      "10 Quran": "book-heart",
      "11 Languages": "languages",
      "13 Daily Planner": "calendar-check"
    }[folderPath] || "folder-open";
  }


  getFileIconName(file) {
    const ext = String(file?.extension || "").toLowerCase();
    if (ext === "pdf") return "file-text";
    if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) return "image";
    if (["mp3", "wav", "m4a", "ogg"].includes(ext)) return "audio-lines";
    if (["mp4", "mov", "mkv", "webm"].includes(ext)) return "clapperboard";
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "archive";
    if (["py", "js", "ts", "html", "css", "sql", "json", "yaml", "md"].includes(ext)) return "file-code-2";
    return "file";
  }

  homeStat(parent, label, value, color, icon) {
    const card = parent.createDiv({ cls: "tg-home-stat" });
    card.style.setProperty("--tg-home-accent", color);
    const iconWrap = card.createDiv({ cls: "tg-home-stat-icon" });
    const iconMap = { graduation: "graduation-cap", books: "library-big", languages: "languages", notes: "notebook-tabs" };
    this.createPremiumIcon(iconWrap, iconMap[icon] || "sparkles", "tg-premium-svg-icon tg-home-stat-svg", label);
    const body = card.createDiv({ cls: "tg-home-stat-body" });
    body.createSpan({ text: label });
    body.createEl("strong", { text: String(value) });
  }


  renderDailySectionHighlights(parent) {
    const now = new Date();
    const today = this.getDailyNoteForDate(now);
    const recent = this.getLatestDailyNotes(6);
    const currentMonth = localISODate(now).slice(0, 7);
    const monthCount = this.app.vault.getMarkdownFiles().filter(file =>
      file.path.startsWith(`${DAILY_ROOT}/`) &&
      file.basename.startsWith(currentMonth) &&
      /^\d{4}-\d{2}-\d{2}/.test(file.basename)
    ).length;

    const panel = parent.createDiv({ cls: "tg-daily-workspace-panel" });
    const top = panel.createDiv({ cls: "tg-daily-workspace-top" });
    const copy = top.createDiv({ cls: "tg-daily-workspace-copy" });
    copy.createDiv({ cls: "tg-home-eyebrow", text: "YOUR PERSONAL JOURNAL" });
    copy.createEl("h3", { text: "Write about your day" });
    copy.createEl("p", { text: "Create a dated page, open it, and write freely. Every entry stays as a real Markdown note." });

    const actions = top.createDiv({ cls: "tg-daily-workspace-actions" });
    const todayButton = actions.createEl("button", { cls: "tg-course-btn tg-course-btn-primary", attr: { type: "button" } });
    this.setButtonIcon(todayButton, today ? "book-open" : "plus");
    todayButton.createSpan({ text: today ? "Continue today's journal" : "Create today's journal" });
    todayButton.addEventListener("click", () => this.createDailyJournal(now));

    const calendarButton = actions.createEl("button", { cls: "tg-course-btn tg-course-btn-muted", attr: { type: "button" } });
    this.setButtonIcon(calendarButton, "calendar-days");
    calendarButton.createSpan({ text: "Open calendar" });
    calendarButton.addEventListener("click", () => this.openCalendar());

    const weeklyButton = actions.createEl("button", { cls: "tg-course-btn tg-course-btn-muted", attr: { type: "button" } });
    this.setButtonIcon(weeklyButton, "calendar-range");
    weeklyButton.createSpan({ text: "Weekly planning" });
    weeklyButton.addEventListener("click", () => this.openDashboardNote(PATHS.weekly));

    const stats = panel.createDiv({ cls: "tg-daily-workspace-stats" });
    const stat = stats.createDiv({ cls: "tg-daily-workspace-stat" });
    stat.createSpan({ text: "ENTRIES THIS MONTH" });
    stat.createEl("strong", { text: String(monthCount) });

    const recentSection = panel.createDiv({ cls: "tg-daily-recent-section" });
    const recentHeader = recentSection.createDiv({ cls: "tg-daily-recent-heading" });
    recentHeader.createEl("strong", { text: "Recent entries" });
    recentHeader.createSpan({ text: `${recent.length} shown` });
    const list = recentSection.createDiv({ cls: "tg-daily-recent-days" });
    if (!recent.length) {
      list.createDiv({ cls: "tg-home-recent-empty", text: "Your journal is ready. Create your first entry above." });
    } else {
      for (const file of recent) {
        const button = list.createEl("button", { cls: "tg-daily-recent-day", attr: { type: "button" } });
        const date = file.basename.match(/^(\d{4})-(\d{2})-(\d{2})/);
        const dateText = date
          ? new Date(Number(date[1]), Number(date[2]) - 1, Number(date[3])).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
          : file.basename;
        button.createSpan({ cls: "tg-daily-recent-date", text: dateText });
        button.createSpan({ cls: "tg-daily-recent-title", text: file.basename });
        this.createPremiumIcon(button, "arrow-right", "tg-daily-recent-arrow tg-premium-svg-icon", "Open journal entry");
        button.addEventListener("click", () => this.openNote(file.path));
      }
    }
  }

  openExplorerCreateModal(folderPath, kind = "folder", onCreated = null) {
    const modal = new Modal(this.app);
    modal.onOpen = () => {
      const { contentEl } = modal;
      contentEl.empty();
      contentEl.addClass("tg-course-modal", "tg-explorer-create-modal");
      const isFolder = kind === "folder";
      contentEl.createEl("h2", { text: isFolder ? "Create a folder" : "Create a note" });
      contentEl.createEl("p", {
        text: `Create inside: ${folderPath}`,
        cls: "tg-course-modal-description"
      });
      const form = contentEl.createEl("form", { cls: "tg-course-form" });
      const field = form.createDiv({ cls: "tg-course-field" });
      field.createEl("label", { text: isFolder ? "Folder name" : "Note name" });
      const input = field.createEl("input", {
        type: "text",
        placeholder: isFolder ? "e.g. Research, Resources, Projects" : "e.g. Learning Notes"
      });
      input.required = true;
      input.autocomplete = "off";
      const hint = field.createDiv({ cls: "tg-explorer-modal-hint" });
      hint.setText(isFolder
        ? "A real folder will be created in your Obsidian vault."
        : "A Markdown note will be created and opened for editing.");

      // Keep both action buttons inside the form. A submit button outside its
      // form does not dispatch the submit event, which made Create appear inert.
      const actions = form.createDiv({ cls: "tg-course-modal-actions" });
      const cancel = actions.createEl("button", { text: "Cancel", cls: "tg-course-btn tg-course-btn-muted", attr: { type: "button" } });
      cancel.addEventListener("click", () => modal.close());
      const submit = actions.createEl("button", {
        text: isFolder ? "Create folder" : "Create note",
        cls: "tg-course-btn tg-course-btn-primary",
        attr: { type: "submit" }
      });

      form.addEventListener("submit", async event => {
        event.preventDefault();
        const name = safeName(input.value);
        if (!name) {
          new Notice(isFolder ? "Enter a folder name first." : "Enter a note name first.");
          input.focus();
          return;
        }

        const parent = this.app.vault.getAbstractFileByPath(folderPath);
        if (!(parent instanceof TFolder)) {
          new Notice("The destination folder no longer exists. Choose another folder and try again.");
          return;
        }

        const fileName = isFolder ? name : (name.toLowerCase().endsWith(".md") ? name : `${name}.md`);
        const targetPath = `${folderPath}/${fileName}`;
        const existing = this.app.vault.getAbstractFileByPath(targetPath) ||
          this.app.vault.getAllLoadedFiles().find(file => file.path.toLocaleLowerCase() === targetPath.toLocaleLowerCase());
        if (existing) {
          new Notice("An item with this name already exists in this folder.");
          input.focus();
          return;
        }

        submit.disabled = true;
        submit.setText(isFolder ? "Creating folder…" : "Creating note…");
        let createdPath = "";
        try {
          if (isFolder) {
            await this.app.vault.createFolder(targetPath);
          } else {
            const noteTitle = name.replace(/\.md$/i, "");
            await this.app.vault.create(targetPath, `# ${noteTitle}\n\n`);
          }
          createdPath = targetPath;
        } catch (error) {
          submit.disabled = false;
          submit.setText(isFolder ? "Create folder" : "Create note");
          console.error("LIFORA Explorer could not create an item", error);
          new Notice(`Could not create item: ${error.message || error}`);
          return;
        }

        modal.close();
        new Notice(isFolder ? "Folder created successfully." : "Note created successfully.");
        if (typeof onCreated === "function") {
          try {
            await onCreated(createdPath, isFolder);
          } catch (error) {
            console.error("LIFORA created the item, but could not refresh the workspace", error);
            new Notice("The item was created, but this view could not refresh. Use Refresh to update it.");
          }
        }
      });
      input.focus();
    };
    modal.open();
  }

  renderExplorerFloatingActions(el, folderPath) {
    const host = el.createDiv({ cls: "tg-explorer-fab-host" });
    const menu = host.createDiv({
      cls: "tg-explorer-fab-menu",
      attr: { role: "menu", "aria-label": "Create in this folder", hidden: "" }
    });
    let fab = null;

    const closeMenu = () => {
      menu.hidden = true;
      menu.classList.remove("is-open");
      fab?.classList.remove("is-open");
      fab?.setAttribute("aria-expanded", "false");
      document.removeEventListener("pointerdown", closeOnOutside, true);
    };

    const closeOnOutside = event => {
      if (!host.contains(event.target)) closeMenu();
    };

    const createMenuItem = (label, description, iconName, actionClass, callback) => {
      const item = menu.createEl("button", {
        cls: `tg-explorer-fab-item ${actionClass || ""}`.trim(),
        attr: { type: "button", role: "menuitem" }
      });
      const icon = item.createDiv({ cls: "tg-explorer-fab-item-icon" });
      this.createPremiumIcon(icon, iconName, "tg-premium-svg-icon");
      const copy = item.createDiv({ cls: "tg-explorer-fab-item-copy" });
      copy.createEl("strong", { text: label });
      copy.createSpan({ text: description });
      const arrow = item.createDiv({ cls: "tg-explorer-fab-item-arrow" });
      this.createPremiumIcon(arrow, "arrow-up-right", "tg-premium-svg-icon");
      item.addEventListener("click", () => {
        closeMenu();
        callback();
      });
      return item;
    };

    createMenuItem("New folder", "Create a subfolder here", "folder-plus", "is-folder", () => {
      this.openExplorerCreateModal(folderPath, "folder", async () => {
        await this.renderSectionOverview(el, folderPath);
      });
    });

    if (folderPath === DAILY_ROOT) {
      createMenuItem("New daily entry", "Create today's dated journal page", "book-heart", "is-note", () => {
        this.createDailyJournal(new Date());
      });
    } else if (folderPath === WEEKLY_ROOT) {
      createMenuItem("New weekly plan", "Create this week's planning page", "calendar-range", "is-note", () => {
        this.createWeeklyPlan(new Date());
      });
    } else {
      createMenuItem("New note", "Create and open a Markdown file", "file-plus", "is-note", () => {
        this.openExplorerCreateModal(folderPath, "note", async createdPath => {
          await this.openNote(createdPath);
        });
      });
    }

    fab = host.createEl("button", {
      cls: "tg-explorer-fab-button",
      attr: {
        type: "button",
        title: "Create a folder or note",
        "aria-label": "Create a folder or note",
        "aria-haspopup": "menu",
        "aria-expanded": "false"
      }
    });
    this.createPremiumIcon(fab, "plus", "tg-premium-svg-icon tg-explorer-fab-plus");
    fab.createSpan({ cls: "tg-explorer-fab-label", text: "Create" });

    fab.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const willOpen = menu.hidden;
      if (willOpen) {
        menu.hidden = false;
        menu.classList.add("is-open");
        fab.classList.add("is-open");
        fab.setAttribute("aria-expanded", "true");
        document.addEventListener("pointerdown", closeOnOutside, true);
      } else {
        closeMenu();
      }
    });

    host.addEventListener("keydown", event => {
      if (event.key === "Escape" && !menu.hidden) {
        closeMenu();
        fab.focus();
      }
    });
  }


  renderSectionFallback(el, folderPath, error) {
    console.error(`LIFORA recovery workspace rendered for ${folderPath}.`, error);
    el.empty();
    el.classList.add("tg-section-dashboard", "tg-explorer-view", "tg-section-recovery");

    try { this.renderGlobalDailyHeader(el, folderPath, this.getFolderDashboardPath(folderPath)); }
    catch (headerError) {
      console.warn("LIFORA section recovery could not render the shared daily cover.", headerError);
      const hero = el.createDiv({ cls: "tg-global-day-header tg-home-recovery-hero" });
      const content = hero.createDiv({ cls: "tg-global-day-header-content" });
      content.createEl("div", { cls: "tg-global-day-header-context-label", text: "LIFORA WORKSPACE" });
      content.createEl("h1", { cls: "tg-global-day-header-title", text: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) });
    }

    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    const config = SECTION_CONFIG.find(item => item.folder === folderPath);
    const heading = el.createDiv({ cls: "tg-explorer-heading" });
    const copy = heading.createDiv({ cls: "tg-explorer-heading-copy" });
    copy.createDiv({ cls: "tg-explorer-eyebrow", text: "LIFORA WORKSPACE · RECOVERY VIEW" });
    copy.createEl("h2", { text: config?.title || (folder instanceof TFolder ? folder.name.replace(/^\d+\s*/, "") : "Workspace") });
    copy.createEl("p", { text: "The enhanced view could not finish loading. Your folders and files are still available below." });
    const actions = heading.createDiv({ cls: "tg-explorer-heading-actions" });
    this.iconButton(actions, "Home", "house", "tg-course-btn tg-course-btn-muted", () => this.openDashboardNote(PATHS.home));
    if (!(folder instanceof TFolder)) {
      el.createDiv({ cls: "tg-explorer-empty-state", text: "This folder could not be found. Return to Home and choose another section." });
      return;
    }

    const children = folder.children || [];
    const subfolders = children.filter(item => item instanceof TFolder);
    const files = children.filter(item => item instanceof TFile && !this.isSystemDashboardPath(item.path));
    const folderSection = el.createDiv({ cls: "tg-explorer-content-section" });
    folderSection.createEl("h3", { text: `Folders (${subfolders.length})` });
    const folderGrid = folderSection.createDiv({ cls: "tg-explorer-folder-grid" });
    for (const child of subfolders) {
      const card = folderGrid.createEl("button", { cls: "tg-explorer-folder-card", attr: { type: "button" } });
      const title = card.createDiv({ cls: "tg-explorer-item-copy" });
      title.createEl("strong", { text: child.name });
      title.createSpan({ text: `${child.children.filter(item => item instanceof TFolder).length} folders · ${child.children.filter(item => item instanceof TFile).length} files` });
      card.addEventListener("click", () => this.openFolderDashboard(child.path));
    }

    const fileSection = el.createDiv({ cls: "tg-explorer-content-section" });
    fileSection.createEl("h3", { text: `Files (${files.length})` });
    const fileGrid = fileSection.createDiv({ cls: "tg-explorer-file-grid" });
    for (const file of files) {
      const card = fileGrid.createEl("button", { cls: "tg-explorer-file-card", attr: { type: "button" } });
      const title = card.createDiv({ cls: "tg-explorer-item-copy" });
      title.createEl("strong", { text: file.basename });
      title.createSpan({ text: file.extension ? file.extension.toUpperCase() : "FILE" });
      card.addEventListener("click", () => this.openNote(file.path));
    }

    if (!subfolders.length && !files.length) {
      const empty = el.createDiv({ cls: "tg-explorer-empty-state" });
      empty.createEl("h3", { text: "This folder is ready for you" });
      empty.createEl("p", { text: "Use the floating Create button to add your first folder or note." });
    }
    try { this.renderExplorerFloatingActions(el, folderPath); }
    catch (fabError) { console.warn("LIFORA recovery view could not render the floating Create button.", fabError); }
  }

  async renderSectionOverview(el, folderPath) {
    el.empty();
    this.renderGlobalDailyHeader(el, folderPath, this.getFolderDashboardPath(folderPath));
    el.addClass("tg-section-dashboard", "tg-explorer-view");

    if (folderPath === "13 Daily Planner") {
      await this.renderDailyPlanner(el, { standalone: true });
      return;
    }

    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof TFolder)) {
      const error = el.createDiv({ cls: "tg-explorer-error" });
      this.createPremiumIcon(error, "folder-x", "tg-premium-svg-icon");
      error.createEl("h3", { text: "Folder not found" });
      error.createEl("p", { text: "This folder may have been moved or deleted. Return to the main workspace and choose another location." });
      this.iconButton(error, "Go to Home", "house", "tg-course-btn tg-course-btn-primary", () => this.openDashboardNote(PATHS.home));
      return;
    }

    const config = SECTION_CONFIG.find(item => item.folder === folderPath);
    const title = config?.title || folder.name.replace(/^\d+\s*/, "");
    const accent = config?.color || "#65a8dc";
    const appearances = this.folderAppearancesCache || await this.getFolderAppearances();
    this.folderAppearancesCache = appearances;

    const visibleFiles = currentFolder => currentFolder.children
      .filter(item => item instanceof TFile && !this.isSystemDashboardPath(item.path))
      .sort((a, b) => a.name.localeCompare(b.name));

    const getFolderMtime = currentFolder => {
      let latest = 0;
      for (const child of currentFolder.children) {
        if (child instanceof TFile) latest = Math.max(latest, child.stat?.mtime || 0);
      }
      return latest;
    };

    const childFolders = folder.children
      .filter(item => item instanceof TFolder && !["Attachments", "Tools", "_mdbase", "Views"].includes(item.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    const childFiles = visibleFiles(folder);

    // Breadcrumbs: every segment is a real folder and opens in this same workspace tab.
    const breadcrumbBar = el.createDiv({ cls: "tg-explorer-breadcrumbs" });
    const homeCrumb = breadcrumbBar.createEl("button", { cls: "tg-explorer-crumb tg-explorer-crumb-home", attr: { type: "button", "aria-label": "LIFORA Home" } });
    this.createPremiumIcon(homeCrumb, "house", "tg-premium-svg-icon");
    homeCrumb.addEventListener("click", () => this.openDashboardNote(PATHS.home));
    const segments = folderPath.split("/").filter(Boolean);
    let accumulated = "";
    for (let index = 0; index < segments.length; index++) {
      const segment = segments[index];
      accumulated = accumulated ? `${accumulated}/${segment}` : segment;
      const separator = breadcrumbBar.createSpan({ cls: "tg-explorer-breadcrumb-separator" });
      this.createPremiumIcon(separator, "chevron-right", "tg-premium-svg-icon");
      const currentPath = accumulated;
      const isLast = index === segments.length - 1;
      const crumb = breadcrumbBar.createEl(isLast ? "span" : "button", {
        cls: isLast ? "tg-explorer-crumb is-current" : "tg-explorer-crumb",
        text: segment.replace(/^\d+\s*/, ""),
        ...(isLast ? {} : { attr: { type: "button" } })
      });
      if (!isLast) crumb.addEventListener("click", () => this.openFolderDashboard(currentPath));
    }

    // Folder title and context.
    const pageHeading = el.createDiv({ cls: "tg-explorer-heading" });
    const headingIcon = pageHeading.createDiv({ cls: "tg-explorer-heading-icon" });
    headingIcon.style.setProperty("--tg-explorer-accent", accent);
    this.createPremiumIcon(headingIcon, config?.icon || "folder-open", "tg-premium-svg-icon");
    const headingCopy = pageHeading.createDiv({ cls: "tg-explorer-heading-copy" });
    headingCopy.createEl("div", { cls: "tg-explorer-eyebrow", text: config ? "LIFORA WORKSPACE" : "FOLDER WORKSPACE" });
    headingCopy.createEl("h2", { text: title });
    headingCopy.createEl("p", {
      text: config?.description || "Browse, organize, and open the folders and files in this location."
    });
    const headingActions = pageHeading.createDiv({ cls: "tg-explorer-heading-actions" });
    if (folderPath.includes("/")) {
      this.iconButton(headingActions, "Parent folder", "arrow-up", "tg-course-btn tg-course-btn-muted", () => {
        const parentPath = folderPath.slice(0, folderPath.lastIndexOf("/"));
        if (parentPath) this.openFolderDashboard(parentPath);
      });
    }
    this.iconButton(headingActions, "Folder colors", "palette", "tg-course-btn tg-course-btn-muted", () => {
      new TimeGardenFolderAppearanceModal(this.app, this, folderPath).open();
    });

    if (folderPath === "Journal/01 Daily") this.renderDailySectionHighlights(el);
    if (folderPath === "Journal/02 Weekly") this.renderReviewHighlights(el);

    if (![JOURNAL_ROOT, DAILY_ROOT, WEEKLY_ROOT].includes(folderPath)) {
      const stats = el.createDiv({ cls: "tg-explorer-stats" });
      this.homeStat(stats, "FOLDERS", childFolders.length, "#65a8dc", "notes");
      this.homeStat(stats, "FILES", childFiles.length, "#55aa83", "books");
      const latest = Math.max(getFolderMtime(folder), ...childFiles.map(file => file.stat?.mtime || 0));
      this.homeStat(stats, "LAST UPDATED", latest ? new Date(latest).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—", "#d3ad59", "calendar");
    }

    // Explorer toolbar.
    const toolbar = el.createDiv({ cls: "tg-explorer-toolbar" });
    const searchWrap = toolbar.createDiv({ cls: "tg-explorer-search-wrap" });
    this.createPremiumIcon(searchWrap, "search", "tg-premium-svg-icon tg-explorer-search-icon");
    const search = searchWrap.createEl("input", {
      type: "search",
      placeholder: "Search this folder…",
      cls: "tg-explorer-search",
      attr: { "aria-label": "Search folders and files in this location" }
    });
    const sort = toolbar.createEl("select", { cls: "tg-explorer-sort", attr: { "aria-label": "Sort items" } });
    [
      ["name-asc", "Name: A to Z"],
      ["name-desc", "Name: Z to A"],
      ["modified-desc", "Recently modified"],
      ["type", "File type"]
    ].forEach(([value, label]) => sort.createEl("option", { value, text: label }));

    const viewSwitch = toolbar.createDiv({ cls: "tg-explorer-view-switch", attr: { role: "group", "aria-label": "Display mode" } });
    const gridButton = viewSwitch.createEl("button", { cls: "tg-explorer-view-button is-active", attr: { type: "button", title: "Grid view", "aria-label": "Grid view" } });
    this.createPremiumIcon(gridButton, "layout-grid", "tg-premium-svg-icon");
    const listButton = viewSwitch.createEl("button", { cls: "tg-explorer-view-button", attr: { type: "button", title: "List view", "aria-label": "List view" } });
    this.createPremiumIcon(listButton, "list", "tg-premium-svg-icon");

    const actionGroup = toolbar.createDiv({ cls: "tg-explorer-actions" });
    this.iconButton(actionGroup, "Refresh", "refresh-cw", "tg-course-btn tg-course-btn-muted", async () => {
      await this.renderSectionOverview(el, folderPath);
    });

    const resultsLabel = el.createDiv({ cls: "tg-explorer-results-label" });
    const foldersSection = el.createDiv({ cls: "tg-explorer-content-section" });
    const foldersHeader = foldersSection.createDiv({ cls: "tg-explorer-section-header" });
    this.createPremiumIcon(foldersHeader, "folder-open", "tg-premium-svg-icon tg-explorer-section-icon", "Folders");
    foldersHeader.createEl("h3", { text: "Folders" });
    const folderCount = foldersHeader.createSpan({ cls: "tg-explorer-count" });
    const foldersContainer = foldersSection.createDiv({ cls: "tg-explorer-folder-grid" });

    const filesSection = el.createDiv({ cls: "tg-explorer-content-section" });
    const filesHeader = filesSection.createDiv({ cls: "tg-explorer-section-header" });
    this.createPremiumIcon(filesHeader, "file-text", "tg-premium-svg-icon tg-explorer-section-icon", "Files");
    filesHeader.createEl("h3", { text: "Files" });
    const fileCount = filesHeader.createSpan({ cls: "tg-explorer-count" });
    const filesContainer = filesSection.createDiv({ cls: "tg-explorer-file-grid" });

    let viewMode = "grid";
    const renderItems = () => {
      const query = search.value.trim().toLocaleLowerCase();
      const sortMode = sort.value;
      const filteredFolders = childFolders.filter(item => item.name.toLocaleLowerCase().includes(query));
      const filteredFiles = childFiles.filter(item => item.basename.toLocaleLowerCase().includes(query) ||
        String(item.extension || "").toLocaleLowerCase().includes(query));

      const sortByName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
      if (sortMode === "name-desc") {
        filteredFolders.sort((a, b) => sortByName(b, a));
        filteredFiles.sort((a, b) => sortByName(b, a));
      } else if (sortMode === "modified-desc") {
        filteredFolders.sort((a, b) => getFolderMtime(b) - getFolderMtime(a) || sortByName(a, b));
        filteredFiles.sort((a, b) => (b.stat?.mtime || 0) - (a.stat?.mtime || 0) || sortByName(a, b));
      } else if (sortMode === "type") {
        filteredFolders.sort(sortByName);
        filteredFiles.sort((a, b) => String(a.extension || "").localeCompare(String(b.extension || "")) || sortByName(a, b));
      } else {
        filteredFolders.sort(sortByName);
        filteredFiles.sort(sortByName);
      }

      foldersContainer.empty();
      filesContainer.empty();
      foldersContainer.classList.toggle("is-list", viewMode === "list");
      filesContainer.classList.toggle("is-list", viewMode === "list");
      folderCount.setText(String(filteredFolders.length));
      fileCount.setText(String(filteredFiles.length));
      resultsLabel.setText(query
        ? `${filteredFolders.length + filteredFiles.length} results for “${search.value.trim()}”`
        : `${childFolders.length + childFiles.length} items in this folder`);

      if (filteredFolders.length) {
        for (const child of filteredFolders) {
          const appearance = appearances[child.path] || {};
          const accentColor = appearance.accentColor || "#d3ad59";
          const card = foldersContainer.createDiv({ cls: "tg-explorer-folder-card" });
          card.style.setProperty("--tg-explorer-folder-accent", accentColor);
          if (appearance.backgroundColor) card.style.setProperty("--tg-explorer-folder-background", appearance.backgroundColor);
          if (appearance.textColor) card.style.setProperty("--tg-explorer-folder-text", appearance.textColor);

          const open = card.createEl("button", {
            cls: "tg-explorer-folder-open",
            attr: { type: "button", "aria-label": `Open folder ${child.name}` }
          });
          const icon = open.createDiv({ cls: "tg-explorer-folder-icon" });
          this.createPremiumIcon(icon, "folder", "tg-premium-svg-icon");
          const copy = open.createDiv({ cls: "tg-explorer-item-copy" });
          copy.createEl("strong", { text: child.name });
          const folderFiles = visibleFiles(child);
          const subfolders = child.children.filter(item => item instanceof TFolder).length;
          copy.createSpan({ text: `${subfolders} folders · ${folderFiles.length} files` });
          const arrow = open.createDiv({ cls: "tg-explorer-item-arrow" });
          this.createPremiumIcon(arrow, "arrow-up-right", "tg-premium-svg-icon");
          open.addEventListener("click", () => this.openFolderDashboard(child.path));

          const palette = card.createEl("button", {
            cls: "tg-explorer-item-menu",
            attr: { type: "button", title: "Customize folder colors", "aria-label": `Customize ${child.name}` }
          });
          this.createPremiumIcon(palette, "palette", "tg-premium-svg-icon");
          palette.addEventListener("click", event => {
            event.stopPropagation();
            new TimeGardenFolderAppearanceModal(this.app, this, child.path).open();
          });
        }
      } else if (query || childFolders.length) {
        foldersContainer.createDiv({ cls: "tg-explorer-empty-inline", text: query ? "No matching folders." : "No subfolders here yet." });
      } else {
        foldersSection.classList.add("is-empty");
      }

      if (filteredFiles.length) {
        for (const file of filteredFiles) {
          const fileCard = filesContainer.createEl("button", {
            cls: viewMode === "grid" ? "tg-explorer-file-card" : "tg-explorer-file-row",
            attr: { type: "button", "aria-label": `Open ${file.basename}` }
          });
          const icon = fileCard.createDiv({ cls: "tg-explorer-file-icon" });
          this.createPremiumIcon(icon, this.getFileIconName(file), "tg-premium-svg-icon");
          const copy = fileCard.createDiv({ cls: "tg-explorer-item-copy" });
          copy.createEl("strong", { text: file.basename });
          const modified = file.stat?.mtime
            ? new Date(file.stat.mtime).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
            : "Date unavailable";
          copy.createSpan({ text: `${file.extension ? file.extension.toUpperCase() : "FILE"} · ${modified}` });
          const arrow = fileCard.createDiv({ cls: "tg-explorer-item-arrow" });
          this.createPremiumIcon(arrow, "arrow-up-right", "tg-premium-svg-icon");
          fileCard.addEventListener("click", () => this.openNote(file.path));
        }
      } else if (query || childFiles.length) {
        filesContainer.createDiv({ cls: "tg-explorer-empty-inline", text: query ? "No matching files." : "No files in this folder yet." });
      } else {
        filesSection.classList.add("is-empty");
      }

      foldersSection.classList.toggle("is-hidden", !filteredFolders.length && Boolean(query));
      filesSection.classList.toggle("is-hidden", !filteredFiles.length && Boolean(query));
    };

    search.addEventListener("input", renderItems);
    sort.addEventListener("change", renderItems);
    gridButton.addEventListener("click", () => {
      viewMode = "grid";
      gridButton.classList.add("is-active");
      listButton.classList.remove("is-active");
      renderItems();
    });
    listButton.addEventListener("click", () => {
      viewMode = "list";
      listButton.classList.add("is-active");
      gridButton.classList.remove("is-active");
      renderItems();
    });
    renderItems();

    if (!childFolders.length && !childFiles.length) {
      const empty = el.createDiv({ cls: "tg-explorer-empty-state" });
      const emptyIcon = empty.createDiv({ cls: "tg-explorer-empty-icon" });
      this.createPremiumIcon(emptyIcon, "folder-open", "tg-premium-svg-icon");
      empty.createEl("h3", { text: "This folder is ready for you" });
      empty.createEl("p", { text: "Create a folder to organize your work, or add a Markdown note to start writing." });
      empty.createEl("p", {
        text: "Use the floating Create button to add your first folder or note.",
        cls: "tg-explorer-empty-hint"
      });
    }

    this.renderExplorerFloatingActions(el, folderPath);
  }

  async openNote(path) {
    void this.recordRecentActivity(path);
    if (this.isSystemDashboardPath(path)) {
      return this.openDashboardNote(path);
    }
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      new Notice(`LIFORA page not found: ${path}`);
      return;
    }
    const existing = this.app.workspace.getLeavesOfType("markdown").find(leaf => leaf.view?.file?.path === path);
    if (existing) {
      this.navigationLeaf = existing;
      await this.app.workspace.revealLeaf(existing);
      return;
    }
    const leaf = this.getUsableNavigationLeaf();
    await leaf.openFile(file);
    this.navigationLeaf = leaf;
    await this.app.workspace.revealLeaf(leaf);
  }

  async openCalendar() {
    const existing = this.app.workspace.getLeavesOfType("journal-calendar")[0];
    if (existing) {
      await this.app.workspace.revealLeaf(existing);
      return;
    }
    if (!this.app.plugins.enabledPlugins.has("journals")) {
      new Notice("Enable the Journals plugin to open the LIFORA calendar.");
      return;
    }
    this.runCommand("journals:open-calendar", "Journals Calendar");
  }

  runCommand(commandId, label) {
    const executed = this.app.commands.executeCommandById(commandId);
    if (executed === false) new Notice(`${label} is unavailable. Check that its Obsidian plugin is enabled.`);
  }

  createCourseDialog() {
    const defaults = {
      name: "",
      platform: "",
      instructor: "",
      status: "planned",
      parent_folder: "08 Courses",
      start_date: new Date().toISOString().slice(0, 10),
      target_date: "",
      course_url: "",
      course_color: "#65a8dc"
    };
    new CourseFormModal(this.app, defaults, true, data => this.createCourse(data), this.getAllFolderPaths()).open();
  }

  async createCourse(data) {
    const name = safeName(data.name);
    const parentFolder = data.parent_folder || "08 Courses";
    const folderPath = `${parentFolder}/${name}`;
    if (this.app.vault.getAbstractFileByPath(folderPath)) {
      throw new Error("A course folder with this name already exists in the selected location.");
    }
    await this.ensureFolder(parentFolder);
    await this.ensureFolder(folderPath);

    const status = data.status || "planned";
    const fm = [
      "---",
      "type: course",
      `course: ${yamlString(name)}`,
      `platform: ${yamlString(data.platform)}`,
      `instructor: ${yamlString(data.instructor)}`,
      `status: ${status}`,
      "progress: 0",
      `progress_tracking: ${Boolean(data.progress_tracking)}`,
      `start_date: ${yamlString(data.start_date)}`,
      `target_date: ${yamlString(data.target_date)}`,
      `course_url: ${yamlString(data.course_url)}`,
      `course_color: ${yamlString(data.course_color)}`,
      "tags:",
      "  - course",
      "cssclasses:",
      "  - timegarden-course",
      "  - timegarden-dashboard",
      "---"
    ].join("\n");

    const dashboard = `${fm}

# ${name}

\`\`\`time-garden-course-panel
\`\`\`

## My Study Notes

`;
    const dashboardFile = await this.app.vault.create(`${folderPath}/Course Dashboard.md`, dashboard);
    this.applyCourseFolderColors();
    await this.openDashboardNote(dashboardFile.path);
    this.scheduleCoursesDashboardRefresh();
    new Notice(`Course "${name}" saved as a real folder at ${folderPath}. It will sync as ordinary Vault files.`);
  }

  async renderCoursesOverview(el) {
    el.empty();
    this.renderGlobalDailyHeader(el, "08 Courses", PATHS.courses);
    el.addClass("tg-courses-app");

    const header = el.createDiv({ cls: "tg-courses-header" });
    const heading = header.createDiv();
    heading.createEl("div", { text: "YOUR LEARNING LIBRARY", cls: "tg-courses-eyebrow" });
    heading.createEl("h2", { text: "Courses" });
    heading.createEl("p", { text: "All your learning journeys, organized in one place." });
    const create = this.iconButton(header, "New Course", "plus", "tg-course-btn tg-course-btn-primary");
    create.addEventListener("click", () => {
      new CourseFormModal(this.app, {
        status: "planned",
        parent_folder: "08 Courses",
        start_date: new Date().toISOString().slice(0, 10),
        course_color: "#65a8dc"
      }, true, async data => {
        await this.createCourse(data);
        await this.renderCoursesOverview(el);
      }, this.getAllFolderPaths()).open();
    });

    const courses = this.getCourseFiles().map(file => this.getCourseData(file));
    const activeCount = courses.filter(c => c.status === "in-progress").length;
    const plannedCount = courses.filter(c => c.status === "planned").length;
    const completedCount = courses.filter(c => c.status === "completed").length;
    const stats = el.createDiv({ cls: "tg-course-stats" });
    this.statCard(stats, "TOTAL COURSES", courses.length, "#65a8dc");
    this.statCard(stats, "IN PROGRESS", activeCount, "#55aaa3");
    this.statCard(stats, "PLANNED", plannedCount, "#a78bd2");
    this.statCard(stats, "COMPLETED", completedCount, "#55aa83");

    const controls = el.createDiv({ cls: "tg-course-controls" });
    const search = controls.createEl("input", { type: "search", placeholder: "Search courses…" });
    const filter = controls.createEl("select");
    [
      ["all", "All courses"],
      ["in-progress", "In progress"],
      ["planned", "Planned"],
      ["paused", "Paused"],
      ["completed", "Completed"]
    ].forEach(([value, label]) => filter.createEl("option", { value, text: label }));

    const grid = el.createDiv({ cls: "tg-course-grid" });
    const renderCards = () => {
      grid.empty();
      const query = search.value.trim().toLowerCase();
      const status = filter.value;
      const filtered = courses.filter(c =>
        (status === "all" || c.status === status) &&
        `${c.name} ${c.platform} ${c.instructor}`.toLowerCase().includes(query)
      );
      if (!filtered.length) {
        const empty = grid.createDiv({ cls: "tg-courses-empty" });
        empty.createEl("div", { text: "No courses found", cls: "tg-courses-empty-title" });
        empty.createEl("p", { text: "Create your first course to start building your learning library." });
        return;
      }
      filtered.sort((a, b) => {
        const order = { "in-progress": 0, planned: 1, paused: 2, completed: 3 };
        return (order[a.status] ?? 4) - (order[b.status] ?? 4) || a.name.localeCompare(b.name);
      });
      for (const course of filtered) {
        const card = grid.createDiv({ cls: "tg-course-card" });
        card.style.setProperty("--tg-course-color", course.course_color);
        const top = card.createDiv({ cls: "tg-course-card-top" });
        this.createPremiumIcon(top, "graduation-cap", "tg-course-card-icon tg-premium-svg-icon", "Course");
        top.createDiv({ cls: `tg-course-status tg-status-${course.status}`, text: statusLabel(course.status) });
        card.createEl("h3", { text: course.name });
        card.createEl("p", { text: [course.platform, course.instructor].filter(Boolean).join(" · ") || "Add platform and instructor", cls: "tg-course-card-meta" });
        if (course.progressTracking) {
          const progressLine = card.createDiv({ cls: "tg-course-progress-line" });
          progressLine.createEl("span", { text: "Progress" });
          progressLine.createEl("strong", { text: `${course.progress}%` });
          const track = card.createDiv({ cls: "tg-course-progress-track" });
          const fill = track.createDiv({ cls: "tg-course-progress-fill" });
          fill.style.width = `${course.progress}%`;
        }
        const actions = card.createDiv({ cls: "tg-course-card-actions" });
        const open = this.iconButton(actions, "Open Course", "book-open", "tg-course-btn tg-course-btn-primary");
        open.addEventListener("click", () => this.openFolderDashboard(course.folderPath));
        const progress = this.iconButton(
          actions,
          course.progressTracking ? "Manage Progress" : "Enable Progress",
          "chart-no-axes-combined",
          "tg-course-btn tg-course-btn-muted"
        );
        progress.addEventListener("click", () => this.openCourseProgressManager(course.file));
        const edit = this.iconButton(actions, "Edit", "pencil", "tg-course-btn tg-course-btn-muted");
        edit.addEventListener("click", () => this.editCourse(course.file));
      }
    };
    search.addEventListener("input", renderCards);
    filter.addEventListener("change", renderCards);
    renderCards();
  }

  statCard(parent, label, value, color) {
    const card = parent.createDiv({ cls: "tg-course-stat" });
    card.style.setProperty("--tg-course-color", color);
    card.createEl("span", { text: label });
    card.createEl("strong", { text: String(value) });
  }

  async renderCoursePanel(el, sourcePath) {
    el.empty();
    this.renderGlobalDailyHeader(el, "08 Courses", sourcePath);
    el.addClass("tg-course-panel");
    const file = this.app.vault.getAbstractFileByPath(sourcePath);
    if (!(file instanceof TFile)) {
      el.createEl("p", { text: "Course study note not found." });
      return;
    }
    const course = this.getCourseData(file);
    const header = el.createDiv({ cls: "tg-course-panel-hero" });
    header.style.setProperty("--tg-course-color", course.course_color);
    const top = header.createDiv({ cls: "tg-course-panel-top" });
    this.createPremiumIcon(top, "graduation-cap", "tg-course-panel-mark tg-premium-svg-icon", "Course");
    top.createDiv({ cls: `tg-course-status tg-status-${course.status}`, text: statusLabel(course.status) });
    header.createEl("h2", { text: course.name });
    header.createEl("p", {
      text: [course.platform, course.instructor].filter(Boolean).join(" · ") || "Your personal learning space"
    });

    if (course.progressTracking) {
      const progressWrap = header.createDiv({ cls: "tg-course-panel-progress" });
      const progressText = progressWrap.createDiv({ cls: "tg-course-progress-line" });
      progressText.createEl("span", { text: "Overall completion" });
      progressText.createEl("strong", { text: `${course.progress}%` });
      const track = progressWrap.createDiv({ cls: "tg-course-progress-track" });
      const fill = track.createDiv({ cls: "tg-course-progress-fill" });
      fill.style.width = `${course.progress}%`;
    }

    this.renderCourseResources(el, course.folderPath);

    const actions = el.createDiv({ cls: "tg-course-actions" });
    this.actionButton(actions, "Edit Course Details", "tg-course-btn-muted", () => this.editCourse(file));
    if (course.progressTracking) {
      this.actionButton(actions, "Update Progress", "tg-course-btn-primary", () => this.updateCourseProgress(file));
    }
    if (course.course_url) {
      this.actionButton(actions, "Open Course Platform", "tg-course-btn-muted", () => {
        window.open(course.course_url, "_blank", "noopener");
      });
    }
    if (course.status !== "completed") {
      this.actionButton(actions, "✓ Mark Completed", "tg-course-btn-success", () => this.completeCourse(file));
    }

    const details = el.createDiv({ cls: "tg-course-details-grid" });
    this.detailItem(details, "Start date", course.start_date || "Not set");
    this.detailItem(details, "Target date", course.target_date || "Not set");
    this.detailItem(details, "Platform", course.platform || "Not set");
    this.detailItem(details, "Instructor", course.instructor || "Not set");

    if (course.progressTracking) this.renderCourseTopics(el, file, course);
  }


  renderCourseResources(parent, folderPath) {
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof TFolder)) return;

    const resources = folder.children.filter(item =>
      item instanceof TFile && !this.isSystemDashboardPath(item.path)
    );
    const subfolders = folder.children.filter(item => item instanceof TFolder);

    const section = parent.createDiv({ cls: "tg-course-resources tg-course-resources-premium" });
    const heading = section.createDiv({ cls: "tg-course-resources-heading tg-course-resources-heading-premium" });
    const headingCopy = heading.createDiv({ cls: "tg-course-resources-heading-copy" });
    headingCopy.createDiv({ cls: "tg-courses-eyebrow", text: "YOUR COURSE MATERIALS" });
    headingCopy.createEl("h3", { text: "Files & Resources" });
    headingCopy.createEl("p", { text: "Your course library, neatly organized. Open a folder to see its notes without the dashboard interface." });

    const stats = heading.createDiv({ cls: "tg-course-resources-stats" });
    const makeStat = (label, value) => {
      const chip = stats.createDiv({ cls: "tg-course-resources-stat" });
      chip.createEl("strong", { text: String(value) });
      chip.createSpan({ text: label });
    };
    makeStat("Folders", subfolders.length);
    makeStat("Files", resources.length);

    const tabs = section.createDiv({ cls: "tg-course-resource-tabs", attr: { role: "tablist", "aria-label": "Course materials" } });
    const folderTab = tabs.createEl("button", {
      cls: "tg-course-resource-tab",
      attr: { type: "button", role: "tab", "aria-selected": "false" }
    });
    folderTab.createSpan({ text: "Folders" });
    folderTab.createEl("span", { cls: "tg-course-resource-tab-count", text: String(subfolders.length) });

    const fileTab = tabs.createEl("button", {
      cls: "tg-course-resource-tab",
      attr: { type: "button", role: "tab", "aria-selected": "false" }
    });
    fileTab.createSpan({ text: "Files" });
    fileTab.createEl("span", { cls: "tg-course-resource-tab-count", text: String(resources.length) });

    const folderList = section.createDiv({ cls: "tg-course-resource-list tg-course-resource-grid tg-course-resource-tab-panel" });
    folderList.setAttribute("role", "tabpanel");
    const fileList = section.createDiv({ cls: "tg-course-resource-list tg-course-resource-grid tg-course-resource-tab-panel" });
    fileList.setAttribute("role", "tabpanel");

    const setActiveTab = tab => {
      const showFolders = tab === "folders";
      folderTab.classList.toggle("is-active", showFolders);
      fileTab.classList.toggle("is-active", !showFolders);
      folderTab.setAttribute("aria-selected", showFolders ? "true" : "false");
      fileTab.setAttribute("aria-selected", showFolders ? "false" : "true");
      folderList.classList.toggle("is-active", showFolders);
      fileList.classList.toggle("is-active", !showFolders);
    };
    folderTab.addEventListener("click", () => setActiveTab("folders"));
    fileTab.addEventListener("click", () => setActiveTab("files"));

    const addEmptyState = (target, title, message) => {
      const empty = target.createDiv({ cls: "tg-course-resources-empty tg-course-resources-tab-empty" });
      empty.createEl("strong", { text: title });
      empty.createEl("span", { text: message });
    };

    const addResourceCard = (target, child, isFolder) => {
      const button = target.createEl("button", {
        cls: `tg-course-resource-row tg-course-resource-card${isFolder ? " is-folder" : " is-file"}`
      });
      const iconWrap = button.createDiv({ cls: "tg-course-resource-cover" });
      this.createPremiumIcon(
        iconWrap,
        isFolder ? "folder-open" : this.getFileIconName(child),
        "tg-course-resource-icon tg-premium-svg-icon",
        isFolder ? "Folder" : child.basename
      );

      const body = button.createDiv({ cls: "tg-course-resource-body" });
      const bodyTop = body.createDiv({ cls: "tg-course-resource-top" });
      bodyTop.createEl("strong", { text: isFolder ? child.name : child.basename });
      bodyTop.createEl("span", {
        cls: `tg-course-resource-badge ${isFolder ? "is-folder" : "is-file"}`,
        text: isFolder ? "FOLDER" : (child.extension ? child.extension.toUpperCase() : "FILE")
      });

      const note = body.createDiv({ cls: "tg-course-resource-meta" });
      if (isFolder) {
        const visibleNotes = child.children.filter(item =>
          item instanceof TFile &&
          item.extension === "md" &&
          !this.isSystemDashboardPath(item.path)
        ).length;
        const otherFiles = child.children.filter(item =>
          item instanceof TFile &&
          item.extension !== "md" &&
          !this.isSystemDashboardPath(item.path)
        ).length;

        const noteCount = note.createSpan({
          cls: "tg-course-resource-note-count",
          text: `${visibleNotes} ${visibleNotes === 1 ? "NOTE" : "NOTES"}`
        });
        noteCount.setAttribute("aria-label", `${visibleNotes} notes in this folder`);
        if (otherFiles > 0) {
          note.createSpan({
            cls: "tg-course-resource-secondary-count",
            text: `${otherFiles} ${otherFiles === 1 ? "FILE" : "FILES"}`
          });
        }
      } else {
        note.createSpan({ text: child.extension ? `${child.extension.toUpperCase()} FILE` : "FILE" });
        const size = typeof child.stat?.size === "number" ? child.stat.size : 0;
        note.createSpan({ text: this.formatBytes(size) });
      }

      const action = body.createDiv({ cls: "tg-course-resource-action" });
      action.createSpan({ text: isFolder ? "View notes" : "Open file" });

      button.addEventListener("click", () => {
        if (isFolder) this.openFolderNotesView(child.path);
        else this.openNote(child.path);
      });
    };

    if (subfolders.length) {
      for (const child of subfolders) addResourceCard(folderList, child, true);
    } else {
      addEmptyState(folderList, "No folders yet", "Create a folder in this course to organize related notes.");
    }

    if (resources.length) {
      for (const child of resources) addResourceCard(fileList, child, false);
    } else {
      addEmptyState(fileList, "No files yet", "Add notes, PDFs, documents, or other course resources here.");
    }

    setActiveTab(subfolders.length > 0 ? "folders" : "files");
  }

  actionButton(parent, text, cls, callback) {
    const iconRules = [
      [/^✓\s*/, "check-circle"],
      [/^▶\s*/, "play"],
      [/^↻\s*/, "refresh-cw"],
      [/^↗\s*/, "external-link"],
      [/^＋\s*/, "plus"],
      [/^⚙\s*/, "settings"],
      [/^⌕\s*/, "search"],
      [/^↥\s*/, "upload"],
      [/^■\s*/, "square"],
      [/^●\s*/, "circle"],
      [/^Ⅱ\s*/, "pause"]
    ];
    let label = String(text || "");
    let iconName = "";
    for (const [pattern, icon] of iconRules) {
      if (pattern.test(label)) {
        label = label.replace(pattern, "");
        iconName = icon;
        break;
      }
    }
    const button = parent.createEl("button", { cls: `tg-course-btn ${cls}` });
    if (iconName) this.setButtonIcon(button, iconName);
    button.createSpan({ text: label });
    button.addEventListener("click", callback);
    return button;
  }


  formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value <= 0) return "0 KB";
    const units = ["B", "KB", "MB", "GB"];
    let size = value;
    let index = 0;
    while (size >= 1024 && index < units.length - 1) {
      size /= 1024;
      index += 1;
    }
    const digits = index === 0 ? 0 : size >= 10 ? 0 : 1;
    return `${size.toFixed(digits)} ${units[index]}`;
  }

  detailItem(parent, label, value) {
    const item = parent.createDiv({ cls: "tg-course-detail" });
    item.createEl("span", { text: label });
    item.createEl("strong", { text: String(value) });
  }

  openCourseProgressManager(file) {
    new CourseProgressModal(this.app, this, file).open();
  }

  async editCourse(file) {
    const course = this.getCourseData(file);
    new CourseFormModal(this.app, course, false, async data => {
      const oldFolder = course.folderPath;
      const parent = oldFolder.includes("/") ? oldFolder.slice(0, oldFolder.lastIndexOf("/")) : "";
      const newFolder = parent ? `${parent}/${safeName(data.name)}` : safeName(data.name);
      if (newFolder !== oldFolder && this.app.vault.getAbstractFileByPath(newFolder)) {
        throw new Error("Another course already uses this folder name.");
      }
      let targetFile = file;
      if (newFolder !== oldFolder) {
        const folder = this.app.vault.getAbstractFileByPath(oldFolder);
        if (!(folder instanceof TFolder)) throw new Error("Course folder not found.");
        await this.app.vault.rename(folder, newFolder);
        targetFile = this.app.vault.getAbstractFileByPath(`${newFolder}/Course Dashboard.md`);
      }
      if (!(targetFile instanceof TFile)) throw new Error("Course dashboard not found after rename.");
      await this.app.fileManager.processFrontMatter(targetFile, fm => {
        fm.course = data.name;
        fm.platform = data.platform;
        fm.instructor = data.instructor;
        fm.status = data.status;
        fm.start_date = data.start_date;
        fm.target_date = data.target_date;
        fm.course_url = data.course_url;
        fm.course_color = data.course_color;
        fm.progress_tracking = Boolean(data.progress_tracking);
      });
      this.applyCourseFolderColors();
      new Notice("Course details updated.");
      await this.openNote(targetFile.path);
    }).open();
  }

  normalizeCourseTopicTree(topics) {
    const now = new Date().toISOString().slice(0, 10);
    const normalize = topic => {
      const children = (Array.isArray(topic?.subtopics) ? topic.subtopics : []).map(normalize);
      if (children.length) {
        const completed = children.every(child => this.getCourseTopicState(child).completed);
        return {
          ...topic,
          subtopics: children,
          completed,
          completed_at: completed ? (topic.completed_at || now) : ""
        };
      }
      return {
        ...topic,
        subtopics: [],
        completed: Boolean(topic?.completed),
        completed_at: topic?.completed ? (topic.completed_at || now) : ""
      };
    };
    return (Array.isArray(topics) ? topics : []).map(normalize);
  }

  getCourseTopicState(topic) {
    const children = Array.isArray(topic?.subtopics) ? topic.subtopics : [];
    if (!children.length) {
      return { completed: Boolean(topic?.completed), partial: false };
    }
    const states = children.map(child => this.getCourseTopicState(child));
    const completed = states.every(state => state.completed);
    const partial = !completed && states.some(state => state.completed || state.partial);
    return { completed, partial };
  }

  getCourseTopicStats(topics) {
    let total = 0;
    let completed = 0;
    const visit = topic => {
      const children = Array.isArray(topic?.subtopics) ? topic.subtopics : [];
      if (children.length) {
        children.forEach(visit);
        return;
      }
      total += 1;
      if (topic?.completed) completed += 1;
    };
    (Array.isArray(topics) ? topics : []).forEach(visit);
    return { total, completed, percent: total ? Math.round(completed / total * 100) : 0 };
  }

  renderCourseTopics(parent, file, course) {
    const section = parent.createDiv({ cls: "tg-topics-section tg-topics-hierarchical" });
    const header = section.createDiv({ cls: "tg-topics-header" });
    const titleGroup = header.createDiv({ cls: "tg-topics-title-group" });
    titleGroup.createEl("div", { text: "YOUR PERSONAL STUDY PLAN", cls: "tg-courses-eyebrow" });
    titleGroup.createEl("h3", { text: "My Learning Topics" });
    titleGroup.createEl("p", { text: "Build your own study structure with topics and subtopics. Check off each study item as you complete it." });
    const add = this.iconButton(header, "Add Topic", "list-plus", "tg-course-btn tg-course-btn-primary");
    add.setAttribute("type", "button");
    add.addEventListener("click", () => this.editCourseTopic(file));

    const topics = Array.isArray(course.topics) ? course.topics : [];
    const stats = this.getCourseTopicStats(topics);
    const summary = section.createDiv({ cls: "tg-topics-summary" });
    const summaryLine = summary.createDiv({ cls: "tg-topics-summary-main" });
    summaryLine.createEl("strong", { text: `${stats.completed} of ${stats.total} study items completed` });
    summaryLine.createEl("span", {
      text: topics.length
        ? `${stats.percent}% complete · ${topics.length} main ${topics.length === 1 ? "topic" : "topics"}`
        : "Add your first topic to begin"
    });
    const track = summary.createDiv({ cls: "tg-course-progress-track tg-topics-progress-track" });
    const fill = track.createDiv({ cls: "tg-course-progress-fill" });
    fill.style.width = `${stats.percent}%`;

    if (!topics.length) {
      const empty = section.createDiv({ cls: "tg-topics-empty" });
      this.createPremiumIcon(empty, "list-plus", "tg-topics-empty-icon tg-premium-svg-icon", "Add topic");
      empty.createEl("strong", { text: "Your learning plan starts here" });
      empty.createEl("p", { text: "Add a main topic, then add as many subtopics as you need. Your course progress will be calculated from the completed study items." });
      return;
    }

    const toolbar = section.createDiv({ cls: "tg-topics-toolbar" });
    const expandAll = this.iconButton(toolbar, "Expand all", "chevrons-down", "tg-topic-toolbar-btn");
    expandAll.setAttribute("type", "button");
    const collapseAll = this.iconButton(toolbar, "Collapse all", "chevrons-up", "tg-topic-toolbar-btn");
    collapseAll.setAttribute("type", "button");

    const list = section.createDiv({ cls: "tg-topics-list tg-topics-tree" });
    const updateNodeToggle = node => {
      const collapsed = node.classList.contains("is-collapsed");
      const toggle = node.querySelector(":scope > .tg-topic-row .tg-topic-collapse-toggle");
      if (!toggle) return;
      toggle.empty();
      this.setButtonIcon(toggle, collapsed ? "chevron-right" : "chevron-down", "tg-topic-collapse-icon");
      toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
      toggle.setAttribute("aria-label", collapsed ? "Expand topic" : "Collapse topic");
    };

    const renderNode = (topic, depth, container) => {
      const children = Array.isArray(topic.subtopics) ? topic.subtopics : [];
      const state = this.getCourseTopicState(topic);
      const node = container.createDiv({
        cls: `tg-topic-node${state.completed ? " is-complete" : ""}${state.partial ? " is-partial" : ""}`
      });
      node.style.setProperty("--tg-topic-depth", String(depth));

      const row = node.createDiv({ cls: `tg-topic-row tg-topic-tree-row${state.completed ? " is-complete" : ""}` });
      const collapse = row.createEl("button", {
        cls: "tg-topic-collapse-toggle",
        attr: { type: "button", "aria-expanded": "true", "aria-label": "Collapse topic" }
      });
      this.setButtonIcon(collapse, "chevron-down", "tg-topic-collapse-icon");
      collapse.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        node.classList.toggle("is-collapsed");
        updateNodeToggle(node);
      });

      const checkWrap = row.createDiv({ cls: "tg-topic-check-wrap" });
      const checkbox = checkWrap.createEl("input", {
        cls: "tg-topic-checkbox",
        attr: { type: "checkbox", "aria-label": `Mark ${topic.title || "topic"} completed` }
      });
      checkbox.checked = state.completed;
      checkbox.indeterminate = state.partial;
      checkbox.addEventListener("click", event => event.stopPropagation());
      checkbox.addEventListener("change", () => this.toggleCourseTopic(file, topic.id, checkbox.checked));

      const body = row.createDiv({ cls: "tg-topic-body" });
      const titleLine = body.createDiv({ cls: "tg-topic-title-line" });
      titleLine.createDiv({ cls: "tg-topic-name", text: topic.title || "Untitled topic" });
      if (children.length) {
        titleLine.createSpan({
          cls: "tg-topic-child-count",
          text: `${children.length} ${children.length === 1 ? "SUBTOPIC" : "SUBTOPICS"}`
        });
      }
      body.createDiv({
        cls: `tg-topic-state${state.completed ? " is-complete" : ""}${state.partial ? " is-partial" : ""}`,
        text: state.completed
          ? `Completed${topic.completed_at ? ` · ${topic.completed_at}` : ""}`
          : state.partial ? "In progress" : "Not completed yet"
      });

      const content = node.createDiv({ cls: "tg-topic-content" });
      if (topic.description) {
        content.createDiv({ cls: "tg-topic-description", text: topic.description });
      }

      const actions = content.createDiv({ cls: "tg-topic-actions tg-topic-tree-actions" });
      const addChild = actions.createEl("button", {
        text: "+ Add subtopic",
        cls: "tg-topic-action tg-topic-add-child",
        attr: { type: "button" }
      });
      addChild.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        this.editCourseTopic(file, null, topic.id, true);
      });
      const plan = actions.createEl("button", {
        text: "Plan",
        cls: "tg-topic-action tg-topic-plan-action",
        attr: { type: "button", title: "Add this topic and its nested subtopics to a day" }
      });
      this.createPremiumIcon(plan, "calendar-plus", "tg-topic-plan-icon tg-premium-svg-icon");
      plan.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        this.openPlannerScheduleTopic(file, topic);
      });

      const edit = actions.createEl("button", {
        text: "Edit", cls: "tg-topic-action", attr: { type: "button" }
      });
      edit.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        this.editCourseTopic(file, topic, null, depth > 0);
      });
      const remove = actions.createEl("button", {
        text: "Delete", cls: "tg-topic-action tg-topic-delete", attr: { type: "button" }
      });
      remove.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        this.deleteCourseTopic(file, topic.id);
      });

      if (children.length) {
        const childList = content.createDiv({ cls: "tg-topic-children" });
        for (const child of children) renderNode(child, depth + 1, childList);
      }
      return node;
    };

    for (const topic of topics) renderNode(topic, 0, list);

    const setAllCollapsed = collapsed => {
      list.querySelectorAll(".tg-topic-node").forEach(node => {
        node.classList.toggle("is-collapsed", collapsed);
        updateNodeToggle(node);
      });
    };
    expandAll.addEventListener("click", () => setAllCollapsed(false));
    collapseAll.addEventListener("click", () => setAllCollapsed(true));
  }

  async editCourseTopic(file, existing = null, parentId = null, isSubtopic = false) {
    new TopicFormModal(this.app, existing || {}, async topic => {
      const course = this.getCourseData(file);
      const topics = JSON.parse(JSON.stringify(Array.isArray(course.topics) ? course.topics : []));
      let updated = false;

      const replaceInTree = items => items.map(item => {
        if (item.id === topic.id) {
          updated = true;
          return {
            ...item,
            ...topic,
            subtopics: Array.isArray(item.subtopics) ? item.subtopics : (Array.isArray(topic.subtopics) ? topic.subtopics : [])
          };
        }
        const children = Array.isArray(item.subtopics) ? item.subtopics : [];
        return children.length ? { ...item, subtopics: replaceInTree(children) } : item;
      });

      if (existing) {
        const replaced = replaceInTree(topics);
        if (!updated) throw new Error("This topic could not be found. Refresh the course and try again.");
        await this.saveCourseTopics(file, replaced);
        new Notice("Topic updated.");
        return;
      }

      if (parentId) {
        const appendToParent = items => items.map(item => {
          if (item.id === parentId) {
            updated = true;
            return { ...item, subtopics: [...(Array.isArray(item.subtopics) ? item.subtopics : []), topic] };
          }
          const children = Array.isArray(item.subtopics) ? item.subtopics : [];
          return children.length ? { ...item, subtopics: appendToParent(children) } : item;
        });
        const next = appendToParent(topics);
        if (!updated) throw new Error("The parent topic could not be found. Refresh the course and try again.");
        await this.saveCourseTopics(file, next);
        new Notice("Subtopic added.");
        return;
      }

      topics.push(topic);
      await this.saveCourseTopics(file, topics);
      new Notice("Topic added.");
    }, Boolean(parentId) || Boolean(isSubtopic)).open();
  }

  async toggleCourseTopic(file, topicId, completed) {
    const course = this.getCourseData(file);
    const topics = JSON.parse(JSON.stringify(Array.isArray(course.topics) ? course.topics : []));
    const now = new Date().toISOString().slice(0, 10);
    let found = false;

    const markTree = (topic, value) => ({
      ...topic,
      completed: value,
      completed_at: value ? (topic.completed_at || now) : "",
      subtopics: (Array.isArray(topic.subtopics) ? topic.subtopics : []).map(child => markTree(child, value))
    });
    const isComplete = topic => this.getCourseTopicState(topic).completed;

    const updateTree = items => items.map(topic => {
      if (topic.id === topicId) {
        found = true;
        return markTree(topic, completed);
      }
      const children = Array.isArray(topic.subtopics) ? topic.subtopics : [];
      if (!children.length) return topic;
      const nextChildren = updateTree(children);
      const next = { ...topic, subtopics: nextChildren };
      const allComplete = nextChildren.every(isComplete);
      next.completed = allComplete;
      next.completed_at = allComplete ? (topic.completed_at || now) : "";
      return next;
    });

    const nextTopics = updateTree(topics);
    if (!found) {
      new Notice("Topic not found. Refresh the course and try again.");
      return;
    }
    await this.saveCourseTopics(file, nextTopics);
  }

  async deleteCourseTopic(file, topicId) {
    const course = this.getCourseData(file);
    const topics = JSON.parse(JSON.stringify(Array.isArray(course.topics) ? course.topics : []));
    let found = false;

    const removeFromTree = items => {
      const kept = [];
      for (const topic of items) {
        if (topic.id === topicId) {
          found = true;
          continue;
        }
        const children = Array.isArray(topic.subtopics) ? removeFromTree(topic.subtopics) : [];
        kept.push({ ...topic, subtopics: children });
      }
      return kept;
    };

    const deletedIds = new Set();
    const collectDeletedIds = items => {
      for (const topic of items || []) {
        if (topic.id === topicId) {
          const collect = node => {
            if (node?.id) deletedIds.add(node.id);
            (Array.isArray(node?.subtopics) ? node.subtopics : []).forEach(collect);
          };
          collect(topic);
        } else {
          collectDeletedIds(topic.subtopics);
        }
      }
    };
    collectDeletedIds(topics);
    const nextTopics = removeFromTree(topics);
    if (!found) {
      new Notice("Topic not found. Refresh the course and try again.");
      return;
    }
    await this.saveCourseTopics(file, nextTopics);
    if (deletedIds.size) {
      const plannerTasks = await this.getDailyPlannerTasks();
      const keptTasks = plannerTasks.filter(task =>
        task.sourcePath !== file.path || task.kind !== "topic" || !deletedIds.has(task.topicId)
      );
      if (keptTasks.length !== plannerTasks.length) {
        await this.saveDailyPlannerTasks(keptTasks);
      }
    }
    new Notice("Topic and its subtopics deleted. Their linked planner entries were also cleared.");
  }

  async saveCourseTopics(file, topics) {
    const safeTopics = this.normalizeCourseTopicTree(
      JSON.parse(JSON.stringify(Array.isArray(topics) ? topics : []))
    );
    const stats = this.getCourseTopicStats(safeTopics);
    await this.app.fileManager.processFrontMatter(file, fm => {
      fm.topics = safeTopics;
      fm.progress = stats.percent;
      if (stats.total > 0 && stats.percent === 100) {
        fm.status = "completed";
      } else if (fm.status === "completed" || stats.percent > 0) {
        fm.status = stats.percent > 0 ? "in-progress" : "planned";
      }
    });

    const openLeaf = this.app.workspace.getLeavesOfType("markdown")
      .find(leaf => leaf.view?.file?.path === file.path);
    if (openLeaf?.view?.previewMode?.rerender) {
      openLeaf.view.previewMode.rerender(true);
    } else if (openLeaf) {
      await openLeaf.openFile(file);
    }
    await this.refreshDailyPlannerViews();
  }

  async updateCourseProgress(file) {
    const course = this.getCourseData(file);
    if (course.topics && course.topics.length) {
      new Notice("Course progress is calculated automatically from your completed topics. Check or uncheck topics to update it.");
      return;
    }
    new ProgressModal(this.app, course.progress, async value => {
      await this.app.fileManager.processFrontMatter(file, fm => {
        fm.progress = value;
        if (value === 100) fm.status = "completed";
        else if (value > 0 && fm.status === "planned") fm.status = "in-progress";
      });
      new Notice(`Course progress updated to ${value}%.`);
      await this.openNote(file.path);
    }).open();
  }

  async updateCurrentCourseProgress() {
    const file = this.app.workspace.getActiveFile();
    if (!(file instanceof TFile) || file.basename.toLowerCase() !== "course dashboard") {
      new Notice("Open a Course Dashboard first.");
      return;
    }
    await this.updateCourseProgress(file);
  }

  async completeCourse(file) {
    const course = this.getCourseData(file);
    await this.app.fileManager.processFrontMatter(file, fm => {
      fm.status = "completed";
      fm.progress = 100;
      if (Array.isArray(fm.topics) && fm.topics.length) {
        const completedAt = new Date().toISOString().slice(0, 10);
        const markTree = topic => ({
          ...topic,
          completed: true,
          completed_at: topic.completed_at || completedAt,
          subtopics: (Array.isArray(topic.subtopics) ? topic.subtopics : []).map(markTree)
        });
        fm.topics = fm.topics.map(markTree);
      }
    });
    this.applyCourseFolderColors();
    new Notice(`${course.name} marked as completed. All its topics are checked, and its folder stays in the same place.`);
    await this.openNote(file.path);
    await this.refreshDailyPlannerViews();
  }

  async completeCurrentCourse() {
    const file = this.app.workspace.getActiveFile();
    if (!(file instanceof TFile) || file.basename.toLowerCase() !== "course dashboard") {
      new Notice("Open a Course Dashboard first.");
      return;
    }
    await this.completeCourse(file);
  }


  async ensureBooksHome() {
    await this.ensureFolder("09 Books");
    const path = PATHS.books;
    if (!this.app.vault.getAbstractFileByPath(path)) {
      const content = `---
cssclasses:
  - timegarden-books
  - timegarden-dashboard
tags:
  - books
  - reading
---

# My Books Library

Your personal reading library. Organize books into your own category folders, and move each book between the three reading states without creating fixed status folders.

\`\`\`time-garden-books-overview
\`\`\`

> [!tip] Add your first book
> Choose **Add Book**, enter its title and total pages, then upload its PDF/EPUB and cover from the book's own dashboard.
`;
      await this.app.vault.create(path, content);
    }
  }

  getBookFiles() {
    return this.app.vault.getMarkdownFiles().filter(file =>
      file.path.startsWith("09 Books/") &&
      file.basename.toLowerCase() === "book dashboard"
    );
  }

  getBookData(file) {
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
    const folderPath = file.path.slice(0, file.path.lastIndexOf("/"));
    const inferredTitle = folderPath.split("/").pop() || file.basename;
    return {
      file,
      folderPath,
      title: fm.book_title || inferredTitle,
      author: fm.author || "",
      total_pages: Math.max(1, Math.floor(Number(fm.total_pages) || 1)),
      current_page: Math.min(
        Math.max(0, Math.floor(Number(fm.current_page) || 0)),
        Math.max(1, Math.floor(Number(fm.total_pages) || 1))
      ),
      status: BOOK_STATUSES.some(s => s.value === fm.status) ? fm.status : "unread",
      genre: fm.genre || "",
      isbn: fm.isbn || "",
      cover_image: fm.cover_image || "",
      book_file: fm.book_file || "",
      created: fm.created || "",
      started_reading: fm.started_reading || "",
      last_read: fm.last_read || "",
      last_read_at: fm.last_read_at || "",
      completed_date: fm.completed_date || ""
    };
  }

  getBookGenreFolders() {
    const root = this.app.vault.getAbstractFileByPath("09 Books");
    if (!(root instanceof TFolder)) return [];
    const folders = [];
    const walk = folder => {
      for (const child of folder.children) {
        if (!(child instanceof TFolder)) continue;
        const dashboard = this.app.vault.getAbstractFileByPath(`${child.path}/Book Dashboard.md`);
        if (dashboard instanceof TFile) continue;
        folders.push(child.path);
        walk(child);
      }
    };
    walk(root);
    return folders.sort((a, b) => a.localeCompare(b));
  }

  normalizeBookGenre(value) {
    const raw = String(value || "").trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    if (!raw) return "";
    const relative = raw.replace(/^09 Books(?:\/|$)/i, "");
    if (!relative) return "";
    const parts = relative.split("/").map(part => safeName(part));
    if (!parts.length || parts.some(part => !part || part === "." || part === "..")) {
      throw new Error("Enter a valid category name.");
    }
    const candidate = `09 Books/${parts.join("/")}`;
    const existing = this.getBookGenreFolders().find(path => path.toLowerCase() === candidate.toLowerCase());
    const resolved = existing || candidate;
    const isInsideBook = this.getBookFiles().some(file => {
      const bookFolder = file.path.slice(0, file.path.lastIndexOf("/"));
      return resolved === bookFolder || resolved.startsWith(`${bookFolder}/`);
    });
    if (isInsideBook) throw new Error("A book folder cannot be used as a category. Choose another category name.");
    return resolved;
  }

  renderBookCover(parent, book, assets, variant = "card") {
    if (assets?.cover instanceof TFile) {
      parent.addClass("has-uploaded-cover");
      const img = parent.createEl("img", { cls: "tg-book-cover-image", attr: { alt: `${book.title} cover`, loading: "lazy" } });
      img.src = this.app.vault.getResourcePath(assets.cover);
      return img;
    }
    const placeholder = parent.createDiv({ cls: `tg-book-cover-placeholder is-${variant}` });
    placeholder.createDiv({ cls: "tg-book-cover-spine" });
    const artwork = placeholder.createDiv({ cls: "tg-book-cover-artwork" });
    const emblem = artwork.createDiv({ cls: "tg-book-cover-emblem" });
    this.createPremiumIcon(emblem, "book-open", "tg-book-cover-icon tg-premium-svg-icon", "Book cover placeholder");
    return placeholder;
  }

  bookActivityTimestamp(book) {
    const value = book.last_read_at || book.last_read || book.started_reading || book.created || "";
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  getBookAssets(book) {
    const files = this.app.vault.getFiles().filter(file => file.path.startsWith(`${book.folderPath}/`));
    const imageExts = ["png", "jpg", "jpeg", "webp", "gif", "avif"];
    const bookExts = ["pdf", "epub", "mobi", "azw", "azw3", "txt", "docx"];
    let cover = book.cover_image ? this.app.vault.getAbstractFileByPath(book.cover_image) : null;
    if (!(cover instanceof TFile)) {
      cover = files.find(file => imageExts.includes(file.extension.toLowerCase()) && /^cover\\./i.test(file.name))
        || files.find(file => imageExts.includes(file.extension.toLowerCase()));
    }
    let bookFile = book.book_file ? this.app.vault.getAbstractFileByPath(book.book_file) : null;
    if (!(bookFile instanceof TFile)) {
      bookFile = files.find(file => bookExts.includes(file.extension.toLowerCase()));
    }
    return {
      cover: cover instanceof TFile ? cover : null,
      bookFile: bookFile instanceof TFile ? bookFile : null
    };
  }

  createBookDialog() {
    const defaults = {
      title: "",
      author: "",
      total_pages: "",
      status: "unread",
      genre: ""
    };
    new BookFormModal(this.app, defaults, this.getBookGenreFolders(), true, data => this.createBook(data)).open();
  }

  async createBook(data) {
    const title = safeName(data.title);
    const genre = this.normalizeBookGenre(data.genre);
    const parent = genre || "09 Books";
    const folderPath = `${parent}/${title}`;
    if (this.app.vault.getAbstractFileByPath(folderPath)) {
      throw new Error("A book with this title already exists in that category.");
    }
    await this.ensureFolder(folderPath);
    const totalPages = Math.max(1, Math.floor(Number(data.total_pages) || 1));
    const status = data.status || "unread";
    const currentPage = status === "read" ? totalPages : 0;
    const fm = [
      "---",
      "type: book",
      `book_title: ${yamlString(title)}`,
      `author: ${yamlString(data.author)}`,
      `total_pages: ${totalPages}`,
      `current_page: ${currentPage}`,
      `status: ${status}`,
      `genre: ${yamlString(genre)}`,
      'cover_image: ""',
      'book_file: ""',
      `created: ${yamlString(new Date().toISOString().slice(0, 10))}`,
      'started_reading: ""',
      'last_read: ""',
      'last_read_at: ""',
      `completed_date: ${status === "read" ? yamlString(localISODate()) : '""'}`,
      "tags:",
      "  - book",
      "  - reading",
      "cssclasses:",
      "  - timegarden-book",
      "  - timegarden-dashboard",
      "---"
    ].join("\n");
    const content = `${fm}

# ${title}

\`\`\`time-garden-book-panel
\`\`\`

## Reading Notes & Highlights

Write your notes, favorite quotes, questions, and reflections about this book here.
`;
    const file = await this.app.vault.create(`${folderPath}/Book Dashboard.md`, content);
    await this.openDashboardNote(file.path);
    new Notice(`"${title}" added to your Books Library.`);
  }

  createBookGenreDialog() {
    new BookGenreModal(this.app, this.getBookGenreFolders(), async data => {
      const parent = data.parent || "09 Books";
      const path = `${parent}/${data.name}`;
      if (this.app.vault.getAbstractFileByPath(path)) {
        throw new Error("A category with this name already exists here.");
      }
      await this.ensureFolder(path);
      new Notice(`Book category "${data.name}" created.`);
      await this.refreshBooksDashboardViews();
      await this.openNote(PATHS.books);
    }).open();
  }

  getBookCategoryStats(path) {
    const prefix = `${path}/`;
    const books = this.getBookFiles().filter(file => file.path.startsWith(prefix)).length;
    const subcategories = this.getBookGenreFolders().filter(folder => folder.startsWith(prefix)).length;
    return { books, subcategories };
  }

  manageBookCategoriesDialog() {
    new BookCategoryManagerModal(
      this.app,
      () => this.getBookGenreFolders(),
      path => this.getBookCategoryStats(path),
      path => this.deleteBookCategory(path)
    ).open();
  }

  async deleteBookCategory(path) {
    if (!String(path || "").startsWith("09 Books/") || path === "09 Books") {
      throw new Error("Only a saved category inside the Books folder can be deleted here.");
    }
    const folder = this.app.vault.getAbstractFileByPath(path);
    if (!(folder instanceof TFolder)) throw new Error("This category folder no longer exists.");
    const stats = this.getBookCategoryStats(path);
    await this.app.vault.delete(folder, true);
    new Notice(`Category deleted. ${stats.books} book(s) removed from the library and Recently Read.`);
    await this.refreshBooksDashboardViews();
  }

  async renderBooksOverview(el) {
    el.empty();
    this.renderGlobalDailyHeader(el, "09 Books", PATHS.books);
    el.addClass("tg-books-app");

    const books = this.getBookFiles().map(file => this.getBookData(file));
    const readingCount = books.filter(book => book.status === "currently-reading").length;
    const unreadCount = books.filter(book => book.status === "unread").length;
    const readCount = books.filter(book => book.status === "read").length;

    const header = el.createDiv({ cls: "tg-books-header" });
    const heading = header.createDiv();
    heading.createEl("div", { text: "YOUR PERSONAL LIBRARY", cls: "tg-courses-eyebrow" });
    heading.createEl("h2", { text: "Books" });
    heading.createEl("p", { text: "A beautifully organized home for every book you own and read." });
    const headerActions = header.createDiv({ cls: "tg-books-header-actions" });
    const addBook = this.iconButton(headerActions, "Add Book", "book-plus", "tg-course-btn tg-course-btn-primary");
    addBook.addEventListener("click", () => this.createBookDialog());
    const addGenre = this.iconButton(headerActions, "New Category", "folder-plus", "tg-course-btn tg-course-btn-muted");
    addGenre.addEventListener("click", () => this.createBookGenreDialog());
    const manageGenres = this.iconButton(headerActions, "Manage Categories", "folder-cog", "tg-course-btn tg-course-btn-muted");
    manageGenres.addEventListener("click", () => this.manageBookCategoriesDialog());

    const stats = el.createDiv({ cls: "tg-books-stats" });
    this.bookStat(stats, "CURRENTLY READING", readingCount, "#55aaa3");
    this.bookStat(stats, "WANT TO READ", unreadCount, "#d3ad59");
    this.bookStat(stats, "READ", readCount, "#65a8dc");
    this.bookStat(stats, "TOTAL BOOKS", books.length, "#a78bd2");

    // A direct resume area: clicking a card opens its uploaded PDF at the saved page.
    const recentBooks = books
      .filter(book => book.status === "currently-reading" || book.status === "read")
      .sort((a, b) => this.bookActivityTimestamp(b) - this.bookActivityTimestamp(a))
      .slice(0, 4);
    const recentSection = el.createDiv({ cls: "tg-books-recent-section" });
    const recentHeader = recentSection.createDiv({ cls: "tg-books-recent-header" });
    const recentHeading = recentHeader.createDiv();
    recentHeading.createEl("div", { text: "PICK UP WHERE YOU LEFT OFF", cls: "tg-courses-eyebrow" });
    recentHeading.createEl("h3", { text: "Recently Read" });
    recentHeading.createEl("p", { text: "Open a book to return to the last page you saved." });
    const recentGrid = recentSection.createDiv({ cls: "tg-books-recent-grid" });
    if (!recentBooks.length) {
      const emptyRecent = recentGrid.createDiv({ cls: "tg-books-recent-empty" });
      this.createPremiumIcon(emptyRecent, "book-open-check", "tg-books-recent-empty-icon tg-premium-svg-icon", "Continue reading");
      emptyRecent.createEl("span", { text: "Your reading history will appear here when you start a book." });
    } else {
      for (const book of recentBooks) {
        const assets = this.getBookAssets(book);
        const card = recentGrid.createDiv({ cls: "tg-book-recent-card", attr: { role: "button", tabindex: "0" } });
        card.addEventListener("click", () => this.openBookAtLastPage(book));
        card.addEventListener("keydown", event => {
          if (event.target !== card) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            this.openBookAtLastPage(book);
          }
        });
        const cover = card.createDiv({ cls: "tg-book-recent-cover" });
        this.renderBookCover(cover, book, assets, "recent");
        const info = card.createDiv({ cls: "tg-book-recent-info" });
        info.createEl("span", {
          text: book.status === "read" ? "COMPLETED" : "CURRENTLY READING",
          cls: `tg-book-recent-kicker ${book.status === "read" ? "is-completed" : ""}`
        });
        info.createEl("strong", { text: book.title, cls: "tg-book-recent-title" });
        info.createEl("span", { text: book.author || "Author not added", cls: "tg-book-recent-author" });
        const page = Math.max(1, book.current_page || 1);
        info.createEl("span", {
          text: book.status === "read"
            ? `Last page read: ${page} of ${book.total_pages}`
            : `Resume from page ${page} of ${book.total_pages}`,
          cls: "tg-book-recent-page"
        });
        const progress = info.createDiv({ cls: "tg-book-recent-progress" });
        const fill = progress.createSpan();
        fill.style.width = `${Math.max(0, Math.min(100, Math.round(book.current_page / book.total_pages * 100)))}%`;
        const resume = info.createEl("button", { cls: "tg-book-recent-resume" });
        this.createPremiumIcon(resume, "play", "tg-book-recent-resume-icon tg-premium-svg-icon");
        resume.createSpan({ text: book.status === "read" ? "Open Last Page" : "Continue Reading" });
        resume.addEventListener("click", event => {
          event.stopPropagation();
          this.openBookAtLastPage(book);
        });
      }
    }

    const tabs = el.createDiv({ cls: "tg-books-tabs" });
    const content = el.createDiv({ cls: "tg-books-content" });
    let activeStatus = "currently-reading";
    let query = "";
    let genreFilter = "all";

    const tabButtons = {};
    const statusOptions = [
      { value: "currently-reading", label: "Currently Reading", count: readingCount },
      { value: "unread", label: "Unread", count: unreadCount },
      { value: "read", label: "Read", count: readCount }
    ];

    for (const option of statusOptions) {
      const button = tabs.createEl("button", { cls: "tg-books-tab" });
      button.createSpan({ text: option.label });
      button.createSpan({ text: String(option.count), cls: "tg-books-tab-count" });
      button.addEventListener("click", () => {
        activeStatus = option.value;
        renderTabState();
        renderCards();
      });
      tabButtons[option.value] = button;
    }

    const controls = content.createDiv({ cls: "tg-books-controls" });
    const search = controls.createEl("input", { type: "search", placeholder: "Search by title or author…" });
    search.addEventListener("input", () => {
      query = search.value.trim().toLowerCase();
      renderCards();
    });
    const genreSelect = controls.createEl("select");
    genreSelect.createEl("option", { value: "all", text: "All categories" });
    for (const genre of this.getBookGenreFolders()) {
      genreSelect.createEl("option", {
        value: genre,
        text: genre.replace(/^09 Books\//, "")
      });
    }
    genreSelect.addEventListener("change", () => {
      genreFilter = genreSelect.value;
      renderCards();
    });

    const grid = content.createDiv({ cls: "tg-books-grid" });
    const renderTabState = () => {
      for (const [status, button] of Object.entries(tabButtons)) {
        button.toggleClass("is-active", status === activeStatus);
      }
    };

    const renderCards = () => {
      grid.empty();
      const filtered = books.filter(book =>
        book.status === activeStatus &&
        `${book.title} ${book.author} ${book.genre}`.toLowerCase().includes(query) &&
        (genreFilter === "all" || book.genre === genreFilter || book.genre.startsWith(`${genreFilter}/`))
      );

      if (!filtered.length) {
        const empty = grid.createDiv({ cls: "tg-books-empty" });
        this.createPremiumIcon(empty, "book-open", "tg-books-empty-icon tg-premium-svg-icon", "Books");
        empty.createEl("strong", {
          text: activeStatus === "currently-reading" ? "No books in progress yet"
            : activeStatus === "unread" ? "Your unread list is empty"
            : "No completed books yet"
        });
        empty.createEl("p", {
          text: activeStatus === "currently-reading"
            ? "Move a book here when you start reading it. Your page progress will appear in this section."
            : activeStatus === "unread"
              ? "Add books you want to read and keep them ready for later."
              : "Books you finish will be collected here."
        });
        return;
      }

      filtered.sort((a, b) => this.bookActivityTimestamp(b) - this.bookActivityTimestamp(a));
      for (const book of filtered) {
        const assets = this.getBookAssets(book);
        const card = grid.createDiv({ cls: "tg-book-card" });
        const cover = card.createDiv({ cls: "tg-book-cover" });
        this.renderBookCover(cover, book, assets, "card");

        const body = card.createDiv({ cls: "tg-book-card-body" });
        const top = body.createDiv({ cls: "tg-book-card-top" });
        top.createEl("span", {
          text: BOOK_STATUS_LABELS[book.status],
          cls: `tg-book-status tg-book-status-${book.status}`
        });
        if (book.genre) top.createEl("span", { text: book.genre.replace(/^09 Books\//, ""), cls: "tg-book-genre" });
        body.createEl("h3", { text: book.title });
        body.createEl("p", { text: book.author || "Author not added", cls: "tg-book-author" });
        body.createEl("p", { text: `${book.total_pages} pages`, cls: "tg-book-page-count" });

        if (book.status === "currently-reading") {
          const percent = Math.max(0, Math.min(100, Math.round(book.current_page / book.total_pages * 100)));
          const progress = body.createDiv({ cls: "tg-book-card-progress" });
          const line = progress.createDiv({ cls: "tg-book-progress-line" });
          line.createEl("span", { text: `Page ${book.current_page} of ${book.total_pages}` });
          line.createEl("strong", { text: `${percent}%` });
          const track = progress.createDiv({ cls: "tg-book-progress-track" });
          const fill = track.createDiv({ cls: "tg-book-progress-fill" });
          fill.style.width = `${percent}%`;
        }

        const actions = body.createDiv({ cls: "tg-book-card-actions" });
        const details = this.iconButton(actions, "Details", "file-text", "tg-course-btn tg-course-btn-muted");
        details.setAttribute("type", "button");
        details.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          this.openBookDetails(book.file);
        });
        const planReading = this.iconButton(actions, "Plan pages", "calendar-plus", "tg-course-btn tg-course-btn-muted");
        planReading.addEventListener("click", () => this.openPlannerScheduleBook(book.file));
        if (book.status === "currently-reading") {
          const resume = this.iconButton(actions, "Continue", "play", "tg-course-btn tg-course-btn-primary");
          resume.addEventListener("click", () => this.openBookAtLastPage(book));
          const finish = this.iconButton(actions, "Mark as Read", "book-check", "tg-course-btn tg-course-btn-muted");
          finish.addEventListener("click", () => this.confirmBookCompletion(book.file, true));
        } else if (book.status === "unread") {
          const start = this.iconButton(actions, "Start Reading", "book-open", "tg-course-btn tg-course-btn-primary");
          start.addEventListener("click", () => this.setBookStatus(book.file, "currently-reading", true));
        } else {
          const undo = this.iconButton(actions, "Move to Unread", "undo-2", "tg-course-btn tg-course-btn-muted");
          undo.addEventListener("click", () => this.setBookStatus(book.file, "unread", true));
        }
      }
    };

    renderTabState();
    renderCards();
  }

  bookStat(parent, label, value, color) {
    const card = parent.createDiv({ cls: "tg-book-stat" });
    card.style.setProperty("--tg-book-accent", color);
    card.createEl("span", { text: label });
    card.createEl("strong", { text: String(value) });
  }

  async renderBookPanel(el, sourcePath) {
    el.empty();
    this.renderGlobalDailyHeader(el, "09 Books", sourcePath);
    el.addClass("tg-book-panel");
    const file = this.app.vault.getAbstractFileByPath(sourcePath);
    if (!(file instanceof TFile)) {
      el.createEl("p", { text: "Book dashboard not found." });
      return;
    }

    const book = this.getBookData(file);
    const assets = this.getBookAssets(book);
    const hero = el.createDiv({ cls: "tg-book-hero" });
    const coverWrap = hero.createDiv({ cls: "tg-book-hero-cover" });
    this.renderBookCover(coverWrap, book, assets, "hero");

    const info = hero.createDiv({ cls: "tg-book-hero-info" });
    info.createEl("div", { text: "YOUR READING SPACE", cls: "tg-courses-eyebrow" });
    info.createEl("h2", { text: book.title });
    info.createEl("p", { text: book.author || "Author not added" });
    const meta = info.createDiv({ cls: "tg-book-hero-meta" });
    meta.createEl("span", { text: book.genre ? book.genre.replace(/^09 Books\//, "") : "Uncategorized" });
    meta.createEl("span", { text: `${book.total_pages} pages` });
    meta.createEl("span", { text: BOOK_STATUS_LABELS[book.status] });

    if (book.status === "currently-reading") {
      const percent = Math.max(0, Math.min(100, Math.round(book.current_page / book.total_pages * 100)));
      const progress = info.createDiv({ cls: "tg-book-reading-progress" });
      const line = progress.createDiv({ cls: "tg-book-progress-line" });
      line.createEl("span", { text: `Your current position: page ${book.current_page} / ${book.total_pages}` });
      line.createEl("strong", { text: `${percent}%` });
      const track = progress.createDiv({ cls: "tg-book-progress-track" });
      const fill = track.createDiv({ cls: "tg-book-progress-fill" });
      fill.style.width = `${percent}%`;
    } else if (book.status === "unread") {
      info.createEl("p", { text: "This book is waiting in your reading list. Start it whenever you are ready.", cls: "tg-book-status-message" });
    } else {
      info.createEl("p", { text: `Finished${book.completed_date ? ` on ${book.completed_date}` : ""}.`, cls: "tg-book-status-message" });
    }

    const actions = el.createDiv({ cls: "tg-book-actions" });
    this.actionButton(actions, "Edit Book Details", "tg-course-btn-muted", () => this.editBook(file));
    this.actionButton(actions, "Plan Reading", "tg-course-btn-muted", () => this.openPlannerScheduleBook(file));
    if (book.status === "unread") {
      this.actionButton(actions, "▶ Start Reading", "tg-course-btn-primary", () => this.setBookStatus(file, "currently-reading"));
    } else if (book.status === "currently-reading") {
      this.actionButton(actions, "Update Current Page", "tg-course-btn-primary", () => this.updateBookPage(file));
      this.actionButton(actions, "✓ Mark as Read", "tg-course-btn-success", () => this.confirmBookCompletion(file));
      this.actionButton(actions, "Move to Unread", "tg-course-btn-muted", () => this.setBookStatus(file, "unread"));
    } else {
      this.actionButton(actions, "↻ Read Again", "tg-course-btn-primary", () => this.setBookStatus(file, "currently-reading"));
      this.actionButton(actions, "Move to Unread", "tg-course-btn-muted", () => this.setBookStatus(file, "unread"));
    }
    this.actionButton(actions, "Upload Book File", "tg-course-btn-muted", () => this.uploadBookAsset(file, "book"));
    this.actionButton(actions, "Upload Cover Image", "tg-course-btn-muted", () => this.uploadBookAsset(file, "cover"));
    this.actionButton(actions, "Refresh Cover / Files", "tg-course-btn-muted", () => this.renderBookPanel(el, sourcePath));
    if (assets.bookFile) {
      this.actionButton(actions, book.status === "currently-reading" ? `Continue at page ${Math.max(1, book.current_page)}` : "Open Uploaded Book", "tg-course-btn-muted", () => this.openBookAtLastPage(book));
    }

    const details = el.createDiv({ cls: "tg-book-details-grid" });
    this.bookDetail(details, "Total pages", book.total_pages);
    this.bookDetail(details, "Current page", book.status === "currently-reading" ? book.current_page : "—");
    this.bookDetail(details, "Category", book.genre ? book.genre.replace(/^09 Books\//, "") : "Uncategorized");
    this.bookDetail(details, "Added", book.created || "—");
  }

  openBookDetails(file) {
    if (!(file instanceof TFile)) {
      new Notice("This book was not found. Refresh your Books Library.");
      return;
    }
    new TimeGardenBookDetailsModal(this.app, this, file.path).open();
  }

  bookDetail(parent, label, value) {
    const item = parent.createDiv({ cls: "tg-book-detail" });
    item.createEl("span", { text: label });
    item.createEl("strong", { text: String(value) });
  }

  async editBook(file) {
    const book = this.getBookData(file);
    const saveChanges = async data => {
      const oldFolder = book.folderPath;
      const newGenre = this.normalizeBookGenre(data.genre);
      const newParent = newGenre || "09 Books";
      const newFolder = `${newParent}/${safeName(data.title)}`;
      if (newFolder !== oldFolder && this.app.vault.getAbstractFileByPath(newFolder)) {
        throw new Error("A book with this title already exists in that category.");
      }
      let targetFile = file;
      if (newFolder !== oldFolder) {
        await this.ensureFolder(newParent);
        const folder = this.app.vault.getAbstractFileByPath(oldFolder);
        if (!(folder instanceof TFolder)) throw new Error("Book folder not found.");
        await this.app.vault.rename(folder, newFolder);
        targetFile = this.app.vault.getAbstractFileByPath(`${newFolder}/Book Dashboard.md`);
      }
      if (!(targetFile instanceof TFile)) throw new Error("Book dashboard not found after moving.");
      const now = new Date();
      await this.app.fileManager.processFrontMatter(targetFile, fm => {
        fm.book_title = data.title;
        fm.author = data.author;
        fm.total_pages = data.total_pages;
        fm.genre = newGenre;
        if (newFolder !== oldFolder) {
          if (fm.cover_image) fm.cover_image = String(fm.cover_image).replace(oldFolder, newFolder);
          if (fm.book_file) fm.book_file = String(fm.book_file).replace(oldFolder, newFolder);
        }
        fm.status = data.status;
        fm.current_page = Math.min(Number(fm.current_page) || 0, data.total_pages);
        if (data.status === "read") {
          fm.current_page = data.total_pages;
          fm.completed_date = fm.completed_date || localISODate(now);
          fm.last_read = localISODate(now);
          fm.last_read_at = now.toISOString();
        } else if (data.status === "currently-reading") {
          if (!fm.started_reading) fm.started_reading = localISODate(now);
          if (Number(fm.current_page) >= data.total_pages) fm.current_page = 0;
          fm.completed_date = "";
          fm.last_read = fm.last_read || localISODate(now);
          fm.last_read_at = fm.last_read_at || now.toISOString();
        } else if (data.status === "unread") {
          fm.current_page = 0;
          fm.started_reading = "";
          fm.last_read = "";
          fm.last_read_at = "";
          fm.completed_date = "";
        }
      });
      new Notice("Book details updated.");
      await this.openNote(targetFile.path);
      await this.refreshDailyPlannerViews();
    };

    new BookFormModal(this.app, {
      title: book.title,
      author: book.author,
      total_pages: String(book.total_pages),
      status: book.status,
      genre: book.genre
    }, this.getBookGenreFolders(), false, async data => {
      if (book.status !== "read" && data.status === "read") {
        new BookCompletionModal(
          this.app,
          data.title || book.title,
          book.current_page,
          data.total_pages,
          () => saveChanges(data),
          "Move this book to your Read list? You can move it back to Unread later."
        ).open();
        return;
      }
      await saveChanges(data);
    }).open();
  }

  confirmBookCompletion(file, returnToLibrary = false, message = "You have finished this book. Move it to your Read list?") {
    const book = this.getBookData(file);
    new BookCompletionModal(
      this.app,
      book.title,
      book.current_page,
      book.total_pages,
      () => this.setBookStatus(file, "read", returnToLibrary),
      message
    ).open();
  }

  async openBookAtLastPage(book) {
    const sourcePath = book?.file instanceof TFile ? book.file.path : book?.file?.path;
    const liveFile = sourcePath ? this.app.vault.getAbstractFileByPath(sourcePath) : null;
    if (!(liveFile instanceof TFile)) {
      new Notice("This book is no longer in your library. The Recently Read list will be refreshed.");
      await this.refreshBooksDashboardViews();
      return;
    }
    const currentBook = this.getBookData(liveFile);
    const assets = this.getBookAssets(currentBook);
    if (!(assets.bookFile instanceof TFile)) {
      await this.openNote(currentBook.file.path);
      new Notice("Upload the book file first. PDF books can reopen at the page you last saved.");
      return;
    }

    const now = new Date();
    await this.app.fileManager.processFrontMatter(currentBook.file, fm => {
      fm.last_read = localISODate(now);
      fm.last_read_at = now.toISOString();
    });

    const ext = assets.bookFile.extension.toLowerCase();
    if (ext === "pdf") {
      const page = Math.max(1, Math.min(currentBook.total_pages, Math.floor(Number(currentBook.current_page) || 1)));
      const linkText = `${assets.bookFile.path}#page=${page}`;
      await this.app.workspace.openLinkText(linkText, currentBook.file.path, true);
    } else {
      await this.openUploadedBook(assets.bookFile);
      if (currentBook.current_page > 0) {
        new Notice("This file format opens at its default position. Saved-page resume is currently supported for PDF files.");
      }
    }
  }

  async setBookStatus(file, status, returnToLibrary = false) {
    const book = this.getBookData(file);
    const now = new Date();
    await this.app.fileManager.processFrontMatter(file, fm => {
      fm.status = status;
      if (status === "currently-reading") {
        if (!fm.started_reading) fm.started_reading = localISODate(now);
        fm.completed_date = "";
        if (Number(fm.current_page) >= Number(fm.total_pages)) fm.current_page = 0;
        fm.last_read = localISODate(now);
        fm.last_read_at = now.toISOString();
      } else if (status === "read") {
        fm.current_page = Number(fm.total_pages) || book.total_pages;
        fm.completed_date = localISODate(now);
        fm.last_read = localISODate(now);
        fm.last_read_at = now.toISOString();
      } else if (status === "unread") {
        fm.current_page = 0;
        fm.started_reading = "";
        fm.last_read = "";
        fm.last_read_at = "";
        fm.completed_date = "";
      }
    });
    new Notice(`"${book.title}" moved to ${BOOK_STATUS_LABELS[status]}.`);
    await this.openNote(returnToLibrary ? PATHS.books : file.path);
    await this.refreshBooksDashboardViews();
    await this.refreshDailyPlannerViews();
  }

  async updateBookPage(file) {
    const book = this.getBookData(file);
    if (book.status !== "currently-reading") {
      new Notice("Page progress is available only for books in Currently Reading.");
      return;
    }
    new BookPageModal(this.app, book.current_page, book.total_pages, async page => {
      const now = new Date();
      await this.app.fileManager.processFrontMatter(file, fm => {
        fm.current_page = page;
        fm.last_read = localISODate(now);
        fm.last_read_at = now.toISOString();
      });
      new Notice(`Reading position saved: page ${page} of ${book.total_pages}.`);
      await this.openNote(file.path);
      await this.refreshBooksDashboardViews();
      await this.refreshDailyPlannerViews();
      if (page >= book.total_pages) {
        this.confirmBookCompletion(
          file,
          false,
          "You reached the final page. Would you like to move this book to your Read list?"
        );
      }
    }).open();
  }

  async uploadBookAsset(bookDashboardFile, assetType) {
    const book = this.getBookData(bookDashboardFile);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = assetType === "cover"
      ? "image/png,image/jpeg,image/webp,image/gif,image/avif"
      : ".pdf,.epub,.mobi,.azw,.azw3,.txt,.docx";
    input.addEventListener("change", async () => {
      const selected = input.files?.[0];
      if (!selected) {
        input.remove();
        return;
      }
      try {
        const ext = (selected.name.split(".").pop() || (assetType === "cover" ? "jpg" : "pdf")).toLowerCase();
        const base = assetType === "cover" ? "cover" : safeName(selected.name.replace(/\.[^.]+$/, ""));
        let path = `${book.folderPath}/${base}.${ext}`;
        let counter = 2;
        while (this.app.vault.getAbstractFileByPath(path)) {
          path = `${book.folderPath}/${base} (${counter++}).${ext}`;
        }
        const buffer = await selected.arrayBuffer();
        await this.app.vault.createBinary(path, buffer);
        if (assetType === "cover") {
          await this.app.fileManager.processFrontMatter(bookDashboardFile, fm => {
            fm.cover_image = path;
          });
        } else {
          await this.app.fileManager.processFrontMatter(bookDashboardFile, fm => {
            fm.book_file = path;
          });
        }
        new Notice(assetType === "cover" ? "Book cover uploaded." : "Book file uploaded.");
        await this.openNote(bookDashboardFile.path);
      } catch (error) {
        console.error("LIFORA book upload failed", error);
        new Notice(`Upload failed: ${error.message || error}`);
      } finally {
        input.remove();
      }
    });
    document.body.appendChild(input);
    input.click();
  }

  async openUploadedBook(file) {
    if (!(file instanceof TFile)) {
      new Notice("The uploaded book file could not be found.");
      return;
    }
    try {
      const ext = file.extension.toLowerCase();
      if (ext === "pdf") {
        await this.app.workspace.getLeaf("tab").openFile(file);
      } else if (typeof this.app.openWithDefaultApp === "function") {
        await this.app.openWithDefaultApp(file.path);
      } else {
        await this.app.workspace.getLeaf("tab").openFile(file);
      }
    } catch (error) {
      console.error(error);
      new Notice(`Could not open book file: ${error.message || error}`);
    }
  }


  async ensureQuranHome() {
    await this.ensureFolder("10 Quran");
    if (!this.app.vault.getAbstractFileByPath(PATHS.quran)) {
      const content = `---
cssclasses:
  - timegarden-quran
  - timegarden-dashboard
tags:
  - quran
  - hifz
---

# Quran Journey

A personal space for memorization, reading, and revision, with independent progress for every Surah and fully customizable daily wirds.

\`\`\`time-garden-quran-overview
\`\`\`

> [!info] How it works
> Create your own wirds, set the target, time, and repeat days. Record completed ayah ranges in each Surah to track memorization, reading, and revision separately.
`;
      await this.app.vault.create(PATHS.quran, content);
    }
    await this.getQuranData();
  }

  createDefaultQuranData() {
    return {
      schemaVersion: 1,
      riwaya: "Hafs ‘an Asim",
      settings: { showTransliteration: true, compactSurahCards: false },
      surahs: QURAN_SURAHS.map(surah => ({
        number: surah.number,
        hifzRanges: [],
        readingRanges: [],
        reviewRanges: []
      })),
      wirds: [],
      logs: {}
    };
  }

  async getQuranData() {
    const pluginData = (await this.loadData()) || {};
    let parsed = pluginData.quranTracker;
    try {
      if (!parsed) {
        // Migrate a previous local JSON file if one exists; otherwise start with an empty tracker.
        const legacyPath = "10 Quran/_data/Quran Tracker.json";
        const legacyFile = this.app.vault.getAbstractFileByPath(legacyPath);
        parsed = legacyFile instanceof TFile
          ? JSON.parse(await this.app.vault.read(legacyFile))
          : this.createDefaultQuranData();
        await this.saveData({ ...pluginData, quranTracker: parsed });
      }
      const defaults = this.createDefaultQuranData();
      parsed.schemaVersion = parsed.schemaVersion || 1;
      parsed.settings = { ...defaults.settings, ...(parsed.settings || {}) };
      parsed.surahs = Array.isArray(parsed.surahs) ? parsed.surahs : defaults.surahs;
      parsed.wirds = Array.isArray(parsed.wirds) ? parsed.wirds : [];
      parsed.logs = parsed.logs && typeof parsed.logs === "object" ? parsed.logs : {};
      for (const meta of QURAN_SURAHS) {
        let item = parsed.surahs.find(x => Number(x.number) === meta.number);
        if (!item) {
          item = { number: meta.number, hifzRanges: [], readingRanges: [], reviewRanges: [] };
          parsed.surahs.push(item);
        }
        item.hifzRanges = Array.isArray(item.hifzRanges) ? item.hifzRanges : [];
        item.readingRanges = Array.isArray(item.readingRanges) ? item.readingRanges : [];
        item.reviewRanges = Array.isArray(item.reviewRanges) ? item.reviewRanges : [];
      }
      parsed.surahs.sort((a,b) => a.number - b.number);
      return parsed;
    } catch (error) {
      console.error("LIFORA Quran data could not be parsed", error);
      throw new Error("Quran tracking data could not be read. Existing data was not replaced to protect it.");
    }
  }

  async saveQuranData(data) {
    const pluginData = (await this.loadData()) || {};
    pluginData.quranTracker = data;
    await this.saveData(pluginData);
  }

  getQuranSurahMeta(number) {
    return QURAN_SURAHS.find(item => item.number === Number(number));
  }

  getQuranSurahProgress(data, number) {
    return data.surahs.find(item => Number(item.number) === Number(number)) || {
      number, hifzRanges: [], readingRanges: [], reviewRanges: []
    };
  }

  async openQuranWirdDialog(defaultType = "memorization", existing = null, onComplete = null) {
    const data = existing || { type: defaultType, amount: 1, unit: "Ayahs", repeat: "daily", days: [0,1,2,3,4,5,6], enabled: true };
    new QuranWirdModal(this.app, data, async wird => {
      const tracker = await this.getQuranData();
      const index = tracker.wirds.findIndex(item => item.id === wird.id);
      if (index >= 0) tracker.wirds[index] = wird;
      else tracker.wirds.push(wird);
      await this.saveQuranData(tracker);
      new Notice(index >= 0 ? "Wird updated." : "Wird added.");
      if (onComplete) await onComplete();
    }).open();
  }

  async deleteQuranWird(id, refresh) {
    if (!window.confirm("Delete this wird? Previous completion records will be preserved.")) return;
    const data = await this.getQuranData();
    data.wirds = data.wirds.filter(item => item.id !== id);
    await this.saveQuranData(data);
    new Notice("Wird deleted. Previous completion records are preserved.");
    if (refresh) await refresh();
  }

  isQuranWirdScheduled(wird, dateString) {
    if (wird.enabled === false) return false;
    if (wird.startDate && dateString < wird.startDate) return false;
    if (wird.endDate && dateString > wird.endDate) return false;
    if (wird.repeat === "once") return wird.onceDate === dateString;
    const day = new Date(`${dateString}T12:00:00`).getDay();
    if (wird.repeat === "selected-days") return Array.isArray(wird.days) && wird.days.includes(day);
    return true;
  }

  async toggleQuranWird(wird, dateString, completed, refresh) {
    const data = await this.getQuranData();
    if (!data.logs[dateString]) data.logs[dateString] = {};
    const existing = data.logs[dateString][wird.id] || {};
    data.logs[dateString][wird.id] = {
      ...existing,
      done: completed,
      completedAt: completed ? new Date().toISOString() : "",
      actual: completed ? (existing.actual || wird.amount) : (existing.actual || 0)
    };
    if (wird.surah && wird.from && wird.to) {
      const surahProgress = this.getQuranSurahProgress(data, wird.surah);
      const track = QURAN_WIRD_TYPES.find(item => item.value === wird.type)?.key || "hifz";
      const rangesKey = `${track}Ranges`;
      const ranges = surahProgress[rangesKey] || [];
      if (completed) {
        const exists = ranges.some(range => Number(range.from) === Number(wird.from) && Number(range.to) === Number(wird.to) && range.date === dateString && range.sourceWird === wird.id);
        if (!exists) ranges.push({
          id: `range-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
          from: Number(wird.from), to: Number(wird.to), date: dateString,
          note: `From wird: ${wird.title}`, sourceWird: wird.id
        });
        surahProgress[rangesKey] = ranges;
      } else {
        surahProgress[rangesKey] = ranges.filter(range => !(range.sourceWird === wird.id && range.date === dateString));
      }
      const index = data.surahs.findIndex(item => Number(item.number) === Number(wird.surah));
      if (index >= 0) data.surahs[index] = surahProgress;
      else data.surahs.push(surahProgress);
    }
    await this.saveQuranData(data);
    if (refresh) await refresh();
  }

  async openQuranSurah(surahMeta, refresh) {
    const initialData = await this.getQuranData();
    const initialProgress = this.getQuranSurahProgress(initialData, surahMeta.number);
    const modal = new QuranSurahModal(this.app, surahMeta, {
      ...initialProgress,
      _reload: async () => {
        const latest = await this.getQuranData();
        return this.getQuranSurahProgress(latest, surahMeta.number);
      }
    }, async (track, range) => {
      const data = await this.getQuranData();
      const progress = this.getQuranSurahProgress(data, surahMeta.number);
      const key = `${track}Ranges`;
      progress[key].push({ id: `range-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, ...range });
      const index = data.surahs.findIndex(item => Number(item.number) === surahMeta.number);
      if (index >= 0) data.surahs[index] = progress;
      else data.surahs.push(progress);
      await this.saveQuranData(data);
      new Notice("Surah progress saved.");
      if (refresh) await refresh();
    }, async (track, rangeId) => {
      const data = await this.getQuranData();
      const progress = this.getQuranSurahProgress(data, surahMeta.number);
      progress[`${track}Ranges`] = (progress[`${track}Ranges`] || []).filter(range => range.id !== rangeId);
      const index = data.surahs.findIndex(item => Number(item.number) === surahMeta.number);
      if (index >= 0) data.surahs[index] = progress;
      await this.saveQuranData(data);
      if (refresh) await refresh();
    });
    modal.open();
  }

  formatQuranUnit(unit) {
    const legacyUnits = {
      "آيات": "Ayahs",
      "صفحات": "Pages",
      "أجزاء": "Juz",
      "أحزاب": "Hizb",
      "سور": "Surahs",
      "دقائق": "Minutes"
    };
    return legacyUnits[unit] || unit || "units";
  }

  async renderQuranOverview(el, selectedDate = localISODate()) {
    el.empty();
    this.renderGlobalDailyHeader(el, "10 Quran", PATHS.quran);
    el.addClass("tg-quran-app");
    const data = await this.getQuranData();
    const date = selectedDate || localISODate();
    const totalAyahs = QURAN_SURAHS.reduce((sum, item) => sum + item.ayahs, 0);
    const aggregate = { hifz: 0, reading: 0, review: 0 };
    for (const surah of QURAN_SURAHS) {
      const progress = this.getQuranSurahProgress(data, surah.number);
      aggregate.hifz += quranTrackCount(progress.hifzRanges, surah.ayahs);
      aggregate.reading += quranTrackCount(progress.readingRanges, surah.ayahs);
      aggregate.review += quranTrackCount(progress.reviewRanges, surah.ayahs);
    }
    const activeWirds = data.wirds.filter(item => item.enabled !== false).length;
    const header = el.createDiv({ cls: "tg-quran-header" });
    const heading = header.createDiv();
    heading.createEl("div", { text: "YOUR QURAN JOURNEY", cls: "tg-courses-eyebrow" });
    heading.createEl("h2", { text: "Quran Journey" });
    heading.createEl("p", { text: "Memorization, reading, and revision — with a personal plan and Surah-by-Surah progress." });
    const headerMeta = header.createDiv({ cls: "tg-quran-header-meta" });
    headerMeta.createSpan({ text: "114 Surahs" });
    headerMeta.createSpan({ text: `${totalAyahs.toLocaleString("en-US")} ayahs` });
    headerMeta.createSpan({ text: "Hafs ‘an Asim" });

    const stats = el.createDiv({ cls: "tg-quran-stats" });
    const statDefs = [
      ["Memorized ayahs", aggregate.hifz, "#55aa83"],
      ["Read ayahs", aggregate.reading, "#65a8dc"],
      ["Reviewed ayahs", aggregate.review, "#a78bd2"],
      ["Active wirds", activeWirds, "#d3ad59"]
    ];
    for (const [label, value, color] of statDefs) {
      const card = stats.createDiv({ cls: "tg-quran-stat" });
      card.style.setProperty("--tg-quran-accent", color);
      card.createEl("span", { text: label });
      card.createEl("strong", { text: Number(value).toLocaleString("ar-EG") });
    }

    const wirdSection = el.createDiv({ cls: "tg-quran-wird-section" });
    const wirdHeader = wirdSection.createDiv({ cls: "tg-quran-section-header" });
    const titleGroup = wirdHeader.createDiv();
    titleGroup.createEl("div", { text: "DAILY ROUTINE", cls: "tg-courses-eyebrow" });
    titleGroup.createEl("h3", { text: "My Wirds" });
    const dateWrap = wirdHeader.createDiv({ cls: "tg-quran-date-wrap" });
    dateWrap.createEl("label", { text: "View wirds for" });
    const dateInput = dateWrap.createEl("input", { type: "date" });
    dateInput.value = date;
    dateInput.addEventListener("change", () => this.renderQuranOverview(el, dateInput.value));

    const addButtons = wirdSection.createDiv({ cls: "tg-quran-add-buttons" });
    for (const type of QURAN_WIRD_TYPES) {
      const button = this.iconButton(addButtons, type.label, "plus", "tg-course-btn tg-course-btn-muted");
      button.style.setProperty("--tg-quran-button-accent", type.color);
      button.addEventListener("click", () => this.openQuranWirdDialog(type.value, null, () => this.renderQuranOverview(el, date)));
    }

    const todayWirds = data.wirds.filter(item => this.isQuranWirdScheduled(item, date));
    const completedCount = todayWirds.filter(item => data.logs[date]?.[item.id]?.done).length;
    const dailySummary = wirdSection.createDiv({ cls: "tg-quran-daily-summary" });
    dailySummary.createDiv({ cls: "tg-quran-daily-summary-title", text: `${completedCount} of ${todayWirds.length} wirds completed` });
    const dailyTrack = dailySummary.createDiv({ cls: "tg-quran-track-bar" });
    const dailyFill = dailyTrack.createDiv({ cls: "tg-quran-track-fill" });
    dailyFill.style.width = `${todayWirds.length ? Math.round(completedCount / todayWirds.length * 100) : 0}%`;
    dailyFill.style.background = "#55aa83";
    const wirdList = wirdSection.createDiv({ cls: "tg-quran-wird-list" });
    if (!todayWirds.length) {
      const empty = wirdList.createDiv({ cls: "tg-quran-empty" });
      this.createPremiumIcon(empty, "book-heart", "tg-quran-empty-icon tg-premium-svg-icon", "Quran");
      empty.createEl("strong", { text: "No wirds scheduled for this day yet" });
      empty.createEl("p", { text: "Create a memorization, reading, or revision wird and choose the target, time, and days that work for you." });
    }
    for (const wird of todayWirds) {
      const type = QURAN_WIRD_TYPES.find(item => item.value === wird.type) || QURAN_WIRD_TYPES[0];
      const log = data.logs[date]?.[wird.id] || {};
      const card = wirdList.createDiv({ cls: `tg-quran-wird-card${log.done ? " is-complete" : ""}` });
      card.style.setProperty("--tg-quran-wird-color", type.color);
      const top = card.createDiv({ cls: "tg-quran-wird-top" });
      top.createEl("span", { text: type.label, cls: "tg-quran-wird-type" });
      if (wird.time) top.createEl("span", { text: wird.time, cls: "tg-quran-wird-time" });
      card.createEl("h4", { text: wird.title });
      const details = [];
      if (wird.amount) details.push(`${Number(wird.amount).toLocaleString("en-US")} ${this.formatQuranUnit(wird.unit)}`);
      if (wird.surah) {
        const meta = this.getQuranSurahMeta(wird.surah);
        details.push(`Surah ${meta?.transliteration || meta?.name || ""}`);
      }
      if (wird.from && wird.to) details.push(`Ayahs ${wird.from}–${wird.to}`);
      if (details.length) card.createEl("p", { text: details.join(" · "), cls: "tg-quran-wird-details" });
      if (wird.notes) card.createEl("p", { text: wird.notes, cls: "tg-quran-wird-notes" });
      const actions = card.createDiv({ cls: "tg-quran-wird-actions" });
      const done = this.iconButton(actions, log.done ? "Completed" : "Mark complete", log.done ? "check-circle" : "check", `tg-course-btn ${log.done ? "tg-course-btn-success" : "tg-course-btn-primary"}`);
      done.addEventListener("click", () => this.toggleQuranWird(wird, date, !log.done, () => this.renderQuranOverview(el, date)));
      const edit = actions.createEl("button", { text: "Edit", cls: "tg-course-btn tg-course-btn-muted" });
      edit.addEventListener("click", () => this.openQuranWirdDialog(wird.type, wird, () => this.renderQuranOverview(el, date)));
      const remove = actions.createEl("button", { text: "Delete", cls: "tg-course-btn tg-course-btn-muted" });
      remove.addEventListener("click", () => this.deleteQuranWird(wird.id, () => this.renderQuranOverview(el, date)));
    }

    if (data.wirds.length) {
      const manage = wirdSection.createDiv({ cls: "tg-quran-manage-wirds" });
      const manageHead = manage.createDiv({ cls: "tg-quran-manage-head" });
      manageHead.createEl("strong", { text: "Manage all wirds" });
      manageHead.createEl("span", { text: "Edit, pause, or delete any wird, even when it is not scheduled for today." });
      const manageList = manage.createDiv({ cls: "tg-quran-manage-list" });
      for (const wird of data.wirds) {
        const type = QURAN_WIRD_TYPES.find(item => item.value === wird.type) || QURAN_WIRD_TYPES[0];
        const row = manageList.createDiv({ cls: "tg-quran-manage-row" });
        const info = row.createDiv({ cls: "tg-quran-manage-info" });
        info.createEl("strong", { text: wird.title });
        info.createEl("span", { text: `${type.label} · ${wird.repeat === "once" ? `Once: ${wird.onceDate || "No date"}` : wird.repeat === "selected-days" ? (wird.days || []).map(day => QURAN_WEEKDAYS[day]).join(", ") : "Daily"}${wird.time ? ` · ${wird.time}` : ""}` });
        const controls = row.createDiv({ cls: "tg-quran-manage-actions" });
        const state = controls.createEl("button", { text: wird.enabled === false ? "Enable" : "Pause", cls: "tg-topic-action" });
        state.addEventListener("click", async () => {
          const latest = await this.getQuranData();
          const item = latest.wirds.find(entry => entry.id === wird.id);
          if (item) item.enabled = item.enabled === false;
          await this.saveQuranData(latest);
          await this.renderQuranOverview(el, date);
        });
        const edit = controls.createEl("button", { text: "Edit", cls: "tg-topic-action" });
        edit.addEventListener("click", () => this.openQuranWirdDialog(wird.type, wird, () => this.renderQuranOverview(el, date)));
        const remove = controls.createEl("button", { text: "Delete", cls: "tg-topic-action tg-topic-delete" });
        remove.addEventListener("click", () => this.deleteQuranWird(wird.id, () => this.renderQuranOverview(el, date)));
      }
    }

    const surahSection = el.createDiv({ cls: "tg-quran-surah-section" });
    const surahHeader = surahSection.createDiv({ cls: "tg-quran-section-header" });
    const surahTitle = surahHeader.createDiv();
    surahTitle.createEl("div", { text: "SURAH TRACKER", cls: "tg-courses-eyebrow" });
    surahTitle.createEl("h3", { text: "Surah Progress Tracks" });
    surahTitle.createEl("p", { text: "Record the ayah ranges you memorized, read, or revised. Each progress track is independent." });
    const controls = surahSection.createDiv({ cls: "tg-quran-surah-controls" });
    const search = controls.createEl("input", { type: "search", placeholder: "Search by Surah name or number…" });
    const trackFilter = controls.createEl("select");
    [
      ["all", "All Surahs"], ["hifz", "Memorization started"],
      ["reading", "Reading started"], ["review", "Revision started"]
    ].forEach(([value,label]) => trackFilter.createEl("option", { value, text: label }));
    const grid = surahSection.createDiv({ cls: "tg-quran-surah-grid" });
    const renderSurahs = () => {
      grid.empty();
      const query = search.value.trim().toLowerCase();
      const filtered = QURAN_SURAHS.filter(surah => {
        const matchesQuery = `${surah.number} ${surah.name} ${surah.transliteration}`.toLowerCase().includes(query);
        if (!matchesQuery) return false;
        if (trackFilter.value === "all") return true;
        const progress = this.getQuranSurahProgress(data, surah.number);
        const key = `${trackFilter.value}Ranges`;
        return quranTrackCount(progress[key], surah.ayahs) > 0;
      });
      if (!filtered.length) {
        grid.createDiv({ cls: "tg-quran-empty", text: "No Surahs match your search or filter." });
        return;
      }
      for (const surah of filtered) {
        const progress = this.getQuranSurahProgress(data, surah.number);
        const card = grid.createDiv({ cls: "tg-quran-surah-card" });
        const cardHead = card.createDiv({ cls: "tg-quran-surah-card-head" });
        cardHead.createDiv({ cls: "tg-quran-surah-number", text: String(surah.number).padStart(3, "0") });
        const name = cardHead.createDiv({ cls: "tg-quran-surah-name" });
        name.createEl("strong", { text: surah.name });
        name.createEl("span", { text: `${surah.ayahs} ayahs · ${surah.transliteration}` });
        for (const track of QURAN_TRACKS) {
          const ranges = progress[`${track.key}Ranges`] || [];
          const count = quranTrackCount(ranges, surah.ayahs);
          const percent = quranTrackPercent(ranges, surah.ayahs);
          const row = card.createDiv({ cls: "tg-quran-mini-track" });
          const line = row.createDiv({ cls: "tg-quran-mini-track-line" });
          line.createSpan({ text: track.label });
          line.createSpan({ text: `${count}/${surah.ayahs} · ${percent}%` });
          const bar = row.createDiv({ cls: "tg-quran-track-bar" });
          const fill = bar.createDiv({ cls: "tg-quran-track-fill" });
          fill.style.width = `${percent}%`;
          fill.style.background = track.color;
        }
        const open = card.createEl("button", { text: "Surah details & progress", cls: "tg-course-btn tg-course-btn-muted tg-quran-surah-open" });
        open.addEventListener("click", () => this.openQuranSurah(surah, () => this.renderQuranOverview(el, date)));
      }
    };
    search.addEventListener("input", renderSurahs);
    trackFilter.addEventListener("change", renderSurahs);
    renderSurahs();

    const footer = el.createDiv({ cls: "tg-quran-footer-note" });
    footer.createEl("span", { text: "Ayah counts: Hafs ‘an Asim numbering · 114 Surahs · 6,236 ayahs." });
    footer.createEl("a", { text: "Surah list and ayah-count reference", href: "https://quran.com/surahs", attr: { target: "_blank", rel: "noopener" } });
  }


  async ensureLanguagesHome() {
    await this.ensureFolder("11 Languages");
    await this.ensureDashboardNote(
      PATHS.languages,
      "Language Learning Studio",
      "time-garden-languages-overview",
      "",
      "timegarden-languages",
      "Your personal language academy and CEFR learning paths."
    );
  }

  async ensureDailyPlannerHome() {
    await this.ensureFolder("13 Daily Planner");
    await this.ensureDashboardNote(
      PATHS.planner,
      "Daily Planner",
      "time-garden-section-overview",
      "13 Daily Planner",
      "timegarden-section-dashboard",
      "Plan today, prepare tomorrow, and schedule learning tasks without duplicating your course or book data."
    );
    await this.refreshHomeDashboard();
  }

  getLanguageFiles() {
    return this.app.vault.getMarkdownFiles().filter(file =>
      file.path.startsWith("11 Languages/") &&
      file.basename.toLowerCase() === "language dashboard"
    );
  }

  getLanguageData(file) {
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
    const folderPath = file.path.slice(0, file.path.lastIndexOf("/"));
    const inferredName = folderPath.split("/").pop() || file.basename;
    const topics = Array.isArray(fm.topics) ? fm.topics : [];
    const vocabulary = Array.isArray(fm.vocabulary) ? fm.vocabulary : [];
    const sessions = Array.isArray(fm.sessions) ? fm.sessions : [];
    const completedLevels = Array.isArray(fm.completed_levels) ? fm.completed_levels : [];
    return {
      file,
      folderPath,
      name: fm.language_name || inferredName,
      native_name: fm.native_name || "",
      flag: fm.flag || "",
      current_level: LANGUAGE_LEVELS.some(level => level.value === fm.current_level) ? fm.current_level : "A1",
      target_level: LANGUAGE_LEVELS.some(level => level.value === fm.target_level) ? fm.target_level : "",
      daily_goal_minutes: Math.max(0, Math.floor(Number(fm.daily_goal_minutes) || 0)),
      topics,
      vocabulary,
      sessions,
      completed_levels: completedLevels,
      created: fm.created || ""
    };
  }

  createLanguageDialog() {
    new LanguageFormModal(this.app, {
      name: "",
      native_name: "",
      flag: "",
      current_level: "A1",
      target_level: "",
      daily_goal_minutes: 20
    }, true, data => this.createLanguage(data)).open();
  }

  async createLanguage(data) {
    const name = safeName(data.name);
    const folderPath = `11 Languages/${name}`;
    if (this.app.vault.getAbstractFileByPath(folderPath)) {
      throw new Error("A language space with this name already exists.");
    }
    await this.ensureFolder(folderPath);
    const fm = [
      "---",
      "type: language",
      `language_name: ${yamlString(name)}`,
      `native_name: ${yamlString(data.native_name)}`,
      `flag: ${yamlString(data.flag || "")}`,
      `current_level: ${data.current_level || "A1"}`,
      `target_level: ${data.target_level || '""'}`,
      `daily_goal_minutes: ${Math.max(0, Number(data.daily_goal_minutes) || 0)}`,
      `created: ${yamlString(localISODate())}`,
      "completed_levels: []",
      "topics: []",
      "vocabulary: []",
      "sessions: []",
      "tags:",
      "  - language",
      "  - learning",
      "cssclasses:",
      "  - timegarden-language",
      "  - timegarden-dashboard",
      "---"
    ].join("\n");
    const content = `${fm}

# ${name}

\`\`\`time-garden-language-panel
\`\`\`

## My Language Notes

Write your own explanations, grammar notes, useful phrases, corrections, and learning reflections here. Keep everything in this one language file if that is your preference.
`;
    const file = await this.app.vault.create(`${folderPath}/Language Dashboard.md`, content);
    await this.openNote(file.path);
    new Notice(`${name} learning space created. Start wherever you feel comfortable.`);
  }

  async renderLanguagesOverview(el) {
    el.empty();
    this.renderGlobalDailyHeader(el, "11 Languages", PATHS.languages);
    el.addClass("tg-languages-app");
    const languages = this.getLanguageFiles().map(file => this.getLanguageData(file));
    const totalMinutes = languages.reduce((sum, language) =>
      sum + language.sessions.reduce((n, session) => n + Math.max(0, Number(session.minutes) || 0), 0), 0);
    const totalWords = languages.reduce((sum, language) => sum + language.vocabulary.length, 0);

    const header = el.createDiv({ cls: "tg-languages-header" });
    const heading = header.createDiv();
    heading.createEl("div", { text: "YOUR PERSONAL LANGUAGE ACADEMY", cls: "tg-courses-eyebrow" });
    heading.createEl("h2", { text: "Language Learning Studio" });
    heading.createEl("p", { text: "Build confidence in every language, one useful session at a time." });
    const actions = header.createDiv({ cls: "tg-languages-header-actions" });
    const add = this.iconButton(actions, "Add Language", "languages", "tg-course-btn tg-course-btn-primary");
    add.addEventListener("click", () => this.createLanguageDialog());

    const stats = el.createDiv({ cls: "tg-languages-stats" });
    this.languageStat(stats, "MY LANGUAGES", languages.length, "#65a8dc");
    this.languageStat(stats, "STUDY TIME", `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`, "#55aa83");
    this.languageStat(stats, "VOCABULARY", totalWords, "#a78bd2");
    this.languageStat(stats, "LEARNING TOPICS", languages.reduce((sum, language) => sum + language.topics.length, 0), "#d3ad59");

    const sectionHeader = el.createDiv({ cls: "tg-languages-section-header" });
    sectionHeader.createEl("h3", { text: "My Languages" });
    sectionHeader.createEl("span", { text: "Each language has its own learning space." });

    const grid = el.createDiv({ cls: "tg-languages-grid" });
    if (!languages.length) {
      const empty = grid.createDiv({ cls: "tg-languages-empty" });
      this.createPremiumIcon(empty, "languages", "tg-languages-empty-icon tg-premium-svg-icon", "Languages");
      empty.createEl("strong", { text: "Your language journey starts here" });
      empty.createEl("p", { text: "Add your first language. A1 is selected by default, but you can start at any level you already know." });
      const start = this.iconButton(empty, "Add Your First Language", "languages", "tg-course-btn tg-course-btn-primary");
      start.addEventListener("click", () => this.createLanguageDialog());
      return;
    }

    for (const language of languages) {
      const card = grid.createDiv({ cls: "tg-language-card" });
      const top = card.createDiv({ cls: "tg-language-card-top" });
      this.createPremiumIcon(top, "languages", "tg-language-flag tg-premium-svg-icon", language.name);
      const levelBadge = top.createEl("span", { cls: "tg-language-level-badge", text: language.current_level });
      if (language.target_level) top.createEl("span", { cls: "tg-language-target-badge", text: `Target ${language.target_level}` });
      card.createEl("h3", { text: language.name });
      if (language.native_name) card.createEl("p", { text: language.native_name, cls: "tg-language-native-name" });
      const currentTopics = language.topics.filter(topic => topic.level === language.current_level);
      const doneTopics = currentTopics.filter(topic => topic.completed).length;
      const topicPercent = currentTopics.length ? Math.round(doneTopics / currentTopics.length * 100) : 0;
      const progressLine = card.createDiv({ cls: "tg-language-card-progress-line" });
      progressLine.createSpan({ text: currentTopics.length ? `${doneTopics}/${currentTopics.length} current-level topics` : "No topics added yet" });
      progressLine.createEl("strong", { text: `${topicPercent}%` });
      const track = card.createDiv({ cls: "tg-language-progress-track" });
      const fill = track.createDiv({ cls: "tg-language-progress-fill" });
      fill.style.width = `${topicPercent}%`;
      const summary = card.createDiv({ cls: "tg-language-card-meta" });
      summary.createSpan({ text: `${language.vocabulary.length} words` });
      summary.createSpan({ text: `${language.sessions.reduce((sum, s) => sum + (Number(s.minutes) || 0), 0)} study min` });
      const open = this.iconButton(card, "Open Learning Space", "arrow-up-right", "tg-course-btn tg-course-btn-primary");
      open.addEventListener("click", () => this.openNote(language.file.path));
    }
  }

  languageStat(parent, label, value, color) {
    const card = parent.createDiv({ cls: "tg-language-stat" });
    card.style.setProperty("--tg-language-accent", color);
    card.createEl("span", { text: label });
    card.createEl("strong", { text: String(value) });
  }

  async editLanguage(file) {
    const language = this.getLanguageData(file);
    new LanguageFormModal(this.app, {
      name: language.name,
      native_name: language.native_name,
      flag: language.flag,
      current_level: language.current_level,
      target_level: language.target_level,
      daily_goal_minutes: language.daily_goal_minutes
    }, false, async data => {
      let targetFile = file;
      if (data.name !== language.name) {
        const newFolder = `11 Languages/${safeName(data.name)}`;
        if (this.app.vault.getAbstractFileByPath(newFolder)) {
          throw new Error("A language with this name already exists.");
        }
        const folder = this.app.vault.getAbstractFileByPath(language.folderPath);
        if (!(folder instanceof TFolder)) throw new Error("Language folder not found.");
        await this.app.vault.rename(folder, newFolder);
        targetFile = this.app.vault.getAbstractFileByPath(`${newFolder}/Language Dashboard.md`);
      }
      if (!(targetFile instanceof TFile)) throw new Error("Language dashboard could not be found.");
      await this.app.fileManager.processFrontMatter(targetFile, fm => {
        fm.language_name = data.name;
        fm.native_name = data.native_name;
        fm.flag = data.flag || "";
        fm.current_level = data.current_level;
        fm.target_level = data.target_level || "";
        fm.daily_goal_minutes = data.daily_goal_minutes;
      });
      new Notice("Language settings updated.");
      await this.openNote(targetFile.path);
    }).open();
  }

  async setLanguageLevel(file, level) {
    if (!LANGUAGE_LEVELS.some(item => item.value === level)) return;
    await this.app.fileManager.processFrontMatter(file, fm => {
      fm.current_level = level;
    });
    new Notice(`Current level set to ${level}. You can change it whenever you like.`);
    await this.openNote(file.path);
  }

  async completeLanguageLevel(file) {
    const language = this.getLanguageData(file);
    await this.app.fileManager.processFrontMatter(file, fm => {
      const levels = Array.isArray(fm.completed_levels) ? fm.completed_levels : [];
      if (!levels.includes(language.current_level)) levels.push(language.current_level);
      fm.completed_levels = levels;
    });
    new Notice(`${language.current_level} marked as completed.`);
    await this.openNote(file.path);
  }

  async renderLanguagePanel(el, sourcePath) {
    el.empty();
    this.renderGlobalDailyHeader(el, "11 Languages", sourcePath);
    el.addClass("tg-language-panel");
    const file = this.app.vault.getAbstractFileByPath(sourcePath);
    if (!(file instanceof TFile)) {
      el.createEl("p", { text: "Language dashboard not found." });
      return;
    }
    const language = this.getLanguageData(file);
    const totalMinutes = language.sessions.reduce((sum, session) => sum + (Number(session.minutes) || 0), 0);
    const today = localISODate();
    const todayMinutes = language.sessions
      .filter(session => session.date === today)
      .reduce((sum, session) => sum + (Number(session.minutes) || 0), 0);
    const currentTopics = language.topics.filter(topic => topic.level === language.current_level);
    const completedTopics = currentTopics.filter(topic => topic.completed).length;
    const currentProgress = currentTopics.length ? Math.round(completedTopics / currentTopics.length * 100) : 0;
    const masteredWords = language.vocabulary.filter(word => word.status === "mastered").length;

    const hero = el.createDiv({ cls: "tg-language-hero" });
    const identity = hero.createDiv({ cls: "tg-language-identity" });
    this.createPremiumIcon(identity, "languages", "tg-language-hero-flag tg-premium-svg-icon", language.name);
    const info = identity.createDiv({ cls: "tg-language-hero-info" });
    info.createEl("div", { text: "YOUR PERSONAL LEARNING SPACE", cls: "tg-courses-eyebrow" });
    info.createEl("h2", { text: language.name });
    if (language.native_name) info.createEl("p", { text: language.native_name });
    const heroActions = hero.createDiv({ cls: "tg-language-hero-actions" });
    const settings = this.iconButton(heroActions, "Settings", "settings", "tg-course-btn tg-course-btn-muted");
    settings.addEventListener("click", () => this.editLanguage(file));

    const summary = el.createDiv({ cls: "tg-language-summary-grid" });
    this.languageSummary(summary, "CURRENT LEVEL", language.current_level, "#65a8dc");
    this.languageSummary(summary, "TOPIC PROGRESS", `${currentProgress}%`, "#55aa83");
    this.languageSummary(summary, "VOCABULARY", `${masteredWords}/${language.vocabulary.length}`, "#a78bd2");
    this.languageSummary(summary, "TOTAL STUDY TIME", `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`, "#d3ad59");

    const levelSection = el.createDiv({ cls: "tg-language-section tg-language-level-section" });
    const levelHead = levelSection.createDiv({ cls: "tg-language-section-head" });
    const levelTitle = levelHead.createDiv();
    levelTitle.createEl("div", { text: "YOUR CEFR JOURNEY", cls: "tg-courses-eyebrow" });
    levelTitle.createEl("h3", { text: "Choose your level" });
    levelTitle.createEl("p", { text: "Start at A1 or select the level that matches your experience. Every level is available." });
    const levelGrid = levelSection.createDiv({ cls: "tg-language-level-grid" });
    const levelDescriptions = {
      A1: "Beginner",
      A2: "Elementary",
      B1: "Intermediate",
      B2: "Upper Intermediate",
      C1: "Advanced",
      C2: "Proficient"
    };
    for (let i = 0; i < LANGUAGE_LEVELS.length; i++) {
      const level = LANGUAGE_LEVELS[i].value;
      const isCurrent = level === language.current_level;
      const isComplete = language.completed_levels.includes(level);
      const card = levelGrid.createEl("button", { cls: `tg-language-level-card${isCurrent ? " is-current" : ""}${isComplete ? " is-complete" : ""}` });
      card.createEl("strong", { text: level });
      card.createEl("span", { text: levelDescriptions[level] });
      card.createEl("small", { text: isCurrent ? "CURRENT LEVEL" : isComplete ? "COMPLETED" : i < LANGUAGE_LEVELS.findIndex(item => item.value === language.current_level) ? "AVAILABLE · SKIPPED" : "AVAILABLE" });
      card.addEventListener("click", () => this.setLanguageLevel(file, level));
    }
    const levelActions = levelSection.createDiv({ cls: "tg-language-level-actions" });
    const completeLevel = this.iconButton(levelActions, `Mark ${language.current_level} as completed`, "check-circle", "tg-course-btn tg-course-btn-muted");
    completeLevel.addEventListener("click", () => this.completeLanguageLevel(file));
    if (language.target_level) {
      const target = levelActions.createDiv({ cls: "tg-language-target-note", text: `Your personal target: ${language.target_level}. This is a guide, not a restriction.` });
    }

    const daily = el.createDiv({ cls: "tg-language-section tg-language-daily-section" });
    const dailyHead = daily.createDiv({ cls: "tg-language-section-head" });
    dailyHead.createEl("div", { text: "GENTLE DAILY GOAL", cls: "tg-courses-eyebrow" });
    dailyHead.createEl("h3", { text: "Your learning rhythm" });
    const dailyGoal = language.daily_goal_minutes;
    const dailyPercent = dailyGoal ? Math.min(100, Math.round(todayMinutes / dailyGoal * 100)) : 0;
    const dailyLine = daily.createDiv({ cls: "tg-language-daily-line" });
    dailyLine.createEl("strong", { text: dailyGoal ? `${todayMinutes} / ${dailyGoal} minutes today` : `${todayMinutes} minutes studied today` });
    dailyLine.createEl("span", { text: dailyGoal ? `${dailyPercent}% of your goal` : "Set an optional goal in Settings" });
    const dailyTrack = daily.createDiv({ cls: "tg-language-progress-track" });
    const dailyFill = dailyTrack.createDiv({ cls: "tg-language-progress-fill" });
    dailyFill.style.width = `${dailyPercent}%`;
    const quickActions = daily.createDiv({ cls: "tg-language-quick-actions" });
    const addSession = this.iconButton(quickActions, "Log Study Session", "clock-plus", "tg-course-btn tg-course-btn-primary");
    addSession.addEventListener("click", () => this.addLanguageSession(file));
    const addTopic = this.iconButton(quickActions, "Add Learning Topic", "list-plus", "tg-course-btn tg-course-btn-muted");
    addTopic.addEventListener("click", () => this.editLanguageTopic(file));
    const addWord = this.iconButton(quickActions, "Add Vocabulary", "book-plus", "tg-course-btn tg-course-btn-muted");
    addWord.addEventListener("click", () => this.editLanguageWord(file));

    this.renderLanguageTopics(el, file, language);
    this.renderLanguageVocabulary(el, file, language);
    this.renderLanguageSessions(el, file, language);
  }

  languageSummary(parent, label, value, color) {
    const card = parent.createDiv({ cls: "tg-language-summary-card" });
    card.style.setProperty("--tg-language-accent", color);
    card.createEl("span", { text: label });
    card.createEl("strong", { text: String(value) });
  }

  renderLanguageTopics(parent, file, language) {
    const section = parent.createDiv({ cls: "tg-language-section tg-language-topics-section" });
    const head = section.createDiv({ cls: "tg-language-section-head tg-language-section-head-row" });
    const title = head.createDiv();
    title.createEl("div", { text: "YOUR PERSONAL CURRICULUM", cls: "tg-courses-eyebrow" });
    title.createEl("h3", { text: "Learning Topics" });
    title.createEl("p", { text: "Add the grammar points, exercises, lessons, and skills you want to practice." });
    const add = this.iconButton(head, "Add Topic", "list-plus", "tg-course-btn tg-course-btn-primary");
    add.addEventListener("click", () => this.editLanguageTopic(file));

    const currentTopics = language.topics.filter(topic => topic.level === language.current_level);
    const done = currentTopics.filter(topic => topic.completed).length;
    const summary = section.createDiv({ cls: "tg-language-topic-summary" });
    summary.createEl("strong", { text: `${done} of ${currentTopics.length} ${language.current_level} topics completed` });
    summary.createEl("span", { text: currentTopics.length ? `${Math.round(done / currentTopics.length * 100)}%` : "No topics yet" });
    const track = summary.createDiv({ cls: "tg-language-progress-track" });
    const fill = track.createDiv({ cls: "tg-language-progress-fill" });
    fill.style.width = `${currentTopics.length ? Math.round(done / currentTopics.length * 100) : 0}%`;

    const skillGrid = section.createDiv({ cls: "tg-language-skill-grid" });
    const skillIcons = {
      vocabulary: "book-a", grammar: "book-text", listening: "headphones", speaking: "message-circle",
      reading: "book-open", writing: "pencil", pronunciation: "audio-lines", general: "sparkles"
    };
    for (const skill of LANGUAGE_SKILLS) {
      const skillTopics = currentTopics.filter(topic => topic.skill === skill.value);
      const skillDone = skillTopics.filter(topic => topic.completed).length;
      const skillCard = skillGrid.createEl("button", { cls: "tg-language-skill-card" });
      this.createPremiumIcon(skillCard, skillIcons[skill.value] || "sparkles", "tg-language-skill-icon tg-premium-svg-icon", skill.label);
      const skillBody = skillCard.createDiv({ cls: "tg-language-skill-body" });
      skillBody.createEl("strong", { text: skill.label });
      skillBody.createEl("span", { text: `${skillDone}/${skillTopics.length} completed` });
      skillCard.addEventListener("click", () => {
        filter.value = skill.value;
        render();
      });
    }

    const filter = section.createEl("select", { cls: "tg-language-topic-filter" });
    filter.createEl("option", { value: "all", text: "All skills" });
    for (const skill of LANGUAGE_SKILLS) filter.createEl("option", { value: skill.value, text: skill.label });
    const list = section.createDiv({ cls: "tg-language-topic-list" });

    const render = () => {
      list.empty();
      const selectedSkill = filter.value;
      const topics = language.topics.filter(topic =>
        (topic.level === language.current_level || selectedSkill !== "all") &&
        (selectedSkill === "all" || topic.skill === selectedSkill)
      );
      if (!topics.length) {
        const empty = list.createDiv({ cls: "tg-language-inline-empty" });
        empty.createEl("strong", { text: "No learning topics added" });
        empty.createEl("p", { text: "You decide what to study. Add a topic whenever you are ready — no predefined syllabus is required." });
        return;
      }
      for (const topic of topics) {
        const row = list.createDiv({ cls: `tg-language-topic-row${topic.completed ? " is-complete" : ""}` });
        const checkbox = row.createEl("input", { cls: "tg-language-topic-checkbox", attr: { type: "checkbox" } });
        checkbox.checked = Boolean(topic.completed);
        checkbox.addEventListener("change", () => this.toggleLanguageTopic(file, topic.id, checkbox.checked));
        const body = row.createDiv({ cls: "tg-language-topic-body" });
        const titleLine = body.createDiv({ cls: "tg-language-topic-title-line" });
        titleLine.createEl("strong", { text: topic.title });
        titleLine.createEl("span", { text: `${topic.level} · ${LANGUAGE_SKILLS.find(item => item.value === topic.skill)?.label || "General"}` });
        if (topic.description) body.createEl("p", { text: topic.description });
        const actions = row.createDiv({ cls: "tg-language-topic-actions" });
        const edit = actions.createEl("button", { text: "Edit", cls: "tg-topic-action" });
        edit.addEventListener("click", () => this.editLanguageTopic(file, topic));
        const remove = actions.createEl("button", { text: "Delete", cls: "tg-topic-action tg-topic-delete" });
        remove.addEventListener("click", () => this.deleteLanguageTopic(file, topic.id));
      }
    };
    filter.addEventListener("change", render);
    render();
  }

  async editLanguageTopic(file, existing = null) {
    const language = this.getLanguageData(file);
    new LanguageTopicModal(this.app, existing || {}, language.current_level, async topic => {
      const latest = this.getLanguageData(file);
      const topics = [...latest.topics];
      const index = topics.findIndex(item => item.id === topic.id);
      if (index >= 0) topics[index] = topic;
      else topics.push(topic);
      await this.app.fileManager.processFrontMatter(file, fm => { fm.topics = topics; });
      new Notice(index >= 0 ? "Learning topic updated." : "Learning topic added.");
      await this.openNote(file.path);
    }).open();
  }

  async toggleLanguageTopic(file, topicId, completed) {
    const language = this.getLanguageData(file);
    const topics = language.topics.map(topic => topic.id === topicId
      ? { ...topic, completed, completed_at: completed ? localISODate() : "" }
      : topic);
    await this.app.fileManager.processFrontMatter(file, fm => { fm.topics = topics; });
    await this.openNote(file.path);
  }

  async deleteLanguageTopic(file, topicId) {
    if (!window.confirm("Delete this learning topic?")) return;
    const language = this.getLanguageData(file);
    const topics = language.topics.filter(topic => topic.id !== topicId);
    await this.app.fileManager.processFrontMatter(file, fm => { fm.topics = topics; });
    new Notice("Learning topic deleted.");
    await this.openNote(file.path);
  }

  renderLanguageVocabulary(parent, file, language) {
    const section = parent.createDiv({ cls: "tg-language-section tg-language-vocabulary-section" });
    const head = section.createDiv({ cls: "tg-language-section-head tg-language-section-head-row" });
    const title = head.createDiv();
    title.createEl("div", { text: "YOUR PERSONAL WORD BANK", cls: "tg-courses-eyebrow" });
    title.createEl("h3", { text: "Vocabulary Notebook" });
    title.createEl("p", { text: "Save useful words and phrases with meanings and examples. Reveal, review, and mark what you know." });
    const add = this.iconButton(head, "Add Word", "book-plus", "tg-course-btn tg-course-btn-primary");
    add.addEventListener("click", () => this.editLanguageWord(file));

    const toolbar = section.createDiv({ cls: "tg-language-vocab-toolbar" });
    const search = toolbar.createEl("input", { type: "search", placeholder: "Search words or meanings…" });
    const filter = toolbar.createEl("select");
    [["all", "All words"], ["new", "New"], ["learning", "Learning"], ["mastered", "Mastered"]]
      .forEach(([value, label]) => filter.createEl("option", { value, text: label }));
    const grid = section.createDiv({ cls: "tg-language-vocab-grid" });

    const render = () => {
      grid.empty();
      const query = search.value.trim().toLowerCase();
      const items = language.vocabulary.filter(word =>
        (filter.value === "all" || word.status === filter.value) &&
        `${word.term} ${word.meaning} ${word.example}`.toLowerCase().includes(query)
      );
      if (!items.length) {
        const empty = grid.createDiv({ cls: "tg-language-inline-empty" });
        empty.createEl("strong", { text: "Your vocabulary notebook is empty" });
        empty.createEl("p", { text: "Add your first word or phrase. You control what belongs in your personal vocabulary." });
        return;
      }
      for (const word of items) {
        const card = grid.createDiv({ cls: "tg-language-word-card" });
        const top = card.createDiv({ cls: "tg-language-word-top" });
        top.createEl("span", { text: word.status === "mastered" ? "MASTERED" : word.status === "learning" ? "LEARNING" : "NEW", cls: `tg-language-word-status is-${word.status}` });
        const actions = top.createDiv({ cls: "tg-language-word-tools" });
        const edit = actions.createEl("button", { text: "Edit", cls: "tg-topic-action" });
        edit.addEventListener("click", () => this.editLanguageWord(file, word));
        const remove = actions.createEl("button", { cls: "tg-topic-action tg-topic-delete" });
        this.setButtonIcon(remove, "x");
        remove.addEventListener("click", () => this.deleteLanguageWord(file, word.id));
        card.createEl("h4", { text: word.term });
        const reveal = card.createEl("button", { text: "Show meaning", cls: "tg-language-reveal-btn" });
        const meaning = card.createDiv({ cls: "tg-language-word-meaning is-hidden" });
        meaning.createEl("strong", { text: word.meaning });
        if (word.example) meaning.createEl("p", { text: word.example });
        reveal.addEventListener("click", () => {
          const hidden = meaning.hasClass("is-hidden");
          meaning.toggleClass("is-hidden", !hidden);
          reveal.setText(hidden ? "Hide meaning" : "Show meaning");
        });
        const mark = card.createEl("button", {
          text: word.status === "mastered" ? "Move back to Learning" : "Mark as Mastered",
          cls: "tg-course-btn tg-course-btn-muted tg-language-word-mark"
        });
        mark.addEventListener("click", () => this.toggleLanguageWordMastery(file, word.id));
      }
    };
    search.addEventListener("input", render);
    filter.addEventListener("change", render);
    render();
  }

  async editLanguageWord(file, existing = null) {
    new LanguageWordModal(this.app, existing || {}, async word => {
      const language = this.getLanguageData(file);
      const vocabulary = [...language.vocabulary];
      const index = vocabulary.findIndex(item => item.id === word.id);
      if (index >= 0) vocabulary[index] = word;
      else vocabulary.unshift(word);
      await this.app.fileManager.processFrontMatter(file, fm => { fm.vocabulary = vocabulary; });
      new Notice(index >= 0 ? "Vocabulary updated." : "Word added to your notebook.");
      await this.openNote(file.path);
    }).open();
  }

  async toggleLanguageWordMastery(file, wordId) {
    const language = this.getLanguageData(file);
    const vocabulary = language.vocabulary.map(word => word.id === wordId
      ? { ...word, status: word.status === "mastered" ? "learning" : "mastered", last_reviewed: localISODate() }
      : word);
    await this.app.fileManager.processFrontMatter(file, fm => { fm.vocabulary = vocabulary; });
    await this.openNote(file.path);
  }

  async deleteLanguageWord(file, wordId) {
    if (!window.confirm("Delete this vocabulary item?")) return;
    const language = this.getLanguageData(file);
    const vocabulary = language.vocabulary.filter(word => word.id !== wordId);
    await this.app.fileManager.processFrontMatter(file, fm => { fm.vocabulary = vocabulary; });
    new Notice("Vocabulary item deleted.");
    await this.openNote(file.path);
  }

  renderLanguageSessions(parent, file, language) {
    const section = parent.createDiv({ cls: "tg-language-section tg-language-sessions-section" });
    const head = section.createDiv({ cls: "tg-language-section-head tg-language-section-head-row" });
    const title = head.createDiv();
    title.createEl("div", { text: "YOUR LEARNING HISTORY", cls: "tg-courses-eyebrow" });
    title.createEl("h3", { text: "Study Sessions" });
    title.createEl("p", { text: "Keep a simple record of what you practiced. Logging time is optional." });
    const add = this.iconButton(head, "Log Session", "clock-plus", "tg-course-btn tg-course-btn-primary");
    add.addEventListener("click", () => this.addLanguageSession(file));

    const list = section.createDiv({ cls: "tg-language-session-list" });
    const sessions = [...language.sessions].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 8);
    if (!sessions.length) {
      const empty = list.createDiv({ cls: "tg-language-inline-empty" });
      empty.createEl("strong", { text: "Your first session is waiting" });
      empty.createEl("p", { text: "Start learning in your own way. You can record sessions whenever you want." });
      return;
    }
    for (const session of sessions) {
      const row = list.createDiv({ cls: "tg-language-session-row" });
      const icon = this.createPremiumIcon(row, "clock", "tg-language-session-icon tg-premium-svg-icon", "Study session");
      const body = row.createDiv({ cls: "tg-language-session-body" });
      body.createEl("strong", { text: LANGUAGE_ACTIVITIES.find(item => item.value === session.activity)?.label || "Study" });
      body.createEl("span", { text: `${session.date} · ${session.minutes} minutes` });
      if (session.notes) body.createEl("p", { text: session.notes });
    }
  }

  async addLanguageSession(file) {
    new LanguageSessionModal(this.app, {}, async session => {
      const language = this.getLanguageData(file);
      const sessions = [session, ...language.sessions];
      await this.app.fileManager.processFrontMatter(file, fm => { fm.sessions = sessions; });
      new Notice("Study session saved.");
      await this.openNote(file.path);
    }).open();
  }


  goalsRoot() { return "12 Goals/Goals"; }

  async ensureGoalsFolders() {
    for (const path of ["12 Goals", this.goalsRoot()]) {
      if (!this.app.vault.getAbstractFileByPath(path)) await this.app.vault.createFolder(path);
    }
  }

  async getGoalRecords() {
    await this.ensureGoalsFolders();
    const folder = this.app.vault.getAbstractFileByPath(this.goalsRoot());
    const files = this.app.vault.getMarkdownFiles().filter(file =>
      file.path.startsWith(`${this.goalsRoot()}/`) && file.basename !== "README"
    );
    const records = [];
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      const fm = cache?.frontmatter || {};
      records.push({
        file, id: fm.goal_id || file.basename, title: fm.title || file.basename,
        description: fm.description || "", icon: fm.icon || "target", color: fm.color || "#c9a85d",
        status: fm.status || "planned", priority: fm.priority || "medium",
        start_date: fm.start_date || "", due_date: fm.due_date || "",
        linked_sections: Array.isArray(fm.linked_sections) ? fm.linked_sections : [],
        goal_type: fm.goal_type || "milestone", current_value: Number(fm.current_value || 0),
        target_value: Number(fm.target_value || 0), unit: fm.unit || "",
        milestones: Array.isArray(fm.milestones) ? fm.milestones : [],
        weight: Number(fm.weight || 1), updated: fm.updated || ""
      });
    }
    return records;
  }

  goalProgress(goal) {
    if (goal.goal_type === "target") {
      return goal.target_value > 0 ? Math.max(0, Math.min(100, goal.current_value / goal.target_value * 100)) : 0;
    }
    const milestones = goal.milestones || [];
    if (!milestones.length) return 0;
    const total = milestones.reduce((sum, item) => sum + Math.max(0.01, Number(item.weight || 1)), 0);
    const done = milestones.reduce((sum, item) => {
      const weight = Math.max(0.01, Number(item.weight || 1));
      const subtasks = Array.isArray(item.subtasks) ? item.subtasks : [];
      const stageProgress = subtasks.length
        ? subtasks.filter(task => task.completed).length / subtasks.length
        : (item.completed ? 1 : 0);
      return sum + weight * stageProgress;
    }, 0);
    return total ? done / total * 100 : 0;
  }

  async createGoalRecord(data) {
    await this.ensureGoalsFolders();
    const slug = (data.title || "New Goal").trim().replace(/[\\/:*?"<>|#^[\]]/g, "").replace(/\s+/g, "-").slice(0, 70) || `Goal-${Date.now()}`;
    let path = `${this.goalsRoot()}/${slug}.md`, n = 2;
    while (this.app.vault.getAbstractFileByPath(path)) path = `${this.goalsRoot()}/${slug}-${n++}.md`;
    const file = await this.app.vault.create(path, `# ${data.title}\n\n`);
    await this.app.fileManager.processFrontMatter(file, fm => {
      Object.assign(fm, {
        goal_id: `goal-${Date.now()}`, title: data.title, description: data.description || "",
        icon: data.icon || "target", color: data.color || "#c9a85d",
        status: data.status || "planned", priority: data.priority || "medium",
        start_date: data.start_date || "", due_date: data.due_date || "",
        linked_sections: data.linked_sections || [], goal_type: data.goal_type || "milestone",
        current_value: Number(data.current_value || 0), target_value: Number(data.target_value || 0),
        unit: data.unit || "", milestones: [], weight: 1, updated: new Date().toISOString()
      });
    });
    return file;
  }

  async updateGoalFrontmatter(file, updater) {
    await this.app.fileManager.processFrontMatter(file, fm => {
      updater(fm);
      fm.updated = new Date().toISOString();
    });
  }

  async renderGoalsDashboard(el) {
    el.empty();
    this.renderGlobalDailyHeader(el, "12 Goals", PATHS.goals);
    el.addClass("tg-goals-app");
    const records = await this.getGoalRecords();
    const active = records.filter(g => g.status === "active");
    const planned = records.filter(g => g.status === "planned");
    const completed = records.filter(g => g.status === "completed");
    const overall = records.length ? records.reduce((s,g) => s + this.goalProgress(g) * Math.max(.01,g.weight),0) /
      records.reduce((s,g) => s + Math.max(.01,g.weight),0) : 0;

    const header = el.createDiv({ cls: "tg-goals-hero" });
    const left = header.createDiv();
    left.createEl("div", { text: "PLAN WITH PURPOSE", cls: "tg-goals-eyebrow" });
    left.createEl("h1", { text: "Goals & Milestones" });
    left.createEl("p", { text: "Turn meaningful ambitions into progress you can see. Your goals, your milestones, your pace." });
    const add = this.iconButton(left, "New Goal", "target", "tg-goals-primary");
    add.addEventListener("click", () => this.promptCreateGoal(el));

    const overview = el.createDiv({ cls: "tg-goals-overview" });
    const stat = (label, value, icon) => {
      const card = overview.createDiv({ cls: "tg-goals-stat" });
      this.createPremiumIcon(card, icon, "tg-goals-stat-icon tg-premium-svg-icon", label);
      card.createEl("small", { text: label });
      card.createEl("strong", { text: String(value) });
    };
    stat("ACTIVE GOALS", active.length, "target");
    stat("PLANNED", planned.length, "calendar-clock");
    stat("COMPLETED", completed.length, "circle-check");
    const progress = overview.createDiv({ cls: "tg-goals-stat tg-goals-stat-progress" });
    progress.createEl("small", { text: "OVERALL PROGRESS" });
    progress.createEl("strong", { text: `${Math.round(overall)}%` });
    const track = progress.createDiv({ cls: "tg-goals-track" });
    track.createDiv({ cls: "tg-goals-track-fill" }).style.width = `${overall}%`;

    const tools = el.createDiv({ cls: "tg-goals-toolbar" });
    const search = tools.createEl("input", { attr: { type: "search", placeholder: "Search goals..." } });
    const filter = tools.createEl("select");
    [["all","All goals"],["active","Active"],["planned","Planned"],["completed","Completed"],["paused","Paused"],["archived","Archived"]]
      .forEach(([v,l]) => filter.createEl("option", { text:l, attr:{value:v} }));

    const list = el.createDiv({ cls: "tg-goals-grid" });
    const renderCards = () => {
      list.empty();
      const q = search.value.trim().toLowerCase(), f = filter.value;
      const shown = records.filter(g => (f === "all" || g.status === f) &&
        (!q || `${g.title} ${g.description} ${g.linked_sections.join(" ")}`.toLowerCase().includes(q)));
      if (!shown.length) {
        const empty = list.createDiv({ cls: "tg-goals-empty" });
        empty.createEl("div", { text: "✧", cls: "tg-goals-empty-icon" });
        empty.createEl("h3", { text: "A clear space for your next achievement" });
        empty.createEl("p", { text: "Create a goal and add milestones only when you are ready. Nothing is generated for you." });
        const create = this.iconButton(empty, "Create your first goal", "target", "tg-goals-primary");
        create.addEventListener("click", () => this.promptCreateGoal(el));
        return;
      }
      for (const goal of shown) {
        const pct = this.goalProgress(goal);
        const card = list.createDiv({ cls: "tg-goal-card" });
        card.style.setProperty("--goal-accent", goal.color);
        const top = card.createDiv({ cls: "tg-goal-card-top" });
        const goalIcon = top.createSpan({ cls: "tg-goal-icon" });
        this.createPremiumIcon(goalIcon, goal.icon || "target", "tg-premium-svg-icon", goal.title);
        const status = top.createEl("span", { text: goal.status.replace("-", " ").toUpperCase(), cls: `tg-goal-status is-${goal.status}` });
        const title = card.createEl("h3", { text: goal.title });
        card.createEl("p", { text: goal.description || "No description added.", cls: "tg-goal-description" });
        const meta = card.createDiv({ cls: "tg-goal-meta" });
        meta.createEl("span", { text: goal.priority.toUpperCase() + " PRIORITY" });
        if (goal.due_date) meta.createEl("span", { text: `Due ${goal.due_date}` });
        if (goal.linked_sections.length) meta.createEl("span", { text: goal.linked_sections.join(" · ") });
        const prog = card.createDiv({ cls: "tg-goal-progress-row" });
        prog.createEl("strong", { text: `${Math.round(pct)}%` });
        prog.createEl("span", { text: goal.goal_type === "target"
          ? `${goal.current_value} / ${goal.target_value} ${goal.unit}`.trim()
          : `${goal.milestones.filter(m => m.completed).length} / ${goal.milestones.length} milestones` });
        const bar = card.createDiv({ cls: "tg-goals-track" });
        bar.createDiv({ cls: "tg-goals-track-fill" }).style.width = `${pct}%`;
        const actions = card.createDiv({ cls: "tg-goal-actions" });
        const open = this.iconButton(actions, "Open Goal", "arrow-up-right", "tg-goals-primary");
        open.addEventListener("click", () => this.renderGoalDetail(el, goal.file));
        const edit = this.iconButton(actions, "Edit", "pencil", "tg-goals-secondary");
        edit.addEventListener("click", () => this.promptEditGoal(el, goal));
      }
    };
    search.addEventListener("input", renderCards);
    filter.addEventListener("change", renderCards);
    renderCards();
    const milestoneBox = el.createDiv({ cls: "tg-goals-milestones" });
    milestoneBox.createEl("h2", { text: "Milestones to Watch" });
    const upcoming = records.flatMap(g => g.milestones.filter(m => !m.completed).map(m => ({...m, goal:g.title}))).slice(0,6);
    if (!upcoming.length) milestoneBox.createEl("p", { text: "Milestones you add to your goals will appear here." });
    else upcoming.forEach(m => milestoneBox.createEl("div", { text: `${m.title} · ${m.goal}${m.due_date ? " · " + m.due_date : ""}`, cls: "tg-goals-milestone-row" }));
  }

  promptCreateGoal(el) {
    new GoalFormModal(this.app, {
      goal_type: "milestone",
      status: "planned",
      priority: "medium",
      target_value: 0
    }, true, async data => {
      await this.createGoalRecord(data);
      await this.renderGoalsDashboard(el);
    }).open();
  }

  promptEditGoal(el, goal) {
    new GoalFormModal(this.app, {
      title: goal.title,
      description: goal.description,
      goal_type: goal.goal_type,
      status: goal.status,
      priority: goal.priority,
      due_date: goal.due_date,
      target_value: goal.target_value,
      unit: goal.unit,
      linked_sections: goal.linked_sections.join(", ")
    }, false, async data => {
      await this.updateGoalFrontmatter(goal.file, fm => {
        fm.title = data.title;
        fm.description = data.description;
        fm.goal_type = data.goal_type;
        fm.status = data.status;
        fm.priority = data.priority;
        fm.due_date = data.due_date;
        fm.target_value = data.target_value;
        fm.unit = data.unit;
        fm.linked_sections = data.linked_sections;
      });
      await this.renderGoalsDashboard(el);
    }).open();
  }

  async renderGoalDetail(el, file) {
    const goal = (await this.getGoalRecords()).find(g => g.file.path === file.path);
    if (!goal) return this.renderGoalsDashboard(el);
    el.empty();
    const head = el.createDiv({ cls:"tg-goals-detail-head" });
    const back = this.iconButton(head, "All Goals", "arrow-left", "tg-goals-secondary");
    back.addEventListener("click",()=>this.renderGoalsDashboard(el));
    head.createEl("span",{text:goal.status.toUpperCase(),cls:"tg-goal-status"});
    el.createEl("h1",{text:goal.title});
    if (goal.description) el.createEl("p",{text:goal.description});
    const pct=this.goalProgress(goal);
    const summary=el.createDiv({cls:"tg-goals-detail-progress"});
    summary.createEl("strong",{text:`${Math.round(pct)}% complete`});
    const track=summary.createDiv({cls:"tg-goals-track"}); track.createDiv({cls:"tg-goals-track-fill"}).style.width=`${pct}%`;
    const action=el.createDiv({cls:"tg-goals-detail-actions"});
    if(goal.goal_type==="target"){
      const update=this.iconButton(action, "Update Current Value", "chart-no-axes-combined", "tg-goals-primary");
      update.addEventListener("click",async()=>{const v=Number(window.prompt("Current value",String(goal.current_value)));if(!Number.isFinite(v))return;
        await this.updateGoalFrontmatter(file,fm=>fm.current_value=Math.max(0,v));await this.renderGoalDetail(el,file);});
    }
    const add=this.iconButton(action, "Add Milestone", "milestone", "tg-goals-primary");
    add.addEventListener("click",async()=>{
      const title=window.prompt("Milestone title");if(!title?.trim())return;
      const description=window.prompt("Description (optional)")||"";
      const due=window.prompt("Target date YYYY-MM-DD (optional)")||"";
      const weight=Number(window.prompt("Weight", "1")||1);
      const milestone={id:`ms-${Date.now()}`,title:title.trim(),description,due_date:due,weight:Number.isFinite(weight)&&weight>0?weight:1,completed:false,subtasks:[]};
      await this.updateGoalFrontmatter(file,fm=>fm.milestones=[...(Array.isArray(fm.milestones)?fm.milestones:[]),milestone]);
      await this.renderGoalDetail(el,file);
    });
    const edit=this.iconButton(action, "Edit Goal", "pencil", "tg-goals-secondary");
    edit.addEventListener("click",()=>this.promptEditGoal(el,goal));
    const section=el.createDiv({cls:"tg-goals-milestone-list"}); section.createEl("h2",{text:"Your Milestones"});
    if(!goal.milestones.length)section.createEl("p",{text:"No milestones yet. Add only the steps you choose."});
    for(const m of goal.milestones){
      const row=section.createDiv({cls:"tg-goals-milestone-card"});
      const check=row.createEl("input",{attr:{type:"checkbox"}});check.checked=!!m.completed;
      check.addEventListener("change",async()=>{await this.updateGoalFrontmatter(file,fm=>{fm.milestones=(fm.milestones||[]).map(x=>x.id===m.id?{...x,completed:check.checked}:x);});await this.renderGoalDetail(el,file);});
      const body=row.createDiv();body.createEl("strong",{text:m.title});if(m.description)body.createEl("p",{text:m.description});
      const sub=this.iconButton(row, "Subtask", "list-plus", "tg-goals-secondary");
      sub.addEventListener("click",async()=>{const t=window.prompt("Subtask title");if(!t?.trim())return;await this.updateGoalFrontmatter(file,fm=>{fm.milestones=(fm.milestones||[]).map(x=>x.id===m.id?{...x,subtasks:[...(x.subtasks||[]),{id:`st-${Date.now()}`,title:t.trim(),completed:false}]}:x);});await this.renderGoalDetail(el,file);});
      const remove=this.iconButton(row, "Remove", "trash-2", "tg-goals-secondary");
      remove.addEventListener("click",async()=>{if(!window.confirm(`Remove milestone “${m.title}”?`))return;await this.updateGoalFrontmatter(file,fm=>fm.milestones=(fm.milestones||[]).filter(x=>x.id!==m.id));await this.renderGoalDetail(el,file);});
      (m.subtasks||[]).forEach(st=>{const line=body.createEl("label",{cls:"tg-goal-subtask"});const c=line.createEl("input",{attr:{type:"checkbox"}});c.checked=!!st.completed;c.addEventListener("change",async()=>{await this.updateGoalFrontmatter(file,fm=>{fm.milestones=(fm.milestones||[]).map(x=>x.id===m.id?{...x,subtasks:x.subtasks.map(s=>s.id===st.id?{...s,completed:c.checked}:s)}:x);});await this.renderGoalDetail(el,file);});line.appendText(st.title);});
    }
  }

  async onloadDummy() {}
};
