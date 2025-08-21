import * as UI from "./ui"

const state = {
  showFPS: UI.ref(false),
  showInternals: UI.ref(false),
  name: UI.ref(""),
  count: 0,
  frameTimes: [] as number[]
}

function plural(word: string, count: number) {
  return count === 1 ? word : word + "s"
}

const fps_measure_window = 1000;
const fontSize = 16;
const margin = fontSize / 2;
const buttonWidth = 100;
const buttonHeight = 30;
const checkboxSize = 20;

export function tick(dt: number, canvasRect: DOMRect, ctx: CanvasRenderingContext2D) {
  while (state.frameTimes.length > 0 && state.frameTimes[0] <= performance.now() - fps_measure_window) {
    state.frameTimes.shift();
  }
  const FPS = state.frameTimes.length / (fps_measure_window / 1000);
  state.frameTimes.push(performance.now())

  ctx.textAlign = "left";
  ctx.textBaseline = "top"
  ctx.textBaseline = "middle"
  ctx.font = `${fontSize}px Arial`;
  let x = margin;
  let y = margin;

  ctx.fillStyle = "#555";
  ctx.fillRect(0, 0, canvasRect.width, canvasRect.height);

  if (UI.button({ text: "+1 count", x, y, height: buttonHeight, width: buttonWidth })) {
    state.count++;
  }
  ctx.fillStyle = "white";
  ctx.fillText(`button clicked ${state.count} ${plural("time", state.count)}`,
    x + buttonWidth + margin, y + buttonHeight / 2);
  y += buttonHeight + margin;

  UI.checkbox({
    id: "show-internals",
    x,
    y,
    width: checkboxSize,
    height: checkboxSize,
    value: state.showInternals,
  });
  ctx.fillText(`show internal state`, x + checkboxSize + margin, y + checkboxSize / 2);
  y += checkboxSize + margin;

  if (state.showInternals.value) {
    const uiState = JSON.stringify({
      hovering: UI.state.hovering,
      mouseX: UI.state.mouseX,
      mouseY: UI.state.mouseY,
    }, null, 2);
    const uiStateLines = uiState.split("\n");
    ctx.save()
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    for (let i = 0; i < uiStateLines.length; i++) {
      const line = uiStateLines[i];
      ctx.fillText(line, x, y);
      y += fontSize * 1.2;
    }
    ctx.restore()
    y += margin;
  }

  UI.checkbox({
    id: "show-fps",
    x,
    y,
    width: checkboxSize,
    height: checkboxSize,
    value: state.showFPS,
  });
  ctx.fillText(`show FPS`, x + checkboxSize + margin, y + checkboxSize / 2);
  y += checkboxSize + margin;

  if (state.showFPS.value) {
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(`${Math.round(FPS)} FPS`, canvasRect.width - margin, margin);
  }

  // Name input textbox
  const textboxWidth = 200;
  const textboxHeight = 30;
  UI.textbox({
    id: "name-input",
    x,
    y,
    width: textboxWidth,
    height: textboxHeight,
    value: state.name,
    placeholder: "Enter your name...",
  });
  ctx.fillStyle = "white";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  if (state.name.value !== "") {
    ctx.fillText(`Hello, ${state.name.value}!`, x + textboxWidth + margin, y + textboxHeight / 2);
  }
  y += textboxHeight + margin;
}
