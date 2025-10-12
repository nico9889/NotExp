export function sanitizeFileName(text: string) {
    return text.replace(/[^a-zA-Z0-9 ]+/, '') || "OneNote";
}