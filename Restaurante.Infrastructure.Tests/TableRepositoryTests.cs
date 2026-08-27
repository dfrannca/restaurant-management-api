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

    public void Dispose() => _connection.Dispose();
}
