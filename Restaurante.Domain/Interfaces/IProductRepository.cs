using Restaurante.Domain.Entities;

namespace Restaurante.Domain.Interfaces;

public interface IProductRepository : IRepository<Product>
{
    Task<IEnumerable<Product>> GetByCategoryAsync(int categoryId);
    Task<IEnumerable<Product>> GetActiveProductsAsync();
}
