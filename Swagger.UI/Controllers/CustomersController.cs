using Microsoft.AspNetCore.Mvc;
using Swagger.UI.Infrastructure;
using Swagger.UI.Models;

namespace Swagger.UI.Controllers;

/// <summary>Provides endpoints for managing customers.</summary>
[ApiController]
[Route("api/customers")]
public sealed class CustomersController(CrudStore<Customer> store) : ControllerBase
{
    /// <summary>Gets customers, optionally filtered by city and active status.</summary>
    /// <param name="city">Optional city used to filter customers.</param>
    /// <param name="active">Optional active-status filter.</param>
    /// <returns>The matching customers.</returns>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<Customer>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<Customer>> GetAll([FromQuery] string? city = null, [FromQuery] bool? active = null)
    {
        var customers = store.GetAll().Where(customer =>
            (city is null || string.Equals(customer.City, city, StringComparison.OrdinalIgnoreCase)) &&
            (active is null || customer.Active == active));
        return Ok(customers);
    }

    /// <summary>Gets a customer by its identifier.</summary>
    /// <param name="id">The unique identifier of the customer.</param>
    /// <returns>The requested customer, or 404 if it does not exist.</returns>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(Customer), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<Customer> GetById([FromRoute] int id) => store.Get(id) is { } customer ? Ok(customer) : NotFound();

    /// <summary>Creates a new customer.</summary>
    /// <param name="request">The customer details to create.</param>
    /// <returns>The created customer.</returns>
    [HttpPost]
    [ProducesResponseType(typeof(Customer), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<Customer> Create([FromBody] CustomerRequest request)
    {
        var customer = store.Add(new Customer { Id = 0, Name = request.Name, Email = request.Email, City = request.City, Active = request.Active });
        return CreatedAtAction(nameof(GetById), new { id = customer.Id }, customer);
    }

    /// <summary>Updates an existing customer.</summary>
    /// <param name="id">The unique identifier of the customer to update.</param>
    /// <param name="request">The updated customer details.</param>
    /// <returns>The updated customer, or 404 if the customer does not exist.</returns>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(Customer), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<Customer> Update([FromRoute] int id, [FromBody] CustomerRequest request)
    {
        var customer = new Customer { Id = id, Name = request.Name, Email = request.Email, City = request.City, Active = request.Active };
        return store.Update(id, customer) ? Ok(customer) : NotFound();
    }

    /// <summary>Deletes a customer by its identifier.</summary>
    /// <param name="id">The unique identifier of the customer to delete.</param>
    /// <returns>No content if deleted, or 404 if the customer does not exist.</returns>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult Delete([FromRoute] int id) => store.Delete(id) ? NoContent() : NotFound();
}
