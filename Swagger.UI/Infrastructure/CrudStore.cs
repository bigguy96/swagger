using System.Collections.Concurrent;
using Swagger.UI.Models;

namespace Swagger.UI.Infrastructure;

/// <summary>Provides an in-memory, thread-safe store for entities.</summary>
/// <typeparam name="T">The entity type managed by the store.</typeparam>
public sealed class CrudStore<T> where T : class, IEntity
{
    private readonly ConcurrentDictionary<int, T> _items;
    private int _nextId;

    /// <summary>Initializes a store with the supplied entities.</summary>
    /// <param name="seed">The initial entities used to populate the store.</param>
    public CrudStore(IEnumerable<T> seed)
    {
        var items = seed.ToArray();
        _items = new ConcurrentDictionary<int, T>(items.ToDictionary(item => item.Id));
        _nextId = items.Select(item => item.Id).DefaultIfEmpty().Max();
    }

    /// <summary>Gets all entities ordered by identifier.</summary>
    /// <returns>A read-only collection containing all entities.</returns>
    public IReadOnlyCollection<T> GetAll() => _items.Values.OrderBy(item => item.Id).ToArray();

    /// <summary>Gets an entity by identifier.</summary>
    /// <param name="id">The entity identifier.</param>
    /// <returns>The matching entity, or <see langword="null"/> when it does not exist.</returns>
    public T? Get(int id) => _items.GetValueOrDefault(id);

    /// <summary>Adds an entity and assigns it a new identifier.</summary>
    /// <param name="item">The entity to add.</param>
    /// <returns>The added entity with its assigned identifier.</returns>
    public T Add(T item)
    {
        item.Id = Interlocked.Increment(ref _nextId);
        _items[item.Id] = item;
        return item;
    }

    /// <summary>Replaces an existing entity.</summary>
    /// <param name="id">The identifier of the entity to replace.</param>
    /// <param name="item">The replacement entity.</param>
    /// <returns><see langword="true"/> when the entity was updated; otherwise, <see langword="false"/>.</returns>
    public bool Update(int id, T item)
    {
        if (!_items.ContainsKey(id)) return false;
        item.Id = id;
        _items[id] = item;
        return true;
    }

    /// <summary>Deletes an entity by identifier.</summary>
    /// <param name="id">The identifier of the entity to delete.</param>
    /// <returns><see langword="true"/> when the entity was deleted; otherwise, <see langword="false"/>.</returns>
    public bool Delete(int id) => _items.TryRemove(id, out _);
}
