/** Легкий тактильний відгук у браузерах, які підтримують вібрацію. */
export function haptic(kind = "tick") {
  try {
    if (kind !== "tick" && navigator.vibrate) {
      navigator.vibrate(kind === "success" ? [30, 40, 60] : 20);
    }
  } catch { /* вібрація недоступна або заблокована */ }
}
