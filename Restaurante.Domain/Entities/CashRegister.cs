namespace Restaurante.Domain.Entities;

public class CashRegister : BaseEntity
{
    public DateTime OpenedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ClosedAt { get; set; }
    public decimal OpeningBalance { get; set; }
    public decimal ClosingBalance { get; set; }
    public bool IsOpen { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public ICollection<CashClosing> CashClosings { get; set; } = new List<CashClosing>();
}
