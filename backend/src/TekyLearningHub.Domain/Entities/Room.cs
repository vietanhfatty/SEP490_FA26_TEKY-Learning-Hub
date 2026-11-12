using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class Room
{
    public int RoomId { get; set; }

    public string RoomName { get; set; } = null!;

    public int Capacity { get; set; }

    public string Status { get; set; } = null!;

    public virtual ICollection<ClassSession> ClassSessions { get; set; } = new List<ClassSession>();
}
