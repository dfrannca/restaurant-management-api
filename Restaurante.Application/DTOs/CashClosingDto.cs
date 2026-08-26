namespace Restaurante.Application.DTOs;

public class CashClosingDto
{
    public int Id { get; set; }
    public DateTime ClosingDate { get; set; }
    public decimal TotalSold { get; set; }
    public int TotalOrders { get; set; }
    public decimal TotalPix { get; set; }
    public decimal TotalCash { get; set; }
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
    public decimal AverageTicket { get; set; }
    public int CashRegisterId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public decimal OpeningBalance { get; set; }
    public decimal ClosingBalance { get; set; }
    public DateTime CashRegisterOpenedAt { get; set; }
    public DateTime CashRegisterClosedAt { get; set; }
    public List<OrderDto> ClosedOrders { get; set; } = new();
}
