using Restaurante.Domain.Enums;

namespace Restaurante.Application.DTOs;

public class TableDto
{
    public int Id { get; set; }
    public int Number { get; set; }
    public TableStatus Status { get; set; }
    public int Capacity { get; set; }
    public string? Location { get; set; }
    public decimal CurrentTotal { get; set; }
    public DateTime? OpenedAt { get; set; }
    public string? CustomerName { get; set; }
}

public class CreateTableDto
{
    public int Number { get; set; }
    public int Capacity { get; set; } = 4;
    public string? Location { get; set; }
}

public class UpdateTableDto
{
    public int Capacity { get; set; }
    public string? Location { get; set; }
}

public class OpenTableDto
{
    public string? CustomerName { get; set; }
    public string? Observations { get; set; }
}
