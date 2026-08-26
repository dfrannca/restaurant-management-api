using Microsoft.AspNetCore.Mvc;
using Restaurante.Application.DTOs;
using Restaurante.Application.Services;

namespace Restaurante.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Microsoft.AspNetCore.Authorization.Authorize]
public class CashClosingController : ControllerBase
{
    private readonly ICashClosingService _cashClosingService;

    public CashClosingController(ICashClosingService cashClosingService)
    {
        _cashClosingService = cashClosingService;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CashClosingDto>> GetById(int id)
    {
        try
        {
            var closing = await _cashClosingService.GetByIdAsync(id);
            return Ok(closing);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CashClosingDto>>> GetAll()
    {
        var closings = await _cashClosingService.GetAllAsync();
        return Ok(closings);
    }

    [HttpGet("range")]
    public async Task<ActionResult<IEnumerable<CashClosingDto>>> GetByDateRange(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate)
    {
        var closings = await _cashClosingService.GetByDateRangeAsync(startDate, endDate);
        return Ok(closings);
    }
}

