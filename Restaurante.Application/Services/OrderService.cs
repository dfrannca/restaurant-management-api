using FluentValidation;
using Restaurante.Application.DTOs;
using Restaurante.Domain.Entities;
using Restaurante.Domain.Interfaces;

namespace Restaurante.Application.Services;

public class OrderService : IOrderService
{
    private readonly IOrderRepository _orderRepository;
    private readonly IOrderItemRepository _orderItemRepository;
    private readonly ITableRepository _tableRepository;
    private readonly IProductRepository _productRepository;
    private readonly ICashRegisterRepository _cashRegisterRepository;
    private readonly IUserRepository _userRepository;
    private readonly IValidator<CreateOrderDto> _createValidator;
    private readonly IValidator<AddOrderItemDto> _addItemValidator;
    private readonly IValidator<UpdateOrderItemDto> _updateItemValidator;
    private readonly IValidator<CloseOrderDto> _closeValidator;

    public OrderService(
        IOrderRepository orderRepository,
        IOrderItemRepository orderItemRepository,
        ITableRepository tableRepository,
        IProductRepository productRepository,
        ICashRegisterRepository cashRegisterRepository,
        IUserRepository userRepository,
        IValidator<CreateOrderDto> createValidator,
        IValidator<AddOrderItemDto> addItemValidator,
        IValidator<UpdateOrderItemDto> updateItemValidator,
        IValidator<CloseOrderDto> closeValidator)
    {
        _orderRepository = orderRepository;
        _orderItemRepository = orderItemRepository;
        _tableRepository = tableRepository;
        _productRepository = productRepository;
        _cashRegisterRepository = cashRegisterRepository;
        _userRepository = userRepository;
        _createValidator = createValidator;
        _addItemValidator = addItemValidator;
        _updateItemValidator = updateItemValidator;
        _closeValidator = closeValidator;
    }

    public async Task<OrderDto> GetByIdAsync(int id)
    {
        var order = await _orderRepository.GetByIdAsync(id);
        if (order == null)
            throw new KeyNotFoundException($"Order with ID {id} not found");

        return await MapToDtoAsync(order);
    }

    public async Task<IEnumerable<OrderDto>> GetAllAsync()
    {
        var orders = await _orderRepository.GetAllAsync();
        var dtos = new List<OrderDto>();
        
        foreach (var order in orders)
        {
            dtos.Add(await MapToDtoAsync(order));
        }
        
        return dtos;
    }

    public async Task<IEnumerable<OrderDto>> GetClosedOrdersAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        var orders = await _orderRepository.GetClosedOrdersAsync(startDate, endDate);
        var dtos = new List<OrderDto>();
        
        foreach (var order in orders)
        {
            dtos.Add(await MapToDtoAsync(order));
        }
        
        return dtos;
    }

    public async Task<OrderDto> GetActiveOrderByTableIdAsync(int tableId)
    {
        var order = await _orderRepository.GetActiveOrderByTableIdAsync(tableId);
        if (order == null)
            throw new KeyNotFoundException($"No active order found for table {tableId}");

        return await MapToDtoAsync(order);
    }

    public async Task<OrderDto> CreateAsync(CreateOrderDto dto)
    {
        await _createValidator.ValidateAndThrowAsync(dto);

        var openCashRegister = await _cashRegisterRepository.GetOpenCashRegisterAsync();
        if (openCashRegister == null)
            throw new InvalidOperationException("Não é permitido abrir mesas/pedidos sem um caixa aberto.");

        var table = await _tableRepository.GetByIdAsync(dto.TableId);
        if (table == null)
            throw new KeyNotFoundException($"Table with ID {dto.TableId} not found");

        if (table.Status != Domain.Enums.TableStatus.Free)
            throw new InvalidOperationException("Table is not available");

        var existingOrder = await _orderRepository.GetActiveOrderByTableIdAsync(dto.TableId);
        if (existingOrder != null)
            throw new InvalidOperationException("Table already has an active order");

        var order = new Order
        {
            TableId = dto.TableId,
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

        return await MapToDtoAsync(order);
    }

    public async Task<OrderDto> AddItemAsync(int orderId, AddOrderItemDto dto)
    {
        await _addItemValidator.ValidateAndThrowAsync(dto);

        var order = await _orderRepository.GetByIdAsync(orderId);
        if (order == null)
            throw new KeyNotFoundException($"Order with ID {orderId} not found");

        if (order.IsClosed)
            throw new InvalidOperationException("Cannot add items to a closed order");

        var product = await _productRepository.GetByIdAsync(dto.ProductId);
        if (product == null)
            throw new KeyNotFoundException($"Product with ID {dto.ProductId} not found");

        if (!product.IsActive)
            throw new InvalidOperationException("Product is not available");

        var orderItem = new OrderItem
        {
            OrderId = orderId,
            ProductId = dto.ProductId,
            Quantity = dto.Quantity,
            UnitPrice = product.Price,
            Subtotal = product.Price * dto.Quantity,
            Observations = dto.Observations
        };

        await _orderItemRepository.AddAsync(orderItem);

        await UpdateOrderTotalAsync(order);

        return await MapToDtoAsync(order);
    }

    public async Task<OrderDto> UpdateItemAsync(int orderId, int itemId, UpdateOrderItemDto dto)
    {
        await _updateItemValidator.ValidateAndThrowAsync(dto);

        var order = await _orderRepository.GetByIdAsync(orderId);
        if (order == null)
            throw new KeyNotFoundException($"Order with ID {orderId} not found");

        if (order.IsClosed)
            throw new InvalidOperationException("Cannot update items in a closed order");

        var orderItem = order.OrderItems.FirstOrDefault(oi => oi.Id == itemId);
        if (orderItem == null)
            throw new KeyNotFoundException($"Order item with ID {itemId} not found");

        orderItem.Quantity = dto.Quantity;
        orderItem.Observations = dto.Observations;
        orderItem.Subtotal = orderItem.UnitPrice * dto.Quantity;
        orderItem.UpdatedAt = DateTime.UtcNow;

        await _orderItemRepository.UpdateAsync(orderItem);

        await UpdateOrderTotalAsync(order);

        return await MapToDtoAsync(order);
    }

    public async Task<OrderDto> RemoveItemAsync(int orderId, int itemId)
    {
        var order = await _orderRepository.GetByIdAsync(orderId);
        if (order == null)
            throw new KeyNotFoundException($"Order with ID {orderId} not found");

        if (order.IsClosed)
            throw new InvalidOperationException("Cannot remove items from a closed order");

        var orderItem = order.OrderItems.FirstOrDefault(oi => oi.Id == itemId);
        if (orderItem == null)
            throw new KeyNotFoundException($"Order item with ID {itemId} not found");

        await _orderItemRepository.DeleteAsync(orderItem);

        await UpdateOrderTotalAsync(order);

        return await MapToDtoAsync(order);
    }

    public async Task<OrderDto> CloseOrderAsync(int id, CloseOrderDto dto)
    {
        await _closeValidator.ValidateAndThrowAsync(dto);

        var order = await _orderRepository.GetByIdAsync(id);
        if (order == null)
            throw new KeyNotFoundException($"Order with ID {id} not found");

        if (order.IsClosed)
            throw new InvalidOperationException("Order is already closed");

        if (!order.OrderItems.Any())
            throw new InvalidOperationException("Cannot close an empty order");

        var user = await _userRepository.GetByIdAsync(dto.UserId);
        if (user == null)
            throw new KeyNotFoundException($"User with ID {dto.UserId} not found");

        order.PaymentMethod = dto.PaymentMethod;
        order.IsClosed = true;
        order.ClosedAt = DateTime.UtcNow;
        order.UserId = dto.UserId;
        order.UpdatedAt = DateTime.UtcNow;

        await _orderRepository.UpdateAsync(order);

        var table = await _tableRepository.GetByIdAsync(order.TableId);
        if (table != null)
        {
            table.Status = Domain.Enums.TableStatus.Free;
            table.UpdatedAt = DateTime.UtcNow;
            await _tableRepository.UpdateAsync(table);
        }

        return await MapToDtoAsync(order);
    }

    private async Task UpdateOrderTotalAsync(Order order)
    {
        order.TotalAmount = order.OrderItems.Sum(oi => oi.Subtotal);
        order.UpdatedAt = DateTime.UtcNow;
        await _orderRepository.UpdateAsync(order);
    }

    private async Task<OrderDto> MapToDtoAsync(Order order)
    {
        var table = await _tableRepository.GetByIdAsync(order.TableId);
        var user = order.UserId.HasValue ? await _userRepository.GetByIdAsync(order.UserId.Value) : null;
        
        return new OrderDto
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
            UserName = user?.Name,
            OrderItems = order.OrderItems.Select(oi => new OrderItemDto
            {
                Id = oi.Id,
                ProductId = oi.ProductId,
                ProductName = oi.Product?.Name ?? string.Empty,
                Quantity = oi.Quantity,
                UnitPrice = oi.UnitPrice,
                Subtotal = oi.Subtotal,
                Observations = oi.Observations
            }).ToList()
        };
    }
}
