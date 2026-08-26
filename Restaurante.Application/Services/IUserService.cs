using Restaurante.Application.DTOs;

namespace Restaurante.Application.Services;

public interface IUserService
{
    Task<UserDto> GetByIdAsync(int id);
    Task<IEnumerable<UserDto>> GetAllAsync();
    Task<UserDto> CreateAsync(CreateUserDto dto);
    Task<UserDto> UpdateAsync(int id, UpdateUserDto dto);
    Task DeleteAsync(int id);
    Task<string?> LoginAsync(LoginDto dto);
    Task<UserDto> ValidateCredentialsAsync(LoginDto dto);
}
