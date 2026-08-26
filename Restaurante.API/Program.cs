using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Restaurante.Application;
using Restaurante.Domain.Entities;
using Restaurante.Domain.Enums;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Restaurante.Infrastructure;
using Restaurante.Infrastructure.Data;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// Configure Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"];
if (string.IsNullOrWhiteSpace(jwtSecret) && !builder.Environment.IsDevelopment())
{
    throw new InvalidOperationException("Jwt:Secret must be configured outside Development.");
}

jwtSecret ??= "A_VERY_LONG_SECRET_KEY_FOR_JWT_THAT_SHOULD_BE_CHANGED_IN_PRODUCTION";
var key = Encoding.ASCII.GetBytes(jwtSecret);

builder.Services.AddAuthentication(x =>
{
    x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(x =>
{
    x.RequireHttpsMetadata = false;
    x.SaveToken = true;
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        NameClaimType = ClaimTypes.NameIdentifier
    };
});

builder.Services.AddHttpContextAccessor();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        var allowedOrigin = builder.Configuration["Cors:AllowedOrigin"];
        if (string.IsNullOrWhiteSpace(allowedOrigin))
        {
            if (!builder.Environment.IsDevelopment())
            {
                throw new InvalidOperationException("Cors:AllowedOrigin must be configured outside Development.");
            }

            policy.AllowAnyOrigin();
        }
        else
        {
            policy.WithOrigins(allowedOrigin);
        }

        policy.AllowAnyMethod().AllowAnyHeader();
    });
});

// Infrastructure
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Data Source=pedidos.db";
builder.Services.AddInfrastructure(connectionString);

// Application
builder.Services.AddApplication();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (connectionString.StartsWith("Data Source", StringComparison.OrdinalIgnoreCase))
    {
        await dbContext.Database.EnsureCreatedAsync();
    }
    else
    {
        await dbContext.Database.MigrateAsync();
    }

    // Dados iniciais são criados apenas em uma base vazia. Nunca limpe a base
    // na inicialização: pedidos, fechamentos e usuários são dados operacionais.
    if (!await dbContext.Users.AnyAsync())
    {

    var adminUser = new User
    {
        Username = "admin",
        PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin"),
        Name = "Administrador",
        Role = UserRole.Administrator,
        Email = "admin@restaurante.com"
    };

    var cashierUser = new User
    {
        Username = "caixa1",
        PasswordHash = BCrypt.Net.BCrypt.HashPassword("caixa1"),
        Name = "Caixa 1",
        Role = UserRole.Cashier,
        Email = "caixa1@restaurante.com"
    };

    await dbContext.Users.AddRangeAsync(adminUser, cashierUser);
    await dbContext.SaveChangesAsync();

    var categories = new[]
    {
        new Category { Name = "Petiscos", Description = "Porções e petiscos" },
        new Category { Name = "Refeições", Description = "Pratos completos" },
        new Category { Name = "Guarnições", Description = "Acompanhamentos" },
        new Category { Name = "Bebidas Geladas", Description = "Refrigerantes, sucos e águas" },
        new Category { Name = "Bebidas Quentes (Dose)", Description = "Cachaças e destilados" },
        new Category { Name = "Whisky (Dose)", Description = "Whiskies" },
        new Category { Name = "Cervejas", Description = "Cervejas em lata e long neck" }
    };

    await dbContext.Categories.AddRangeAsync(categories);
    await dbContext.SaveChangesAsync();

    var categoriesByName = await dbContext.Categories.ToDictionaryAsync(c => c.Name);
    var products = new List<Product>
    {
        new() { Name = "Macaxeira Frita", Description = "Porção", Price = 18.00m, CategoryId = categoriesByName["Petiscos"].Id, IsActive = true },
        new() { Name = "Batata Frita", Description = "Porção", Price = 18.00m, CategoryId = categoriesByName["Petiscos"].Id, IsActive = true },
        new() { Name = "Carne de Sol 400g", Description = "Porção", Price = 45.00m, CategoryId = categoriesByName["Petiscos"].Id, IsActive = true },
        new() { Name = "Churrasco Carneiro 400g", Description = "Porção", Price = 45.00m, CategoryId = categoriesByName["Petiscos"].Id, IsActive = true },
        new() { Name = "Churrasco Suíno 400g", Description = "Porção", Price = 40.00m, CategoryId = categoriesByName["Petiscos"].Id, IsActive = true },
        new() { Name = "Costela Suína 400g", Description = "Porção", Price = 49.00m, CategoryId = categoriesByName["Petiscos"].Id, IsActive = true },
        new() { Name = "Filé com Fritas 300g", Description = "Porção", Price = 35.00m, CategoryId = categoriesByName["Petiscos"].Id, IsActive = true },
        new() { Name = "Picanha Suína 300g", Description = "Porção", Price = 0.00m, CategoryId = categoriesByName["Petiscos"].Id, IsActive = true },
        new() { Name = "Calabresa Acebolada 300g", Description = "Porção", Price = 26.00m, CategoryId = categoriesByName["Petiscos"].Id, IsActive = true },
        new() { Name = "Calabresa com Fritas 400g", Description = "Porção", Price = 24.00m, CategoryId = categoriesByName["Petiscos"].Id, IsActive = true },
        new() { Name = "Linguiça Unid.", Description = "Unidade", Price = 4.00m, CategoryId = categoriesByName["Petiscos"].Id, IsActive = true },
        new() { Name = "Linguiça Picante Unid.", Description = "Unidade", Price = 4.50m, CategoryId = categoriesByName["Petiscos"].Id, IsActive = true },
        new() { Name = "Pão de Alho Unid.", Description = "Unidade", Price = 0.00m, CategoryId = categoriesByName["Petiscos"].Id, IsActive = true },
        new() { Name = "Queijo à Milanesa", Description = "Porção", Price = 16.00m, CategoryId = categoriesByName["Petiscos"].Id, IsActive = true },
        new() { Name = "Picanha Nacional 400g", Description = "Porção", Price = 72.00m, CategoryId = categoriesByName["Petiscos"].Id, IsActive = true },
        new() { Name = "Picanha Argentina 400g", Description = "Porção", Price = 0.00m, CategoryId = categoriesByName["Petiscos"].Id, IsActive = true },
        new() { Name = "Peito Frito GG", Description = "Porção", Price = 30.00m, CategoryId = categoriesByName["Petiscos"].Id, IsActive = true },
        new() { Name = "Galinha Completa", Description = "Arroz, Macarrão, Pirão e Salada", Price = 120.00m, CategoryId = categoriesByName["Refeições"].Id, IsActive = true },
        new() { Name = "Peixe Frito Completo", Description = "Baião, Vinagrete e Farofa", Price = 65.00m, CategoryId = categoriesByName["Refeições"].Id, IsActive = true },
        new() { Name = "Peixe Cozido", Description = "Pirão, Arroz e Macarrão", Price = 60.00m, CategoryId = categoriesByName["Refeições"].Id, IsActive = true },
        new() { Name = "Maria Izabel de Carneiro", Description = "Verdura", Price = 80.00m, CategoryId = categoriesByName["Refeições"].Id, IsActive = true },
        new() { Name = "Carneiro Cozido", Description = "Pirão, Arroz e Macarrão", Price = 60.00m, CategoryId = categoriesByName["Refeições"].Id, IsActive = true },
        new() { Name = "Capote Frito", Description = "Baião, Vinagrete e Farofa", Price = 110.00m, CategoryId = categoriesByName["Refeições"].Id, IsActive = true },
        new() { Name = "Maminha 500g", Description = "Baião, Vinagrete e Farofa", Price = 75.00m, CategoryId = categoriesByName["Refeições"].Id, IsActive = true },
        new() { Name = "Picanha Nacional 500g", Description = "Baião, Vinagrete e Farofa", Price = 90.00m, CategoryId = categoriesByName["Refeições"].Id, IsActive = true },
        new() { Name = "Contrafilé 200g", Description = "Porção", Price = 30.00m, CategoryId = categoriesByName["Guarnições"].Id, IsActive = true },
        new() { Name = "Maminha 200g", Description = "Porção", Price = 30.00m, CategoryId = categoriesByName["Guarnições"].Id, IsActive = true },
        new() { Name = "Picanha Nacional 200g", Description = "Porção", Price = 36.00m, CategoryId = categoriesByName["Guarnições"].Id, IsActive = true },
        new() { Name = "Picanha Argentina 200g", Description = "Porção", Price = 0.00m, CategoryId = categoriesByName["Guarnições"].Id, IsActive = true },
        new() { Name = "Baião Cremoso", Description = "Porção", Price = 14.00m, CategoryId = categoriesByName["Guarnições"].Id, IsActive = true },
        new() { Name = "Baião Tradicional", Description = "Porção", Price = 10.00m, CategoryId = categoriesByName["Guarnições"].Id, IsActive = true },
        new() { Name = "Arroz Branco", Description = "Porção", Price = 8.00m, CategoryId = categoriesByName["Guarnições"].Id, IsActive = true },
        new() { Name = "Macarrão", Description = "Porção", Price = 4.00m, CategoryId = categoriesByName["Guarnições"].Id, IsActive = true },
        new() { Name = "Água Mineral", Description = "Unidade", Price = 2.00m, CategoryId = categoriesByName["Bebidas Geladas"].Id, IsActive = true },
        new() { Name = "Água Mineral com Gás", Description = "Unidade", Price = 3.00m, CategoryId = categoriesByName["Bebidas Geladas"].Id, IsActive = true },
        new() { Name = "Água de Coco", Description = "Unidade", Price = 4.00m, CategoryId = categoriesByName["Bebidas Geladas"].Id, IsActive = true },
        new() { Name = "H2O Limoneto", Description = "Unidade", Price = 6.00m, CategoryId = categoriesByName["Bebidas Geladas"].Id, IsActive = true },
        new() { Name = "Refrigerantes Lata", Description = "Unidade", Price = 5.00m, CategoryId = categoriesByName["Bebidas Geladas"].Id, IsActive = true },
        new() { Name = "Refrigerantes 1L", Description = "Unidade", Price = 7.00m, CategoryId = categoriesByName["Bebidas Geladas"].Id, IsActive = true },
        new() { Name = "Refrigerantes 2L", Description = "Unidade", Price = 12.00m, CategoryId = categoriesByName["Bebidas Geladas"].Id, IsActive = true },
        new() { Name = "Sucos Diversos Jarra (P)", Description = "Jarra Pequena", Price = 10.00m, CategoryId = categoriesByName["Bebidas Geladas"].Id, IsActive = true },
        new() { Name = "Sucos Diversos Jarra (G)", Description = "Jarra Grande", Price = 14.00m, CategoryId = categoriesByName["Bebidas Geladas"].Id, IsActive = true },
        new() { Name = "Ypioca 150", Description = "Dose", Price = 0.00m, CategoryId = categoriesByName["Bebidas Quentes (Dose)"].Id, IsActive = true },
        new() { Name = "Ypioca", Description = "Dose", Price = 3.00m, CategoryId = categoriesByName["Bebidas Quentes (Dose)"].Id, IsActive = true },
        new() { Name = "Ypioca Empalhada", Description = "Dose", Price = 6.00m, CategoryId = categoriesByName["Bebidas Quentes (Dose)"].Id, IsActive = true },
        new() { Name = "Mangueira", Description = "Dose", Price = 0.00m, CategoryId = categoriesByName["Bebidas Quentes (Dose)"].Id, IsActive = true },
        new() { Name = "51", Description = "Dose", Price = 3.00m, CategoryId = categoriesByName["Bebidas Quentes (Dose)"].Id, IsActive = true },
        new() { Name = "Dreher", Description = "Dose", Price = 3.00m, CategoryId = categoriesByName["Bebidas Quentes (Dose)"].Id, IsActive = true },
        new() { Name = "Velho Barreiro", Description = "Dose", Price = 0.00m, CategoryId = categoriesByName["Bebidas Quentes (Dose)"].Id, IsActive = true },
        new() { Name = "Campari", Description = "Dose", Price = 8.00m, CategoryId = categoriesByName["Bebidas Quentes (Dose)"].Id, IsActive = true },
        new() { Name = "Vodka", Description = "Dose", Price = 0.00m, CategoryId = categoriesByName["Bebidas Quentes (Dose)"].Id, IsActive = true },
        new() { Name = "Bananinha", Description = "Dose", Price = 0.00m, CategoryId = categoriesByName["Bebidas Quentes (Dose)"].Id, IsActive = true },
        new() { Name = "Gin", Description = "Dose", Price = 0.00m, CategoryId = categoriesByName["Bebidas Quentes (Dose)"].Id, IsActive = true },
        new() { Name = "Martini", Description = "Dose", Price = 0.00m, CategoryId = categoriesByName["Bebidas Quentes (Dose)"].Id, IsActive = true },
        new() { Name = "Old Par", Description = "Dose", Price = 12.00m, CategoryId = categoriesByName["Whisky (Dose)"].Id, IsActive = true },
        new() { Name = "Gold Label", Description = "Dose", Price = 0.00m, CategoryId = categoriesByName["Whisky (Dose)"].Id, IsActive = true },
        new() { Name = "Red Label", Description = "Dose", Price = 0.00m, CategoryId = categoriesByName["Whisky (Dose)"].Id, IsActive = true },
        new() { Name = "White Horse", Description = "Dose", Price = 0.00m, CategoryId = categoriesByName["Whisky (Dose)"].Id, IsActive = true },
        new() { Name = "Chivas Regal", Description = "Dose", Price = 0.00m, CategoryId = categoriesByName["Whisky (Dose)"].Id, IsActive = true },
        new() { Name = "Jack Daniel's", Description = "Dose", Price = 0.00m, CategoryId = categoriesByName["Whisky (Dose)"].Id, IsActive = true },
        new() { Name = "Black White", Description = "Dose", Price = 8.00m, CategoryId = categoriesByName["Whisky (Dose)"].Id, IsActive = true },
        new() { Name = "Black Label", Description = "Dose", Price = 0.00m, CategoryId = categoriesByName["Whisky (Dose)"].Id, IsActive = true },
        new() { Name = "Heineken 600ml", Description = "Long Neck", Price = 0.00m, CategoryId = categoriesByName["Cervejas"].Id, IsActive = true },
        new() { Name = "Stella 600ml", Description = "Long Neck", Price = 0.00m, CategoryId = categoriesByName["Cervejas"].Id, IsActive = true },
        new() { Name = "Budweiser 600ml", Description = "Long Neck", Price = 0.00m, CategoryId = categoriesByName["Cervejas"].Id, IsActive = true },
        new() { Name = "Brahma Duplo Malte 600ml", Description = "Long Neck", Price = 10.00m, CategoryId = categoriesByName["Cervejas"].Id, IsActive = true },
        new() { Name = "Bohemia 600ml", Description = "Long Neck", Price = 10.00m, CategoryId = categoriesByName["Cervejas"].Id, IsActive = true },
        new() { Name = "Antártica Original 600ml", Description = "Long Neck", Price = 0.00m, CategoryId = categoriesByName["Cervejas"].Id, IsActive = true },
        new() { Name = "Skol 600ml", Description = "Long Neck", Price = 0.00m, CategoryId = categoriesByName["Cervejas"].Id, IsActive = true },
        new() { Name = "Spaten 600ml", Description = "Long Neck", Price = 13.00m, CategoryId = categoriesByName["Cervejas"].Id, IsActive = true },
        new() { Name = "Skol 300ml", Description = "Lata", Price = 5.00m, CategoryId = categoriesByName["Cervejas"].Id, IsActive = true },
        new() { Name = "Bohemia 300ml", Description = "Lata", Price = 5.00m, CategoryId = categoriesByName["Cervejas"].Id, IsActive = true },
        new() { Name = "Brahma 300ml", Description = "Lata", Price = 5.00m, CategoryId = categoriesByName["Cervejas"].Id, IsActive = true },
        new() { Name = "Devassa 300ml", Description = "Lata", Price = 0.00m, CategoryId = categoriesByName["Cervejas"].Id, IsActive = true },
        new() { Name = "Stella 300ml", Description = "Lata", Price = 10.00m, CategoryId = categoriesByName["Cervejas"].Id, IsActive = true },
        new() { Name = "Budweiser 300ml", Description = "Lata", Price = 0.00m, CategoryId = categoriesByName["Cervejas"].Id, IsActive = true },
        new() { Name = "Heineken 300ml", Description = "Lata", Price = 11.00m, CategoryId = categoriesByName["Cervejas"].Id, IsActive = true }
    };

    await dbContext.Products.AddRangeAsync(products);
    await dbContext.SaveChangesAsync();

    var tables = Enumerable.Range(1, 40)
        .Select(i => new Table
        {
            Number = i,
            Capacity = 4,
            Location = i <= 20 ? "Área Interna" : "Área Externa",
            Status = TableStatus.Free
        })
        .ToList();

    await dbContext.Tables.AddRangeAsync(tables);
    await dbContext.SaveChangesAsync();
    }

    var defaultUsers = new[]
    {
        new { Username = "admin", Password = "admin" },
        new { Username = "caixa1", Password = "caixa1" }
    };

    var existingDefaultUsers = await dbContext.Users
        .Where(user => defaultUsers.Select(defaultUser => defaultUser.Username).Contains(user.Username))
        .ToListAsync();

    foreach (var defaultUser in defaultUsers)
    {
        var existingUser = existingDefaultUsers.SingleOrDefault(user => user.Username == defaultUser.Username);
        var passwordIsValid = false;
        if (existingUser is not null)
        {
            try
            {
                passwordIsValid = BCrypt.Net.BCrypt.Verify(defaultUser.Password, existingUser.PasswordHash);
            }
            catch (BCrypt.Net.SaltParseException)
            {
                passwordIsValid = false;
            }
        }

        if (existingUser is not null && !passwordIsValid)
        {
            existingUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(defaultUser.Password);
        }
    }

    await dbContext.SaveChangesAsync();
}

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "Restaurante API v1");
    });
}

app.UseCors("AllowAll");
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
