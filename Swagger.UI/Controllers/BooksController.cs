using Microsoft.AspNetCore.Mvc;
using Swagger.UI.Infrastructure;
using Swagger.UI.Models;

namespace Swagger.UI.Controllers;

/// <summary>Provides endpoints for managing books.</summary>
[ApiController]
[Route("api/books")]
public sealed class BooksController(CrudStore<Book> store) : ControllerBase
{
    /// <summary>Gets books, optionally filtered by title and limited to the requested page size.</summary>
    /// <param name="title">Optional text to search for in book titles.</param>
    /// <param name="limit">Maximum number of books to return, clamped between 1 and 100.</param>
    /// <returns>The matching books.</returns>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<Book>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<Book>> GetAll([FromQuery] string? title = null, [FromQuery] int limit = 50)
    {
        var books = store.GetAll().Where(book => title is null || book.Title.Contains(title, StringComparison.OrdinalIgnoreCase));
        return Ok(books.Take(Math.Clamp(limit, 1, 100)));
    }

    /// <summary>Gets a book by its identifier.</summary>
    /// <param name="id">The unique identifier of the book.</param>
    /// <returns>The requested book, or 404 if it does not exist.</returns>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(Book), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<Book> GetById([FromRoute] int id) => store.Get(id) is { } book ? Ok(book) : NotFound();

    /// <summary>Creates a new book.</summary>
    /// <param name="request">The book details to create.</param>
    /// <returns>The created book.</returns>
    [HttpPost]
    [ProducesResponseType(typeof(Book), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<Book> Create([FromBody] BookRequest request)
    {
        var book = store.Add(new Book { Id = 0, Title = request.Title, Author = request.Author, Genre = request.Genre, PublishedYear = request.PublishedYear });
        return CreatedAtAction(nameof(GetById), new { id = book.Id }, book);
    }

    /// <summary>Updates an existing book.</summary>
    /// <param name="id">The unique identifier of the book to update.</param>
    /// <param name="request">The updated book details.</param>
    /// <returns>The updated book, or 404 if the book does not exist.</returns>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(Book), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<Book> Update([FromRoute] int id, [FromBody] BookRequest request)
    {
        var book = new Book { Id = id, Title = request.Title, Author = request.Author, Genre = request.Genre, PublishedYear = request.PublishedYear };
        return store.Update(id, book) ? Ok(book) : NotFound();
    }

    /// <summary>Deletes a book by its identifier.</summary>
    /// <param name="id">The unique identifier of the book to delete.</param>
    /// <returns>No content if deleted, or 404 if the book does not exist.</returns>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult Delete([FromRoute] int id) => store.Delete(id) ? NoContent() : NotFound();
}
