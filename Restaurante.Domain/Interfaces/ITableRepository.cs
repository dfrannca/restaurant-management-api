using Restaurante.Domain.Entities;

namespace Restaurante.Domain.Interfaces;

public interface ITableRepository : IRepository<Table>
{
    Task<Table?> GetByNumberAsync(int number);
    Task<IEnumerable<Table>> GetByStatusAsync(Domain.Enums.TableStatus status);
    Task<IEnumerable<Table>> GetAllWithActiveOrdersAsync();
    Task OpenWithOrderAsync(Table table, Order order);
}
