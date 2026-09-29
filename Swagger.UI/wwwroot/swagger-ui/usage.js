(function () {
    "use strict";

    const config = Object.assign({
        openApiUrl: "/swagger/v1/swagger.json",
        codeSampleBaseUrl: "https://api.example.com",
        apiKeyPlaceholder: "YOUR_API_KEY",
        appJwtPlaceholder: "YOUR_APP_JWT"
    }, window.ApiUsageDocumentationConfig || {});

    let documentModel;

    function resolveReference(node) {
        if (!node || !node.$ref || !node.$ref.startsWith("#/")) return node;
        return node.$ref.substring(2).split("/").reduce(function (current, segment) {
            const key = segment.replace(/~1/g, "/").replace(/~0/g, "~");
            return current?.[key];
        }, documentModel);
    }

    function exampleValue(schema, includeOptional, depth, references) {
        schema = resolveReference(schema);
        if (!schema || depth > 7) return null;
        if (schema.example !== undefined) return schema.example;
        if (schema.default !== undefined) return schema.default;
        if (schema.enum?.length) return schema.enum[0];
        if (schema.oneOf?.[0] || schema.anyOf?.[0]) return exampleValue(schema.oneOf?.[0] || schema.anyOf[0], includeOptional, depth + 1, references);
        if (schema.$ref) {
            if (references.has(schema.$ref)) return null;
            references.add(schema.$ref);
            const value = exampleValue(resolveReference(schema), includeOptional, depth + 1, references);
            references.delete(schema.$ref);
            return value;
        }
        if (schema.allOf) {
            return schema.allOf.reduce(function (result, part) {
                const value = exampleValue(part, includeOptional, depth + 1, references);
                return value && typeof value === "object" && !Array.isArray(value) ? Object.assign(result, value) : result;
            }, {});
        }
        if (schema.type === "array" || schema.items) return [exampleValue(schema.items || {}, includeOptional, depth + 1, references)];
        if (schema.type === "object" || schema.properties) {
            const required = new Set(schema.required || []);
            return Object.entries(schema.properties || {}).reduce(function (result, [name, property]) {
                if (includeOptional || required.has(name)) result[name] = exampleValue(property, includeOptional, depth + 1, references);
                return result;
            }, {});
        }
        if (schema.type === "boolean") return true;
        if (schema.type === "integer") return schema.minimum ?? 1;
        if (schema.type === "number") return schema.minimum ?? 1.25;
        if (schema.format === "date-time") return "2026-01-15T12:00:00Z";
        if (schema.format === "email") return "user@example.test";
        return "example";
    }

    function findOperation(operationId) {
        const separator = operationId.indexOf(":");
        if (separator < 1) return null;
        const method = operationId.substring(0, separator).toLowerCase();
        const path = operationId.substring(separator + 1);
        const pathItem = documentModel.paths?.[path];
        const operation = pathItem?.[method];
        return operation ? { method: method.toUpperCase(), path, pathItem, operation } : null;
    }

    function requestExample(endpoint) {
        const parameters = [...(endpoint.pathItem.parameters || []), ...(endpoint.operation.parameters || [])]
            .map(resolveReference).filter(Boolean);
        let url = endpoint.path;
        const query = [];
        const headers = { "api-key": config.apiKeyPlaceholder, "app-jwt": config.appJwtPlaceholder };
        parameters.forEach(function (parameter) {
            const value = parameter.example ?? exampleValue(parameter.schema || { type: "string" }, true, 0, new Set());
            if (parameter.in === "path") url = url.replace(`{${parameter.name}}`, encodeURIComponent(String(value)));
            if (parameter.in === "query") query.push(`${encodeURIComponent(parameter.name)}=${encodeURIComponent(String(value))}`);
            if (parameter.in === "header") headers[parameter.name] = String(value);
        });
        if (query.length) url += `?${query.join("&")}`;
        const requestBody = resolveReference(endpoint.operation.requestBody);
        const content = Object.entries(requestBody?.content || {});
        const json = content.find(([type]) => type.toLowerCase().includes("json"));
        const body = json ? exampleValue(json[1].schema, true, 0, new Set()) : undefined;
        return { url, headers, body };
    }

    function cSharpIdentifier(name) {
        const identifier = name.replace(/[^a-zA-Z0-9]+(.)?/g, (_, character) => character ? character.toUpperCase() : "")
            .replace(/^(.)/, (_, character) => character.toUpperCase());
        return identifier || "Value";
    }

    function cSharpLiteral(value, depth) {
        depth = depth || 0;
        const indent = "    ".repeat(depth);
        const childIndent = "    ".repeat(depth + 1);
        if (value === null) return "null";
        if (typeof value === "boolean") return value ? "true" : "false";
        if (typeof value === "number") return Number.isInteger(value) ? String(value) : `${value}m`;
        if (typeof value === "string") return JSON.stringify(value);
        if (Array.isArray(value)) return value.length ? `new object[] { ${value.map(item => cSharpLiteral(item, depth + 1)).join(", ")} }` : "Array.Empty<object>()";
        if (typeof value === "object") {
            const properties = Object.entries(value).map(([name, item]) => `${childIndent}${cSharpIdentifier(name)} = ${cSharpLiteral(item, depth + 1)}`).join(",\n");
            return `new\n${indent}{\n${properties}\n${indent}}`;
        }
        return "null";
    }

    function codeSamples(endpoint, request) {
        const url = `${config.codeSampleBaseUrl}${request.url}`;
        const body = request.body === undefined ? undefined : JSON.stringify(request.body, null, 2);
        const headers = request.headers;
        const headerLines = Object.entries(headers).map(([name, value]) => `request.Headers.TryAddWithoutValidation(${JSON.stringify(name)}, ${JSON.stringify(value)});`).join("\n");
        const csharpBody = request.body === undefined ? "" : `\nrequest.Content = JsonContent.Create(${cSharpLiteral(request.body)});`;
        const jsHeaders = Object.assign({}, headers, body === undefined ? {} : { "Content-Type": "application/json" });
        const pyHeaders = Object.assign({}, headers, body === undefined ? {} : { "Content-Type": "application/json" });
        const methodName = endpoint.method[0] + endpoint.method.slice(1).toLowerCase();
        return [
            ["cURL", `curl -X ${endpoint.method} ${JSON.stringify(url)} \\\n${Object.entries(headers).map(([name, value]) => `  -H ${JSON.stringify(`${name}: ${value}`)}`).join(" \\\n")}${body === undefined ? "" : ` \\\n  -H "Content-Type: application/json" \\\n  --data ${JSON.stringify(body)}`}`],
            ["C# · HttpClient", `using System.Net.Http;\nusing System.Net.Http.Json;\n\nusing var client = new HttpClient();\nusing var request = new HttpRequestMessage(HttpMethod.${methodName}, ${JSON.stringify(url)});\n${headerLines}${csharpBody}\nusing var response = await client.SendAsync(request);\nresponse.EnsureSuccessStatusCode();`],
            ["JavaScript · fetch", `const response = await fetch(${JSON.stringify(url)}, {\n  method: ${JSON.stringify(endpoint.method)},\n  headers: ${JSON.stringify(jsHeaders, null, 2)}${body === undefined ? "" : `,\n  body: JSON.stringify(${body})`}\n});\n\nif (!response.ok) throw new Error(await response.text());\nconst result = await response.json();`],
            ["Python · requests", `import requests\n\nresponse = requests.request(\n    ${JSON.stringify(endpoint.method)},\n    ${JSON.stringify(url)},\n    headers=${JSON.stringify(pyHeaders, null, 2).replace(/\n/g, "\n    ")}${body === undefined ? "" : `,\n    data=${JSON.stringify(body)}`}\n)\nresponse.raise_for_status()\nresult = response.json()`]
        ];
    }

    function addCodeBlock(parent, title, value) {
        const section = document.createElement("section");
        section.className = "usage-code";
        const header = document.createElement("div");
        header.className = "usage-code-header";
        const label = document.createElement("span");
        label.textContent = title;
        const button = document.createElement("button");
        button.className = "usage-copy";
        button.type = "button";
        button.textContent = "Copy";
        button.addEventListener("click", async function () {
            try {
                await navigator.clipboard.writeText(value);
                button.textContent = "Copied";
                setTimeout(() => button.textContent = "Copy", 1500);
            } catch { button.textContent = "Copy unavailable"; }
        });
        header.append(label, button);
        const pre = document.createElement("pre");
        pre.textContent = value;
        section.append(header, pre);
        parent.append(section);
    }

    function render(endpoint) {
        const request = requestExample(endpoint);
        const title = document.getElementById("page-title");
        const description = document.getElementById("page-description");
        const status = document.getElementById("page-status");
        const documentation = document.getElementById("endpoint-documentation");
        title.textContent = `${endpoint.method} ${endpoint.path}`;
        description.textContent = endpoint.operation.summary || endpoint.operation.description || "API operation";
        status.hidden = true;
        documentation.hidden = false;

        const details = document.getElementById("endpoint-details");
        const facts = document.createElement("section");
        facts.className = "usage-section";
        facts.innerHTML = "<h2>Endpoint details</h2>";
        const list = document.createElement("dl");
        list.className = "usage-facts";
        [["Method", endpoint.method], ["Path", endpoint.path], ["Authentication", "api-key and app-jwt headers"], ["Request body", request.body === undefined ? "None" : "JSON"]].forEach(([name, value]) => {
            const label = document.createElement("dt");
            label.textContent = name;
            const detail = document.createElement("dd");
            detail.textContent = value;
            list.append(label, detail);
        });
        facts.append(list);
        details.replaceChildren(facts);

        const examples = document.getElementById("endpoint-examples");
        examples.replaceChildren();
        const requestSection = document.createElement("section");
        requestSection.className = "usage-section";
        requestSection.innerHTML = "<h2>Request examples</h2>";
        addCodeBlock(requestSection, "Headers", JSON.stringify(request.headers, null, 2));
        if (request.body !== undefined) addCodeBlock(requestSection, "JSON body", JSON.stringify(request.body, null, 2));
        codeSamples(endpoint, request).forEach(([name, value]) => addCodeBlock(requestSection, name, value));
        examples.append(requestSection);
    }

    async function initialize() {
        const operationId = new URLSearchParams(window.location.search).get("endpoint");
        if (!operationId) throw new Error("No endpoint was specified.");
        const response = await fetch(config.openApiUrl);
        if (!response.ok) throw new Error(`OpenAPI request returned ${response.status}.`);
        documentModel = await response.json();
        const endpoint = findOperation(operationId);
        if (!endpoint) throw new Error(`Endpoint '${operationId}' was not found.`);
        render(endpoint);
    }

    initialize().catch(function (error) {
        document.getElementById("page-title").textContent = "Endpoint documentation unavailable";
        document.getElementById("page-status").textContent = error.message;
    });
})();
