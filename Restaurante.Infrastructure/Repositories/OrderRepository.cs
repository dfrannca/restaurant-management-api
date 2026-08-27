using Microsoft.EntityFrameworkCore;
using Restaurante.Domain.Entities;
using Restaurante.Domain.Interfaces;
using Restaurante.Infrastructure.Data;

namespace Restaurante.Infrastructure.Repositories;

public class OrderRepository : Repository<Order>, IOrderRepository
{
    public OrderRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Order>> GetByTableIdAsync(int tableId)
    {
        return await _dbSet
            .Include(o => o.OrderItems)
            .ThenInclude(oi => oi.Product)
            .Include(o => o.Table)
            .Where(o => o.TableId == tableId)
            .ToListAsync();
    }

    public async Task<IEnumerable<Order>> GetClosedOrdersAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        var query = _dbSet
            .Include(o => o.OrderItems)
            .ThenInclude(oi => oi.Product)
            .Include(o => o.Table)
            .Where(o => o.IsClosed);

        if (startDate.HasValue)
        {
            query = query.Where(o => o.ClosedAt >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(o => o.ClosedAt <= endDate.Value);
        }

        return await query.OrderByDescending(o => o.ClosedAt).ToListAsync();
    }

    public async Task<Order?> GetActiveOrderByTableIdAsync(int tableId)
    {
        return await _dbSet
            .Include(o => o.OrderItems)
            .ThenInclude(oi => oi.Product)
            .Include(o => o.Table)
            .FirstOrDefaultAsync(o => o.TableId == tableId && !o.IsClosed);
    }

    public async Task AddItemAndUpdateTotalAsync(Order order, OrderItem item)
    {
        order.OrderItems.Add(item);
        _context.OrderItems.Add(item);
        UpdateTotal(order);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateItemAndTotalAsync(Order order, OrderItem item)
    {
        _context.OrderItems.Update(item);
        UpdateTotal(order);
        await _context.SaveChangesAsync();
    }

    public async Task RemoveItemAndTotalAsync(Order order, OrderItem item)
    {
        _context.OrderItems.Remove(item);
        order.OrderItems.Remove(item);
        UpdateTotal(order);
        await _context.SaveChangesAsync();
    }

    private static void UpdateTotal(Order order)
    {
        order.TotalAmount = order.OrderItems.Sum(orderItem => orderItem.Subtotal);
        order.UpdatedAt = DateTime.UtcNow;
    }

    public override async Task<Order?> GetByIdAsync(int id)
    {
        return await _dbSet
            .Include(o => o.OrderItems)
            .ThenInclude(oi => oi.Product)
            .Include(o => o.Table)
            .FirstOrDefaultAsync(o => o.Id == id);
    }
}
