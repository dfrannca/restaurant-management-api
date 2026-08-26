using Restaurante.Application.DTOs;

namespace Restaurante.Application.Services;

public interface IProductService
{
    Task<ProductDto> GetByIdAsync(int id);
    Task<IEnumerable<ProductDto>> GetAllAsync();
    Task<IEnumerable<ProductDto>> GetByCategoryAsync(int categoryId);
    Task<IEnumerable<ProductDto>> GetActiveProductsAsync();
    Task<ProductDto> CreateAsync(CreateProductDto dto);
    Task<ProductDto> UpdateAsync(int id, UpdateProductDto dto);
    Task DeleteAsync(int id);
}
