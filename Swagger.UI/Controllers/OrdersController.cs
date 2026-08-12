using Microsoft.AspNetCore.Mvc;
using Swagger.UI.Infrastructure;
using Swagger.UI.Models;

namespace Swagger.UI.Controllers;

[ApiController]
[Route("api/orders")]
public sealed class OrdersController(CrudStore<Order> store) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<Order>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<Order>> GetAll([FromQuery] string? status = null, [FromQuery] int? customerId = null)
    {
        var orders = store.GetAll().Where(order =>
            (status is null || order.Status.Equals(status, StringComparison.OrdinalIgnoreCase)) &&
            (customerId is null || order.CustomerId == customerId));
        return Ok(orders);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(Order), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<Order> GetById([FromRoute] int id) => store.Get(id) is { } order ? Ok(order) : NotFound();

    [HttpPost]
    [ProducesResponseType(typeof(Order), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<Order> Create([FromBody] OrderRequest request)
    {
        var order = store.Add(new Order { Id = 0, CustomerId = request.CustomerId, Description = request.Description, Total = request.Total, Status = request.Status });
        return CreatedAtAction(nameof(GetById), new { id = order.Id }, order);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(Order), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<Order> Update([FromRoute] int id, [FromBody] OrderRequest request)
    {
        var order = new Order { Id = id, CustomerId = request.CustomerId, Description = request.Description, Total = request.Total, Status = request.Status };
        return store.Update(id, order) ? Ok(order) : NotFound();
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult Delete([FromRoute] int id) => store.Delete(id) ? NoContent() : NotFound();
}
