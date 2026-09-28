using Microsoft.AspNetCore.Mvc;
using Swagger.UI.Infrastructure;
using Swagger.UI.Models;

namespace Swagger.UI.Controllers;

/// <summary>Provides endpoints for managing orders.</summary>
[ApiController]
[Route("api/orders")]
public sealed class OrdersController(CrudStore<Order> store) : ControllerBase
{
    /// <summary>Gets orders, optionally filtered by status and customer.</summary>
    /// <param name="status">Optional order status used to filter orders.</param>
    /// <param name="customerId">Optional customer identifier used to filter orders.</param>
    /// <returns>The matching orders.</returns>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<Order>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<Order>> GetAll([FromQuery] string? status = null, [FromQuery] int? customerId = null)
    {
        var orders = store.GetAll().Where(order =>
            (status is null || order.Status.Equals(status, StringComparison.OrdinalIgnoreCase)) &&
            (customerId is null || order.CustomerId == customerId));
        return Ok(orders);
    }

    /// <summary>Gets an order by its identifier.</summary>
    /// <param name="id">The unique identifier of the order.</param>
    /// <returns>The requested order, or 404 if it does not exist.</returns>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(Order), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<Order> GetById([FromRoute] int id) => store.Get(id) is { } order ? Ok(order) : NotFound();

    /// <summary>Creates a new order.</summary>
    /// <param name="request">The order details to create.</param>
    /// <returns>The created order.</returns>
    [HttpPost]
    [ProducesResponseType(typeof(Order), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<Order> Create([FromBody] OrderRequest request)
    {
        var order = store.Add(new Order { Id = 0, CustomerId = request.CustomerId, Description = request.Description, Total = request.Total, Status = request.Status });
        return CreatedAtAction(nameof(GetById), new { id = order.Id }, order);
    }

    /// <summary>Updates an existing order.</summary>
    /// <param name="id">The unique identifier of the order to update.</param>
    /// <param name="request">The updated order details.</param>
    /// <returns>The updated order, or 404 if the order does not exist.</returns>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(Order), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<Order> Update([FromRoute] int id, [FromBody] OrderRequest request)
    {
        var order = new Order { Id = id, CustomerId = request.CustomerId, Description = request.Description, Total = request.Total, Status = request.Status };
        return store.Update(id, order) ? Ok(order) : NotFound();
    }

    /// <summary>Deletes an order by its identifier.</summary>
    /// <param name="id">The unique identifier of the order to delete.</param>
    /// <returns>No content if deleted, or 404 if the order does not exist.</returns>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult Delete([FromRoute] int id) => store.Delete(id) ? NoContent() : NotFound();
}
