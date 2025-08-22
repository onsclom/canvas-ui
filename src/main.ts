import { tick } from "./game";
import { canvas } from "./dom";
import * as UI from "./ui";

let prevTime = performance.now();
function raf() {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no ctx");

  const canvasRect = canvas.getBoundingClientRect();
  canvas.width = canvasRect.width * devicePixelRatio;
  canvas.height = canvasRect.height * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);

  {
    const now = performance.now();
    const dt = now - prevTime;
    prevTime = now;
    UI.startTick(ctx);
    tick(dt, canvasRect, ctx);
    UI.endTick(dt);
  }

  requestAnimationFrame(raf);
}
raf()
