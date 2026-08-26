using Restaurante.Domain.Entities;
using Restaurante.Domain.Interfaces;
using Restaurante.Infrastructure.Data;

namespace Restaurante.Infrastructure.Repositories;

public class OrderItemRepository : Repository<OrderItem>, IOrderItemRepository
{
    public OrderItemRepository(AppDbContext context) : base(context)
    {
    }
}
