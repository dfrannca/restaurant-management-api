using Restaurante.Application.DTOs;
using Restaurante.Domain.Interfaces;

namespace Restaurante.Application.Services;

public class CashClosingService : ICashClosingService
{
    private readonly ICashClosingRepository _cashClosingRepository;
    private readonly ICashRegisterRepository _cashRegisterRepository;
    private readonly IOrderRepository _orderRepository;
    private readonly IUserRepository _userRepository;
    private readonly ITableRepository _tableRepository;

    public CashClosingService(
        ICashClosingRepository cashClosingRepository,
        ICashRegisterRepository cashRegisterRepository,
        IOrderRepository orderRepository,
        IUserRepository userRepository,
        ITableRepository tableRepository)
    {
        _cashClosingRepository = cashClosingRepository;
        _cashRegisterRepository = cashRegisterRepository;
        _orderRepository = orderRepository;
        _userRepository = userRepository;
        _tableRepository = tableRepository;
    }

    public async Task<IEnumerable<CashClosingDto>> GetAllAsync()
    {
        var closings = await _cashClosingRepository.GetAllAsync();
        var dtos = new List<CashClosingDto>();
        foreach (var closing in closings)
        {
            dtos.Add(await MapToDtoAsync(closing));
        }
        return dtos;
    }

    public async Task<IEnumerable<CashClosingDto>> GetByDateRangeAsync(DateTime startDate, DateTime endDate)
    {
        var closings = await _cashClosingRepository.GetByDateRangeAsync(startDate, endDate);
        var dtos = new List<CashClosingDto>();
        foreach (var closing in closings)
        {
            dtos.Add(await MapToDtoAsync(closing));
        }
        return dtos;
    }

    public async Task<CashClosingDto> GetByIdAsync(int id)
    {
        var closing = await _cashClosingRepository.GetByIdAsync(id);
        if (closing == null)
            throw new KeyNotFoundException($"Cash closing with ID {id} not found");

        return await MapToDtoAsync(closing);
    }

    private async Task<CashClosingDto> MapToDtoAsync(Domain.Entities.CashClosing closing)
    {
        var cashRegister = await _cashRegisterRepository.GetByIdAsync(closing.CashRegisterId);
        var registerUser = cashRegister != null ? await _userRepository.GetByIdAsync(cashRegister.UserId) : null;
        var closedOrders = await _orderRepository.FindAsync(o => o.CashRegisterId == closing.CashRegisterId && o.IsClosed);
        
        var orderDtos = new List<OrderDto>();
        foreach (var order in closedOrders)
        {
            var table = await _tableRepository.GetByIdAsync(order.TableId);
            var orderUser = order.UserId.HasValue ? await _userRepository.GetByIdAsync(order.UserId.Value) : null;
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
                UserName = orderUser?.Name
            });
        }

        return new CashClosingDto
        {
            Id = closing.Id,
            CashRegisterId = closing.CashRegisterId,
            ClosingDate = closing.ClosingDate,
            TotalSold = closing.TotalSold,
            TotalOrders = closing.TotalOrders,
            TotalPix = closing.TotalPix,
            TotalCash = closing.TotalCash,
            TotalDebit = closing.TotalDebit,
            TotalCredit = closing.TotalCredit,
            AverageTicket = closing.AverageTicket,
            CashRegisterOpenedAt = closing.CashRegisterOpenedAt,
            CashRegisterClosedAt = closing.CashRegisterClosedAt,
            OpeningBalance = cashRegister?.OpeningBalance ?? 0,
            ClosingBalance = cashRegister?.ClosingBalance ?? 0,
            UserName = registerUser?.Name ?? string.Empty,
            ClosedOrders = orderDtos
        };
    }
}
