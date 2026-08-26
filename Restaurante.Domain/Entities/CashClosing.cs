using Restaurante.Domain.Enums;

namespace Restaurante.Domain.Entities;

public class CashClosing : BaseEntity
{
    public int CashRegisterId { get; set; }
    public CashRegister CashRegister { get; set; } = null!;
    public DateTime ClosingDate { get; set; } = DateTime.UtcNow;
    public decimal TotalSold { get; set; }
    public int TotalOrders { get; set; }
    public decimal TotalPix { get; set; }
    public decimal TotalCash { get; set; }
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
    public decimal AverageTicket { get; set; }
    public DateTime CashRegisterOpenedAt { get; set; }
    public DateTime CashRegisterClosedAt { get; set; }
}
