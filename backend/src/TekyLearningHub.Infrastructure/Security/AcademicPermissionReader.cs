using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Security;

/// <summary>Checks live scoped grants. JWT role membership alone never grants content access.</summary>
public sealed class AcademicPermissionReader(ApplicationDbContext db) : IAcademicPermissionReader
{
    public async Task<bool> HasPermissionAsync(int userId, string permission, int? departmentId, CancellationToken ct = default) =>
        await db.Database.SqlQuery<int>($"SELECT CAST(dbo.HasAcademicPermission({userId},{permission},{departmentId}) AS int) AS Value")
            .SingleAsync(ct) == 1;

    public async Task<bool> CanEditAsync(int userId, long contentId, CancellationToken ct = default) =>
        await db.Database.SqlQuery<int>($"""
            SELECT CAST(CASE WHEN EXISTS (
                SELECT 1 FROM dbo.Contents c
                JOIN dbo.ContentVersions v ON v.VersionId=c.CandidateVersionId AND v.ContentId=c.ContentId
                JOIN dbo.ContentAssignments a ON a.ContentId=c.ContentId
                WHERE c.ContentId={contentId} AND a.UserId={userId}
                AND a.AssignmentType='EDITOR' AND a.RevokedAt IS NULL AND v.Status='DRAFT'
                AND dbo.HasAcademicPermission({userId},'content.edit',c.DepartmentId)=1
            ) THEN 1 ELSE 0 END AS int) AS Value
            """).SingleAsync(ct) == 1;
}
