import { controls } from "../data/controls";
import { joystickDirection } from "../systems/SteeringSystem";
export class FloatingJoystick {
  direction: number | null = null;
  private pointer: number | null = null;
  private x = 0;
  private y = 0;
  private base: HTMLElement;
  private knob: HTMLElement;
  private cleanup: AbortController;
  constructor(private zone: HTMLElement) {
    this.cleanup = new AbortController();
    this.base = document.createElement("div");
    this.base.className = "joystick-base";
    this.knob = document.createElement("div");
    this.knob.className = "joystick-knob";
    this.base.append(this.knob);
    zone.append(this.base);
    const options = { signal: this.cleanup.signal };
    zone.addEventListener(
      "pointerdown",
      (e) => {
        if (this.pointer !== null) return;
        e.preventDefault();
        this.pointer = e.pointerId;
        zone.setPointerCapture(e.pointerId);
        const r = zone.getBoundingClientRect();
        this.x = e.clientX;
        this.y = e.clientY;
        this.base.style.left = `${e.clientX - r.left}px`;
        this.base.style.top = `${e.clientY - r.top}px`;
        this.base.classList.add("active");
        this.knob.style.transform = "translate(-50%,-50%)";
      },
      options,
    );
    zone.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerId !== this.pointer) return;
        e.preventDefault();
        const dx = e.clientX - this.x,
          dy = e.clientY - this.y,
          dist = Math.hypot(dx, dy),
          ratio =
            dist > controls.joystickRadius ? controls.joystickRadius / dist : 1;
        this.direction = joystickDirection(dx, dy);
        this.knob.style.transform = `translate(calc(-50% + ${dx * ratio}px),calc(-50% + ${dy * ratio}px))`;
      },
      options,
    );
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      zone.addEventListener(
        event,
        (e) => {
          if ((e as PointerEvent).pointerId === this.pointer) this.reset();
        },
        options,
      );
  }
  reset() {
    const id = this.pointer;
    this.pointer = null;
    this.direction = null;
    this.base.classList.remove("active");
    if (id !== null && this.zone.hasPointerCapture(id))
      this.zone.releasePointerCapture(id);
  }
  destroy() {
    this.reset();
    this.cleanup.abort();
    this.base.remove();
  }
}
