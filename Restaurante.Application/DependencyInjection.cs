using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Restaurante.Application.DTOs;
using Restaurante.Application.Services;
using Restaurante.Application.Validators;

namespace Restaurante.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // Validators
        services.AddScoped<IValidator<CreateUserDto>, CreateUserDtoValidator>();
        services.AddScoped<IValidator<UpdateUserDto>, UpdateUserDtoValidator>();
        services.AddScoped<IValidator<LoginDto>, LoginDtoValidator>();
        
        services.AddScoped<IValidator<CreateCategoryDto>, CreateCategoryDtoValidator>();
        services.AddScoped<IValidator<UpdateCategoryDto>, UpdateCategoryDtoValidator>();
        
        services.AddScoped<IValidator<CreateProductDto>, CreateProductDtoValidator>();
        services.AddScoped<IValidator<UpdateProductDto>, UpdateProductDtoValidator>();
        
        services.AddScoped<IValidator<CreateTableDto>, CreateTableDtoValidator>();
        services.AddScoped<IValidator<UpdateTableDto>, UpdateTableDtoValidator>();
        services.AddScoped<IValidator<OpenTableDto>, OpenTableDtoValidator>();
        
        services.AddScoped<IValidator<CreateOrderDto>, CreateOrderDtoValidator>();
        services.AddScoped<IValidator<AddOrderItemDto>, AddOrderItemDtoValidator>();
        services.AddScoped<IValidator<UpdateOrderItemDto>, UpdateOrderItemDtoValidator>();
        services.AddScoped<IValidator<CloseOrderDto>, CloseOrderDtoValidator>();
        
        services.AddScoped<IValidator<OpenCashRegisterDto>, OpenCashRegisterDtoValidator>();
        services.AddScoped<IValidator<CloseCashRegisterDto>, CloseCashRegisterDtoValidator>();

        // Services
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<ITableService, TableService>();
        services.AddScoped<IOrderService, OrderService>();
        services.AddScoped<ICashRegisterService, CashRegisterService>();
        services.AddScoped<ICashClosingService, CashClosingService>();

        return services;
    }
}
