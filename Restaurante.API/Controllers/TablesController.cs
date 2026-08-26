using Microsoft.AspNetCore.Mvc;
using Restaurante.Application.DTOs;
using Restaurante.Application.Services;

namespace Restaurante.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Microsoft.AspNetCore.Authorization.Authorize]
public class TablesController : ControllerBase
{
    private readonly ITableService _tableService;

    public TablesController(ITableService tableService)
    {
        _tableService = tableService;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TableDto>> GetById(int id)
    {
        try
        {
            var table = await _tableService.GetByIdAsync(id);
            return Ok(table);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TableDto>>> GetAll()
    {
        var tables = await _tableService.GetAllAsync();
        return Ok(tables);
    }

    [HttpPost]
    public async Task<ActionResult<TableDto>> Create([FromBody] CreateTableDto dto)
    {
        try
        {
            var table = await _tableService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = table.Id }, table);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<TableDto>> Update(int id, [FromBody] UpdateTableDto dto)
    {
        try
        {
            var table = await _tableService.UpdateAsync(id, dto);
            return Ok(table);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(int id)
    {
        try
        {
            await _tableService.DeleteAsync(id);
            return NoContent();
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

    [HttpPost("{id}/open")]
    public async Task<ActionResult<TableDto>> OpenTable(int id, [FromBody] OpenTableDto dto)
    {
        try
        {
            var table = await _tableService.OpenTableAsync(id, dto);
            return Ok(table);
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

    [HttpPost("{id}/close")]
    public async Task<ActionResult<TableDto>> CloseTable(int id)
    {
        try
        {
            var table = await _tableService.CloseTableAsync(id);
            return Ok(table);
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

