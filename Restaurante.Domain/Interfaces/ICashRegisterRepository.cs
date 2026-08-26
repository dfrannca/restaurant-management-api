using Restaurante.Domain.Entities;

namespace Restaurante.Domain.Interfaces;

public interface ICashRegisterRepository : IRepository<CashRegister>
{
    Task<CashRegister?> GetOpenCashRegisterAsync();
}
