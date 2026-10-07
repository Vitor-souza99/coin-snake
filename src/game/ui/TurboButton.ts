export class TurboButton {
  held = false;
  private pointer: number | null = null;
  private cleanup = new AbortController();
  constructor(private button: HTMLButtonElement) {
    const options = { signal: this.cleanup.signal };
    button.addEventListener(
      "pointerdown",
      (e) => {
        if (this.pointer !== null) return;
        e.preventDefault();
        this.pointer = e.pointerId;
        this.held = true;
        button.setPointerCapture(e.pointerId);
      },
      options,
    );
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      button.addEventListener(
        type,
        (e) => {
          if ((e as PointerEvent).pointerId === this.pointer) this.reset();
        },
        options,
      );
  }
  reset() {
    const id = this.pointer;
    this.pointer = null;
    this.held = false;
    if (id !== null && this.button.hasPointerCapture(id))
      this.button.releasePointerCapture(id);
  }
  destroy() {
    this.reset();
    this.cleanup.abort();
  }
}
