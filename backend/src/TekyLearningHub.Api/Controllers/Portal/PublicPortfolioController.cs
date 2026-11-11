using Microsoft.AspNetCore.Mvc;
using TekyLearningHub.Application.DTOs;
using TekyLearningHub.Application.Services;

namespace TekyLearningHub.Api.Controllers.Portal;

[ApiController]
[Route("api/portfolio")]
public class PublicPortfolioController : ControllerBase
{
    private readonly IParentService _parentService;

    public PublicPortfolioController(IParentService parentService)
    {
        _parentService = parentService;
    }

    /// <summary>
    /// SCR-PAR-03: Xác thực mã QR & Xem công khai sản phẩm STEM của học sinh
    /// </summary>
    [HttpGet("verify/{qrKey}")]
    public async Task<ActionResult<StudentPortfolioDetailDto>> VerifyPortfolio([FromRoute] string qrKey, CancellationToken ct)
    {
        var result = await _parentService.GetPublicPortfolioByQrKeyAsync(qrKey, ct);
        return Ok(result);
    }
}
