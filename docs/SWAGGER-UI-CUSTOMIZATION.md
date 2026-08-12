# Swagger UI customization guide

This guide documents the complete API Explorer customization so the same user experience can be reproduced in another ASP.NET Core application using Swashbuckle Swagger UI.

## Result

The customization adds:

- accessible light and dark government-service-inspired themes, with light mode as the default;
- an explicit theme switch whose selection is retained in browser storage;
- a responsive product header and clearly visible environment badge;
- accessible skip navigation, focus states, contrast, and reduced-motion support;
- case-insensitive endpoint-path search that excludes methods, summaries, descriptions, and service-group text;
- search result counts, a clear action, `/` keyboard shortcut, and `Escape` reset;
- endpoint groups collapsed by default;
- deep links to individual operations;
- hidden schema models by default to reduce page length;
- persisted authorization values during the browser session;
- curated descriptions and a logical display order for all API tags;
- an explicit notice that the application uses mock data.

The API routes, controllers, source OpenAPI document, and mock response behavior are not changed by the visual theme.

Documentation-only per-operation scenarios are implemented as a separate reusable module. See [Reusable Swagger scenario guidance](SCENARIO-GUIDANCE.md).

## Files changed

| File | Purpose |
| --- | --- |
| `Program.cs` | Enables static assets and configures Swagger UI behavior and injected assets. |
| `Mocking/OpenApiMockCatalog.cs` | Adds tag descriptions, tag ordering, and local API information to the served copy of the contract. |
| `wwwroot/swagger-ui/custom.css` | Contains both responsive themes, explicit Swagger UI contrast corrections, search styling, and accessibility rules. |
| `wwwroot/swagger-ui/custom.js` | Adds the compact portal header, theme switch, endpoint search, and keyboard interactions. |
| `wwwroot/swagger-ui/scenario-panel.css` | Styles reusable scenario disclosures in both themes. |
| `wwwroot/swagger-ui/scenario-panel.js` | Derives per-operation guidance from OpenAPI and adds optional controls. |

## 1. Enable static files

Place this before `UseSwaggerUI` in `Program.cs`:

```csharp
app.UseStaticFiles();
```

Files under `wwwroot` can then be requested by their path. For example, `wwwroot/swagger-ui/custom.css` is available as `/swagger-ui/custom.css`.

## 2. Configure Swagger UI

Use the following configuration:

```csharp
app.UseSwaggerUI(options =>
{
    options.RoutePrefix = "swagger";
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Transport Canada MTA Mock API");
    options.DocumentTitle = "Transport API Explorer | Mock API";

    options.DisplayRequestDuration();
    options.EnableDeepLinking();
    options.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.None);
    options.DefaultModelsExpandDepth(-1);
    options.EnablePersistAuthorization();

    options.InjectStylesheet("/swagger-ui/custom.css");
    options.InjectJavascript("/swagger-ui/custom.js");
});
```

The individual options have the following effects:

| Option | Effect |
| --- | --- |
| `DisplayRequestDuration` | Shows how long an executed request takes. |
| `EnableDeepLinking` | Gives tags and operations bookmarkable URLs. |
| `DocExpansion(None)` | Starts with every service group collapsed. |
| `DefaultModelsExpandDepth(-1)` | Hides the large schemas section at the bottom of the page. Schema details remain available inside operations. |
| `EnablePersistAuthorization` | Retains entered API credentials when the page refreshes. Review this choice for shared or production computers. |
| `InjectStylesheet` | Loads the custom visual theme after Swagger UI's default CSS. |
| `InjectJavascript` | Loads the progressive UI enhancements after Swagger UI initializes. |

If the actual application handles sensitive production credentials, consider removing `EnablePersistAuthorization`.

## 3. Copy the theme assets

Copy these two files into the target application, preserving their paths:

```text
wwwroot/
└── swagger-ui/
    ├── custom.css
    └── custom.js
```

The CSS uses custom properties at the beginning of the file for light mode and overrides them under `html[data-theme="dark"]` for dark mode. Change both sets to apply an approved brand palette:

```css
:root {
    --portal-navy: #26374a;
    --portal-navy-dark: #172536;
    --portal-blue: #2b5d89;
    --portal-red: #d3080c;
    --portal-focus: #ffbf47;
}
```

`--portal-content-width` controls the shared maximum width for endpoint search, API information, server/authorization controls, and service-group cards. The layout uses `1376px` with consistent desktop and mobile gutters:

```css
:root {
    --portal-content-width: 1376px;
}
```

Change this single value rather than assigning independent widths to Swagger containers.

The theme intentionally uses system-hosted fonts, so it does not depend on an external font service.

### Contrast corrections

Do not limit a Swagger theme to the page background and header. Swagger UI supplies its own colours several levels deep in the rendered components. This implementation explicitly sets foreground and background colours for:

- HTTP method badges and operation panels;
- endpoint paths and descriptions;
- parameters, types, required indicators, and form placeholders;
- response status and description tables;
- schemas, property types, code samples, and model panels;
- authorization buttons and modal dialogs;
- focus indicators for native and Swagger UI controls.

The method name remains printed inside every coloured badge, so colour is not the only method indicator.

### Light-mode visual hierarchy

Light mode uses a cool grey-blue page canvas instead of placing white cards on a nearly white background. The major areas use distinct but restrained accents:

- endpoint search and API information use a blue top border;
- the API version and OpenAPI specification labels use soft blue and green pill badges instead of Swagger's default black and saturated green badges;
- dark mode uses matching muted blue and green pill badges with brighter text and borders suitable for the dark API-information surface;
- dark service groups use a blue-slate hover and keyboard-focus surface with readable text, borders, and chevrons rather than inheriting the light-mode hover colour;
- server and authorization controls use a green left border;
- service groups use a slate left border that changes to blue on hover or keyboard focus;
- expanded service-group content uses a slightly tinted surface behind method-specific operation rows;
- borders and shadows are stronger than the dark-mode equivalents to preserve card boundaries on bright displays.
- the authorization modal uses an explicitly light surface, readable credential fields, visible dividers and close controls, and accessible enabled and disabled button states.
- expanded operations explicitly style descriptions, deprecated warnings, parameter and response tables, tabs, links, media-type selectors, disabled controls, and code examples so Swagger's inherited dark-scheme colours cannot become pale text on white.

These rules are scoped under `html[data-theme="light"]`, so they do not affect dark mode.

## 4. Customize the header and search introduction

Edit the HTML templates inside `custom.js` to change:

- the product name;
- developer-documentation subtitle;
- environment badge;
- endpoint-search heading, description, and example query.

The earlier promotional hero, safety card, statistics, and three-step guide were intentionally removed to put endpoint search and API information above the fold. Mock status remains visible in the compact header badge.

The same script controls the theme. `loadTheme` defaults to light mode unless the browser previously saved `dark`; `applyTheme` sets `data-theme` on the root `<html>` element and updates the accessible toggle label. The storage key is `transport-api-explorer-theme`.

The custom content is injected before `#swagger-ui`. The script uses a `MutationObserver` only to improve controls rendered later by Swagger UI. All API functionality continues to work if JavaScript enhancements fail, because Swagger UI itself remains responsible for rendering and execution.

Do not place secrets, environment-specific credentials, or untrusted HTML in this file.

## 5. Endpoint-aware search

The custom search replaces Swagger UI's built-in filter. On startup it fetches the locally served OpenAPI document and indexes only the complete path of every operation, so search still works while Swagger's service groups are collapsed. Methods, summaries, descriptions, and service-group text are deliberately excluded from matching.

Both indexed paths and user input are converted with `toLocaleLowerCase`, making matching case-insensitive. Space-separated terms use AND matching against the path. For example, `/API/V1/USERS` matches `/api/v1/users`, while `GET users` does not match based on the method name. Results still display the method, path, description, and service group for context. Selecting a result clears search, opens its Swagger service group and operation, and scrolls it into view.

Keyboard interactions are:

| Key | Behaviour |
| --- | --- |
| `/` | Focus endpoint search when focus is not already in a form field. |
| `Escape` | Clear search while the search field is focused. |

When updating Swagger UI, verify its `.opblock`, `.opblock-tag-section`, method, and path class names have not changed. They are the DOM integration points used to open and reveal a selected result; indexing itself is independent of Swagger's rendered DOM.

## 6. Add tag descriptions and ordering

Swagger UI becomes easier to scan when the OpenAPI document contains a top-level `tags` array. In this mock application, `OpenApiMockCatalog` adds that metadata only to the locally served clone of the source document:

```csharp
var tags = new JsonArray();
foreach (var (name, description) in TagCatalog)
{
    tags.Add(new JsonObject
    {
        ["name"] = name,
        ["description"] = description
    });
}

localDocument["tags"] = tags;
```

The order of `TagCatalog` defines the service-group order in Swagger UI. In an application that generates OpenAPI with `AddSwaggerGen`, implement the equivalent as a Swashbuckle document filter or add the tag metadata to the source OpenAPI document.

Example document filter:

```csharp
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

public sealed class TagDescriptionsDocumentFilter : IDocumentFilter
{
    public void Apply(OpenApiDocument document, DocumentFilterContext context)
    {
        document.Tags =
        [
            new OpenApiTag
            {
                Name = "Accounts",
                Description = "Account registration, activation, recovery, verification, and enrollment."
            },
            new OpenApiTag
            {
                Name = "Services",
                Description = "Service discovery, enrollment, invitations, and related resources."
            }
        ];
    }
}
```

Register that filter in the actual application's Swagger generator configuration:

```csharp
builder.Services.AddSwaggerGen(options =>
{
    options.DocumentFilter<TagDescriptionsDocumentFilter>();
});
```

Exact OpenAPI model namespaces can differ between major Swashbuckle versions. Use the model types supplied by the version installed in the target application.

## 7. Mark the correct environment

This project deliberately displays `Mock environment`. In the actual application, render the correct environment name rather than copying that text unchanged. Recommended labels are:

- Development
- Test
- Staging
- Production

For multiple deployments, serve the label from configuration instead of hard-coding it in JavaScript. Do not imply that a production system is safe for test requests.

## 8. Accessibility checklist

Before releasing the customized UI:

1. Navigate the entire page using only a keyboard.
2. Confirm that the skip link becomes visible on focus.
3. Confirm that focused buttons and fields have a visible outline.
4. Test at 200% browser zoom and at narrow mobile widths.
5. Check text and control contrast against the approved accessibility standard.
6. Verify that operation colours are not the only way HTTP methods are identified; Swagger UI also prints the method name.
7. Test with reduced-motion enabled in the operating system.
8. Validate meaningful tag descriptions in both supported languages if the actual application is bilingual.
9. Check all expanded operation panels, parameter tables, response tables, code samples, and authorization dialogs in both themes.
10. Confirm a fresh browser session starts in light mode and that the theme selection persists after refresh.

## 9. Verification

Run the application:

```powershell
dotnet run --project MockAPI
```

Open <http://localhost:5080/swagger> and verify:

- the custom header and environment badge appear;
- all service groups start collapsed;
- search matches complete endpoint paths case-insensitively and does not match methods, descriptions, or service groups;
- `/` focuses search and `Escape` clears it;
- light mode is the initial default and the theme toggle persists the selected mode;
- direct operation URLs remain bookmarkable;
- `Try it out` returns mock responses;
- the layout works on desktop and mobile widths;
- `/swagger/v1/swagger.json` still returns a valid OpenAPI document;
- `/swagger-ui/custom.css` and `/swagger-ui/custom.js` return HTTP 200.

Use `Ctrl+C` in the terminal to stop the application.
