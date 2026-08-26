using Restaurante.Application.DTOs;

namespace Restaurante.Application.Services;

public interface ITableService
{
    Task<TableDto> GetByIdAsync(int id);
    Task<IEnumerable<TableDto>> GetAllAsync();
    Task<TableDto> CreateAsync(CreateTableDto dto);
    Task<TableDto> UpdateAsync(int id, UpdateTableDto dto);
    Task DeleteAsync(int id);
    Task<TableDto> OpenTableAsync(int id, OpenTableDto dto);
    Task<TableDto> CloseTableAsync(int id);
}
