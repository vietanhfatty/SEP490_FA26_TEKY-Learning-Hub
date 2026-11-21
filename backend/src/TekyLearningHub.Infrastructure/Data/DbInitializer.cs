using Microsoft.EntityFrameworkCore;
using TekyLearningHub.Application.Interfaces;
using TekyLearningHub.Domain.Entities;
using TekyLearningHub.Infrastructure.Data;

namespace TekyLearningHub.Infrastructure.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(ApplicationDbContext context, IPasswordHasher passwordHasher)
    {
        // 1. Seed Roles if missing
        var existingRoles = await context.Roles.ToListAsync();
        var defaultRoles = new List<Role>
        {
            new() { RoleId = 1, RoleName = "Student" },
            new() { RoleId = 2, RoleName = "Teacher" },
            new() { RoleId = 3, RoleName = "SystemAdmin" },
            new() { RoleId = 4, RoleName = "Parent" },
            new() { RoleId = 5, RoleName = "AcademicStaff" },
            new() { RoleId = 6, RoleName = "AcademicManager" }
        };

        foreach (var role in defaultRoles)
        {
            if (!existingRoles.Any(r => r.RoleId == role.RoleId || r.RoleName.Equals(role.RoleName, StringComparison.OrdinalIgnoreCase)))
            {
                context.Roles.Add(role);
            }
        }
        await context.SaveChangesAsync();

        // 2. Seed Default Demo Users with BCrypt-hashed password "Teky@2026!"
        var defaultPasswordHash = passwordHasher.HashPassword("Teky@2026!");

        var demoUsers = new List<User>
        {
            new()
            {
                Email = "student@teky.edu.vn",
                PasswordHash = defaultPasswordHash,
                PrimaryRoleId = 1,
                FullName = "Nguyễn Minh Quân",
                Phone = "0901234501",
                Status = "Active",
                ThemeMode = "Light",
                CreatedAt = DateTime.UtcNow
            },
            new()
            {
                Email = "teacher@teky.edu.vn",
                PasswordHash = defaultPasswordHash,
                PrimaryRoleId = 2,
                FullName = "Thầy Hoàng Văn Nam",
                Phone = "0901234503",
                Status = "Active",
                ThemeMode = "Light",
                CreatedAt = DateTime.UtcNow
            },
            new()
            {
                Email = "admin@teky.edu.vn",
                PasswordHash = defaultPasswordHash,
                PrimaryRoleId = 3,
                FullName = "Admin Kỹ Thuật",
                Phone = "0901234505",
                Status = "Active",
                ThemeMode = "Light",
                CreatedAt = DateTime.UtcNow
            },
            new()
            {
                Email = "parent@teky.edu.vn",
                PasswordHash = defaultPasswordHash,
                PrimaryRoleId = 4,
                FullName = "Trần Thu Trang",
                Phone = "0901234502",
                Status = "Active",
                ThemeMode = "Light",
                CreatedAt = DateTime.UtcNow
            },
            new()
            {
                Email = "staff@teky.edu.vn",
                PasswordHash = defaultPasswordHash,
                PrimaryRoleId = 5,
                FullName = "Nguyễn Thu Nga (Giáo vụ)",
                Phone = "0901234514",
                Status = "Active",
                ThemeMode = "Light",
                CreatedAt = DateTime.UtcNow
            },
            new()
            {
                Email = "manager@teky.edu.vn",
                PasswordHash = defaultPasswordHash,
                PrimaryRoleId = 6,
                FullName = "Đỗ Thị Hồng (QL Đào tạo)",
                Phone = "0901234504",
                Status = "Active",
                ThemeMode = "Light",
                CreatedAt = DateTime.UtcNow
            }
        };

        var existingUsers = await context.Users.Select(u => u.Email.ToLower()).ToListAsync();

        foreach (var user in demoUsers)
        {
            if (!existingUsers.Contains(user.Email.ToLower()))
            {
                var academicDepartmentId = user.PrimaryRoleId is 5 or 6
                    ? await ((ApplicationDbContext)context).Database.SqlQuery<int>(
                        $"SELECT DepartmentId AS Value FROM dbo.Departments WHERE Code='ACADEMIC'").SingleAsync()
                    : (int?)null;
                user.RoleAssignments.Add(new UserRoleAssignment
                {
                    RoleId = user.PrimaryRoleId,
                    ScopeType = academicDepartmentId.HasValue ? "DEPARTMENT" : "GLOBAL",
                    DepartmentId = academicDepartmentId
                });
                context.Users.Add(user);
            }
        }

        await context.SaveChangesAsync();
        await context.Database.ExecuteSqlRawAsync("EXEC dbo.SeedDemoStudentParent;");
        // Demo staff accounts appointed to every job title of the two-department organisation.
        await context.Database.ExecuteSqlInterpolatedAsync($"EXEC dbo.SeedDemoOrgAccounts @PasswordHash={defaultPasswordHash};");
    }
}

