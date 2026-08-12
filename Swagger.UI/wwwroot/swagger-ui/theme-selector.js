(function () {
    "use strict";

    // Reusable Swagger UI theme selector. Add or remove entries here and create a
    // matching html[data-api-theme="..."] block in theme-selector.css.
    const themes = [
        { id: "light", label: "Light" },
        { id: "dark", label: "Dark" },
        { id: "ocean", label: "Ocean" },
        { id: "forest", label: "Forest" },
        { id: "sunset", label: "Sunset" },
        { id: "lavender", label: "Lavender" },
        { id: "high-contrast", label: "High Contrast" },
        { id: "government-canada", label: "Government Canada" },
        { id: "arctic", label: "Arctic" },
        { id: "midnight", label: "Midnight" },
        { id: "low-stimulation", label: "Low Stimulation" },
        { id: "deuteranopia", label: "Deuteranopia-friendly" }
    ];
    const storageKey = "swagger-ui-selected-theme";

    function readTheme() {
        try {
            const stored = window.localStorage.getItem(storageKey);
            return themes.some(function (theme) { return theme.id === stored; }) ? stored : "light";
        } catch { return "light"; }
    }

    function applyTheme(themeId, persist) {
        const selected = themes.some(function (theme) { return theme.id === themeId; }) ? themeId : "light";
        const root = document.documentElement;
        root.dataset.apiTheme = selected;
        root.dataset.theme = selected === "dark" ? "dark" : "light";
        root.dataset.searchThemeSource = "configured";
        const usesDarkComponents = ["dark", "ocean", "forest", "high-contrast", "midnight"].includes(selected);
        // Swagger's own dark class handles every built-in component, including
        // dialogs and expanded operations. Dark custom palettes inherit that
        // treatment and then replace its canvas colors through CSS variables.
        root.classList.toggle("dark-mode", usesDarkComponents);
        root.style.colorScheme = usesDarkComponents ? "dark" : "light";
        if (persist) {
            try { window.localStorage.setItem(storageKey, selected); } catch { }
        }
        document.dispatchEvent(new CustomEvent("swagger-theme-changed", { detail: { theme: selected } }));
    }

    function createSelector() {
        if (document.getElementById("swagger-theme-select")) return true;
        const topbar = document.querySelector("#swagger-ui .topbar .topbar-wrapper");
        if (!topbar) return false;

        // The dropdown replaces Swagger's binary lightbulb because it includes
        // both Light and Dark along with the five application palettes.
        topbar.querySelector(".dark-mode-toggle")?.remove();
        const wrapper = document.createElement("div");
        wrapper.className = "swagger-theme-selector";
        const label = document.createElement("label");
        label.htmlFor = "swagger-theme-select";
        label.textContent = "Theme";
        const select = document.createElement("select");
        select.id = "swagger-theme-select";
        select.setAttribute("aria-label", "Swagger UI theme");
        themes.forEach(function (theme) {
            const option = document.createElement("option");
            option.value = theme.id;
            option.textContent = theme.label;
            select.append(option);
        });
        select.value = document.documentElement.dataset.apiTheme || readTheme();
        select.addEventListener("change", function () { applyTheme(select.value, true); });
        wrapper.append(label, select);
        topbar.append(wrapper);
        return true;
    }

    function initialize() {
        applyTheme(readTheme(), false);
        if (createSelector()) return;
        const swagger = document.getElementById("swagger-ui");
        if (!swagger) return;
        const observer = new MutationObserver(function () {
            if (createSelector()) observer.disconnect();
        });
        observer.observe(swagger, { childList: true, subtree: true });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
    else initialize();
})();
