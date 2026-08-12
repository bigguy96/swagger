(function () {
    "use strict";

    // Standalone Swagger UI endpoint search.
    // Configure it before this file loads with window.SwaggerEndpointSearchConfig.
    const config = Object.assign({
        openApiUrl: "/swagger/v1/swagger.json",
        maximumResults: 50
    }, window.SwaggerEndpointSearchConfig || {});
    const methods = new Set(["get", "post", "put", "delete", "patch", "head", "options"]);
    let endpoints = [];
    let searchElement;

    function textElement(tagName, className, text) {
        const element = document.createElement(tagName);
        element.className = className;
        element.textContent = text;
        return element;
    }

    // Creates the accessible search interface once. It is initially hidden until
    // Swagger has rendered the controller groups and placeSearch can position it.
    function createSearch() {
        if (document.querySelector(".swagger-endpoint-search")) return;
        const search = document.createElement("section");
        search.className = "swagger-endpoint-search";
        search.dataset.awaitingPlacement = "true";
        search.setAttribute("role", "search");
        search.innerHTML = `
            <div class="endpoint-search-heading">
                <div>
                    <label for="endpoint-search-input">Search API endpoints</label>
                    <p>Search endpoint paths only. Matching is case-insensitive.</p>
                </div>
                <span class="endpoint-search-shortcut" aria-hidden="true">Press / to search</span>
            </div>
            <div class="endpoint-search-control">
                <span aria-hidden="true">&#128269;</span>
                <input id="endpoint-search-input" type="search" autocomplete="off" spellcheck="false"
                    placeholder="For example: /api/books or /api/orders/{id}">
                <button id="endpoint-search-clear" type="button" hidden>Clear</button>
            </div>
            <p id="endpoint-search-status" role="status" aria-live="polite">Loading endpoint index&hellip;</p>
            <div id="endpoint-search-results" class="endpoint-search-results"></div>`;

        searchElement = search;
        document.body.append(search);
        placeSearch();
        const input = search.querySelector("input");
        input.addEventListener("input", renderResults);
        search.querySelector("#endpoint-search-clear").addEventListener("click", function () {
            input.value = "";
            renderResults();
            input.focus();
        });
        document.addEventListener("keydown", function (event) {
            if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey &&
                !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
                event.preventDefault();
                input.focus();
            } else if (event.key === "Escape" && document.activeElement === input) {
                input.value = "";
                renderResults();
            }
        });
        document.dispatchEvent(new CustomEvent("swagger-search-ready"));
    }

    // Swagger renders asynchronously. Insert the search immediately before the
    // first operation group so it follows the API description and shares its width.
    function placeSearch() {
        if (!searchElement) return;
        const firstGroup = document.querySelector("#swagger-ui .opblock-tag-section");
        if (!firstGroup?.parentElement) return;
        if (searchElement.nextElementSibling !== firstGroup) {
            firstGroup.parentElement.insertBefore(searchElement, firstGroup);
        }
        delete searchElement.dataset.awaitingPlacement;
    }

    // Convert a computed RGB background into a light/dark decision using relative
    // luminance. Transparent colors return null so another page element can be tried.
    function isDarkColor(value) {
        const channels = value?.match(/[\d.]+/g)?.map(Number);
        if (!channels || channels.length < 3 || (channels.length > 3 && channels[3] === 0)) return null;
        const linear = channels.slice(0, 3).map(function (channel) {
            const normalized = channel / 255;
            return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
        });
        const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
        return luminance < 0.35;
    }

    // Keep these custom components aligned with Swagger's visible palette. An
    // explicit config.theme or host-provided data-theme always takes precedence.
    function synchronizeTheme() {
        const configuredTheme = String(config.theme || "").toLowerCase();
        if (configuredTheme === "light" || configuredTheme === "dark") {
            document.documentElement.dataset.theme = configuredTheme;
            document.documentElement.dataset.searchThemeSource = "configured";
            return;
        }

        const root = document.documentElement;
        if (root.dataset.theme && !["detected", "swagger"].includes(root.dataset.searchThemeSource)) return;

        // Swagger UI 5 adds/removes html.dark-mode when its lightbulb button is
        // used. Once that control exists, its class is the authoritative theme.
        if (document.querySelector("#swagger-ui .dark-mode-toggle")) {
            root.dataset.theme = root.classList.contains("dark-mode") ? "dark" : "light";
            root.dataset.searchThemeSource = "swagger";
            return;
        }

        // Older Swagger UI versions may not expose a theme marker, so retain the
        // rendered-color fallback for portability.
        const candidates = [
            document.body,
            document.documentElement,
            document.querySelector("#swagger-ui")
        ].filter(Boolean);
        const detected = candidates
            .map(function (element) { return isDarkColor(window.getComputedStyle(element).backgroundColor); })
            .find(function (value) { return value !== null; });
        const useDarkTheme = detected ?? Boolean(window.matchMedia?.("(prefers-color-scheme: dark)").matches);
        root.dataset.theme = useDarkTheme ? "dark" : "light";
        root.dataset.searchThemeSource = "detected";
    }

    // Search only normalized endpoint paths. Result buttons include descriptive
    // text for context but summaries and tags are intentionally not searchable.
    function renderResults() {
        const input = document.getElementById("endpoint-search-input");
        const clear = document.getElementById("endpoint-search-clear");
        const status = document.getElementById("endpoint-search-status");
        const results = document.getElementById("endpoint-search-results");
        if (!input || !status || !results) return;

        const query = input.value.trim().toLocaleLowerCase();
        const terms = query.split(/\s+/).filter(Boolean);
        const matches = terms.length
            ? endpoints.filter(function (endpoint) { return terms.every(function (term) { return endpoint.searchPath.includes(term); }); })
            : [];
        clear.hidden = terms.length === 0;
        results.replaceChildren();

        if (!terms.length) {
            status.textContent = `Search all ${endpoints.length} endpoint operations.`;
            return;
        }
        if (!matches.length) {
            status.textContent = `No endpoint paths match \u201c${query}\u201d.`;
            return;
        }

        status.textContent = `${matches.length} endpoint${matches.length === 1 ? "" : "s"} match \u201c${query}\u201d.`;
        matches.slice(0, config.maximumResults).forEach(function (endpoint) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "endpoint-search-result";
            button.append(
                textElement("span", `endpoint-method method-${endpoint.method.toLowerCase()}`, endpoint.method),
                textElement("code", "", endpoint.path),
                textElement("span", "endpoint-description", endpoint.summary),
                textElement("span", "endpoint-tag", endpoint.tag)
            );
            button.addEventListener("click", function () { revealEndpoint(endpoint); });
            results.append(button);
        });
    }

    // Open the matching Swagger tag, wait for its operations to render, and then
    // scroll the selected operation into view.
    function revealEndpoint(endpoint) {
        const input = document.getElementById("endpoint-search-input");
        input.value = "";
        renderResults();
        const section = Array.from(document.querySelectorAll(".swagger-ui .opblock-tag-section")).find(function (candidate) {
            return candidate.querySelector(".opblock-tag")?.textContent.trim().startsWith(endpoint.tag);
        });
        if (!section) return;
        if (!section.querySelector(".opblock")) section.querySelector(".opblock-tag")?.click();

        function findOperation(attempt) {
            const operation = Array.from(section.querySelectorAll(".opblock")).find(function (candidate) {
                return candidate.querySelector(".opblock-summary-method")?.textContent.trim() === endpoint.method &&
                    candidate.querySelector(".opblock-summary-path")?.textContent.trim() === endpoint.path;
            });
            if (!operation && attempt < 20) return window.setTimeout(function () { findOperation(attempt + 1); }, 50);
            if (!operation) return section.scrollIntoView({ behavior: "smooth" });
            operation.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        findOperation(0);
    }

    // Load the OpenAPI document, build the endpoint index, and watch Swagger for
    // React-driven DOM updates that may require repositioning the search panel.
    async function initialize() {
        synchronizeTheme();
        createSearch();
        const swagger = document.getElementById("swagger-ui");
        if (swagger) new MutationObserver(function () {
            placeSearch();
            synchronizeTheme();
        }).observe(swagger, { childList: true, subtree: true });

        // Some browser themes apply their page colors after Swagger initializes.
        // Watch only theme-related attributes; data-theme itself is intentionally
        // excluded so updating it cannot trigger an observer loop.
        const themeObserver = new MutationObserver(synchronizeTheme);
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
        themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class", "style"] });
        window.requestAnimationFrame(synchronizeTheme);
        window.addEventListener("load", synchronizeTheme, { once: true });
        try {
            const response = await window.fetch(config.openApiUrl);
            const specification = await response.json();
            endpoints = [];
            Object.entries(specification.paths || {}).forEach(function ([path, pathItem]) {
                Object.entries(pathItem || {}).forEach(function ([method, operation]) {
                    if (!methods.has(method.toLowerCase())) return;
                    endpoints.push({
                        method: method.toUpperCase(),
                        path,
                        searchPath: path.toLocaleLowerCase(),
                        summary: operation.summary || operation.description || "API operation",
                        tag: operation.tags?.[0] || "Other"
                    });
                });
            });
            renderResults();
            placeSearch();
        } catch (error) {
            document.getElementById("endpoint-search-status").textContent = "Endpoint search is unavailable.";
            console.warn("Endpoint search could not be initialized.", error);
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
    else initialize();
})();
