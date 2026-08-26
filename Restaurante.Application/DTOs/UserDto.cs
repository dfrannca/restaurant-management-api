using Restaurante.Domain.Enums;

namespace Restaurante.Application.DTOs;

public class UserDto
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public string? Email { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }
}

public class CreateUserDto
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Cashier;
    public string? Email { get; set; }
}

public class UpdateUserDto
{
    public string Name { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public string? Email { get; set; }
    public bool IsActive { get; set; }
}

public class LoginDto
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
