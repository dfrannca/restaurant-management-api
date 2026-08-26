using Restaurante.Domain.Enums;

namespace Restaurante.Domain.Entities;

public class User : BaseEntity
{
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Cashier;
    public string? Email { get; set; }
}
