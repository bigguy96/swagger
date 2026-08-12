# Swagger.UI

A .NET 10 Web API demonstrating reusable Swagger UI endpoint search and documentation-only test scenarios. The application uses standard Swagger UI styling and adds only the search and scenario components.

## Features

- Five conventional API controllers with 25 CRUD endpoints
- Deterministic in-memory sample data
- Case-insensitive endpoint-path search
- Keyboard shortcut: press `/` to focus endpoint search
- Documentation-only scenarios derived from the OpenAPI contract
- Minimal and complete JSON request-body examples for POST and PUT operations
- Example URLs, request headers, expected statuses, and copy controls
- Native Swagger UI light and dark mode support
- Standalone JavaScript and CSS files that can be copied into other applications

## Requirements

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)

## Run the application

From the repository root:

```powershell
dotnet restore Swagger.UI/Swagger.UI.csproj
dotnet run --project Swagger.UI
```

Open <http://localhost:5090/swagger>.

To stop the application, focus the terminal running it and press `Ctrl+C`.

## Sample endpoints

The application contains five controllers with five endpoints each:

| Controller | Collection route | Operations |
|---|---|---|
| Books | `/api/books` | List, get, create, update, delete |
| Customers | `/api/customers` | List, get, create, update, delete |
| Orders | `/api/orders` | List, get, create, update, delete |
| Products | `/api/products` | List, get, create, update, delete |
| Weather | `/api/weather` | List, get, create, update, delete |

Data is held in memory and resets whenever the application restarts.

## Swagger endpoint search

The search panel is displayed immediately above the Swagger controller groups. It indexes only endpoint paths and matches without regard to letter casing.

Examples:

```text
/api/books
/api/orders/{id}
```

Selecting a result expands its controller group and scrolls the matching operation into view.

## Test scenarios

Each rendered operation can display scenarios inferred from its OpenAPI parameters, schemas, response codes, and security metadata. Scenarios are documentation only and do not alter API behavior.

Depending on the contract, an operation can include:

- Minimum valid request
- Complete request
- Missing required input
- Invalid constrained value
- Unauthorized or forbidden request
- Resource-not-found response

POST and PUT scenarios include copyable JSON examples. A minimum scenario contains only schema properties declared as required, while a complete scenario also includes optional properties.

For example, the minimum Books request is:

```json
{
  "title": "example",
  "author": "example"
}
```

See [scenario guidance](docs/SCENARIO-GUIDANCE.md) for configuration and portability details.

## Light and dark modes

The custom components follow Swagger UI's native lightbulb theme control. Dark-mode rules bind directly to Swagger UI's `html.dark-mode` class, and both palettes include visible focus, hover, border, text, and code-example states.

## Reuse in another application

Copy these four files into the other application's `wwwroot/swagger-ui` directory:

```text
swagger-search.js
swagger-search.css
scenario-panel.js
scenario-panel.css
```

Enable static files and register the assets in the Swagger UI configuration:

```csharp
app.UseStaticFiles();
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "API v1");
    options.InjectStylesheet("/swagger-ui/swagger-search.css");
    options.InjectStylesheet("/swagger-ui/scenario-panel.css");
    options.InjectJavascript("/swagger-ui/swagger-search.js");
    options.InjectJavascript("/swagger-ui/scenario-panel.js");
});
```

The default OpenAPI URL is `/swagger/v1/swagger.json`. Configuration defaults are documented near the top of each JavaScript file:

- Search: `window.SwaggerEndpointSearchConfig`
- Scenarios: `window.MockScenarioPanelConfig`

## Project structure

```text
Swagger.UI/
├── Controllers/                 Five example API controllers
├── Infrastructure/              Generic in-memory CRUD store
├── Models/                      Request and response models
├── wwwroot/swagger-ui/          Reusable Swagger UI assets
├── Program.cs                   Services, Swagger, and middleware setup
└── Swagger.UI.csproj            .NET 10 web project
```

## Build

```powershell
dotnet build swagger.slnx
```
