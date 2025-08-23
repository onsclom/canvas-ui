import { canvas } from "./dom";
import { assert } from "./assert";

const borderColor = "#111";
const uiBackgroundColor = "#444";
const borderSize = 1;
const textColor = "#eee";

type Ref<T> = { value: T };

export function ref<T>(value: T): Ref<T> {
  return { value };
}

type UI = {
  type: "button" | "checkbox" | "textbox";
  x: number;
  y: number;
  width: number;
  height: number;
  id: string;
  text?: string; // only for button
  checkedValue?: Ref<boolean>; // only for checkbox
  textValue?: Ref<string>; // only for textbox
  placeholder?: string; // only for textbox
};

export const state = {
  ctx: null as CanvasRenderingContext2D | null,
  hovering: null as string | null,
  clicked: null as string | null,
  focused: null as string | null,
  mouseX: 0,
  mouseY: 0,
  mouseJustClicked: false,
  uiToTick: [] as UI[],
  keysPressed: [] as string[],
  lastAction: {} as Record<string, number>,
  animatedHover: {} as Record<string, number>, // approaches 0 (not hovered) or 1 (hovered)
};

canvas.addEventListener("pointermove", (event) => {
  state.mouseX = event.offsetX;
  state.mouseY = event.offsetY;
});

canvas.addEventListener("pointerdown", () => {
  state.mouseJustClicked = true;
});

document.body.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (state.focused) {
    state.keysPressed.push(event.key);
    event.preventDefault();
  }
});

export function startTick(ctx: CanvasRenderingContext2D) {
  state.ctx = ctx;
}

function drawActionFlash(
  ctx: CanvasRenderingContext2D,
  actionFactor: number,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  ctx.save();
  ctx.fillStyle = "white";
  ctx.globalAlpha = actionFactor * 0.25;
  ctx.fillRect(x, y, width, height);
  ctx.restore();
}

export function endTick(dt: number) {
  // calculate new hovered
  state.hovering = null;
  for (const ui of state.uiToTick) {
    const { x, y, width, height, id } = ui;
    const isHovered =
      state.mouseX >= x &&
      state.mouseX <= x + width &&
      state.mouseY >= y &&
      state.mouseY <= y + height;
    if (isHovered) {
      state.hovering = id;
    }
  }

  canvas.style.cursor = state.hovering ? "pointer" : "default";

  // calculate clicked
  state.clicked = null;
  if (state.mouseJustClicked) {
    state.clicked = state.hovering;
    if (state.clicked) {
      state.lastAction[state.clicked] = performance.now();
    }
    state.focused = state.hovering;
  }
  state.mouseJustClicked = false;

  // draw UI & handle updates
  const ctx = state.ctx;
  assert(ctx !== null);
  for (const ui of state.uiToTick) {
    const actionAnimationTime = 500;
    const idsLastAction = state.lastAction[ui.id];
    const timeSinceAction = idsLastAction
      ? performance.now() - idsLastAction
      : actionAnimationTime;
    const actionFactor =
      (1 -
        Math.min(timeSinceAction, actionAnimationTime) / actionAnimationTime) **
      2;

    // lets handle hover now
    const prevAnimatedHover = state.animatedHover[ui.id] ?? 0;
    const hoverTarget = state.hovering === ui.id ? 1 : 0;

    function lerp(a: number, b: number, percent: number) {
      const diff = b - a;
      return a + diff * percent;
    }

    const newAnimatedHover = lerp(
      prevAnimatedHover,
      hoverTarget,
      dt ** 2 / 1000,
    );
    state.animatedHover[ui.id] = newAnimatedHover;

    switch (ui.type) {
      case "checkbox": {
        const { x, y, width, height, id, checkedValue: value } = ui;
        assert(value !== undefined);
        if (state.clicked === id) {
          value.value = !value.value;
        }

        ctx.fillStyle = borderColor;
        ctx.fillRect(x, y, width, height);
        ctx.fillStyle = uiBackgroundColor;
        ctx.fillRect(
          x + borderSize,
          y + borderSize,
          width - borderSize * 2,
          height - borderSize * 2,
        );

        {
          ctx.save();
          ctx.fillStyle = "white";
          ctx.globalAlpha = newAnimatedHover * 0.1;
          ctx.fillRect(
            x + borderSize,
            y + borderSize,
            width - borderSize * 2,
            height - borderSize * 2,
          );
          ctx.restore();
        }

        if (value.value) {
          ctx.fillStyle = textColor;
          ctx.fillRect(x + 5, y + 5, width - 10, height - 10);
        }
        drawActionFlash(ctx, actionFactor, x, y, width, height);
        break;
      }

      case "button": {
        const { x, y, width, height, text } = ui;
        ctx.fillStyle = borderColor;
        ctx.fillRect(x, y, width, height);

        ctx.fillStyle = uiBackgroundColor;
        ctx.fillRect(
          x + borderSize,
          y + borderSize,
          width - borderSize * 2,
          height - borderSize * 2,
        );

        {
          ctx.save();
          ctx.globalAlpha = newAnimatedHover * 0.1;
          ctx.fillStyle = "white";
          ctx.fillRect(
            x + borderSize,
            y + borderSize,
            width - borderSize * 2,
            height - borderSize * 2,
          );
          ctx.restore();
        }

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = textColor;

        {
          ctx.save();
          ctx.beginPath();
          ctx.rect(
            x + borderSize,
            y + borderSize,
            width - borderSize * 2,
            height - borderSize * 2,
          );
          ctx.clip();
          ctx.fillText(text || "", x + width / 2, y + height / 2);
          ctx.restore();
        }

        drawActionFlash(ctx, actionFactor, x, y, width, height);

        break;
      }
      case "textbox": {
        const { x, y, width, height, id, textValue, placeholder } = ui;
        assert(textValue !== undefined);

        // Handle keyboard input
        if (state.focused === id) {
          for (const key of state.keysPressed) {
            if (key === "Backspace") {
              textValue.value = textValue.value.slice(0, -1);
            } else if (key === "Enter" || key === "Escape") {
              state.focused = null;
            } else if (key.length === 1) {
              textValue.value += key;
            }
          }
        }

        // Render textbox
        const isFocused = state.focused === id;

        ctx.fillStyle = borderColor;
        ctx.fillRect(x, y, width, height);

        ctx.fillStyle = uiBackgroundColor;
        ctx.fillRect(
          x + borderSize,
          y + borderSize,
          width - borderSize * 2,
          height - borderSize * 2,
        );

        // Render text
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = textColor;

        const displayText = textValue.value || placeholder || "";
        const textX = x + 8;
        const textY = y + height / 2;

        // Clip text to textbox bounds
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 4, y, width - 8, height);
        ctx.clip();

        ctx.save();
        ctx.fillStyle = textColor;
        if (!textValue.value && placeholder) {
          ctx.globalAlpha = 0.5;
        }
        ctx.fillText(displayText, textX, textY);
        ctx.restore();

        // Draw cursor if focused
        if (isFocused) {
          const textWidth = ctx.measureText(textValue.value).width;
          ctx.fillStyle = textColor;
          ctx.fillRect(textX + textWidth, textY - 8, 1, 16);
        }
        ctx.restore();

        drawActionFlash(ctx, actionFactor, x, y, width, height);
        break;
      }
    }
  }

  state.keysPressed = [];
  state.uiToTick = [];
}

export function checkbox(props: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  value: Ref<boolean>;
}) {
  const { x, y, width, height, value, id } = props;
  state.uiToTick.push({
    type: "checkbox",
    x,
    y,
    width,
    height,
    id,
    checkedValue: value,
  });
}

export function button(props: {
  text: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  id?: string;
}): boolean {
  const { text, x = 0, y = 0, width = 100, height = 50 } = props;
  const id = props.id ?? `button-${text}`;
  state.uiToTick.push({
    type: "button",
    x,
    y,
    width,
    height,
    text,
    id,
  });
  return state.clicked === id;
}

export function textbox(props: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  value: Ref<string>;
  placeholder?: string;
}): boolean {
  const { x, y, width, height, value, id, placeholder } = props;
  state.uiToTick.push({
    type: "textbox",
    x,
    y,
    width,
    height,
    id,
    textValue: value,
    placeholder,
  });
  return false; // TODO: return true if "enter" was pressed while focused
}
