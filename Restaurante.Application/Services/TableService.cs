using FluentValidation;
using Restaurante.Application.DTOs;
using Restaurante.Domain.Entities;
using Restaurante.Domain.Interfaces;

namespace Restaurante.Application.Services;

public class TableService : ITableService
{
    private readonly ITableRepository _tableRepository;
    private readonly IOrderRepository _orderRepository;
    private readonly ICashRegisterRepository _cashRegisterRepository;
    private readonly IValidator<CreateTableDto> _createValidator;
    private readonly IValidator<UpdateTableDto> _updateValidator;
    private readonly IValidator<OpenTableDto> _openValidator;

    public TableService(
        ITableRepository tableRepository,
        IOrderRepository orderRepository,
        ICashRegisterRepository cashRegisterRepository,
        IValidator<CreateTableDto> createValidator,
        IValidator<UpdateTableDto> updateValidator,
        IValidator<OpenTableDto> openValidator)
    {
        _tableRepository = tableRepository;
        _orderRepository = orderRepository;
        _cashRegisterRepository = cashRegisterRepository;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _openValidator = openValidator;
    }

    public async Task<TableDto> GetByIdAsync(int id)
    {
        var table = await _tableRepository.GetByIdAsync(id);
        if (table == null)
            throw new KeyNotFoundException($"Table with ID {id} not found");

        return await MapToDtoAsync(table);
    }

    public async Task<IEnumerable<TableDto>> GetAllAsync()
    {
        var tables = await _tableRepository.GetAllAsync();
        var dtos = new List<TableDto>();
        
        foreach (var table in tables)
        {
            dtos.Add(await MapToDtoAsync(table));
        }
        
        return dtos;
    }

    public async Task<TableDto> CreateAsync(CreateTableDto dto)
    {
        await _createValidator.ValidateAndThrowAsync(dto);

        var existingTable = await _tableRepository.GetByNumberAsync(dto.Number);
        if (existingTable != null)
            throw new InvalidOperationException($"Table with number {dto.Number} already exists");

        var table = new Table
        {
            Number = dto.Number,
            Capacity = dto.Capacity,
            Location = dto.Location,
            Status = Domain.Enums.TableStatus.Free
        };

        await _tableRepository.AddAsync(table);
        return await MapToDtoAsync(table);
    }

    public async Task<TableDto> UpdateAsync(int id, UpdateTableDto dto)
    {
        await _updateValidator.ValidateAndThrowAsync(dto);

        var table = await _tableRepository.GetByIdAsync(id);
        if (table == null)
            throw new KeyNotFoundException($"Table with ID {id} not found");

        table.Capacity = dto.Capacity;
        table.Location = dto.Location;
        table.UpdatedAt = DateTime.UtcNow;

        await _tableRepository.UpdateAsync(table);
        return await MapToDtoAsync(table);
    }

    public async Task DeleteAsync(int id)
    {
        var table = await _tableRepository.GetByIdAsync(id);
        if (table == null)
            throw new KeyNotFoundException($"Table with ID {id} not found");

        var activeOrder = await _orderRepository.GetActiveOrderByTableIdAsync(id);
        if (activeOrder != null)
            throw new InvalidOperationException("Cannot delete a table with an active order");

        await _tableRepository.DeleteAsync(table);
    }

    public async Task<TableDto> OpenTableAsync(int id, OpenTableDto dto)
    {
        await _openValidator.ValidateAndThrowAsync(dto);

        var openCashRegister = await _cashRegisterRepository.GetOpenCashRegisterAsync();
        if (openCashRegister == null)
            throw new InvalidOperationException("Não é permitido abrir mesas/pedidos sem um caixa aberto.");

        var table = await _tableRepository.GetByIdAsync(id);
        if (table == null)
            throw new KeyNotFoundException($"Table with ID {id} not found");

        if (table.Status != Domain.Enums.TableStatus.Free)
            throw new InvalidOperationException("Table is not available");

        var activeOrder = await _orderRepository.GetActiveOrderByTableIdAsync(id);
        if (activeOrder != null)
            throw new InvalidOperationException("Table already has an active order");

        var order = new Order
        {
            TableId = id,
            CustomerName = dto.CustomerName,
            Observations = dto.Observations,
            OpenedAt = DateTime.UtcNow,
            TotalAmount = 0,
            IsClosed = false,
            CashRegisterId = openCashRegister.Id
        };

        await _orderRepository.AddAsync(order);

        table.Status = Domain.Enums.TableStatus.Occupied;
        table.UpdatedAt = DateTime.UtcNow;
        await _tableRepository.UpdateAsync(table);

        return await MapToDtoAsync(table);
    }

    public async Task<TableDto> CloseTableAsync(int id)
    {
        var table = await _tableRepository.GetByIdAsync(id);
        if (table == null)
            throw new KeyNotFoundException($"Table with ID {id} not found");

        if (table.Status == Domain.Enums.TableStatus.Free)
            throw new InvalidOperationException("Table is already free");

        var activeOrder = await _orderRepository.GetActiveOrderByTableIdAsync(id);
        if (activeOrder != null && !activeOrder.IsClosed)
            throw new InvalidOperationException("Cannot close table with an unclosed order");

        table.Status = Domain.Enums.TableStatus.Free;
        table.UpdatedAt = DateTime.UtcNow;
        await _tableRepository.UpdateAsync(table);

        return await MapToDtoAsync(table);
    }

    private async Task<TableDto> MapToDtoAsync(Table table)
    {
        var activeOrder = await _orderRepository.GetActiveOrderByTableIdAsync(table.Id);
        
        return new TableDto
        {
            Id = table.Id,
            Number = table.Number,
            Status = table.Status,
            Capacity = table.Capacity,
            Location = table.Location,
            CurrentTotal = activeOrder?.TotalAmount ?? 0,
            OpenedAt = activeOrder?.OpenedAt,
            CustomerName = activeOrder?.CustomerName
        };
    }
}
