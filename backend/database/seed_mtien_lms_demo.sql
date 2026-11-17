/* =====================================================================
   TEKY Learning Hub — Demo data bổ sung cho phân hệ của Tiến (Mtien)
   Teacher Studio (SCR-TEA-xx) · Parent Hub (SCR-PAR-xx) · CRON-03
   ---------------------------------------------------------------------
   - Idempotent: chạy nhiều lần không bị nhân đôi dữ liệu.
   - Tôn trọng toàn bộ CHECK constraint của schema Teky_Learning_Hub.
   - KHÔNG đụng vào bảng append-only AuditLogs.
   Yêu cầu: đã có dữ liệu nền (Users 1..5, Class 3, Sessions 5..7,
            Assignment 3, Map 3, Submission 3).
   ===================================================================== */
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @TeacherId INT = 1, @ParentId INT = 5;
DECLARE @StuAn INT = 2, @StuMai INT = 3, @StuTri INT = 4;
DECLARE @ClassId INT = (SELECT TOP 1 ClassId FROM Classes WHERE ClassCode = N'ROBOT-K10-A');
DECLARE @AsgId INT = (SELECT TOP 1 AssignmentId FROM Assignments WHERE ClassId = @ClassId ORDER BY AssignmentId);
DECLARE @MapId INT = (SELECT TOP 1 MapId FROM Assignments WHERE AssignmentId = @AsgId);
IF @MapId IS NULL SET @MapId = (SELECT TOP 1 MapId FROM ChallengeMaps ORDER BY MapId);

/* ---------- 1. Bài nộp chờ chấm (SCR-TEA-05 Hybrid Grading queue) ---------- */
IF NOT EXISTS (SELECT 1 FROM Submissions WHERE AssignmentId = @AsgId AND StudentId = @StuMai)
    INSERT INTO Submissions (AssignmentId, StudentId, AttemptNo, BlocklyJson, AstJson, Status, IsCurrent, SubmittedAt)
    VALUES (@AsgId, @StuMai, 1,
        N'{"blocks":[{"type":"robot_start"},{"type":"move_forward","steps":3},{"type":"turn_right"},{"type":"move_forward","steps":2}]}',
        N'{"type":"Program","children":[{"type":"robot_start"},{"type":"move_forward"},{"type":"turn_right"},{"type":"move_forward"}]}',
        N'AutoGraded', 1, DATEADD(HOUR, -3, SYSUTCDATETIME()));

IF NOT EXISTS (SELECT 1 FROM Submissions WHERE AssignmentId = @AsgId AND StudentId = @StuTri)
    INSERT INTO Submissions (AssignmentId, StudentId, AttemptNo, BlocklyJson, AstJson, Status, IsCurrent, SubmittedAt)
    VALUES (@AsgId, @StuTri, 2,
        N'{"blocks":[{"type":"robot_start"},{"type":"repeat","times":4,"do":[{"type":"move_forward"}]}]}',
        N'{"type":"Program","children":[{"type":"robot_start"},{"type":"repeat","children":[{"type":"move_forward"}]}]}',
        N'Pending', 1, DATEADD(HOUR, -1, SYSUTCDATETIME()));

DECLARE @SubMai BIGINT = (SELECT TOP 1 SubmissionId FROM Submissions WHERE AssignmentId = @AsgId AND StudentId = @StuMai);
IF NOT EXISTS (SELECT 1 FROM AstEvaluations WHERE SubmissionId = @SubMai)
    INSERT INTO AstEvaluations (SubmissionId, AutoAstScore, MatchPercent, EvaluatedAt)
    VALUES (@SubMai, 7.80, 78.00, DATEADD(HOUR, -3, SYSUTCDATETIME()));

/* ---------- 2. Portfolio + Thẻ thành tích QR (SCR-PAR-03) ---------- */
DECLARE @SubAn BIGINT = (SELECT TOP 1 SubmissionId FROM Submissions WHERE AssignmentId = @AsgId AND StudentId = @StuAn);
IF @SubAn IS NOT NULL AND NOT EXISTS (SELECT 1 FROM PortfolioItems WHERE SubmissionId = @SubAn)
    INSERT INTO PortfolioItems (StudentId, SubmissionId, Title, Summary, ThumbnailUrl, FinalScore, CompletedAt)
    VALUES (@StuAn, @SubAn, N'Xe robot tránh chướng ngại vật',
            N'Con lập trình robot đi qua 3 trạm checkpoint trên sa bàn Rừng Nhiệt Đới, dùng vòng lặp và cảm biến khoảng cách.',
            NULL, 9.30, SYSUTCDATETIME());

DECLARE @ItemAn INT = (SELECT TOP 1 ItemId FROM PortfolioItems WHERE SubmissionId = @SubAn);
IF @ItemAn IS NOT NULL AND NOT EXISTS (SELECT 1 FROM AchievementCards WHERE ItemId = @ItemAn)
    INSERT INTO AchievementCards (StudentId, ItemId, Title, CardImageUrl, QrToken, IsPublic, ExportedBy, ViewCount)
    VALUES (@StuAn, @ItemAn, N'Chứng nhận: Kỹ sư Robot nhí', NULL, NEWID(), 1, @TeacherId, 12);

/* ---------- 3. Bảng xếp hạng tuần (CRON-03) ---------- */
DECLARE @Today DATE = CAST(SYSDATETIME() AS DATE);
DECLARE @WeekStart DATE = DATEADD(DAY, -((DATEPART(WEEKDAY, @Today) + @@DATEFIRST - 2) % 7), @Today); -- Thứ Hai
DECLARE @WeekEnd DATE = DATEADD(DAY, 6, @WeekStart);

IF NOT EXISTS (SELECT 1 FROM LeaderboardCycles WHERE WeekStart = @WeekStart)
    INSERT INTO LeaderboardCycles (WeekStart, WeekEnd, Status) VALUES (@WeekStart, @WeekEnd, N'Active');
DECLARE @CycleId INT = (SELECT CycleId FROM LeaderboardCycles WHERE WeekStart = @WeekStart);

DECLARE @runs TABLE (StudentId INT, ExecMs INT, Blocks INT, Xp INT, RankNo INT);
INSERT INTO @runs VALUES (@StuAn, 4200, 9, 180, 1), (@StuTri, 5100, 11, 140, 2), (@StuMai, 6350, 14, 110, 3);

DECLARE @sid INT, @ms INT, @bl INT, @xp INT, @rk INT, @runId BIGINT;
DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT StudentId, ExecMs, Blocks, Xp, RankNo FROM @runs;
OPEN c; FETCH NEXT FROM c INTO @sid, @ms, @bl, @xp, @rk;
WHILE @@FETCH_STATUS = 0
BEGIN
    IF NOT EXISTS (SELECT 1 FROM LeaderboardEntries WHERE CycleId = @CycleId AND StudentId = @sid)
    BEGIN
        INSERT INTO SimulationRuns (AssignmentId, StudentId, SubmissionId, MapId, ExecTimeMs, BlockCount, CheckpointsReached, ReachedFinish, RunAt)
        VALUES (@AsgId, @sid, NULL, @MapId, @ms, @bl, 3, 1, SYSUTCDATETIME());
        SET @runId = SCOPE_IDENTITY();
        INSERT INTO LeaderboardEntries (CycleId, MapId, StudentId, BestRunId, BestTimeMs, BestBlockCount, XpEarned, RankNo)
        VALUES (@CycleId, @MapId, @sid, @runId, @ms, @bl, @xp, @rk);
    END
    FETCH NEXT FROM c INTO @sid, @ms, @bl, @xp, @rk;
END
CLOSE c; DEALLOCATE c;

/* ---------- 4. Đơn xin học bù chờ duyệt (SCR-TEA-02) ---------- */
DECLARE @AbsentAtt BIGINT = (SELECT TOP 1 AttendanceId FROM AttendanceRecords WHERE StudentId = @StuTri AND Status = N'Absent' ORDER BY AttendanceId);
DECLARE @NextSession INT = (SELECT TOP 1 SessionId FROM ClassSessions WHERE ClassId = @ClassId AND Status = N'Scheduled' ORDER BY SessionDate DESC);
IF @AbsentAtt IS NOT NULL AND NOT EXISTS (SELECT 1 FROM MakeupRequests WHERE AttendanceId = @AbsentAtt)
    INSERT INTO MakeupRequests (AttendanceId, RequestedBy, PreferredSessionId, Reason, Status)
    VALUES (@AbsentAtt, @StuTri, @NextSession, N'Con bị sốt nên nghỉ buổi 11/11, xin học bù vào buổi gần nhất.', N'Pending');

/* ---------- 5. Buổi học hôm nay (để demo điểm danh realtime + Live status) ---------- */
IF NOT EXISTS (SELECT 1 FROM ClassSessions WHERE ClassId = @ClassId AND SessionDate = @Today)
    INSERT INTO ClassSessions (ClassId, LessonId, RoomId, SessionDate, StartTime, EndTime, Status)
    SELECT TOP 1 @ClassId, LessonId, RoomId, @Today, '08:00', '21:30', N'Scheduled'
    FROM ClassSessions WHERE ClassId = @ClassId ORDER BY SessionId;

COMMIT TRANSACTION;

SELECT 'Submissions' AS T, COUNT(*) AS N FROM Submissions UNION ALL
SELECT 'PortfolioItems', COUNT(*) FROM PortfolioItems UNION ALL
SELECT 'AchievementCards', COUNT(*) FROM AchievementCards UNION ALL
SELECT 'LeaderboardEntries', COUNT(*) FROM LeaderboardEntries UNION ALL
SELECT 'MakeupRequests', COUNT(*) FROM MakeupRequests UNION ALL
SELECT 'ClassSessions', COUNT(*) FROM ClassSessions;
