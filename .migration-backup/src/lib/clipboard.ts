/**
 * Safe clipboard copy that works across all browsers/contexts.
 * Falls back to execCommand, then to manual selection for older browsers or insecure contexts.
 */
export const safeClipboardWrite = async (text: string): Promise<boolean> => {
  // Method 1: Modern Clipboard API
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }

  // Method 2: execCommand fallback
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);

    // iOS-specific selection
    const range = document.createRange();
    range.selectNodeContents(textarea);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    textarea.setSelectionRange(0, text.length);

    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (ok) return true;
  } catch {
    // fall through
  }

  // Method 3: Use the Share API on mobile as last resort
  try {
    if (navigator.share) {
      await navigator.share({ text });
      return true;
    }
  } catch {
    // fall through
  }

  return false;
};
