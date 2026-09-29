# Swagger.UI

Swagger.UI is a .NET 10 sample Web API that demonstrates how to extend Swagger UI with reusable endpoint search, documentation-only scenarios, authentication guidance, and copyable client code samples.

The sample API uses in-memory data and includes five controllers with 25 CRUD endpoints:

- Books: `/api/books`
- Products: `/api/products`
- Customers: `/api/customers`
- Orders: `/api/orders`
- Weather readings: `/api/weather`

## Run the application

From the repository root, run:

```powershell
dotnet run --project Swagger.UI
```

Open Swagger UI at <http://localhost:5090/swagger>.

To build without starting the application:

```powershell
dotnet build Swagger.UI/Swagger.UI.csproj
```

## Swagger UI features

### XML documentation

The project enables XML documentation generation in `Swagger.UI.csproj`. Controller summaries, parameters, return values, models, and request records are loaded into Swagger through `IncludeXmlComments` in `Program.cs`.

### Endpoint search

The endpoint search panel indexes the generated OpenAPI document and supports case-insensitive searches by endpoint path. Press `/` to focus the search box, or use the clear button to reset the search.

### Documentation-only scenarios

Each endpoint includes generated scenarios such as minimum valid requests, complete requests, invalid inputs, not-found resources, and security cases when the OpenAPI contract supports them. These scenarios provide guidance and examples; they do not execute requests or change API behavior.

### Copyable code samples

Scenario panels include copyable examples for:

- cURL
- C# with `HttpClient`
- JavaScript with `fetch`
- Python with `requests`

Examples include the configured base URL and request body when applicable. They also include these placeholder headers:

```text
api-key: YOUR_API_KEY
app-jwt: YOUR_APP_JWT
```

Replace the placeholder values before using a sample against an API that requires authentication.

Each endpoint also includes a **Usage and code examples** link. The link opens a dedicated usage page in a new tab, loads the selected operation from the OpenAPI document, and displays its request details and generated examples.

### Authentication documentation

Swagger exposes `api-key` and `app-jwt` as API-key security schemes in the **Authorize** dialog. Values entered there are applied to Swagger UI's **Try it out** requests.

This sample does not implement authentication middleware or validate those headers. The schemes and placeholder values demonstrate how an API can document its authentication requirements; production applications must add their own authentication and authorization configuration.

## Project layout

```text
Swagger.UI/
├── Controllers/          API controllers and endpoint XML documentation
├── Infrastructure/      In-memory CRUD store
├── Models/               API models and request records
├── wwwroot/swagger-ui/   Custom Swagger search, scenario, and code-sample assets
├── Program.cs            API, Swagger, XML documentation, and security setup
└── Swagger.UI.csproj     .NET 10 project and XML documentation configuration
```

## Reusing the Swagger UI enhancements

The custom assets are standalone files in `wwwroot/swagger-ui`:

- `swagger-search.js` and `swagger-search.css` provide endpoint search.
- `scenario-panel.js` and `scenario-panel.css` provide scenarios, examples, and code samples.

To reuse them in another ASP.NET Core API:

1. Copy the four assets into the target application's `wwwroot/swagger-ui` directory.
2. Enable static files with `app.UseStaticFiles()`.
3. Enable XML documentation generation in the target project.
4. Register the generated XML file with `options.IncludeXmlComments(...)`.
5. Add the assets through `UseSwaggerUI`.
6. Define the target API's authentication schemes and request requirements.

The scenario panel can be configured before its script loads through `MockScenarioPanelConfig`:

```javascript
window.MockScenarioPanelConfig = {
	codeSampleBaseUrl: "https://api.example.com",
	apiKeyPlaceholder: "YOUR_API_KEY",
	appJwtPlaceholder: "YOUR_APP_JWT"
};
```

The assets derive endpoint paths, parameters, request bodies, and response metadata from the OpenAPI document, so they do not depend on the sample controllers or model names.
