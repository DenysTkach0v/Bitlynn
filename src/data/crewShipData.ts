export type TaskMiniGameKind =
  | "wiring"
  | "timing-lock"
  | "virus-zap"
  | "simon-reactor"
  | "bit-switches";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShipRoom {
  id: string;
  name: string;
  shortTag: string;
  rect: Rect;
  taskConsole?: {
    x: number;
    y: number;
    label: string;
    miniGame: TaskMiniGameKind;
  };
  /** Room accent: rug, lamp strip and nameplate trim */
  accent: string;
}

export interface CrewSeedMember {
  id: string;
  name: string;
  anonHandle: string;
  avatarColor: string;
  startX: number;
  startY: number;
  isSaboteur: boolean;
  cleanLog: string;
}

export const WORLD_WIDTH = 900;
export const WORLD_HEIGHT = 600;
export const HUB_TABLE = { x: 450, y: 300, r: 30 };

export const SHIP_ROOMS: ShipRoom[] = [
  {
    id: "sec-memory",
    name: "Капсула",
    shortTag: "БІТИ / БАЙТИ",
    rect: { x: 60, y: 40, w: 210, h: 160 },
    taskConsole: {
      x: 118,
      y: 88,
      label: "Перемикачі байта",
      miniGame: "bit-switches",
    },
    accent: "#6FB8FF",
  },
  {
    id: "sec-crypto",
    name: "Студія",
    shortTag: "КАБЕЛІ / КОД",
    rect: { x: 345, y: 30, w: 210, h: 135 },
    taskConsole: {
      x: 450,
      y: 66,
      label: "Кабелі живлення",
      miniGame: "wiring",
    },
    accent: "#F6A5C0",
  },
  {
    id: "sec-algo",
    name: "Dev-лофт",
    shortTag: "АНТИ-БАГ",
    rect: { x: 630, y: 40, w: 210, h: 160 },
    taskConsole: {
      x: 782,
      y: 88,
      label: "Вилов багів",
      miniGame: "virus-zap",
    },
    accent: "#B48CFF",
  },
  {
    id: "sec-hub",
    name: "Купол",
    shortTag: "ЗБОРИ / СОНАР",
    rect: { x: 350, y: 220, w: 200, h: 160 },
    accent: "#FFD36B",
  },
  {
    id: "sec-radar",
    name: "Сонарна",
    shortTag: "СИНХРОНІЗАЦІЯ",
    rect: { x: 60, y: 400, w: 210, h: 160 },
    taskConsole: {
      x: 118,
      y: 510,
      label: "Налаштування сонара",
      miniGame: "timing-lock",
    },
    accent: "#2FA37A",
  },
  {
    id: "sec-shield",
    name: "Шлюз",
    shortTag: "ПОРЯДОК КОДУ",
    rect: { x: 345, y: 435, w: 210, h: 135 },
    taskConsole: {
      x: 450,
      y: 534,
      label: "Кодовий замок",
      miniGame: "simon-reactor",
    },
    accent: "#C9A66B",
  },
  {
    id: "sec-reactor",
    name: "Машинна",
    shortTag: "ЕНЕРГІЯ БАЙТІВ",
    rect: { x: 630, y: 400, w: 210, h: 160 },
    taskConsole: {
      x: 782,
      y: 510,
      label: "Шина живлення",
      miniGame: "wiring",
    },
    accent: "#FF9F43",
  },
];

export const SHIP_CORRIDORS: Rect[] = [
  // Top horizontal corridor
  { x: 255, y: 82, w: 390, h: 66 },
  // Bottom horizontal corridor
  { x: 255, y: 452, w: 390, h: 66 },
  // Left vertical corridor
  { x: 132, y: 185, w: 66, h: 230 },
  // Right vertical corridor
  { x: 702, y: 185, w: 66, h: 230 },
  // Center vertical spine
  { x: 417, y: 150, w: 66, h: 300 },
  // Center horizontal spine
  { x: 180, y: 267, w: 540, h: 66 },
];

export const WALKABLE_RECTS: Rect[] = [
  ...SHIP_ROOMS.map((r) => r.rect),
  ...SHIP_CORRIDORS,
];

function pointInRect(x: number, y: number, r: Rect): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function pointInUnion(x: number, y: number): boolean {
  for (let i = 0; i < WALKABLE_RECTS.length; i++) {
    if (pointInRect(x, y, WALKABLE_RECTS[i])) return true;
  }
  return false;
}

export function isWalkable(x: number, y: number, radius = 14): boolean {
  // Stay outside the central Emergency Table
  const distHub = Math.hypot(x - HUB_TABLE.x, y - HUB_TABLE.y);
  if (distHub < HUB_TABLE.r + radius * 0.7) return false;

  return (
    pointInUnion(x - radius, y) &&
    pointInUnion(x + radius, y) &&
    pointInUnion(x, y - radius) &&
    pointInUnion(x, y + radius)
  );
}

export function getRoomAt(x: number, y: number): ShipRoom | null {
  for (const room of SHIP_ROOMS) {
    if (pointInRect(x, y, room.rect)) {
      return room;
    }
  }
  return null;
}

export function getZoneLabelAt(x: number, y: number): string {
  const r = getRoomAt(x, y);
  return r ? r.name : "Тунель станції";
}

// Waypoint graph for smooth AI & tap-to-walk corridor navigation
interface Waypoint {
  id: string;
  x: number;
  y: number;
  neighbors: string[];
}

export const NAV_WAYPOINTS: Waypoint[] = [
  { id: "mem", x: 165, y: 120, neighbors: ["cry", "lmid"] },
  { id: "cry", x: 450, y: 112, neighbors: ["mem", "alg", "htop"] },
  { id: "alg", x: 735, y: 120, neighbors: ["cry", "rmid"] },
  { id: "lmid", x: 165, y: 300, neighbors: ["mem", "rad", "hleft"] },
  { id: "rmid", x: 735, y: 300, neighbors: ["alg", "rea", "hright"] },
  {
    id: "htop",
    x: 450,
    y: 245,
    neighbors: ["cry", "hleft", "hright"],
  },
  {
    id: "hbot",
    x: 450,
    y: 355,
    neighbors: ["shd", "hleft", "hright"],
  },
  {
    id: "hleft",
    x: 388,
    y: 300,
    neighbors: ["lmid", "htop", "hbot"],
  },
  {
    id: "hright",
    x: 512,
    y: 300,
    neighbors: ["rmid", "htop", "hbot"],
  },
  { id: "rad", x: 165, y: 480, neighbors: ["lmid", "shd"] },
  { id: "shd", x: 450, y: 492, neighbors: ["rad", "rea", "hbot"] },
  { id: "rea", x: 735, y: 480, neighbors: ["shd", "rmid"] },
];

export const ROOM_TO_WAYPOINT: Record<string, string> = {
  "sec-memory": "mem",
  "sec-crypto": "cry",
  "sec-algo": "alg",
  "sec-hub": "htop",
  "sec-radar": "rad",
  "sec-shield": "shd",
  "sec-reactor": "rea",
};

function nearestWaypoint(x: number, y: number): Waypoint {
  let best = NAV_WAYPOINTS[0];
  let bestDist = Infinity;
  for (const wp of NAV_WAYPOINTS) {
    const d = Math.hypot(wp.x - x, wp.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = wp;
    }
  }
  return best;
}

/** Finds a walkable waypoint path from (fromX, fromY) to (toX, toY). */
export function findCorridorPath(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): { x: number; y: number }[] {
  // If both points are inside the same room, walk straight
  const rFrom = getRoomAt(fromX, fromY);
  const rTo = getRoomAt(toX, toY);
  if (rFrom && rTo && rFrom.id === rTo.id && rFrom.id !== "sec-hub") {
    return [{ x: toX, y: toY }];
  }

  const startWp = nearestWaypoint(fromX, fromY);
  const endWp = nearestWaypoint(toX, toY);

  if (startWp.id === endWp.id) {
    return [{ x: toX, y: toY }];
  }

  const queue: string[][] = [[startWp.id]];
  const visited = new Set<string>([startWp.id]);
  let wpIds: string[] = [startWp.id, endWp.id];

  while (queue.length > 0) {
    const path = queue.shift()!;
    const lastId = path[path.length - 1];
    if (lastId === endWp.id) {
      wpIds = path;
      break;
    }
    const wp = NAV_WAYPOINTS.find((w) => w.id === lastId);
    if (!wp) continue;
    for (const nextId of wp.neighbors) {
      if (!visited.has(nextId)) {
        visited.add(nextId);
        queue.push([...path, nextId]);
      }
    }
  }

  const pts = wpIds.map((id) => {
    const wp = NAV_WAYPOINTS.find((w) => w.id === id)!;
    return { x: wp.x, y: wp.y };
  });
  pts.push({ x: toX, y: toY });
  return pts;
}

export const SABOTAGE_TRAPS: Record<string, string[]> = {
  "sec-memory": [
    "6 байтів × 10 = 60 бітів (десятковий зсув)",
    "1 Байт = 10 бітів (округлення для зручності)",
  ],
  "sec-crypto": [
    "Слово «КОД» у UTF-16 = 3 × 2 = 6 бітів (забуто ×8)",
    "Кожна літера в UTF-16 важить 1 біт",
  ],
  "sec-algo": [
    "4 ітерації × 2 байти = 8 бітів (підміна одиниць)",
    "Цикл WHILE ніколи не перевіряє умову",
  ],
  "sec-radar": [
    "2 КБ = рівно 2000 байтів, пакети ідентичні",
    "1 МБ = 100 КБ",
  ],
  "sec-shield": [
    "2FA = просто написати свій пароль двічі поспіль",
    "Пароль «123456» — найнадійніший, бо легко запам'ятати",
  ],
  "sec-reactor": [
    "80 бітів / 10 = 8 байтів",
    "Кілобайт менший за Байт",
  ],
};

export interface ShipPortal {
  id: string;
  roomId: string;
  roomName: string;
  x: number;
  y: number;
  targetPortalId: string;
}

export const SHIP_PORTALS: ShipPortal[] = [
  {
    id: "portal-mem",
    roomId: "sec-memory",
    roomName: "Капсула",
    x: 224,
    y: 162,
    targetPortalId: "portal-algo",
  },
  {
    id: "portal-algo",
    roomId: "sec-algo",
    roomName: "Dev-лофт",
    x: 804,
    y: 164,
    targetPortalId: "portal-rea",
  },
  {
    id: "portal-rea",
    roomId: "sec-reactor",
    roomName: "Машинна",
    x: 794,
    y: 438,
    targetPortalId: "portal-rad",
  },
  {
    id: "portal-rad",
    roomId: "sec-radar",
    roomName: "Сонарна",
    x: 102,
    y: 438,
    targetPortalId: "portal-mem",
  },
  {
    id: "portal-cry",
    roomId: "sec-crypto",
    roomName: "Студія",
    x: 378,
    y: 138,
    targetPortalId: "portal-shd",
  },
  {
    id: "portal-shd",
    roomId: "sec-shield",
    roomName: "Шлюз",
    x: 520,
    y: 534,
    targetPortalId: "portal-cry",
  },
];

export const CREW_SEED_18: CrewSeedMember[] = [
  {
    id: "p1",
    name: "Ви (Олександр)",
    anonHandle: "Кібер-Аксолотль #01",
    avatarColor: "#2E3A59",
    startX: 392,
    startY: 292,
    isSaboteur: false,
    cleanLog: "Оглядаю кімнати станції, тиск у нормі",
  },
  {
    id: "p2",
    name: "Софія Б.",
    anonHandle: "Неонова Сова #02",
    avatarColor: "#1F6F6B",
    startX: 195,
    startY: 135,
    isSaboteur: false,
    cleanLog: "1 Байт = 8 бітів → перевірено контрольною сумою",
  },
  {
    id: "p3",
    name: "Максим К.",
    anonHandle: "Вектор-Вовк #03",
    avatarColor: "#B8325F",
    startX: 465,
    startY: 118,
    isSaboteur: true,
    cleanLog: "Підключаю кабелі в Студії...",
  },
  {
    id: "p4",
    name: "Дарина П.",
    anonHandle: "Стелс-Лисиця #04",
    avatarColor: "#FF9F43",
    startX: 705,
    startY: 135,
    isSaboteur: false,
    cleanLog: "4 байти × 8 = 32 біти — цикл синхронізовано",
  },
  {
    id: "p5",
    name: "Артем В.",
    anonHandle: "Квант-Тигр #05",
    avatarColor: "#6B4FC8",
    startX: 205,
    startY: 470,
    isSaboteur: true,
    cleanLog: "Перевіряю частоти в Сонарній...",
  },
  {
    id: "p6",
    name: "Вероніка М.",
    anonHandle: "Астра-Пантера #06",
    avatarColor: "#4A9BD8",
    startX: 430,
    startY: 485,
    isSaboteur: false,
    cleanLog: "5 байтів = 40 бітів (менше ніж 48 бітів)",
  },
  {
    id: "p7",
    name: "Богдан Т.",
    anonHandle: "Піксель-Сокіл #07",
    avatarColor: "#D45A3A",
    startX: 505,
    startY: 315,
    isSaboteur: false,
    cleanLog: "У слові ШКОЛА 5 символів × 1 байт = 40 бітів",
  },
  {
    id: "p8",
    name: "Злата Р.",
    anonHandle: "Біолюм-Рись #08",
    avatarColor: "#2FA37A",
    startX: 140,
    startY: 150,
    isSaboteur: false,
    cleanLog: "64 біти / 8 = 8 цілих байтів",
  },
  {
    id: "p9",
    name: "Ілля С.",
    anonHandle: "Гіпер-Дракон #09",
    avatarColor: "#FFD36B",
    startX: 410,
    startY: 96,
    isSaboteur: false,
    cleanLog: "ASCII кодує 1 латинський символ одним байтом (8 бітів)",
  },
  {
    id: "p10",
    name: "Катерина Д.",
    anonHandle: "Кріо-Комета #10",
    avatarColor: "#6FB8FF",
    startX: 745,
    startY: 150,
    isSaboteur: false,
    cleanLog: "Умова IF-ELSE перевіряє логічний вираз (Істина/Хиба)",
  },
  {
    id: "p11",
    name: "Назар Г.",
    anonHandle: "Тіньовий Байтер #11",
    avatarColor: "#C9A66B",
    startX: 710,
    startY: 470,
    isSaboteur: true,
    cleanLog: "Калібрую енергію в Машинній...",
  },
  {
    id: "p12",
    name: "Олена Ш.",
    anonHandle: "Нейро-Хвиля #12",
    avatarColor: "#1A1A22",
    startX: 485,
    startY: 485,
    isSaboteur: false,
    cleanLog: "Фішинг — це підробний сайт для виманювання паролів",
  },
  {
    id: "p13",
    name: "Павло Л.",
    anonHandle: "Синтез-Кобра #13",
    avatarColor: "#5D6B8A",
    startX: 410,
    startY: 255,
    isSaboteur: false,
    cleanLog: "Ромб у блок-схемі позначає перевірку умови",
  },
  {
    id: "p14",
    name: "Марія Ч.",
    anonHandle: "Люмен-Орхідея #14",
    avatarColor: "#A86FD8",
    startX: 165,
    startY: 295,
    isSaboteur: false,
    cleanLog: "Змінна — іменована комірка пам'яті",
  },
  {
    id: "p15",
    name: "Тимофій Я.",
    anonHandle: "Турбо-Яструб #15",
    avatarColor: "#7FBF3F",
    startX: 735,
    startY: 300,
    isSaboteur: false,
    cleanLog: "3 байти = 24 біти",
  },
  {
    id: "p16",
    name: "Діана О.",
    anonHandle: "Стар-Фенікс #16",
    avatarColor: "#6FE3FF",
    startX: 155,
    startY: 460,
    isSaboteur: false,
    cleanLog: "1024 байти = 1 Кілобайт",
  },
  {
    id: "p17",
    name: "Владислав Ж.",
    anonHandle: "Омега-Краб #17",
    avatarColor: "#8A5A3C",
    startX: 450,
    startY: 350,
    isSaboteur: false,
    cleanLog: "Алфавіт двійкової системи: 0 та 1",
  },
  {
    id: "p18",
    name: "Анастасія Є.",
    anonHandle: "Кристал-Ластівка #18",
    avatarColor: "#EDEFF5",
    startX: 685,
    startY: 495,
    isSaboteur: false,
    cleanLog: "80 бітів / 8 = 10 байтів",
  },
];
