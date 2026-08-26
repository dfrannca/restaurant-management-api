using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Restaurante.Domain.Interfaces;
using Restaurante.Infrastructure.Data;
using Restaurante.Infrastructure.Repositories;

namespace Restaurante.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<AppDbContext>(options =>
        {
            if (connectionString.StartsWith("Data Source", StringComparison.OrdinalIgnoreCase))
                options.UseSqlite(connectionString);
            else
                options.UseNpgsql(connectionString);
        });

        services.AddScoped<IRepository<Domain.Entities.User>, UserRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        
        services.AddScoped<IRepository<Domain.Entities.Category>, CategoryRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        
        services.AddScoped<IRepository<Domain.Entities.Product>, ProductRepository>();
        services.AddScoped<IProductRepository, ProductRepository>();
        
        services.AddScoped<IRepository<Domain.Entities.Table>, TableRepository>();
        services.AddScoped<ITableRepository, TableRepository>();
        
        services.AddScoped<IRepository<Domain.Entities.Order>, OrderRepository>();
        services.AddScoped<IOrderRepository, OrderRepository>();
        
        services.AddScoped<IRepository<Domain.Entities.OrderItem>, OrderItemRepository>();
        services.AddScoped<IOrderItemRepository, OrderItemRepository>();
        
        services.AddScoped<IRepository<Domain.Entities.CashRegister>, CashRegisterRepository>();
        services.AddScoped<ICashRegisterRepository, CashRegisterRepository>();
        
        services.AddScoped<IRepository<Domain.Entities.CashClosing>, CashClosingRepository>();
        services.AddScoped<ICashClosingRepository, CashClosingRepository>();

        return services;
    }
}
