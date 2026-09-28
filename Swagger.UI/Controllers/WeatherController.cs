using Microsoft.AspNetCore.Mvc;
using Swagger.UI.Infrastructure;
using Swagger.UI.Models;

namespace Swagger.UI.Controllers;

/// <summary>Provides endpoints for managing weather readings.</summary>
[ApiController]
[Route("api/weather")]
public sealed class WeatherController(CrudStore<WeatherReading> store) : ControllerBase
{
    /// <summary>Gets weather readings, optionally filtered by city and minimum temperature.</summary>
    /// <param name="city">Optional city used to filter weather readings.</param>
    /// <param name="minimumTemperature">Optional minimum temperature in degrees Celsius.</param>
    /// <returns>The matching weather readings.</returns>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<WeatherReading>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<WeatherReading>> GetAll([FromQuery] string? city = null, [FromQuery] int? minimumTemperature = null)
    {
        var readings = store.GetAll().Where(reading =>
            (city is null || reading.City.Equals(city, StringComparison.OrdinalIgnoreCase)) &&
            (minimumTemperature is null || reading.TemperatureC >= minimumTemperature));
        return Ok(readings);
    }

    /// <summary>Gets a weather reading by its identifier.</summary>
    /// <param name="id">The unique identifier of the weather reading.</param>
    /// <returns>The requested weather reading, or 404 if it does not exist.</returns>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(WeatherReading), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<WeatherReading> GetById([FromRoute] int id) => store.Get(id) is { } reading ? Ok(reading) : NotFound();

    /// <summary>Creates a new weather reading.</summary>
    /// <param name="request">The weather reading details to create.</param>
    /// <returns>The created weather reading.</returns>
    [HttpPost]
    [ProducesResponseType(typeof(WeatherReading), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<WeatherReading> Create([FromBody] WeatherReadingRequest request)
    {
        var reading = store.Add(new WeatherReading { Id = 0, City = request.City, TemperatureC = request.TemperatureC, Condition = request.Condition, ObservedAt = request.ObservedAt });
        return CreatedAtAction(nameof(GetById), new { id = reading.Id }, reading);
    }

    /// <summary>Updates an existing weather reading.</summary>
    /// <param name="id">The unique identifier of the weather reading to update.</param>
    /// <param name="request">The updated weather reading details.</param>
    /// <returns>The updated weather reading, or 404 if it does not exist.</returns>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(WeatherReading), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<WeatherReading> Update([FromRoute] int id, [FromBody] WeatherReadingRequest request)
    {
        var reading = new WeatherReading { Id = id, City = request.City, TemperatureC = request.TemperatureC, Condition = request.Condition, ObservedAt = request.ObservedAt };
        return store.Update(id, reading) ? Ok(reading) : NotFound();
    }

    /// <summary>Deletes a weather reading by its identifier.</summary>
    /// <param name="id">The unique identifier of the weather reading to delete.</param>
    /// <returns>No content if deleted, or 404 if the weather reading does not exist.</returns>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult Delete([FromRoute] int id) => store.Delete(id) ? NoContent() : NotFound();
}
