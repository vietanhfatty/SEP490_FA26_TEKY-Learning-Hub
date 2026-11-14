using System;
using System.Collections.Generic;

namespace TekyLearningHub.Domain.Entities;

public partial class CheerSticker
{
    public int StickerId { get; set; }

    public string Code { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string ImageUrl { get; set; } = null!;

    public virtual ICollection<CheerMessage> CheerMessages { get; set; } = new List<CheerMessage>();
}
