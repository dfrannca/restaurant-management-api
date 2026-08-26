using System;
using System.Collections.Generic;

namespace Restaurante.Application.DTOs;

public class CashRegisterSummaryDto
{
    public int CashRegisterId { get; set; }
    public DateTime OpenedAt { get; set; }
    public decimal OpeningBalance { get; set; }
    public string UserName { get; set; } = string.Empty;
    public decimal TotalSold { get; set; }
    public int TotalOrders { get; set; }
    public decimal TotalPix { get; set; }
    public decimal TotalCash { get; set; }
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
    public decimal AverageTicket { get; set; }
    public List<OrderDto> ClosedOrders { get; set; } = new();
}
