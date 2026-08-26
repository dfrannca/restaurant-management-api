using Restaurante.Application.DTOs;

namespace Restaurante.Application.Services;

public interface ICashRegisterService
{
    Task<CashRegisterDto> GetOpenCashRegisterAsync();
    Task<CashRegisterDto> OpenCashRegisterAsync(OpenCashRegisterDto dto, int userId);
    Task<CashRegisterDto> CloseCashRegisterAsync(CloseCashRegisterDto dto);
    Task<CashRegisterSummaryDto> GetCurrentSummaryAsync();
}
