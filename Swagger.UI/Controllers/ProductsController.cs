using Microsoft.AspNetCore.Mvc;
using Swagger.UI.Infrastructure;
using Swagger.UI.Models;

namespace Swagger.UI.Controllers;

[ApiController]
[Route("api/products")]
public sealed class ProductsController(CrudStore<Product> store) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<Product>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<Product>> GetAll([FromQuery] string? category = null, [FromQuery] bool? inStock = null)
    {
        var products = store.GetAll().Where(product =>
            (category is null || product.Category.Equals(category, StringComparison.OrdinalIgnoreCase)) &&
            (inStock is null || product.InStock == inStock));
        return Ok(products);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(Product), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<Product> GetById([FromRoute] int id) => store.Get(id) is { } product ? Ok(product) : NotFound();

    [HttpPost]
    [ProducesResponseType(typeof(Product), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<Product> Create([FromBody] ProductRequest request)
    {
        var product = store.Add(new Product { Id = 0, Name = request.Name, Category = request.Category, Price = request.Price, InStock = request.InStock });
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(Product), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<Product> Update([FromRoute] int id, [FromBody] ProductRequest request)
    {
        var product = new Product { Id = id, Name = request.Name, Category = request.Category, Price = request.Price, InStock = request.InStock };
        return store.Update(id, product) ? Ok(product) : NotFound();
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult Delete([FromRoute] int id) => store.Delete(id) ? NoContent() : NotFound();
}
