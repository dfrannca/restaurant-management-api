using Microsoft.EntityFrameworkCore;
using Restaurante.Domain.Entities;
using Restaurante.Domain.Interfaces;
using Restaurante.Infrastructure.Data;

namespace Restaurante.Infrastructure.Repositories;

public class TableRepository : Repository<Table>, ITableRepository
{
    public TableRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<Table?> GetByNumberAsync(int number)
    {
        return await _dbSet.FirstOrDefaultAsync(t => t.Number == number);
    }

    public async Task<IEnumerable<Table>> GetByStatusAsync(Domain.Enums.TableStatus status)
    {
        return await _dbSet.Where(t => t.Status == status).ToListAsync();
    }
}
