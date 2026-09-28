using Microsoft.AspNetCore.Mvc;
using Swagger.UI.Infrastructure;
using Swagger.UI.Models;

namespace Swagger.UI.Controllers;

/// <summary>Provides endpoints for managing products.</summary>
[ApiController]
[Route("api/products")]
public sealed class ProductsController(CrudStore<Product> store) : ControllerBase
{
    /// <summary>Gets products, optionally filtered by category and stock availability.</summary>
    /// <param name="category">Optional category used to filter products.</param>
    /// <param name="inStock">Optional stock-availability filter.</param>
    /// <returns>The matching products.</returns>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<Product>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<Product>> GetAll([FromQuery] string? category = null, [FromQuery] bool? inStock = null)
    {
        var products = store.GetAll().Where(product =>
            (category is null || product.Category.Equals(category, StringComparison.OrdinalIgnoreCase)) &&
            (inStock is null || product.InStock == inStock));
        return Ok(products);
    }

    /// <summary>Gets a product by its identifier.</summary>
    /// <param name="id">The unique identifier of the product.</param>
    /// <returns>The requested product, or 404 if it does not exist.</returns>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(Product), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<Product> GetById([FromRoute] int id) => store.Get(id) is { } product ? Ok(product) : NotFound();

    /// <summary>Creates a new product.</summary>
    /// <param name="request">The product details to create.</param>
    /// <returns>The created product.</returns>
    [HttpPost]
    [ProducesResponseType(typeof(Product), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<Product> Create([FromBody] ProductRequest request)
    {
        var product = store.Add(new Product { Id = 0, Name = request.Name, Category = request.Category, Price = request.Price, InStock = request.InStock });
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
    }

    /// <summary>Updates an existing product.</summary>
    /// <param name="id">The unique identifier of the product to update.</param>
    /// <param name="request">The updated product details.</param>
    /// <returns>The updated product, or 404 if the product does not exist.</returns>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(Product), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<Product> Update([FromRoute] int id, [FromBody] ProductRequest request)
    {
        var product = new Product { Id = id, Name = request.Name, Category = request.Category, Price = request.Price, InStock = request.InStock };
        return store.Update(id, product) ? Ok(product) : NotFound();
    }

    /// <summary>Deletes a product by its identifier.</summary>
    /// <param name="id">The unique identifier of the product to delete.</param>
    /// <returns>No content if deleted, or 404 if the product does not exist.</returns>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult Delete([FromRoute] int id) => store.Delete(id) ? NoContent() : NotFound();
}
