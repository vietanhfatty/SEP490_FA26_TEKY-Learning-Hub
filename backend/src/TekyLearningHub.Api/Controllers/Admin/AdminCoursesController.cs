using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TekyLearningHub.Application.DTOs.Admin;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Application.Interfaces.Admin;

namespace TekyLearningHub.Api.Controllers.Admin;

/// <summary>
/// Quản trị khóa học, bài học và học liệu. Toàn quyền nằm ở role admin.
/// </summary>
[ApiController]
[Route("api/admin/courses")]
[Authorize(Roles = "system_admin")]
public class AdminCoursesController(ICourseService service, ILogger<AdminCoursesController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status, [FromQuery] string? q,
        [FromQuery] int skip = 0, [FromQuery] int take = 50, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await service.ListAsync(status, q, skip, take, cancellationToken);
            return Ok(result);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Unable to load admin courses");
            return Problem(statusCode: 503, title: "Không thể tải danh sách khóa học. Vui lòng thử lại sau.");
        }
    }

    [HttpGet("{courseId:int:min(1)}")]
    public async Task<IActionResult> Get(int courseId, CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.GetAsync(courseId, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Unable to load admin course {CourseId}", courseId);
            return Problem(statusCode: 503, title: "Không thể tải khóa học. Vui lòng thử lại sau.");
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CourseUpsertRequest request, CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var actorUserId)) return Unauthorized();
        try
        {
            var result = await service.CreateAsync(request, actorUserId, IpAddress(), cancellationToken);
            return Respond(result);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Unable to create course");
            return Problem(statusCode: 503, title: "Không thể tạo khóa học. Vui lòng thử lại sau.");
        }
    }

    [HttpPut("{courseId:int:min(1)}")]
    public async Task<IActionResult> Update(int courseId, [FromBody] CourseUpsertRequest request,
        CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var actorUserId)) return Unauthorized();
        try
        {
            var result = await service.UpdateAsync(courseId, request, actorUserId, IpAddress(), cancellationToken);
            return Respond(result);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Unable to update course {CourseId}", courseId);
            return Problem(statusCode: 503, title: "Không thể cập nhật khóa học. Vui lòng thử lại sau.");
        }
    }

    [HttpPatch("{courseId:int:min(1)}/status")]
    public async Task<IActionResult> ChangeStatus(int courseId, [FromBody] CourseStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var actorUserId)) return Unauthorized();
        try
        {
            var result = await service.ChangeStatusAsync(courseId, request.Status, actorUserId, IpAddress(), cancellationToken);
            return Respond(result);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Unable to change status of course {CourseId}", courseId);
            return Problem(statusCode: 503, title: "Không thể đổi trạng thái khóa học. Vui lòng thử lại sau.");
        }
    }

    [HttpDelete("{courseId:int:min(1)}")]
    public async Task<IActionResult> Archive(int courseId, CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var actorUserId)) return Unauthorized();
        try
        {
            var result = await service.ArchiveAsync(courseId, actorUserId, IpAddress(), cancellationToken);
            return Respond(result);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Unable to archive course {CourseId}", courseId);
            return Problem(statusCode: 503, title: "Không thể lưu trữ khóa học. Vui lòng thử lại sau.");
        }
    }

    [HttpPost("{courseId:int:min(1)}/lessons")]
    public async Task<IActionResult> CreateLesson(int courseId, [FromBody] LessonUpsertRequest request,
        CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var actorUserId)) return Unauthorized();
        try
        {
            var result = await service.UpsertLessonAsync(courseId, null, request, actorUserId, IpAddress(), cancellationToken);
            return Respond(result);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Unable to create lesson for course {CourseId}", courseId);
            return Problem(statusCode: 503, title: "Không thể tạo bài học. Vui lòng thử lại sau.");
        }
    }

    [HttpPut("{courseId:int:min(1)}/lessons/{lessonId:int:min(1)}")]
    public async Task<IActionResult> UpdateLesson(int courseId, int lessonId, [FromBody] LessonUpsertRequest request,
        CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var actorUserId)) return Unauthorized();
        try
        {
            var result = await service.UpsertLessonAsync(courseId, lessonId, request, actorUserId, IpAddress(), cancellationToken);
            return Respond(result);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Unable to update lesson {LessonId} of course {CourseId}", lessonId, courseId);
            return Problem(statusCode: 503, title: "Không thể cập nhật bài học. Vui lòng thử lại sau.");
        }
    }

    [HttpDelete("{courseId:int:min(1)}/lessons/{lessonId:int:min(1)}")]
    public async Task<IActionResult> DeleteLesson(int courseId, int lessonId, CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var actorUserId)) return Unauthorized();
        try
        {
            var result = await service.DeleteLessonAsync(courseId, lessonId, actorUserId, IpAddress(), cancellationToken);
            return Respond(result);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Unable to delete lesson {LessonId} of course {CourseId}", lessonId, courseId);
            return Problem(statusCode: 503, title: "Không thể xoá bài học. Vui lòng thử lại sau.");
        }
    }

    [HttpDelete("{courseId:int:min(1)}/lessons/{lessonId:int:min(1)}/materials/{materialId:int:min(1)}")]
    public async Task<IActionResult> DeleteMaterial(int courseId, int lessonId, int materialId,
        CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var actorUserId)) return Unauthorized();
        try
        {
            var result = await service.DeleteMaterialAsync(courseId, lessonId, materialId, actorUserId, IpAddress(),
                cancellationToken);
            return Respond(result);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Unable to delete material {MaterialId} of lesson {LessonId}", materialId, lessonId);
            return Problem(statusCode: 503, title: "Không thể xoá học liệu. Vui lòng thử lại sau.");
        }
    }

    private IActionResult Respond<T>(CourseOperationResult<T> result)
    {
        if (result.Succeeded) return Ok(result.Value);
        return Problem(statusCode: result.StatusCode, title: result.Error ?? "Không thể hoàn tất thao tác.");
    }

    private string? IpAddress() => HttpContext.Connection.RemoteIpAddress?.ToString();
}
