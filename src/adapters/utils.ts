export function sanitizeFileName(text: string) {
    return text.replace(/[^a-zA-Z0-9 ]+/, '') || "OneNote";
}

export async function blobToBase64(blob: Blob)  {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string)?.split(',')[1]); // Extract Base64 part
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}