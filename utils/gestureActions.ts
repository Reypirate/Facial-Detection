// ─── Gesture-controlled actions ─────────────────────────────────────────

type ActionCallback = () => void;

const actionMap: Record<string, ActionCallback> = {};
const cooldowns: Record<string, number> = {};
const COOLDOWN_MS = 2000; // 2 second cooldown between triggers

export function registerGestureAction(gesture: string, callback: ActionCallback) {
    actionMap[gesture] = callback;
}

export function checkGestureAction(gesture: string): boolean {
    const now = Date.now();
    if (actionMap[gesture] && (!cooldowns[gesture] || now - cooldowns[gesture] > COOLDOWN_MS)) {
        cooldowns[gesture] = now;
        actionMap[gesture]();
        return true;
    }
    return false;
}

export function getRegisteredGestures(): string[] {
    return Object.keys(actionMap);
}
