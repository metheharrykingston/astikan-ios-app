import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

let lastColor = "";
let busy = false;

function ensureThemeMeta(color: string) {
  let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = color;
}

function parseRgb(color: string): [number, number, number] | null {
  const rgb = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];

  const hex = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];
  }

  return null;
}

function shouldUseDarkIcons(color: string) {
  const rgb = parseRgb(color);
  if (!rgb) return true;

  const [r, g, b] = rgb.map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });

  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55;
}

function cssColorToHex(color: string): string | null {
  if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") return null;

  if (/^#[0-9a-f]{6}$/i.test(color.trim())) return color.trim();

  const rgb = parseRgb(color);
  if (!rgb) return null;

  return (
    "#" +
    rgb
      .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0"))
      .join("")
  ).toUpperCase();
}

function getElementColor(el: Element | null): string | null {
  let node: Element | null = el;

  while (node && node !== document.documentElement) {
    const custom = node.getAttribute("data-status-bar-color") || node.getAttribute("data-native-statusbar");
    if (custom) return custom;

    const style = window.getComputedStyle(node);
    const color = cssColorToHex(style.backgroundColor);
    if (color) return color;

    node = node.parentElement;
  }

  const bodyColor = cssColorToHex(window.getComputedStyle(document.body).backgroundColor);
  if (bodyColor) return bodyColor;

  return "#F8F7F2";
}

function detectTopColor(): string {
  const manual = document.querySelector("[data-status-bar-color], [data-native-statusbar]");
  if (manual) {
    const color = manual.getAttribute("data-status-bar-color") || manual.getAttribute("data-native-statusbar");
    if (color) return color;
  }

  const points: Array<[number, number]> = [
    [Math.floor(window.innerWidth / 2), 8],
    [24, 8],
    [window.innerWidth - 24, 8],
    [Math.floor(window.innerWidth / 2), 32],
  ];

  for (const [x, y] of points) {
    const el = document.elementFromPoint(x, y);
    const color = getElementColor(el);
    if (color) return color;
  }

  return "#F8F7F2";
}

async function applyStatusBar() {
  if (busy) return;
  busy = true;

  try {
    const color = detectTopColor();
    if (!color || color === lastColor) return;

    lastColor = color;
    ensureThemeMeta(color);
    document.documentElement.style.setProperty("--native-status-bar-color", color);

    if (!Capacitor.isNativePlatform()) return;

    const darkIcons = shouldUseDarkIcons(color);

    await StatusBar.setStyle({
      style: darkIcons ? Style.Light : Style.Dark,
    });

    await StatusBar.setBackgroundColor({ color });
  } catch (err) {
    console.warn("Native status bar auto update skipped:", err);
  } finally {
    busy = false;
  }
}

function debounce(fn: () => void, delay = 120) {
  let timer: number | undefined;
  return () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(fn, delay);
  };
}

export function initAutoNativeStatusBar() {
  const run = debounce(() => {
    void applyStatusBar();
  }, 80);

  const originalPush = history.pushState;
  const originalReplace = history.replaceState;

  history.pushState = function (...args) {
    const ret = originalPush.apply(this, args);
    window.dispatchEvent(new Event("native-route-change"));
    return ret;
  };

  history.replaceState = function (...args) {
    const ret = originalReplace.apply(this, args);
    window.dispatchEvent(new Event("native-route-change"));
    return ret;
  };

  window.addEventListener("native-route-change", run);
  window.addEventListener("popstate", run);
  window.addEventListener("hashchange", run);
  window.addEventListener("click", run, true);
  window.addEventListener("scroll", run, true);
  window.addEventListener("resize", run);
  window.addEventListener("visibilitychange", run);

  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "data-status-bar-color", "data-native-statusbar"],
  });

  setTimeout(run, 50);
  setTimeout(run, 500);
  setTimeout(run, 1500);
}
