using Microsoft.EntityFrameworkCore;
using Restaurante.Domain.Entities;
using Restaurante.Domain.Interfaces;
using Restaurante.Infrastructure.Data;

namespace Restaurante.Infrastructure.Repositories;

public class CashClosingRepository : Repository<CashClosing>, ICashClosingRepository
{
    public CashClosingRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<CashClosing>> GetByDateRangeAsync(DateTime startDate, DateTime endDate)
    {
        return await _dbSet
            .Include(cc => cc.CashRegister)
            .Where(cc => cc.ClosingDate >= startDate && cc.ClosingDate <= endDate)
            .OrderByDescending(cc => cc.ClosingDate)
            .ToListAsync();
    }
}
