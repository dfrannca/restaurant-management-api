using Microsoft.AspNetCore.Mvc;
using Restaurante.Application.DTOs;
using Restaurante.Application.Services;

namespace Restaurante.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Microsoft.AspNetCore.Authorization.Authorize]
public class CashRegisterController : ControllerBase
{
    private readonly ICashRegisterService _cashRegisterService;

    public CashRegisterController(ICashRegisterService cashRegisterService)
    {
        _cashRegisterService = cashRegisterService;
    }

    [HttpGet("open")]
    public async Task<ActionResult<CashRegisterDto>> GetOpen()
    {
        try
        {
            var cashRegister = await _cashRegisterService.GetOpenCashRegisterAsync();
            return Ok(cashRegister);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("open")]
    public async Task<ActionResult<CashRegisterDto>> Open([FromBody] OpenCashRegisterDto dto)
    {
        try
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
            {
                return Unauthorized(new { message = "User not authenticated properly" });
            }

            var cashRegister = await _cashRegisterService.OpenCashRegisterAsync(dto, userId);
            return Ok(cashRegister);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("current-summary")]
    public async Task<ActionResult<CashRegisterSummaryDto>> GetCurrentSummary()
    {
        try
        {
            var summary = await _cashRegisterService.GetCurrentSummaryAsync();
            return Ok(summary);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("close")]
    public async Task<ActionResult<CashRegisterDto>> Close([FromBody] CloseCashRegisterDto dto)
    {
        try
        {
            var cashRegister = await _cashRegisterService.CloseCashRegisterAsync(dto);
            return Ok(cashRegister);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

