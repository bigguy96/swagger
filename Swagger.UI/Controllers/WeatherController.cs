using Microsoft.AspNetCore.Mvc;
using Swagger.UI.Infrastructure;
using Swagger.UI.Models;

namespace Swagger.UI.Controllers;

[ApiController]
[Route("api/weather")]
public sealed class WeatherController(CrudStore<WeatherReading> store) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<WeatherReading>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<WeatherReading>> GetAll([FromQuery] string? city = null, [FromQuery] int? minimumTemperature = null)
    {
        var readings = store.GetAll().Where(reading =>
            (city is null || reading.City.Equals(city, StringComparison.OrdinalIgnoreCase)) &&
            (minimumTemperature is null || reading.TemperatureC >= minimumTemperature));
        return Ok(readings);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(WeatherReading), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<WeatherReading> GetById([FromRoute] int id) => store.Get(id) is { } reading ? Ok(reading) : NotFound();

    [HttpPost]
    [ProducesResponseType(typeof(WeatherReading), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<WeatherReading> Create([FromBody] WeatherReadingRequest request)
    {
        var reading = store.Add(new WeatherReading { Id = 0, City = request.City, TemperatureC = request.TemperatureC, Condition = request.Condition, ObservedAt = request.ObservedAt });
        return CreatedAtAction(nameof(GetById), new { id = reading.Id }, reading);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(WeatherReading), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<WeatherReading> Update([FromRoute] int id, [FromBody] WeatherReadingRequest request)
    {
        var reading = new WeatherReading { Id = id, City = request.City, TemperatureC = request.TemperatureC, Condition = request.Condition, ObservedAt = request.ObservedAt };
        return store.Update(id, reading) ? Ok(reading) : NotFound();
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult Delete([FromRoute] int id) => store.Delete(id) ? NoContent() : NotFound();
}
