using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TekyLearningHub.Infrastructure.Services;
namespace TekyLearningHub.Api.Controllers;
[ApiController, Authorize(Roles="student"), Route("api/student/courses")]
public sealed class StudentLearningController(StudentLearningService service) : ControllerBase {
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    [HttpGet] public async Task<IActionResult> List(CancellationToken ct) => Ok(await service.Courses(UserId,ct));
    [HttpGet("{courseId:int:min(1)}")] public async Task<IActionResult> Detail(int courseId,CancellationToken ct) {
        var result=await service.Course(UserId,courseId,ct); return result is null ? NotFound() : Ok(result);
    }
    [HttpPost("{courseId:int:min(1)}/lessons/{lessonId:int:min(1)}/reviewed")]
    public async Task<IActionResult> Reviewed(int courseId,int lessonId,CancellationToken ct) =>
        await service.ReviewLesson(UserId,courseId,lessonId,ct) ? NoContent() : NotFound();
}
[ApiController, Authorize(Roles="teacher"), Route("api/teacher/project-reviews")]
public sealed class ProjectReviewsController(StudentLearningService service) : ControllerBase {
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    public record ReviewRequest(int AttemptNo,string Status,string Feedback);
    [HttpGet] public async Task<IActionResult> List(CancellationToken ct) => Ok(await service.Reviews(UserId,ct));
    [HttpGet("{assignmentId:int}/{studentId:int}/file")]
    public async Task<IActionResult> Download(int assignmentId,int studentId,CancellationToken ct) {
        var file=await service.ReviewFile(UserId,assignmentId,studentId,ct);
        if(file is null) return NotFound();
        Response.Headers["X-Content-Type-Options"]="nosniff";
        Response.Headers.CacheControl="no-store";
        return File(file.Content,"application/octet-stream",file.FileName);
    }
    [HttpPost("{assignmentId:int}/{studentId:int}")]
    public async Task<IActionResult> Review(int assignmentId,int studentId,ReviewRequest request,CancellationToken ct) {
        if(request.Status is not ("NeedsRevision" or "Passed") || request.AttemptNo<1 || string.IsNullOrWhiteSpace(request.Feedback) || request.Feedback.Length>2000)
            return Problem(statusCode:400,title:"Chọn kết quả và nhập phản hồi từ 1 đến 2000 ký tự.");
        return await service.SubmitReview(UserId,assignmentId,studentId,request.AttemptNo,request.Status,request.Feedback.Trim(),ct)
            ? NoContent() : Problem(statusCode:409,title:"Bài đã thay đổi hoặc không thuộc lớp thầy cô được phân công. Vui lòng tải lại.");
    }
}
