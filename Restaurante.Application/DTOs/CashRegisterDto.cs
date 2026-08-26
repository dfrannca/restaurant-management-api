namespace Restaurante.Application.DTOs;

public class CashRegisterDto
{
    public int Id { get; set; }
    public DateTime OpenedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public decimal OpeningBalance { get; set; }
    public decimal ClosingBalance { get; set; }
    public bool IsOpen { get; set; }
    public string UserName { get; set; } = string.Empty;
}

public class OpenCashRegisterDto
{
    public decimal OpeningBalance { get; set; }
}

public class CloseCashRegisterDto
{
    public decimal ClosingBalance { get; set; }
}
