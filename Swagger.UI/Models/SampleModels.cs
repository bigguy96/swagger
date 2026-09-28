using System.ComponentModel.DataAnnotations;

namespace Swagger.UI.Models;

/// <summary>Defines the identifier required by entities stored by the application.</summary>
public interface IEntity
{
    /// <summary>Gets or sets the entity identifier.</summary>
    int Id { get; set; }
}

/// <summary>Represents a book in the catalog.</summary>
public sealed class Book : IEntity
{
    /// <summary>Gets or sets the book identifier.</summary>
    public int Id { get; set; }
    /// <summary>Gets or sets the book title.</summary>
    public required string Title { get; set; }
    /// <summary>Gets or sets the book author.</summary>
    public required string Author { get; set; }
    /// <summary>Gets or sets the optional book genre.</summary>
    public string? Genre { get; set; }
    /// <summary>Gets or sets the year the book was published.</summary>
    public int PublishedYear { get; set; }
}

/// <summary>Contains the fields required to create or update a book.</summary>
/// <param name="Title">The book title.</param>
/// <param name="Author">The book author.</param>
/// <param name="Genre">The optional book genre.</param>
/// <param name="PublishedYear">The book publication year.</param>
public sealed record BookRequest(
    [property: Required, StringLength(150)] string Title,
    [property: Required, StringLength(100)] string Author,
    [property: StringLength(60)] string? Genre,
    [property: Range(1450, 2100)] int PublishedYear);

/// <summary>Represents a product in the catalog.</summary>
public sealed class Product : IEntity
{
    /// <summary>Gets or sets the product identifier.</summary>
    public int Id { get; set; }
    /// <summary>Gets or sets the product name.</summary>
    public required string Name { get; set; }
    /// <summary>Gets or sets the product category.</summary>
    public required string Category { get; set; }
    /// <summary>Gets or sets the product price.</summary>
    public decimal Price { get; set; }
    /// <summary>Gets or sets a value indicating whether the product is in stock.</summary>
    public bool InStock { get; set; }
}

/// <summary>Contains the fields required to create or update a product.</summary>
/// <param name="Name">The product name.</param>
/// <param name="Category">The product category.</param>
/// <param name="Price">The product price.</param>
/// <param name="InStock">Whether the product is currently in stock.</param>
public sealed record ProductRequest(
    [property: Required, StringLength(120)] string Name,
    [property: Required, StringLength(60)] string Category,
    [property: Range(0.01, 100000)] decimal Price,
    bool InStock = true);

/// <summary>Represents a customer.</summary>
public sealed class Customer : IEntity
{
    /// <summary>Gets or sets the customer identifier.</summary>
    public int Id { get; set; }
    /// <summary>Gets or sets the customer name.</summary>
    public required string Name { get; set; }
    /// <summary>Gets or sets the customer email address.</summary>
    public required string Email { get; set; }
    /// <summary>Gets or sets the optional customer city.</summary>
    public string? City { get; set; }
    /// <summary>Gets or sets a value indicating whether the customer is active.</summary>
    public bool Active { get; set; }
}

/// <summary>Contains the fields required to create or update a customer.</summary>
/// <param name="Name">The customer name.</param>
/// <param name="Email">The customer email address.</param>
/// <param name="City">The optional customer city.</param>
/// <param name="Active">Whether the customer is active.</param>
public sealed record CustomerRequest(
    [property: Required, StringLength(120)] string Name,
    [property: Required, EmailAddress] string Email,
    [property: StringLength(80)] string? City,
    bool Active = true);

/// <summary>Represents an order placed by a customer.</summary>
public sealed class Order : IEntity
{
    /// <summary>Gets or sets the order identifier.</summary>
    public int Id { get; set; }
    /// <summary>Gets or sets the identifier of the customer who placed the order.</summary>
    public int CustomerId { get; set; }
    /// <summary>Gets or sets the order description.</summary>
    public required string Description { get; set; }
    /// <summary>Gets or sets the order total.</summary>
    public decimal Total { get; set; }
    /// <summary>Gets or sets the order status.</summary>
    public required string Status { get; set; }
}

/// <summary>Contains the fields required to create or update an order.</summary>
/// <param name="CustomerId">The identifier of the customer placing the order.</param>
/// <param name="Description">A description of the order.</param>
/// <param name="Total">The order total.</param>
/// <param name="Status">The order status.</param>
public sealed record OrderRequest(
    [property: Range(1, int.MaxValue)] int CustomerId,
    [property: Required, StringLength(200)] string Description,
    [property: Range(0.01, 1000000)] decimal Total,
    [property: Required, RegularExpression("^(Draft|Submitted|Processing|Completed|Cancelled)$")] string Status);

/// <summary>Represents a weather observation.</summary>
public sealed class WeatherReading : IEntity
{
    /// <summary>Gets or sets the weather reading identifier.</summary>
    public int Id { get; set; }
    /// <summary>Gets or sets the city where the reading was taken.</summary>
    public required string City { get; set; }
    /// <summary>Gets or sets the temperature in degrees Celsius.</summary>
    public int TemperatureC { get; set; }
    /// <summary>Gets or sets the optional weather condition.</summary>
    public string? Condition { get; set; }
    /// <summary>Gets or sets the date and time when the reading was observed.</summary>
    public DateTimeOffset ObservedAt { get; set; }
}

/// <summary>Contains the fields required to create or update a weather reading.</summary>
/// <param name="City">The city where the reading was taken.</param>
/// <param name="TemperatureC">The temperature in degrees Celsius.</param>
/// <param name="Condition">The optional weather condition.</param>
/// <param name="ObservedAt">The date and time when the reading was observed.</param>
public sealed record WeatherReadingRequest(
    [property: Required, StringLength(80)] string City,
    [property: Range(-80, 60)] int TemperatureC,
    [property: StringLength(80)] string? Condition,
    DateTimeOffset ObservedAt);
