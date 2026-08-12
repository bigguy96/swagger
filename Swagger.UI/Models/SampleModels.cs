using System.ComponentModel.DataAnnotations;

namespace Swagger.UI.Models;

public interface IEntity
{
    int Id { get; set; }
}

public sealed class Book : IEntity
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public required string Author { get; set; }
    public string? Genre { get; set; }
    public int PublishedYear { get; set; }
}

public sealed record BookRequest(
    [property: Required, StringLength(150)] string Title,
    [property: Required, StringLength(100)] string Author,
    [property: StringLength(60)] string? Genre,
    [property: Range(1450, 2100)] int PublishedYear);

public sealed class Product : IEntity
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Category { get; set; }
    public decimal Price { get; set; }
    public bool InStock { get; set; }
}

public sealed record ProductRequest(
    [property: Required, StringLength(120)] string Name,
    [property: Required, StringLength(60)] string Category,
    [property: Range(0.01, 100000)] decimal Price,
    bool InStock = true);

public sealed class Customer : IEntity
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public string? City { get; set; }
    public bool Active { get; set; }
}

public sealed record CustomerRequest(
    [property: Required, StringLength(120)] string Name,
    [property: Required, EmailAddress] string Email,
    [property: StringLength(80)] string? City,
    bool Active = true);

public sealed class Order : IEntity
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public required string Description { get; set; }
    public decimal Total { get; set; }
    public required string Status { get; set; }
}

public sealed record OrderRequest(
    [property: Range(1, int.MaxValue)] int CustomerId,
    [property: Required, StringLength(200)] string Description,
    [property: Range(0.01, 1000000)] decimal Total,
    [property: Required, RegularExpression("^(Draft|Submitted|Processing|Completed|Cancelled)$")] string Status);

public sealed class WeatherReading : IEntity
{
    public int Id { get; set; }
    public required string City { get; set; }
    public int TemperatureC { get; set; }
    public string? Condition { get; set; }
    public DateTimeOffset ObservedAt { get; set; }
}

public sealed record WeatherReadingRequest(
    [property: Required, StringLength(80)] string City,
    [property: Range(-80, 60)] int TemperatureC,
    [property: StringLength(80)] string? Condition,
    DateTimeOffset ObservedAt);
