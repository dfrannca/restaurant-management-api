using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration.Json;
using Restaurante.Application;
using Restaurante.Domain.Entities;
using Restaurante.Domain.Enums;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Restaurante.Infrastructure;
using Restaurante.Infrastructure.Data;
using System.Security.Claims;
using System.Diagnostics;
using Npgsql;
using Uri = System.Uri;

var builder = WebApplication.CreateBuilder(args);

foreach (var jsonSource in builder.Configuration.Sources.OfType<JsonConfigurationSource>())
{
    jsonSource.ReloadOnChange = false;
}

var renderPort = Environment.GetEnvironmentVariable("PORT") ?? "10000";
if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("ASPNETCORE_URLS")))
{
    builder.WebHost.UseUrls($"http://*:{renderPort}");
}

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// Compressão de resposta: reduz drasticamente o payload JSON em redes lentas
// (produção: Render + clientes móveis). Brotli tem prioridade sobre Gzip.
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(["application/json"]);
});

// Configure Authentication
var jwtSecret = Environment.GetEnvironmentVariable("Jwt__Secret") ?? builder.Configuration["Jwt:Secret"];
if (!builder.Environment.IsDevelopment() &&
    (string.IsNullOrWhiteSpace(jwtSecret) || jwtSecret.Contains("SHOULD_BE_CHANGED", StringComparison.OrdinalIgnoreCase)))
{
    throw new InvalidOperationException(
        "JWT não configurado. No Render, defina Jwt__Secret com uma chave longa e aleatória.");
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
var allowedOrigins = GetAllowedOrigins(builder.Environment, builder.Configuration["Cors:AllowedOrigin"]);
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins(allowedOrigins);
        policy.AllowAnyMethod().AllowAnyHeader();
        // Cacheia o preflight (OPTIONS) no navegador: evita 1 roundtrip extra
        // por requisição em cada navegação (relevante em redes de alta latência).
        policy.SetPreflightMaxAge(TimeSpan.FromMinutes(10));
    });
});

// Infrastructure
var configuredDatabaseUrl = builder.Configuration["DATABASE_URL"];
var connectionString = builder.Environment.IsDevelopment()
    ? builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=pedidos.db"
    : BuildProductionConnectionString(configuredDatabaseUrl ?? builder.Configuration.GetConnectionString("DefaultConnection"));

if (!builder.Environment.IsDevelopment() && connectionString.StartsWith("Data Source", StringComparison.OrdinalIgnoreCase))
{
    throw new InvalidOperationException(
        "Banco PostgreSQL não configurado. No Render, defina DATABASE_URL (ou ConnectionStrings__DefaultConnection) com a conexão do PostgreSQL; SQLite não é aceito em produção.");
}
builder.Services.AddInfrastructure(connectionString);

// Application
builder.Services.AddApplication();

var app = builder.Build();

app.Use(async (context, next) =>
{
    var requestId = context.Request.Headers.TryGetValue("X-Request-ID", out var incomingId) && !string.IsNullOrWhiteSpace(incomingId)
        ? incomingId.ToString()
        : Guid.NewGuid().ToString("N");
    var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("RequestTiming");
    var startedAt = Stopwatch.GetTimestamp();
    context.Response.Headers["X-Request-ID"] = requestId;
    logger.LogInformation("Request {RequestId} started {Method} {Path} at {StartedAt}", requestId, context.Request.Method, context.Request.Path, DateTime.UtcNow);
    try
    {
        await next();
    }
    finally
    {
        var elapsedMs = Stopwatch.GetElapsedTime(startedAt).TotalMilliseconds;
        logger.LogInformation("Request {RequestId} completed {StatusCode} in {ElapsedMs} ms at {CompletedAt}", requestId, context.Response.StatusCode, elapsedMs, DateTime.UtcNow);
    }
});

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

        // Guarda de esquema idempotente: garante a coluna Status dos pedidos
        // mesmo que a migração pendente não a crie no banco de produção.
        await dbContext.Database.ExecuteSqlRawAsync(
            "ALTER TABLE \"Orders\" ADD COLUMN IF NOT EXISTS \"Status\" integer NOT NULL DEFAULT 0;");
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

app.UseResponseCompression();
app.UseCors("AllowAll");
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Health check leve (sem autenticação) para pings de keep-alive/uptime
// (ex.: UptimeRobot/cron a cada 5-10 min evita o cold start do Render free tier)
app.MapGet("/health", () => Results.Ok(new { status = "healthy", at = DateTime.UtcNow }));

app.Run();

static string BuildProductionConnectionString(string? databaseUrl)
{
    if (string.IsNullOrWhiteSpace(databaseUrl))
    {
        throw new InvalidOperationException(
            "DATABASE_URL não configurada. No Render, adicione a variável DATABASE_URL fornecida pelo PostgreSQL.");
    }

    if (!databaseUrl.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
        !databaseUrl.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        return databaseUrl;
    }

    if (!Uri.TryCreate(databaseUrl, UriKind.Absolute, out var databaseUri) ||
        string.IsNullOrWhiteSpace(databaseUri.Host) ||
        string.IsNullOrWhiteSpace(databaseUri.AbsolutePath.Trim('/')))
    {
        throw new InvalidOperationException(
            "DATABASE_URL inválida. Use a URL PostgreSQL fornecida pelo Render.");
    }

    var userInfo = databaseUri.UserInfo.Split(':', 2);
    if (userInfo.Length != 2 || string.IsNullOrWhiteSpace(userInfo[0]) || string.IsNullOrWhiteSpace(userInfo[1]))
    {
        throw new InvalidOperationException(
            "DATABASE_URL inválida. A URL PostgreSQL precisa conter usuário e senha fornecidos pelo Render.");
    }

    var connectionBuilder = new NpgsqlConnectionStringBuilder
    {
        Host = databaseUri.Host,
        Port = databaseUri.Port > 0 ? databaseUri.Port : 5432,
        Username = Uri.UnescapeDataString(userInfo[0]),
        Password = Uri.UnescapeDataString(userInfo[1]),
        Database = Uri.UnescapeDataString(databaseUri.AbsolutePath.Trim('/')),
        SslMode = Npgsql.SslMode.Require
    };

    // Auto-prepare de statements + keepalive: reduz a latência de queries repetidas
    // e evita reconexões TLS caras após ociosidade (links de alta latência, ex.: Render).
    connectionBuilder.MaxAutoPrepare = 15;
    connectionBuilder.AutoPrepareMinUsages = 2;
    connectionBuilder.KeepAlive = 30;

    return connectionBuilder.ConnectionString;
}

static string[] GetAllowedOrigins(IWebHostEnvironment environment, string? configuredOrigin)
{
    var allowedOrigin = configuredOrigin?.Trim();
    if (string.IsNullOrWhiteSpace(allowedOrigin))
    {
        if (environment.IsDevelopment())
        {
            return ["http://localhost:3000", "https://localhost:3000"];
        }

        throw new InvalidOperationException(
            "CORS não configurado. No Render, defina Cors__AllowedOrigin com a URL HTTPS da Vercel, sem barra final (ex.: https://seu-projeto.vercel.app). Não use localhost.");
    }

    if (!Uri.TryCreate(allowedOrigin, UriKind.Absolute, out var originUri) ||
        !string.Equals(originUri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase) ||
        !string.IsNullOrEmpty(originUri.AbsolutePath.Trim('/')) ||
        !string.IsNullOrEmpty(originUri.Query) ||
        !string.IsNullOrEmpty(originUri.Fragment) ||
        allowedOrigin.EndsWith('/') ||
        originUri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
        originUri.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase))
    {
        throw new InvalidOperationException(
            "CORS inválido. No Render, defina Cors__AllowedOrigin como uma única URL HTTPS da Vercel, sem barra final e sem localhost.");
    }

    return [allowedOrigin];
}
