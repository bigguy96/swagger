(function () {
    "use strict";

    // Standalone, documentation-only scenario guidance for Swagger UI.
    // Override these defaults before loading this file with MockScenarioPanelConfig.
    const defaultConfig = {
        openApiUrl: "/swagger/v1/swagger.json",
        storageKey: "api-explorer-scenario-buttons-visible",
        initiallyVisible: true,
        maximumScenariosPerOperation: 8,
        minimumBodyPropertyCount: 5,
        codeSampleBaseUrl: "https://api.example.com",
        apiKeyPlaceholder: "YOUR_API_KEY",
        appJwtPlaceholder: "YOUR_APP_JWT",
        usageQueryParameter: "endpoint",
        usageDocumentationUrl: "/swagger-ui/usage.html"
    };

    const config = Object.assign({}, defaultConfig, window.MockScenarioPanelConfig || {});
    const httpMethods = new Set(["get", "post", "put", "delete", "patch", "head", "options"]);
    let documentModel;
    let operationIndex = new Map();
    let scanScheduled = false;

    // OpenAPI lookup helpers ---------------------------------------------------

    // Build the stable key used to associate an OpenAPI operation with its Swagger DOM node.
    function operationKey(method, path) {
        return `${method.toUpperCase()}:${path.trim()}`;
    }

    // Resolve local OpenAPI references such as #/components/schemas/Book.
    function resolveReference(node) {
        if (!node || !node.$ref || !node.$ref.startsWith("#/")) {
            return node;
        }

        return node.$ref.substring(2).split("/").reduce(function (current, segment) {
            const key = segment.replace(/~1/g, "/").replace(/~0/g, "~");
            return current?.[key];
        }, documentModel);
    }

    // Collect required and optional properties from an object schema, including allOf parts.
    function collectSchemaProperties(schema, requiredNames, optionalNames, prefix, visited) {
        schema = resolveReference(schema);
        if (!schema || visited.has(schema)) {
            return;
        }

        visited.add(schema);
        (schema.allOf || []).forEach(function (part) {
            collectSchemaProperties(part, requiredNames, optionalNames, prefix, visited);
        });

        const required = new Set(schema.required || []);
        Object.keys(schema.properties || {}).forEach(function (name) {
            const label = `${prefix}.${name}`;
            (required.has(name) ? requiredNames : optionalNames).push(label);
        });
    }

    // Summarize parameters and request-body fields for display in a scenario card.
    function describeInputs(pathItem, operation) {
        const required = [];
        const optional = [];
        const constraints = [];
        const combinedParameters = [...(pathItem.parameters || []), ...(operation.parameters || [])];

        combinedParameters.forEach(function (parameterNode) {
            const parameter = resolveReference(parameterNode);
            if (!parameter) {
                return;
            }

            const label = `${parameter.in}: ${parameter.name}`;
            (parameter.required ? required : optional).push(label);
            const schema = resolveReference(parameter.schema) || {};
            if (schema.enum || schema.format || schema.pattern || schema.minimum !== undefined ||
                schema.maximum !== undefined || schema.minLength !== undefined || schema.maxLength !== undefined) {
                constraints.push(label);
            }
        });

        const requestBody = resolveReference(operation.requestBody);
        if (requestBody) {
            (requestBody.required ? required : optional).push("request body");
            const mediaType = requestBody.content?.["application/json"] || Object.values(requestBody.content || {})[0];
            collectSchemaProperties(mediaType?.schema, required, optional, "body", new Set());
        }

        return {
            required: [...new Set(required)],
            optional: [...new Set(optional)],
            constraints: [...new Set(constraints)]
        };
    }

    // Example generation ------------------------------------------------------
    // Recursively converts an OpenAPI schema into deterministic example data.
    // includeOptional=false produces a minimal object containing required fields.
    // A recursion guard prevents circular schema references from producing infinite data.
    function exampleValue(schemaNode, includeOptional, depth, references) {
        if (!schemaNode || depth > 7) return null;
        if (schemaNode.example !== undefined) return schemaNode.example;
        if (schemaNode.default !== undefined) return schemaNode.default;
        if (Array.isArray(schemaNode.enum) && schemaNode.enum.length) return schemaNode.enum[0];

        if (schemaNode.$ref) {
            if (references.has(schemaNode.$ref)) return null;
            references.add(schemaNode.$ref);
            const result = exampleValue(resolveReference(schemaNode), includeOptional, depth + 1, references);
            references.delete(schemaNode.$ref);
            return result;
        }

        if (Array.isArray(schemaNode.allOf)) {
            return schemaNode.allOf.reduce(function (combined, part) {
                const value = exampleValue(part, includeOptional, depth + 1, references);
                return value && typeof value === "object" && !Array.isArray(value)
                    ? Object.assign(combined, value)
                    : combined;
            }, {});
        }

        const alternative = schemaNode.oneOf?.[0] || schemaNode.anyOf?.[0];
        if (alternative) return exampleValue(alternative, includeOptional, depth + 1, references);

        if (schemaNode.type === "array" || schemaNode.items) {
            return [exampleValue(schemaNode.items || {}, includeOptional, depth + 1, references)];
        }

        if (schemaNode.type === "object" || schemaNode.properties) {
            const required = new Set(schemaNode.required || []);
            return Object.entries(schemaNode.properties || {}).reduce(function (result, [name, property]) {
                if (includeOptional || required.has(name)) {
                    result[name] = exampleValue(property, includeOptional, depth + 1, references);
                }
                return result;
            }, {});
        }

        switch (schemaNode.type) {
            case "boolean": return true;
            case "integer": return schemaNode.minimum ?? 1;
            case "number": return schemaNode.minimum ?? 1.25;
            case "string":
                switch (schemaNode.format) {
                    case "uuid": return "11111111-1111-1111-1111-111111111111";
                    case "date": return "2026-01-15";
                    case "date-time": return "2026-01-15T12:00:00Z";
                    case "email": return "user@example.test";
                    case "uri": return "https://example.test/resource";
                    case "byte": return "ZXhhbXBsZQ==";
                    default: return "example";
                }
            default: return "example";
        }
    }

    // Generate a representative value for a parameter schema.
    function parameterExample(parameter) {
        if (parameter.example !== undefined) return parameter.example;
        return exampleValue(resolveReference(parameter.schema) || { type: "string" }, true, 0, new Set());
    }

    // Identify empty objects and arrays so required request bodies can be represented usefully.
    function isStructurallyEmpty(value) {
        if (value === null || value === undefined) return true;
        if (Array.isArray(value)) return value.length === 0 || value.every(isStructurallyEmpty);
        if (typeof value === "object") return Object.keys(value).length === 0;
        return false;
    }

    // Keep generated examples compact while retaining a representative set of fields.
    function limitRepresentativeProperties(value, limit, depth) {
        if (depth > 6) return value;
        if (Array.isArray(value)) {
            return value.slice(0, 1).map(function (item) {
                return limitRepresentativeProperties(item, limit, depth + 1);
            });
        }
        if (!value || typeof value !== "object") return value;

        return Object.entries(value).slice(0, limit).reduce(function (result, [name, propertyValue]) {
            result[name] = limitRepresentativeProperties(propertyValue, limit, depth + 1);
            return result;
        }, {});
    }

    // Build a URL, headers, and JSON body for a minimum or complete request example.
    function buildRequestExample(path, pathItem, operation, includeOptional) {
        const parameters = [...(pathItem.parameters || []), ...(operation.parameters || [])]
            .map(resolveReference)
            .filter(Boolean);
        let exampleUrl = path;
        const query = [];
        const headers = {};

        parameters.forEach(function (parameter) {
            if (!includeOptional && !parameter.required) return;
            const value = parameterExample(parameter);
            if (parameter.in === "path") {
                exampleUrl = exampleUrl.replace(`{${parameter.name}}`, encodeURIComponent(String(value)));
            } else if (parameter.in === "query") {
                query.push(`${encodeURIComponent(parameter.name)}=${encodeURIComponent(String(value))}`);
            } else if (parameter.in === "header") {
                headers[parameter.name] = String(value);
            }
        });

        if (query.length) exampleUrl += `${exampleUrl.includes("?") ? "&" : "?"}${query.join("&")}`;

        const requestBody = resolveReference(operation.requestBody);
        const contentEntries = Object.entries(requestBody?.content || {});
        const jsonEntry = contentEntries.find(function ([mediaType]) { return mediaType.toLowerCase() === "application/json"; })
            || contentEntries.find(function ([mediaType]) { return mediaType.toLowerCase().includes("json"); });
        const candidateBody = jsonEntry
            ? exampleValue(jsonEntry[1]?.schema, includeOptional, 0, new Set())
            : undefined;
        let body = jsonEntry && (includeOptional || requestBody.required || !isStructurallyEmpty(candidateBody))
            ? candidateBody
            : undefined;
        let bodyIsRepresentative = false;

        if (!includeOptional && requestBody?.required && jsonEntry && isStructurallyEmpty(body)) {
            const completeBody = exampleValue(jsonEntry[1]?.schema, true, 0, new Set());
            if (!isStructurallyEmpty(completeBody)) {
                body = limitRepresentativeProperties(completeBody, config.minimumBodyPropertyCount, 0);
                bodyIsRepresentative = true;
            }
        }

        return {
            url: exampleUrl,
            headers: Object.assign({
                "api-key": config.apiKeyPlaceholder,
                "app-jwt": config.appJwtPlaceholder
            }, headers),
            body: body,
            mediaType: jsonEntry?.[0],
            bodyIsRepresentative: bodyIsRepresentative,
            bodyIsMinimal: !includeOptional && body !== undefined && !bodyIsRepresentative
        };
    }

    // Scenario definitions ----------------------------------------------------
    // Derive useful success, validation, security, and resource-state scenarios
    // from the contract without changing how the API itself responds.
    // Select the first documented response status from a preferred list.
    function firstStatus(responses, candidates) {
        return candidates.find(function (status) { return responses?.[status]; });
    }

    // Create the normalized data object used to render a scenario card.
    function makeScenario(id, category, title, purpose, expectedStatus, inputs, guidance) {
        return { id, category, title, purpose, expectedStatus, inputs, guidance };
    }

    // Derive scenarios from documented inputs, responses, constraints, and lifecycle metadata.
    function buildScenarios(path, pathItem, operation) {
        const inputs = describeInputs(pathItem, operation);
        const responses = operation.responses || {};
        const successStatus = firstStatus(responses, ["200", "201", "202", "204"]) || "2xx";
        const scenarios = [];

        scenarios.push(makeScenario(
            "minimum-valid", "Success", "Minimum valid request",
            "Submit only the inputs required by the contract.", successStatus, inputs,
            inputs.required.length ? "Provide every required input and omit optional inputs." : "This operation does not declare required inputs."
        ));

        if (inputs.optional.length) {
            scenarios.push(makeScenario(
                "complete-request", "Success", "Complete request",
                "Submit required inputs together with all documented optional inputs.", successStatus, inputs,
                "Review how optional values affect filtering, selection, or returned details."
            ));
        }

        if (inputs.required.length) {
            const hasNonPathInput = inputs.required.some(function (name) { return !name.startsWith("path:"); });
            scenarios.push(makeScenario(
                "required-input", "Validation", hasNonPathInput ? "Missing required input" : "Invalid path value",
                hasNonPathInput ? "Omit one required query, header, or body input." : "Use a malformed or unsupported value for a required path parameter.",
                firstStatus(responses, ["400", "422", "404"]) || "400", inputs,
                "Confirm that the client identifies the affected input and presents actionable guidance."
            ));
        }

        if (responses["400"] || responses["422"] || inputs.constraints.length) {
            scenarios.push(makeScenario(
                "invalid-input", "Validation", "Invalid input value",
                "Use a value that violates a documented format, enumeration, length, range, or pattern.",
                firstStatus(responses, ["400", "422"]) || "400", inputs,
                inputs.constraints.length ? `Constrained inputs: ${inputs.constraints.join(", ")}.` : "Review the operation schema for permitted values and formats."
            ));
        }

        if (responses["401"]) {
            scenarios.push(makeScenario(
                "unauthenticated", "Security", "Missing or invalid credentials",
                "Call the operation without the required API key or token, or use an invalid credential.", "401", inputs,
                "Confirm that credentials are never included in logs or user-facing error details."
            ));
        }

        if (responses["403"]) {
            scenarios.push(makeScenario(
                "forbidden", "Security", "Insufficient permission",
                "Use valid credentials that do not grant access to this operation or resource.", "403", inputs,
                "Distinguish an authenticated-but-forbidden result from an unauthenticated request."
            ));
        }

        if (responses["404"]) {
            scenarios.push(makeScenario(
                "not-found", "Resource state", "Resource not found",
                "Use a well-formed identifier for a resource that does not exist or is not visible.", "404", inputs,
                "Verify that the client handles an absent resource without treating it as a server failure."
            ));
        }

        if (operation.deprecated) {
            scenarios.push(makeScenario(
                "deprecated", "Lifecycle", "Deprecated operation",
                "Review the replacement operation and migration expectations before adding new usage.", successStatus, inputs,
                "New integrations should prefer the documented replacement when one is available."
            ));
        }

        const minimumExample = buildRequestExample(path, pathItem, operation, false);
        const completeExample = buildRequestExample(path, pathItem, operation, true);
        scenarios.forEach(function (item) {
            item.example = item.id === "complete-request" ? completeExample : minimumExample;
        });
        return scenarios.slice(0, config.maximumScenariosPerOperation);
    }

    function indexOperations() {
        operationIndex = new Map();
        Object.entries(documentModel.paths || {}).forEach(function ([path, pathItem]) {
            Object.entries(pathItem || {}).forEach(function ([method, operation]) {
                if (httpMethods.has(method.toLowerCase())) {
                    operationIndex.set(operationKey(method, path), {
                        method: method.toUpperCase(), path, scenarios: buildScenarios(path, pathItem, operation)
                    });
                }
            });
        });
    }

    // DOM and clipboard helpers -----------------------------------------------

    // Create a text-safe DOM element for the custom panel.
    function textElement(tagName, className, text) {
        const element = document.createElement(tagName);
        element.className = className;
        element.textContent = text;
        return element;
    }

    // Format optional arrays for the scenario facts list.
    function valueOrNone(values) {
        return values.length ? values.join(", ") : "None declared";
    }

    // Copy code and examples using the Clipboard API with a legacy fallback.
    async function copyToClipboard(value) {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);
            return;
        }

        const textArea = document.createElement("textarea");
        textArea.value = value;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.append(textArea);
        textArea.select();
        const copied = document.execCommand("copy");
        textArea.remove();
        if (!copied) throw new Error("Clipboard copy was rejected.");
    }

    // Render a labeled, copyable code or data example.
    function createExampleBlock(label, value, language) {
        const block = document.createElement("section");
        block.className = "scenario-example";
        const header = document.createElement("div");
        header.append(textElement("strong", "", label));
        const copy = textElement("button", "scenario-copy", "Copy");
        copy.type = "button";
        copy.addEventListener("click", async function () {
            try {
                await copyToClipboard(value);
                copy.textContent = "Copied";
                window.setTimeout(function () { copy.textContent = "Copy"; }, 1500);
            } catch {
                copy.textContent = "Copy unavailable";
            }
        });
        header.append(copy);
        const pre = document.createElement("pre");
        const code = textElement("code", language ? `language-${language}` : "", value);
        pre.append(code);
        block.append(header, pre);
        return block;
    }

    // Convert an OpenAPI example property name into a readable C# anonymous-object name.
    function toCSharpIdentifier(name) {
        const identifier = name
            .replace(/[^a-zA-Z0-9]+(.)?/g, function (_, character) { return character ? character.toUpperCase() : ""; })
            .replace(/^(.)/, function (_, character) { return character.toUpperCase(); });
        const reservedWords = new Set([
            "abstract", "as", "base", "bool", "break", "byte", "case", "catch", "char", "checked",
            "class", "const", "continue", "decimal", "default", "delegate", "do", "double", "else",
            "enum", "event", "explicit", "extern", "false", "finally", "fixed", "float", "for",
            "foreach", "goto", "if", "implicit", "in", "int", "interface", "internal", "is", "lock",
            "long", "namespace", "new", "null", "object", "operator", "out", "override", "params",
            "private", "protected", "public", "readonly", "ref", "return", "sbyte", "sealed", "short",
            "sizeof", "stackalloc", "static", "string", "struct", "switch", "this", "throw", "true",
            "try", "typeof", "uint", "ulong", "unchecked", "unsafe", "ushort", "using", "virtual",
            "void", "volatile", "while"
        ]);
        return reservedWords.has(identifier) ? `@${identifier}` : identifier || "Value";
    }

    // Convert generated JavaScript values into valid C# literals for JsonContent.Create.
    function toCSharpLiteral(value, depth) {
        depth = depth || 0;
        const indentation = "    ".repeat(depth);
        const childIndentation = "    ".repeat(depth + 1);

        if (value === null) return "null";
        if (typeof value === "boolean") return value ? "true" : "false";
        if (typeof value === "number") return Number.isInteger(value) ? String(value) : `${value}m`;
        if (typeof value === "string") return JSON.stringify(value);

        if (Array.isArray(value)) {
            const items = value.map(item => `${childIndentation}${toCSharpLiteral(item, depth + 1)}`).join(",\n");
            return items ? `new object[]\n${indentation}{\n${items}\n${indentation}}` : "Array.Empty<object>()";
        }

        if (typeof value === "object") {
            const properties = Object.entries(value)
                .map(([name, item]) => `${childIndentation}${toCSharpIdentifier(name)} = ${toCSharpLiteral(item, depth + 1)}`)
                .join(",\n");
            return `new\n${indentation}{\n${properties}\n${indentation}}`;
        }

        return "null";
    }

    // Generate copyable examples for common client technologies from one request model.
    function createCodeSamples(example, method) {
        const url = `${config.codeSampleBaseUrl}${example.url}`;
        const headers = example.headers || {};
        const body = example.body === undefined ? undefined : JSON.stringify(example.body, null, 2);
        const headerEntries = Object.entries(headers);
        const curlHeaders = headerEntries.map(function ([name, value]) {
            return `  -H ${JSON.stringify(`${name}: ${value}`)}`;
        }).join(" \\\n");
        const curlBody = body === undefined ? "" : ` \\\n  -H "Content-Type: application/json" \\\n  --data ${JSON.stringify(body)}`;
        const csharpHeaders = headerEntries.map(function ([name, value]) {
            return `request.Headers.TryAddWithoutValidation(${JSON.stringify(name)}, ${JSON.stringify(value)});`;
        }).join("\n");
        const csharpBody = example.body === undefined ? "" : `\nrequest.Content = JsonContent.Create(${toCSharpLiteral(example.body)});`;
        const javascriptHeaders = Object.assign({}, headers, body === undefined ? {} : { "Content-Type": "application/json" });
        const pythonHeaders = Object.assign({}, headers, body === undefined ? {} : { "Content-Type": "application/json" });
        const javascriptBody = body === undefined ? "" : `\n  body: JSON.stringify(${body}),`;
        const pythonBody = body === undefined ? "" : `,\n    data=${JSON.stringify(body)}`;

        return [
            ["cURL", `curl -X ${method} ${JSON.stringify(url)} \\\n${curlHeaders}${curlBody}`, "bash"],
            ["C# · HttpClient", `using System.Net.Http;\nusing System.Net.Http.Json;\n\nusing var client = new HttpClient();\nusing var request = new HttpRequestMessage(HttpMethod.${method[0] + method.slice(1).toLowerCase()}, ${JSON.stringify(url)});\n${csharpHeaders}${csharpBody}\nusing var response = await client.SendAsync(request);\nresponse.EnsureSuccessStatusCode();`, "csharp"],
            ["JavaScript · fetch", `const response = await fetch(${JSON.stringify(url)}, {\n  method: ${JSON.stringify(method)},\n  headers: ${JSON.stringify(javascriptHeaders, null, 2)}${javascriptBody}\n});\n\nif (!response.ok) throw new Error(await response.text());\nconst result = await response.json();`, "javascript"],
            ["Python · requests", `import requests\n\nresponse = requests.request(\n    ${JSON.stringify(method)},\n    ${JSON.stringify(url)},\n    headers=${JSON.stringify(pythonHeaders, null, 2).replace(/\n/g, "\n    ")}${pythonBody}\n)\nresponse.raise_for_status()\nresult = response.json()`, "python"]
        ];
    }

    // Render one expandable scenario, including inputs, request data, and code samples.
    function createScenarioCard(definition, method) {
        const details = document.createElement("details");
        details.className = "scenario-card";
        const summary = document.createElement("summary");
        summary.append(
            textElement("span", `scenario-category category-${definition.category.toLowerCase().replace(/\s+/g, "-")}`, definition.category),
            textElement("span", "scenario-title", definition.title),
            textElement("span", "scenario-status", definition.expectedStatus)
        );

        const content = document.createElement("div");
        content.className = "scenario-card-content";
        content.append(textElement("p", "scenario-purpose", definition.purpose));
        const facts = document.createElement("dl");
        [
            ["Required", valueOrNone(definition.inputs.required)],
            ["Optional", valueOrNone(definition.inputs.optional)],
            ["Expected response", definition.expectedStatus],
            ["Guidance", definition.guidance]
        ].forEach(function ([label, value]) {
            facts.append(textElement("dt", "", label), textElement("dd", "", value));
        });
        content.append(facts);

        if (definition.example?.url) {
            content.append(createExampleBlock("Example URL", definition.example.url, "http"));
        }
        if (definition.example?.headers) {
            content.append(createExampleBlock("Example headers", JSON.stringify(definition.example.headers, null, 2), "json"));
        }
        if (definition.example?.body !== undefined) {
            const prefix = definition.example.bodyIsRepresentative
                ? "Representative JSON body"
                : definition.example.bodyIsMinimal ? "Minimal JSON body" : "Example JSON body";
            const label = definition.example.mediaType ? `${prefix} · ${definition.example.mediaType}` : prefix;
            content.append(createExampleBlock(label, JSON.stringify(definition.example.body, null, 2), "json"));
        }
        if (definition.example) {
            content.append(textElement("h4", "scenario-code-samples-heading", "Code samples"));
            createCodeSamples(definition.example, method).forEach(function ([label, value, language]) {
                content.append(createExampleBlock(label, value, language));
            });
        }
        details.append(summary, content);
        return details;
    }

    // Create a safe new-tab link to the dedicated usage page for this operation.
    function createUsageLink(definition) {
        const link = textElement("a", "scenario-usage-link", "Usage and code examples ↗");
        const url = new URL(config.usageDocumentationUrl, window.location.origin);
        url.searchParams.set(config.usageQueryParameter, operationKey(definition.method, definition.path));
        link.href = url.toString();
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.title = "Open usage guidance and code examples in a new tab";
        return link;
    }

    // Create the operation-level panel and its close control.
    function createPanel(definition) {
        const panel = document.createElement("section");
        panel.className = "scenario-panel";
        panel.hidden = true;
        panel.setAttribute("aria-label", `Scenarios for ${definition.method} ${definition.path}`);
        const header = document.createElement("div");
        header.className = "scenario-panel-header";
        const heading = document.createElement("div");
        heading.append(textElement("strong", "", "Test scenarios"), textElement("p", "", "Documentation only — these scenarios do not change API behaviour."));
        const close = textElement("button", "scenario-panel-close", "Close");
        close.type = "button";
        header.append(heading, close);
        const list = document.createElement("div");
        list.className = "scenario-list";
        definition.scenarios.forEach(function (item) { list.append(createScenarioCard(item, definition.method)); });
        panel.append(header, list);
        return { panel, close };
    }

    // Attach a scenario button and panel to a rendered Swagger operation. The
    // data attribute prevents duplicate controls during Swagger re-renders.
    function enhanceOperation(opblock) {
        if (opblock.dataset.scenariosEnhanced === "true") return;
        const method = opblock.querySelector(".opblock-summary-method")?.textContent.trim();
        const path = opblock.querySelector(".opblock-summary-path")?.textContent.trim();
        const definition = method && path ? operationIndex.get(operationKey(method, path)) : null;
        const summary = opblock.querySelector(".opblock-summary");
        if (!definition || !definition.scenarios.length || !summary) return;

        opblock.dataset.scenariosEnhanced = "true";
        const elements = createPanel(definition);
        const button = textElement("button", "scenario-toggle", `Scenarios ${definition.scenarios.length}`);
        button.type = "button";
        button.setAttribute("aria-expanded", "false");
        const panelId = `scenario-panel-${Math.random().toString(36).slice(2)}`;
        elements.panel.id = panelId;
        button.setAttribute("aria-controls", panelId);

        function setOpen(open) {
            elements.panel.hidden = !open;
            button.setAttribute("aria-expanded", String(open));
            button.textContent = open ? "Hide scenarios" : `Scenarios ${definition.scenarios.length}`;
        }

        const requestedOperation = new URLSearchParams(window.location.search).get(config.usageQueryParameter);
        const shouldOpenFromLink = requestedOperation === operationKey(definition.method, definition.path);

        button.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(elements.panel.hidden);
        });
        elements.close.addEventListener("click", function () { setOpen(false); button.focus(); });
        const authorization = summary.querySelector(".authorization__btn");
        const insertionPoint = authorization?.parentElement === summary ? authorization : summary.lastElementChild;
        summary.insertBefore(createUsageLink(definition), insertionPoint);
        summary.insertBefore(button, insertionPoint);
        summary.insertAdjacentElement("afterend", elements.panel);
        if (shouldOpenFromLink) {
            setOpen(true);
            elements.panel.querySelector(".scenario-card")?.setAttribute("open", "");
        }
    }

    function scanOperations() {
        document.querySelectorAll(".swagger-ui .opblock").forEach(enhanceOperation);
    }

    // Swagger builds and replaces operation markup asynchronously. Batch mutation
    // events into a single animation-frame scan to avoid unnecessary DOM work.
    function scheduleScan() {
        if (scanScheduled) return;
        scanScheduled = true;
        window.requestAnimationFrame(function () {
            createGlobalVisibilityControl();
            scanOperations();
            scanScheduled = false;
        });
    }

    // Global visibility preference -------------------------------------------
    // Persist whether scenario buttons are shown, while leaving operation panels
    // collapsed until an individual user chooses to open one.
    function readVisibilityPreference() {
        try {
            const stored = window.localStorage.getItem(config.storageKey);
            return stored === null ? config.initiallyVisible : stored === "true";
        } catch { return config.initiallyVisible; }
    }

    function createGlobalVisibilityControl() {
        const heading = document.querySelector(".endpoint-search-heading");
        if (!heading || document.getElementById("scenario-visibility-toggle")) return;
        const button = textElement("button", "scenario-visibility-toggle", "");
        button.id = "scenario-visibility-toggle";
        button.type = "button";

        function applyVisibility(visible, persist) {
            document.body.classList.toggle("scenario-buttons-hidden", !visible);
            button.textContent = visible ? "Hide scenario buttons" : "Show scenario buttons";
            button.setAttribute("aria-pressed", String(visible));
            if (persist) {
                try { window.localStorage.setItem(config.storageKey, String(visible)); } catch { }
            }
        }

        applyVisibility(readVisibilityPreference(), false);
        button.addEventListener("click", function () {
            applyVisibility(document.body.classList.contains("scenario-buttons-hidden"), true);
        });
        heading.append(button);
    }

    // Fetch the contract, index every operation, enhance existing markup, and
    // continue enhancing operation blocks that Swagger renders later.
    async function initialize() {
        try {
            const response = await window.fetch(config.openApiUrl);
            if (!response.ok) throw new Error(`OpenAPI request returned ${response.status}`);
            documentModel = await response.json();
            indexOperations();
            createGlobalVisibilityControl();
            scanOperations();
            const swagger = document.getElementById("swagger-ui");
            if (swagger) new MutationObserver(scheduleScan).observe(swagger, { childList: true, subtree: true });
        } catch (error) {
            console.warn("Scenario guidance could not be initialized.", error);
        }
    }

    document.addEventListener("swagger-search-ready", createGlobalVisibilityControl);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
    else initialize();
})();
