using Microsoft.AspNetCore.Mvc;
using Swagger.UI.Infrastructure;
using Swagger.UI.Models;

namespace Swagger.UI.Controllers;

[ApiController]
[Route("api/customers")]
public sealed class CustomersController(CrudStore<Customer> store) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<Customer>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<Customer>> GetAll([FromQuery] string? city = null, [FromQuery] bool? active = null)
    {
        var customers = store.GetAll().Where(customer =>
            (city is null || string.Equals(customer.City, city, StringComparison.OrdinalIgnoreCase)) &&
            (active is null || customer.Active == active));
        return Ok(customers);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(Customer), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<Customer> GetById([FromRoute] int id) => store.Get(id) is { } customer ? Ok(customer) : NotFound();

    [HttpPost]
    [ProducesResponseType(typeof(Customer), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<Customer> Create([FromBody] CustomerRequest request)
    {
        var customer = store.Add(new Customer { Id = 0, Name = request.Name, Email = request.Email, City = request.City, Active = request.Active });
        return CreatedAtAction(nameof(GetById), new { id = customer.Id }, customer);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(Customer), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<Customer> Update([FromRoute] int id, [FromBody] CustomerRequest request)
    {
        var customer = new Customer { Id = id, Name = request.Name, Email = request.Email, City = request.City, Active = request.Active };
        return store.Update(id, customer) ? Ok(customer) : NotFound();
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult Delete([FromRoute] int id) => store.Delete(id) ? NoContent() : NotFound();
}
