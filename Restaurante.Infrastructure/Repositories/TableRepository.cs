using Microsoft.EntityFrameworkCore;
using Restaurante.Domain.Entities;
using Restaurante.Domain.Interfaces;
using Restaurante.Infrastructure.Data;
using Microsoft.Extensions.Logging;
using System.Diagnostics;

namespace Restaurante.Infrastructure.Repositories;

public class TableRepository : Repository<Table>, ITableRepository
{
    private readonly ILogger<TableRepository>? _logger;

    public TableRepository(AppDbContext context, ILogger<TableRepository>? logger = null) : base(context)
    {
        _logger = logger;
    }

    public async Task<Table?> GetByNumberAsync(int number)
    {
        return await _dbSet.FirstOrDefaultAsync(t => t.Number == number);
    }

    public async Task<IEnumerable<Table>> GetByStatusAsync(Domain.Enums.TableStatus status)
    {
        return await _dbSet.Where(t => t.Status == status).ToListAsync();
    }

    public async Task<IEnumerable<Table>> GetAllWithActiveOrdersAsync()
    {
        var stopwatch = Stopwatch.StartNew();
        var tables = await _dbSet
            .Include(table => table.Orders.Where(order => !order.IsClosed))
                .ThenInclude(order => order.OrderItems)
            .AsNoTracking()
            .ToListAsync();
        _logger?.LogInformation("Tables list database query returned {Count} tables in {ElapsedMs} ms", tables.Count, stopwatch.ElapsedMilliseconds);
        return tables;
    }

    public async Task OpenWithOrderAsync(Table table, Order order)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            _context.Orders.Add(order);
            _dbSet.Update(table);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (DbUpdateException exception)
        {
            await transaction.RollbackAsync();
            throw new InvalidOperationException("Table was opened by another user.", exception);
        }
    }
}
