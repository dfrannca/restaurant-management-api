using Restaurante.Domain.Entities;

namespace Restaurante.Domain.Interfaces;

public interface ICashClosingRepository : IRepository<CashClosing>
{
    Task<IEnumerable<CashClosing>> GetByDateRangeAsync(DateTime startDate, DateTime endDate);
}
