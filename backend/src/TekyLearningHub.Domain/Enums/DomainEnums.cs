namespace TekyLearningHub.Domain.Enums;

public enum AttendanceStatus
{
    Present = 1,
    Late = 2,
    Absent = 3,
    Excused = 4
}

public enum AttendanceSource
{
    ManualTeacher = 1,
    WorkstationAuto = 2,
    MakeupSession = 3
}

public enum ClassSessionStatus
{
    Scheduled = 1,
    InProgress = 2,
    Completed = 3,
    Cancelled = 4
}

public enum MakeupRequestStatus
{
    Pending = 1,
    Approved = 2,
    Rejected = 3
}

public enum SubmissionStatus
{
    Draft = 1,
    Submitted = 2,
    Graded = 3
}

public enum NotificationChannel
{
    InAppSignalR = 1,
    ZaloZns = 2,
    TwilioSms = 3,
    Email = 4
}

public enum NotificationType
{
    AttendanceAlert = 1,
    LabFocusLock = 2,
    CheerMessage = 3,
    GradePublished = 4,
    MakeupStatusUpdated = 5,
    ScreenSpotlight = 6
}

public enum CheerStickerType
{
    ProudOfYou = 1,     // "Bố mẹ tự hào về con"
    SuperCoder = 2,     // "Siêu lập trình viên"
    KeepFighting = 3,   // "Cố lên con yêu"
    CreativeMaster = 4  // "Nhà sáng chế tương lai"
}
