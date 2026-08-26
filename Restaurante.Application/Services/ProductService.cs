using FluentValidation;
using Restaurante.Application.DTOs;
using Restaurante.Domain.Entities;
using Restaurante.Domain.Interfaces;

namespace Restaurante.Application.Services;

public class ProductService : IProductService
{
    private readonly IProductRepository _productRepository;
    private readonly ICategoryRepository _categoryRepository;
    private readonly IValidator<CreateProductDto> _createValidator;
    private readonly IValidator<UpdateProductDto> _updateValidator;

    public ProductService(
        IProductRepository productRepository,
        ICategoryRepository categoryRepository,
        IValidator<CreateProductDto> createValidator,
        IValidator<UpdateProductDto> updateValidator)
    {
        _productRepository = productRepository;
        _categoryRepository = categoryRepository;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    public async Task<ProductDto> GetByIdAsync(int id)
    {
        var product = await _productRepository.GetByIdAsync(id);
        if (product == null)
            throw new KeyNotFoundException($"Product with ID {id} not found");

        return await MapToDtoAsync(product);
    }

    public async Task<IEnumerable<ProductDto>> GetAllAsync()
    {
        var products = await _productRepository.GetAllAsync();
        var dtos = new List<ProductDto>();
        
        foreach (var product in products)
        {
            dtos.Add(await MapToDtoAsync(product));
        }
        
        return dtos;
    }

    public async Task<IEnumerable<ProductDto>> GetByCategoryAsync(int categoryId)
    {
        var products = await _productRepository.GetByCategoryAsync(categoryId);
        var dtos = new List<ProductDto>();
        
        foreach (var product in products)
        {
            dtos.Add(await MapToDtoAsync(product));
        }
        
        return dtos;
    }

    public async Task<IEnumerable<ProductDto>> GetActiveProductsAsync()
    {
        var products = await _productRepository.GetActiveProductsAsync();
        var dtos = new List<ProductDto>();
        
        foreach (var product in products)
        {
            dtos.Add(await MapToDtoAsync(product));
        }
        
        return dtos;
    }

    public async Task<ProductDto> CreateAsync(CreateProductDto dto)
    {
        await _createValidator.ValidateAndThrowAsync(dto);

        var category = await _categoryRepository.GetByIdAsync(dto.CategoryId);
        if (category == null)
            throw new KeyNotFoundException($"Category with ID {dto.CategoryId} not found");

        var product = new Product
        {
            Name = dto.Name,
            Description = dto.Description,
            Price = dto.Price,
            CategoryId = dto.CategoryId,
            ImageUrl = dto.ImageUrl,
            IsActive = true
        };

        await _productRepository.AddAsync(product);
        return await MapToDtoAsync(product);
    }

    public async Task<ProductDto> UpdateAsync(int id, UpdateProductDto dto)
    {
        await _updateValidator.ValidateAndThrowAsync(dto);

        var product = await _productRepository.GetByIdAsync(id);
        if (product == null)
            throw new KeyNotFoundException($"Product with ID {id} not found");

        var category = await _categoryRepository.GetByIdAsync(dto.CategoryId);
        if (category == null)
            throw new KeyNotFoundException($"Category with ID {dto.CategoryId} not found");

        product.Name = dto.Name;
        product.Description = dto.Description;
        product.Price = dto.Price;
        product.CategoryId = dto.CategoryId;
        product.ImageUrl = dto.ImageUrl;
        product.IsActive = dto.IsActive;
        product.UpdatedAt = DateTime.UtcNow;

        await _productRepository.UpdateAsync(product);
        return await MapToDtoAsync(product);
    }

    public async Task DeleteAsync(int id)
    {
        var product = await _productRepository.GetByIdAsync(id);
        if (product == null)
            throw new KeyNotFoundException($"Product with ID {id} not found");

        await _productRepository.DeleteAsync(product);
    }

    private async Task<ProductDto> MapToDtoAsync(Product product)
    {
        var category = await _categoryRepository.GetByIdAsync(product.CategoryId);
        
        return new ProductDto
        {
            Id = product.Id,
            Name = product.Name,
            Description = product.Description,
            Price = product.Price,
            CategoryId = product.CategoryId,
            CategoryName = category?.Name,
            ImageUrl = product.ImageUrl,
            CreatedAt = product.CreatedAt,
            IsActive = product.IsActive
        };
    }
}
