using Microsoft.EntityFrameworkCore;
using Restaurante.Domain.Entities;
using Restaurante.Domain.Interfaces;
using Restaurante.Infrastructure.Data;

namespace Restaurante.Infrastructure.Repositories;

public class CashRegisterRepository : Repository<CashRegister>, ICashRegisterRepository
{
    public CashRegisterRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<CashRegister?> GetOpenCashRegisterAsync()
    {
        return await _dbSet
            .Include(cr => cr.User)
            .FirstOrDefaultAsync(cr => cr.IsOpen);
    }
}
