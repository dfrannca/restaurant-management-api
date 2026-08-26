using Restaurante.Domain.Enums;

namespace Restaurante.Domain.Entities;

public class Table : BaseEntity
{
    public int Number { get; set; }
    public TableStatus Status { get; set; } = TableStatus.Free;
    public int Capacity { get; set; } = 4;
    public string? Location { get; set; }
    public ICollection<Order> Orders { get; set; } = new List<Order>();
}
