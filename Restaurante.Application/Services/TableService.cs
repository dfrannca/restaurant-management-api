using FluentValidation;
using Restaurante.Application.DTOs;
using Restaurante.Domain.Entities;
using Restaurante.Domain.Interfaces;
using Microsoft.Extensions.Logging;
using System.Diagnostics;

namespace Restaurante.Application.Services;

public class TableService : ITableService
{
    private readonly ITableRepository _tableRepository;
    private readonly IOrderRepository _orderRepository;
    private readonly ICashRegisterRepository _cashRegisterRepository;
    private readonly IValidator<CreateTableDto> _createValidator;
    private readonly IValidator<UpdateTableDto> _updateValidator;
    private readonly IValidator<OpenTableDto> _openValidator;
    private readonly ILogger<TableService> _logger;

    public TableService(
        ITableRepository tableRepository,
        IOrderRepository orderRepository,
        ICashRegisterRepository cashRegisterRepository,
        IValidator<CreateTableDto> createValidator,
        IValidator<UpdateTableDto> updateValidator,
        IValidator<OpenTableDto> openValidator,
        ILogger<TableService> logger)
    {
        _tableRepository = tableRepository;
        _orderRepository = orderRepository;
        _cashRegisterRepository = cashRegisterRepository;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _openValidator = openValidator;
        _logger = logger;
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
        var stopwatch = Stopwatch.StartNew();
        _logger.LogInformation("Tables list: database query started at {StartedAt}", DateTime.UtcNow);
        var tables = await _tableRepository.GetAllWithActiveOrdersAsync();
        var result = tables.Select(table => MapToDto(table, table.Orders.FirstOrDefault())).ToList();
        _logger.LogInformation("Tables list: database query completed at {CompletedAt}, {ElapsedMs} ms, {Count} tables", DateTime.UtcNow, stopwatch.ElapsedMilliseconds, result.Count);
        return result;
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
        var stopwatch = Stopwatch.StartNew();
        await _openValidator.ValidateAndThrowAsync(dto);
        _logger.LogInformation("Table opening {TableId}: validation completed at {ElapsedMs} ms", id, stopwatch.ElapsedMilliseconds);

        var openCashRegister = await _cashRegisterRepository.GetOpenCashRegisterAsync();
        _logger.LogInformation("Table opening {TableId}: cash register lookup completed at {ElapsedMs} ms", id, stopwatch.ElapsedMilliseconds);
        if (openCashRegister == null)
            throw new InvalidOperationException("Não é permitido abrir mesas/pedidos sem um caixa aberto.");

        var table = await _tableRepository.GetByIdAsync(id);
        _logger.LogInformation("Table opening {TableId}: table lookup completed at {ElapsedMs} ms", id, stopwatch.ElapsedMilliseconds);
        if (table == null)
            throw new KeyNotFoundException($"Table with ID {id} not found");

        if (table.Status != Domain.Enums.TableStatus.Free)
            throw new InvalidOperationException("Table is not available");

        var activeOrder = await _orderRepository.GetActiveOrderByTableIdAsync(id);
        _logger.LogInformation("Table opening {TableId}: active order lookup completed at {ElapsedMs} ms", id, stopwatch.ElapsedMilliseconds);
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

        table.Status = Domain.Enums.TableStatus.Occupied;
        table.UpdatedAt = DateTime.UtcNow;
        await _tableRepository.OpenWithOrderAsync(table, order);
        _logger.LogInformation("Table opening {TableId}: transaction committed at {ElapsedMs} ms", id, stopwatch.ElapsedMilliseconds);

        return MapToDto(table, order);
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
        return MapToDto(table, activeOrder);
    }

    private static TableDto MapToDto(Table table, Order? activeOrder)
    {
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
