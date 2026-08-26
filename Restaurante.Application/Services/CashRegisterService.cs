using FluentValidation;
using Restaurante.Application.DTOs;
using Restaurante.Domain.Entities;
using Restaurante.Domain.Interfaces;

namespace Restaurante.Application.Services;

public class CashRegisterService : ICashRegisterService
{
    private readonly ICashRegisterRepository _cashRegisterRepository;
    private readonly IUserRepository _userRepository;
    private readonly IOrderRepository _orderRepository;
    private readonly ICashClosingRepository _cashClosingRepository;
    private readonly ITableRepository _tableRepository;
    private readonly IValidator<OpenCashRegisterDto> _openValidator;
    private readonly IValidator<CloseCashRegisterDto> _closeValidator;

    public CashRegisterService(
        ICashRegisterRepository cashRegisterRepository,
        IUserRepository userRepository,
        IOrderRepository orderRepository,
        ICashClosingRepository cashClosingRepository,
        ITableRepository tableRepository,
        IValidator<OpenCashRegisterDto> openValidator,
        IValidator<CloseCashRegisterDto> closeValidator)
    {
        _cashRegisterRepository = cashRegisterRepository;
        _userRepository = userRepository;
        _orderRepository = orderRepository;
        _cashClosingRepository = cashClosingRepository;
        _tableRepository = tableRepository;
        _openValidator = openValidator;
        _closeValidator = closeValidator;
    }

    public async Task<CashRegisterDto> GetOpenCashRegisterAsync()
    {
        var cashRegister = await _cashRegisterRepository.GetOpenCashRegisterAsync();
        if (cashRegister == null)
            throw new KeyNotFoundException("No open cash register found");

        return await MapToDtoAsync(cashRegister);
    }

    public async Task<CashRegisterDto> OpenCashRegisterAsync(OpenCashRegisterDto dto, int userId)
    {
        await _openValidator.ValidateAndThrowAsync(dto);

        var existingOpen = await _cashRegisterRepository.GetOpenCashRegisterAsync();
        if (existingOpen != null)
            throw new InvalidOperationException("A cash register is already open");

        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
            throw new KeyNotFoundException($"User with ID {userId} not found");

        var cashRegister = new CashRegister
        {
            OpenedAt = DateTime.UtcNow,
            OpeningBalance = dto.OpeningBalance,
            ClosingBalance = 0,
            IsOpen = true,
            UserId = userId
        };

        await _cashRegisterRepository.AddAsync(cashRegister);
        return await MapToDtoAsync(cashRegister);
    }

    public async Task<CashRegisterSummaryDto> GetCurrentSummaryAsync()
    {
        var cashRegister = await _cashRegisterRepository.GetOpenCashRegisterAsync();
        if (cashRegister == null)
            throw new KeyNotFoundException("No open cash register found");

        var closedOrders = await _orderRepository.FindAsync(o => o.CashRegisterId == cashRegister.Id && o.IsClosed);
        
        var totalSold = closedOrders.Sum(o => o.TotalAmount);
        var totalOrders = closedOrders.Count();
        var totalPix = closedOrders.Where(o => o.PaymentMethod == Domain.Enums.PaymentMethod.Pix).Sum(o => o.TotalAmount);
        var totalCash = closedOrders.Where(o => o.PaymentMethod == Domain.Enums.PaymentMethod.Cash).Sum(o => o.TotalAmount);
        var totalDebit = closedOrders.Where(o => o.PaymentMethod == Domain.Enums.PaymentMethod.DebitCard).Sum(o => o.TotalAmount);
        var totalCredit = closedOrders.Where(o => o.PaymentMethod == Domain.Enums.PaymentMethod.CreditCard).Sum(o => o.TotalAmount);
        var averageTicket = totalOrders > 0 ? totalSold / totalOrders : 0;

        var user = await _userRepository.GetByIdAsync(cashRegister.UserId);
        
        var orderDtos = new List<OrderDto>();
        foreach (var order in closedOrders)
        {
            var table = await _tableRepository.GetByIdAsync(order.TableId);
            orderDtos.Add(new OrderDto
            {
                Id = order.Id,
                TableId = order.TableId,
                TableNumber = table?.Number ?? 0,
                CustomerName = order.CustomerName,
                Observations = order.Observations,
                OpenedAt = order.OpenedAt,
                ClosedAt = order.ClosedAt,
                TotalAmount = order.TotalAmount,
                PaymentMethod = order.PaymentMethod,
                IsClosed = order.IsClosed,
                CashRegisterId = order.CashRegisterId,
                UserId = order.UserId,
                UserName = user?.Name
            });
        }

        return new CashRegisterSummaryDto
        {
            CashRegisterId = cashRegister.Id,
            OpenedAt = cashRegister.OpenedAt,
            OpeningBalance = cashRegister.OpeningBalance,
            UserName = user?.Name ?? string.Empty,
            TotalSold = totalSold,
            TotalOrders = totalOrders,
            TotalPix = totalPix,
            TotalCash = totalCash,
            TotalDebit = totalDebit,
            TotalCredit = totalCredit,
            AverageTicket = averageTicket,
            ClosedOrders = orderDtos
        };
    }

    public async Task<CashRegisterDto> CloseCashRegisterAsync(CloseCashRegisterDto dto)
    {
        await _closeValidator.ValidateAndThrowAsync(dto);

        var cashRegister = await _cashRegisterRepository.GetOpenCashRegisterAsync();
        if (cashRegister == null)
            throw new KeyNotFoundException("No open cash register found");

        // Verify that no tables are open before closing the cash register
        var openTables = await _tableRepository.FindAsync(t => t.Status != Domain.Enums.TableStatus.Free);
        if (openTables.Any())
            throw new InvalidOperationException("Não é permitido fechar o caixa enquanto houver mesas abertas.");

        var closedOrders = await _orderRepository.FindAsync(o => o.CashRegisterId == cashRegister.Id && o.IsClosed);
        
        var totalSold = closedOrders.Sum(o => o.TotalAmount);
        var totalOrders = closedOrders.Count();
        var totalPix = closedOrders.Where(o => o.PaymentMethod == Domain.Enums.PaymentMethod.Pix).Sum(o => o.TotalAmount);
        var totalCash = closedOrders.Where(o => o.PaymentMethod == Domain.Enums.PaymentMethod.Cash).Sum(o => o.TotalAmount);
        var totalDebit = closedOrders.Where(o => o.PaymentMethod == Domain.Enums.PaymentMethod.DebitCard).Sum(o => o.TotalAmount);
        var totalCredit = closedOrders.Where(o => o.PaymentMethod == Domain.Enums.PaymentMethod.CreditCard).Sum(o => o.TotalAmount);
        var averageTicket = totalOrders > 0 ? totalSold / totalOrders : 0;

        var cashClosing = new CashClosing
        {
            CashRegisterId = cashRegister.Id,
            ClosingDate = DateTime.UtcNow,
            TotalSold = totalSold,
            TotalOrders = totalOrders,
            TotalPix = totalPix,
            TotalCash = totalCash,
            TotalDebit = totalDebit,
            TotalCredit = totalCredit,
            AverageTicket = averageTicket,
            CashRegisterOpenedAt = cashRegister.OpenedAt,
            CashRegisterClosedAt = DateTime.UtcNow
        };

        await _cashClosingRepository.AddAsync(cashClosing);

        cashRegister.ClosingBalance = dto.ClosingBalance;
        cashRegister.ClosedAt = DateTime.UtcNow;
        cashRegister.IsOpen = false;
        cashRegister.UpdatedAt = DateTime.UtcNow;

        await _cashRegisterRepository.UpdateAsync(cashRegister);

        return await MapToDtoAsync(cashRegister);
    }

    private async Task<CashRegisterDto> MapToDtoAsync(CashRegister cashRegister)
    {
        var user = await _userRepository.GetByIdAsync(cashRegister.UserId);
        
        return new CashRegisterDto
        {
            Id = cashRegister.Id,
            OpenedAt = cashRegister.OpenedAt,
            ClosedAt = cashRegister.ClosedAt,
            OpeningBalance = cashRegister.OpeningBalance,
            ClosingBalance = cashRegister.ClosingBalance,
            IsOpen = cashRegister.IsOpen,
            UserName = user?.Name ?? string.Empty
        };
    }
}
