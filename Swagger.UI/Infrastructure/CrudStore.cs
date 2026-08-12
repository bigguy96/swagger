using System.Collections.Concurrent;
using Swagger.UI.Models;

namespace Swagger.UI.Infrastructure;

public sealed class CrudStore<T>(IEnumerable<T> seed) where T : class, IEntity
{
    private readonly ConcurrentDictionary<int, T> _items = new(seed.ToDictionary(item => item.Id));
    private int _nextId = seed.Select(item => item.Id).DefaultIfEmpty().Max();

    public IReadOnlyCollection<T> GetAll() => _items.Values.OrderBy(item => item.Id).ToArray();

    public T? Get(int id) => _items.GetValueOrDefault(id);

    public T Add(T item)
    {
        item.Id = Interlocked.Increment(ref _nextId);
        _items[item.Id] = item;
        return item;
    }

    public bool Update(int id, T item)
    {
        if (!_items.ContainsKey(id)) return false;
        item.Id = id;
        _items[id] = item;
        return true;
    }

    public bool Delete(int id) => _items.TryRemove(id, out _);
}
