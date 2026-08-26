using Restaurante.Application.DTOs;

namespace Restaurante.Application.Services;

public interface ICashClosingService
{
    Task<IEnumerable<CashClosingDto>> GetAllAsync();
    Task<IEnumerable<CashClosingDto>> GetByDateRangeAsync(DateTime startDate, DateTime endDate);
    Task<CashClosingDto> GetByIdAsync(int id);
}
