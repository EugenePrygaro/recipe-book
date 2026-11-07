/** Конфеті: шматочки розлітаються з точки на екрані. Без «Зменшення руху» в системі. */
import { reducedMotion } from "./dom.js";

const COLORS = ["#F2B81F", "#4BA35A", "#1B6A3C", "#B6E297", "#E5484D", "#FFFFFF", "#7FC8F8"];

export function confetti(x, y, { count = 40, power = 1 } = {}) {
  if (reducedMotion()) return;
  const layer = document.createElement("div");
  layer.className = "confetti";
  layer.style.left = `${x}px`;
  layer.style.top = `${y}px`;
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = Array.from({ length: count }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const dist = (90 + Math.random() * 150) * power;
    return `<i style="--x:${(Math.cos(angle) * dist).toFixed(0)}px;--y:${(Math.sin(angle) * dist - 50).toFixed(0)}px;--r:${(Math.random() * 720 - 360).toFixed(0)}deg;--c:${COLORS[i % COLORS.length]};--d:${(Math.random() * 120).toFixed(0)}ms"></i>`;
  }).join("");
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 1700);
}

/** Конфеті з центру елемента. */
export function confettiFrom(el, opts) {
  const r = el.getBoundingClientRect();
  confetti(r.left + r.width / 2, r.top + r.height / 2, opts);
}
