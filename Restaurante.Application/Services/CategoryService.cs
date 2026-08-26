using FluentValidation;
using Restaurante.Application.DTOs;
using Restaurante.Domain.Entities;
using Restaurante.Domain.Interfaces;

namespace Restaurante.Application.Services;

public class CategoryService : ICategoryService
{
    private readonly ICategoryRepository _categoryRepository;
    private readonly IValidator<CreateCategoryDto> _createValidator;
    private readonly IValidator<UpdateCategoryDto> _updateValidator;

    public CategoryService(
        ICategoryRepository categoryRepository,
        IValidator<CreateCategoryDto> createValidator,
        IValidator<UpdateCategoryDto> updateValidator)
    {
        _categoryRepository = categoryRepository;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    public async Task<CategoryDto> GetByIdAsync(int id)
    {
        var category = await _categoryRepository.GetByIdAsync(id);
        if (category == null)
            throw new KeyNotFoundException($"Category with ID {id} not found");

        return MapToDto(category);
    }

    public async Task<IEnumerable<CategoryDto>> GetAllAsync()
    {
        var categories = await _categoryRepository.GetAllAsync();
        return categories.Select(MapToDto);
    }

    public async Task<CategoryDto> CreateAsync(CreateCategoryDto dto)
    {
        await _createValidator.ValidateAndThrowAsync(dto);

        var existingCategory = await _categoryRepository.GetByNameAsync(dto.Name);
        if (existingCategory != null)
            throw new InvalidOperationException("Category with this name already exists");

        var category = new Category
        {
            Name = dto.Name,
            Description = dto.Description,
            IsActive = true
        };

        await _categoryRepository.AddAsync(category);
        return MapToDto(category);
    }

    public async Task<CategoryDto> UpdateAsync(int id, UpdateCategoryDto dto)
    {
        await _updateValidator.ValidateAndThrowAsync(dto);

        var category = await _categoryRepository.GetByIdAsync(id);
        if (category == null)
            throw new KeyNotFoundException($"Category with ID {id} not found");

        var existingCategory = await _categoryRepository.GetByNameAsync(dto.Name);
        if (existingCategory != null && existingCategory.Id != id)
            throw new InvalidOperationException("Category with this name already exists");

        category.Name = dto.Name;
        category.Description = dto.Description;
        category.IsActive = dto.IsActive;
        category.UpdatedAt = DateTime.UtcNow;

        await _categoryRepository.UpdateAsync(category);
        return MapToDto(category);
    }

    public async Task DeleteAsync(int id)
    {
        var category = await _categoryRepository.GetByIdAsync(id);
        if (category == null)
            throw new KeyNotFoundException($"Category with ID {id} not found");

        await _categoryRepository.DeleteAsync(category);
    }

    private static CategoryDto MapToDto(Category category)
    {
        return new CategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Description = category.Description,
            CreatedAt = category.CreatedAt,
            IsActive = category.IsActive
        };
    }
}
