namespace TekyLearningHub.Domain.Entities;
public class AccountEmail {
 public long Id { get; set; }
 public string Recipient { get; set; } = "";
 public string Subject { get; set; } = "";
 public string ProtectedBody { get; set; } = "";
 public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
 public DateTime? SentAt { get; set; }
 public int Attempts { get; set; }
 public DateTime NextAttemptAt { get; set; } = DateTime.UtcNow;
}
