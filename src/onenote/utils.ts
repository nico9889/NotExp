/* Tries to read the notebook name, otherwise it returns the title of the current browser page */
export function getTitle() {
    const pages = document.getElementById("OreoPageColumn") as HTMLDivElement | null;
    if (!pages) {
        return document.title;
    }
    const page = pages?.querySelector("div.active[title]") as HTMLDivElement | null;
    if (!page) {
        return document.title;
    }
    return page.innerText;
}

export function getZoomLevel() {
    const origin = document.getElementsByClassName("PageContentOrigin")[0];
    if (!origin) {
        return 1.0;
    }
    const style = origin.getAttribute("style");
    if (!style) {
        return 1.0;
    }
    const matches = style.match("scale\\(([0-9]+\\.?[0-9]*)\\)");
    if (!matches) {
        return 1.0;
    }
    return Number.parseFloat(matches[1] ?? "1.0");
}