using Restaurante.Domain.Enums;

namespace Restaurante.Application.DTOs;

public class OrderDto
{
    public int Id { get; set; }
    public int TableId { get; set; }
    public int TableNumber { get; set; }
    public string? CustomerName { get; set; }
    public string? Observations { get; set; }
    public DateTime OpenedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public decimal TotalAmount { get; set; }
    public PaymentMethod? PaymentMethod { get; set; }
    public bool IsClosed { get; set; }
    public OrderStatus Status { get; set; }
    public int? CashRegisterId { get; set; }
    public int? UserId { get; set; }
    public string? UserName { get; set; }
    public List<OrderItemDto> OrderItems { get; set; } = new();
}

public class OrderItemDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Subtotal { get; set; }
    public string? Observations { get; set; }
}

public class CreateOrderDto
{
    public int TableId { get; set; }
    public string? CustomerName { get; set; }
    public string? Observations { get; set; }
}

public class AddOrderItemDto
{
    public int ProductId { get; set; }
    public int Quantity { get; set; }
    public string? Observations { get; set; }
}

public class UpdateOrderItemDto
{
    public int Quantity { get; set; }
    public string? Observations { get; set; }
}

public class CloseOrderDto
{
    public PaymentMethod PaymentMethod { get; set; }
    public int UserId { get; set; }
}

public class UpdateOrderStatusDto
{
    public OrderStatus Status { get; set; }
}
