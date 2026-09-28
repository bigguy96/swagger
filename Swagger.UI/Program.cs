using System.Reflection;
using Microsoft.OpenApi;
using Swagger.UI.Infrastructure;
using Swagger.UI.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Swagger.UI",
        Version = "v1",
        Description = "A small .NET 10 API demonstrating reusable Swagger endpoint search and scenario guidance."
    });
    options.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, $"{Assembly.GetExecutingAssembly().GetName().Name}.xml"));
    options.AddSecurityDefinition("api-key", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.ApiKey,
        In = ParameterLocation.Header,
        Name = "api-key",
        Description = "Enter the API key used to call the endpoint."
    });
    options.AddSecurityDefinition("app-jwt", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.ApiKey,
        In = ParameterLocation.Header,
        Name = "app-jwt",
        Description = "Enter the application JWT used to call the endpoint."
    });
    options.AddSecurityRequirement(_ => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("api-key")] = [],
        [new OpenApiSecuritySchemeReference("app-jwt")] = []
    });
});

builder.Services.AddSingleton(new CrudStore<Book>(
[
    new Book { Id = 1, Title = "Northern Lights", Author = "Avery Quinn", Genre = "Travel", PublishedYear = 2022 },
    new Book { Id = 2, Title = "Clean APIs", Author = "Morgan Lee", Genre = "Technology", PublishedYear = 2025 }
]));
builder.Services.AddSingleton(new CrudStore<Product>(
[
    new Product { Id = 1, Name = "Field Notebook", Category = "Office", Price = 12.95m, InStock = true },
    new Product { Id = 2, Name = "Travel Adapter", Category = "Electronics", Price = 34.50m, InStock = true }
]));
builder.Services.AddSingleton(new CrudStore<Customer>(
[
    new Customer { Id = 1, Name = "Alex Martin", Email = "alex.martin@example.test", City = "Toronto", Active = true },
    new Customer { Id = 2, Name = "Sam Roy", Email = "sam.roy@example.test", City = "Ottawa", Active = true }
]));
builder.Services.AddSingleton(new CrudStore<Order>(
[
    new Order { Id = 1, CustomerId = 1, Description = "Office supplies", Total = 48.25m, Status = "Submitted" },
    new Order { Id = 2, CustomerId = 2, Description = "Replacement equipment", Total = 129.99m, Status = "Processing" }
]));
builder.Services.AddSingleton(new CrudStore<WeatherReading>(
[
    new WeatherReading { Id = 1, City = "Toronto", TemperatureC = 23, Condition = "Sunny", ObservedAt = new DateTimeOffset(2026, 8, 11, 12, 0, 0, TimeSpan.Zero) },
    new WeatherReading { Id = 2, City = "Vancouver", TemperatureC = 18, Condition = "Cloudy", ObservedAt = new DateTimeOffset(2026, 8, 11, 12, 0, 0, TimeSpan.Zero) }
]));

var app = builder.Build();

app.UseStaticFiles();
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.RoutePrefix = "swagger";
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Swagger.UI v1");
    options.DocumentTitle = "Swagger.UI";
    options.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.None);
    options.EnableDeepLinking();
    // Increment the version when these standalone assets change so browsers do
    // not reuse an older cached theme or behavior after deployment.
    options.InjectStylesheet("/swagger-ui/swagger-search.css?v=2");
    options.InjectStylesheet("/swagger-ui/scenario-panel.css?v=2");
    options.InjectJavascript("/swagger-ui/swagger-search.js?v=2");
    options.InjectJavascript("/swagger-ui/scenario-panel.js?v=4");
});

app.MapGet("/", () => Results.Redirect("/swagger")).ExcludeFromDescription();
app.MapControllers();

app.Run();

/// <summary>Provides the generated entry point for the web application.</summary>
public partial class Program;
