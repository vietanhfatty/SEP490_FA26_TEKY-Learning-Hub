using TekyLearningHub.Application.DTOs.Admin;

namespace TekyLearningHub.Application.Services.Admin;

/// <summary>
/// Permission templates offered when configuring a job title. A department declares its business function
/// (Phòng Chuyên môn or Phòng Quản lý đào tạo) and the function selects which templates apply. A policy whose
/// roles and permissions match no template is reported as <see cref="Custom"/>.
/// System administration is not a template: it stays the global SystemAdmin account role.
/// </summary>
public static class PositionTemplates
{
    public const string Academic = "ACADEMIC";
    public const string Training = "TRAINING";
    public const string Custom = "CUSTOM";
    public static readonly string[] Functions = [Academic, Training];

    private static readonly PositionTemplateDto[] All =
    [
        new(Academic, "MANAGER", "Quản lý phòng", [6],
            ["content.assign", "content.comment", "content.edit", "content.publish", "content.read", "course.manage", "review.open", "review.respond"]),
        new(Academic, "SPECIALIST", "Chuyên viên", [5],
            ["content.comment", "content.edit", "content.read", "review.respond"]),
        new(Academic, "TEACHER", "Giáo viên", [2],
            ["content.comment", "content.read", "review.respond"]),
        new(Training, "MANAGER", "Quản lý phòng", [6],
            ["attendance.view", "class.manage", "enrollment.manage", "report.view", "schedule.manage", "teacher.assign"]),
        new(Training, "SPECIALIST", "Chuyên viên", [5],
            ["attendance.view", "enrollment.manage", "schedule.manage"]),
    ];

    public static PositionTemplateDto[] Catalog() => All;

    public static PositionTemplateDto[] For(string function) => All.Where(template => template.FunctionCode == function).ToArray();

    /// <summary>Returns the template code whose roles and permissions equal the given set, or CUSTOM.</summary>
    public static string Match(string function, IEnumerable<int> roleIds, IEnumerable<string> permissionCodes)
    {
        var roles = roleIds.Distinct().Order().ToArray();
        var permissions = permissionCodes.Distinct().Order(StringComparer.Ordinal).ToArray();
        return For(function).FirstOrDefault(template =>
            template.RoleIds.Order().SequenceEqual(roles) &&
            template.PermissionCodes.Order(StringComparer.Ordinal).SequenceEqual(permissions))?.Code ?? Custom;
    }
}
