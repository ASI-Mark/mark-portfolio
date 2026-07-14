import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { avatarReducer, initialState, type AvatarAction } from "../useAvatarState";

describe("avatarReducer", () => {
  it("starts in idle state", () => {
    const state = initialState();
    expect(state.animation).toBe("idle");
    expect(state.facingLeft).toBe(false);
  });

  it("transitions to walk on MOUSE_MOVE", () => {
    let state = initialState();
    state = avatarReducer(state, {
      type: "MOUSE_MOVE",
      x: 200,
      y: 300,
    });
    expect(state.animation).toBe("walk");
    expect(state.targetX).toBe(200);
    expect(state.targetY).toBe(300);
  });

  it("faces left when mouse is to the left", () => {
    let state = initialState();
    state.posX = 500;
    state = avatarReducer(state, { type: "MOUSE_MOVE", x: 100, y: 300 });
    expect(state.facingLeft).toBe(true);
  });

  it("faces right when mouse is to the right", () => {
    let state = initialState();
    state.posX = 100;
    state = avatarReducer(state, { type: "MOUSE_MOVE", x: 500, y: 300 });
    expect(state.facingLeft).toBe(false);
  });

  it("transitions to idle on IDLE_TIMEOUT", () => {
    let state = initialState();
    state.animation = "walk";
    state = avatarReducer(state, { type: "IDLE_TIMEOUT" });
    expect(state.animation).toBe("idle");
  });

  it("transitions to sit on SIT_TIMEOUT", () => {
    let state = initialState();
    state.animation = "idle";
    state = avatarReducer(state, { type: "SIT_TIMEOUT" });
    expect(state.animation).toBe("sit");
  });

  it("transitions to sleep on SLEEP_TIMEOUT", () => {
    let state = initialState();
    state.animation = "sit";
    state = avatarReducer(state, { type: "SLEEP_TIMEOUT" });
    expect(state.animation).toBe("sleep");
  });

  it("wakes up from sleep on MOUSE_MOVE", () => {
    let state = initialState();
    state.animation = "sleep";
    state = avatarReducer(state, { type: "MOUSE_MOVE", x: 200, y: 200 });
    expect(state.animation).toBe("walk");
  });

  it("wakes up from sit on MOUSE_MOVE", () => {
    let state = initialState();
    state.animation = "sit";
    state = avatarReducer(state, { type: "MOUSE_MOVE", x: 200, y: 200 });
    expect(state.animation).toBe("walk");
  });

  it("triggers wave on CLICK", () => {
    let state = initialState();
    state.animation = "idle";
    state = avatarReducer(state, { type: "CLICK" });
    expect(state.animation).toBe("wave");
  });

  it("returns to idle after WAVE_DONE", () => {
    let state = initialState();
    state.animation = "wave";
    state = avatarReducer(state, { type: "WAVE_DONE" });
    expect(state.animation).toBe("idle");
  });

  it("TICK moves position toward target", () => {
    let state = initialState();
    state.posX = 0;
    state.posY = 0;
    state.targetX = 100;
    state.targetY = 0;
    state.animation = "walk";
    state = avatarReducer(state, { type: "TICK" });
    expect(state.posX).toBeGreaterThan(0);
    expect(state.posX).toBeLessThan(100);
  });

  it("TICK does not move when close enough to target", () => {
    let state = initialState();
    state.posX = 100;
    state.posY = 100;
    state.targetX = 110;
    state.targetY = 100;
    state.animation = "walk";
    state = avatarReducer(state, { type: "TICK" });
    // Distance is 10, which is less than CLOSE_ENOUGH (48)
    expect(state.posX).toBe(100);
  });

  it("ZONE_ENTER sets active zone without touching animation", () => {
    // After 3D avatar refactor, the hook drives zone animations via SET_ANIM;
    // the reducer only tracks which zone is active.
    let state = initialState();
    state.animation = "idle";
    state = avatarReducer(state, { type: "ZONE_ENTER", zone: "beliefs" });
    expect(state.activeZone).toBe("beliefs");
    expect(state.animation).toBe("idle");
  });

  it("ZONE_ENTER to footer just tracks zone", () => {
    let state = initialState();
    state.animation = "idle";
    state = avatarReducer(state, { type: "ZONE_ENTER", zone: "footer" });
    expect(state.activeZone).toBe("footer");
    expect(state.animation).toBe("idle");
  });

  it("ZONE_EXIT clears zone without forcing animation", () => {
    let state = initialState();
    state.animation = "sit";
    state.activeZone = "beliefs";
    state = avatarReducer(state, { type: "ZONE_EXIT" });
    expect(state.activeZone).toBeNull();
  });

  it("mouse move clears zone and starts walk", () => {
    let state = initialState();
    state.animation = "sit";
    state.activeZone = "beliefs";
    state = avatarReducer(state, { type: "MOUSE_MOVE", x: 200, y: 200 });
    expect(state.animation).toBe("walk");
  });

  // DOCK is dispatched by the hook before it lets the avatar fall asleep, so
  // it never naps on top of the reading column — see dockThenSleep in
  // useAvatarState.ts. Mechanically it's the same shape as MOUSE_MOVE.
  it("DOCK walks the avatar toward the given coordinates", () => {
    let state = initialState();
    state.animation = "sit";
    state = avatarReducer(state, { type: "DOCK", x: 900, y: 600 });
    expect(state.animation).toBe("walk");
    expect(state.targetX).toBe(900);
    expect(state.targetY).toBe(600);
  });

  it("DOCK computes facing direction the same way MOUSE_MOVE does", () => {
    let state = initialState();
    state.posX = 500;
    state = avatarReducer(state, { type: "DOCK", x: 900, y: 600 });
    expect(state.facingLeft).toBe(false);
  });
});
