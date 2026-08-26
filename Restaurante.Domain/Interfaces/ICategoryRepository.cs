using Restaurante.Domain.Entities;

namespace Restaurante.Domain.Interfaces;

public interface ICategoryRepository : IRepository<Category>
{
    Task<Category?> GetByNameAsync(string name);
}
