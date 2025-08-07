using LMS.Tutor.Services;
using Microsoft.AspNetCore.Mvc;

namespace LMS_Tutor.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TutorController : ControllerBase
{
    private readonly GeminiTutorService _tutorService;

    public TutorController(GeminiTutorService tutorService)
    {
        _tutorService = tutorService;
    }

    [HttpPost("ask")]
    public async Task<IActionResult> Ask([FromBody] TutorQuery query)
    {
        var answer = await _tutorService.AskAsync(query.Question);
        return Ok(new { answer });
    }
}

public class TutorQuery
{
    public string Question { get; set; } = string.Empty;
}