using Microsoft.EntityFrameworkCore;
using Restaurante.Domain.Entities;

namespace Restaurante.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<Table> Tables { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }
    public DbSet<CashRegister> CashRegisters { get; set; }
    public DbSet<CashClosing> CashClosings { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Username).IsUnique();
            entity.Property(e => e.Username).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Email).HasMaxLength(100);
            entity.HasIndex(e => e.Email);
        });

        // Category configuration
        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Description).HasMaxLength(200);
            entity.HasIndex(e => e.Name).IsUnique();
        });

        // Product configuration
        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.Price).HasPrecision(10, 2);
            entity.HasIndex(e => new { e.CategoryId, e.IsActive });
            entity.ToTable(table => table.HasCheckConstraint("CK_Products_Price_NonNegative", "Price >= 0"));
            entity.HasOne(e => e.Category)
                  .WithMany(c => c.Products)
                  .HasForeignKey(e => e.CategoryId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Table configuration
        modelBuilder.Entity<Table>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Number).IsUnique();
            entity.Property(e => e.Number).IsRequired();
            entity.Property(e => e.Location).HasMaxLength(50);
            entity.HasIndex(e => e.Status);
            entity.ToTable(table => table.HasCheckConstraint("CK_Tables_Capacity_Positive", "Capacity > 0"));
        });

        // Order configuration
        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TotalAmount).HasPrecision(10, 2).HasDefaultValue(0);
            entity.Property(e => e.CustomerName).HasMaxLength(100);
            entity.Property(e => e.Observations).HasMaxLength(500);
            entity.HasIndex(e => new { e.TableId, e.IsClosed });
            entity.HasIndex(e => new { e.CashRegisterId, e.IsClosed });
            entity.HasIndex(e => e.ClosedAt);
            entity.HasOne(e => e.Table)
                  .WithMany(t => t.Orders)
                  .HasForeignKey(e => e.TableId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.CashRegister)
                  .WithMany()
                  .HasForeignKey(e => e.CashRegisterId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // OrderItem configuration
        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UnitPrice).HasPrecision(10, 2);
            entity.Property(e => e.Subtotal).HasPrecision(10, 2).HasDefaultValue(0);
            entity.Property(e => e.Observations).HasMaxLength(500);
            entity.ToTable(table =>
            {
                table.HasCheckConstraint("CK_OrderItems_Quantity_Positive", "Quantity > 0");
                table.HasCheckConstraint("CK_OrderItems_UnitPrice_NonNegative", "UnitPrice >= 0");
            });
            entity.HasOne(e => e.Order)
                  .WithMany(o => o.OrderItems)
                  .HasForeignKey(e => e.OrderId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Product)
                  .WithMany(p => p.OrderItems)
                  .HasForeignKey(e => e.ProductId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // CashRegister configuration
        modelBuilder.Entity<CashRegister>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.OpeningBalance).HasPrecision(10, 2).HasDefaultValue(0);
            entity.Property(e => e.ClosingBalance).HasPrecision(10, 2).HasDefaultValue(0);
            entity.HasIndex(e => new { e.IsOpen, e.OpenedAt });
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // CashClosing configuration
        modelBuilder.Entity<CashClosing>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TotalSold).HasPrecision(10, 2);
            entity.Property(e => e.TotalPix).HasPrecision(10, 2);
            entity.Property(e => e.TotalCash).HasPrecision(10, 2);
            entity.Property(e => e.TotalDebit).HasPrecision(10, 2);
            entity.Property(e => e.TotalCredit).HasPrecision(10, 2);
            entity.Property(e => e.AverageTicket).HasPrecision(10, 2);
            entity.HasOne(e => e.CashRegister)
                  .WithMany(cr => cr.CashClosings)
                  .HasForeignKey(e => e.CashRegisterId)
                  .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
