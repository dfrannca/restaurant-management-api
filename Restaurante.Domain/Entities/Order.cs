using Restaurante.Domain.Enums;

namespace Restaurante.Domain.Entities;

public class Order : BaseEntity
{
    public int TableId { get; set; }
    public Table Table { get; set; } = null!;
    public string? CustomerName { get; set; }
    public string? Observations { get; set; }
    public DateTime OpenedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ClosedAt { get; set; }
    public decimal TotalAmount { get; set; }
    public PaymentMethod? PaymentMethod { get; set; }
    public bool IsClosed { get; set; }
    public int? CashRegisterId { get; set; }
    public CashRegister? CashRegister { get; set; }
    public int? UserId { get; set; }
    public User? User { get; set; }
    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}
