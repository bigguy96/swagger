# Reusable Swagger scenario guidance

This module adds documentation-only scenario guidance to Swagger UI. It does not change API responses, generate mock data, intercept requests, or require controller changes.

## User experience

- Each rendered operation receives a `Scenarios n` button.
- Scenario content remains hidden until the button is selected.
- Each scenario is a collapsed disclosure containing purpose, required inputs, optional inputs, expected response, and guidance.
- Scenarios include a relative example URL and, when the operation accepts JSON, a schema-derived example body with copy controls.
- A global button beside endpoint search hides or restores all scenario buttons.
- The visibility preference is retained in browser storage.
- Light and dark themes are included.

## Install in another application

Copy these standalone assets:

```text
wwwroot/swagger-ui/
├── scenario-panel.css
└── scenario-panel.js
```

Load them after the standard Swagger UI assets:

```csharp
app.UseStaticFiles();

app.UseSwaggerUI(options =>
{
    options.InjectStylesheet("/swagger-ui/scenario-panel.css");
    options.InjectJavascript("/swagger-ui/scenario-panel.js");
});
```

## Configuration

Defaults:

```javascript
{
    openApiUrl: "/swagger/v1/swagger.json",
    storageKey: "api-explorer-scenario-buttons-visible",
    initiallyVisible: true,
    maximumScenariosPerOperation: 8,
    minimumBodyPropertyCount: 5
}
```

Override them before `scenario-panel.js` executes:

```javascript
window.MockScenarioPanelConfig = {
    openApiUrl: "/openapi/v1.json",
    initiallyVisible: false,
    maximumScenariosPerOperation: 6
};
```

If the target application does not contain `.endpoint-search-heading`, operation scenario buttons still work. Only the global visibility control is omitted.

## How scenarios are derived

The module downloads OpenAPI and indexes operations by HTTP method and exact path. It inspects:

- path-level and operation-level parameters;
- required query, header, path, and cookie parameters;
- required request bodies and JSON properties;
- optional parameters and JSON properties;
- enum, format, pattern, range, and length constraints;
- documented success, `400`, `401`, `403`, `404`, and `422` responses;
- the OpenAPI `deprecated` flag.

Derived guidance can include minimum valid request, complete request, missing required input, invalid input, missing credentials, insufficient permission, resource not found, and deprecated-operation scenarios.

The expected status comes from documented responses whenever possible. The UI presents guidance; it does not claim to execute or simulate the scenario.

## Request examples

The module creates portable request examples directly from the operation contract:

- path placeholders are replaced with schema-compatible example values;
- required query parameters are appended to minimum request URLs;
- optional query parameters are added to complete request URLs;
- documented header inputs are shown separately;
- POST, PUT, and PATCH operations display a formatted JSON body when a JSON-compatible request media type is declared;
- when a request body is required but all of its properties are optional, the minimum scenario displays a compact representative subset instead of an unhelpful `{}` or `[{}]`;
- schema examples, defaults, enums, formats, required properties, arrays, objects, composition, and local `$ref` references are considered.

`minimumBodyPropertyCount` controls how many representative properties are included at each object level. Examples use relative URLs so the module can be copied between environments. They illustrate the documented request structure; they do not execute the request or guarantee a particular business outcome. A representative property is optional unless it is separately listed under Required.

## Portability boundaries

The generator is independent from controllers and response code. Its Swagger UI integration uses these rendered classes:

```text
.opblock
.opblock-summary
.opblock-summary-method
.opblock-summary-path
.authorization__btn
```

After upgrading Swagger UI, verify those classes remain available. OpenAPI analysis itself is independent of the rendered DOM.

## Accessibility

- Controls are native buttons.
- Toggles expose `aria-expanded`, `aria-controls`, and `aria-pressed`.
- Scenario cards use native `details` and `summary`.
- Closing a panel returns focus to its button.
- Focus has a high-contrast outline.
- Categories are identified with text, not colour alone.

## Adding curated scenarios

Automatic derivation provides baseline guidance. Business-specific cases can be stored in operation-level `x-scenarios` and merged in `buildScenarios`:

```json
{
  "x-scenarios": [
    {
      "id": "duplicate-registration",
      "category": "Resource state",
      "title": "Duplicate registration",
      "purpose": "Submit a registration for an account that already exists.",
      "expectedStatus": "409",
      "guidance": "Confirm that the existing account remains unchanged."
    }
  ]
}
```

## Verification

1. Expand several service groups.
2. Confirm operations display scenario counts.
3. Open a scenario panel without expanding the Swagger operation.
4. Expand scenario cards with mouse and keyboard.
5. Hide scenario buttons, refresh, and confirm the preference persists.
6. Restore scenario buttons.
7. Verify both themes and mobile layout.
8. Confirm API requests and responses remain unchanged.
