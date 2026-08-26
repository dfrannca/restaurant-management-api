using Restaurante.Application.DTOs;

namespace Restaurante.Application.Services;

public interface IOrderService
{
    Task<OrderDto> GetByIdAsync(int id);
    Task<IEnumerable<OrderDto>> GetAllAsync();
    Task<IEnumerable<OrderDto>> GetClosedOrdersAsync(DateTime? startDate = null, DateTime? endDate = null);
    Task<OrderDto> GetActiveOrderByTableIdAsync(int tableId);
    Task<OrderDto> CreateAsync(CreateOrderDto dto);
    Task<OrderDto> AddItemAsync(int orderId, AddOrderItemDto dto);
    Task<OrderDto> UpdateItemAsync(int orderId, int itemId, UpdateOrderItemDto dto);
    Task<OrderDto> RemoveItemAsync(int orderId, int itemId);
    Task<OrderDto> CloseOrderAsync(int id, CloseOrderDto dto);
}
