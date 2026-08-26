using Restaurante.Domain.Entities;

namespace Restaurante.Domain.Interfaces;

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByUsernameAsync(string username);
}
