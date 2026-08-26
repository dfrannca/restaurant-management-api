using FluentValidation;
using Restaurante.Application.DTOs;
using Restaurante.Domain.Entities;
using Restaurante.Domain.Interfaces;

namespace Restaurante.Application.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly IValidator<CreateUserDto> _createValidator;
    private readonly IValidator<UpdateUserDto> _updateValidator;
    private readonly IValidator<LoginDto> _loginValidator;

    public UserService(
        IUserRepository userRepository,
        IValidator<CreateUserDto> createValidator,
        IValidator<UpdateUserDto> updateValidator,
        IValidator<LoginDto> loginValidator)
    {
        _userRepository = userRepository;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _loginValidator = loginValidator;
    }

    public async Task<UserDto> GetByIdAsync(int id)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null)
            throw new KeyNotFoundException($"User with ID {id} not found");

        return MapToDto(user);
    }

    public async Task<IEnumerable<UserDto>> GetAllAsync()
    {
        var users = await _userRepository.GetAllAsync();
        return users.Select(MapToDto);
    }

    public async Task<UserDto> CreateAsync(CreateUserDto dto)
    {
        await _createValidator.ValidateAndThrowAsync(dto);

        var existingUser = await _userRepository.GetByUsernameAsync(dto.Username);
        if (existingUser != null)
            throw new InvalidOperationException("Username already exists");

        var user = new User
        {
            Username = dto.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Name = dto.Name,
            Role = dto.Role,
            Email = dto.Email,
            IsActive = true
        };

        await _userRepository.AddAsync(user);
        return MapToDto(user);
    }

    public async Task<UserDto> UpdateAsync(int id, UpdateUserDto dto)
    {
        await _updateValidator.ValidateAndThrowAsync(dto);

        var user = await _userRepository.GetByIdAsync(id);
        if (user == null)
            throw new KeyNotFoundException($"User with ID {id} not found");

        user.Name = dto.Name;
        user.Role = dto.Role;
        user.Email = dto.Email;
        user.IsActive = dto.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user);
        return MapToDto(user);
    }

    public async Task DeleteAsync(int id)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null)
            throw new KeyNotFoundException($"User with ID {id} not found");

        await _userRepository.DeleteAsync(user);
    }

    /// <summary>
    /// Validates the user credentials. Returns the UserDto if valid; throws UnauthorizedAccessException otherwise.
    /// JWT generation is handled by AuthController (API layer).
    /// </summary>
    public async Task<UserDto> ValidateCredentialsAsync(LoginDto dto)
    {
        await _loginValidator.ValidateAndThrowAsync(dto);

        var user = await _userRepository.GetByUsernameAsync(dto.Username);
        if (user == null)
            throw new UnauthorizedAccessException("Usuário ou senha inválidos");

        bool passwordValid;
        try
        {
            passwordValid = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
        }
        catch
        {
            passwordValid = false;
        }

        if (!passwordValid)
            throw new UnauthorizedAccessException("Usuário ou senha inválidos");

        if (!user.IsActive)
            throw new UnauthorizedAccessException("User account is inactive");

        return MapToDto(user);
    }

    // Keep LoginAsync for interface compatibility — delegates to ValidateCredentialsAsync
    public async Task<string?> LoginAsync(LoginDto dto)
    {
        // Credential validation only; token generation is the caller's responsibility.
        // Returning null signals the controller should generate the token.
        await ValidateCredentialsAsync(dto);
        return null;
    }

    private static UserDto MapToDto(User user)
    {
        return new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            Name = user.Name,
            Role = user.Role,
            Email = user.Email,
            CreatedAt = user.CreatedAt,
            IsActive = user.IsActive
        };
    }
}
