using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class AdminProfile
{
    public int UserId { get; set; }

    public string StaffCode { get; set; } = null!;

    public string? Position { get; set; }

    public byte PermissionLevel { get; set; }

    public virtual User User { get; set; } = null!;
}
