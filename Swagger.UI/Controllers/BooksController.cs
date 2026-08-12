using Microsoft.AspNetCore.Mvc;
using Swagger.UI.Infrastructure;
using Swagger.UI.Models;

namespace Swagger.UI.Controllers;

[ApiController]
[Route("api/books")]
public sealed class BooksController(CrudStore<Book> store) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<Book>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<Book>> GetAll([FromQuery] string? title = null, [FromQuery] int limit = 50)
    {
        var books = store.GetAll().Where(book => title is null || book.Title.Contains(title, StringComparison.OrdinalIgnoreCase));
        return Ok(books.Take(Math.Clamp(limit, 1, 100)));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(Book), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<Book> GetById([FromRoute] int id) => store.Get(id) is { } book ? Ok(book) : NotFound();

    [HttpPost]
    [ProducesResponseType(typeof(Book), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<Book> Create([FromBody] BookRequest request)
    {
        var book = store.Add(new Book { Id = 0, Title = request.Title, Author = request.Author, Genre = request.Genre, PublishedYear = request.PublishedYear });
        return CreatedAtAction(nameof(GetById), new { id = book.Id }, book);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(Book), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<Book> Update([FromRoute] int id, [FromBody] BookRequest request)
    {
        var book = new Book { Id = id, Title = request.Title, Author = request.Author, Genre = request.Genre, PublishedYear = request.PublishedYear };
        return store.Update(id, book) ? Ok(book) : NotFound();
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult Delete([FromRoute] int id) => store.Delete(id) ? NoContent() : NotFound();
}
