import { canvas } from "./dom"
import { assert } from "./assert"

const borderColor = "#111"
const hoveredColor = "#555"
const nonHoveredColor = "#444"
const borderSize = 1
const textColor = "#eee"

type Ref<T> = { value: T }

export function ref<T>(value: T): Ref<T> {
  return { value };
}

type UI = {
  type: "button" | "checkbox" | "textbox",
  x: number,
  y: number,
  width: number,
  height: number,
  id: string,
  text?: string, // only for button
  checkedValue?: Ref<boolean>, // only for checkbox
  textValue?: Ref<string>, // only for textbox
  placeholder?: string, // only for textbox
}

export const state = {
  ctx: null as CanvasRenderingContext2D | null,
  hovering: null as string | null,
  clicked: null as string | null,
  focused: null as string | null,
  mouseX: 0,
  mouseY: 0,
  mouseJustClicked: false,
  uiToRender: [] as UI[],
  keysPressed: [] as string[],
  lastAction: {} as Record<string, number>
}

canvas.addEventListener("pointermove", (event) => {
  state.mouseX = event.offsetX;
  state.mouseY = event.offsetY;
})

canvas.addEventListener("pointerdown", () => {
  state.mouseJustClicked = true;
})

document.body.addEventListener("keydown", (event) => {
  // ignore hotkey combinations
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  if (state.focused) {
    state.keysPressed.push(event.key);
    event.preventDefault();
  }
})

export function startTick(ctx: CanvasRenderingContext2D) {
  state.ctx = ctx;
}

export function endTick(dt: number) {
  // calculate new hovered
  state.hovering = null;
  for (const ui of state.uiToRender) {
    const { x, y, width, height, id } = ui;
    const isHovered = state.mouseX >= x && state.mouseX <= x + width &&
      state.mouseY >= y && state.mouseY <= y + height;
    if (isHovered) {
      state.hovering = id;
    }
  }
  canvas.style.cursor = state.hovering ? "pointer" : "default";

  // calculate clicked
  state.clicked = null;
  if (state.mouseJustClicked) {
    state.clicked = state.hovering;
    if (state.clicked) { state.lastAction[state.clicked] = performance.now() }
    // Update focus for textboxes
    const clickedUI = state.uiToRender.find(ui => ui.id === state.hovering);

    // TODO: make buttons and checkboxes focusable?
    if (clickedUI?.type === "textbox") {
      state.focused = state.hovering;
    } else {
      state.focused = null;
    }
  }
  state.mouseJustClicked = false;



  function drawActionFlash(
    ctx: CanvasRenderingContext2D,
    actionFactor: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    // action flash?
    ctx.save()
    ctx.fillStyle = "white"
    ctx.globalAlpha = actionFactor * .5
    ctx.fillRect(x, y, width, height)
    ctx.restore()

  }

  // draw UI & handle updates
  const ctx = state.ctx;
  assert(ctx !== null);
  for (const ui of state.uiToRender) {
    const actionAnimationTime = 500;
    const idsLastAction = state.lastAction[ui.id]
    const timeSinceAction = idsLastAction ?
      performance.now() - idsLastAction : actionAnimationTime
    const actionFactor = (1 - (Math.min(timeSinceAction, actionAnimationTime) / actionAnimationTime)) ** 2

    switch (ui.type) {
      case "checkbox": {
        const { x, y, width, height, id, checkedValue: value } = ui;
        assert(value !== undefined)
        if (state.clicked === id) { value.value = !value.value; }

        ctx.fillStyle = borderColor;
        ctx.fillRect(x, y, width, height);
        ctx.fillStyle = state.hovering === id ? hoveredColor : nonHoveredColor;
        ctx.fillRect(
          x + borderSize,
          y + borderSize,
          width - borderSize * 2,
          height - borderSize * 2
        )
        if (value.value) {
          ctx.fillStyle = textColor
          ctx.fillRect(x + 5, y + 5, width - 10, height - 10);
        }
        drawActionFlash(ctx, actionFactor, x, y, width, height)
        break;
      }

      case "button": {
        const { x, y, width, height, text, id } = ui;
        ctx.fillStyle = borderColor;
        ctx.fillRect(x, y, width, height);

        ctx.fillStyle = state.hovering === id ? hoveredColor : nonHoveredColor;
        ctx.fillRect(
          x + borderSize,
          y + borderSize,
          width - borderSize * 2,
          height - borderSize * 2
        )

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = textColor;

        {
          ctx.save()
          ctx.beginPath();
          ctx.rect(x + borderSize, y + borderSize, width - borderSize * 2, height - borderSize * 2);
          ctx.clip();
          ctx.fillText(text || "", x + width / 2, y + height / 2);
          ctx.restore();
        }

        drawActionFlash(ctx, actionFactor, x, y, width, height)

        break
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

        ctx.fillStyle = nonHoveredColor
        ctx.fillRect(
          x + borderSize,
          y + borderSize,
          width - borderSize * 2,
          height - borderSize * 2
        )

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

        ctx.save()
        ctx.fillStyle = textColor;
        if (!textValue.value && placeholder) {
          ctx.globalAlpha = 0.5
        }
        ctx.fillText(displayText, textX, textY);
        ctx.restore()

        // Draw cursor if focused
        if (isFocused) {
          const textWidth = ctx.measureText(textValue.value).width;
          ctx.fillStyle = textColor;
          ctx.fillRect(textX + textWidth, textY - 8, 1, 16);
        }
        ctx.restore();

        drawActionFlash(ctx, actionFactor, x, y, width, height)
        break;
      }
    }
  }

  // Clear processed keys
  state.keysPressed = [];
  state.uiToRender = [];
}

export function checkbox(props: {
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  value: Ref<boolean>,
}) {
  const { x, y, width, height, value, id } = props;
  state.uiToRender.push({
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
  text: string,
  x?: number,
  y?: number,
  width?: number,
  height?: number,
  id?: string,
}): boolean {
  const { text, x = 0, y = 0, width = 100, height = 50 } = props;
  const id = props.id ?? `button-${text}`;
  state.uiToRender.push({
    type: "button",
    x,
    y,
    width,
    height,
    text,
    id,
  });
  return state.clicked === id
}

export function textbox(props: {
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  value: Ref<string>,
  placeholder?: string,
}): boolean {
  const { x, y, width, height, value, id, placeholder } = props;
  state.uiToRender.push({
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
