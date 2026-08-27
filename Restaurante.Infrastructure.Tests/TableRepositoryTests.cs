using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Restaurante.Domain.Entities;
using Restaurante.Infrastructure.Data;
using Restaurante.Infrastructure.Repositories;
using Xunit;

namespace Restaurante.Infrastructure.Tests;

public sealed class TableRepositoryTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<AppDbContext> _options;

    public TableRepositoryTests()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
        _options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        using var context = new AppDbContext(_options);
        context.Database.EnsureCreated();
    }

    [Fact]
    public async Task GetAllWithActiveOrdersAsync_LoadsOnlyActiveOrdersInOneAggregate()
    {
        await using var context = new AppDbContext(_options);
        context.Tables.Add(new Table
        {
            Number = 1,
            Orders =
            [
                new Order { IsClosed = false, TotalAmount = 25 },
                new Order { IsClosed = true, TotalAmount = 10 }
            ]
        });
        await context.SaveChangesAsync();

        var tables = await new TableRepository(context).GetAllWithActiveOrdersAsync();

        var table = Assert.Single(tables);
        var activeOrder = Assert.Single(table.Orders);
        Assert.Equal(25, activeOrder.TotalAmount);
        Assert.False(activeOrder.IsClosed);
    }

    [Fact]
    public async Task OpenWithOrderAsync_RejectsSecondActiveOrderForSameTable()
    {
        int tableId;
        await using (var firstContext = new AppDbContext(_options))
        {
            var table = new Table { Number = 1, Status = Domain.Enums.TableStatus.Occupied };
            firstContext.Tables.Add(table);
            await firstContext.SaveChangesAsync();
            tableId = table.Id;
            await new TableRepository(firstContext).OpenWithOrderAsync(table, new Order { TableId = tableId });
        }

        await using var secondContext = new AppDbContext(_options);
        var duplicateTable = await secondContext.Tables.SingleAsync(table => table.Id == tableId);
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            new TableRepository(secondContext).OpenWithOrderAsync(duplicateTable, new Order { TableId = tableId }));

        Assert.Contains("another user", exception.Message);
        Assert.Equal(1, await secondContext.Orders.CountAsync(order => !order.IsClosed));
    }

    [Fact]
    public async Task AddItemAndUpdateTotalAsync_PersistsItemAndRecalculatesOrderTotal()
    {
        await using var context = new AppDbContext(_options);
        var category = new Category { Name = "Teste" };
        var product = new Product { Name = "Produto teste", Description = "Teste", Price = 12.50m, Category = category };
        var order = new Order { Table = new Table { Number = 1 }, TotalAmount = 0 };
        context.Products.Add(product);
        context.Orders.Add(order);
        await context.SaveChangesAsync();

        var item = new OrderItem { OrderId = order.Id, ProductId = product.Id, UnitPrice = product.Price, Quantity = 2, Subtotal = 25m };
        await new OrderRepository(context).AddItemAndUpdateTotalAsync(order, item);

        Assert.Equal(25m, order.TotalAmount);
        Assert.Equal(1, await context.OrderItems.CountAsync());
    }

    public void Dispose() => _connection.Dispose();
}
