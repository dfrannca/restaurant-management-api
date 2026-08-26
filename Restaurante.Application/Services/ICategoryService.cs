using Restaurante.Application.DTOs;

namespace Restaurante.Application.Services;

public interface ICategoryService
{
    Task<CategoryDto> GetByIdAsync(int id);
    Task<IEnumerable<CategoryDto>> GetAllAsync();
    Task<CategoryDto> CreateAsync(CreateCategoryDto dto);
    Task<CategoryDto> UpdateAsync(int id, UpdateCategoryDto dto);
    Task DeleteAsync(int id);
}
