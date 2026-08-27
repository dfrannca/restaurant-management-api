using Restaurante.Domain.Entities;

namespace Restaurante.Domain.Interfaces;

public interface IOrderRepository : IRepository<Order>
{
    Task<IEnumerable<Order>> GetByTableIdAsync(int tableId);
    Task<IEnumerable<Order>> GetClosedOrdersAsync(DateTime? startDate = null, DateTime? endDate = null);
    Task<Order?> GetActiveOrderByTableIdAsync(int tableId);
    Task AddItemAndUpdateTotalAsync(Order order, OrderItem item);
    Task UpdateItemAndTotalAsync(Order order, OrderItem item);
    Task RemoveItemAndTotalAsync(Order order, OrderItem item);
}
